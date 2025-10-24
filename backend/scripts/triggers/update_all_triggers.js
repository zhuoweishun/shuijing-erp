import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function updateAllTriggers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔄 更新所有触发器...');
    
    // 删除所有旧的触发器
    console.log('删除旧的触发器...');
    await connection.query('DROP TRIGGER IF EXISTS tr_sku_create_financial');
    await connection.query('DROP TRIGGER IF EXISTS tr_sku_sale_financial');
    
    // 读取迁移文件
    const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', '20250127_create_sku_triggers', 'migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // 提取所有CREATE TRIGGER语句
    const triggerMatches = migrationSQL.match(/CREATE TRIGGER [\s\S]*?END;/gm);
    if (!triggerMatches || triggerMatches.length === 0) {
      throw new Error('未找到CREATE TRIGGER语句');
    }
    
    // 执行每个CREATE TRIGGER
    for (const triggerSQL of triggerMatches) {
      const triggerName = triggerSQL.match(/CREATE TRIGGER (\w+)/)[1];
      console.log(`创建触发器: ${triggerName}...`);
      await connection.query(triggerSQL);
    }
    
    console.log('✅ 所有触发器更新成功！');
    
  } catch (error) {
    console.error('❌ 更新触发器失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

updateAllTriggers().catch(console.error);