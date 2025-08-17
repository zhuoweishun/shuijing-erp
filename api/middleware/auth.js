const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'shuijing-erp-secret-key-2024';

// 生成JWT令牌
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// 验证JWT令牌中间件
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 验证用户是否仍然存在
    const users = await query(
      'SELECT id, username, email, full_name, role FROM user_profiles WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: '用户不存在' });
    }
    
    req.user = users[0];
    next();
  } catch (error) {
    console.error('令牌验证失败:', error);
    return res.status(403).json({ error: '访问令牌无效' });
  }
}

// 验证管理员权限中间件
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

// 验证用户权限中间件（用户只能访问自己的数据）
function requireOwnerOrAdmin(req, res, next) {
  const userId = req.params.userId || req.body.user_id;
  
  if (req.user.role === 'admin' || req.user.id === userId) {
    next();
  } else {
    return res.status(403).json({ error: '权限不足' });
  }
}

module.exports = {
  generateToken,
  authenticateToken,
  requireAdmin,
  requireOwnerOrAdmin
};