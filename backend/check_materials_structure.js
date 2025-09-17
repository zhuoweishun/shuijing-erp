import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    // 查看materials表结构
    const [columns] = await connection.execute('DESCRIBE materials');
    console.log('materials表字段结构:');
    columns.forEach(col => {
      console.log(`${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default}`);
    });
    
    // 检查remaining_quantity字段的定义
    const remainingField = columns.find(col => col.Field === 'remaining_quantity');
    if (remainingField) {
      console.log('\nremaining_quantity字段详情:');
      console.log('类型:', remainingField.Type);
      console.log('允许NULL:', remainingField.Null);
      console.log('默认值:', remainingField.Default);
      console.log('额外信息:', remainingField.Extra);
    }
    
    // 检查是否有计算字段或触发器更新remaining_quantity
    const [triggers] = await connection.execute(
      "SHOW TRIGGERS WHERE `Table` = 'materials'"
    );
    
    console.log('\nmaterials表相关触发器:');
    triggers.forEach(trigger => {
      console.log(`${trigger.Trigger}: ${trigger.Event} ${trigger.Timing}`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('错误:', error.message);
  }
})();