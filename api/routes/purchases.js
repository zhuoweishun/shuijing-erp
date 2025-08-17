const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取采购记录列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      supplier = '', 
      crystal_type = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];

    // 非管理员只能查看自己的采购记录
    if (req.user.role !== 'admin') {
      whereClause += ' AND user_id = ?';
      params.push(req.user.id);
    }

    // 搜索条件
    if (search) {
      whereClause += ' AND (supplier LIKE ? OR crystal_type LIKE ? OR notes LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 供应商筛选
    if (supplier) {
      whereClause += ' AND supplier = ?';
      params.push(supplier);
    }

    // 水晶类型筛选
    if (crystal_type) {
      whereClause += ' AND crystal_type = ?';
      params.push(crystal_type);
    }

    // 排序
    const validSortFields = ['created_at', 'supplier', 'crystal_type', 'weight', 'price', 'quality'];
    const validSortOrders = ['ASC', 'DESC'];
    const orderBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // 获取采购记录列表
    const limitNum = parseInt(limit) || 10;
    const offsetNum = parseInt(offset) || 0;
    
    const sql = `SELECT p.*, u.username as creator_name
                 FROM purchases p
                 LEFT JOIN user_profiles u ON p.user_id = u.id
                 ${whereClause}
                 ORDER BY p.${orderBy} ${order}
                 LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const purchases = await query(sql, params);

    // 获取总数
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM purchases p ${whereClause}`,
      params
    );
    const total = totalResult[0].total;

    res.json({
      purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取采购记录列表错误:', error);
    res.status(500).json({ error: '获取采购记录列表失败' });
  }
});

// 获取单个采购记录详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let whereClause = 'WHERE p.id = ?';
    let params = [id];

    // 非管理员只能查看自己的采购记录
    if (req.user.role !== 'admin') {
      whereClause += ' AND p.user_id = ?';
      params.push(req.user.id);
    }

    const purchases = await query(
      `SELECT p.*, u.username as creator_name
       FROM purchases p
       LEFT JOIN user_profiles u ON p.user_id = u.id
       ${whereClause}`,
      params
    );

    if (purchases.length === 0) {
      return res.status(404).json({ error: '采购记录不存在或无权访问' });
    }

    res.json({ purchase: purchases[0] });
  } catch (error) {
    console.error('获取采购记录详情错误:', error);
    res.status(500).json({ error: '获取采购记录详情失败' });
  }
});

// 创建新采购记录
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      supplier,
      crystal_type,
      weight,
      price,
      quality = '未知',
      notes,
      photos,
      quantity,
      size,
      unit_price,
      bead_price,
      estimated_bead_count
    } = req.body;

    // 验证必填字段
    if (!supplier || !crystal_type || !weight || !price) {
      return res.status(400).json({ error: '供应商、水晶类型、重量和价格不能为空' });
    }

    // 验证数值字段
    if (isNaN(weight) || weight <= 0) {
      return res.status(400).json({ error: '重量必须是正数' });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: '价格必须是正数' });
    }

    if (quantity && (isNaN(quantity) || quantity <= 0)) {
      return res.status(400).json({ error: '数量必须是正数' });
    }

    if (unit_price && (isNaN(unit_price) || unit_price < 0)) {
      return res.status(400).json({ error: '单价必须是非负数' });
    }

    if (bead_price && (isNaN(bead_price) || bead_price < 0)) {
      return res.status(400).json({ error: '珠子价格必须是非负数' });
    }

    if (estimated_bead_count && (isNaN(estimated_bead_count) || estimated_bead_count < 0)) {
      return res.status(400).json({ error: '预估珠子数量必须是非负数' });
    }

    // 创建新采购记录
    const purchaseId = uuidv4();
    await query(
      `INSERT INTO purchases (
        id, supplier, crystal_type, weight, price, quality, notes, photos,
        quantity, size, unit_price, bead_price, estimated_bead_count, 
        user_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseId, supplier, crystal_type, weight, price, quality, notes,
        photos ? JSON.stringify(photos) : null, quantity, size, unit_price,
        bead_price, estimated_bead_count, req.user.id, req.user.username
      ]
    );

    // 获取新创建的采购记录信息
    const newPurchases = await query(
      `SELECT p.*, u.username as creator_name
       FROM purchases p
       LEFT JOIN user_profiles u ON p.user_id = u.id
       WHERE p.id = ?`,
      [purchaseId]
    );

    res.status(201).json({
      message: '采购记录创建成功',
      purchase: newPurchases[0]
    });
  } catch (error) {
    console.error('创建采购记录错误:', error);
    res.status(500).json({ error: '创建采购记录失败' });
  }
});

// 更新采购记录信息
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplier,
      crystal_type,
      weight,
      price,
      quality,
      notes,
      photos,
      quantity,
      size,
      unit_price,
      bead_price,
      estimated_bead_count
    } = req.body;

    // 检查采购记录是否存在且有权限
    let whereClause = 'WHERE id = ?';
    let checkParams = [id];

    if (req.user.role !== 'admin') {
      whereClause += ' AND user_id = ?';
      checkParams.push(req.user.id);
    }

    const existingPurchases = await query(
      `SELECT id FROM purchases ${whereClause}`,
      checkParams
    );

    if (existingPurchases.length === 0) {
      return res.status(404).json({ error: '采购记录不存在或无权访问' });
    }

    // 验证数值字段
    if (weight !== undefined && (isNaN(weight) || weight <= 0)) {
      return res.status(400).json({ error: '重量必须是正数' });
    }

    if (price !== undefined && (isNaN(price) || price <= 0)) {
      return res.status(400).json({ error: '价格必须是正数' });
    }

    if (quantity !== undefined && (isNaN(quantity) || quantity <= 0)) {
      return res.status(400).json({ error: '数量必须是正数' });
    }

    if (unit_price !== undefined && (isNaN(unit_price) || unit_price < 0)) {
      return res.status(400).json({ error: '单价必须是非负数' });
    }

    if (bead_price !== undefined && (isNaN(bead_price) || bead_price < 0)) {
      return res.status(400).json({ error: '珠子价格必须是非负数' });
    }

    if (estimated_bead_count !== undefined && (isNaN(estimated_bead_count) || estimated_bead_count < 0)) {
      return res.status(400).json({ error: '预估珠子数量必须是非负数' });
    }

    // 更新采购记录信息
    await query(
      `UPDATE purchases SET 
       supplier = COALESCE(?, supplier),
       crystal_type = COALESCE(?, crystal_type),
       weight = COALESCE(?, weight),
       price = COALESCE(?, price),
       quality = COALESCE(?, quality),
       notes = COALESCE(?, notes),
       photos = COALESCE(?, photos),
       quantity = COALESCE(?, quantity),
       size = COALESCE(?, size),
       unit_price = COALESCE(?, unit_price),
       bead_price = COALESCE(?, bead_price),
       estimated_bead_count = COALESCE(?, estimated_bead_count)
       WHERE id = ?`,
      [
        supplier, crystal_type, weight, price, quality, notes,
        photos ? JSON.stringify(photos) : null, quantity, size,
        unit_price, bead_price, estimated_bead_count, id
      ]
    );

    // 获取更新后的采购记录信息
    const updatedPurchases = await query(
      `SELECT p.*, u.username as creator_name
       FROM purchases p
       LEFT JOIN user_profiles u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    res.json({
      message: '采购记录更新成功',
      purchase: updatedPurchases[0]
    });
  } catch (error) {
    console.error('更新采购记录错误:', error);
    res.status(500).json({ error: '更新采购记录失败' });
  }
});

