const mysql = require('mysql2/promise');

// 修复退款记录的金额符号
async function fixRefundAmounts() {
  let connection;
  
  try {
    console.log('🔧 开始修复退款记录的金额符号...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      port: 3306
    });
    
    // 1. 查找所有正数的退款记录
    const [positiveRefunds] = await connection.execute(`
      SELECT id, amount, description 
      FROM financial_records 
      WHERE recordType = 'REFUND' AND amount > 0
    `);
    
    console.log(`找到 ${positiveRefunds.length} 条需要修复的退款记录`);
    
    if (positiveRefunds.length === 0) {
      console.log('✅ 没有需要修复的记录');
      return;
    }
    
    // 2. 显示将要修复的记录
    console.log('\n📋 将要修复的记录:');
    positiveRefunds.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}, 金额: ${record.amount} → ${-record.amount}, 描述: ${record.description}`);
    });
    
    // 3. 开始修复
    console.log('\n🔧 开始修复...');
    let fixedCount = 0;
    
    for (const record of positiveRefunds) {
      try {
        await connection.execute(`
          UPDATE financial_records 
          SET amount = ?, updatedAt = NOW() 
          WHERE id = ?
        `, [-record.amount, record.id]);
        
        console.log(`✅ 修复记录 ${record.id}: ${record.amount} → ${-record.amount}`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ 修复记录 ${record.id} 失败:`, error.message);
      }
    }
    
    console.log(`\n🎉 修复完成！成功修复 ${fixedCount}/${positiveRefunds.length} 条记录`);
    
    // 4. 验证修复结果
    console.log('\n🔍 验证修复结果...');
    const [remainingPositive] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM financial_records 
      WHERE recordType = 'REFUND' AND amount > 0
    `);
    
    if (remainingPositive[0].count === 0) {
      console.log('✅ 所有退款记录已修复为负数');
    } else {
      console.log(`⚠️  仍有 ${remainingPositive[0].count} 条退款记录为正数`);
    }
    
    // 5. 显示修复后的统计
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_refunds,
        SUM(amount) as total_refund_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM financial_records 
      WHERE recordType = 'REFUND'
    `);
    
    console.log('\n📊 修复后的退款记录统计:');
    console.log(`- 退款记录总数: ${stats[0].total_refunds}`);
    console.log(`- 退款总金额: ${stats[0].total_refund_amount}`);
    console.log(`- 最小金额: ${stats[0].min_amount}`);
    console.log(`- 最大金额: ${stats[0].max_amount}`);
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行修复
if (require.main === module) {
  fixRefundAmounts()
    .then(() => {
      console.log('\n✨ 修复完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 修复失败:', error);
      process.exit(1);
    });
}

module.exports = { fixRefundAmounts };