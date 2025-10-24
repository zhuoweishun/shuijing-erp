import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkSkuInventoryLogsTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('📋 检查sku_inventory_logs表结构...');
    const [rows] = await connection.execute('DESCRIBE sku_inventory_logs');
    console.log('sku_inventory_logs表字段:');
    rows.forEach(row => {
      console.log(`- ${row.Field}: ${row.Type} ${row.Null === 'YES' ? '(可空)' : '(非空)'} ${row.Key ? `[${row.Key}]` : ''}`);
    });
  } catch (error) {
    console.error('检查sku_inventory_logs表失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkSkuInventoryLogsTable().catch(console.error);