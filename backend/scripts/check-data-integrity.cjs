const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDataIntegrity() {
  let connection;
  
  try {
    // 从DATABASE_URL解析数据库连接信息
    const databaseUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
    const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!urlMatch) {
      throw new Error('无法解析DATABASE_URL');
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: parseInt(port)
    });

    console.log('🔍 开始数据完整性检查...');
    console.log('数据库:', database);
    console.log('=' .repeat(80));

    // 1. 检查客户购买记录表结构
    console.log('\n📋 1. 检查customer_purchases表结构:');
    const [customerPurchasesColumns] = await connection.execute('DESCRIBE customer_purchases');
    console.log('customer_purchases表字段:');
    customerPurchasesColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''}`);
    });

    // 2. 检查product_skus表结构
    console.log('\n📦 2. 检查product_skus表结构:');
    const [productSkusColumns] = await connection.execute('DESCRIBE product_skus');
    console.log('product_skus表字段:');
    productSkusColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''}`);
    });

    // 3. 检查客户购买记录总数
    console.log('\n🛒 3. 检查客户购买记录数据:');
    const [purchaseCount] = await connection.execute('SELECT COUNT(*) as total FROM customer_purchases');
    console.log(`客户购买记录总数: ${purchaseCount[0].total}`);

    // 4. 检查SKU总数
    console.log('\n📦 4. 检查SKU数据:');
    const [skuCount] = await connection.execute('SELECT COUNT(*) as total FROM product_skus');
    console.log(`SKU总数: ${skuCount[0].total}`);

    // 5. 检查无效的SKU关联（关键检查）
    console.log('\n❌ 5. 检查无效的SKU关联:');
    const [invalidSkuRefs] = await connection.execute(`
      SELECT 
        cp.id as purchase_id,
        cp.skuId,
        cp.skuName,
        cp.customerId,
        c.name as customer_name,
        cp.purchaseDate,
        cp.totalPrice
      FROM customer_purchases cp
      LEFT JOIN customers c ON cp.customerId = c.id
      LEFT JOIN product_skus ps ON cp.skuId = ps.id
      WHERE ps.id IS NULL
      ORDER BY cp.purchaseDate DESC
    `);
    
    if (invalidSkuRefs.length > 0) {
      console.log(`🚨 发现 ${invalidSkuRefs.length} 条无效的SKU关联记录:`);
      invalidSkuRefs.forEach((record, index) => {
        console.log(`  ${index + 1}. 购买记录ID: ${record.purchase_id}`);
        console.log(`     SKU ID: ${record.skuId}`);
        console.log(`     SKU名称: ${record.skuName}`);
        console.log(`     客户: ${record.customer_name}`);
        console.log(`     购买日期: ${record.purchaseDate}`);
        console.log(`     金额: ¥${record.totalPrice}`);
        console.log('     ---');
      });
    } else {
      console.log('✅ 未发现无效的SKU关联');
    }

    // 6. 检查SKU名称不匹配的记录
    console.log('\n🔍 6. 检查SKU名称不匹配的记录:');
    const [skuNameMismatch] = await connection.execute(`
      SELECT 
        cp.id as purchase_id,
        cp.skuId,
        cp.skuName as purchase_sku_name,
        ps.skuName as actual_sku_name,
        ps.skuCode as actual_sku_code,
        c.name as customer_name,
        cp.purchaseDate
      FROM customer_purchases cp
      JOIN product_skus ps ON cp.skuId = ps.id
      LEFT JOIN customers c ON cp.customerId = c.id
      WHERE cp.skuName != ps.skuName
      ORDER BY cp.purchaseDate DESC
    `);
    
    if (skuNameMismatch.length > 0) {
      console.log(`🚨 发现 ${skuNameMismatch.length} 条SKU名称不匹配的记录:`);
      skuNameMismatch.forEach((record, index) => {
        console.log(`  ${index + 1}. 购买记录ID: ${record.purchase_id}`);
        console.log(`     实际SKU编码: ${record.actual_sku_code}`);
        console.log(`     购买记录中的SKU名称: ${record.purchase_sku_name}`);
        console.log(`     实际SKU名称: ${record.actual_sku_name}`);
        console.log(`     客户: ${record.customer_name}`);
        console.log('     ---');
      });
    } else {
      console.log('✅ 未发现SKU名称不匹配的记录');
    }

    // 7. 检查可能的虚假SKU（没有对应原材料记录的SKU）
    console.log('\n🔍 7. 检查可能的虚假SKU:');
    const [suspiciousSkus] = await connection.execute(`
      SELECT 
        ps.id,
        ps.skuCode,
        ps.skuName,
        ps.totalQuantity,
        ps.availableQuantity,
        ps.materialCost,
        ps.createdAt,
        COUNT(p.id) as product_count,
        COUNT(mu.id) as material_usage_count
      FROM product_skus ps
      LEFT JOIN products p ON ps.id = p.skuId
      LEFT JOIN material_usage mu ON p.id = mu.productId
      GROUP BY ps.id
      HAVING material_usage_count = 0
      ORDER BY ps.createdAt DESC
    `);
    
    if (suspiciousSkus.length > 0) {
      console.log(`🚨 发现 ${suspiciousSkus.length} 个可能的虚假SKU（没有原材料使用记录）:`);
      suspiciousSkus.forEach((sku, index) => {
        console.log(`  ${index + 1}. SKU编码: ${sku.skuCode}`);
        console.log(`     SKU名称: ${sku.skuName}`);
        console.log(`     总数量: ${sku.totalQuantity}`);
        console.log(`     可售数量: ${sku.availableQuantity}`);
        console.log(`     原材料成本: ¥${sku.materialCost}`);
        console.log(`     创建时间: ${sku.createdAt}`);
        console.log('     ---');
      });
    } else {
      console.log('✅ 未发现可能的虚假SKU');
    }

    // 8. 检查客户表数据
    console.log('\n👥 8. 检查客户表数据:');
    const [customerStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN totalOrders > 0 THEN 1 END) as customers_with_orders,
        COUNT(CASE WHEN totalOrders = 0 THEN 1 END) as customers_without_orders
      FROM customers
    `);
    
    console.log(`客户总数: ${customerStats[0].total_customers}`);
    console.log(`有订单的客户: ${customerStats[0].customers_with_orders}`);
    console.log(`无订单的客户: ${customerStats[0].customers_without_orders}`);

    // 9. 检查财务数据一致性
    console.log('\n💰 9. 检查财务数据一致性:');
    const [financialCheck] = await connection.execute(`
      SELECT 
        'customer_purchases' as source,
        COUNT(*) as record_count,
        SUM(totalPrice) as total_amount
      FROM customer_purchases
      WHERE status = 'ACTIVE'
      UNION ALL
      SELECT 
        'financial_records' as source,
        COUNT(*) as record_count,
        SUM(amount) as total_amount
      FROM financial_records
      WHERE recordType = 'INCOME' AND referenceType = 'SALE'
    `);
    
    console.log('财务数据对比:');
    financialCheck.forEach(record => {
      console.log(`  ${record.source}: ${record.record_count} 条记录, 总金额: ¥${record.total_amount || 0}`);
    });

    // 10. 检查库存数据一致性
    console.log('\n📦 10. 检查库存数据一致性:');
    const [inventoryCheck] = await connection.execute(`
      SELECT 
        ps.skuCode,
        ps.skuName,
        ps.totalQuantity,
        ps.availableQuantity,
        COUNT(cp.id) as sold_count,
        SUM(CASE WHEN cp.status = 'ACTIVE' THEN cp.quantity ELSE 0 END) as total_sold
      FROM product_skus ps
      LEFT JOIN customer_purchases cp ON ps.id = cp.skuId
      GROUP BY ps.id
      HAVING (ps.totalQuantity - total_sold) != ps.availableQuantity
      ORDER BY ps.skuCode
    `);
    
    if (inventoryCheck.length > 0) {
      console.log(`🚨 发现 ${inventoryCheck.length} 个库存数据不一致的SKU:`);
      inventoryCheck.forEach((sku, index) => {
        const expectedAvailable = sku.totalQuantity - sku.total_sold;
        console.log(`  ${index + 1}. SKU编码: ${sku.skuCode}`);
        console.log(`     总数量: ${sku.totalQuantity}`);
        console.log(`     已售数量: ${sku.total_sold}`);
        console.log(`     当前可售数量: ${sku.availableQuantity}`);
        console.log(`     预期可售数量: ${expectedAvailable}`);
        console.log('     ---');
      });
    } else {
      console.log('✅ 库存数据一致性检查通过');
    }

    console.log('\n' + '=' .repeat(80));
    console.log('🎯 数据完整性检查完成！');
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行检查
checkDataIntegrity().catch(console.error);