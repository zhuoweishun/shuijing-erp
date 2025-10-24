const mysql = require('mysql2/promise');

async function fixCustomerOrders() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('开始修复客户订单数据...');
    
    // 查询所有客户的实际购买记录数量
    const [customers] = await connection.execute(
      'SELECT id, name, total_orders FROM customers'
    );
    
    for (const customer of customers) {
      // 查询该客户的有效购买记录数量（排除退货等无效订单）
      const [purchases] = await connection.execute(
        'SELECT COUNT(*) as actual_count FROM customer_purchases WHERE customer_id = ? AND status = "ACTIVE"',
        [customer.id]
      );
      
      const actualCount = purchases[0].actual_count;
      
      if (actualCount !== customer.total_orders) {
        console.log(`修复客户 ${customer.name}: total_orders从${customer.total_orders}更新为${actualCount}`);
        
        // 更新客户的total_orders字段
        await connection.execute(
          'UPDATE customers SET total_orders = ? WHERE id = ?',
          [actualCount, customer.id]
        );
      }
    }
    
    console.log('客户订单数据修复完成！');
    
    // 重新查询王二的数据验证
    const [wangEr] = await connection.execute(
      'SELECT id, name, total_orders, total_purchases FROM customers WHERE name LIKE ?',
      ['%王二%']
    );
    
    if (wangEr.length > 0) {
      console.log('\n=== 修复后王二的数据 ===');
      console.log(wangEr[0]);
      
      const [purchaseCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM customer_purchases WHERE customer_id = ? AND status = "ACTIVE"',
        [wangEr[0].id]
      );
      
      const [allPurchases] = await connection.execute(
        'SELECT id, status, total_price, purchase_date FROM customer_purchases WHERE customer_id = ? ORDER BY created_at DESC',
        [wangEr[0].id]
      );
      
      console.log('\n=== 王二的所有购买记录 ===');
      allPurchases.forEach((purchase, index) => {
        console.log(`第${index + 1}单: ID=${purchase.id}, 状态=${purchase.status}, 金额=${purchase.total_price}, 日期=${purchase.purchase_date}`);
      });
      
      console.log(`实际购买记录数: ${purchaseCount[0].count}`);
    }
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await connection.end();
  }
}

fixCustomerOrders();