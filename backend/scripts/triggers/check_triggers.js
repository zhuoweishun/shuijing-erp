import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkTriggers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 检查数据库中的触发器...');
    
    const [triggers] = await connection.execute(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE 
      FROM INFORMATION_SCHEMA.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev'
      ORDER BY EVENT_OBJECT_TABLE, TRIGGER_NAME
    `);
    
    console.log('\n📋 数据库中的触发器:');
    triggers.forEach(trigger => {
      console.log(`  ${trigger.TRIGGER_NAME} - ${trigger.EVENT_MANIPULATION} on ${trigger.EVENT_OBJECT_TABLE}`);
    });
    
    // 检查特定触发器的定义
    const triggerNames = [
      'tr_customer_refund_financial',
      'tr_sku_destroy_financial'
    ];
    
    for (const triggerName of triggerNames) {
      try {
        const [triggerDef] = await connection.execute(`
          SHOW CREATE TRIGGER ${triggerName}
        `);
        console.log(`\n🔧 ${triggerName} 触发器定义:`);
        console.log(triggerDef[0]['SQL Original Statement']);
      } catch (error) {
        console.log(`❌ ${triggerName} 触发器不存在或无法访问`);
      }
    }
    
  } catch (error) {
    console.error('检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkTriggers().catch(console.error);