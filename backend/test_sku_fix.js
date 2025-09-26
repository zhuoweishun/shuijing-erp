import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('🧹 清除测试数据...');
    
    // 1. 删除SKU20250926001相关的库存变动日志
    const [deleteLogsResult] = await connection.execute(`
      DELETE sil FROM sku_inventory_logs sil
      JOIN product_skus ps ON sil.sku_id = ps.id
      WHERE ps.sku_code = ?
    `, ['SKU20250926001']);
    console.log(`删除了 ${deleteLogsResult.affectedRows} 条库存变动日志`);
    
    // 2. 删除相关的产品记录
    const [deleteProductsResult] = await connection.execute(`
      DELETE p FROM products p
      JOIN product_skus ps ON p.sku_id = ps.id
      WHERE ps.sku_code = ?
    `, ['SKU20250926001']);
    console.log(`删除了 ${deleteProductsResult.affectedRows} 条产品记录`);
    
    // 3. 删除相关的原材料使用记录
    const [deleteMaterialUsageResult] = await connection.execute(`
      DELETE mu FROM material_usage mu
      JOIN product_skus ps ON mu.sku_id = ps.id
      WHERE ps.sku_code = ?
    `, ['SKU20250926001']);
    console.log(`删除了 ${deleteMaterialUsageResult.affectedRows} 条原材料使用记录`);
    
    // 4. 删除SKU记录
    const [deleteSkuResult] = await connection.execute(`
      DELETE FROM product_skus WHERE sku_code = ?
    `, ['SKU20250926001']);
    console.log(`删除了 ${deleteSkuResult.affectedRows} 条SKU记录`);
    
    console.log('\n✅ 测试数据清除完成！');
    console.log('\n现在可以重新测试SKU创建功能，验证库存变动日志是否正确显示。');
    console.log('\n预期结果：');
    console.log('- 创建第1个产品时：库存变动 0 → 1');
    console.log('- 创建第2个产品时：库存变动 1 → 2');
    console.log('- 创建第3个产品时：库存变动 2 → 3');
    console.log('- 创建第4个产品时：库存变动 3 → 4');
    console.log('- 创建第5个产品时：库存变动 4 → 5');
    
    await connection.end();
  } catch (error) {
    console.error('清除测试数据失败:', error);
  }
})();