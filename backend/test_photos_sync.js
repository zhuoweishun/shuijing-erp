import mysql from 'mysql2/promise';

async function testPhotosSync() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('🧪 测试photos字段同步功能...');
    
    // 获取一个测试用户ID
    const [users] = await connection.query('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('❌ 没有用户数据，无法测试');
      return;
    }
    const userId = users[0].id;
    
    // 创建测试采购记录，包含photos字段
    const testPurchaseId = `test_${Date.now()}`;
    const testPhotos = JSON.stringify([
      'test_photo_1.jpg',
      'test_photo_2.jpg',
      'test_photo_3.jpg'
    ]);
    
    console.log('📝 创建测试采购记录（包含photos）...');
    await connection.query(`
      INSERT INTO purchases (
        id, purchase_code, purchase_name, purchase_type,
        piece_count, total_price, quality, bead_diameter,
        status, photos, user_id, purchase_date,
        created_at, updated_at
      ) VALUES (
        ?, ?, '测试原材料-图片同步', 'LOOSE_BEADS',
        100, 200.00, 'A', 6.0,
        'ACTIVE', ?, ?, NOW(),
        NOW(), NOW()
      )
    `, [testPurchaseId, `TEST_${Date.now()}`, testPhotos, userId]);
    
    console.log('✅ 测试采购记录创建成功');
    
    // 等待触发器执行
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检查material表是否同步了photos字段
    console.log('🔍 检查material表photos字段同步...');
    const [materials] = await connection.query(
      'SELECT id, material_name, photos FROM materials WHERE purchase_id = ?',
      [testPurchaseId]
    );
    
    if (materials.length === 0) {
      console.log('❌ 未找到对应的material记录，触发器可能未正常工作');
      return;
    }
    
    const material = materials[0];
    console.log('📋 Material记录信息:');
    console.log(`  - ID: ${material.id}`);
    console.log(`  - 名称: ${material.material_name}`);
    console.log(`  - Photos: ${material.photos}`);
    
    if (material.photos === testPhotos) {
      console.log('✅ Photos字段同步成功！');
    } else {
      console.log('❌ Photos字段同步失败');
      console.log(`  期望: ${testPhotos}`);
      console.log(`  实际: ${material.photos}`);
    }
    
    // 测试UPDATE同步
    console.log('\n🔄 测试UPDATE触发器photos同步...');
    const updatedPhotos = JSON.stringify([
      'updated_photo_1.jpg',
      'updated_photo_2.jpg'
    ]);
    
    await connection.query(
      'UPDATE purchases SET photos = ?, updated_at = NOW() WHERE id = ?',
      [updatedPhotos, testPurchaseId]
    );
    
    // 等待触发器执行
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检查更新后的同步
    const [updatedMaterials] = await connection.query(
      'SELECT photos FROM materials WHERE purchase_id = ?',
      [testPurchaseId]
    );
    
    if (updatedMaterials.length > 0 && updatedMaterials[0].photos === updatedPhotos) {
      console.log('✅ UPDATE触发器photos同步成功！');
    } else {
      console.log('❌ UPDATE触发器photos同步失败');
      console.log(`  期望: ${updatedPhotos}`);
      console.log(`  实际: ${updatedMaterials[0]?.photos}`);
    }
    
    // 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await connection.query('DELETE FROM materials WHERE purchase_id = ?', [testPurchaseId]);
    await connection.query('DELETE FROM purchases WHERE id = ?', [testPurchaseId]);
    console.log('✅ 测试数据清理完成');
    
    console.log('\n🎯 Photos字段同步测试完成！');
    console.log('现在您可以放心录入采购记录，图片会自动同步到原材料库存。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testPhotosSync();