const mysql = require('mysql2/promise');
require('dotenv').config();

// 财务数据审计脚本
async function auditFinancialData() {
  let connection;
  
  try {
    console.log('🔍 开始财务数据审计...');
    
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
    
    // 1. 检查客户购买记录的实际数据
    console.log('\n📊 1. 检查客户购买记录...');
    const [customerPurchases] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(totalPrice) as total_amount
      FROM customer_purchases 
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('客户购买记录统计:');
    let totalActiveAmount = 0;
    let totalRefundedAmount = 0;
    customerPurchases.forEach(record => {
      console.log(`  ${record.status}: ${record.count}条记录, 金额: ¥${record.total_amount}`);
      if (record.status === 'ACTIVE') {
        totalActiveAmount = parseFloat(record.total_amount || 0);
      } else if (record.status === 'REFUNDED') {
        totalRefundedAmount = parseFloat(record.total_amount || 0);
      }
    });
    
    console.log(`\n📈 客户购买汇总:`);
    console.log(`  有效购买总额: ¥${totalActiveAmount}`);
    console.log(`  退款总额: ¥${totalRefundedAmount}`);
    console.log(`  净收入: ¥${totalActiveAmount - totalRefundedAmount}`);
    
    // 2. 检查财务记录表
    console.log('\n💰 2. 检查财务记录表...');
    const [financialRecords] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM financial_records 
      GROUP BY recordType
      ORDER BY recordType
    `);
    
    console.log('财务记录统计:');
    let financialIncome = 0;
    let financialExpense = 0;
    let financialRefund = 0;
    
    financialRecords.forEach(record => {
      console.log(`  ${record.recordType}: ${record.count}条记录, 金额: ¥${record.total_amount}`);
      if (record.recordType === 'INCOME') {
        financialIncome = parseFloat(record.total_amount || 0);
      } else if (record.recordType === 'EXPENSE') {
        financialExpense = parseFloat(record.total_amount || 0);
      } else if (record.recordType === 'REFUND') {
        financialRefund = Math.abs(parseFloat(record.total_amount || 0));
      }
    });
    
    console.log(`\n💼 财务记录汇总:`);
    console.log(`  收入记录总额: ¥${financialIncome}`);
    console.log(`  支出记录总额: ¥${financialExpense}`);
    console.log(`  退款记录总额: ¥${financialRefund}`);
    console.log(`  净收入: ¥${financialIncome - financialRefund}`);
    
    // 3. 检查是否有重复的收入记录
    console.log('\n🔍 3. 检查重复的收入记录...');
    const [duplicateIncomes] = await connection.execute(`
      SELECT 
        description,
        amount,
        DATE(transactionDate) as transaction_date,
        COUNT(*) as duplicate_count
      FROM financial_records 
      WHERE recordType = 'INCOME'
      GROUP BY description, amount, DATE(transactionDate)
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC, amount DESC
    `);
    
    if (duplicateIncomes.length > 0) {
      console.log('⚠️ 发现重复的收入记录:');
      duplicateIncomes.forEach(record => {
        console.log(`  ${record.description}: ¥${record.amount} (重复${record.duplicate_count}次)`);
      });
    } else {
      console.log('✅ 未发现重复的收入记录');
    }
    
    // 4. 检查收入记录的详细信息
    console.log('\n📋 4. 检查收入记录详情...');
    const [incomeDetails] = await connection.execute(`
      SELECT 
        id,
        description,
        amount,
        transactionDate,
        referenceType,
        referenceId
      FROM financial_records 
      WHERE recordType = 'INCOME'
      ORDER BY transactionDate DESC
    `);
    
    console.log(`收入记录详情 (共${incomeDetails.length}条):`);
    incomeDetails.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.description}: ¥${record.amount} (${record.transactionDate})`);
    });
    
    // 5. 数据一致性检查
    console.log('\n🔍 5. 数据一致性检查...');
    const incomeDiscrepancy = Math.abs(financialIncome - totalActiveAmount);
    const refundDiscrepancy = Math.abs(financialRefund - totalRefundedAmount);
    
    console.log('一致性检查结果:');
    console.log(`  收入一致性: 财务记录¥${financialIncome} vs 客户购买¥${totalActiveAmount} (差异: ¥${incomeDiscrepancy})`);
    console.log(`  退款一致性: 财务记录¥${financialRefund} vs 客户退款¥${totalRefundedAmount} (差异: ¥${refundDiscrepancy})`);
    
    // 6. 问题诊断
    console.log('\n🚨 6. 问题诊断...');
    const issues = [];
    
    if (incomeDiscrepancy > 0.01) {
      issues.push(`收入数据不一致: 差异¥${incomeDiscrepancy}`);
    }
    
    if (refundDiscrepancy > 0.01) {
      issues.push(`退款数据不一致: 差异¥${refundDiscrepancy}`);
    }
    
    if (duplicateIncomes.length > 0) {
      issues.push(`发现${duplicateIncomes.length}组重复收入记录`);
    }
    
    if (financialIncome > 3000 && totalActiveAmount < 3000) {
      issues.push('财务收入记录可能存在重复或错误生成');
    }
    
    if (issues.length > 0) {
      console.log('发现的问题:');
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    } else {
      console.log('✅ 未发现明显问题');
    }
    
    // 7. 修复建议
    console.log('\n🛠️ 7. 修复建议...');
    
    if (duplicateIncomes.length > 0) {
      console.log('建议执行以下修复操作:');
      console.log('1. 删除重复的收入记录');
      console.log('2. 重新生成正确的财务记录');
      console.log('3. 验证修复后的数据一致性');
      
      // 生成修复脚本
      console.log('\n📝 生成修复脚本...');
      
      // 计算需要保留的正确金额
      const correctIncome = totalActiveAmount;
      const excessIncome = financialIncome - correctIncome;
      
      console.log(`正确的收入金额应该是: ¥${correctIncome}`);
      console.log(`当前多出的金额: ¥${excessIncome}`);
      
      if (excessIncome > 0) {
        console.log('\n建议的修复步骤:');
        console.log('1. 备份当前财务记录');
        console.log('2. 删除所有INCOME类型的财务记录');
        console.log('3. 基于customer_purchases表重新生成正确的收入记录');
        console.log('4. 验证修复结果');
      }
    }
    
    // 8. 生成修复脚本
    if (incomeDiscrepancy > 0.01 || duplicateIncomes.length > 0) {
      console.log('\n🔧 准备生成修复脚本...');
      
      const fixScript = `
-- 财务数据修复脚本
-- 执行前请备份数据库

-- 1. 备份现有财务记录
CREATE TABLE financial_records_backup AS SELECT * FROM financial_records;

-- 2. 删除所有收入记录
DELETE FROM financial_records WHERE recordType = 'INCOME';

-- 3. 重新生成正确的收入记录
INSERT INTO financial_records (recordType, amount, description, transactionDate, referenceType, referenceId)
SELECT 
  'INCOME' as recordType,
  cp.totalPrice as amount,
  CONCAT('销售收入 - ', s.skuName) as description,
  cp.purchaseDate as transactionDate,
  'CUSTOMER_PURCHASE' as referenceType,
  cp.id as referenceId
FROM customer_purchases cp
JOIN product_skus s ON cp.skuId = s.id
WHERE cp.status = 'ACTIVE';

-- 4. 验证修复结果
SELECT 
  'customer_purchases' as source,
  SUM(totalPrice) as total_amount
FROM customer_purchases 
WHERE status = 'ACTIVE'
UNION ALL
SELECT 
  'financial_records' as source,
  SUM(amount) as total_amount
FROM financial_records 
WHERE recordType = 'INCOME';
      `;
      
      // 保存修复脚本到文件
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, 'fix-financial-data.sql');
      fs.writeFileSync(scriptPath, fixScript);
      console.log(`修复脚本已保存到: ${scriptPath}`);
    }
    
    console.log('\n✅ 财务数据审计完成');
    
  } catch (error) {
    console.error('❌ 审计过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行审计
auditFinancialData().catch(console.error);