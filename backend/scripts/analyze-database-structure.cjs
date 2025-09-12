const mysql = require('mysql2/promise');
require('dotenv').config();

async function analyzeDatabaseStructure() {
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

    console.log('🔍 分析数据库结构和外键约束...');
    console.log('数据库:', database);
    console.log('=' .repeat(80));

    // 获取所有业务相关的表
    const businessTables = [
      'customers',
      'customer_purchases', 
      'customer_notes',
      'product_skus',
      'products',
      'purchases',
      'sku_inventory_logs',
      'material_usage',
      'financial_records',
      'suppliers'
    ];

    console.log('📋 业务相关表结构分析:');
    console.log('');

    for (const tableName of businessTables) {
      try {
        // 检查表是否存在
        const [tableExists] = await connection.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
          [database, tableName]
        );
        
        if (tableExists[0].count === 0) {
          console.log(`⚠️  表 ${tableName} 不存在`);
          continue;
        }

        console.log(`📊 表: ${tableName}`);
        console.log('-'.repeat(50));
        
        // 获取表结构
        const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
        console.log('字段结构:');
        columns.forEach(col => {
          console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''} ${col.Extra || ''}`);
        });
        
        // 获取外键约束
        const [foreignKeys] = await connection.execute(`
          SELECT 
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME,
            CONSTRAINT_NAME
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = ? 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [database, tableName]);
        
        if (foreignKeys.length > 0) {
          console.log('外键约束:');
          foreignKeys.forEach(fk => {
            console.log(`  - ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME} (${fk.CONSTRAINT_NAME})`);
          });
        } else {
          console.log('外键约束: 无');
        }
        
        // 获取数据量
        const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`数据量: ${count[0].count} 条记录`);
        
        console.log('');
        
      } catch (error) {
        console.log(`❌ 分析表 ${tableName} 时出错: ${error.message}`);
        console.log('');
      }
    }

    // 分析删除顺序
    console.log('🗑️  建议的数据删除顺序 (基于外键依赖):');
    console.log('=' .repeat(80));
    console.log('1. financial_records (财务记录 - 可能引用其他表)');
    console.log('2. customer_notes (客户备注 - 引用customers)');
    console.log('3. customer_purchases (客户购买记录 - 引用customers和product_skus)');
    console.log('4. sku_inventory_logs (SKU库存日志 - 引用product_skus)');
    console.log('5. material_usage (原材料使用记录 - 引用products)');
    console.log('6. product_skus (产品SKU - 引用products)');
    console.log('7. products (产品 - 可能引用suppliers)');
    console.log('8. purchases (采购记录 - 引用suppliers)');
    console.log('9. customers (客户)');
    console.log('10. suppliers (供应商)');
    console.log('');
    console.log('⚠️  注意: 实际删除顺序需要根据具体的外键约束来确定!');

  } catch (error) {
    console.error('❌ 分析过程中发生错误:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行分析
analyzeDatabaseStructure().catch(console.error);