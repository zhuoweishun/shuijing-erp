const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

// 日志记录函数
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  // 写入日志文件
  const logFile = path.join(__dirname, 'clean-test-data.log');
  fs.appendFileSync(logFile, logMessage + '\n');
}

// 清理测试数据的主函数
async function cleanTestData() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    log('数据库连接成功');
    
    // 开始事务
    await connection.beginTransaction();
    log('开始清理测试数据事务');
    
    // 1. 首先备份当前数据统计
    log('=== 清理前数据统计 ===');
    await logDataStatistics(connection, '清理前');
    
    // 2. 识别测试数据的特征
    const testDataDate = '2025-09-08';
    log(`识别测试数据特征：创建日期为 ${testDataDate}`);
    
    // 3. 查找并删除测试数据（注意删除顺序，避免外键约束）
    await cleanTestCustomers(connection, testDataDate);
    await cleanTestMaterialUsage(connection, testDataDate); // 先删除material_usage
    await cleanTestSKUs(connection, testDataDate);
    await cleanTestPurchases(connection, testDataDate);
    
    // 4. 清理后数据统计
    log('=== 清理后数据统计 ===');
    await logDataStatistics(connection, '清理后');
    
    // 5. 验证数据完整性
    await validateDataIntegrity(connection);
    
    // 提交事务
    await connection.commit();
    log('✅ 测试数据清理完成，事务已提交');
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
      log('❌ 发生错误，事务已回滚');
    }
    log(`错误详情: ${error.message}`);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      log('数据库连接已关闭');
    }
  }
}

// 记录数据统计
async function logDataStatistics(connection, phase) {
  try {
    // 客户统计
    const [customers] = await connection.execute('SELECT COUNT(*) as count FROM customers');
    log(`${phase} - 客户总数: ${customers[0].count}`);
    
    // 客户购买记录统计
    const [purchases] = await connection.execute('SELECT COUNT(*) as count FROM customer_purchases');
    log(`${phase} - 客户购买记录: ${purchases[0].count}`);
    
    // SKU统计
    const [skus] = await connection.execute('SELECT COUNT(*) as count FROM product_skus');
    log(`${phase} - SKU总数: ${skus[0].count}`);
    
    // 采购记录统计
    const [purchaseRecords] = await connection.execute('SELECT COUNT(*) as count FROM purchases');
    log(`${phase} - 采购记录: ${purchaseRecords[0].count}`);
    
    // 原材料使用记录统计
    const [materialUsage] = await connection.execute('SELECT COUNT(*) as count FROM material_usage');
    log(`${phase} - 原材料使用记录: ${materialUsage[0].count}`);
    
    // 财务流水账统计（模拟视图查询）
    const [financial] = await connection.execute(`
      SELECT COUNT(*) as count FROM (
        SELECT id FROM purchases
        UNION ALL
        SELECT id FROM product_skus WHERE laborCost > 0 OR craftCost > 0
        UNION ALL
        SELECT id FROM customer_purchases WHERE status = 'ACTIVE'
        UNION ALL
        SELECT id FROM customer_purchases WHERE status = 'REFUNDED'
      ) as financial_records
    `);
    log(`${phase} - 财务流水账记录: ${financial[0].count}`);
    
  } catch (error) {
    log(`统计数据时发生错误: ${error.message}`);
  }
}

// 清理测试客户数据
async function cleanTestCustomers(connection, testDate) {
  try {
    // 查找测试客户
    const [testCustomers] = await connection.execute(`
      SELECT id, name, phone, createdAt 
      FROM customers 
      WHERE DATE(createdAt) = ?
    `, [testDate]);
    
    log(`发现 ${testCustomers.length} 个测试客户`);
    
    if (testCustomers.length > 0) {
      // 删除客户购买记录
      const customerIds = testCustomers.map(c => c.id);
      const placeholders = customerIds.map(() => '?').join(',');
      
      const [purchaseResult] = await connection.execute(`
        DELETE FROM customer_purchases 
        WHERE customerId IN (${placeholders})
      `, customerIds);
      
      log(`删除了 ${purchaseResult.affectedRows} 条客户购买记录`);
      
      // 删除客户备注
      const [notesResult] = await connection.execute(`
        DELETE FROM customer_notes 
        WHERE customerId IN (${placeholders})
      `, customerIds);
      
      log(`删除了 ${notesResult.affectedRows} 条客户备注`);
      
      // 删除客户
      const [customerResult] = await connection.execute(`
        DELETE FROM customers 
        WHERE DATE(createdAt) = ?
      `, [testDate]);
      
      log(`删除了 ${customerResult.affectedRows} 个测试客户`);
    }
    
  } catch (error) {
    log(`清理测试客户时发生错误: ${error.message}`);
    throw error;
  }
}

// 清理测试SKU数据
async function cleanTestSKUs(connection, testDate) {
  try {
    // 查找测试SKU
    const [testSKUs] = await connection.execute(`
      SELECT id, skuCode, skuName, createdAt 
      FROM product_skus 
      WHERE DATE(createdAt) = ?
    `, [testDate]);
    
    log(`发现 ${testSKUs.length} 个测试SKU`);
    
    if (testSKUs.length > 0) {
      const skuIds = testSKUs.map(s => s.id);
      const placeholders = skuIds.map(() => '?').join(',');
      
      // 删除SKU库存变更日志
      const [logsResult] = await connection.execute(`
        DELETE FROM sku_inventory_logs 
        WHERE skuId IN (${placeholders})
      `, skuIds);
      
      log(`删除了 ${logsResult.affectedRows} 条SKU库存变更日志`);
      
      // 删除关联的成品记录
      const [productsResult] = await connection.execute(`
        DELETE FROM products 
        WHERE skuId IN (${placeholders})
      `, skuIds);
      
      log(`删除了 ${productsResult.affectedRows} 条关联的成品记录`);
      
      // 删除SKU
      const [skuResult] = await connection.execute(`
        DELETE FROM product_skus 
        WHERE DATE(createdAt) = ?
      `, [testDate]);
      
      log(`删除了 ${skuResult.affectedRows} 个测试SKU`);
    }
    
  } catch (error) {
    log(`清理测试SKU时发生错误: ${error.message}`);
    throw error;
  }
}

