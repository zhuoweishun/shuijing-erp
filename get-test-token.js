// 获取测试用的JWT token
// Node.js 18+ 内置fetch API

// 配置
const API_BASE = 'http://localhost:3001/api/v1';

async function getTestToken() {
  console.log('🔑 获取测试token...');
  
  try {
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'boss',
        password: '123456'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('登录响应:', JSON.stringify(loginData, null, 2));
    
    if (loginData.success && loginData.data.token) {
      console.log('✅ 登录成功！');
      console.log('Token:', loginData.data.token);
      return loginData.data.token;
    } else {
      console.log('❌ 登录失败:', loginData.message);
      return null;
    }
    
  } catch (error) {
    console.error('❌ 获取token时发生错误:', error.message);
    return null;
  }
}

// 执行函数
getTestToken().then(token => {
  if (token) {
    console.log('\n📋 复制以下token用于测试:');
    console.log(token);
  }
});