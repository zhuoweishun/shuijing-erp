const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function fixDuplicateFinancialRecords() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  console.log('🔧 修复重复的财务记录:');
  
  // 查找多余的财务INCOME记录（没有对应购买记录的）
  console.log('\n=== 查找多余的财务INCOME记录 ===');
  const [extraIncomeRecords] = await connection.execute(`
    SELECT fr.id, fr.referenceId, fr.amount, fr.description, fr.createdAt
    FROM financial_records fr
    LEFT JOIN customer_purchases cp ON fr.referenceId = cp.id
    WHERE fr.recordType = 'INCOME' AND cp.id IS NULL
    ORDER BY fr.createdAt DESC
  `);
  
  if (extraIncomeRecords.length > 0) {
    console.log(`⚠️ 发现${extraIncomeRecords.length}条多余的财务INCOME记录:`);
    let extraAmount = 0;
    const recordIds = [];
    
    extraIncomeRecords.forEach((record, index) => {
      extraAmount += parseFloat(record.amount);
      recordIds.push(record.id);
      console.log(`${index + 1}. 财务ID:${record.id} 引用ID:${record.referenceId} 金额:¥${record.amount} 描述:${record.description}`);
    });
    
    console.log(`多余的财务记录总金额: ¥${extraAmount.toFixed(2)}`);
    
    // 删除这些多余的记录
    console.log('\n=== 删除多余的财务记录 ===');
    const placeholders = recordIds.map(() => '?').join(',');
    const [deleteResult] = await connection.execute(
      `DELETE FROM financial_records WHERE id IN (${placeholders})`,
      recordIds
    );
    
    console.log(`✅ 已删除${deleteResult.affectedRows}条多余的财务记录`);
    
    // 验证修复结果
    console.log('\n=== 验证修复结果 ===');
    const [incomeTotal] = await connection.execute(
      'SELECT SUM(amount) as total FROM financial_records WHERE recordType = "INCOME"'
    );
    const [refundTotal] = await connection.execute(
      'SELECT SUM(amount) as total FROM financial_records WHERE recordType = "REFUND"'
    );
    const [purchaseTotal] = await connection.execute(
      'SELECT SUM(totalPrice) as total FROM customer_purchases WHERE status != "REFUNDED"'
    );
    
    console.log(`修复后财务INCOME总额: ¥${incomeTotal[0].total || 0}`);
    console.log(`财务REFUND总额: ¥${refundTotal[0].total || 0}`);
    console.log(`客户有效购买总额: ¥${purchaseTotal[0].total || 0}`);
    console.log(`净收入: ¥${((incomeTotal[0].total || 0) + (refundTotal[0].total || 0)).toFixed(2)}`);
    
    if (Math.abs((incomeTotal[0].total || 0) - (purchaseTotal[0].total || 0)) < 0.01) {
      console.log('✅ 财务INCOME记录与客户购买记录已完全匹配');
    } else {
      console.log('⚠️ 财务INCOME记录与客户购买记录仍有差异');
    }
    
  } else {
    console.log('✅ 未发现多余的财务INCOME记录');
  }
  
  await connection.end();
}

fixDuplicateFinancialRecords().catch(console.error);