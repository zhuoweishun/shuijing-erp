const mysql = require('mysql2/promise');

async function checkDatabaseSchema() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('检查数据库表结构和字段命名规范...');
    
    // 检查purchases表结构
    const [purchasesColumns] = await connection.execute('DESCRIBE purchases');
    console.log('\n=== purchases表字段 ===');
    purchasesColumns.forEach(col => {
      const fieldName = col.Field;
      const isSnakeCase = /^[a-z][a-z0-9_]*$/.test(fieldName);
      const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(fieldName);
      console.log(`${fieldName} (${col.Type}) - ${isSnakeCase ? '蛇形' : isCamelCase ? '驼峰' : '其他'}`);
    });
    
    // 检查其他主要表的字段命名
    const tables = ['suppliers', 'users', 'skus'];
    
    for (const table of tables) {
      try {
        const [columns] = await connection.execute(`DESCRIBE ${table}`);
        console.log(`\n=== ${table}表字段 ===`);
        columns.forEach(col => {
          const fieldName = col.Field;
          const isSnakeCase = /^[a-z][a-z0-9_]*$/.test(fieldName);
          const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(fieldName);
          console.log(`${fieldName} (${col.Type}) - ${isSnakeCase ? '蛇形' : isCamelCase ? '驼峰' : '其他'}`);
        });
      } catch (error) {
        console.log(`${table}表不存在或无法访问`);
      }
    }
    
    // 检查具体的purchaseCode字段数据
    console.log('\n=== purchaseCode字段数据示例 ===');
    const [purchaseData] = await connection.execute(
      'SELECT id, purchaseCode, productName FROM purchases LIMIT 3'
    );
    
    purchaseData.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   purchaseCode: ${row.purchaseCode}`);
      console.log(`   productName: ${row.productName}`);
      console.log('---');
    });
    
    await connection.end();
  } catch (error) {
    console.error('检查失败:', error.message);
  }
}

checkDatabaseSchema();