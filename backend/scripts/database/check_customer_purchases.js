import mysql from 'mysql2/promise';

async function checkCustomerPurchases() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('📋 检查customer_purchases表字段...');
    const [rows] = await connection.query('SHOW COLUMNS FROM customer_purchases');
    
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.Field} - ${row.Type} (${row.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

checkCustomerPurchases().catch(console.error);