const express = require('express');
const { hash } = require('../utils/crypto');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取用户列表（仅管理员）
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE username LIKE ? OR email LIKE ? OR full_name LIKE ?';
      const searchPattern = `%${search}%`;
      params = [searchPattern, searchPattern, searchPattern];
    }

    // 获取用户列表
    const limitNum = parseInt(limit) || 10;
    const offsetNum = parseInt(offset) || 0;
    
    const sql = `SELECT id, username, email, full_name, role, created_at, updated_at 
                 FROM user_profiles 
                 ${whereClause} 
                 ORDER BY created_at DESC 
                 LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const users = await query(sql, params);

    // 获取总数
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM user_profiles ${whereClause}`,
      params
    );
    const total = totalResult[0].total;

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 获取单个用户信息（仅管理员）
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const users = await query(
      'SELECT id, username, email, full_name, role, created_at, updated_at FROM user_profiles WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 创建新用户（仅管理员）
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'user' } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码不能为空' });
    }

    // 验证角色
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: '无效的用户角色' });
    }

    // 验证密码强度
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // 检查用户名和邮箱是否已存在
    const existingUsers = await query(
      'SELECT id FROM user_profiles WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: '用户名或邮箱已存在' });
    }

    // 加密密码
    const password_hash = await hash(password);

    // 创建新用户
    const userId = uuidv4();
    await query(
      'INSERT INTO user_profiles (id, username, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, username, email, full_name || username, password_hash, role]
    );

    // 获取新创建的用户信息
    const newUsers = await query(
      'SELECT id, username, email, full_name, role, created_at FROM user_profiles WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      message: '用户创建成功',
      user: newUsers[0]
    });
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({ error: '创建用户失败' });
  }
});

// 更新用户信息（仅管理员）
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, full_name, role } = req.body;

    // 检查用户是否存在
    const existingUsers = await query(
      'SELECT id FROM user_profiles WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 验证角色
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: '无效的用户角色' });
    }

    // 检查用户名和邮箱是否被其他用户使用
    if (username || email) {
      const conflictUsers = await query(
        'SELECT id FROM user_profiles WHERE (username = ? OR email = ?) AND id != ?',
        [username || '', email || '', id]
      );

      if (conflictUsers.length > 0) {
        return res.status(409).json({ error: '用户名或邮箱已被其他用户使用' });
      }
    }

    // 更新用户信息
    await query(
      `UPDATE user_profiles SET 
       username = COALESCE(?, username),
       email = COALESCE(?, email),
       full_name = COALESCE(?, full_name),
       role = COALESCE(?, role)
       WHERE id = ?`,
      [username, email, full_name, role, id]
    );

    // 获取更新后的用户信息
    const updatedUsers = await query(
      'SELECT id, username, email, full_name, role, created_at, updated_at FROM user_profiles WHERE id = ?',
      [id]
    );

    res.json({
      message: '用户信息更新成功',
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// 重置用户密码（仅管理员）
router.put('/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: '新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // 检查用户是否存在
    const existingUsers = await query(
      'SELECT id FROM user_profiles WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 加密新密码
    const password_hash = await hash(newPassword);

    // 更新密码
    await query(
      'UPDATE user_profiles SET password_hash = ? WHERE id = ?',
      [password_hash, id]
    );

    res.json({ message: '密码重置成功' });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ error: '重置密码失败' });
  }
});

// 删除用户（仅管理员）
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查用户是否存在
    const existingUsers = await query(
      'SELECT id, username FROM user_profiles WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 防止删除自己
    if (id === req.user.id) {
      return res.status(400).json({ error: '不能删除自己的账户' });
    }

    // 删除用户（注意：这里应该考虑软删除或者处理关联数据）
    await query('DELETE FROM user_profiles WHERE id = ?', [id]);

    res.json({ 
      message: '用户删除成功',
      deletedUser: existingUsers[0].username
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

module.exports = router;