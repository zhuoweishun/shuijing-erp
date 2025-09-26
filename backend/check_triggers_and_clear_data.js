import mysql from 'mysql2/promise';

async function checkTriggersAndClearData() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('🔍 1. 检查当前purchase相关触发器...');
    const [triggers] = await connection.execute(
      "SHOW TRIGGERS WHERE `Table` = 'purchases'"
    );
    
    console.log('当前purchase相关触发器:');
    if (triggers.length === 0) {
      console.log('❌ 没有找到purchase相关触发器');
    } else {
      triggers.forEach(t => {
        console.log(`- ${t.Trigger}: ${t.Timing} ${t.Event} ON ${t.Table}`);
      });
    }
    
    console.log('\n🔍 2. 检查当前数据量...');
    const [purchaseCount] = await connection.execute('SELECT COUNT(*) as count FROM purchases');
    const [materialCount] = await connection.execute('SELECT COUNT(*) as count FROM materials');
    
    console.log(`当前采购记录数量: ${purchaseCount[0].count}`);
    console.log(`当前原材料记录数量: ${materialCount[0].count}`);
    
    if (purchaseCount[0].count > 0 || materialCount[0].count > 0) {
      console.log('\n🗑️ 3. 清除所有数据...');
      
      // 先清除material_usage记录（外键约束）
      await connection.execute('DELETE FROM material_usage');
      console.log('✅ 清除material_usage记录');
      
      // 清除materials记录
      await connection.execute('DELETE FROM materials');
      console.log('✅ 清除materials记录');
      
      // 清除purchases记录
      await connection.execute('DELETE FROM purchases');
      console.log('✅ 清除purchases记录');
      
      // 重置自增ID
      await connection.execute('ALTER TABLE purchases AUTO_INCREMENT = 1');
      await connection.execute('ALTER TABLE materials AUTO_INCREMENT = 1');
      await connection.execute('ALTER TABLE material_usage AUTO_INCREMENT = 1');
      console.log('✅ 重置自增ID');
      
      console.log('\n🔍 4. 验证清除结果...');
      const [newPurchaseCount] = await connection.execute('SELECT COUNT(*) as count FROM purchases');
      const [newMaterialCount] = await connection.execute('SELECT COUNT(*) as count FROM materials');
      const [newUsageCount] = await connection.execute('SELECT COUNT(*) as count FROM material_usage');
      
      console.log(`清除后采购记录数量: ${newPurchaseCount[0].count}`);
      console.log(`清除后原材料记录数量: ${newMaterialCount[0].count}`);
      console.log(`清除后使用记录数量: ${newUsageCount[0].count}`);
      
      if (newPurchaseCount[0].count === 0 && newMaterialCount[0].count === 0 && newUsageCount[0].count === 0) {
        console.log('\n✅ 数据清除成功！现在可以重新测试采购记录同步功能。');
      } else {
        console.log('\n❌ 数据清除不完整，请检查外键约束。');
      }
    } else {
      console.log('\n✅ 数据库已经是空的，无需清除。');
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTriggersAndClearData();