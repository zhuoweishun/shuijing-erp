const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyDataIntegrity() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  try {
    console.log('🔍 开始验证数据完整性和客户统计准确性...');
    
    let totalIssues = 0;
    let totalChecks = 0;
    
    // 1. 验证客户统计数据
    console.log('\n👥 验证客户统计数据...');
    const [customers] = await connection.execute(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.totalPurchases,
        c.totalOrders,
        c.totalAllOrders,
        c.refundCount,
        c.refundRate,
        c.averageOrderValue
      FROM customers c
      ORDER BY c.name
    `);
    
    console.log(`检查 ${customers.length} 个客户的统计数据...`);
    
    for (const customer of customers) {
      totalChecks++;
      
      // 计算实际的购买统计
      const [actualStats] = await connection.execute(`
        SELECT 
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_orders,
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'ACTIVE' THEN totalPrice ELSE 0 END) as active_amount,
          COUNT(CASE WHEN status = 'REFUNDED' THEN 1 END) as refund_count
        FROM customer_purchases 
        WHERE customerId = ?
      `, [customer.id]);
      
      const actual = actualStats[0];
      const refundRate = actual.total_orders > 0 ? (actual.refund_count / actual.total_orders * 100) : 0;
      const avgOrderValue = actual.active_orders > 0 ? (actual.active_amount / actual.active_orders) : 0;
      
      // 检查数据一致性
      let hasIssue = false;
      
      if (Math.abs(customer.totalPurchases - actual.active_amount) > 0.01) {
        console.log(`❌ ${customer.name}: 累计消费金额不一致`);
        console.log(`   数据库: ¥${customer.totalPurchases}, 实际: ¥${actual.active_amount}`);
        hasIssue = true;
      }
      
      if (customer.totalOrders !== actual.active_orders) {
        console.log(`❌ ${customer.name}: 有效订单数不一致`);
        console.log(`   数据库: ${customer.totalOrders}, 实际: ${actual.active_orders}`);
        hasIssue = true;
      }
      
      if (customer.totalAllOrders !== actual.total_orders) {
        console.log(`❌ ${customer.name}: 总订单数不一致`);
        console.log(`   数据库: ${customer.totalAllOrders}, 实际: ${actual.total_orders}`);
        hasIssue = true;
      }
      
      if (customer.refundCount !== actual.refund_count) {
        console.log(`❌ ${customer.name}: 退货次数不一致`);
        console.log(`   数据库: ${customer.refundCount}, 实际: ${actual.refund_count}`);
        hasIssue = true;
      }
      
      if (Math.abs(customer.refundRate - refundRate) > 0.1) {
        console.log(`❌ ${customer.name}: 退货率不一致`);
        console.log(`   数据库: ${customer.refundRate}%, 实际: ${refundRate.toFixed(1)}%`);
        hasIssue = true;
      }
      
      if (Math.abs(customer.averageOrderValue - avgOrderValue) > 0.01) {
        console.log(`❌ ${customer.name}: 平均客单价不一致`);
        console.log(`   数据库: ¥${customer.averageOrderValue}, 实际: ¥${avgOrderValue.toFixed(2)}`);
        hasIssue = true;
      }
      
      if (hasIssue) {
        totalIssues++;
      }
    }
    
    // 2. 验证SKU库存数据
    console.log('\n🎯 验证SKU库存数据...');
    const [skus] = await connection.execute(`
      SELECT 
        id,
        skuCode,
        skuName,
        totalQuantity,
        availableQuantity
      FROM product_skus
      WHERE status = 'ACTIVE'
    `);
    
    console.log(`检查 ${skus.length} 个SKU的库存数据...`);
    
    for (const sku of skus) {
      totalChecks++;
      
      // 计算实际销售数量
      const [salesStats] = await connection.execute(`
        SELECT 
          SUM(CASE WHEN status = 'ACTIVE' THEN quantity ELSE 0 END) as sold_quantity
        FROM customer_purchases 
        WHERE skuId = ?
      `, [sku.id]);
      
      const soldQuantity = salesStats[0].sold_quantity || 0;
      const expectedAvailable = sku.totalQuantity - soldQuantity;
      
      if (sku.availableQuantity !== expectedAvailable) {
        console.log(`❌ ${sku.skuName} (${sku.skuCode}): 可售库存不一致`);
        console.log(`   数据库: ${sku.availableQuantity}, 预期: ${expectedAvailable} (总量: ${sku.totalQuantity}, 已售: ${soldQuantity})`);
        totalIssues++;
      }
    }
    
    // 3. 验证财务记录完整性
    console.log('\n💰 验证财务记录完整性...');
    
    // 检查客户购买是否都有对应的财务记录
    const [purchaseFinancialCheck] = await connection.execute(`
      SELECT 
        cp.id,
        cp.skuName,
        cp.totalPrice,
        c.name as customer_name
      FROM customer_purchases cp
      JOIN customers c ON cp.customerId = c.id
      LEFT JOIN financial_records fr ON fr.referenceId = cp.id AND fr.recordType = 'INCOME'
      WHERE cp.status = 'ACTIVE' AND fr.id IS NULL
    `);
    
    totalChecks++;
    if (purchaseFinancialCheck.length > 0) {
      console.log(`❌ 发现 ${purchaseFinancialCheck.length} 条购买记录没有对应的财务收入记录:`);
      purchaseFinancialCheck.forEach(record => {
        console.log(`   ${record.customer_name} 购买 ${record.skuName} ¥${record.totalPrice}`);
      });
      totalIssues++;
    }
    
    // 检查退货是否都有对应的财务记录
    const [refundFinancialCheck] = await connection.execute(`
      SELECT 
        cp.id,
        cp.skuName,
        cp.totalPrice,
        c.name as customer_name
      FROM customer_purchases cp
      JOIN customers c ON cp.customerId = c.id
      LEFT JOIN financial_records fr ON fr.referenceId = cp.id AND fr.recordType = 'REFUND'
      WHERE cp.status = 'REFUNDED' AND fr.id IS NULL
    `);
    
    totalChecks++;
    if (refundFinancialCheck.length > 0) {
      console.log(`❌ 发现 ${refundFinancialCheck.length} 条退货记录没有对应的财务退款记录:`);
      refundFinancialCheck.forEach(record => {
        console.log(`   ${record.customer_name} 退货 ${record.skuName} ¥${record.totalPrice}`);
      });
      totalIssues++;
    }
    
    // 4. 验证客户购买记录的SKU关联
    console.log('\n🔗 验证客户购买记录的SKU关联...');
    const [orphanPurchases] = await connection.execute(`
      SELECT 
        cp.id,
        cp.skuName,
        c.name as customer_name
      FROM customer_purchases cp
      JOIN customers c ON cp.customerId = c.id
      LEFT JOIN product_skus ps ON cp.skuId = ps.id
      WHERE ps.id IS NULL
    `);
    
    totalChecks++;
    if (orphanPurchases.length > 0) {
      console.log(`❌ 发现 ${orphanPurchases.length} 条购买记录关联的SKU不存在:`);
      orphanPurchases.forEach(record => {
        console.log(`   ${record.customer_name} 购买 ${record.skuName}`);
      });
      totalIssues++;
    }
    
    // 5. 验证客户备注关联
    console.log('\n📝 验证客户备注关联...');
    const [orphanNotes] = await connection.execute(`
      SELECT 
        cn.id,
        cn.content
      FROM customer_notes cn
      LEFT JOIN customers c ON cn.customerId = c.id
      WHERE c.id IS NULL
    `);
    
    totalChecks++;
    if (orphanNotes.length > 0) {
      console.log(`❌ 发现 ${orphanNotes.length} 条客户备注关联的客户不存在`);
      totalIssues++;
    }
    
    // 6. 生成数据统计报告
    console.log('\n📊 数据统计报告:');
    
    // 客户总体统计
    const [customerOverview] = await connection.execute(`
      SELECT 
        COUNT(*) as total_customers,
        SUM(totalPurchases) as total_revenue,
        SUM(totalOrders) as total_active_orders,
        SUM(totalAllOrders) as total_all_orders,
        SUM(refundCount) as total_refunds,
        AVG(refundRate) as avg_refund_rate
      FROM customers
    `);
    
    const overview = customerOverview[0];
    console.log(`客户总数: ${overview.total_customers}`);
    console.log(`总收入: ¥${overview.total_revenue || 0}`);
    console.log(`有效订单总数: ${overview.total_active_orders || 0}`);
    console.log(`所有订单总数: ${overview.total_all_orders || 0}`);
    console.log(`退货总数: ${overview.total_refunds || 0}`);
    console.log(`平均退货率: ${parseFloat(overview.avg_refund_rate || 0).toFixed(1)}%`);
    
    // SKU统计
    const [skuOverview] = await connection.execute(`
      SELECT 
        COUNT(*) as total_skus,
        SUM(totalQuantity) as total_inventory,
        SUM(availableQuantity) as available_inventory
      FROM product_skus
      WHERE status = 'ACTIVE'
    `);
    
    const skuStats = skuOverview[0];
    console.log(`\nSKU总数: ${skuStats.total_skus}`);
    console.log(`总库存: ${skuStats.total_inventory || 0}件`);
    console.log(`可售库存: ${skuStats.available_inventory || 0}件`);
    console.log(`已售库存: ${(skuStats.total_inventory || 0) - (skuStats.available_inventory || 0)}件`);
    
    // 财务统计
    const [financialOverview] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as record_count,
        SUM(amount) as total_amount
      FROM financial_records
      GROUP BY recordType
    `);
    
    console.log('\n💰 财务记录统计:');
    financialOverview.forEach(record => {
      const typeName = record.recordType === 'INCOME' ? '收入' : 
                      record.recordType === 'REFUND' ? '退款' : 
                      record.recordType === 'EXPENSE' ? '支出' : record.recordType;
      console.log(`${typeName}: ${record.record_count}条记录, ¥${record.total_amount}`);
    });
    
    // 7. 验证结果总结
    console.log('\n🎯 验证结果总结:');
    console.log(`总检查项目: ${totalChecks}`);
    console.log(`发现问题: ${totalIssues}`);
    
    if (totalIssues === 0) {
      console.log('✅ 数据完整性验证通过，所有数据一致！');
    } else {
      console.log(`❌ 发现 ${totalIssues} 个数据完整性问题，需要修复`);
    }
    
    // 8. 客户类型分布统计
    console.log('\n🏷️  客户类型分布:');
    const [customerTypes] = await connection.execute(`
      SELECT 
        CASE 
          WHEN totalOrders >= 3 THEN '复购客户'
          WHEN totalPurchases >= 500 THEN '大客户'
          WHEN DATEDIFF(NOW(), createdAt) <= 30 THEN '新客户'
          WHEN DATEDIFF(NOW(), lastPurchaseDate) <= 90 THEN '活跃客户'
          WHEN DATEDIFF(NOW(), lastPurchaseDate) > 180 THEN '流失客户'
          ELSE '普通客户'
        END as customer_type,
        COUNT(*) as count
      FROM customers
      GROUP BY customer_type
      ORDER BY count DESC
    `);
    
    customerTypes.forEach(type => {
      console.log(`${type.customer_type}: ${type.count}人`);
    });
    
  } catch (error) {
    console.error('❌ 验证数据完整性时出错:', error);
  } finally {
    await connection.end();
  }
}

verifyDataIntegrity();