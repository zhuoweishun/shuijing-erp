import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  port: 3306
};

async function getUserInfo() {
  let connection;
  
  try {
    console.log('连接数据库...');
    connection = await mysql.create_connection(dbConfig);
    
    // 查看用户表
    console.log('\n👤 查看用户信息:');
    const [users] = await connection.execute('SELECT id, email, name FROM users LIMIT 5');
    
    if (users.length > 0) {
      console.log('现有用户:');
      users.for_each(user => {
        console.log(`- ID: ${user.id}, Email: ${user.email}, Name: ${user.name || 'N/A'}`);
      });
      return users[0].id; // 返回第一个用户的ID
    } else {
      console.log('没有找到用户，创建测试用户...');
      
      // 创建测试用户
      const testUserId = `test_user_${Date.now()}`;
      await connection.execute(`
        INSERT INTO users (id, email, name, createdAt, updatedAt)
        VALUES (?, ?, ?, NOW(), NOW())
      `, [testUserId, 'test@example.com', '测试用户']);
      
      console.log(`创建测试用户: ${testUserId}`);
      return testUserId;
    }
    
  } catch (error) {
    console.error('❌ 获取用户信息时出错:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行获取用户信息
getUserInfo()
  .then((user_id) => {
    console.log(`\n✅ 可用的用户ID: ${user_id}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

export { getUserInfo };