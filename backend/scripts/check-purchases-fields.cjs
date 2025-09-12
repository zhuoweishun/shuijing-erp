const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkPurchasesFields() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  try {
    console.log('🔍 检查purchases表字段...');
    const [cols] = await connection.execute('DESCRIBE purchases');
    console.log('purchases表字段:');
    cols.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
    
    console.log('\n📦 检查purchases表数据...');
    const [data] = await connection.execute('SELECT * FROM purchases LIMIT 3');
    console.log(`共有 ${data.length} 条记录`);
    if (data.length > 0) {
      console.log('第一条记录的字段:');
      Object.keys(data[0]).forEach(key => {
        console.log(`- ${key}: ${data[0][key]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 检查时出错:', error);
  } finally {
    await connection.end();
  }
}

checkPurchasesFields();