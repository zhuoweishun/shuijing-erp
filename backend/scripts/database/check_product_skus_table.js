import mysql from 'mysql2/promise';

async function checkProductSkusTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 检查 product_skus 表结构...');
    
    // 获取表的详细结构
    const [columns] = await connection.query(`
      SHOW FULL COLUMNS FROM product_skus
    `);
    
    console.log('\n📋 product_skus 表字段详情:');
    columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} | Null: ${col.Null} | Default: ${col.Default}`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkProductSkusTable().catch(console.error);