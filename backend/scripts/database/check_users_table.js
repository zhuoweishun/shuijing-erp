import mysql from 'mysql2/promise';

async function checkUsersTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 检查 users 表结构...');
    
    // 获取表的详细结构
    const [columns] = await connection.query(`
      SHOW FULL COLUMNS FROM users
    `);
    
    console.log('\n📋 users 表字段详情:');
    columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} | Null: ${col.Null} | Default: ${col.Default}`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkUsersTable().catch(console.error);