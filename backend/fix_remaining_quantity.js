import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('开始修复remaining_quantity字段...');
    
    // 1. 更新所有现有记录的remaining_quantity
    const [updateResult] = await connection.execute(`
      UPDATE materials 
      SET remaining_quantity = original_quantity - COALESCE(used_quantity, 0)
    `);
    
    console.log('✅ 更新了', updateResult.affectedRows, '条记录的remaining_quantity');
    
    // 2. 创建触发器来自动维护remaining_quantity
    // 先删除可能存在的触发器
    try {
      await connection.execute('DROP TRIGGER IF EXISTS tr_materials_update_remaining_quantity');
    } catch (e) {}
    
    // 创建INSERT触发器
    await connection.execute(`
      CREATE TRIGGER tr_materials_update_remaining_quantity
      BEFORE INSERT ON materials
      FOR EACH ROW
      BEGIN
        SET NEW.remaining_quantity = NEW.original_quantity - COALESCE(NEW.used_quantity, 0);
      END
    `);
    
    console.log('✅ 创建了INSERT触发器');
    
    // 创建UPDATE触发器
    try {
      await connection.execute('DROP TRIGGER IF EXISTS tr_materials_update_remaining_quantity_update');
    } catch (e) {}
    
    await connection.execute(`
      CREATE TRIGGER tr_materials_update_remaining_quantity_update
      BEFORE UPDATE ON materials
      FOR EACH ROW
      BEGIN
        SET NEW.remaining_quantity = NEW.original_quantity - COALESCE(NEW.used_quantity, 0);
      END
    `);
    
    console.log('✅ 创建了UPDATE触发器');
    
    // 3. 验证修复结果
    const [materials] = await connection.execute(`
      SELECT material_name, material_type, original_quantity, used_quantity, remaining_quantity
      FROM materials 
      WHERE material_name LIKE '%油胆%'
      ORDER BY created_at DESC
    `);
    
    console.log('\n修复后的油胆记录:');
    materials.forEach((material, index) => {
      console.log(`记录 ${index + 1}:`);
      console.log(`  名称: ${material.material_name}`);
      console.log(`  原始数量: ${material.original_quantity}`);
      console.log(`  已使用数量: ${material.used_quantity}`);
      console.log(`  剩余数量: ${material.remaining_quantity}`);
    });
    
    // 4. 测试半成品库存查询
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
    
    console.log('\n半成品库存查询结果:');
    inventory.forEach(item => {
      console.log(`${item.material_name} (${item.material_type}): ${item.total_remaining}颗`);
    });
    
    await connection.end();
    console.log('\n✅ 修复完成！');
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
})();