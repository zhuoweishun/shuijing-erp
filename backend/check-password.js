import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

(async () => {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('🔍 检查用户密码...');
    const [users] = await connection.execute(`
      SELECT username, password 
      FROM users 
      WHERE username = 'boss'
    `);
    
    if (users.length > 0) {
      const user = users[0];
      console.log(`用户: ${user.username}`);
      console.log(`密码哈希: ${user.password}`);
      
      // 测试常见密码
      const testPasswords = ['boss123', 'admin123', '123456', 'password', 'boss'];
      
      for (const testPassword of testPasswords) {
        const isMatch = await bcrypt.compare(test_password, user.password);
        console.log(`测试密码 '${test_password}': ${isMatch ? '✅ 匹配' : '❌ 不匹配'}`);
        if (isMatch) {
          console.log(`\n🎉 找到正确密码: ${test_password}`);
          break;
        }
      }
    } else {
      console.log('未找到boss用户');
    }

    await connection.end();
  } catch (error) {
    console.error('错误:', error);
  }
})();