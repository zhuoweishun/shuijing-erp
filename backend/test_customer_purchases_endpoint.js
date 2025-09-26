import fetch from 'node-fetch';

(async () => {
  try {
    console.log('🔍 测试客户购买历史API端点...');
    
    const baseUrl = 'http://localhost:3001/api/v1';
    const customerId = 'customer_1758878958124_asc3bw4vo';
    
    // 1. 测试健康检查
    console.log('\n🏥 测试健康检查端点...');
    try {
      const healthResponse = await fetch(`${baseUrl}/health`);
      console.log(`健康检查状态: ${healthResponse.status}`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ 后端服务正常运行');
      }
    } catch (error) {
      console.log('❌ 健康检查失败:', error.message);
    }
    
    // 2. 测试认证端点
    console.log('\n🔐 测试认证端点...');
    try {
      const authResponse = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_name: 'boss',
          password: '123456'
        })
      });
      
      console.log(`认证状态: ${authResponse.status}`);
      if (authResponse.ok) {
        const authData = await authResponse.json();
        if (authData.success) {
          console.log('✅ 认证成功');
          const token = authData.data.token;
          
          // 3. 测试客户购买历史API
          console.log('\n📦 测试客户购买历史API...');
          const purchasesUrl = `${baseUrl}/customers/${customerId}/purchases?page=1&limit=10`;
          
          const purchasesResponse = await fetch(purchasesUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`购买历史API状态: ${purchasesResponse.status}`);
          
          if (purchasesResponse.ok) {
            const purchasesData = await purchasesResponse.json();
            console.log('✅ 客户购买历史API调用成功!');
            console.log(`返回数据结构:`);
            console.log(`  - success: ${purchasesData.success}`);
            console.log(`  - message: ${purchasesData.message}`);
            
            if (purchasesData.data) {
              const { customer, purchases, pagination } = purchasesData.data;
              console.log(`  - 客户信息: ${customer ? '✅' : '❌'}`);
              console.log(`  - 购买记录: ${purchases ? purchases.length + '条' : '❌'}`);
              console.log(`  - 分页信息: ${pagination ? '✅' : '❌'}`);
              
              if (purchases && purchases.length > 0) {
                console.log('\n🛒 购买记录详情:');
                purchases.forEach((purchase, index) => {
                  console.log(`  ${index + 1}. ${purchase.sku_name}`);
                  console.log(`     - SKU编码: ${purchase.product_skus?.sku_code || 'N/A'}`);
                  console.log(`     - 数量: ${purchase.quantity}`);
                  console.log(`     - 总价: ¥${purchase.total_price}`);
                  console.log(`     - 状态: ${purchase.status}`);
                });
              }
              
              if (customer) {
                console.log('\n👤 客户统计信息:');
                console.log(`  - 首次购买: ${customer.first_purchase_date || '暂无'}`);
                console.log(`  - 最后购买: ${customer.last_purchase_date || '暂无'}`);
                console.log(`  - 总消费: ¥${customer.total_purchases || 0}`);
                console.log(`  - 总订单: ${customer.total_orders || 0}`);
              }
            }
          } else {
            const errorText = await purchasesResponse.text();
            console.log('❌ 客户购买历史API调用失败');
            console.log('错误详情:', errorText);
          }
        } else {
          console.log('❌ 认证失败:', authData.message);
        }
      } else {
        const errorText = await authResponse.text();
        console.log('❌ 认证请求失败:', errorText);
      }
    } catch (error) {
      console.log('❌ 认证测试失败:', error.message);
    }
    
    console.log('\n✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
})();