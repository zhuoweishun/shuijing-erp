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

// 测试空数据响应
async function testEmptyDataResponse() {
  console.log('🧪 测试空数据响应处理...');
  console.log('=' .repeat(50));
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ 登录失败，终止测试');
    return;
  }
  
  // 2. 测试各种materialType的原材料分布API
  const material_types = ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED', 'ALL'];
  
  for (const material_type of material_types) {
    try {
      const params = material_type === 'ALL' ? {} : { material_type: material_type };
      const queryString = Object.keys(params).length > 0 
        ? '?' + new URLSearchParams(params).to_string() 
        : '';
      
      const url = `${BASE_URL}/inventory/material-distribution${queryString}`;
      
      console.log(`\n🔍 测试: ${material_type} 类型的原材料分布`);
      console.log(`📡 请求URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      console.log(`📊 响应状态: ${response.status}`);
      console.log(`📋 响应数据结构:`, {
        success: data.success,
        message: data.message,
        dataType: typeof data.data,
        hasItems: data.data && Array.is_array(data.data.items),
        itemsLength: data.data && data.data.items ? data.data.items.length : 'N/A',
        total: data.data && data.data.total !== undefined ? data.data.total : 'N/A'
      });
      
      if (response.ok && data.success) {
        if (data.data && data.data.items && data.data.items.length > 0) {
          console.log(`✅ ${material_type} - 有数据 (${data.data.items.length} 条记录)`);
          console.log(`📊 示例数据:`, data.data.items[0]);
        } else {
          console.log(`✅ ${material_type} - 无数据 (空结果)`);
          console.log(`📊 空数据结构:`, data.data);
        }
      } else {
        console.log(`❌ ${material_type} - 失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.log(`❌ ${material_type} - 请求异常: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 空数据响应测试完成！');
  console.log('\n💡 前端组件应该能够正确处理以下情况:');
  console.log('   1. 空的items数组');
  console.log('   2. undefined或null的data');
  console.log('   3. 缺少items属性的响应');
  console.log('   4. 网络错误或API错误');
}

// 运行测试
testEmptyDataResponse().catch(error => {
  console.error('❌ 测试过程中发生错误:', error);
});