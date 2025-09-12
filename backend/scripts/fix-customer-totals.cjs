const mysql = require('mysql2/promise');

// 修正客户统计数据
async function fixCustomerTotals() {
  let connection;
  
  try {
    console.log('🔧 修正客户统计数据...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      port: 3306
    });
    
    // 修正客户的totalPurchases和totalOrders，只计算ACTIVE状态的购买记录
    const [result] = await connection.execute(`
      UPDATE customers c 
      SET 
        totalPurchases = (
          SELECT COALESCE(SUM(cp.totalPrice), 0) 
          FROM customer_purchases cp 
          WHERE cp.customerId = c.id AND cp.status = 'ACTIVE'
        ),
        totalOrders = (
          SELECT COUNT(*) 
          FROM customer_purchases cp 
          WHERE cp.customerId = c.id AND cp.status = 'ACTIVE'
        ),
        updatedAt = NOW()
    `);
    
    console.log(`✅ 更新了客户统计数据，影响行数: ${result.affectedRows}`);
    
    // 验证修正结果
    const [newStats] = await connection.execute(`
      SELECT SUM(totalPurchases) as customer_total 
      FROM customers
    `);
    
    console.log(`📊 修正后的客户消费总和: ¥${newStats[0].customer_total}`);
    
    // 显示修正后的客户统计
    const [customerList] = await connection.execute(`
      SELECT name, totalPurchases, totalOrders 
      FROM customers 
      WHERE totalPurchases > 0 
      ORDER BY totalPurchases DESC
    `);
    
    console.log('\n📋 修正后的客户统计（前10名）:');
    customerList.slice(0, 10).forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name}: ¥${customer.totalPurchases}, ${customer.totalOrders}单`);
    });
    
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
  fixCustomerTotals()
    .then(() => {
      console.log('\n✨ 修正完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 修正失败:', error);
      process.exit(1);
    });
}

module.exports = { fixCustomerTotals };