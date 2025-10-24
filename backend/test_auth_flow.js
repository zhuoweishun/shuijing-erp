// 测试认证流程的脚本
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api/v1';

async function testAuthFlow() {
  console.log('🔐 开始测试认证流程...\n');
  
  try {
    // 1. 测试登录
    console.log('1️⃣ 测试用户登录...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_name: 'boss',
        password: '123456'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('登录响应状态:', loginResponse.status);
    console.log('登录响应数据:', JSON.stringify(loginData, null, 2));
    
    if (!loginResponse.ok || !loginData.success) {
      console.error('❌ 登录失败');
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ 登录成功，获取到token:', token.substring(0, 20) + '...\n');
    
    // 2. 测试token验证
    console.log('2️⃣ 测试token验证...');
    const verifyResponse = await fetch(`${API_BASE}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const verifyData = await verifyResponse.json();
    console.log('验证响应状态:', verifyResponse.status);
    console.log('验证响应数据:', JSON.stringify(verifyData, null, 2));
    
    if (!verifyResponse.ok || !verifyData.success) {
      console.error('❌ Token验证失败');
      return;
    }
    
    console.log('✅ Token验证成功\n');
    
    // 3. 测试需要认证的API
    console.log('3️⃣ 测试需要认证的API...');
    const dashboardResponse = await fetch(`${API_BASE}/dashboard/overview`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const dashboardData = await dashboardResponse.json();
    console.log('仪表板响应状态:', dashboardResponse.status);
    console.log('仪表板响应数据:', JSON.stringify(dashboardData, null, 2));
    
    if (dashboardResponse.ok && dashboardData.success) {
      console.log('✅ 认证API调用成功');
    } else {
      console.log('⚠️ 认证API调用失败，但这可能是正常的（如果没有数据）');
    }
    
    console.log('\n🎉 认证流程测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testAuthFlow();