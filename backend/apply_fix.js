import mysql from 'mysql2/promise';
import fs from 'fs';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      multipleStatements: true
    });
    
    console.log('开始应用修复...');
    
    // 1. 先更新现有数据
    const [updateResult] = await connection.execute(`
      UPDATE materials 
      SET remaining_quantity = original_quantity - COALESCE(used_quantity, 0)
    `);
    
    console.log('✅ 更新了', updateResult.affectedRows, '条记录的remaining_quantity');
    
    // 2. 手动执行触发器创建命令
    try {
      await connection.execute('DROP TRIGGER IF EXISTS tr_materials_update_remaining_quantity');
      await connection.execute('DROP TRIGGER IF EXISTS tr_materials_update_remaining_quantity_update');
      console.log('✅ 删除了旧触发器');
    } catch (e) {
      console.log('旧触发器不存在，跳过删除');
    }
    
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
    console.log('\n✅ 数据修复完成！');
    console.log('\n⚠️  注意：需要手动创建触发器来维护remaining_quantity字段');
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
})();