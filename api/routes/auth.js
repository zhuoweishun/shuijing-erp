const express = require('express');
const { hash, compare } = require('../utils/crypto');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    const users = await query(
      'SELECT * FROM user_profiles WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const user = users[0];

    // 验证密码
    const isValidPassword = await compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成JWT令牌
    const token = generateToken(user);

    // 返回用户信息（不包含密码）
    const { password_hash, ...userInfo } = user;
    
    res.json({
      message: '登录成功',
      token,
      user: userInfo
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码不能为空' });
    }

    // 验证密码强度
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // 检查用户名是否已存在
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
      [userId, username, email, full_name || username, password_hash, 'user']
    );

    // 获取新创建的用户信息
    const newUsers = await query(
      'SELECT id, username, email, full_name, role, created_at FROM user_profiles WHERE id = ?',
      [userId]
    );

    const newUser = newUsers[0];
    const token = generateToken(newUser);

    res.status(201).json({
      message: '注册成功',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, username, email, full_name, role, created_at, updated_at FROM user_profiles WHERE id = ?',
      [req.user.id]
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

// 更新用户信息
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const userId = req.user.id;

    // 检查邮箱是否被其他用户使用
    if (email) {
      const existingUsers = await query(
        'SELECT id FROM user_profiles WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({ error: '邮箱已被其他用户使用' });
      }
    }

    // 更新用户信息
    await query(
      'UPDATE user_profiles SET full_name = COALESCE(?, full_name), email = COALESCE(?, email) WHERE id = ?',
      [full_name, email, userId]
    );

    // 获取更新后的用户信息
    const updatedUsers = await query(
      'SELECT id, username, email, full_name, role, created_at, updated_at FROM user_profiles WHERE id = ?',
      [userId]
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

// 修改密码
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '当前密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少6位' });
    }

    // 获取当前用户信息
    const users = await query(
      'SELECT password_hash FROM user_profiles WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 验证当前密码
    const isValidPassword = await compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '当前密码错误' });
    }

    // 加密新密码
    const newPasswordHash = await hash(newPassword);

    // 更新密码
    await query(
      'UPDATE user_profiles SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

module.exports = router;