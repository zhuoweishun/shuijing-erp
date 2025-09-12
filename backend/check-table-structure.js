import mysql from 'mysql2/promise';

async function checkTableStructure() {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('=== purchases表结构 ===');
    const [purchasesStructure] = await connection.execute('DESCRIBE purchases');
    purchasesStructure.for_each(t => {
      console.log(`${t.Field} - ${t.Type}`);
    });

    console.log('\n=== financial_records表结构 ===');
    const [recordsStructure] = await connection.execute('DESCRIBE financial_records');
    recordsStructure.for_each(t => {
      console.log(`${t.Field} - ${t.Type}`);
    });

    await connection.end();
  } catch (error) {
    console.error('检查表结构时出错:', error);
  }
}

checkTableStructure();