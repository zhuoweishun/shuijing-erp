const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  let connection;
  
  try {
    // 从DATABASE_URL解析数据库连接信息
    const databaseUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
    const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!urlMatch) {
      throw new Error('无法解析DATABASE_URL');
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: parseInt(port)
    });

    console.log('🔍 检查数据库表结构...');
    console.log('数据库:', database);
    console.log('=' .repeat(60));

    // 查看所有表
    const [tables] = await connection.execute('SHOW TABLES');
    
    console.log('📋 数据库中的所有表:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
    console.log('');
    
    // 查找客户相关的表
    const customerTables = tables.filter(table => {
      const tableName = Object.values(table)[0].toLowerCase();
      return tableName.includes('customer') || tableName.includes('client');
    });
    
    if (customerTables.length > 0) {
      console.log('👥 客户相关的表:');
      customerTables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`- ${tableName}`);
      });
    } else {
      console.log('❌ 未找到客户相关的表');
    }
    
    console.log('');
    
    // 查找SKU相关的表
    const skuTables = tables.filter(table => {
      const tableName = Object.values(table)[0].toLowerCase();
      return tableName.includes('sku') || tableName.includes('product');
    });
    
    if (skuTables.length > 0) {
      console.log('📦 SKU/产品相关的表:');
      skuTables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`- ${tableName}`);
      });
    } else {
      console.log('❌ 未找到SKU/产品相关的表');
    }
    
    console.log('');
    
    // 查找购买相关的表
    const purchaseTables = tables.filter(table => {
      const tableName = Object.values(table)[0].toLowerCase();
      return tableName.includes('purchase') || tableName.includes('order') || tableName.includes('sale');
    });
    
    if (purchaseTables.length > 0) {
      console.log('🛒 购买/订单相关的表:');
      purchaseTables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`- ${tableName}`);
      });
    } else {
      console.log('❌ 未找到购买/订单相关的表');
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行检查
checkTables().catch(console.error);