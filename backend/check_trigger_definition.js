import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    // 查看purchases表的INSERT触发器定义
    const [trigger] = await connection.execute(
      "SHOW CREATE TRIGGER tr_purchase_insert_material"
    );
    
    console.log('触发器定义:');
    console.log(trigger[0]['SQL Original Statement']);
    
    await connection.end();
  } catch (error) {
    console.error('错误:', error.message);
  }
})();