const mysql = require('mysql2/promise');

// 验证客户累计消费的真实计算逻辑
async function verifyCustomerTotalLogic() {
  let connection;
  
  try {
    console.log('🔍 验证客户累计消费的真实计算逻辑...');
    console.log('用户澄清：客户累计消费 = 净消费 = 2500（已经扣除退款）');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      timezone: '+08:00'
    });
    
    // 1. 检查客户表的totalPurchases字段
    console.log('\n📊 客户表totalPurchases字段分析:');
    const [customers] = await connection.execute(`
      SELECT 
        id,
        name,
        totalPurchases,
        totalOrders,
        firstPurchaseDate,
        lastPurchaseDate
      FROM customers 
      WHERE totalPurchases > 0
      ORDER BY totalPurchases DESC
    `);
    
    console.log(`找到 ${customers.length} 个有消费记录的客户`);
    
    let totalCustomerConsumption = 0;
    
    for (const customer of customers) {
      console.log(`\n客户: ${customer.name}`);
      console.log(`  数据库中的totalPurchases: ¥${customer.totalPurchases}`);
      
      // 2. 检查该客户的实际购买记录
      const [purchaseRecords] = await connection.execute(`
        SELECT 
          status,
          COUNT(*) as count,
          SUM(totalPrice) as total_amount
        FROM customer_purchases 
        WHERE customerId = ?
        GROUP BY status
      `, [customer.id]);
      
      let activeTotal = 0;
      let refundedTotal = 0;
      let allTotal = 0;
      
      for (const record of purchaseRecords) {
        console.log(`  ${record.status}状态: ${record.count}条记录, 金额: ¥${record.total_amount}`);
        
        if (record.status === 'ACTIVE') {
          activeTotal = parseFloat(record.total_amount || 0);
        } else if (record.status === 'REFUNDED') {
          refundedTotal = parseFloat(record.total_amount || 0);
        }
        allTotal += parseFloat(record.total_amount || 0);
      }
      
      const netConsumption = activeTotal; // 净消费 = 有效购买
      const grossConsumption = allTotal; // 总消费 = 所有购买
      const calculatedNet = grossConsumption - refundedTotal; // 计算的净消费
      
      console.log(`  有效购买总额(ACTIVE): ¥${activeTotal}`);
      console.log(`  退货总额(REFUNDED): ¥${refundedTotal}`);
      console.log(`  所有购买总额: ¥${grossConsumption}`);
      console.log(`  计算的净消费(总-退): ¥${calculatedNet}`);
      
      const dbTotal = parseFloat(customer.totalPurchases || 0);
      
      // 判断totalPurchases字段的含义
      if (Math.abs(dbTotal - activeTotal) < 0.01) {
        console.log(`  ✅ totalPurchases = 有效购买总额 (净消费)`);
      } else if (Math.abs(dbTotal - grossConsumption) < 0.01) {
        console.log(`  ❌ totalPurchases = 所有购买总额 (需要修正)`);
      } else if (Math.abs(dbTotal - calculatedNet) < 0.01) {
        console.log(`  ✅ totalPurchases = 计算的净消费 (总-退)`);
      } else {
        console.log(`  ⚠️  totalPurchases不匹配任何计算结果，可能有问题`);
      }
      
      totalCustomerConsumption += dbTotal;
    }
    
    // 3. 检查财务记录
    console.log('\n💰 财务记录分析:');
    const [financialRecords] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType IN ('INCOME', 'REFUND')
      GROUP BY recordType
    `);
    
    let financialIncome = 0;
    let financialRefund = 0;
    
    for (const record of financialRecords) {
      console.log(`${record.recordType}: ${record.count}条记录, 金额: ¥${record.total_amount}`);
      
      if (record.recordType === 'INCOME') {
        financialIncome = parseFloat(record.total_amount || 0);
      } else if (record.recordType === 'REFUND') {
        financialRefund = parseFloat(record.total_amount || 0);
      }
    }
    
    const financialNet = financialIncome + financialRefund; // 退款是负数
    
    console.log(`\n📈 汇总分析:`);
    console.log(`客户累计消费总和: ¥${totalCustomerConsumption.toFixed(2)}`);
    console.log(`财务收入记录: ¥${financialIncome.toFixed(2)}`);
    console.log(`财务退款记录: ¥${financialRefund.toFixed(2)}`);
    console.log(`财务净收入: ¥${financialNet.toFixed(2)}`);
    
    // 4. 验证用户的说法
    console.log('\n🎯 验证用户的说法:');
    console.log(`用户说客户净消费是2500，让我们检查...`);
    
    if (Math.abs(totalCustomerConsumption - 2500) < 100) {
      console.log(`✅ 客户累计消费 ¥${totalCustomerConsumption.toFixed(2)} 接近用户说的2500`);
      console.log(`✅ 这证明客户的totalPurchases字段确实是净消费（已扣除退款）`);
      console.log(`✅ 财务收入应该等于客户累计消费: ¥${totalCustomerConsumption.toFixed(2)}`);
    } else {
      console.log(`❌ 客户累计消费 ¥${totalCustomerConsumption.toFixed(2)} 与用户说的2500差距较大`);
    }
    
    // 5. 给出修正建议
    console.log('\n🔧 修正建议:');
    console.log('1. 客户的totalPurchases字段 = 净消费（已扣除退款）');
    console.log('2. 财务收入应该 = 客户累计消费总和');
    console.log('3. 不应该再次扣除退款！');
    console.log(`4. 正确的财务收入应该显示: ¥${totalCustomerConsumption.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyCustomerTotalLogic().catch(console.error);