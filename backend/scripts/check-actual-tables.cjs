const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

// 查看实际数据库表名
async function checkActualTables() {
  let connection;
  
  try {
    console.log('🔄 连接数据库查看实际表名...');
    
    // 建立数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 查看所有表
    console.log('\n📊 查看数据库中的所有表...');
    const [tables] = await connection.execute('SHOW TABLES');
    
    console.log('\n📋 数据库表列表:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
    // 查找客户购买相关的表
    const customerPurchaseTables = tables.filter(table => {
      const tableName = Object.values(table)[0].toLowerCase();
      return tableName.includes('customer') && tableName.includes('purchase');
    });
    
    console.log('\n🔍 客户购买相关的表:');
    if (customerPurchaseTables.length > 0) {
      customerPurchaseTables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`${index + 1}. ${tableName}`);
      });
      
      // 查看第一个客户购买表的结构
      const firstTable = Object.values(customerPurchaseTables[0])[0];
      console.log(`\n📝 表 ${firstTable} 的结构:`);
      const [columns] = await connection.execute(`DESCRIBE ${firstTable}`);
      columns.forEach(column => {
        console.log(`  - ${column.Field} (${column.Type}) ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? column.Key : ''}`);
      });
      
      // 查看表中的数据量
      const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${firstTable}`);
      console.log(`\n📊 表 ${firstTable} 中的记录数: ${countResult[0].count}`);
      
      if (countResult[0].count > 0) {
        console.log(`\n📋 表 ${firstTable} 的前5条记录:`);
        const [sampleData] = await connection.execute(`SELECT * FROM ${firstTable} LIMIT 5`);
        sampleData.forEach((record, index) => {
          console.log(`${index + 1}. ID: ${record.id}, 客户ID: ${record.customerId}, SKU ID: ${record.skuId}, 数量: ${record.quantity}, 状态: ${record.status}`);
        });
      }
    } else {
      console.log('❌ 没有找到客户购买相关的表');
    }
    
    // 查找SKU相关的表
    const skuTables = tables.filter(table => {
      const tableName = Object.values(table)[0].toLowerCase();
      return tableName.includes('sku') || tableName.includes('product');
    });
    
    console.log('\n🔍 SKU/产品相关的表:');
    skuTables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
  } catch (error) {
    console.error('❌ 查看表失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行脚本
if (require.main === module) {
  checkActualTables()
    .then(() => {
      console.log('\n🎉 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 脚本执行失败:', error);
      process.exit(1);
    });
}