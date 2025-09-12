const mysql = require('mysql2/promise');

async function checkPurchaseCodes() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('检查数据库中的采购记录CG编号...');
    
    // 先查看表结构
    const [columns] = await connection.execute('DESCRIBE purchases');
    console.log('\npurchases表结构:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
    
    const [rows] = await connection.execute(
      'SELECT * FROM purchases ORDER BY createdAt DESC LIMIT 5'
    );
    
    console.log('\n最近5条采购记录的CG编号:');
    console.log('='.repeat(80));
    
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   CG编号: ${row.purchaseCode || '无CG编号'}`);
      console.log(`   原材料: ${row.productName}`);
      console.log(`   创建时间: ${row.createdAt}`);
      console.log('-'.repeat(40));
    });
    
    // 检查有多少记录有CG编号
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total, COUNT(purchaseCode) as withCode FROM purchases'
    );
    
    console.log('\n统计信息:');
    console.log(`总采购记录数: ${countResult[0].total}`);
    console.log(`有CG编号的记录数: ${countResult[0].withCode}`);
    console.log(`缺少CG编号的记录数: ${countResult[0].total - countResult[0].withCode}`);
    
    await connection.end();
  } catch (error) {
    console.error('检查失败:', error.message);
  }
}

checkPurchaseCodes();