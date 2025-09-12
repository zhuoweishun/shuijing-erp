const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * 财务数据一致性修复脚本
 * 根据数据一致性检查的结果，修复以下问题：
 * 1. 重新生成缺失的销售收入记录
 * 2. 确保财务记录与业务数据一致
 * 3. 清理重复的财务记录
 */

async function fixFinancialDataConsistency() {
  let connection;
  
  try {
    console.log('🔧 开始修复财务数据一致性...');
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
    
    // ==================== 第一步：分析当前状况 ====================
    console.log('📊 第一步：分析当前财务数据状况');
    console.log('-'.repeat(50));
    
    // 检查当前财务记录
    const [currentFinancialStats] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as record_count,
        SUM(amount) as total_amount
      FROM financial_records
      GROUP BY recordType
    `);
    
    console.log('当前财务记录状况:');
    let currentIncome = 0;
    let currentRefund = 0;
    currentFinancialStats.forEach(record => {
      console.log(`  ${record.recordType}: ${record.record_count}条, 总额: ¥${record.total_amount || 0}`);
      if (record.recordType === 'INCOME') {
        currentIncome = Number(record.total_amount || 0);
      } else if (record.recordType === 'REFUND') {
        currentRefund = Math.abs(Number(record.total_amount || 0));
      }
    });
    
    // 检查客户购买记录
    const [customerPurchaseStats] = await connection.execute(`
      SELECT 
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'REFUNDED' THEN 1 END) as refunded_count,
        SUM(CASE WHEN status = 'ACTIVE' THEN totalPrice ELSE 0 END) as active_total,
        SUM(CASE WHEN status = 'REFUNDED' THEN totalPrice ELSE 0 END) as refunded_total
      FROM customer_purchases
    `);
    
    const purchaseData = customerPurchaseStats[0];
    console.log('\n客户购买记录状况:');
    console.log(`  有效购买: ${purchaseData.active_count}条, 总额: ¥${purchaseData.active_total || 0}`);
    console.log(`  退货记录: ${purchaseData.refunded_count}条, 总额: ¥${purchaseData.refunded_total || 0}`);
    
    const expectedIncome = Number(purchaseData.active_total || 0);
    const expectedRefund = Number(purchaseData.refunded_total || 0);
    
    console.log('\n数据对比分析:');
    console.log(`  期望财务收入: ¥${expectedIncome}`);
    console.log(`  实际财务收入: ¥${currentIncome}`);
    console.log(`  收入差额: ¥${expectedIncome - currentIncome}`);
    console.log(`  期望财务退款: ¥${expectedRefund}`);
    console.log(`  实际财务退款: ¥${currentRefund}`);
    console.log(`  退款差额: ¥${expectedRefund - currentRefund}`);
    
    // ==================== 第二步：备份现有财务记录 ====================
    console.log('\n\n💾 第二步：备份现有财务记录');
    console.log('-'.repeat(50));
    
    // 创建备份表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS financial_records_backup_${Date.now()} AS 
      SELECT * FROM financial_records
    `);
    
    console.log('✅ 财务记录已备份');
    
    // ==================== 第三步：清理重复记录 ====================
    console.log('\n\n🧹 第三步：清理重复的财务记录');
    console.log('-'.repeat(50));
    
    // 查找重复记录
    const [duplicateRecords] = await connection.execute(`
      SELECT 
        recordType,
        amount,
        description,
        transactionDate,
        COUNT(*) as duplicate_count,
        GROUP_CONCAT(id) as duplicate_ids
      FROM financial_records
      GROUP BY recordType, amount, description, transactionDate
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateRecords.length > 0) {
      console.log(`发现 ${duplicateRecords.length} 组重复记录:`);
      
      for (const duplicate of duplicateRecords) {
        console.log(`  ${duplicate.recordType}: ¥${duplicate.amount}, 重复${duplicate.duplicate_count}次`);
        
        // 保留第一条记录，删除其他重复记录
        const ids = duplicate.duplicate_ids.split(',');
        const idsToDelete = ids.slice(1); // 保留第一个ID，删除其他
        
        if (idsToDelete.length > 0) {
          await connection.execute(
            `DELETE FROM financial_records WHERE id IN (${idsToDelete.map(() => '?').join(',')})`,
            idsToDelete
          );
          console.log(`    删除了 ${idsToDelete.length} 条重复记录`);
        }
      }
    } else {
      console.log('✅ 未发现重复记录');
    }
    
    // ==================== 第四步：生成缺失的销售收入记录 ====================
    console.log('\n\n💰 第四步：生成缺失的销售收入记录');
    console.log('-'.repeat(50));
    
    // 查找没有对应财务收入记录的有效购买记录
    const [missingIncomeRecords] = await connection.execute(`
      SELECT 
        cp.id,
        cp.customerId,
        cp.skuId,
        cp.quantity,
        cp.unitPrice,
        cp.totalPrice,
        cp.purchaseDate,
        cp.saleChannel,
        c.name as customerName,
        s.skuName,
        s.skuCode
      FROM customer_purchases cp
      LEFT JOIN customers c ON cp.customerId = c.id
      LEFT JOIN product_skus s ON cp.skuId = s.id
      LEFT JOIN financial_records fr ON (
        fr.recordType = 'INCOME' AND 
        fr.description LIKE CONCAT('%', s.skuName, '%') AND
        ABS(fr.amount - cp.totalPrice) < 0.01 AND
        DATE(fr.transactionDate) = DATE(cp.purchaseDate)
      )
      WHERE cp.status = 'ACTIVE' AND fr.id IS NULL
      ORDER BY cp.purchaseDate
    `);
    
    console.log(`发现 ${missingIncomeRecords.length} 条缺失的销售收入记录`);
    
    if (missingIncomeRecords.length > 0) {
      console.log('\n开始生成销售收入记录:');
      
      for (const purchase of missingIncomeRecords) {
        // 生成唯一ID（类似现有记录的格式）
        const generateId = () => {
          const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
          let result = 'fr_';
          for (let i = 0; i < 17; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return result;
        };
        
        const incomeRecord = {
          id: generateId(),
          recordType: 'INCOME',
          amount: purchase.totalPrice,
          description: `销售收入 - ${purchase.skuName}`,
          notes: `客户: ${purchase.customerName}, SKU编码: ${purchase.skuCode}, 数量: ${purchase.quantity}件, 渠道: ${purchase.saleChannel || '未知'}`,
          referenceType: 'SALE',
          referenceId: purchase.id,
          category: '客户购买',
          transactionDate: purchase.purchaseDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'cmf8h3g8p0000tupgq4gcrfw0' // 使用现有的userId
        };
        
        await connection.execute(
          `INSERT INTO financial_records (id, recordType, amount, description, notes, referenceType, referenceId, category, transactionDate, createdAt, updatedAt, userId) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            incomeRecord.id,
            incomeRecord.recordType,
            incomeRecord.amount,
            incomeRecord.description,
            incomeRecord.notes,
            incomeRecord.referenceType,
            incomeRecord.referenceId,
            incomeRecord.category,
            incomeRecord.transactionDate,
            incomeRecord.createdAt,
            incomeRecord.updatedAt,
            incomeRecord.userId
          ]
        );
        
        console.log(`  ✅ 生成收入记录: ${purchase.customerName} - ${purchase.skuName} - ¥${purchase.totalPrice}`);
      }
      
      console.log(`\n✅ 成功生成 ${missingIncomeRecords.length} 条销售收入记录`);
    }
    
    // ==================== 第五步：验证退款记录 ====================
    console.log('\n\n↩️  第五步：验证退款记录');
    console.log('-'.repeat(50));
    
    // 查找没有对应财务退款记录的退货记录
    const [missingRefundRecords] = await connection.execute(`
      SELECT 
        cp.id,
        cp.customerId,
        cp.skuId,
        cp.quantity,
        cp.unitPrice,
        cp.totalPrice,
        cp.refundDate,
        cp.refundReason,
        c.name as customerName,
        s.skuName,
        s.skuCode
      FROM customer_purchases cp
      LEFT JOIN customers c ON cp.customerId = c.id
      LEFT JOIN product_skus s ON cp.skuId = s.id
      LEFT JOIN financial_records fr ON (
        fr.recordType = 'REFUND' AND 
        fr.description LIKE CONCAT('%', s.skuName, '%') AND
        ABS(ABS(fr.amount) - cp.totalPrice) < 0.01 AND
        DATE(fr.transactionDate) = DATE(cp.refundDate)
      )
      WHERE cp.status = 'REFUNDED' AND fr.id IS NULL
      ORDER BY cp.refundDate
    `);
    
    console.log(`发现 ${missingRefundRecords.length} 条缺失的退款记录`);
    
    if (missingRefundRecords.length > 0) {
      console.log('\n开始生成退款记录:');
      
      for (const refund of missingRefundRecords) {
        const refundRecord = {
          id: generateId(),
          recordType: 'REFUND',
          amount: -refund.totalPrice, // 退款记录为负数
          description: `客户退货退款 - ${refund.skuName}`,
          notes: `客户: ${refund.customerName}, 退货原因: ${refund.refundReason || '未知'}, SKU编码: ${refund.skuCode}`,
          referenceType: 'REFUND',
          referenceId: refund.id,
          category: '客户退货',
          transactionDate: refund.refundDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'cmf8h3g8p0000tupgq4gcrfw0' // 使用现有的userId
        };
        
        await connection.execute(
          `INSERT INTO financial_records (id, recordType, amount, description, notes, referenceType, referenceId, category, transactionDate, createdAt, updatedAt, userId) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            refundRecord.id,
            refundRecord.recordType,
            refundRecord.amount,
            refundRecord.description,
            refundRecord.notes,
            refundRecord.referenceType,
            refundRecord.referenceId,
            refundRecord.category,
            refundRecord.transactionDate,
            refundRecord.createdAt,
            refundRecord.updatedAt,
            refundRecord.userId
          ]
        );
        
        console.log(`  ✅ 生成退款记录: ${refund.customerName} - ${refund.skuName} - ¥${refund.totalPrice}`);
      }
      
      console.log(`\n✅ 成功生成 ${missingRefundRecords.length} 条退款记录`);
    }
    
    // ==================== 第六步：验证修复结果 ====================
    console.log('\n\n🔍 第六步：验证修复结果');
    console.log('-'.repeat(50));
    
    // 重新检查财务记录
    const [newFinancialStats] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as record_count,
        SUM(amount) as total_amount
      FROM financial_records
      GROUP BY recordType
    `);
    
    console.log('修复后的财务记录状况:');
    let newIncome = 0;
    let newRefund = 0;
    newFinancialStats.forEach(record => {
      console.log(`  ${record.recordType}: ${record.record_count}条, 总额: ¥${record.total_amount || 0}`);
      if (record.recordType === 'INCOME') {
        newIncome = Number(record.total_amount || 0);
      } else if (record.recordType === 'REFUND') {
        newRefund = Math.abs(Number(record.total_amount || 0));
      }
    });
    
    console.log('\n修复结果验证:');
    const incomeDiff = Math.abs(newIncome - expectedIncome);
    const refundDiff = Math.abs(newRefund - expectedRefund);
    
    console.log(`  财务收入一致性: ${incomeDiff < 0.01 ? '✅ 通过' : '❌ 不一致'} (差额: ¥${incomeDiff.toFixed(2)})`);
    console.log(`  财务退款一致性: ${refundDiff < 0.01 ? '✅ 通过' : '❌ 不一致'} (差额: ¥${refundDiff.toFixed(2)})`);
    
    // ==================== 第七步：生成修复报告 ====================
    console.log('\n\n📋 第七步：修复报告');
    console.log('-'.repeat(50));
    
    console.log('\n修复前后对比:');
    console.log(`  收入记录: ¥${currentIncome} → ¥${newIncome} (增加: ¥${newIncome - currentIncome})`);
    console.log(`  退款记录: ¥${currentRefund} → ¥${newRefund} (增加: ¥${newRefund - currentRefund})`);
    console.log(`  净收入: ¥${currentIncome - currentRefund} → ¥${newIncome - newRefund}`);
    
    console.log('\n修复操作汇总:');
    console.log(`  清理重复记录: ${duplicateRecords.length}组`);
    console.log(`  生成销售收入记录: ${missingIncomeRecords.length}条`);
    console.log(`  生成退款记录: ${missingRefundRecords.length}条`);
    
    const overallSuccess = incomeDiff < 0.01 && refundDiff < 0.01;
    console.log(`\n修复状态: ${overallSuccess ? '✅ 成功' : '❌ 部分失败'}`);
    
    if (overallSuccess) {
      console.log('\n🎉 财务数据一致性修复完成！');
      console.log('   - 所有销售收入记录已正确生成');
      console.log('   - 所有退款记录已正确生成');
      console.log('   - 财务统计与业务数据完全一致');
    } else {
      console.log('\n⚠️  修复过程中发现问题，请检查:');
      if (incomeDiff >= 0.01) {
        console.log('   - 收入记录仍有差异，可能存在数据质量问题');
      }
      if (refundDiff >= 0.01) {
        console.log('   - 退款记录仍有差异，可能存在数据质量问题');
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 财务数据一致性修复完成！');
    
    return {
      success: overallSuccess,
      before: {
        income: currentIncome,
        refund: currentRefund
      },
      after: {
        income: newIncome,
        refund: newRefund
      },
      operations: {
        duplicatesRemoved: duplicateRecords.length,
        incomeRecordsGenerated: missingIncomeRecords.length,
        refundRecordsGenerated: missingRefundRecords.length
      }
    };
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error.message);
    console.error('错误详情:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行修复
if (require.main === module) {
  fixFinancialDataConsistency()
    .then(result => {
      console.log('\n📊 修复结果:', result.success ? '成功' : '部分失败');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 修复失败:', error.message);
      process.exit(1);
    });
}

module.exports = { fixFinancialDataConsistency };