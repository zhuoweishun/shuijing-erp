const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseTables() {
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
    console.log('🔍 检查数据库表结构...');
    
    // 显示所有表
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n📋 数据库中的所有表:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
    // 检查是否存在财务相关的表
    const financialTables = tables.filter(table => {
      const tableName = Object.values(table)[0].toLowerCase();
      return tableName.includes('financial') || tableName.includes('refund');
    });
    
    console.log('\n💰 财务相关的表:');
    if (financialTables.length === 0) {
      console.log('❌ 没有找到财务相关的表');
    } else {
      financialTables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`✅ ${tableName}`);
      });
    }
    
    // 检查客户购买记录表结构
    console.log('\n👥 检查客户购买记录表结构:');
    try {
      const [purchaseColumns] = await connection.execute('DESCRIBE customer_purchases');
      console.log('customer_purchases 表字段:');
      purchaseColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    } catch (error) {
      console.log('❌ customer_purchases 表不存在');
    }
    
    // 检查客户表结构
    console.log('\n👤 检查客户表结构:');
    try {
      const [customerColumns] = await connection.execute('DESCRIBE customers');
      console.log('customers 表字段:');
      customerColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    } catch (error) {
      console.log('❌ customers 表不存在');
    }
    
    // 检查SKU表结构
    console.log('\n🎯 检查SKU表结构:');
    try {
      const [skuColumns] = await connection.execute('DESCRIBE product_skus');
      console.log('product_skus 表字段:');
      skuColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    } catch (error) {
      console.log('❌ product_skus 表不存在');
    }
    
  } catch (error) {
    console.error('❌ 检查数据库表时出错:', error);
  } finally {
    await connection.end();
  }
}

checkDatabaseTables();