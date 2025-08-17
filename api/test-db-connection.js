const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseConnection() {
  try {
    console.log('正在测试数据库连接...');
    console.log('连接参数:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });

    // 创建连接
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ 数据库连接成功!');

    // 测试查询
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 数据库查询测试成功:', rows);

    // 检查数据库是否存在
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('📋 可用数据库:', databases.map(db => db.Database));

    // 检查表是否存在
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 当前数据库中的表:', tables);

    await connection.end();
    console.log('✅ 数据库连接测试完成');

  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.error('错误代码:', error.code);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 建议: 检查用户名和密码是否正确');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 建议: 数据库不存在，需要创建');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 建议: MySQL服务未启动或端口不正确');
    }
  }
}

testDatabaseConnection();