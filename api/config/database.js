const mysql = require('mysql2/promise');
require('dotenv').config();

// 环境检测
const isProduction = process.env.NODE_ENV === 'production';
const environment = isProduction ? 'production' : 'development';

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'erp_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shuijing_erp',
  charset: 'utf8mb4',
  timezone: '+08:00',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// 输出当前环境和数据库配置信息
console.log(`\n=== 数据库配置 [${environment}] ===`);
console.log(`主机: ${dbConfig.host}`);
console.log(`端口: ${dbConfig.port}`);
console.log(`用户: ${dbConfig.user}`);
console.log(`数据库: ${dbConfig.database}`);
console.log(`字符集: ${dbConfig.charset}`);
console.log('================================\n');

// 创建连接池
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL数据库连接失败:', error.message);
    return false;
  }
}

// 执行查询的通用方法
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

// 执行事务的方法
async function transaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  query,
  transaction,
  testConnection
};