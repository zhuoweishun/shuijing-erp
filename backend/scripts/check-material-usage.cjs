const mysql = require('mysql2/promise');

async function checkMaterialUsage() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });
  
  console.log('material_usage表结构:');
  const [cols] = await conn.execute('DESCRIBE material_usage');
  cols.forEach(col => console.log(`${col.Field} - ${col.Type}`));
  
  console.log('\n示例数据:');
  const [rows] = await conn.execute('SELECT * FROM material_usage LIMIT 3');
  if (rows.length > 0) {
    console.log(JSON.stringify(rows[0], null, 2));
  }
  
  await conn.end();
}

checkMaterialUsage().catch(console.error);