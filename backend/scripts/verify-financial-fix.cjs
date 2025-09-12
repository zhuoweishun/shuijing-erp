const mysql = require('mysql2/promise');
require('dotenv').config();

// 验证财务修复结果
async function verifyFinancialFix() {
  let connection;
  
  try {
    console.log('🔍 验证财务修复结果...');
    
    // 从DATABASE_URL解析数据库连接信息
    const databaseUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
    const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!urlMatch) {
      throw new Error('无法解析DATABASE_URL');
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    // 连接数据库
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: parseInt(port)
    });
    
    console.log('✅ 数据库连接成功');
    
    // 获取当前时间
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    // 1. 获取财务记录数据
    console.log('\n📊 1. 财务记录数据...');
    
    // 本月收入记录
    const [monthlyIncomeRecords] = await connection.execute(`
      SELECT SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType = 'INCOME' AND transactionDate >= ?
    `, [startOfMonth]);
    
    // 本月退款记录
    const [monthlyRefundRecords] = await connection.execute(`
      SELECT SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType = 'REFUND' AND transactionDate >= ?
    `, [startOfMonth]);
    
    // 年度收入记录
    const [yearlyIncomeRecords] = await connection.execute(`
      SELECT SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType = 'INCOME' AND transactionDate >= ?
    `, [startOfYear]);
    
    // 年度退款记录
    const [yearlyRefundRecords] = await connection.execute(`
      SELECT SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType = 'REFUND' AND transactionDate >= ?
    `, [startOfYear]);
    
    const monthlyIncome = parseFloat(monthlyIncomeRecords[0].total_amount || 0);
    const monthlyRefund = parseFloat(monthlyRefundRecords[0].total_amount || 0);
    const yearlyIncome = parseFloat(yearlyIncomeRecords[0].total_amount || 0);
    const yearlyRefund = parseFloat(yearlyRefundRecords[0].total_amount || 0);
    
    console.log('财务记录原始数据:');
    console.log(`  本月收入记录: ¥${monthlyIncome}`);
    console.log(`  本月退款记录: ¥${monthlyRefund}`);
    console.log(`  年度收入记录: ¥${yearlyIncome}`);
    console.log(`  年度退款记录: ¥${yearlyRefund}`);
    
    // 2. 计算修复后的净收入
    console.log('\n🔧 2. 修复后的计算结果...');
    
    // 修复后的计算：收入 + 退款（因为退款是负数）
    const fixedMonthlyIncome = monthlyIncome + monthlyRefund;
    const fixedYearlyIncome = yearlyIncome + yearlyRefund;
    
    console.log('修复后的净收入:');
    console.log(`  本月净收入: ¥${fixedMonthlyIncome.toFixed(2)}`);
    console.log(`  年度净收入: ¥${fixedYearlyIncome.toFixed(2)}`);
    
    // 3. 对比客户购买记录
    console.log('\n👥 3. 客户购买记录对比...');
    
    const [customerActiveRecords] = await connection.execute(`
      SELECT SUM(totalPrice) as total_amount
      FROM customer_purchases 
      WHERE status = 'ACTIVE'
    `);
    
    const [customerRefundedRecords] = await connection.execute(`
      SELECT SUM(totalPrice) as total_amount
      FROM customer_purchases 
      WHERE status = 'REFUNDED'
    `);
    
    const customerActiveAmount = parseFloat(customerActiveRecords[0].total_amount || 0);
    const customerRefundedAmount = parseFloat(customerRefundedRecords[0].total_amount || 0);
    const customerNetAmount = customerActiveAmount - customerRefundedAmount;
    
    console.log('客户购买记录:');
    console.log(`  有效购买总额: ¥${customerActiveAmount}`);
    console.log(`  退款购买总额: ¥${customerRefundedAmount}`);
    console.log(`  客户净消费: ¥${customerNetAmount.toFixed(2)}`);
    
    // 4. 验证一致性
    console.log('\n✅ 4. 一致性验证...');
    
    const incomeConsistency = Math.abs(fixedYearlyIncome - customerNetAmount);
    
    console.log('一致性检查:');
    console.log(`  财务净收入: ¥${fixedYearlyIncome.toFixed(2)}`);
    console.log(`  客户净消费: ¥${customerNetAmount.toFixed(2)}`);
    console.log(`  差异: ¥${incomeConsistency.toFixed(2)}`);
    
    if (incomeConsistency < 0.01) {
      console.log('🎉 数据一致性验证通过！');
    } else {
      console.log('⚠️ 数据仍存在不一致');
    }
    
    // 5. 预期的前端显示结果
    console.log('\n📱 5. 预期的前端显示结果...');
    
    console.log('前端应该显示:');
    console.log(`  本月收入: ¥${fixedMonthlyIncome.toFixed(2)} (而不是 ¥${(monthlyIncome - monthlyRefund).toFixed(2)})`);
    console.log(`  总收入: ¥${fixedYearlyIncome.toFixed(2)} (而不是 ¥${(yearlyIncome - yearlyRefund).toFixed(2)})`);
    console.log(`  实际应该显示: ¥${customerNetAmount.toFixed(2)}`);
    
    // 6. 修复验证总结
    console.log('\n📋 6. 修复验证总结...');
    
    const beforeMonthlyIncome = monthlyIncome - monthlyRefund;
    const beforeYearlyIncome = yearlyIncome - yearlyRefund;
    
    console.log('修复前后对比:');
    console.log(`  修复前本月收入: ¥${beforeMonthlyIncome.toFixed(2)}`);
    console.log(`  修复后本月收入: ¥${fixedMonthlyIncome.toFixed(2)}`);
    console.log(`  修复前年度收入: ¥${beforeYearlyIncome.toFixed(2)}`);
    console.log(`  修复后年度收入: ¥${fixedYearlyIncome.toFixed(2)}`);
    
    if (Math.abs(fixedYearlyIncome - customerNetAmount) < 0.01) {
      console.log('\n✅ 修复成功！财务数据现在与业务数据一致。');
    } else {
      console.log('\n❌ 修复未完全成功，仍需进一步调整。');
    }
    
    console.log('\n✅ 验证完成');
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行验证
verifyFinancialFix().catch(console.error);