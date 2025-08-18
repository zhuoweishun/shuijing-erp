const { hash } = require('./utils/crypto');
const { query } = require('./config/database');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function createAdminUser() {
  try {
    console.log('正在创建默认管理员账号...');
    
    // 删除现有admin用户（如果存在）
    await query(
      'DELETE FROM user_profiles WHERE username = ? OR email = ?',
      ['admin', 'admin@shuijing.com']
    );
    
    // 创建管理员账号
    const adminId = uuidv4();
    const password = 'admin123';
    const passwordHash = await hash(password);
    
    await query(
      'INSERT INTO user_profiles (id, username, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, 'admin', 'admin@shuijing.com', '系统管理员', passwordHash, 'admin']
    );
    
    console.log('✅ 默认管理员账号创建成功!');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('邮箱: admin@shuijing.com');
    
  } catch (error) {
    console.error('❌ 创建管理员账号失败:', error.message);
    
    // 如果是表不存在的错误，创建表
    if (error.message.includes("doesn't exist")) {
      console.log('正在创建user_profiles表...');
      await createUserProfilesTable();
      // 重新尝试创建管理员
      await createAdminUser();
    }
  }
}

async function createUserProfilesTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS user_profiles (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        password_hash TEXT NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await query(createTableSQL);
    console.log('✅ user_profiles表创建成功');
  } catch (error) {
    console.error('❌ 创建user_profiles表失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createAdminUser, createUserProfilesTable };