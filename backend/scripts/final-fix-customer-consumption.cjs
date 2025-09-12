const mysql = require('mysql2/promise');

// 最终修正客户累计消费逻辑
async function finalFixCustomerConsumption() {
  let connection;
  
  try {
    console.log('🔧 最终修正客户累计消费逻辑...');
    console.log('用户澄清：客户累计消费 = 客户有效消费 = 客户总消费 - 退款');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      port: 3306
    });
    
    // 获取每个客户的总购买和退款金额
    const [customerData] = await connection.execute(`
      SELECT 
        c.id,
        c.name,
        c.totalPurchases as current_total,
        COALESCE(SUM(CASE WHEN cp.status = 'ACTIVE' THEN cp.totalPrice ELSE 0 END), 0) as active_purchases,
        COALESCE(SUM(CASE WHEN cp.status = 'REFUNDED' THEN cp.totalPrice ELSE 0 END), 0) as refunded_purchases,
        COALESCE(SUM(cp.totalPrice), 0) as total_purchases
      FROM customers c
      LEFT JOIN customer_purchases cp ON c.id = cp.customerId
      WHERE c.totalPurchases > 0
      GROUP BY c.id, c.name, c.totalPurchases
      ORDER BY c.totalPurchases DESC
    `);
    
    console.log(`\n找到 ${customerData.length} 个有消费记录的客户`);
    
    let updatedCount = 0;
    let totalAdjustment = 0;
    
    console.log('\n📊 客户消费计算详情:');
    
    for (const customer of customerData) {
      // 按照用户逻辑：累计消费 = 总消费 - 退款 = 有效消费
      const totalPurchases = parseFloat(customer.total_purchases || 0);
      const refundedAmount = parseFloat(customer.refunded_purchases || 0);
      const netConsumption = totalPurchases - refundedAmount;
      const currentTotal = parseFloat(customer.current_total || 0);
      
      console.log(`\n${customer.name}:`);
      console.log(`  总购买: ¥${totalPurchases}`);
      console.log(`  退款: ¥${refundedAmount}`);
      console.log(`  净消费: ¥${netConsumption} (总购买-退款)`);
      console.log(`  当前累计: ¥${currentTotal}`);
      
      const difference = Math.abs(netConsumption - currentTotal);
      
      if (difference > 0.01) {
        await connection.execute(`
          UPDATE customers 
          SET totalPurchases = ?, updatedAt = NOW() 
          WHERE id = ?
        `, [netConsumption, customer.id]);
        
        console.log(`  ✅ 已修正: ¥${currentTotal} → ¥${netConsumption}`);
        updatedCount++;
        totalAdjustment += (netConsumption - currentTotal);
      } else {
        console.log(`  ✅ 无需修正`);
      }
    }
    
    console.log(`\n🎉 修正完成！`);
    console.log(`- 更新客户数: ${updatedCount}`);
    console.log(`- 总调整金额: ¥${totalAdjustment.toFixed(2)}`);
    
    // 验证最终结果
    const [finalStats] = await connection.execute(`
      SELECT SUM(totalPurchases) as customer_total 
      FROM customers
    `);
    
    const [financialStats] = await connection.execute(`
      SELECT 
        SUM(CASE WHEN recordType = 'INCOME' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN recordType = 'REFUND' THEN amount ELSE 0 END) as total_refunds,
        SUM(amount) as net_income
      FROM financial_records 
      WHERE recordType IN ('INCOME', 'REFUND')
    `);
    
    console.log(`\n📊 最终数据验证:`);
    console.log(`- 客户累计消费: ¥${finalStats[0].customer_total}`);
    console.log(`- 财务净收入: ¥${financialStats[0].net_income}`);
    console.log(`- 差异: ¥${Math.abs(finalStats[0].customer_total - financialStats[0].net_income).toFixed(2)}`);
    
    if (Math.abs(finalStats[0].customer_total - financialStats[0].net_income) < 0.01) {
      console.log('✅ 数据完全一致！业务逻辑正确！');
      console.log('✅ 客户累计消费 = 客户有效消费 = 客户总消费 - 退款');
    } else {
      console.log('⚠️  仍有差异，需要进一步检查');
    }
    
    // 显示修正后的客户统计（前10名）
    const [topCustomers] = await connection.execute(`
      SELECT name, totalPurchases, totalOrders 
      FROM customers 
      WHERE totalPurchases > 0 
      ORDER BY totalPurchases DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 修正后的客户统计（前10名）:');
    topCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name}: ¥${customer.totalPurchases}, ${customer.totalOrders}单`);
    });
    
  } catch (error) {
    console.error('❌ 修正过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行修正
if (require.main === module) {
  finalFixCustomerConsumption()
    .then(() => {
      console.log('\n✨ 最终修正完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 修正失败:', error);
      process.exit(1);
    });
}

module.exports = { finalFixCustomerConsumption };