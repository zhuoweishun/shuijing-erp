import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    // 查找最新的油胆采购记录
    const [purchases] = await connection.execute(`
      SELECT * FROM purchases 
      WHERE purchase_name LIKE '%油胆%' 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    console.log('找到的油胆采购记录数量:', purchases.length);
    
    purchases.forEach((purchase, index) => {
      console.log(`\n油胆采购记录 ${index + 1}:`);
      console.log('ID:', purchase.id);
      console.log('名称:', purchase.purchase_name);
      console.log('类型:', purchase.purchase_type);
      console.log('状态:', purchase.status);
      console.log('数量:', purchase.piece_count);
      console.log('总价:', purchase.total_price);
      console.log('创建时间:', purchase.created_at);
      
      // 检查是否有对应的material记录
      connection.execute(
        'SELECT COUNT(*) as count FROM materials WHERE purchase_id = ?',
        [purchase.id]
      ).then(([result]) => {
        console.log('对应material记录数量:', result[0].count);
      });
    });
    
    await connection.end();
  } catch (error) {
    console.error('错误:', error.message);
  }
})();