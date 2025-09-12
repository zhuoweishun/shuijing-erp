const mysql = require('mysql2/promise');
const readline = require('readline');
require('dotenv').config();

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 询问用户确认
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function cleanupBusinessData(autoConfirm = false) {
  let connection;
  
  try {
    console.log('🚨 数据清理工具 - 危险操作警告!');
    console.log('=' .repeat(80));
    console.log('⚠️  此操作将永久删除以下数据:');
    console.log('   - 所有客户数据 (customers, customer_notes, customer_purchases)');
    console.log('   - 所有销售数据 (customer_purchases)');
    console.log('   - 所有退货数据 (相关记录)');
    console.log('   - 所有SKU数据 (product_skus)');
    console.log('   - 所有库存数据 (sku_inventory_logs)');
    console.log('   - 所有采购数据 (purchases, material_usage)');
    console.log('   - 所有产品数据 (products)');
    console.log('   - 所有供应商数据 (suppliers)');
    console.log('   - 所有财务记录 (financial_records)');
    console.log('');
    console.log('🔥 此操作不可逆转!');
    console.log('');
    
    if (!autoConfirm) {
      // 第一次确认
      const confirm1 = await askQuestion('请输入 "CONFIRM" 确认继续: ');
      if (confirm1 !== 'CONFIRM') {
        console.log('❌ 操作已取消');
        rl.close();
        return;
      }
      
      // 第二次确认
      const confirm2 = await askQuestion('请再次输入 "DELETE ALL DATA" 最终确认: ');
      if (confirm2 !== 'DELETE ALL DATA') {
        console.log('❌ 操作已取消');
        rl.close();
        return;
      }
      
      rl.close();
    } else {
      console.log('🤖 自动确认模式：跳过手动确认步骤');
    }
    
    console.log('');
    console.log('🔄 开始清理数据...');
    
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
    console.log('=' .repeat(80));

    // 禁用外键检查
    console.log('🔧 禁用外键检查...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // 按照依赖关系顺序删除数据
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

    const deletionResults = [];
    let totalDeletedRecords = 0;

    for (const { table, description } of deletionOrder) {
      try {
        console.log(`🗑️  清理表: ${table} (${description})`);
        
        // 检查表是否存在
        const [tableExists] = await connection.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
          [database, table]
        );
        
        if (tableExists[0].count === 0) {
          console.log(`⚠️  表 ${table} 不存在，跳过`);
          deletionResults.push({ table, description, status: 'not_exists', deletedRecords: 0 });
          continue;
        }

        // 获取删除前的记录数
        const [countBefore] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        const recordsBefore = countBefore[0].count;
        
        if (recordsBefore === 0) {
          console.log(`ℹ️  表 ${table} 已为空，跳过`);
          deletionResults.push({ table, description, status: 'empty', deletedRecords: 0 });
          continue;
        }

        // 删除所有数据
        const [result] = await connection.execute(`DELETE FROM ${table}`);
        const deletedRecords = result.affectedRows;
        
        console.log(`✅ 已删除 ${deletedRecords} 条记录`);
        
        deletionResults.push({ 
          table, 
          description, 
          status: 'deleted', 
          deletedRecords,
          recordsBefore 
        });
        totalDeletedRecords += deletedRecords;
        
      } catch (error) {
        console.log(`❌ 删除表 ${table} 数据时出错: ${error.message}`);
        deletionResults.push({ 
          table, 
          description, 
          status: 'error', 
          deletedRecords: 0,
          error: error.message 
        });
      }
    }

    console.log('');
    console.log('🔧 重置自增ID...');
    
    // 重置自增ID
    const autoIncrementTables = [
      'customers', 'customer_purchases', 'customer_notes',
      'product_skus', 'products', 'purchases', 
      'sku_inventory_logs', 'material_usage', 
      'suppliers'
    ];

    for (const table of autoIncrementTables) {
      try {
        // 检查表是否存在且有自增字段
        const [hasAutoIncrement] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM information_schema.columns 
          WHERE table_schema = ? AND table_name = ? AND extra = 'auto_increment'
        `, [database, table]);
        
        if (hasAutoIncrement[0].count > 0) {
          await connection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
          console.log(`✅ 已重置表 ${table} 的自增ID`);
        }
      } catch (error) {
        console.log(`⚠️  重置表 ${table} 自增ID时出错: ${error.message}`);
      }
    }

    // 重新启用外键检查
    console.log('🔧 重新启用外键检查...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('');
    console.log('📋 清理结果摘要:');
    console.log('=' .repeat(80));
    console.log(`总删除记录数: ${totalDeletedRecords}`);
    console.log(`清理时间: ${new Date().toISOString()}`);
    console.log('');
    
    deletionResults.forEach(result => {
      const status = result.status === 'deleted' ? '✅' : 
                    result.status === 'empty' ? 'ℹ️' : 
                    result.status === 'not_exists' ? '⚠️' : '❌';
      
      let message = `${status} ${result.table} (${result.description}): `;
      
      if (result.status === 'deleted') {
        message += `删除了 ${result.deletedRecords} 条记录`;
      } else if (result.status === 'empty') {
        message += '表为空';
      } else if (result.status === 'not_exists') {
        message += '表不存在';
      } else {
        message += `错误: ${result.error}`;
      }
      
      console.log(message);
    });
    
    console.log('');
    console.log('🎉 数据清理完成!');
    console.log('💡 提示: 所有业务数据已被清除，数据库现在处于干净状态');

  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error.message);
    console.error('详细错误:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行清理
if (require.main === module) {
  // 检查命令行参数
  const autoConfirm = process.argv.includes('--auto-confirm') || process.argv.includes('-y');
  cleanupBusinessData(autoConfirm).catch(console.error);
}

module.exports = { cleanupBusinessData };