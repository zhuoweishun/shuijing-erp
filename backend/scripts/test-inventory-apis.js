import fetch from 'node-fetch';

// 测试配置
const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_USER = {
  username: 'boss',
  password: '123456'
};

let authToken = '';

// 登录获取token
async function login() {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    const data = await response.json();
    
    if (data.success && data.data.token) {
      authToken = data.data.token;
      console.log('✅ 登录成功，获取到token');
      return true;
    } else {
      console.error('❌ 登录失败:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.message);
    return false;
  }
}

// 测试API的通用函数
async function testAPI(endpoint, description, params = {}) {
  try {
    const queryString = Object.keys(params).length > 0 
      ? '?' + new URLSearchParams(params).to_string() 
      : '';
    
    const url = `${BASE_URL}${endpoint}${queryString}`;
    
    console.log(`\n🔍 测试: ${description}`);
    console.log(`📡 请求URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log(`📊 响应状态: ${response.status}`);
    
    if (response.ok && data.success) {
      console.log(`✅ ${description} - 成功`);
      if (data.data) {
        if (Array.is_array(data.data)) {
          console.log(`📋 返回数据: ${data.data.length} 条记录`);
        } else if (data.data.items && Array.is_array(data.data.items)) {
          console.log(`📋 返回数据: ${data.data.items.length} 条记录`);
        } else {
          console.log(`📋 返回数据类型: ${typeof data.data}`);
        }
      }
      return { success: true, data: data.data };
    } else {
      console.log(`❌ ${description} - 失败: ${data.message || '未知错误'}`);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.log(`❌ ${description} - 请求异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 主测试函数
async function runInventoryTests() {
  console.log('🧪 开始测试库存相关API...');
  console.log('=' .repeat(50));
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ 登录失败，终止测试');
    return;
  }
  
  // 2. 测试库存统计API
  await testAPI('/inventory/statistics', '库存统计数据');
  
  // 3. 测试原材料分布API
  await testAPI('/inventory/material-distribution', '原材料分布数据（全部类型）');
  await testAPI('/inventory/material-distribution', '原材料分布数据（散珠）', { material_type: 'LOOSE_BEADS' });
  await testAPI('/inventory/material-distribution', '原材料分布数据（手串）', { material_type: 'BRACELET' });
  await testAPI('/inventory/material-distribution', '原材料分布数据（饰品配件）', { material_type: 'ACCESSORIES' });
  await testAPI('/inventory/material-distribution', '原材料分布数据（成品）', { material_type: 'FINISHED' });
  
  // 4. 测试库存消耗分析API
  await testAPI('/inventory/consumption-analysis', '库存消耗分析数据');
  await testAPI('/inventory/consumption-analysis', '库存消耗分析数据（30天）', { timeRange: '30d' });
  
  // 5. 测试价格分布API
  await testAPI('/inventory/price-distribution', '价格分布数据');
  
  // 6. 测试层级库存API
  await testAPI('/inventory/hierarchical', '层级库存数据');
  await testAPI('/inventory/hierarchical', '层级库存数据（散珠+手串）', { material_types: 'LOOSE_BEADS,BRACELET' });
  
  // 7. 测试分组库存API
  await testAPI('/inventory/grouped', '分组库存数据');
  
  // 8. 测试库存列表API
  await testAPI('/inventory', '库存列表数据');
  await testAPI('/inventory', '库存列表数据（分页）', { page: 1, limit: 10 });
  
  // 9. 测试低库存预警API
  await testAPI('/inventory/alerts/low-stock', '低库存预警数据');
  
  // 10. 测试成品库存卡片API
  await testAPI('/inventory/finished-products-cards', '成品库存卡片数据');
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 库存API测试完成！');
}

// 运行测试
runInventoryTests().catch(error => {
  console.error('❌ 测试过程中发生错误:', error);
});