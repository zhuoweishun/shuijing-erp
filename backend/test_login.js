import bcrypt from 'bcryptjs';

async function testPasswordHash() {
  console.log('=== 测试密码加密 ===');
  
  // 测试密码
  const testPassword = '123456';
  
  // 从数据库获取的哈希密码（boss用户）
  const bossHashFromDB = '$2b$10$j9RMzVGffSY0ydgjKWezrOJkOiIFeWYCeQTEOpVgqpnQiHq0/2J2S';
  
  // 验证密码
  const isValid = await bcrypt.compare(testPassword, bossHashFromDB);
  console.log(`密码 "${testPassword}" 验证结果:`, isValid);
  
  // 生成新的哈希进行对比
  const newHash = await bcrypt.hash(testPassword, 10);
  console.log('新生成的哈希:', newHash);
  
  const isNewHashValid = await bcrypt.compare(testPassword, newHash);
  console.log('新哈希验证结果:', isNewHashValid);
}

async function testLogin() {
  console.log('\n=== 测试登录API ===');
  
  const loginData = {
    user_name: 'boss',
    password: '123456'
  };
  
  try {
    const response = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });
    
    const result = await response.json();
    console.log('登录响应状态:', response.status);
    console.log('登录响应内容:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ 登录成功!');
      console.log('Token:', result.data?.token?.substring(0, 50) + '...');
    } else {
      console.log('❌ 登录失败!');
    }
  } catch (error) {
    console.error('登录请求失败:', error.message);
  }
}

async function main() {
  await testPasswordHash();
  await testLogin();
}

main().catch(console.error);