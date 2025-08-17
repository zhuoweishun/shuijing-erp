const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// SQLite数据库文件路径
const dbPath = path.join(__dirname, '..', 'data', 'shuijing_erp.db');

// 创建数据目录
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

// 初始化数据库连接
async function initDatabase() {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // 启用外键约束
    await db.exec('PRAGMA foreign_keys = ON');
    
    console.log('✅ SQLite数据库连接成功');
    
    // 创建表结构
    await createTables();
    
    return true;
  } catch (error) {
    console.error('❌ SQLite数据库连接失败:', error.message);
    return false;
  }
}

// 创建表结构
async function createTables() {
  try {
    // 用户表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        email VARCHAR(100),
        phone VARCHAR(20),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 产品表
    await db.exec(`
      CREATE TABLE