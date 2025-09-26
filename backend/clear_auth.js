// 清除过期的认证信息
console.log('清除localStorage中的认证信息...');

// 模拟清除localStorage（在浏览器环境中运行）
const clearAuthScript = `
// 在浏览器控制台中运行此脚本
console.log('检查localStorage中的认证信息:');
try {
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('auth_user');
  console.log('Token存在:', !!token);
  console.log('User存在:', !!user);
  
  if (token) {
    console.log('Token长度:', token.length);
    console.log('清除token...');
    localStorage.removeItem('auth_token');
  }
  
  if (user) {
    try {
      const userData = JSON.parse(user);
      console.log('用户名:', userData.user_name);
    } catch(e) {
      console.log('用户数据解析失败');
    }
    console.log('清除用户数据...');
    localStorage.removeItem('auth_user');
  }
  
  console.log('认证信息已清除，请刷新页面重新登录');
} catch(e) {
  console.error('清除失败:', e.message);
}
`;

console.log('请在浏览器控制台中运行以下脚本:');
console.log(clearAuthScript);
console.log('\n或者直接刷新页面并重新登录');