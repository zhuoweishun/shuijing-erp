const mysql = require('mysql2/promise');

async function checkCustomerData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    // 查询王二的客户记录
    const [customers] = await connection.execute(
      'SELECT id, name, total_orders, total_purchases, last_purchase_date FROM customers WHERE name LIKE ?',
      ['%王二%']
    );
    
    console.log('=== 王二的客户记录 ===');
    console.log(customers);
    
    if (customers.length > 0) {
      const customerId = customers[0].id;
      
      // 查询王二的所有购买记录
      const [purchases] = await connection.execute(
        'SELECT id, total_price, purchase_date, created_at FROM customer_purchases WHERE customer_id = ? ORDER BY created_at DESC',
        [customerId]
      );
      
      console.log('\n=== 王二的购买记录 ===');
      console.log(`购买记录总数: ${purchases.length}`);
      purchases.forEach((purchase, index) => {
        console.log(`第${index + 1}单: ID=${purchase.id}, 金额=${purchase.total_price}, 日期=${purchase.purchase_date}`);
      });
      
      // 检查复购率计算逻辑
      const [analytics] = await connection.execute(
        'SELECT COUNT(*) as total_customers FROM customers WHERE total_orders >= 1'
      );
      
      const [repeatCustomers] = await connection.execute(
        'SELECT COUNT(*) as repeat_customers FROM customers WHERE total_orders >= 2'
      );
      
      console.log('\n=== 复购率计算数据 ===');
      console.log(`总客户数 (total_orders >= 1): ${analytics[0].total_customers}`);
      console.log(`复购客户数 (total_orders >= 3): ${repeatCustomers[0].repeat_customers}`);
      console.log(`复购率: ${repeatCustomers[0].repeat_customers / analytics[0].total_customers * 100}%`);
    }
    
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await connection.end();
  }
}

checkCustomerData();