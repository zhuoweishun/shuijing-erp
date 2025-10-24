import mysql from 'mysql2/promise';

async function checkAllTriggers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 检查数据库中的所有触发器...');
    
    // 查询所有触发器
    const [triggers] = await connection.execute('SHOW TRIGGERS');
    
    if (triggers.length === 0) {
      console.log('❌ 数据库中没有找到任何触发器！');
    } else {
      console.log(`✅ 找到 ${triggers.length} 个触发器:`);
      console.log('\n触发器列表:');
      console.log('=' .repeat(80));
      
      triggers.forEach((trigger, index) => {
        console.log(`${index + 1}. 触发器名称: ${trigger.Trigger}`);
        console.log(`   作用表: ${trigger.Table}`);
        console.log(`   触发时机: ${trigger.Timing} ${trigger.Event}`);
        console.log(`   定义者: ${trigger.Definer}`);
        console.log(`   创建时间: ${trigger.Created || 'N/A'}`);
        console.log('-'.repeat(60));
      });
      
      // 获取每个触发器的详细定义
      console.log('\n触发器详细定义:');
      console.log('=' .repeat(80));
      
      for (const trigger of triggers) {
        try {
          const [definition] = await connection.execute(
            `SHOW CREATE TRIGGER \`${trigger.Trigger}\``
          );
          
          if (definition.length > 0) {
            console.log(`\n触发器: ${trigger.Trigger}`);
            console.log('定义:');
            console.log(definition[0]['SQL Original Statement']);
            console.log('\n' + '='.repeat(80));
          }
        } catch (error) {
          console.log(`❌ 无法获取触发器 ${trigger.Trigger} 的定义: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 检查触发器时出错:', error.message);
  } finally {
    await connection.end();
  }
}

checkAllTriggers();