// 删除采购记录
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查采购记录是否存在且有权限
    let whereClause = 'WHERE id = ?';
    let checkParams = [id];

    if (req.user.role !== 'admin') {
      whereClause += ' AND user_id = ?';
      checkParams.push(req.user.id);
    }

    const existingPurchases = await query(
      `SELECT id, supplier, crystal_type FROM purchases ${whereClause}`,
      checkParams
    );

    if (existingPurchases.length === 0) {
      return res.status(404).json({ error: '采购记录不存在或无权访问' });
    }

    // 删除采购记录
    await query('DELETE FROM purchases WHERE id = ?', [id]);

    res.json({
      message: '采购记录删除成功',
      deletedPurchase: `${existingPurchases[0].supplier} - ${existingPurchases[0].crystal_type}`
    });
  } catch (error) {
    console.error('删除采购记录错误:', error);
    res.status(500).json({ error: '删除采购记录失败' });
  }
});

// 获取采购统计信息
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
        COUNT(*) as total_purchases,
        COALESCE(SUM(price), 0) as total_amount,
        COALESCE(SUM(weight), 0) as total_weight,
        COALESCE(AVG(price), 0) as avg_price,
        COALESCE(AVG(weight), 0) as avg_weight,
        COUNT(DISTINCT supplier) as supplier_count,
        COUNT(DISTINCT crystal_type) as crystal_type_count
       FROM purchases ${whereClause}`,
      params
    );

    // 获取供应商统计
    const supplierStats = await query(
      `SELECT supplier, COUNT(*) as purchase_count, SUM(price) as total_amount
       FROM purchases ${whereClause}
       GROUP BY supplier
       ORDER BY total_amount DESC
       LIMIT 5`,
      params
    );

    // 获取水晶类型统计
    const crystalTypeStats = await query(
      `SELECT crystal_type, COUNT(*) as purchase_count, SUM(weight) as total_weight
       FROM purchases ${whereClause}
       GROUP BY crystal_type
       ORDER BY total_weight DESC
       LIMIT 5`,
      params
    );

    res.json({ 
      stats: stats[0],
      topSuppliers: supplierStats,
      topCrystalTypes: crystalTypeStats
    });
  } catch (error) {
    console.error('获取采购统计错误:', error);
    res.status(500).json({ error: '获取采购统计失败' });
  }
});

// 获取供应商列表
router.get('/suppliers/list', authenticateToken, async (req, res) => {
  try {
    let whereClause = 'WHERE 1=1';
    let params = [];

    // 非管理员只能查看自己的供应商
    if (req.user.role !== 'admin') {
      whereClause += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const suppliers = await query(
      `SELECT DISTINCT supplier FROM purchases ${whereClause} ORDER BY supplier`,
      params
    );

    res.json({ suppliers: suppliers.map(s => s.supplier) });
  } catch (error) {
    console.error('获取供应商列表错误:', error);
    res.status(500).json({ error: '获取供应商列表失败' });
  }
});

// 获取水晶类型列表
router.get('/crystal-types/list', authenticateToken, async (req, res) => {
  try {
    let whereClause = 'WHERE 1=1';
    let params = [];

    // 非管理员只能查看自己的水晶类型
    if (req.user.role !== 'admin') {
      whereClause += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const crystalTypes = await query(
      `SELECT DISTINCT crystal_type FROM purchases ${whereClause} ORDER BY crystal_type`,
      params
    );

    res.json({ crystalTypes: crystalTypes.map(c => c.crystal_type) });
  } catch (error) {
    console.error('获取水晶类型列表错误:', error);
    res.status(500).json({ error: '获取水晶类型列表失败' });
  }
});

module.exports = router;