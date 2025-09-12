// 使用动态导入node-fetch
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3001/api';

async function getAuthToken() {
  try {
    console.log('🔐 获取认证token...');
    
    // 动态导入fetch
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'boss',
        password: '123456'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 登录成功');
      console.log('完整响应:', JSON.stringify(result, null, 2));
      console.log('Token:', result.data?.token);
      console.log('用户信息:', result.data?.user);
      return result.data?.token;
    } else {
      const error = await response.text();
      console.log('❌ 登录失败:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ 获取token时出错:', error);
    return null;
  }
}

getAuthToken();