// 生成测试用的访问令牌
import jwt from 'jsonwebtoken';

// JWT密钥（从.env文件中读取）
const jwt_secret = 'crystal_erp_jwt_secret_key_2024';

// 用户信息（使用实际的用户ID）
const userPayload = {
  userId: 'cmf8h3g8p0000tupgq4gcrfw0', // 系统管理员ID
  username: 'admin',
  role: 'ADMIN'
};

// 生成令牌（24小时有效期）
const token = jwt.sign(userPayload, jwt_secret, { expiresIn: '24h' });

console.log('🔑 生成的访问令牌:');
console.log(token);
console.log('');
console.log('📋 令牌信息:');
console.log(`   用户ID: ${userPayload.userId}`);
console.log(`   用户名: ${userPayload.username}`);
console.log(`   角色: ${userPayload.role}`);
console.log(`   有效期: 24小时`);
console.log('');
console.log('✅ 请复制上面的令牌到测试脚本中使用');