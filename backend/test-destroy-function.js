import mysql from 'mysql2/promise';

async function testDestroyFunction() {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('连接数据库成功');

    // 先查询真实的SKU ID和用户ID
    const [skus] = await connection.execute('SELECT id FROM product_skus LIMIT 1');
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    
    if (skus.length === 0 || users.length === 0) {
      console.log('❌ 数据库中没有找到SKU或用户数据，无法进行测试');
      await connection.end();
      return;
    }
    
    const realSkuId = skus[0].id;
    const realUserId = users[0].id;
    console.log(`找到真实数据 - SKU ID: ${realSkuId}, 用户ID: ${realUserId}`);

    // 测试插入一条DESTROY记录
    const testData = { sku_id: realSkuId,
      action: 'DESTROY',
      quantityChange: -1,
      quantityBefore: 1,
      quantityAfter: 0,
      referenceType: 'DESTROY',
      referenceId: null,
      notes: '测试销毁操作',
      userId: realUserId
    };

    console.log('\n测试插入DESTROY记录...');
    console.log('测试数据:', testData);

    const insertSql = `
      INSERT INTO sku_inventory_logs 
      (id, sku_id, action, quantityChange, quantityBefore, quantityAfter, referenceType, referenceId, notes, userId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const testId = 'test_' + Date.now();
    await connection.execute(insertSql, [
      testId,
      testData.sku_id,
      testData.action,
      testData.quantityChange,
      testData.quantityBefore,
      testData.quantityAfter,
      testData.referenceType,
      testData.referenceId,
      testData.notes,
      testData.userId
    ]);

    console.log('✅ DESTROY记录插入成功！');

    // 查询刚插入的记录
    const [result] = await connection.execute(
      'SELECT * FROM sku_inventory_logs WHERE id = ?',
      [testId]
    );
    console.log('\n=== 插入的记录 ===');
    console.table(result);

    // 清理测试数据
    await connection.execute('DELETE FROM sku_inventory_logs WHERE id = ?', [testId]);
    console.log('\n🧹 测试数据已清理');

    await connection.end();
    console.log('\n🎉 销毁功能测试通过！数据库schema修复成功。');
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testDestroyFunction();