import mysql from 'mysql2/promise';

async function checkTriggersDetailed() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      multipleStatements: true
    });
    
    console.log('🔍 详细检查触发器状态...');
    
    // 1. 查看所有触发器
    console.log('1. 查看所有触发器...');
    try {
      const [allTriggers] = await connection.query('SHOW TRIGGERS');
      console.log('数据库中的所有触发器:');
      if (allTriggers.length === 0) {
        console.log('❌ 数据库中没有任何触发器');
      } else {
        allTriggers.forEach(t => {
          console.log(`- ${t.Trigger}: ${t.Timing} ${t.Event} ON ${t.Table}`);
        });
      }
    } catch (error) {
      console.error('查询触发器失败:', error.message);
    }
    
    // 2. 查看information_schema中的触发器信息
    console.log('\n2. 从information_schema查看触发器...');
    try {
      const [schemaTriggers] = await connection.query(`
        SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING
        FROM information_schema.TRIGGERS 
        WHERE TRIGGER_SCHEMA = 'crystal_erp_dev'
      `);
      
      if (schemaTriggers.length === 0) {
        console.log('❌ information_schema中也没有触发器');
      } else {
        console.log('information_schema中的触发器:');
        schemaTriggers.forEach(t => {
          console.log(`- ${t.TRIGGER_NAME}: ${t.ACTION_TIMING} ${t.EVENT_MANIPULATION} ON ${t.EVENT_OBJECT_TABLE}`);
        });
      }
    } catch (error) {
      console.error('查询information_schema失败:', error.message);
    }
    
    // 3. 尝试手动创建一个简单的触发器来测试
    console.log('\n3. 尝试创建简单测试触发器...');
    try {
      // 先删除可能存在的测试触发器
      await connection.query('DROP TRIGGER IF EXISTS test_trigger');
      
      // 创建一个简单的测试触发器
      await connection.query(`
        CREATE TRIGGER test_trigger
        BEFORE UPDATE ON purchases
        FOR EACH ROW
        BEGIN
          SET NEW.updated_at = NOW();
        END
      `);
      
      console.log('✅ 测试触发器创建成功');
      
      // 验证测试触发器
      const [testTriggers] = await connection.query('SHOW TRIGGERS LIKE \'test_trigger\'');
      if (testTriggers.length > 0) {
        console.log('✅ 测试触发器验证成功');
      } else {
        console.log('❌ 测试触发器验证失败');
      }
      
      // 删除测试触发器
      await connection.query('DROP TRIGGER IF EXISTS test_trigger');
      console.log('✅ 测试触发器已清理');
      
    } catch (error) {
      console.error('创建测试触发器失败:', error.message);
    }
    
    // 4. 检查MySQL版本和权限
    console.log('\n4. 检查MySQL版本和权限...');
    try {
      const [version] = await connection.query('SELECT VERSION() as version');
      console.log('MySQL版本:', version[0].version);
      
      const [privileges] = await connection.query('SHOW GRANTS FOR CURRENT_USER()');
      console.log('当前用户权限:');
      privileges.forEach(p => {
        console.log(`- ${Object.values(p)[0]}`);
      });
    } catch (error) {
      console.error('检查版本和权限失败:', error.message);
    }
    
    // 5. 检查CG20250917120816的当前状态
    console.log('\n5. 检查CG20250917120816的当前状态...');
    const [material] = await connection.query(
      'SELECT original_quantity, used_quantity, remaining_quantity FROM materials WHERE material_code = ?',
      ['CG20250917120816']
    );
    
    if (material.length > 0) {
      const m = material[0];
      console.log('CG20250917120816当前状态:');
      console.log(`- Original: ${m.original_quantity}`);
      console.log(`- Used: ${m.used_quantity}`);
      console.log(`- Remaining: ${m.remaining_quantity}`);
      
      if (m.remaining_quantity === m.original_quantity) {
        console.log('✅ 数据已修复正常');
      } else {
        console.log('❌ 数据仍有问题');
      }
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTriggersDetailed();