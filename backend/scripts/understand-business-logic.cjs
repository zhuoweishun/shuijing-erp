const mysql = require('mysql2/promise');

// 重新理解业务逻辑
async function understandBusinessLogic() {
  let connection;
  
  try {
    console.log('🔍 重新理解业务逻辑...');
    console.log('用户澄清：客户累计消费 = 有效购买金额（不能为负数）');
    console.log('退货只是退回商品和退款，但不会让客户欠债');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      port: 3306
    });
    
    // 获取各项数据
    const [customerStats] = await connection.execute(`
      SELECT SUM(totalPurchases) as customer_total 
      FROM customers
    `);
    
    const [activeStats] = await connection.execute(`
      SELECT SUM(totalPrice) as active_total 
      FROM customer_purchases 
      WHERE status = 'ACTIVE'
    `);
    
    const [financialStats] = await connection.execute(`
      SELECT 
        SUM(CASE WHEN recordType = 'INCOME' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN recordType = 'REFUND' THEN amount ELSE 0 END) as total_refunds,
        SUM(amount) as net_income
      FROM financial_records 
      WHERE recordType IN ('INCOME', 'REFUND')
    `);
    
    console.log('\n📊 当前数据状态:');
    console.log(`- 客户累计消费: ¥${customerStats[0].customer_total}`);
    console.log(`- 有效购买总额: ¥${activeStats[0].active_total}`);
    console.log(`- 财务总收入: ¥${financialStats[0].total_income}`);
    console.log(`- 财务总退款: ¥${financialStats[0].total_refunds}`);
    console.log(`- 财务净收入: ¥${financialStats[0].net_income}`);
    
    console.log('\n🎯 正确的业务逻辑:');
    console.log('1. 客户累计消费 = 有效购买总额（ACTIVE状态的购买记录）');
    console.log('2. 财务净收入 = 总收入 + 总退款（退款为负数，所以是相减）');
    console.log('3. 客户不会因为退货而负债，累计消费不能为负数');
    
    // 检查数据一致性
    const customerTotal = parseFloat(customerStats[0].customer_total || 0);
    const activeTotal = parseFloat(activeStats[0].active_total || 0);
    const netIncome = parseFloat(financialStats[0].net_income || 0);
    
    console.log('\n🔍 数据一致性检查:');
    
    if (Math.abs(customerTotal - activeTotal) < 0.01) {
      console.log('✅ 客户累计消费 = 有效购买总额 (正确)');
    } else {
      console.log(`❌ 客户累计消费 ≠ 有效购买总额 (差异: ¥${(customerTotal - activeTotal).toFixed(2)})`);
    }
    
    console.log(`\n📋 财务流水账逻辑:`);
    console.log(`- 每次销售: 创建INCOME记录 (+金额)`);
    console.log(`- 每次退货: 创建REFUND记录 (-金额)`);
    console.log(`- 净收入 = 所有INCOME + 所有REFUND`);
    console.log(`- 当前净收入: ¥${netIncome}`);
    
    console.log(`\n🎉 结论:`);
    console.log(`- 客户累计消费应该等于有效购买总额: ¥${activeTotal}`);
    console.log(`- 财务净收入反映实际收益: ¥${netIncome}`);
    console.log(`- 两者不相等是正常的，因为客户不会因退货而负债`);
    
    // 显示具体的客户退货情况
    console.log('\n📋 客户退货情况示例:');
    const [refundExamples] = await connection.execute(`
      SELECT 
        c.name,
        SUM(CASE WHEN cp.status = 'ACTIVE' THEN cp.totalPrice ELSE 0 END) as active_amount,
        SUM(CASE WHEN cp.status = 'REFUNDED' THEN cp.totalPrice ELSE 0 END) as refunded_amount,
        c.totalPurchases
      FROM customers c
      LEFT JOIN customer_purchases cp ON c.id = cp.customerId
      WHERE c.totalPurchases > 0
      GROUP BY c.id, c.name, c.totalPurchases
      HAVING refunded_amount > 0
      ORDER BY refunded_amount DESC
      LIMIT 3
    `);
    
    refundExamples.forEach(customer => {
      console.log(`${customer.name}: 有效购买¥${customer.active_amount}, 已退货¥${customer.refunded_amount}, 累计消费¥${customer.totalPurchases}`);
    });
    
  } catch (error) {
    console.error('❌ 分析过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行分析
if (require.main === module) {
  understandBusinessLogic()
    .then(() => {
      console.log('\n✨ 分析完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 分析失败:', error);
      process.exit(1);
    });
}

module.exports = { understandBusinessLogic };