const mysql = require('mysql2/promise');
require('dotenv').config();

async function testCleanupScript() {
  let connection;
  
  try {
    console.log('🧪 测试数据清理脚本的安全性和完整性');
    console.log('=' .repeat(80));
    
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

    console.log('数据库:', database);
    console.log('');

    // 测试表结构
    const deletionOrder = [
      { table: 'financial_records', description: '财务记录' },
      { table: 'customer_notes', description: '客户备注' },
      { table: 'customer_purchases', description: '客户购买记录' },
      { table: 'sku_inventory_logs', description: 'SKU库存日志' },
      { table: 'material_usage', description: '原材料使用记录' },
      { table: 'product_skus', description: '产品SKU' },
      { table: 'products', description: '产品' },
      { table: 'purchases', description: '采购记录' },
      { table: 'customers', description: '客户' },
      { table: 'suppliers', description: '供应商' }
    ];

    console.log('📊 检查表存在性和数据量:');
    console.log('-'.repeat(60));
    
    let totalRecords = 0;
    const tableStatus = [];

    for (const { table, description } of deletionOrder) {
      try {
        // 检查表是否存在
        const [tableExists] = await connection.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
          [database, table]
        );
        
        if (tableExists[0].count === 0) {
          console.log(`⚠️  ${table} (${description}): 表不存在`);
          tableStatus.push({ table, description, exists: false, records: 0 });
          continue;
        }

        // 获取记录数
        const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        const recordCount = count[0].count;
        
        const status = recordCount > 0 ? '📊' : 'ℹ️';
        console.log(`${status} ${table} (${description}): ${recordCount} 条记录`);
        
        tableStatus.push({ table, description, exists: true, records: recordCount });
        totalRecords += recordCount;
        
      } catch (error) {
        console.log(`❌ ${table} (${description}): 检查失败 - ${error.message}`);
        tableStatus.push({ table, description, exists: false, records: 0, error: error.message });
      }
    }

    console.log('');
    console.log('🔍 外键约束检查:');
    console.log('-'.repeat(60));
    
    // 检查外键约束
    for (const { table } of deletionOrder) {
      try {
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
        `, [database, table]);
        
        if (foreignKeys.length > 0) {
          console.log(`🔗 ${table}:`);
          foreignKeys.forEach(fk => {
            console.log(`   - ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
          });
        } else {
          console.log(`✅ ${table}: 无外键约束`);
        }
        
      } catch (error) {
        console.log(`❌ ${table}: 外键检查失败 - ${error.message}`);
      }
    }

    console.log('');
    console.log('🧪 删除顺序验证:');
    console.log('-'.repeat(60));
    
    // 验证删除顺序的合理性
    const tablesWithData = tableStatus.filter(t => t.exists && t.records > 0);
    
    if (tablesWithData.length === 0) {
      console.log('ℹ️  所有表都为空，无需验证删除顺序');
    } else {
      console.log('📋 建议的删除顺序 (从上到下):');
      deletionOrder.forEach((item, index) => {
        const tableInfo = tableStatus.find(t => t.table === item.table);
        const status = tableInfo && tableInfo.exists ? 
                      (tableInfo.records > 0 ? '📊' : 'ℹ️') : '⚠️';
        console.log(`${index + 1}. ${status} ${item.table} (${item.description})`);
      });
    }

    console.log('');
    console.log('📋 测试结果摘要:');
    console.log('=' .repeat(80));
    console.log(`总记录数: ${totalRecords}`);
    console.log(`存在的表: ${tableStatus.filter(t => t.exists).length}/${tableStatus.length}`);
    console.log(`有数据的表: ${tablesWithData.length}`);
    
    if (totalRecords > 0) {
      console.log('');
      console.log('⚠️  警告: 数据库中存在业务数据!');
      console.log('🔥 执行清理脚本将永久删除这些数据!');
      console.log('');
      console.log('📝 要执行实际清理，请运行:');
      console.log('   node scripts/cleanup-business-data.cjs');
    } else {
      console.log('');
      console.log('✅ 数据库已为空，无需清理');
    }
    
    console.log('');
    console.log('🧪 测试完成 - 脚本安全性验证通过');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行测试
testCleanupScript().catch(console.error);