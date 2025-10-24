import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkPurchasesTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('📋 检查purchases表结构:');
    const [purchasesColumns] = await connection.query('DESCRIBE purchases');
    purchasesColumns.forEach(column => {
      console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : ''} ${column.Key ? `(${column.Key})` : ''}`);
    });
  } catch (error) {
    console.error('❌ 检查purchases表失败:', error);
  } finally {
    await connection.end();
  }
}

async function checkUsersTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('\n👤 检查users表结构:');
    const [usersColumns] = await connection.query('DESCRIBE users');
    usersColumns.forEach(column => {
      console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : ''} ${column.Key ? `(${column.Key})` : ''}`);
    });
  } catch (error) {
    console.error('❌ 检查users表失败:', error);
  } finally {
    await connection.end();
  }
}

async function checkProductSkusTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('\n📦 检查product_skus表结构:');
    const [skusColumns] = await connection.query('DESCRIBE product_skus');
    skusColumns.forEach(column => {
      console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : ''} ${column.Key ? `(${column.Key})` : ''}`);
    });
  } catch (error) {
    console.error('❌ 检查product_skus表失败:', error);
  } finally {
    await connection.end();
  }
}

async function main() {
  await checkPurchasesTable();
  await checkUsersTable();
  await checkProductSkusTable();
}

main().catch(console.error);