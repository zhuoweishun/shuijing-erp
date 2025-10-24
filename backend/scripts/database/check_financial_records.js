import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkFinancialRecords() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 检查财务记录表结构...');
    
    // 查看表结构
    const [structure] = await connection.execute(`
      DESCRIBE financial_records
    `);
    
    console.log('\n📋 financial_records表结构:');
    structure.forEach(field => {
      console.log(`  ${field.Field}: ${field.Type} ${field.Null} ${field.Key} ${field.Default}`);
    });
    
    // 查看最近的财务记录
    const [records] = await connection.execute(`
      SELECT * FROM financial_records 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📊 最近的财务记录:');
    records.forEach(record => {
      console.log(`  ID: ${record.id}, 类型: ${record.type}, 金额: ${record.amount}, 业务: ${record.business_operation}`);
    });
    
  } catch (error) {
    console.error('检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkFinancialRecords().catch(console.error);