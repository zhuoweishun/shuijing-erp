import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

async function testNewPurchaseSync() {
  let connection;
  
  try {
    console.log('🧪 测试新采购记录的自动同步功能...');
    
    // 连接数据库
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      charset: 'utf8mb4'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 1. 记录测试前的状态
    console.log('\n📊 1. 记录测试前的状态...');
    const [beforePurchases] = await connection.execute('SELECT COUNT(*) as count FROM purchases');
    const [beforeMaterials] = await connection.execute('SELECT COUNT(*) as count FROM materials');
    
    console.log(`测试前 - 采购记录: ${beforePurchases[0].count}, 原材料记录: ${beforeMaterials[0].count}`);
    
    // 2. 获取一个现有的用户ID
    console.log('\n🔍 2. 获取现有用户ID...');
    const [existingUsers] = await connection.execute('SELECT id FROM users LIMIT 1');
    
    if (existingUsers.length === 0) {
      console.log('❌ 没有找到现有用户，跳过测试');
      return;
    }
    
    const existingUserId = existingUsers[0].id;
    console.log(`✅ 使用用户ID: ${existingUserId}`);
    
    // 3. 创建测试采购记录
    console.log('\n🔧 3. 创建测试采购记录...');
    const testPurchaseId = uuidv4();
    const testPurchaseCode = `TEST${Date.now()}`;
    
    const insertPurchaseSQL = `
      INSERT INTO purchases (
        id, purchase_code, purchase_name, purchase_type, 
        quantity, piece_count, total_price, unit_price,
        quality, specification, status, photos, user_id,
        purchase_date, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        NOW(), NOW(), NOW()
      )
    `;
    
    await connection.execute(insertPurchaseSQL, [
      testPurchaseId,
      testPurchaseCode,
      '测试原材料',
      'BRACELET',
      5,
      5,
      100.00,
      20.00,
      'A',
      '12.0',
      'ACTIVE',
      JSON.stringify([]),
      existingUserId
    ]);
    
    console.log(`✅ 创建测试采购记录: ${testPurchaseCode}`);
    
    // 4. 等待触发器执行
    console.log('\n⏳ 4. 等待触发器执行...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 5. 检查是否自动创建了material记录
    console.log('\n🔍 5. 检查触发器是否工作...');
    const [materialCheck] = await connection.execute(
      'SELECT * FROM materials WHERE purchase_id = ?',
      [testPurchaseId]
    );
    
    if (materialCheck.length > 0) {
      console.log('✅ 触发器工作正常！自动创建了material记录:');
      const material = materialCheck[0];
      console.log(`- 材料编码: ${material.material_code}`);
      console.log(`- 材料名称: ${material.material_name}`);
      console.log(`- 原始数量: ${material.original_quantity}`);
      console.log(`- 剩余数量: ${material.remaining_quantity}`);
      console.log(`- 单位成本: ${material.unit_cost}`);
    } else {
      console.log('❌ 触发器未工作！没有自动创建material记录');
    }
    
    // 6. 记录测试后的状态
    console.log('\n📊 6. 记录测试后的状态...');
    const [afterPurchases] = await connection.execute('SELECT COUNT(*) as count FROM purchases');
    const [afterMaterials] = await connection.execute('SELECT COUNT(*) as count FROM materials');
    
    console.log(`测试后 - 采购记录: ${afterPurchases[0].count}, 原材料记录: ${afterMaterials[0].count}`);
    
    // 7. 清理测试数据
    console.log('\n🧹 7. 清理测试数据...');
    await connection.execute('DELETE FROM materials WHERE purchase_id = ?', [testPurchaseId]);
    await connection.execute('DELETE FROM purchases WHERE id = ?', [testPurchaseId]);
    console.log('✅ 测试数据已清理');
    
    // 8. 验证最终状态
    console.log('\n📊 8. 验证最终状态...');
    const [finalPurchases] = await connection.execute('SELECT COUNT(*) as count FROM purchases');
    const [finalMaterials] = await connection.execute('SELECT COUNT(*) as count FROM materials');
    
    console.log(`最终状态 - 采购记录: ${finalPurchases[0].count}, 原材料记录: ${finalMaterials[0].count}`);
    
    if (finalPurchases[0].count === beforePurchases[0].count && 
        finalMaterials[0].count === beforeMaterials[0].count) {
      console.log('✅ 数据状态恢复正常');
    } else {
      console.log('⚠️ 数据状态异常，请检查');
    }
    
    console.log('\n🎉 触发器测试完成!');
    
    if (materialCheck.length > 0) {
      console.log('\n✅ 结论: 触发器工作正常，新的采购记录会自动同步到原材料库存');
    } else {
      console.log('\n❌ 结论: 触发器未正常工作，需要检查触发器配置');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

testNewPurchaseSync();