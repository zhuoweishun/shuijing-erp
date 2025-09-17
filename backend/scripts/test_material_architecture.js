import mysql from 'mysql2/promise';

async function testMaterialArchitecture() {
  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('🔍 开始验证material表架构...');

    // 1. 检查materials表是否存在
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'materials'"
    );
    
    if (tables.length === 0) {
      console.error('❌ materials表不存在');
      return;
    }
    console.log('✅ materials表存在');

    // 2. 检查materials表结构
    const [columns] = await connection.query(
      "DESCRIBE materials"
    );
    
    const requiredFields = [
      'id', 'material_code', 'material_name', 'material_type', 'quality',
      'original_quantity', 'used_quantity', 'inventory_unit', 'unit_cost', 'total_cost',
      'purchase_id', 'supplier_id', 'created_by'
    ];
    
    const existingFields = columns.map(col => col.Field);
    const missingFields = requiredFields.filter(field => !existingFields.includes(field));
    
    if (missingFields.length > 0) {
      console.error('❌ materials表缺少字段:', missingFields);
    } else {
      console.log('✅ materials表字段完整');
    }

    // 3. 检查material_usage表的material_id字段
    const [usageColumns] = await connection.query(
      "DESCRIBE material_usage"
    );
    
    const hasMaterialId = usageColumns.some(col => col.Field === 'material_id');
    if (hasMaterialId) {
      console.log('✅ material_usage表包含material_id字段');
    } else {
      console.error('❌ material_usage表缺少material_id字段');
    }

    // 4. 检查外键约束
    const [foreignKeys] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE REFERENCED_TABLE_SCHEMA = 'crystal_erp_dev'
        AND (TABLE_NAME = 'materials' OR TABLE_NAME = 'material_usage')
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('🔗 外键约束:');
    foreignKeys.forEach(fk => {
      console.log(`  ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    });

    // 5. 检查触发器
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
      FROM information_schema.TRIGGERS
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev'
        AND TRIGGER_NAME LIKE '%material%'
    `);
    
    console.log('⚡ 触发器:');
    if (triggers.length === 0) {
      console.log('  ⚠️  没有找到material相关触发器');
    } else {
      triggers.forEach(trigger => {
        console.log(`  ${trigger.TRIGGER_NAME} (${trigger.EVENT_MANIPULATION} on ${trigger.EVENT_OBJECT_TABLE})`);
      });
    }

    // 6. 测试数据插入和触发器功能
    console.log('\n🧪 测试触发器功能...');
    
    // 检查是否有测试用户
    const [users] = await connection.query(
      "SELECT id FROM users LIMIT 1"
    );
    
    if (users.length === 0) {
      console.log('⚠️  没有用户数据，跳过触发器测试');
    } else {
      const userId = users[0].id;
      
      // 插入测试采购记录
      const testPurchaseCode = `TEST_${Date.now()}`;
      
      try {
        await connection.query(`
          INSERT INTO purchases (
            id, purchase_code, purchase_name, purchase_type, quality,
            piece_count, total_price, purchase_date, photos, user_id, status, created_at, updated_at
          ) VALUES (
            ?, ?, '测试原材料', 'ACCESSORIES', 'A',
            10, 100.00, NOW(), '[]', ?, 'ACTIVE', NOW(), NOW()
          )
        `, [testPurchaseCode.replace('TEST_', 'pur_'), testPurchaseCode, userId]);
        
        console.log('✅ 测试采购记录插入成功');
        
        // 检查是否自动创建了material记录
        const [materials] = await connection.query(
          "SELECT * FROM materials WHERE material_code = ?",
          [testPurchaseCode]
        );
        
        if (materials.length > 0) {
          console.log('✅ 触发器自动创建material记录成功');
          console.log(`   material_id: ${materials[0].id}`);
          console.log(`   original_quantity: ${materials[0].original_quantity}`);
          console.log(`   inventory_unit: ${materials[0].inventory_unit}`);
          
          // 清理测试数据
          await connection.query(
            "DELETE FROM materials WHERE material_code = ?",
            [testPurchaseCode]
          );
          await connection.query(
            "DELETE FROM purchases WHERE purchase_code = ?",
            [testPurchaseCode]
          );
          console.log('🧹 测试数据已清理');
          
        } else {
          console.error('❌ 触发器未能自动创建material记录');
        }
        
      } catch (error) {
        console.error('❌ 触发器测试失败:', error.message);
      }
    }

    await connection.end();
    console.log('\n🎉 material表架构验证完成!');

  } catch (error) {
    console.error('验证失败:', error.message);
    process.exit(1);
  }
}

testMaterialArchitecture();