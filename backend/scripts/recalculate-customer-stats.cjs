const mysql = require('mysql2/promise');

// 重新计算客户统计数据
async function recalculateCustomerStats() {
  let connection;
  
  try {
    console.log('🔧 重新计算客户统计数据...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      port: 3306
    });
    
    // 获取所有有购买记录的客户
    const [customers] = await connection.execute(`
      SELECT id, name, totalPurchases, totalOrders 
      FROM customers 
      WHERE totalPurchases > 0 OR totalOrders > 0
    `);
    
    console.log(`找到 ${customers.length} 个需要重新计算的客户`);
    
    let updatedCount = 0;
    
    for (const customer of customers) {
      // 计算实际的有效购买总金额（只计算ACTIVE状态的）
      const [activePurchases] = await connection.execute(`
        SELECT 
          SUM(totalPrice) as total_amount,
          COUNT(*) as total_orders
        FROM customer_purchases 
        WHERE customerId = ? AND status = 'ACTIVE'
      `, [customer.id]);
      
      const actualTotal = parseFloat(activePurchases[0].total_amount || 0);
      const actualOrders = parseInt(activePurchases[0].total_orders || 0);
      
      // 检查是否需要更新
      const totalDiff = Math.abs(actualTotal - parseFloat(customer.totalPurchases || 0));
      const ordersDiff = Math.abs(actualOrders - parseInt(customer.totalOrders || 0));
      
      if (totalDiff > 0.01 || ordersDiff > 0) {
        await connection.execute(`
          UPDATE customers 
          SET totalPurchases = ?, totalOrders = ?, updatedAt = NOW() 
          WHERE id = ?
        `, [actualTotal, actualOrders, customer.id]);
        
        console.log(`✅ 更新客户 ${customer.name}:`);
        console.log(`   消费金额: ¥${customer.totalPurchases} → ¥${actualTotal}`);
        console.log(`   订单数量: ${customer.totalOrders} → ${actualOrders}`);
        updatedCount++;
      }
    }
    
    console.log(`\n🎉 客户统计数据更新完成！更新了 ${updatedCount} 个客户`);
    
    // 验证更新结果
    const [newStats] = await connection.execute(`
      SELECT SUM(totalPurchases) as customer_total 
      FROM customers
    `);
    
    console.log(`\n📊 更新后的客户消费总和: ¥${newStats[0].customer_total}`);
    
  } catch (error) {
    console.error('❌ 重新计算过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行重新计算
if (require.main === module) {
  recalculateCustomerStats()
    .then(() => {
      console.log('\n✨ 重新计算完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 重新计算失败:', error);
      process.exit(1);
    });
}

module.exports = { recalculateCustomerStats };