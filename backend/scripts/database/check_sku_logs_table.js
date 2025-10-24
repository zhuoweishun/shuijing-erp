import mysql from 'mysql2/promise';

async function checkSkuLogsTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 检查 sku_inventory_logs 表结构...');
    const [fields] = await connection.query('DESCRIBE sku_inventory_logs');
    
    console.log('✅ sku_inventory_logs 表字段:');
    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.Field} - 类型: ${field.Type}, 可空: ${field.Null}, 默认值: ${field.Default}`);
    });
    
  } catch (error) {
    console.error('❌ 检查表结构失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

checkSkuLogsTable().catch(console.error);