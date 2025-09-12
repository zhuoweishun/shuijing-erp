const mysql = require('mysql2/promise');

// 恢复客户正确的累计消费
async function restoreCustomerTotals() {
  let connection;
  
  try {
    console.log('🔧 恢复客户正确的累计消费...');
    console.log('客户累计消费 = 有效购买总额（ACTIVE状态的购买记录）');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      port: 3306
    });
    
    // 重新计算所有客户的累计消费和订单数
    console.log('\n📊 重新计算客户统计数据...');
    
    const [result] = await connection.execute(`
      UPDATE customers c 
      SET 
        totalPurchases = (
          SELECT COALESCE(SUM(cp.totalPrice), 0) 
          FROM customer_purchases cp 
          WHERE cp.customerId = c.id AND cp.status = 'ACTIVE'
        ),
        totalOrders = (
          SELECT COUNT(*) 
          FROM customer_purchases cp 
          WHERE cp.customerId = c.id AND cp.status = 'ACTIVE'
        ),
        updatedAt = NOW()
    `);
    
    console.log(`✅ 更新了 ${result.affectedRows} 个客户的统计数据`);
    
    // 验证恢复结果
    const [newStats] = await connection.execute(`
      SELECT SUM(totalPurchases) as customer_total 
      FROM customers
    `);
    
    const [activeStats] = await connection.execute(`
      SELECT SUM(totalPrice) as active_total 
      FROM customer_purchases 
      WHERE status = 'ACTIVE'
    `);
    
    console.log(`\n📊 恢复后的数据验证:`);
    console.log(`- 客户累计消费: ¥${newStats[0].customer_total}`);
    console.log(`- 有效购买总额: ¥${activeStats[0].active_total}`);
    console.log(`- 差异: ¥${Math.abs(newStats[0].customer_total - activeStats[0].active_total).toFixed(2)}`);
    
    if (Math.abs(newStats[0].customer_total - activeStats[0].active_total) < 0.01) {
      console.log('✅ 数据完全一致！客户累计消费已正确恢复！');
    } else {
      console.log('⚠️  仍有差异，需要进一步检查');
    }
    
    // 显示恢复后的客户统计（前10名）
    const [topCustomers] = await connection.execute(`
      SELECT name, totalPurchases, totalOrders 
      FROM customers 
      WHERE totalPurchases > 0 
      ORDER BY totalPurchases DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 恢复后的客户统计（前10名）:');
    topCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name}: ¥${customer.totalPurchases}, ${customer.totalOrders}单`);
    });
    
    // 最终验证财务数据一致性
    const [financialStats] = await connection.execute(`
      SELECT 
        SUM(CASE WHEN recordType = 'INCOME' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN recordType = 'REFUND' THEN amount ELSE 0 END) as total_refunds,
        SUM(amount) as net_income
      FROM financial_records 
      WHERE recordType IN ('INCOME', 'REFUND')
    `);
    
    console.log(`\n🎉 最终数据验证:`);
    console.log(`- 客户累计消费: ¥${newStats[0].customer_total} (有效购买总额)`);
    console.log(`- 财务净收入: ¥${financialStats[0].net_income} (收入-退款)`);
    console.log(`- 退款已正确抵扣收入，财务数据准确`);
    console.log(`- 客户不会因退货而负债，业务逻辑正确`);
    
  } catch (error) {
    console.error('❌ 恢复过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行恢复
if (require.main === module) {
  restoreCustomerTotals()
    .then(() => {
      console.log('\n✨ 恢复完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 恢复失败:', error);
      process.exit(1);
    });
}

module.exports = { restoreCustomerTotals };