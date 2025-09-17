import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    // 检查最新的5颗油胆记录
    const purchaseId = 'cmfnmiw6z000513utzdf2hjon';
    
    console.log('检查采购记录ID:', purchaseId);
    
    // 查看对应的material记录
    const [materials] = await connection.execute(
      'SELECT * FROM materials WHERE purchase_id = ?',
      [purchaseId]
    );
    
    console.log('\nmaterial记录数量:', materials.length);
    
    if (materials.length > 0) {
      materials.forEach((material, index) => {
        console.log(`\nmaterial记录 ${index + 1}:`);
        console.log('ID:', material.id);
        console.log('名称:', material.material_name);
        console.log('类型:', material.material_type);
        console.log('原始数量:', material.original_quantity);
        console.log('已使用数量:', material.used_quantity);
        console.log('剩余数量:', material.remaining_quantity);
        console.log('创建时间:', material.created_at);
      });
    } else {
      console.log('❌ 未找到对应的material记录！');
    }
    
    // 同时检查半成品库存API会返回什么
    console.log('\n检查半成品库存查询结果:');
    const [inventory] = await connection.execute(`
      SELECT 
        material_name,
        material_type,
        SUM(original_quantity - COALESCE(used_quantity, 0)) as remaining_quantity
      FROM materials 
      WHERE material_type IN ('LOOSE_BEADS', 'BRACELET')
        AND material_name LIKE '%油胆%'
      GROUP BY material_name, material_type
    `);
    
    console.log('半成品库存查询结果:');
    inventory.forEach(item => {
      console.log(`${item.material_name} (${item.material_type}): ${item.remaining_quantity}`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('错误:', error.message);
  }
})();