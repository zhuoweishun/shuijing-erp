const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

async function fixInventory() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    // 获取所有SKU
    const [skus] = await connection.execute(`
      SELECT id, skuCode, skuName, availableQuantity, totalQuantity 
      FROM product_skus
    `);
    
    console.log('📦 修复SKU库存...');
    
    for (const sku of skus) {
      // 如果可售数量为负数或为0，重置为合理的库存
      if (sku.availableQuantity <= 0) {
        const newQuantity = 10; // 设置为10件库存
        
        await connection.execute(`
          UPDATE product_skus 
          SET availableQuantity = ?, totalQuantity = GREATEST(totalQuantity, ?)
          WHERE id = ?
        `, [newQuantity, newQuantity, sku.id]);
        
        console.log(`✅ 修复 ${sku.skuCode}: ${sku.skuName} - 库存从 ${sku.availableQuantity} 修复为 ${newQuantity}`);
      } else {
        console.log(`✓ ${sku.skuCode}: ${sku.skuName} - 库存正常 (${sku.availableQuantity})`);
      }
    }
    
    // 检查修复后的库存
    const [fixedSkus] = await connection.execute(`
      SELECT skuCode, skuName, availableQuantity, totalQuantity 
      FROM product_skus 
      ORDER BY createdAt DESC
    `);
    
    console.log('\n📊 修复后的库存情况:');
    fixedSkus.forEach(sku => {
      console.log(`${sku.skuCode}: ${sku.skuName} - 可售:${sku.availableQuantity}, 总量:${sku.totalQuantity}`);
    });
    
    // 统计可售SKU数量
    const [availableCount] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM product_skus 
      WHERE availableQuantity > 0
    `);
    
    console.log(`\n✅ 修复完成！现在有 ${availableCount[0].count} 个可售SKU`);
    
  } catch (error) {
    console.error('❌ 执行过程中出现错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔗 数据库连接已关闭');
    }
  }
}

// 执行修复
fixInventory().catch(console.error);