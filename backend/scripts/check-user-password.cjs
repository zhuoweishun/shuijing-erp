const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// 检查用户密码
async function checkUserPassword() {
  let connection;
  
  try {
    console.log('🔍 检查用户密码...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      timezone: '+08:00'
    });
    
    // 获取用户信息
    const [users] = await connection.execute(`
      SELECT id, username, password, role, createdAt FROM users
    `);
    
    console.log(`找到 ${users.length} 个用户:`);
    
    for (const user of users) {
      console.log(`\n用户: ${user.username}`);
      console.log(`  角色: ${user.role}`);
      console.log(`  创建时间: ${user.createdAt}`);
      console.log(`  密码哈希: ${user.password.substring(0, 20)}...`);
      
      // 测试常见密码
      const testPasswords = ['admin123', 'password', '123456', 'admin', user.username];
      
      for (const testPassword of testPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPassword, user.password);
          if (isMatch) {
            console.log(`  ✅ 密码匹配: ${testPassword}`);
            break;
          }
        } catch (error) {
          // 忽略bcrypt错误，继续尝试下一个密码
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUserPassword().catch(console.error);