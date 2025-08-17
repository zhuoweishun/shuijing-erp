const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取产品列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      category = '', 
      status = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];

    // 非管理员只能查看自己的产品
    if (req.user.role !== 'admin') {
      whereClause += ' AND user_id = ?';
      params.push(req.user.id);
    }

    // 搜索条件
    if (search) {
      whereClause += ' AND (product_name LIKE ? OR raw_material LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 分类筛选
    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    // 状态筛选
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // 排序
    const validSortFields = ['created_at', 'product_name', 'cost', 'selling_price', 'weight'];
    const validSortOrders = ['ASC', 'DESC'];
    const orderBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // 获取产品列表
    const limitNum = parseInt(limit) || 10;
    const offsetNum = parseInt(offset) || 0;
    
    console.log('查询参数:', { params, limitNum, offsetNum, whereClause, orderBy, order });
    
    // 构建完整的SQL查询
    const sql = `SELECT p.*, u.username as creator_name
                 FROM products p
                 LEFT JOIN user_profiles u ON p.user_id = u.id
                 ${whereClause}
                 ORDER BY p.${orderBy} ${order}
                 LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    console.log('执行SQL:', sql);
    console.log('SQL参数:', params);
    
    const products = await query(sql, params);

    // 获取总数
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM products p ${whereClause}`,
      params
    );
    const total = totalResult[0].total;

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取产品列表错误:', error);
    res.status(500).json({ error: '获取产品列表失败' });
  }
});

// 获取单个产品详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let whereClause = 'WHERE p.id = ?';
    let params = [id];

    // 非管理员只能查看自己的产品
    if (req.user.role !== 'admin') {
      whereClause += ' AND p.user_id = ?';
      params.push(req.user.id);
    }

    const products = await query(
      `SELECT p.*, u.username as creator_name
       FROM products p
       LEFT JOIN user_profiles u ON p.user_id = u.id
       ${whereClause}`,
      params
    );

    if (products.length === 0) {
      return res.status(404).json({ error: '产品不存在或无权访问' });
    }

    res.json({ product: products[0] });
  } catch (error) {
    console.error('获取产品详情错误:', error);
    res.status(500).json({ error: '获取产品详情失败' });
  }
});

