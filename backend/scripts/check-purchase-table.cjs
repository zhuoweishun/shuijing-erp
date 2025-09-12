const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function checkPurchaseTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  console.log('📋 customer_purchases表结构:');
  const [columns] = await connection.execute('DESCRIBE customer_purchases');
  columns.forEach(col => {
    console.log(`${col.Field} - ${col.Type}`);
  });
  
  console.log('\n📊 customer_purchases表数据样本:');
  const [records] = await connection.execute('SELECT * FROM customer_purchases LIMIT 5');
  console.log(`记录总数: ${records.length}`);
  records.forEach((record, index) => {
    console.log(`${index + 1}.`, record);
  });
  
  await connection.end();
}

checkPurchaseTable().catch(console.error);