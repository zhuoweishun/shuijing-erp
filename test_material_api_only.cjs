const axios = require('axios');

// API配置
const API_BASE_URL = 'http://localhost:3001/api/v1';
const TEST_USER = {
  user_name: 'admin',
  password: 'admin123'
};

async function testMaterialDistributionAPI() {
  try {
    console.log('🔍 开始测试原材料分布API...');
    
    // 1. 登录获取token
    console.log('\n🔐 登录获取访问令牌...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功');
    
    // 2. 测试原材料分布API
    console.log('\n🧪 测试原材料分布API...');
    const apiResponse = await axios.get(`${API_BASE_URL}/inventory/material-distribution`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 API响应数据:');
    console.log(JSON.stringify(apiResponse.data, null, 2));
    
    // 3. 检查响应结构
    const apiData = apiResponse.data.data;
    console.log('\n🔍 验证API响应结构:');
    console.log(`- 总项目数: ${apiData.total_items}`);
    console.log(`- 总剩余数量: ${apiData.total_remaining_quantity}`);
    console.log(`- 项目列表长度: ${apiData.items.length}`);
    
    // 4. 显示前几个项目
    console.log('\n📋 前5个原材料项目:');
    apiData.items.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}: ${item.value} (${item.percentage}%)`);
    });
    
    // 5. 检查是否有散珠相关的项目
    const beadItems = apiData.items.filter(item => 
      item.name.includes('散珠') || item.name.includes('珠子')
    );
    
    if (beadItems.length > 0) {
      console.log('\n🔮 散珠相关项目:');
      beadItems.forEach(item => {
        console.log(`  - ${item.name}: ${item.value} (${item.percentage}%)`);
      });
    } else {
      console.log('\n⚠️  未找到散珠相关项目');
    }
    
    console.log('\n✅ 原材料分布API测试完成！');
    console.log('📝 API现在应该从materials表读取数据，而不是purchases表');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('API错误响应:', error.response.data);
    }
  }
}

// 运行测试
testMaterialDistributionAPI();