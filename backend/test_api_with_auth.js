import fetch from 'node-fetch';

(async () => {
  try {
    console.log('🔍 测试修复后的客户购买历史API...');
    
    const baseUrl = 'http://localhost:3001/api/v1';
    
    // 1. 先登录获取token
    console.log('\n🔐 正在登录获取认证token...');
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_name: 'admin',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ 登录失败:', loginResponse.status, loginResponse.statusText);
      return;
    }
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.log('❌ 登录失败:', loginData.message);
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ 登录成功，获取到token');
    
    // 2. 测试客户购买历史API
    console.log('\n📦 测试客户购买历史API...');
    const customerId = 'customer_1758878958124_asc3bw4vo'; // 使用之前测试的客户ID
    const apiUrl = `${baseUrl}/customers/${customerId}/purchases?page=1&limit=10`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`API地址: ${apiUrl}`);
    console.log(`响应状态: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API调用成功!');
      console.log('\n📊 响应数据:');
      console.log(`  - 成功状态: ${data.success}`);
      console.log(`  - 消息: ${data.message}`);
      
      if (data.data) {
        const { customer, purchases, pagination } = data.data;
        
        console.log('\n👤 客户信息:');
        console.log(`  - 姓名: ${customer.name}`);
        console.log(`  - 电话: ${customer.phone}`);
        console.log(`  - 首次购买: ${customer.first_purchase_date || '暂无'}`);
        console.log(`  - 最后购买: ${customer.last_purchase_date || '暂无'}`);
        console.log(`  - 总消费: ¥${customer.total_purchases || 0}`);
        console.log(`  - 总订单: ${customer.total_orders || 0}`);
        
        console.log(`\n🛒 购买记录 (${purchases.length}条):`);
        if (purchases.length > 0) {
          purchases.forEach((purchase, index) => {
            console.log(`  ${index + 1}. ${purchase.sku_name}`);
            console.log(`     - SKU编码: ${purchase.product_skus?.sku_code || 'N/A'}`);
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
        
        console.log('\n📄 分页信息:');
        console.log(`  - 当前页: ${pagination.page}`);
        console.log(`  - 每页条数: ${pagination.limit}`);
        console.log(`  - 总条数: ${pagination.total}`);
        console.log(`  - 总页数: ${pagination.total_pages}`);
      }
    } else {
      console.log('❌ API调用失败');
      const errorText = await response.text();
      console.log('错误详情:', errorText);
    }
    
    console.log('\n✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
})();