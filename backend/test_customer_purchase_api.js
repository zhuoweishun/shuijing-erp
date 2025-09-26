import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('🔍 测试客户购买历史API修复...');
    
    // 1. 查找一个测试客户
    const [customers] = await connection.execute(`
      SELECT id, name, phone, first_purchase_date, last_purchase_date, total_purchases, total_orders
      FROM customers 
      LIMIT 1
    `);
    
    if (customers.length === 0) {
      console.log('❌ 没有找到客户数据');
      return;
    }
    
    const customer = customers[0];
    console.log('\n📊 测试客户信息:');
    console.log(`  - ID: ${customer.id}`);
    console.log(`  - 姓名: ${customer.name}`);
    console.log(`  - 电话: ${customer.phone}`);
    console.log(`  - 首次购买: ${customer.first_purchase_date || '暂无'}`);
    console.log(`  - 最后购买: ${customer.last_purchase_date || '暂无'}`);
    console.log(`  - 总消费: ¥${customer.total_purchases || 0}`);
    console.log(`  - 总订单: ${customer.total_orders || 0}`);
    
    // 2. 查看该客户的购买记录
    const [purchases] = await connection.execute(`
      SELECT cp.*, ps.sku_code
      FROM customer_purchases cp
      LEFT JOIN product_skus ps ON cp.sku_id = ps.id
      WHERE cp.customer_id = ?
      ORDER BY cp.purchase_date DESC
      LIMIT 5
    `, [customer.id]);
    
    console.log(`\n📦 客户购买记录 (${purchases.length}条):`);
    if (purchases.length > 0) {
      purchases.forEach((purchase, index) => {
        console.log(`  ${index + 1}. ${purchase.sku_name} (${purchase.sku_code || 'N/A'})`);
        console.log(`     - 数量: ${purchase.quantity}`);
        console.log(`     - 单价: ¥${purchase.unit_price}`);
        console.log(`     - 总价: ¥${purchase.total_price}`);
        console.log(`     - 状态: ${purchase.status}`);
        console.log(`     - 购买时间: ${purchase.purchase_date}`);
        console.log('');
      });
    } else {
      console.log('  暂无购买记录');
    }
    
    // 3. 测试API调用
    console.log('\n🌐 测试API调用...');
    const apiUrl = `http://localhost:3001/api/v1/customers/${customer.id}/purchases?page=1&limit=10`;
    console.log(`API地址: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': 'Bearer test-token' // 这里需要实际的token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API调用成功!');
        console.log(`返回购买记录数量: ${data.data?.purchases?.length || 0}`);
        console.log(`分页信息: 第${data.data?.pagination?.page}页，共${data.data?.pagination?.total}条`);
      } else {
        console.log(`❌ API调用失败: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log('错误详情:', errorText);
      }
    } catch (error) {
      console.log('❌ API调用异常:', error.message);
    }
    
    await connection.end();
    console.log('\n✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
})();