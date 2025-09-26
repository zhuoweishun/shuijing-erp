import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('🔍 检查用户凭据...');
    
    const [users] = await connection.execute(`
      SELECT user_name, password, name FROM users LIMIT 5
    `);
    
    console.log('\n👤 用户列表:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. 用户名: ${user.user_name}`);
      console.log(`   姓名: ${user.name}`);
      console.log(`   密码: ${user.password}`);
      console.log('');
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
})();