const mysql = require('mysql2/promise');

// 验证总收入计算逻辑
async function verifyTotalIncomeCalculation() {
  let connection;
  
  try {
    console.log('🔍 验证总收入计算逻辑...');
    
    // 连接数据库
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      timezone: '+08:00'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 1. 查询客户累计消费（净消费）
    const [customerStats] = await connection.execute(`
      SELECT 
        SUM(totalPurchases) as customer_total_consumption
      FROM customers 
      WHERE totalPurchases > 0
    `);
    
    // 2. 查询财务收入记录
    const [incomeStats] = await connection.execute(`
      SELECT 
        SUM(amount) as total_income_records
      FROM financial_records 
      WHERE recordType = 'INCOME'
    `);
    
    // 3. 查询财务退款记录
    const [refundStats] = await connection.execute(`
      SELECT 
        SUM(amount) as total_refund_records
      FROM financial_records 
      WHERE recordType = 'REFUND'
    `);
    
    // 4. 计算数据
    const customerConsumption = parseFloat(customerStats[0].customer_total_consumption || 0);
    const incomeRecords = parseFloat(incomeStats[0].total_income_records || 0);
    const refundRecords = parseFloat(refundStats[0].total_refund_records || 0);
    const refundAbsolute = Math.abs(refundRecords);
    
    console.log('\n📊 数据统计:');
    console.log(`客户累计消费（净消费）: ¥${customerConsumption.toFixed(2)}`);
    console.log(`财务收入记录: ¥${incomeRecords.toFixed(2)}`);
    console.log(`财务退款记录: ¥${refundRecords.toFixed(2)}`);
    console.log(`退款金额绝对值: ¥${refundAbsolute.toFixed(2)}`);
    
    console.log('\n🧮 总收入计算:');
    
    // 用户要求的计算方式：客户累计消费 + 退款金额绝对值
    const totalIncomeUserLogic = customerConsumption + refundAbsolute;
    console.log(`按用户逻辑计算总收入: ¥${customerConsumption.toFixed(2)} + ¥${refundAbsolute.toFixed(2)} = ¥${totalIncomeUserLogic.toFixed(2)}`);
    
    // API当前的计算方式：财务收入记录 + 退款金额绝对值
    const totalIncomeApiLogic = incomeRecords + refundAbsolute;
    console.log(`按API逻辑计算总收入: ¥${incomeRecords.toFixed(2)} + ¥${refundAbsolute.toFixed(2)} = ¥${totalIncomeApiLogic.toFixed(2)}`);
    
    console.log('\n✅ 验证结果:');
    
    if (Math.abs(customerConsumption - incomeRecords) < 0.01) {
      console.log('✅ 客户累计消费 = 财务收入记录（数据一致）');
    } else {
      console.log('❌ 客户累计消费 ≠ 财务收入记录（数据不一致）');
    }
    
    if (Math.abs(totalIncomeUserLogic - totalIncomeApiLogic) < 0.01) {
      console.log('✅ 用户逻辑 = API逻辑（计算一致）');
    } else {
      console.log('❌ 用户逻辑 ≠ API逻辑（计算不一致）');
    }
    
    console.log(`\n🎯 最终总收入应该显示: ¥${totalIncomeApiLogic.toFixed(2)}`);
    
    if (totalIncomeApiLogic >= 3900 && totalIncomeApiLogic <= 4100) {
      console.log('✅ 总收入在用户期望的4000左右范围内');
    } else {
      console.log('❌ 总收入不在用户期望的4000左右范围内');
    }
    
    // 5. 详细的业务逻辑解释
    console.log('\n📝 业务逻辑解释:');
    console.log('1. 客户累计消费 = 净消费（已扣除退款的实际消费）');
    console.log('2. 财务收入记录 = 客户累计消费（应该相等）');
    console.log('3. 总收入 = 所有发生过的收入流水 = 净消费 + 退款绝对值');
    console.log('4. 这样计算的总收入代表了所有曾经发生的收入，包括后来退款的部分');
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行验证
verifyTotalIncomeCalculation().catch(console.error);