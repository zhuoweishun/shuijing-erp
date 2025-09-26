import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('查询SKU20250926001的库存变动日志...');
    
    const [logs] = await connection.execute(`
      SELECT 
        sil.id,
        sil.action,
        sil.quantity_change,
        sil.quantity_before,
        sil.quantity_after,
        sil.reference_type,
        sil.notes,
        sil.created_at,
        ps.sku_code
      FROM sku_inventory_logs sil
      JOIN product_skus ps ON sil.sku_id = ps.id
      WHERE ps.sku_code = ?
      ORDER BY sil.created_at
    `, ['SKU20250926001']);
    
    console.log(`找到 ${logs.length} 条库存变动记录:`);
    
    logs.forEach((log, index) => {
      console.log(`${index + 1}. 操作: ${log.action}`);
      console.log(`   数量变化: ${log.quantity_change}`);
      console.log(`   变化前: ${log.quantity_before}`);
      console.log(`   变化后: ${log.quantity_after}`);
      console.log(`   引用类型: ${log.reference_type}`);
      console.log(`   备注: ${log.notes}`);
      console.log(`   时间: ${log.created_at}`);
      console.log('---');
    });
    
    // 查看当前SKU状态
    const [skus] = await connection.execute(`
      SELECT sku_code, total_quantity, available_quantity, created_at
      FROM product_skus 
      WHERE sku_code = ?
    `, ['SKU20250926001']);
    
    if (skus.length > 0) {
      const sku = skus[0];
      console.log('\n当前SKU状态:');
      console.log(`SKU编码: ${sku.sku_code}`);
      console.log(`总数量: ${sku.total_quantity}`);
      console.log(`可用数量: ${sku.available_quantity}`);
      console.log(`创建时间: ${sku.created_at}`);
    }
    
    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
})();