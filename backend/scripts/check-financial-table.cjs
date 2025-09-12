const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function checkFinancialTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  console.log('📋 financial_records表结构:');
  const [columns] = await connection.execute('DESCRIBE financial_records');
  columns.forEach(col => {
    console.log(`${col.Field} - ${col.Type} - ${col.Null} - ${col.Key} - ${col.Default}`);
  });
  
  console.log('\n📊 financial_records表数据样本:');
  const [records] = await connection.execute('SELECT * FROM financial_records LIMIT 10');
  console.log(`记录总数: ${records.length}`);
  records.forEach((record, index) => {
    console.log(`${index + 1}.`, record);
  });
  
  console.log('\n📈 financial_records表统计:');
  const [count] = await connection.execute('SELECT COUNT(*) as total FROM financial_records');
  console.log(`总记录数: ${count[0].total}`);
  
  await connection.end();
}

checkFinancialTable().catch(console.error);