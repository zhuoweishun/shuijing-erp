const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

async function checkInventory() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    // 检查SKU库存情况
    const [skus] = await connection.execute(`
      SELECT skuCode, skuName, availableQuantity, totalQuantity 
      FROM product_skus 
      ORDER BY createdAt DESC 
      LIMIT 10
    `);
    
    console.log('📦 SKU库存情况:');
    if (skus.length === 0) {
      console.log('❌ 没有找到任何SKU');
    } else {
      skus.forEach(sku => {
        console.log(`${sku.skuCode}: ${sku.skuName} - 可售:${sku.availableQuantity}, 总量:${sku.totalQuantity}`);
      });
    }
    
    // 检查可售SKU数量
    const [availableSkus] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM product_skus 
      WHERE availableQuantity > 0
    `);
    
    console.log(`\n✅ 可售SKU数量: ${availableSkus[0].count}`);
    
    // 检查客户数量
    const [customers] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM customers
    `);
    
    console.log(`👥 客户数量: ${customers[0].count}`);
    
  } catch (error) {
    console.error('❌ 执行过程中出现错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔗 数据库连接已关闭');
    }
  }
}

// 执行检查
checkInventory().catch(console.error);