// 清理测试采购数据
async function cleanTestPurchases(connection, testDate) {
  try {
    // 查找测试采购记录
    const [testPurchases] = await connection.execute(`
      SELECT id, purchaseCode, productName, createdAt 
      FROM purchases 
      WHERE DATE(createdAt) = ?
    `, [testDate]);
    
    log(`发现 ${testPurchases.length} 个测试采购记录`);
    
    if (testPurchases.length > 0) {
      // 删除测试采购记录
      const [purchaseResult] = await connection.execute(`
        DELETE FROM purchases 
        WHERE DATE(createdAt) = ?
      `, [testDate]);
      
      log(`删除了 ${purchaseResult.affectedRows} 个测试采购记录`);
    }
    
  } catch (error) {
    log(`清理测试采购记录时发生错误: ${error.message}`);
    throw error;
  }
}

// 清理测试相关的原材料使用记录
async function cleanTestMaterialUsage(connection, testDate) {
  try {
    // 查找测试日期创建的产品
    const [testProducts] = await connection.execute(`
      SELECT id FROM products WHERE DATE(createdAt) = ?
    `, [testDate]);
    
    let totalDeleted = 0;
    
    // 删除关联测试产品的原材料使用记录
    if (testProducts.length > 0) {
      const productIds = testProducts.map(p => p.id);
      const placeholders = productIds.map(() => '?').join(',');
      
      const [productUsageResult] = await connection.execute(`
        DELETE FROM material_usage WHERE productId IN (${placeholders})
      `, productIds);
      
      totalDeleted += productUsageResult.affectedRows;
      log(`删除了 ${productUsageResult.affectedRows} 条关联测试产品的原材料使用记录`);
    }
    
    // 删除引用不存在的采购记录的原材料使用记录
    const [orphanPurchaseUsage] = await connection.execute(`
      DELETE mu FROM material_usage mu
      LEFT JOIN purchases p ON mu.purchaseId = p.id
      WHERE p.id IS NULL
    `);
    
    totalDeleted += orphanPurchaseUsage.affectedRows;
    log(`删除了 ${orphanPurchaseUsage.affectedRows} 条孤立的原材料使用记录（采购记录不存在）`);
    
    // 删除引用不存在的产品的原材料使用记录
    const [orphanProductUsage] = await connection.execute(`
      DELETE mu FROM material_usage mu
      LEFT JOIN products p ON mu.productId = p.id
      WHERE mu.productId IS NOT NULL AND p.id IS NULL
    `);
    
    totalDeleted += orphanProductUsage.affectedRows;
    log(`删除了 ${orphanProductUsage.affectedRows} 条孤立的原材料使用记录（产品不存在）`);
    
    log(`总共删除了 ${totalDeleted} 条原材料使用记录`);
    
  } catch (error) {
    log(`清理原材料使用记录时发生错误: ${error.message}`);
    throw error;
  }
}

// 验证数据完整性
async function validateDataIntegrity(connection) {
  try {
    log('=== 数据完整性验证 ===');
    
    // 检查孤立的客户购买记录
    const [orphanPurchases] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM customer_purchases cp
      LEFT JOIN customers c ON cp.customerId = c.id
      WHERE c.id IS NULL
    `);
    
    log(`孤立的客户购买记录: ${orphanPurchases[0].count}`);
    
    // 检查孤立的SKU关联
    const [orphanSKUPurchases] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM customer_purchases cp
      LEFT JOIN product_skus ps ON cp.skuId = ps.id
      WHERE ps.id IS NULL
    `);
    
    log(`无效SKU关联的购买记录: ${orphanSKUPurchases[0].count}`);
    
    // 检查负库存
    const [negativeStock] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM product_skus 
      WHERE availableQuantity < 0
    `);
    
    log(`负库存SKU数量: ${negativeStock[0].count}`);
    
    // 检查数据一致性
    const [inconsistentCustomers] = await connection.execute(`
      SELECT c.id, c.name, c.totalPurchases, 
             COALESCE(SUM(cp.totalPrice), 0) as actual_total
      FROM customers c
      LEFT JOIN customer_purchases cp ON c.id = cp.customerId AND cp.status = 'ACTIVE'
      GROUP BY c.id, c.name, c.totalPurchases
      HAVING ABS(c.totalPurchases - actual_total) > 0.01
    `);
    
    log(`数据不一致的客户数量: ${inconsistentCustomers.length}`);
    
    if (orphanPurchases[0].count === 0 && orphanSKUPurchases[0].count === 0 && 
        negativeStock[0].count === 0 && inconsistentCustomers.length === 0) {
      log('✅ 数据完整性验证通过');
    } else {
      log('⚠️ 发现数据完整性问题，需要进一步处理');
    }
    
  } catch (error) {
    log(`数据完整性验证时发生错误: ${error.message}`);
    throw error;
  }
}

// 主执行函数
async function main() {
  try {
    log('开始清理测试数据...');
    await cleanTestData();
    log('测试数据清理完成！');
  } catch (error) {
    log(`清理失败: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { cleanTestData };