const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  try {
    console.log('👥 检查用户信息...');
    
    const [users] = await connection.execute(`
      SELECT id, username, name, email, role, isActive, createdAt
      FROM users
      ORDER BY createdAt
    `);
    
    console.log(`\n找到 ${users.length} 个用户:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. 用户名: ${user.username}`);
      console.log(`   姓名: ${user.name}`);
      console.log(`   邮箱: ${user.email}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   状态: ${user.isActive ? '激活' : '禁用'}`);
      console.log(`   创建时间: ${user.createdAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 检查用户时出错:', error);
  } finally {
    await connection.end();
  }
}

checkUsers();