// 创建新产品
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      product_name,
      category,
      raw_material,
      weight,
      size,
      craft_time,
      cost,
      selling_price,
      description,
      photos,
      status = '制作中'
    } = req.body;

    // 验证必填字段
    if (!product_name) {
      return res.status(400).json({ error: '产品名称不能为空' });
    }

    // 验证数值字段
    if (weight && (isNaN(weight) || weight < 0)) {
      return res.status(400).json({ error: '重量必须是非负数' });
    }

    if (craft_time && (isNaN(craft_time) || craft_time < 0)) {
      return res.status(400).json({ error: '制作时间必须是非负数' });
    }

    if (cost && (isNaN(cost) || cost < 0)) {
      return res.status(400).json({ error: '成本必须是非负数' });
    }

    if (selling_price && (isNaN(selling_price) || selling_price < 0)) {
      return res.status(400).json({ error: '售价必须是非负数' });
    }

    // 创建新产品
    const productId = uuidv4();
    await query(
      `INSERT INTO products (
        id, product_name, category, raw_material, weight, size, 
        craft_time, cost, selling_price, description, photos, status, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId, 
        product_name || null, 
        category || null, 
        raw_material || null, 
        weight || null, 
        size || null,
        craft_time || null, 
        cost || null, 
        selling_price || null, 
        description || null, 
        photos ? JSON.stringify(photos) : null, 
        status || '制作中', 
        req.user.id
      ]
    );

    // 获取新创建的产品信息
    const newProducts = await query(
      `SELECT p.*, u.username as creator_name
       FROM products p
       LEFT JOIN user_profiles u ON p.user_id = u.id
       WHERE p.id = ?`,
      [productId]
    );

    res.status(201).json({
      message: '产品创建成功',
      product: newProducts[0]
    });
  } catch (error) {
    console.error('创建产品错误:', error);
    res.status(500).json({ error: '创建产品失败' });
  }
});

// 更新产品信息
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      product_name,
      category,
      raw_material,
      weight,
      size,
      craft_time,
      cost,
      selling_price,
      description,
      photos,
      status
    } = req.body;

    // 检查产品是否存在且有权限
    let whereClause = 'WHERE id = ?';
    let checkParams = [id];

    if (req.user.role !== 'admin') {
      whereClause += ' AND user_id = ?';
      checkParams.push(req.user.id);
    }

    const existingProducts = await query(
      `SELECT id FROM products ${whereClause}`,
      checkParams
    );

    if (existingProducts.length === 0) {
      return res.status(404).json({ error: '产品不存在或无权访问' });
    }

    // 验证数值字段
    if (weight !== undefined && (isNaN(weight) || weight < 0)) {
      return res.status(400).json({ error: '重量必须是非负数' });
    }

    if (craft_time !== undefined && (isNaN(craft_time) || craft_time < 0)) {
      return res.status(400).json({ error: '制作时间必须是非负数' });
    }

    if (cost !== undefined && (isNaN(cost) || cost < 0)) {
      return res.status(400).json({ error: '成本必须是非负数' });
    }

    if (selling_price !== undefined && (isNaN(selling_price) || selling_price < 0)) {
      return res.status(400).json({ error: '售价必须是非负数' });
    }

    // 更新产品信息
    await query(
      `UPDATE products SET 
       product_name = COALESCE(?, product_name),
       category = COALESCE(?, category),
       raw_material = COALESCE(?, raw_material),
       weight = COALESCE(?, weight),
       size = COALESCE(?, size),
       craft_time = COALESCE(?, craft_time),
       cost = COALESCE(?, cost),
       selling_price = COALESCE(?, selling_price),
       description = COALESCE(?, description),
       photos = COALESCE(?, photos),
       status = COALESCE(?, status)
       WHERE id = ?`,
      [
        product_name, category, raw_material, weight, size,
        craft_time, cost, selling_price, description,
        photos ? JSON.stringify(photos) : null, status, id
      ]
    );

    // 获取更新后的产品信息
    const updatedProducts = await query(
      `SELECT p.*, u.username as creator_name
       FROM products p
       LEFT JOIN user_profiles u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    res.json({
      message: '产品信息更新成功',
      product: updatedProducts[0]
    });
  } catch (error) {
    console.error('更新产品信息错误:', error);
    res.status(500).json({ error: '更新产品信息失败' });
  }
});

// 删除产品
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查产品是否存在且有权限
    let whereClause = 'WHERE id = ?';
    let checkParams = [id];

    if (req.user.role !== 'admin') {
      whereClause += ' AND user_id = ?';
      checkParams.push(req.user.id);
    }

    const existingProducts = await query(
      `SELECT id, product_name FROM products ${whereClause}`,
      checkParams
    );

    if (existingProducts.length === 0) {
      return res.status(404).json({ error: '产品不存在或无权访问' });
    }

    // 删除产品
    await query('DELETE FROM products WHERE id = ?', [id]);

    res.json({
      message: '产品删除成功',
      deletedProduct: existingProducts[0].product_name
    });
  } catch (error) {
    console.error('删除产品错误:', error);
    res.status(500).json({ error: '删除产品失败' });
  }
});

// 获取产品统计信息
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    let whereClause = 'WHERE 1=1';
    let params = [];

    // 非管理员只能查看自己的统计
    if (req.user.role !== 'admin') {
      whereClause += ' AND user_id = ?';
      params.push(req.user.id);
    }

    // 获取统计数据
    const stats = await query(
      `SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_products,
        COUNT(CASE WHEN status = '制作中' THEN 1 END) as in_progress_products,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(selling_price), 0) as total_selling_price,
        COALESCE(AVG(cost), 0) as avg_cost,
        COALESCE(AVG(selling_price), 0) as avg_selling_price
       FROM products ${whereClause}`,
      params
    );

    res.json({ stats: stats[0] });
  } catch (error) {
    console.error('获取产品统计错误:', error);
    res.status(500).json({ error: '获取产品统计失败' });
  }
});

module.exports = router;