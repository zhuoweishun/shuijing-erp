const mysql = require('mysql2/promise');
require('dotenv').config();

// 检查财务记录的详细数据
async function checkFinancialRecords() {
  let connection;
  
  try {
    console.log('🔍 检查财务记录详细数据...');
    
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
    
    // 1. 检查所有财务记录
    console.log('\n📊 1. 财务记录总览...');
    const [allRecords] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount,
        AVG(amount) as avg_amount
      FROM financial_records 
      GROUP BY recordType
      ORDER BY recordType
    `);
    
    console.log('财务记录统计:');
    allRecords.forEach(record => {
      console.log(`  ${record.recordType}:`);
      console.log(`    记录数: ${record.count}`);
      console.log(`    总金额: ¥${record.total_amount}`);
      console.log(`    最小金额: ¥${record.min_amount}`);
      console.log(`    最大金额: ¥${record.max_amount}`);
      console.log(`    平均金额: ¥${Number(record.avg_amount).toFixed(2)}`);
      console.log('');
    });
    
    // 2. 检查退款记录的详细信息
    console.log('\n💸 2. 退款记录详情...');
    const [refundRecords] = await connection.execute(`
      SELECT 
        id,
        amount,
        description,
        transactionDate,
        referenceType,
        referenceId
      FROM financial_records 
      WHERE recordType = 'REFUND'
      ORDER BY transactionDate DESC
    `);
    
    if (refundRecords.length > 0) {
      console.log(`退款记录详情 (共${refundRecords.length}条):`);
      refundRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.description}: ¥${record.amount} (${record.transactionDate})`);
      });
    } else {
      console.log('✅ 没有退款记录');
    }
    
    // 3. 检查本月的财务数据
    console.log('\n📅 3. 本月财务数据...');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [monthlyData] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM financial_records 
      WHERE transactionDate >= ?
      GROUP BY recordType
      ORDER BY recordType
    `, [startOfMonth]);
    
    console.log(`本月财务数据 (从${startOfMonth.toLocaleDateString()}开始):`);
    let monthlyIncome = 0;
    let monthlyRefund = 0;
    
    monthlyData.forEach(record => {
      console.log(`  ${record.recordType}: ${record.count}条记录, 金额: ¥${record.total_amount}`);
      if (record.recordType === 'INCOME') {
        monthlyIncome = parseFloat(record.total_amount || 0);
      } else if (record.recordType === 'REFUND') {
        monthlyRefund = parseFloat(record.total_amount || 0);
      }
    });
    
    console.log(`\n本月汇总:`);
    console.log(`  收入: ¥${monthlyIncome}`);
    console.log(`  退款: ¥${monthlyRefund}`);
    console.log(`  净收入: ¥${monthlyIncome - monthlyRefund}`);
    
    // 4. 检查年度财务数据
    console.log('\n📆 4. 年度财务数据...');
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    const [yearlyData] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM financial_records 
      WHERE transactionDate >= ?
      GROUP BY recordType
      ORDER BY recordType
    `, [startOfYear]);
    
    console.log(`年度财务数据 (从${startOfYear.toLocaleDateString()}开始):`);
    let yearlyIncome = 0;
    let yearlyRefund = 0;
    
    yearlyData.forEach(record => {
      console.log(`  ${record.recordType}: ${record.count}条记录, 金额: ¥${record.total_amount}`);
      if (record.recordType === 'INCOME') {
        yearlyIncome = parseFloat(record.total_amount || 0);
      } else if (record.recordType === 'REFUND') {
        yearlyRefund = parseFloat(record.total_amount || 0);
      }
    });
    
    console.log(`\n年度汇总:`);
    console.log(`  收入: ¥${yearlyIncome}`);
    console.log(`  退款: ¥${yearlyRefund}`);
    console.log(`  净收入: ¥${yearlyIncome - yearlyRefund}`);
    
    // 5. 检查客户购买记录对比
    console.log('\n👥 5. 客户购买记录对比...');
    const [customerData] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(totalPrice) as total_amount
      FROM customer_purchases 
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('客户购买记录:');
    let customerActiveAmount = 0;
    let customerRefundAmount = 0;
    
    customerData.forEach(record => {
      console.log(`  ${record.status}: ${record.count}条记录, 金额: ¥${record.total_amount}`);
      if (record.status === 'ACTIVE') {
        customerActiveAmount = parseFloat(record.total_amount || 0);
      } else if (record.status === 'REFUNDED') {
        customerRefundAmount = parseFloat(record.total_amount || 0);
      }
    });
    
    // 6. 数据一致性分析
    console.log('\n🔍 6. 数据一致性分析...');
    
    console.log('收入数据对比:');
    console.log(`  财务记录收入: ¥${yearlyIncome}`);
    console.log(`  客户有效购买: ¥${customerActiveAmount}`);
    console.log(`  差异: ¥${Math.abs(yearlyIncome - customerActiveAmount)}`);
    
    console.log('\n退款数据对比:');
    console.log(`  财务记录退款: ¥${yearlyRefund}`);
    console.log(`  客户退款购买: ¥${customerRefundAmount}`);
    console.log(`  差异: ¥${Math.abs(Math.abs(yearlyRefund) - customerRefundAmount)}`);
    
    // 7. 问题诊断
    console.log('\n🚨 7. 问题诊断...');
    
    const issues = [];
    
    // 检查退款金额是否为负数
    if (yearlyRefund < 0) {
      issues.push('退款记录金额为负数，这可能导致计算错误');
    }
    
    // 检查收入是否过高
    if (yearlyIncome > customerActiveAmount + 100) {
      issues.push('财务收入记录高于客户实际购买金额');
    }
    
    // 检查本月收入是否异常
    if (monthlyIncome > 4000 && customerActiveAmount < 3000) {
      issues.push('本月收入显示异常，可能存在重复记录');
    }
    
    if (issues.length > 0) {
      console.log('发现的问题:');
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    } else {
      console.log('✅ 数据看起来正常');
    }
    
    console.log('\n✅ 财务记录检查完成');
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行检查
checkFinancialRecords().catch(console.error);