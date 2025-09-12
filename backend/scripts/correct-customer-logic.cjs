const mysql = require('mysql2/promise');

// 按照正确的业务逻辑修正客户累计消费
async function correctCustomerLogic() {
  let connection;
  
  try {
    console.log('🔧 按照正确的业务逻辑修正客户累计消费...');
    console.log('业务逻辑：客户累计消费 = 财务净收入（销售收入 - 退货金额）');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      port: 3306
    });
    
    // 方法1：直接根据财务记录计算每个客户的净消费
    console.log('\n📊 方法1：根据财务记录计算客户净消费');
    
    // 获取每个客户的财务净消费（收入-退款）
    const [customerFinancialStats] = await connection.execute(`
      SELECT 
        cp.customerId,
        c.name as customer_name,
        SUM(CASE WHEN fr.recordType = 'INCOME' THEN fr.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN fr.recordType = 'REFUND' THEN fr.amount ELSE 0 END) as total_refunds,
        SUM(fr.amount) as net_consumption
      FROM financial_records fr
      JOIN customer_purchases cp ON fr.referenceId = cp.id
      JOIN customers c ON cp.customerId = c.id
      WHERE fr.recordType IN ('INCOME', 'REFUND')
      GROUP BY cp.customerId, c.name
      HAVING net_consumption > 0
      ORDER BY net_consumption DESC
    `);
    
    console.log(`找到 ${customerFinancialStats.length} 个有财务记录的客户`);
    
    let updatedCount = 0;
    
    for (const stat of customerFinancialStats) {
      const netConsumption = parseFloat(stat.net_consumption || 0);
      
      // 获取客户当前的totalPurchases
      const [currentCustomer] = await connection.execute(`
        SELECT totalPurchases FROM customers WHERE id = ?
      `, [stat.customerId]);
      
      const currentTotal = parseFloat(currentCustomer[0]?.totalPurchases || 0);
      
      console.log(`\n客户 ${stat.customer_name}:`);
      console.log(`  财务收入: ¥${stat.total_income}`);
      console.log(`  财务退款: ¥${stat.total_refunds}`);
      console.log(`  财务净消费: ¥${netConsumption}`);
      console.log(`  当前累计: ¥${currentTotal}`);
      
      if (Math.abs(netConsumption - currentTotal) > 0.01) {
        await connection.execute(`
          UPDATE customers 
          SET totalPurchases = ?, updatedAt = NOW() 
          WHERE id = ?
        `, [netConsumption, stat.customerId]);
        
        console.log(`  ✅ 已修正: ¥${currentTotal} → ¥${netConsumption}`);
        updatedCount++;
      } else {
        console.log(`  ✅ 无需修正`);
      }
    }
    
    // 将没有财务记录的客户累计消费设为0
    const [zeroResult] = await connection.execute(`
      UPDATE customers 
      SET totalPurchases = 0, updatedAt = NOW() 
      WHERE id NOT IN (
        SELECT DISTINCT cp.customerId 
        FROM financial_records fr
        JOIN customer_purchases cp ON fr.referenceId = cp.id
        WHERE fr.recordType IN ('INCOME', 'REFUND')
      ) AND totalPurchases > 0
    `);
    
    if (zeroResult.affectedRows > 0) {
      console.log(`\n✅ 将 ${zeroResult.affectedRows} 个无财务记录的客户累计消费设为0`);
    }
    
    console.log(`\n🎉 修正完成！更新了 ${updatedCount} 个客户`);
    
    // 验证修正结果
    const [newStats] = await connection.execute(`
      SELECT SUM(totalPurchases) as customer_total 
      FROM customers
    `);
    
    const [financialStats] = await connection.execute(`
      SELECT 
        SUM(CASE WHEN recordType = 'INCOME' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN recordType = 'REFUND' THEN amount ELSE 0 END) as total_refunds,
        SUM(amount) as net_income
      FROM financial_records 
      WHERE recordType IN ('INCOME', 'REFUND')
    `);
    
    console.log(`\n📊 修正后的数据对比:`);
    console.log(`- 客户累计消费: ¥${newStats[0].customer_total}`);
    console.log(`- 财务净收入: ¥${financialStats[0].net_income}`);
    console.log(`- 差异: ¥${Math.abs(newStats[0].customer_total - financialStats[0].net_income).toFixed(2)}`);
    
    if (Math.abs(newStats[0].customer_total - financialStats[0].net_income) < 0.01) {
      console.log(`✅ 数据完全一致！业务逻辑正确！`);
    } else {
      console.log(`⚠️  仍有差异: ¥${(newStats[0].customer_total - financialStats[0].net_income).toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ 修正过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行修正
if (require.main === module) {
  correctCustomerLogic()
    .then(() => {
      console.log('\n✨ 修正完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 修正失败:', error);
      process.exit(1);
    });
}

module.exports = { correctCustomerLogic };