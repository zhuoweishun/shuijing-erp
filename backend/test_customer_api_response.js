import mysql from 'mysql2/promise';
import fetch from 'node-fetch';

(async () => {
  try {
    console.log('🔍 测试客户API响应格式...');
    
    // 1. 直接查询数据库中的客户数据
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('\n📊 数据库中的客户数据:');
    const [customers] = await connection.execute(`
      SELECT id, name, phone, first_purchase_date, last_purchase_date, 
             total_purchases, total_orders, created_at
      FROM customers 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    customers.forEach((customer, index) => {
      console.log(`  ${index + 1}. ${customer.name} (${customer.phone})`);
      console.log(`     - 首次购买: ${customer.first_purchase_date || '暂无'}`);
      console.log(`     - 最后购买: ${customer.last_purchase_date || '暂无'}`);
      console.log(`     - 总消费: ¥${customer.total_purchases || 0}`);
      console.log(`     - 总订单: ${customer.total_orders || 0}`);
      console.log(`     - 创建时间: ${customer.created_at}`);
    });
    
    await connection.end();
    
    // 2. 测试API响应
    console.log('\n🌐 测试客户列表API响应...');
    
    try {
      const response = await fetch('http://localhost:3001/api/v1/customers?page=1&limit=3', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API响应成功');
        console.log('响应状态:', response.status);
        console.log('响应数据结构:', {
          success: result.success,
          message: result.message,
          customers_count: result.data?.customers?.length || 0,
          pagination: result.data?.pagination
        });
        
        if (result.data?.customers?.length > 0) {
          console.log('\n📋 API返回的客户数据:');
          result.data.customers.forEach((customer, index) => {
            console.log(`  ${index + 1}. ${customer.name} (${customer.phone})`);
            console.log(`     - 首次购买: ${customer.first_purchase_date || '暂无'}`);
            console.log(`     - 最后购买: ${customer.last_purchase_date || '暂无'}`);
            console.log(`     - 总消费: ¥${customer.total_purchases || 0}`);
            console.log(`     - 总订单: ${customer.total_orders || 0}`);
            console.log(`     - 客户类型: ${customer.customer_type || '未知'}`);
          });
        }
      } else {
        console.log('❌ API响应失败');
        console.log('状态码:', response.status);
        console.log('状态文本:', response.statusText);
        const errorText = await response.text();
        console.log('错误信息:', errorText);
      }
    } catch (apiError) {
      console.log('❌ API请求失败:', apiError.message);
    }
    
    // 3. 测试客户分析API
    console.log('\n📈 测试客户分析API响应...');
    
    try {
      const analyticsResponse = await fetch('http://localhost:3001/api/v1/customers/analytics?time_period=all', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (analyticsResponse.ok) {
        const analyticsResult = await analyticsResponse.json();
        console.log('✅ 分析API响应成功');
        console.log('分析数据:', {
          total_customers: analyticsResult.data?.total_customers || 0,
          new_customers: analyticsResult.data?.new_customers || 0,
          active_customers: analyticsResult.data?.active_customers || 0,
          average_order_value: analyticsResult.data?.average_order_value || 0
        });
      } else {
        console.log('❌ 分析API响应失败');
        console.log('状态码:', analyticsResponse.status);
      }
    } catch (analyticsError) {
      console.log('❌ 分析API请求失败:', analyticsError.message);
    }
    
    console.log('\n✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
})();