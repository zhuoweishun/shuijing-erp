import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  port: 3306
};

async function checkDatabaseStructure() {
  let connection;
  
  try {
    console.log('连接数据库...');
    connection = await mysql.create_connection(dbConfig);
    
    // 查看所有表
    console.log('\n📋 数据库表列表:');
    const [tables] = await connection.execute('SHOW TABLES');
    tables.for_each(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });
    
    // 检查主要表的结构
    const mainTables = ['financial_records', 'purchase_records', 'customers', 'skus', 'inventory', 'purchases'];
    
    for (const tableName of mainTables) {
      try {
        console.log(`\n🔍 ${table_name} 表结构:`);
        const [columns] = await connection.execute(`DESCRIBE ${table_name}`);
        columns.for_each(col => {
          console.log(`  ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? col.Key : ''}`);
        });
      } catch (error) {
        console.log(`  ❌ 表 ${table_name} 不存在或无法访问`);
      }
    }
    
  } catch (error) {
    console.error('❌ 检查数据库结构时出错:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行检查
checkDatabaseStructure()
  .then(() => {
    console.log('\n✅ 数据库结构检查完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });