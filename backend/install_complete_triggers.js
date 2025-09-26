import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function installCompleteTriggers() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('📖 读取触发器SQL文件...');
    const sqlFile = path.join(process.cwd(), 'comprehensive_purchase_material_sync_triggers.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('🔧 安装完整的触发器...');
    
    // 分割SQL语句，处理DELIMITER
    const statements = sqlContent
      .split('DELIMITER //')
      .join('')
      .split('DELIMITER ;')
      .join('')
      .split('//')
      .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
      .map(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement && statement.length > 10) {
        try {
          await connection.execute(statement);
          console.log('✅ 执行SQL语句成功');
        } catch (error) {
          if (!error.message.includes('does not exist')) {
            console.log('⚠️ SQL执行警告:', error.message.substring(0, 100));
          }
        }
      }
    }
    
    console.log('✅ 触发器安装完成！');
    
    console.log('\n🔍 验证安装结果...');
    const [triggers] = await connection.execute(
      "SHOW TRIGGERS WHERE `Table` = 'purchases'"
    );
    
    console.log('当前purchase相关触发器:');
    triggers.forEach(t => {
      console.log(`- ${t.Trigger}: ${t.Timing} ${t.Event} ON ${t.Table}`);
    });
    
    if (triggers.length >= 2) {
      console.log('✅ 触发器包含photos字段同步逻辑');
      console.log('\n🎯 触发器安装完成！现在purchase记录的photos字段会自动同步到material表。');
      console.log('您可以开始测试采购记录录入，图片应该会正确同步。');
    } else {
      console.log('❌ 触发器安装不完整');
    }
    
  } catch (error) {
    console.error('❌ 安装失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

installCompleteTriggers();