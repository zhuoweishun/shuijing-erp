const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

// 验证库存同步结果
async function verifyInventorySync() {
  let connection;
  
  try {
    console.log('🔄 验证库存同步结果...');
    
    // 建立数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 查询SKU库存状态
    console.log('\n📊 查询SKU库存状态...');
    const [skus] = await connection.execute(`
      SELECT 
        ps.id,
        ps.skuCode,
        ps.skuName,
        ps.availableQuantity,
        COUNT(cp.id) as purchase_count,
        SUM(CASE WHEN cp.status = 'ACTIVE' THEN cp.quantity ELSE 0 END) as total_sold
      FROM product_skus ps
      LEFT JOIN customer_purchases cp ON ps.id = cp.skuId
      GROUP BY ps.id, ps.skuCode, ps.skuName, ps.availableQuantity
      HAVING purchase_count > 0
      ORDER BY ps.skuName
    `);
    
    console.log(`\n📋 找到 ${skus.length} 个有销售记录的SKU`);
    
    if (skus.length === 0) {
      console.log('ℹ️  没有找到有销售记录的SKU');
      return;
    }
    
    console.log('\nSKU名称 | 当前库存 | 销售数量 | 状态');
    console.log(''.padEnd(80, '-'));
    
    let normalCount = 0;
    let negativeCount = 0;
    let zeroCount = 0;
    
    skus.forEach(sku => {
      const skuName = sku.skuName.length > 30 ? sku.skuName.substring(0, 30) + '...' : sku.skuName;
      const status = sku.availableQuantity < 0 ? '❌ 负库存' : 
                    sku.availableQuantity === 0 ? '⚠️  零库存' : '✅ 正常';
      
      console.log(`${skuName.padEnd(33)} | ${sku.availableQuantity.toString().padEnd(8)} | ${sku.total_sold.toString().padEnd(8)} | ${status}`);
      
      if (sku.availableQuantity < 0) {
        negativeCount++;
      } else if (sku.availableQuantity === 0) {
        zeroCount++;
      } else {
        normalCount++;
      }
    });
    
    console.log('\n📊 库存状态统计:');
    console.log(`✅ 正常库存: ${normalCount} 个SKU`);
    console.log(`⚠️  零库存: ${zeroCount} 个SKU`);
    console.log(`❌ 负库存: ${negativeCount} 个SKU`);
    
    if (negativeCount > 0) {
      console.log('\n⚠️  发现负库存SKU，这表明销售数量超过了原始库存');
    }
    
    // 查询库存变更日志
    console.log('\n📋 查询最近的库存变更日志...');
    const [logs] = await connection.execute(`
      SELECT 
        sil.id,
        sil.skuId,
        ps.skuName,
        sil.action,
        sil.quantityChange,
        sil.quantityBefore,
        sil.quantityAfter,
        sil.notes,
        sil.createdAt
      FROM sku_inventory_logs sil
      JOIN product_skus ps ON sil.skuId = ps.id
      WHERE sil.action = 'SELL' AND sil.notes LIKE '%客户购买记录同步%'
      ORDER BY sil.createdAt DESC
      LIMIT 10
    `);
    
    if (logs.length > 0) {
      console.log(`\n📝 最近 ${logs.length} 条库存同步日志:`);
      logs.forEach((log, index) => {
        const logTime = new Date(log.createdAt).toLocaleString('zh-CN');
        console.log(`${index + 1}. ${log.skuName} - 变更: ${log.quantityChange}, 前: ${log.quantityBefore}, 后: ${log.quantityAfter} (${logTime})`);
      });
    } else {
      console.log('\n❌ 没有找到库存同步日志，可能同步操作未执行');
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行脚本
if (require.main === module) {
  verifyInventorySync()
    .then(() => {
      console.log('\n🎉 验证完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 验证失败:', error);
      process.exit(1);
    });
}