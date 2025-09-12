const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFinancialTableStructure() {
  let connection;
  
  try {
    // 从DATABASE_URL解析数据库连接信息
    const databaseUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
    const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!urlMatch) {
      throw new Error('无法解析DATABASE_URL');
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    // 连接数据库
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: parseInt(port)
    });
    
    console.log('🔍 检查financial_records表结构...');
    
    // 检查表结构
    const [result] = await connection.execute('DESCRIBE financial_records');
    
    console.log('\nfinancial_records表结构:');
    console.log('-'.repeat(60));
    result.forEach(col => {
      console.log(`${col.Field.padEnd(20)} | ${col.Type.padEnd(15)} | ${col.Null.padEnd(5)} | ${col.Key.padEnd(5)} | ${col.Default || 'NULL'}`);
    });
    
    // 检查是否存在details字段
    const hasDetailsField = result.some(col => col.Field === 'details');
    console.log(`\n是否有details字段: ${hasDetailsField ? '✅ 是' : '❌ 否'}`);
    
    // 查看现有记录示例
    const [sampleRecords] = await connection.execute('SELECT * FROM financial_records LIMIT 3');
    
    console.log('\n现有记录示例:');
    console.log('-'.repeat(60));
    sampleRecords.forEach((record, index) => {
      console.log(`记录 ${index + 1}:`);
      Object.keys(record).forEach(key => {
        console.log(`  ${key}: ${record[key]}`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkFinancialTableStructure();