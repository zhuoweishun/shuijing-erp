const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCustomerPurchasesFields() {
  let connection;
  
  try {
    const databaseUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
    const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!urlMatch) {
      throw new Error('无法解析DATABASE_URL');
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: parseInt(port)
    });

    console.log('🔍 检查customer_purchases表字段...');
    
    const [columns] = await connection.execute('DESCRIBE customer_purchases');
    console.log('customer_purchases表字段:');
    columns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})`);
    });
    
    console.log('\n📋 查看前3条customer_purchases记录:');
    const [records] = await connection.execute('SELECT * FROM customer_purchases LIMIT 3');
    
    if (records.length > 0) {
      console.log('字段名列表:');
      console.log(Object.keys(records[0]).join(', '));
      
      console.log('\n示例记录:');
      records.forEach((record, index) => {
        console.log(`\n记录 ${index + 1}:`);
        Object.entries(record).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkCustomerPurchasesFields().catch(console.error);