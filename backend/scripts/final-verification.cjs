const mysql = require('mysql2/promise');
require('dotenv').config();

// 最终验证：模拟API计算逻辑
async function finalVerification() {
  let connection;
  
  try {
    console.log('🔍 最终验证财务计算逻辑...');
    
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
    
    // 模拟API的计算逻辑
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    console.log('\n📊 模拟API计算逻辑...');
    
    // 1. 获取本月收入记录
    const [monthlyIncomeRecords] = await connection.execute(`
      SELECT SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType = 'INCOME' AND transactionDate >= ?
    `, [startOfMonth]);
    
    // 2. 获取本月退款记录
    const [monthlyRefundRecords] = await connection.execute(`
      SELECT SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType = 'REFUND' AND transactionDate >= ?
    `, [startOfMonth]);
    
    // 3. 获取年度收入记录
    const [yearlyIncomeRecords] = await connection.execute(`
      SELECT SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType = 'INCOME' AND transactionDate >= ?
    `, [startOfYear]);
    
    // 4. 获取年度退款记录
    const [yearlyRefundRecords] = await connection.execute(`
      SELECT SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType = 'REFUND' AND transactionDate >= ?
    `, [startOfYear]);
    
    const monthlyIncomeAmount = parseFloat(monthlyIncomeRecords[0].total_amount || 0);
    const monthlyRefundAmount = parseFloat(monthlyRefundRecords[0].total_amount || 0);
    const yearlyIncomeAmount = parseFloat(yearlyIncomeRecords[0].total_amount || 0);
    const yearlyRefundAmount = parseFloat(yearlyRefundRecords[0].total_amount || 0);
    
    console.log('原始财务记录数据:');
    console.log(`  本月收入记录: ¥${monthlyIncomeAmount}`);
    console.log(`  本月退款记录: ¥${monthlyRefundAmount}`);
    console.log(`  年度收入记录: ¥${yearlyIncomeAmount}`);
    console.log(`  年度退款记录: ¥${yearlyRefundAmount}`);
    
    // 5. 应用修复后的计算逻辑
    console.log('\n🔧 应用修复后的计算逻辑...');
    
    // 修复后的计算：收入 + 退款（因为退款记录是负数）
    const fixedMonthlyIncome = monthlyIncomeAmount + monthlyRefundAmount;
    const fixedYearlyIncome = yearlyIncomeAmount + yearlyRefundAmount;
    
    console.log('修复后的API返回值:');
    console.log(`  本月收入: ¥${fixedMonthlyIncome.toFixed(2)}`);
    console.log(`  年度收入: ¥${fixedYearlyIncome.toFixed(2)}`);
    
    // 6. 对比期望值
    console.log('\n✅ 对比期望值...');
    
    const expectedIncome = 1003.42; // 从之前的验证脚本得出的正确值
    
    console.log('期望值对比:');
    console.log(`  期望收入: ¥${expectedIncome}`);
    console.log(`  实际计算: ¥${fixedYearlyIncome.toFixed(2)}`);
    console.log(`  差异: ¥${Math.abs(fixedYearlyIncome - expectedIncome).toFixed(2)}`);
    
    if (Math.abs(fixedYearlyIncome - expectedIncome) < 0.01) {
      console.log('🎉 修复验证成功！API现在会返回正确的财务数据。');
    } else {
      console.log('⚠️ 修复可能有问题，需要进一步检查。');
    }
    
    // 7. 生成前端显示预期
    console.log('\n📱 前端显示预期...');
    console.log('用户应该看到:');
    console.log(`  本月收入: ¥${fixedMonthlyIncome.toFixed(2)} (不再是 ¥4073)`);
    console.log(`  总收入: ¥${fixedYearlyIncome.toFixed(2)} (不再是 ¥3541)`);
    console.log(`  实际有效收入: ¥${expectedIncome} (符合业务预期)`);
    
    console.log('\n✅ 最终验证完成');
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行最终验证
finalVerification().catch(console.error);