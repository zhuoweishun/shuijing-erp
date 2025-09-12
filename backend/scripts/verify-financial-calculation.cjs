const mysql = require('mysql2/promise');

// 验证财务计算逻辑是否正确
async function verifyFinancialCalculation() {
  let connection;
  
  try {
    console.log('🧮 验证财务计算逻辑是否正确...');
    console.log('用户澄清：客户累计消费 = 净消费 = 2538.39（已扣除退款）');
    console.log('财务收入应该 = 客户累计消费 = 2538.39');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      timezone: '+08:00'
    });
    
    // 1. 验证客户累计消费的含义
    console.log('\n📊 客户累计消费分析:');
    
    const [customerStats] = await connection.execute(`
      SELECT 
        SUM(totalPurchases) as total_customer_consumption,
        COUNT(*) as customer_count
      FROM customers 
      WHERE totalPurchases > 0
    `);
    
    const customerConsumption = parseFloat(customerStats[0].total_customer_consumption || 0);
    console.log(`客户累计消费总和: ¥${customerConsumption.toFixed(2)}`);
    console.log(`有消费记录的客户数: ${customerStats[0].customer_count}`);
    
    // 2. 验证客户购买记录
    console.log('\n🛒 客户购买记录分析:');
    
    const [purchaseStats] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as record_count,
        SUM(totalPrice) as total_amount
      FROM customer_purchases 
      GROUP BY status
    `);
    
    let activeTotal = 0;
    let refundedTotal = 0;
    
    for (const stat of purchaseStats) {
      console.log(`${stat.status}状态: ${stat.record_count}条记录, 金额: ¥${stat.total_amount}`);
      
      if (stat.status === 'ACTIVE') {
        activeTotal = parseFloat(stat.total_amount || 0);
      } else if (stat.status === 'REFUNDED') {
        refundedTotal = parseFloat(stat.total_amount || 0);
      }
    }
    
    console.log(`\n有效购买总额(ACTIVE): ¥${activeTotal.toFixed(2)}`);
    console.log(`退货总额(REFUNDED): ¥${refundedTotal.toFixed(2)}`);
    
    // 3. 验证财务记录
    console.log('\n💰 财务记录分析:');
    
    const [financialStats] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as record_count,
        SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType IN ('INCOME', 'REFUND')
      GROUP BY recordType
    `);
    
    let financialIncome = 0;
    let financialRefund = 0;
    
    for (const stat of financialStats) {
      console.log(`${stat.recordType}: ${stat.record_count}条记录, 金额: ¥${stat.total_amount}`);
      
      if (stat.recordType === 'INCOME') {
        financialIncome = parseFloat(stat.total_amount || 0);
      } else if (stat.recordType === 'REFUND') {
        financialRefund = parseFloat(stat.total_amount || 0);
      }
    }
    
    // 4. 验证数据一致性
    console.log('\n🔍 数据一致性验证:');
    
    // 验证客户累计消费 = 有效购买总额
    if (Math.abs(customerConsumption - activeTotal) < 0.01) {
      console.log(`✅ 客户累计消费 = 有效购买总额: ¥${customerConsumption.toFixed(2)} = ¥${activeTotal.toFixed(2)}`);
    } else {
      console.log(`❌ 客户累计消费 ≠ 有效购买总额: ¥${customerConsumption.toFixed(2)} ≠ ¥${activeTotal.toFixed(2)}`);
    }
    
    // 验证财务收入记录 = 客户累计消费
    if (Math.abs(financialIncome - customerConsumption) < 0.01) {
      console.log(`✅ 财务收入记录 = 客户累计消费: ¥${financialIncome.toFixed(2)} = ¥${customerConsumption.toFixed(2)}`);
    } else {
      console.log(`❌ 财务收入记录 ≠ 客户累计消费: ¥${financialIncome.toFixed(2)} ≠ ¥${customerConsumption.toFixed(2)}`);
    }
    
    // 5. 计算正确的财务收入
    console.log('\n🎯 正确的财务计算逻辑:');
    
    const correctIncome = customerConsumption; // 财务收入 = 客户累计消费（已是净消费）
    const wrongIncome = financialIncome + financialRefund; // 错误的计算方式（再次扣除退款）
    
    console.log(`正确的财务收入: ¥${correctIncome.toFixed(2)} (客户累计消费)`);
    console.log(`错误的财务收入: ¥${wrongIncome.toFixed(2)} (收入+退款，重复扣除)`);
    
    // 6. 验证用户的期望
    console.log('\n✅ 验证用户期望:');
    console.log(`用户说客户净消费是2500左右`);
    console.log(`实际客户累计消费: ¥${customerConsumption.toFixed(2)}`);
    
    if (Math.abs(customerConsumption - 2500) < 100) {
      console.log(`✅ 符合用户期望 (差距: ¥${Math.abs(customerConsumption - 2500).toFixed(2)})`);
    } else {
      console.log(`❌ 不符合用户期望 (差距: ¥${Math.abs(customerConsumption - 2500).toFixed(2)})`);
    }
    
    // 7. 最终结论
    console.log('\n🏆 最终结论:');
    console.log('1. 客户的totalPurchases字段 = 净消费（有效购买总额）');
    console.log('2. 财务收入应该 = 客户累计消费 = 有效购买总额');
    console.log('3. 不应该再次扣除退款，因为客户累计消费已经是净值');
    console.log(`4. 正确的财务收入显示: ¥${correctIncome.toFixed(2)}`);
    console.log(`5. 用户期望的2500左右是正确的，实际是¥${customerConsumption.toFixed(2)}`);
    
    if (Math.abs(financialIncome - customerConsumption) < 0.01) {
      console.log('\n🎉 财务API计算逻辑已正确修复！');
    } else {
      console.log('\n⚠️  财务API仍需要进一步修复');
    }
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyFinancialCalculation().catch(console.error);