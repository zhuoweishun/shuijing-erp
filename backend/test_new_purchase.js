import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('测试创建新的采购记录...');
    
    // 创建一个测试采购记录
    const testPurchaseId = `test_${Date.now()}`;
    const testCode = `TEST_${Date.now()}`;
    
    await connection.execute(`
      INSERT INTO purchases (
        id, purchase_code, purchase_name, purchase_type, 
        piece_count, total_price, status, quality,
        purchase_date, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'test_user', NOW(), NOW())
    `, [
      testPurchaseId,
      testCode,
      '测试油胆',
      'LOOSE_BEADS',
      3,
      6000,
      'ACTIVE',
      'A'
    ]);
    
    console.log('✅ 创建了测试采购记录:', testPurchaseId);
    
    // 等待一下，然后检查是否创建了对应的material记录
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const [materials] = await connection.execute(
      'SELECT * FROM materials WHERE purchase_id = ?',
      [testPurchaseId]
    );
    
    console.log('\n检查material记录:');
    console.log('找到的记录数量:', materials.length);
    
    if (materials.length > 0) {
      const material = materials[0];
      console.log('✅ 触发器正常工作！');
      console.log('Material ID:', material.id);
      console.log('原始数量:', material.original_quantity);
      console.log('已使用数量:', material.used_quantity);
      console.log('剩余数量:', material.remaining_quantity);
    } else {
      console.log('❌ 触发器未执行，需要手动创建material记录');
      
      // 手动创建material记录
      const materialId = `mat_test_${Date.now()}`;
      await connection.execute(`
        INSERT INTO materials (
          id, material_code, material_name, material_type, quality,
          original_quantity, used_quantity, remaining_quantity,
          inventory_unit, unit_cost, total_cost,
          purchase_id, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        materialId, testCode, '测试油胆', 'LOOSE_BEADS', 'A',
        3, 0, 3, 'PIECES', 2000, 6000, testPurchaseId, 'test_user'
      ]);
      
      console.log('✅ 手动创建了material记录');
    }
    
    // 清理测试数据
    await connection.execute('DELETE FROM materials WHERE purchase_id = ?', [testPurchaseId]);
    await connection.execute('DELETE FROM purchases WHERE id = ?', [testPurchaseId]);
    console.log('✅ 清理了测试数据');
    
    // 最终验证油胆库存
    const [inventory] = await connection.execute(`
      SELECT 
        material_name,
        material_type,
        SUM(remaining_quantity) as total_remaining
      FROM materials 
      WHERE material_type IN ('LOOSE_BEADS', 'BRACELET')
        AND material_name LIKE '%油胆%'
      GROUP BY material_name, material_type
    `);
    
    console.log('\n最终油胆库存:');
    inventory.forEach(item => {
      console.log(`${item.material_name} (${item.material_type}): ${item.total_remaining}颗`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
})();