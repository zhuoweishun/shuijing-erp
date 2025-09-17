import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    // 查看purchases表结构
    const [columns] = await connection.execute('DESCRIBE purchases');
    console.log('purchases表字段:');
    columns.forEach(col => {
      console.log(`${col.Field}: ${col.Type}`);
    });
    
    // 查看最新的采购记录
    const [purchases] = await connection.execute(`
      SELECT * FROM purchases 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n最新采购记录数量:', purchases.length);
    
    purchases.forEach((purchase, index) => {
      console.log('\n采购记录', index + 1, ':');
      Object.keys(purchase).forEach(key => {
        console.log(`${key}:`, purchase[key]);
      });
    });
    
    await connection.end();
  } catch (error) {
    console.error('错误:', error.message);
  }
})();