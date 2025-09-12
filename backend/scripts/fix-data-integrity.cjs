const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDataIntegrity() {
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
    console.log('🔧 开始修复数据完整性问题...');
    
    let fixedIssues = 0;
    
    // 1. 修复客户统计数据
    console.log('\n👥 修复客户统计数据...');
    const [customers] = await connection.execute(`
      SELECT id, name FROM customers ORDER BY name
    `);
    
    for (const customer of customers) {
      // 重新计算客户统计数据
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_orders,
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'ACTIVE' THEN totalPrice ELSE 0 END) as active_amount,
          COUNT(CASE WHEN status = 'REFUNDED' THEN 1 END) as refund_count,
          MAX(CASE WHEN status = 'ACTIVE' THEN purchaseDate END) as last_purchase_date
        FROM customer_purchases 
        WHERE customerId = ?
      `, [customer.id]);
      
      const stat = stats[0];
      const refundRate = stat.total_orders > 0 ? (stat.refund_count / stat.total_orders * 100) : 0;
      const avgOrderValue = stat.active_orders > 0 ? (stat.active_amount / stat.active_orders) : 0;
      
      // 更新客户统计数据
      await connection.execute(`
        UPDATE customers SET 
          totalPurchases = ?,
          totalOrders = ?,
          totalAllOrders = ?,
          refundCount = ?,
          refundRate = ?,
          averageOrderValue = ?,
          lastPurchaseDate = ?
        WHERE id = ?
      `, [
        stat.active_amount || 0,
        stat.active_orders || 0,
        stat.total_orders || 0,
        stat.refund_count || 0,
        refundRate,
        avgOrderValue,
        stat.last_purchase_date,
        customer.id
      ]);
      
      console.log(`✅ 已更新 ${customer.name} 的统计数据`);
      fixedIssues++;
    }
    
    // 2. 修复SKU库存数据
    console.log('\n🎯 修复SKU库存数据...');
    const [skus] = await connection.execute(`
      SELECT id, skuCode, skuName, totalQuantity FROM product_skus WHERE status = 'ACTIVE'
    `);
    
    for (const sku of skus) {
      // 计算实际销售数量
      const [salesStats] = await connection.execute(`
        SELECT 
          SUM(CASE WHEN status = 'ACTIVE' THEN quantity ELSE 0 END) as sold_quantity
        FROM customer_purchases 
        WHERE skuId = ?
      `, [sku.id]);
      
      const soldQuantity = salesStats[0].sold_quantity || 0;
      const correctAvailable = sku.totalQuantity - soldQuantity;
      
      // 更新可售库存
      await connection.execute(`
        UPDATE product_skus SET availableQuantity = ? WHERE id = ?
      `, [correctAvailable, sku.id]);
      
      console.log(`✅ 已更新 ${sku.skuName} (${sku.skuCode}) 库存: 总量${sku.totalQuantity}, 已售${soldQuantity}, 可售${correctAvailable}`);
      fixedIssues++;
    }
    
    // 3. 补充缺失的财务收入记录
    console.log('\n💰 补充缺失的财务收入记录...');
    const [missingIncomeRecords] = await connection.execute(`
      SELECT 
        cp.id,
        cp.customerId,
        cp.skuName,
        cp.totalPrice,
        cp.purchaseDate,
        c.name as customer_name
      FROM customer_purchases cp
      JOIN customers c ON cp.customerId = c.id
      LEFT JOIN financial_records fr ON fr.referenceId = cp.id AND fr.recordType = 'INCOME'
      WHERE cp.status = 'ACTIVE' AND fr.id IS NULL
    `);
    
    for (const record of missingIncomeRecords) {
      await connection.execute(`
        INSERT INTO financial_records (
          id, recordType, amount, description, transactionDate, 
          referenceType, referenceId, userId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        `income_${record.id}_${Date.now()}`,
        'INCOME',
        record.totalPrice,
        `客户购买 - ${record.skuName}`,
        record.purchaseDate,
        'PURCHASE',
        record.id,
        'cmf8h3g8p0000tupgq4gcrfw0'
      ]);
      
      console.log(`✅ 已补充 ${record.customer_name} 购买 ${record.skuName} 的财务收入记录 ¥${record.totalPrice}`);
      fixedIssues++;
    }
    
    // 4. 补充缺失的财务退款记录
    console.log('\n💸 补充缺失的财务退款记录...');
    const [missingRefundRecords] = await connection.execute(`
      SELECT 
        cp.id,
        cp.customerId,
        cp.skuName,
        cp.totalPrice,
        cp.refundDate,
        c.name as customer_name
      FROM customer_purchases cp
      JOIN customers c ON cp.customerId = c.id
      LEFT JOIN financial_records fr ON fr.referenceId = cp.id AND fr.recordType = 'REFUND'
      WHERE cp.status = 'REFUNDED' AND fr.id IS NULL
    `);
    
    for (const record of missingRefundRecords) {
      await connection.execute(`
        INSERT INTO financial_records (
          id, recordType, amount, description, transactionDate, 
          referenceType, referenceId, userId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        `refund_${record.id}_${Date.now()}`,
        'REFUND',
        -record.totalPrice, // 退款为负数
        `客户退货 - ${record.skuName}`,
        record.refundDate,
        'REFUND',
        record.id,
        'cmf8h3g8p0000tupgq4gcrfw0'
      ]);
      
      console.log(`✅ 已补充 ${record.customer_name} 退货 ${record.skuName} 的财务退款记录 ¥${record.totalPrice}`);
      fixedIssues++;
    }
    
    // 5. 清理孤立的数据记录
    console.log('\n🧹 清理孤立的数据记录...');
    
    // 清理没有对应SKU的购买记录
    const [orphanPurchases] = await connection.execute(`
      DELETE cp FROM customer_purchases cp
      LEFT JOIN product_skus ps ON cp.skuId = ps.id
      WHERE ps.id IS NULL
    `);
    
    if (orphanPurchases.affectedRows > 0) {
      console.log(`✅ 已清理 ${orphanPurchases.affectedRows} 条孤立的购买记录`);
      fixedIssues++;
    }
    
    // 清理没有对应客户的备注记录
    const [orphanNotes] = await connection.execute(`
      DELETE cn FROM customer_notes cn
      LEFT JOIN customers c ON cn.customerId = c.id
      WHERE c.id IS NULL
    `);
    
    if (orphanNotes.affectedRows > 0) {
      console.log(`✅ 已清理 ${orphanNotes.affectedRows} 条孤立的客户备注`);
      fixedIssues++;
    }
    
    // 6. 重新计算客户类型（跳过，因为customers表中没有customerType字段）
    console.log('\n🏷️  跳过客户类型计算（表中没有customerType字段）');
    
    // 7. 验证修复结果
    console.log('\n🔍 验证修复结果...');
    
    // 重新统计数据
    const [finalStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_customers,
        SUM(totalPurchases) as total_revenue,
        SUM(totalOrders) as total_active_orders,
        SUM(totalAllOrders) as total_all_orders,
        SUM(refundCount) as total_refunds,
        AVG(refundRate) as avg_refund_rate
      FROM customers
    `);
    
    const final = finalStats[0];
    console.log('\n📊 修复后的数据统计:');
    console.log(`客户总数: ${final.total_customers}`);
    console.log(`总收入: ¥${parseFloat(final.total_revenue || 0).toFixed(2)}`);
    console.log(`有效订单总数: ${final.total_active_orders || 0}`);
    console.log(`所有订单总数: ${final.total_all_orders || 0}`);
    console.log(`退货总数: ${final.total_refunds || 0}`);
    console.log(`平均退货率: ${parseFloat(final.avg_refund_rate || 0).toFixed(1)}%`);
    
    // 财务记录统计
    const [financialStats] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as record_count,
        SUM(amount) as total_amount
      FROM financial_records
      GROUP BY recordType
    `);
    
    console.log('\n💰 财务记录统计:');
    financialStats.forEach(record => {
      const typeName = record.recordType === 'INCOME' ? '收入' : 
                      record.recordType === 'REFUND' ? '退款' : 
                      record.recordType === 'EXPENSE' ? '支出' : record.recordType;
      console.log(`${typeName}: ${record.record_count}条记录, ¥${record.total_amount}`);
    });
    
    console.log(`\n🎯 修复完成！共修复了 ${fixedIssues} 个问题`);
    console.log('✅ 数据完整性修复成功！');
    
  } catch (error) {
    console.error('❌ 修复数据完整性时出错:', error);
  } finally {
    await connection.end();
  }
}

fixDataIntegrity();