import mysql from 'mysql2/promise';

async function checkTriggerDefinition() {
  let connection;
  
  try {
    console.log('🔍 检查触发器定义...');
    
    // 连接数据库
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      charset: 'utf8mb4'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 1. 查看触发器定义
    console.log('\n📋 1. 查看INSERT触发器定义...');
    try {
      const [trigger] = await connection.execute(
        "SHOW CREATE TRIGGER tr_purchase_insert_material"
      );
      
      console.log('触发器定义:');
      console.log(trigger[0]['SQL Original Statement']);
    } catch (error) {
      console.log('❌ 无法获取触发器定义:', error.message);
    }
    
    // 2. 检查materials表结构
    console.log('\n📋 2. 检查materials表结构...');
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM materials"
    );
    
    console.log('materials表字段:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    // 3. 检查material_date字段
    const materialDateField = columns.find(col => col.Field === 'material_date');
    if (materialDateField) {
      console.log('\n🔍 material_date字段详情:');
      console.log(`- 类型: ${materialDateField.Type}`);
      console.log(`- 允许NULL: ${materialDateField.Null}`);
      console.log(`- 默认值: ${materialDateField.Default || '无'}`);
      
      if (materialDateField.Null === 'NO' && !materialDateField.Default) {
        console.log('⚠️ material_date字段不允许NULL且没有默认值，这可能导致触发器失败');
      }
    } else {
      console.log('❌ 未找到material_date字段');
    }
    
    // 4. 修复建议
    console.log('\n🔧 修复建议:');
    if (materialDateField && materialDateField.Null === 'NO' && !materialDateField.Default) {
      console.log('1. 修改material_date字段允许NULL或设置默认值');
      console.log('2. 更新触发器确保为material_date提供值');
      
      // 提供修复SQL
      console.log('\n📝 修复SQL:');
      console.log('-- 方案1: 允许material_date为NULL');
      console.log('ALTER TABLE materials MODIFY COLUMN material_date DATETIME NULL;');
      
      console.log('\n-- 方案2: 设置默认值为当前时间');
      console.log('ALTER TABLE materials MODIFY COLUMN material_date DATETIME DEFAULT CURRENT_TIMESTAMP;');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

checkTriggerDefinition();