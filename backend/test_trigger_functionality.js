import mysql from 'mysql2/promise';

async function testTriggerFunctionality() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      multipleStatements: true
    });
    
    console.log('🧪 测试触发器功能...');
    
    // 1. 验证触发器存在
    console.log('1. 验证触发器存在...');
    const [triggers] = await connection.query('SHOW TRIGGERS LIKE \'tr_%\'');
    console.log('当前触发器:');
    triggers.forEach(t => {
      console.log(`- ${t.Trigger}: ${t.Timing} ${t.Event} ON ${t.Table}`);
    });
    
    if (triggers.length === 0) {
      console.log('❌ 没有找到触发器！');
      return;
    }
    
    // 2. 创建测试用户（如果不存在）
    console.log('\n2. 准备测试数据...');
    const [users] = await connection.query('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('❌ 没有用户数据，无法测试');
      return;
    }
    const testUserId = users[0].id;
    console.log('使用测试用户ID:', testUserId);
    
    // 3. 创建测试采购记录
    console.log('\n3. 创建测试采购记录...');
    const testPurchaseCode = `TEST_${Date.now()}`;
    
    const insertResult = await connection.query(`
      INSERT INTO purchases (
        id, purchase_code, purchase_name, purchase_type, 
        piece_count, total_price, status, user_id, 
        purchase_date, created_at, updated_at
      ) VALUES (
        CONCAT('test_', SUBSTRING(UUID(), 1, 8), '_', UNIX_TIMESTAMP()),
        ?, '测试散珠', 'LOOSE_BEADS', 
        5, 50.0, 'ACTIVE', ?, 
        NOW(), NOW(), NOW()
      )
    `, [testPurchaseCode, testUserId]);
    
    console.log('✅ 测试采购记录创建成功');
    console.log('Purchase Code:', testPurchaseCode);
    
    // 4. 等待触发器执行
    console.log('\n4. 等待触发器执行...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 5. 检查是否自动创建了material记录
    console.log('\n5. 检查material记录是否自动创建...');
    const [materials] = await connection.query(
      'SELECT * FROM materials WHERE material_code = ?',
      [testPurchaseCode]
    );
    
    if (materials.length === 0) {
      console.log('❌ 触发器未工作：没有自动创建material记录');
      
      // 检查purchase记录是否真的创建了
      const [purchases] = await connection.query(
        'SELECT * FROM purchases WHERE purchase_code = ?',
        [testPurchaseCode]
      );
      
      if (purchases.length > 0) {
        console.log('✅ Purchase记录存在，但material记录未创建');
        console.log('Purchase状态:', purchases[0].status);
        console.log('可能原因: 触发器条件不满足或触发器执行失败');
      } else {
        console.log('❌ Purchase记录也不存在');
      }
    } else {
      const material = materials[0];
      console.log('✅ 触发器工作正常：自动创建了material记录');
      console.log('Material详情:');
      console.log('- ID:', material.id);
      console.log('- Material Code:', material.material_code);
      console.log('- Original Quantity:', material.original_quantity);
      console.log('- Used Quantity:', material.used_quantity);
      console.log('- Remaining Quantity:', material.remaining_quantity);
      console.log('- Unit Cost:', material.unit_cost);
      
      // 验证数量计算是否正确
      if (material.remaining_quantity === material.original_quantity && material.used_quantity === 0) {
        console.log('✅ 数量计算正确');
      } else {
        console.log('❌ 数量计算错误');
        console.log(`应该: remaining=${material.original_quantity}, used=0`);
        console.log(`实际: remaining=${material.remaining_quantity}, used=${material.used_quantity}`);
      }
    }
    
    // 6. 清理测试数据
    console.log('\n6. 清理测试数据...');
    await connection.query('DELETE FROM materials WHERE material_code = ?', [testPurchaseCode]);
    await connection.query('DELETE FROM purchases WHERE purchase_code = ?', [testPurchaseCode]);
    console.log('✅ 测试数据清理完成');
    
    // 7. 再次验证CG20250917120816的状态
    console.log('\n7. 验证CG20250917120816的当前状态...');
    const [currentMaterial] = await connection.query(
      'SELECT original_quantity, used_quantity, remaining_quantity FROM materials WHERE material_code = ?',
      ['CG20250917120816']
    );
    
    if (currentMaterial.length > 0) {
      const material = currentMaterial[0];
      console.log('CG20250917120816当前状态:');
      console.log(`- Original: ${material.original_quantity}`);
      console.log(`- Used: ${material.used_quantity}`);
      console.log(`- Remaining: ${material.remaining_quantity}`);
      
      if (material.remaining_quantity === material.original_quantity) {
        console.log('✅ CG20250917120816数据正常');
      } else {
        console.log('❌ CG20250917120816数据仍有问题');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testTriggerFunctionality();