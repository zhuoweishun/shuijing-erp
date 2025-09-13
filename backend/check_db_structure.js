import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('=== 数据库表结构分析 ===\n');
    
    const [tables] = await connection.execute('SHOW TABLES');
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`📋 表名: ${tableName}`);
      console.log('=' .repeat(50));
      
      const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
      
      console.log('字段信息:');
      columns.forEach(col => {
        const fieldInfo = [
          `字段名: ${col.Field}`,
          `类型: ${col.Type}`,
          `允许NULL: ${col.Null}`,
          col.Key ? `键: ${col.Key}` : '',
          col.Default !== null ? `默认值: ${col.Default}` : '',
          col.Extra ? `额外: ${col.Extra}` : ''
        ].filter(Boolean).join(' | ');
        
        console.log(`  - ${fieldInfo}`);
      });
      
      console.log('\n');
    }
    
    await connection.end();
    console.log('✅ 数据库结构查询完成');
    
  } catch (error) {
    console.error('❌ 数据库连接错误:', error.message);
  }
})();