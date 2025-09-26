import mysql from 'mysql2/promise';

async function fixMaterialDateField() {
  let connection;
  
  try {
    console.log('🔧 修复material_date字段问题...');
    
    // 连接数据库
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      charset: 'utf8mb4'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 1. 检查当前字段状态
    console.log('\n📊 1. 检查当前material_date字段状态...');
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM materials WHERE Field = 'material_date'"
    );
    
    if (columns.length > 0) {
      const field = columns[0];
      console.log(`当前状态: ${field.Type} ${field.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${field.Default ? `DEFAULT ${field.Default}` : '无默认值'}`);
    }
    
    // 2. 修改字段允许NULL
    console.log('\n🔧 2. 修改material_date字段允许NULL...');
    await connection.execute(
      "ALTER TABLE materials MODIFY COLUMN material_date DATE NULL"
    );
    console.log('✅ material_date字段已修改为允许NULL');
    
    // 3. 验证修改结果
    console.log('\n📊 3. 验证修改结果...');
    const [newColumns] = await connection.execute(
      "SHOW COLUMNS FROM materials WHERE Field = 'material_date'"
    );
    
    if (newColumns.length > 0) {
      const field = newColumns[0];
      console.log(`修改后状态: ${field.Type} ${field.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${field.Default ? `DEFAULT ${field.Default}` : '无默认值'}`);
      
      if (field.Null === 'YES') {
        console.log('✅ 字段修改成功，现在允许NULL值');
      } else {
        console.log('❌ 字段修改失败，仍然不允许NULL');
      }
    }
    
    // 4. 更新现有记录的material_date
    console.log('\n🔧 4. 更新现有记录的material_date...');
    const updateResult = await connection.execute(`
      UPDATE materials m
      JOIN purchases p ON m.purchase_id = p.id
      SET m.material_date = DATE(p.purchase_date)
      WHERE m.material_date IS NULL
    `);
    
    console.log(`✅ 更新了 ${updateResult[0].affectedRows} 条记录的material_date`);
    
    // 5. 测试触发器是否现在能正常工作
    console.log('\n🧪 5. 测试触发器是否现在能正常工作...');
    
    // 获取一个现有用户ID
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('❌ 没有找到用户，跳过触发器测试');
      return;
    }
    
    const userId = users[0].id;
    const testPurchaseCode = `TESTFIX${Date.now()}`;
    
    // 创建测试采购记录
    const [insertResult] = await connection.execute(`
      INSERT INTO purchases (
        id, purchase_code, purchase_name, purchase_type,
        quantity, piece_count, total_price, unit_price,
        quality, specification, status, photos, user_id,
        purchase_date, created_at, updated_at
      ) VALUES (
        UUID(), ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        NOW(), NOW(), NOW()
      )
    `, [
      testPurchaseCode,
      '触发器测试材料',
      'BRACELET',
      3,
      3,
      60.00,
      20.00,
      'A',
      '10.0',
      'ACTIVE',
      JSON.stringify([]),
      userId
    ]);
    
    console.log(`✅ 创建测试采购记录: ${testPurchaseCode}`);
    
    // 等待触发器执行
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检查是否创建了material记录
    const [materialCheck] = await connection.execute(
      'SELECT * FROM materials WHERE material_code = ?',
      [testPurchaseCode]
    );
    
    if (materialCheck.length > 0) {
      console.log('✅ 触发器现在工作正常！自动创建了material记录');
      const material = materialCheck[0];
      console.log(`- 材料名称: ${material.material_name}`);
      console.log(`- 原始数量: ${material.original_quantity}`);
      console.log(`- 剩余数量: ${material.remaining_quantity}`);
      console.log(`- 材料日期: ${material.material_date}`);
    } else {
      console.log('❌ 触发器仍然有问题，未能创建material记录');
    }
    
    // 清理测试数据
    console.log('\n🧹 6. 清理测试数据...');
    await connection.execute('DELETE FROM materials WHERE material_code = ?', [testPurchaseCode]);
    await connection.execute('DELETE FROM purchases WHERE purchase_code = ?', [testPurchaseCode]);
    console.log('✅ 测试数据已清理');
    
    console.log('\n🎉 material_date字段修复完成!');
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

fixMaterialDateField();