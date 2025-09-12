const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTableStructure() {
  // 从DATABASE_URL解析数据库配置
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  try {
    console.log('🔍 检查表结构...');
    
    // 检查purchases表结构
    console.log('\n📦 purchases表结构:');
    const [purchasesColumns] = await connection.execute('DESCRIBE purchases');
    purchasesColumns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // 检查product_skus表结构
    console.log('\n🎯 product_skus表结构:');
    const [skusColumns] = await connection.execute('DESCRIBE product_skus');
    skusColumns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // 检查customers表结构
    console.log('\n👥 customers表结构:');
    const [customersColumns] = await connection.execute('DESCRIBE customers');
    customersColumns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // 检查customer_purchases表结构
    console.log('\n🛒 customer_purchases表结构:');
    const [customerPurchasesColumns] = await connection.execute('DESCRIBE customer_purchases');
    customerPurchasesColumns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n✅ 表结构检查完成');
    
  } catch (error) {
    console.error('❌ 检查表结构时出错:', error);
  } finally {
    await connection.end();
  }
}

checkTableStructure();