import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    // 查看最新的油胆采购记录
    const [purchases] = await connection.execute(`
      SELECT * FROM purchases 
      WHERE material_name LIKE '%油胆%' 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('最新油胆采购记录数量:', purchases.length);
    
    purchases.forEach((purchase, index) => {
      console.log('\n采购记录', index + 1, ':');
      console.log('ID:', purchase.id);
      console.log('材料名称:', purchase.material_name);
      console.log('材料类型:', purchase.material_type);
      console.log('数量:', purchase.piece_count);
      console.log('重量:', purchase.weight);
      console.log('总价:', purchase.total_price);
      console.log('创建时间:', purchase.created_at);
    });
    
    await connection.end();
  } catch (error) {
    console.error('错误:', error.message);
  }
})();