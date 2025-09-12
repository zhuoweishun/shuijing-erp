import mysql from 'mysql2/promise';
import path from 'path';
import { file_u_r_l_to_path } from 'url';
import dotenv from 'dotenv';

const _Filename = fileURLToPath(import.meta.url);
const _Dirname = path.dirname(_Filename);
dotenv.config({ path: path.join(_Dirname, '.env') });

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  port: 3306
};

async function clearTestData() {
  let connection;
  
  try {
    console.log('连接数据库...');
    connection = await mysql.create_connection(dbConfig);
    
    console.log('开始清理测试数据...');
    
    // 1. 清除财务记录
    try {
      console.log('清除财务记录...');
      await connection.execute('DELETE FROM FinancialRecord WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)');
    } catch (error) {
      console.log('⚠️ FinancialRecord表不存在，跳过清理');
    }
    
    // 2. 清除客户信息（保留管理员创建的基础客户）
    try {
      console.log('清除测试客户信息...');
      await connection.execute('DELETE FROM customers WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)');
    } catch (error) {
      console.log('⚠️ customers表不存在，跳过清理');
    }
    
    // 3. 清除采购记录（保留一些基础数据）
    try {
      console.log('清除测试采购记录...');
      await connection.execute('DELETE FROM purchases WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)');
    } catch (error) {
      console.log('⚠️ purchases表不存在，跳过清理');
    }
    
    console.log('注意：purchase_records, skus, inventory 表不存在，跳过清理');
    
    console.log('✅ 测试数据清理完成！');
    
    // 显示清理后的数据统计
    console.log('\n📊 清理后数据统计:');
    
    try {
      const [purchases] = await connection.execute('SELECT COUNT(*) as count FROM purchases');
      console.log(`采购记录: ${purchases[0].count}`);
    } catch (error) {
      console.log('采购记录: 表不存在');
    }
    
    try {
      const [customers] = await connection.execute('SELECT COUNT(*) as count FROM customers');
      console.log(`客户记录: ${customers[0].count}`);
    } catch (error) {
      console.log('客户记录: 表不存在');
    }
    
    try {
      const [financialRecords] = await connection.execute('SELECT COUNT(*) as count FROM FinancialRecord');
      console.log(`财务记录: ${financialRecords[0].count}`);
    } catch (error) {
      console.log('财务记录: 表不存在');
    }
    
    console.log('注意：其他表不存在，无法统计');
    
  } catch (error) {
    console.error('❌ 清理数据时出错:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  clearTestData()
    .then(() => {
      console.log('\n🎉 数据清理脚本执行完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

export { clearTestData };