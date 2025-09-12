const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * 全面的数据一致性检查脚本
 * 根据业务流程文档中的财务逻辑，检查以下内容：
 * 1. 客户总消费是否等于有效购买记录（status='ACTIVE'）的总金额
 * 2. 财务统计的收入是否等于客户总消费
 * 3. 财务统计的退款是否等于客户退款总额
 * 4. 找出数据不一致的根本原因
 * 5. 提供修复建议
 */

async function comprehensiveDataConsistencyCheck() {
  let connection;
  
  try {
    console.log('🔍 开始全面数据一致性检查...');
    console.log('=' .repeat(80));
    
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
    
    console.log('✅ 数据库连接成功\n');
    
    // ==================== 第一部分：业务数据检查 ====================
    console.log('📊 第一部分：业务数据检查');
    console.log('-'.repeat(50));
    
    // 1. 检查客户购买记录统计
    console.log('\n1️⃣ 客户购买记录统计:');
    const [customerPurchaseStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_records,
        COUNT(CASE WHEN status = 'REFUNDED' THEN 1 END) as refunded_records,
        SUM(CASE WHEN status = 'ACTIVE' THEN totalPrice ELSE 0 END) as active_total_amount,
        SUM(CASE WHEN status = 'REFUNDED' THEN totalPrice ELSE 0 END) as refunded_total_amount,
        SUM(totalPrice) as all_records_total
      FROM customer_purchases
    `);
    
    const purchaseData = customerPurchaseStats[0];
    console.log(`   总购买记录: ${purchaseData.total_records}条`);
    console.log(`   有效记录(ACTIVE): ${purchaseData.active_records}条, 金额: ¥${purchaseData.active_total_amount || 0}`);
    console.log(`   退货记录(REFUNDED): ${purchaseData.refunded_records}条, 金额: ¥${purchaseData.refunded_total_amount || 0}`);
    console.log(`   所有记录总金额: ¥${purchaseData.all_records_total || 0}`);
    
    // 2. 检查客户表中的累计消费统计
    console.log('\n2️⃣ 客户表累计消费统计:');
    const [customerTableStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN totalPurchases > 0 THEN 1 END) as customers_with_purchases,
        SUM(totalPurchases) as customer_table_total,
        AVG(totalPurchases) as avg_customer_spending,
        MAX(totalPurchases) as max_customer_spending,
        MIN(totalPurchases) as min_customer_spending
      FROM customers
    `);
    
    const customerData = customerTableStats[0];
    console.log(`   总客户数: ${customerData.total_customers}`);
    console.log(`   有消费记录的客户: ${customerData.customers_with_purchases}`);
    console.log(`   客户表累计消费总额: ¥${customerData.customer_table_total || 0}`);
    console.log(`   平均客户消费: ¥${Number(customerData.avg_customer_spending || 0).toFixed(2)}`);
    console.log(`   最高客户消费: ¥${customerData.max_customer_spending || 0}`);
    console.log(`   最低客户消费: ¥${customerData.min_customer_spending || 0}`);
    
    // ==================== 第二部分：财务数据检查 ====================
    console.log('\n\n📈 第二部分：财务数据检查');
    console.log('-'.repeat(50));
    
    // 3. 检查财务记录统计
    console.log('\n3️⃣ 财务记录统计:');
    const [financialStats] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as record_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM financial_records
      GROUP BY recordType
      ORDER BY recordType
    `);
    
    let financialIncome = 0;
    let financialRefund = 0;
    let financialExpense = 0;
    
    console.log('   财务记录分类统计:');
    financialStats.forEach(record => {
      console.log(`   ${record.recordType}: ${record.record_count}条, 总额: ¥${record.total_amount || 0}, 平均: ¥${Number(record.avg_amount || 0).toFixed(2)}`);
      
      if (record.recordType === 'INCOME') {
        financialIncome = Number(record.total_amount || 0);
      } else if (record.recordType === 'REFUND') {
        financialRefund = Math.abs(Number(record.total_amount || 0)); // 退款通常是负数，取绝对值
      } else if (record.recordType === 'EXPENSE') {
        financialExpense = Number(record.total_amount || 0);
      }
    });
    
    const financialNetIncome = financialIncome - financialRefund;
    console.log(`\n   财务汇总:`);
    console.log(`   总收入: ¥${financialIncome}`);
    console.log(`   总退款: ¥${financialRefund}`);
    console.log(`   总支出: ¥${financialExpense}`);
    console.log(`   净收入: ¥${financialNetIncome}`);
    
    // ==================== 第三部分：数据一致性对比 ====================
    console.log('\n\n🔍 第三部分：数据一致性对比分析');
    console.log('-'.repeat(50));
    
    const activeAmount = Number(purchaseData.active_total_amount || 0);
    const refundedAmount = Number(purchaseData.refunded_total_amount || 0);
    const customerTableTotal = Number(customerData.customer_table_total || 0);
    
    console.log('\n4️⃣ 关键数据对比:');
    console.log(`   A. 有效购买记录总额(customer_purchases.ACTIVE): ¥${activeAmount}`);
    console.log(`   B. 退货记录总额(customer_purchases.REFUNDED): ¥${refundedAmount}`);
    console.log(`   C. 客户表累计消费总额(customers.totalPurchases): ¥${customerTableTotal}`);
    console.log(`   D. 财务收入记录总额(financial_records.INCOME): ¥${financialIncome}`);
    console.log(`   E. 财务退款记录总额(financial_records.REFUND): ¥${financialRefund}`);
    
    // 5. 一致性检查
    console.log('\n5️⃣ 一致性检查结果:');
    
    // 检查1: 客户表累计消费 vs 有效购买记录
    const diff1 = Math.abs(customerTableTotal - activeAmount);
    const check1Pass = diff1 < 0.01;
    console.log(`   ✓ 检查1 - 客户表累计消费 vs 有效购买记录:`);
    console.log(`     差额: ¥${diff1.toFixed(2)} ${check1Pass ? '✅ 通过' : '❌ 不一致'}`);
    
    // 检查2: 财务收入 vs 客户总消费
    const diff2 = Math.abs(financialIncome - activeAmount);
    const check2Pass = diff2 < 0.01;
    console.log(`   ✓ 检查2 - 财务收入 vs 客户总消费:`);
    console.log(`     差额: ¥${diff2.toFixed(2)} ${check2Pass ? '✅ 通过' : '❌ 不一致'}`);
    
    // 检查3: 财务退款 vs 客户退款
    const diff3 = Math.abs(financialRefund - refundedAmount);
    const check3Pass = diff3 < 0.01;
    console.log(`   ✓ 检查3 - 财务退款 vs 客户退款:`);
    console.log(`     差额: ¥${diff3.toFixed(2)} ${check3Pass ? '✅ 通过' : '❌ 不一致'}`);
    
    // ==================== 第四部分：详细问题分析 ====================
    if (!check1Pass || !check2Pass || !check3Pass) {
      console.log('\n\n🚨 第四部分：详细问题分析');
      console.log('-'.repeat(50));
      
      // 分析客户表数据不一致的具体情况
      if (!check1Pass) {
        console.log('\n6️⃣ 客户表数据不一致分析:');
        const [customerDetailAnalysis] = await connection.execute(`
          SELECT 
            c.id,
            c.name,
            c.totalPurchases as customer_table_total,
            COALESCE(SUM(CASE WHEN cp.status = 'ACTIVE' THEN cp.totalPrice ELSE 0 END), 0) as actual_active_total,
            COALESCE(SUM(CASE WHEN cp.status = 'REFUNDED' THEN cp.totalPrice ELSE 0 END), 0) as actual_refunded_total,
            (c.totalPurchases - COALESCE(SUM(CASE WHEN cp.status = 'ACTIVE' THEN cp.totalPrice ELSE 0 END), 0)) as difference
          FROM customers c
          LEFT JOIN customer_purchases cp ON c.id = cp.customerId
          GROUP BY c.id, c.name, c.totalPurchases
          HAVING ABS(difference) > 0.01
          ORDER BY ABS(difference) DESC
          LIMIT 10
        `);
        
        if (customerDetailAnalysis.length > 0) {
          console.log('   发现客户数据不一致的记录（前10条）:');
          customerDetailAnalysis.forEach(customer => {
            console.log(`   客户: ${customer.name}`);
            console.log(`     客户表记录: ¥${customer.customer_table_total}`);
            console.log(`     实际有效消费: ¥${customer.actual_active_total}`);
            console.log(`     差额: ¥${customer.difference}`);
            console.log('');
          });
        } else {
          console.log('   未发现具体的客户数据不一致记录，可能是汇总计算问题');
        }
      }
      
      // 分析财务记录不一致的具体情况
      if (!check2Pass || !check3Pass) {
        console.log('\n7️⃣ 财务记录不一致分析:');
        
        // 检查是否有重复的财务记录
        const [duplicateFinancialRecords] = await connection.execute(`
          SELECT 
            recordType,
            amount,
            description,
            transactionDate,
            COUNT(*) as duplicate_count
          FROM financial_records
          GROUP BY recordType, amount, description, transactionDate
          HAVING COUNT(*) > 1
          ORDER BY duplicate_count DESC
          LIMIT 10
        `);
        
        if (duplicateFinancialRecords.length > 0) {
          console.log('   发现重复的财务记录:');
          duplicateFinancialRecords.forEach(record => {
            console.log(`   ${record.recordType}: ¥${record.amount}, 重复${record.duplicate_count}次`);
            console.log(`     描述: ${record.description}`);
            console.log(`     日期: ${record.transactionDate}`);
            console.log('');
          });
        }
        
        // 检查财务记录的来源分布
        const [financialSourceAnalysis] = await connection.execute(`
          SELECT 
            recordType,
            SUBSTRING_INDEX(description, ' - ', 1) as source_type,
            COUNT(*) as record_count,
            SUM(amount) as total_amount
          FROM financial_records
          GROUP BY recordType, SUBSTRING_INDEX(description, ' - ', 1)
          ORDER BY recordType, total_amount DESC
        `);
        
        console.log('   财务记录来源分析:');
        financialSourceAnalysis.forEach(source => {
          console.log(`   ${source.recordType} - ${source.source_type}: ${source.record_count}条, ¥${source.total_amount}`);
        });
      }
    }
    
    // ==================== 第五部分：修复建议 ====================
    console.log('\n\n🔧 第五部分：修复建议');
    console.log('-'.repeat(50));
    
    console.log('\n8️⃣ 根据检查结果的修复建议:');
    
    if (check1Pass && check2Pass && check3Pass) {
      console.log('   ✅ 所有数据一致性检查都通过，数据状态良好！');
    } else {
      console.log('   ❌ 发现数据不一致问题，建议按以下步骤修复:');
      
      if (!check1Pass) {
        console.log('\n   🔹 客户表累计消费不一致修复:');
        console.log('     1. 重新计算每个客户的有效消费总额');
        console.log('     2. 更新customers表的totalPurchases字段');
        console.log('     3. 确保后续业务操作同步更新客户统计');
      }
      
      if (!check2Pass) {
        console.log('\n   🔹 财务收入记录不一致修复:');
        console.log('     1. 检查是否有遗漏的销售收入记录');
        console.log('     2. 检查是否有重复的财务记录');
        console.log('     3. 重新生成正确的财务收入记录');
      }
      
      if (!check3Pass) {
        console.log('\n   🔹 财务退款记录不一致修复:');
        console.log('     1. 检查退货操作是否正确生成财务记录');
        console.log('     2. 验证退款金额的正负号是否正确');
        console.log('     3. 清理重复的退款记录');
      }
      
      console.log('\n   🔹 根本原因修复:');
      console.log('     1. 完善业务操作的事务处理，确保数据同步更新');
      console.log('     2. 添加数据一致性验证触发器');
      console.log('     3. 建立定期数据一致性检查机制');
      console.log('     4. 优化API接口，确保业务操作和财务记录同步');
    }
    
    // ==================== 第六部分：汇总报告 ====================
    console.log('\n\n📋 第六部分：汇总报告');
    console.log('-'.repeat(50));
    
    console.log('\n9️⃣ 数据一致性检查汇总:');
    console.log(`   检查项目: 3项`);
    console.log(`   通过项目: ${[check1Pass, check2Pass, check3Pass].filter(Boolean).length}项`);
    console.log(`   失败项目: ${[check1Pass, check2Pass, check3Pass].filter(x => !x).length}项`);
    console.log(`   数据健康度: ${([check1Pass, check2Pass, check3Pass].filter(Boolean).length / 3 * 100).toFixed(1)}%`);
    
    console.log('\n🎯 业务数据状态:');
    console.log(`   客户总数: ${customerData.total_customers}`);
    console.log(`   购买记录总数: ${purchaseData.total_records}`);
    console.log(`   有效消费总额: ¥${activeAmount}`);
    console.log(`   退款总额: ¥${refundedAmount}`);
    console.log(`   净消费总额: ¥${activeAmount - refundedAmount}`);
    
    console.log('\n💰 财务数据状态:');
    console.log(`   财务收入: ¥${financialIncome}`);
    console.log(`   财务退款: ¥${financialRefund}`);
    console.log(`   财务支出: ¥${financialExpense}`);
    console.log(`   财务净收入: ¥${financialNetIncome}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 数据一致性检查完成！');
    
    return {
      businessData: {
        activeAmount,
        refundedAmount,
        customerTableTotal
      },
      financialData: {
        income: financialIncome,
        refund: financialRefund,
        expense: financialExpense
      },
      consistencyChecks: {
        customerTableConsistency: check1Pass,
        financialIncomeConsistency: check2Pass,
        financialRefundConsistency: check3Pass
      },
      healthScore: [check1Pass, check2Pass, check3Pass].filter(Boolean).length / 3 * 100
    };
    
  } catch (error) {
    console.error('❌ 数据一致性检查过程中发生错误:', error.message);
    console.error('错误详情:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行检查
if (require.main === module) {
  comprehensiveDataConsistencyCheck()
    .then(result => {
      console.log('\n📊 检查结果已返回，数据健康度:', result.healthScore.toFixed(1) + '%');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 检查失败:', error.message);
      process.exit(1);
    });
}

module.exports = { comprehensiveDataConsistencyCheck };