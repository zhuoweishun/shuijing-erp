const mysql = require('mysql2/promise');

// 修正客户净消费金额
async function fixCustomerNetConsumption() {
  let connection;
  
  try {
    console.log('🔧 修正客户净消费金额...');
    console.log('按照业务逻辑：客户累计消费 = 销售收入 - 退货金额');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      port: 3306
    });
    
    // 获取所有有购买记录的客户
    const [customers] = await connection.execute(`
      SELECT id, name, totalPurchases 
      FROM customers 
      WHERE totalPurchases > 0
    `);
    
    console.log(`找到 ${customers.length} 个有消费记录的客户`);
    
    let updatedCount = 0;
    let totalAdjustment = 0;
    
    for (const customer of customers) {
      // 计算该客户的实际净消费：所有ACTIVE购买 - 所有退货金额
      const [purchaseStats] = await connection.execute(`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN totalPrice ELSE 0 END), 0) as active_total,
          COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN totalPrice ELSE 0 END), 0) as refunded_total
        FROM customer_purchases 
        WHERE customerId = ?
      `, [customer.id]);
      
      // 净消费 = 有效购买总额（退货已经在客户退货时从totalPurchases中扣除了）
      const netConsumption = parseFloat(purchaseStats[0].active_total || 0);
      const currentTotal = parseFloat(customer.totalPurchases || 0);
      
      console.log(`\n客户 ${customer.name}:`);
      console.log(`  有效购买: ¥${purchaseStats[0].active_total}`);
      console.log(`  已退货: ¥${purchaseStats[0].refunded_total}`);
      console.log(`  当前累计: ¥${currentTotal}`);
      console.log(`  应该累计: ¥${netConsumption}`);
      
      const difference = Math.abs(netConsumption - currentTotal);
      
      if (difference > 0.01) {
        await connection.execute(`
          UPDATE customers 
          SET totalPurchases = ?, updatedAt = NOW() 
          WHERE id = ?
        `, [netConsumption, customer.id]);
        
        console.log(`  ✅ 已修正: ¥${currentTotal} → ¥${netConsumption}`);
        updatedCount++;
        totalAdjustment += (netConsumption - currentTotal);
      } else {
        console.log(`  ✅ 无需修正`);
      }
    }
    
    console.log(`\n🎉 修正完成！`);
    console.log(`- 更新客户数: ${updatedCount}`);
    console.log(`- 总调整金额: ¥${totalAdjustment.toFixed(2)}`);
    
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
      console.log(`✅ 数据完全一致！`);
    } else {
      console.log(`⚠️  仍有差异，需要进一步检查`);
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
  fixCustomerNetConsumption()
    .then(() => {
      console.log('\n✨ 修正完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 修正失败:', error);
      process.exit(1);
    });
}

module.exports = { fixCustomerNetConsumption };