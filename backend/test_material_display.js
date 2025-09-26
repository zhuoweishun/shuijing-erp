import mysql from 'mysql2/promise';

async function testMaterialDisplay() {
  let connection;
  
  try {
    console.log('🔍 测试原材料库存显示数据...');
    
    // 连接数据库
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      charset: 'utf8mb4'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 1. 检查materials表的数据
    console.log('\n📊 1. 检查materials表数据...');
    const [materials] = await connection.execute(`
      SELECT 
        id,
        material_code,
        material_name,
        material_type,
        original_quantity,
        used_quantity,
        remaining_quantity,
        inventory_unit,
        unit_cost,
        total_cost,
        quality,
        bead_diameter,
        bracelet_inner_diameter,
        accessory_specification,
        created_at
      FROM materials 
      ORDER BY created_at DESC
    `);
    
    console.log(`找到 ${materials.length} 条原材料记录:`);
    materials.forEach((material, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log(`- 编码: ${material.material_code}`);
      console.log(`- 名称: ${material.material_name}`);
      console.log(`- 类型: ${material.material_type}`);
      console.log(`- 原始数量: ${material.original_quantity}`);
      console.log(`- 已用数量: ${material.used_quantity}`);
      console.log(`- 剩余数量: ${material.remaining_quantity}`);
      console.log(`- 库存单位: ${material.inventory_unit}`);
      console.log(`- 单位成本: ${material.unit_cost}`);
      console.log(`- 总成本: ${material.total_cost}`);
      console.log(`- 品质: ${material.quality}`);
      if (material.bead_diameter) {
        console.log(`- 珠子直径: ${material.bead_diameter}mm`);
      }
      if (material.bracelet_inner_diameter) {
        console.log(`- 手串内径: ${material.bracelet_inner_diameter}mm`);
      }
      if (material.accessory_specification) {
        console.log(`- 配件规格: ${material.accessory_specification}`);
      }
    });
    
    // 2. 按类型统计库存
    console.log('\n📈 2. 按类型统计库存...');
    const [stats] = await connection.execute(`
      SELECT 
        material_type,
        COUNT(*) as record_count,
        SUM(original_quantity) as total_original,
        SUM(used_quantity) as total_used,
        SUM(remaining_quantity) as total_remaining,
        SUM(total_cost) as total_value
      FROM materials 
      GROUP BY material_type
      ORDER BY material_type
    `);
    
    stats.forEach(stat => {
      console.log(`\n${stat.material_type}:`);
      console.log(`  记录数: ${stat.record_count}`);
      console.log(`  原始总量: ${stat.total_original}`);
      console.log(`  已用总量: ${stat.total_used}`);
      console.log(`  剩余总量: ${stat.total_remaining}`);
      console.log(`  总价值: ¥${stat.total_value}`);
    });
    
    // 3. 检查前端API需要的数据格式
    console.log('\n🔍 3. 检查前端API数据格式...');
    const [apiData] = await connection.execute(`
      SELECT 
        m.id,
        m.material_code,
        m.material_name,
        m.material_type,
        m.original_quantity,
        m.used_quantity,
        m.remaining_quantity,
        m.inventory_unit,
        m.unit_cost,
        m.total_cost,
        m.quality,
        m.bead_diameter,
        m.bracelet_inner_diameter,
        m.accessory_specification,
        m.finished_material_specification,
        p.purchase_date,
        p.supplier_id,
        s.supplier_name
      FROM materials m
      LEFT JOIN purchases p ON m.purchase_id = p.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE m.remaining_quantity > 0
      ORDER BY m.created_at DESC
    `);
    
    console.log(`\n可用库存记录 ${apiData.length} 条:`);
    apiData.forEach((item, index) => {
      console.log(`${index + 1}. ${item.material_name} - 剩余: ${item.remaining_quantity} ${item.inventory_unit}`);
    });
    
    console.log('\n✅ 原材料库存数据检查完成!');
    console.log('\n💡 建议:');
    console.log('1. 检查前端库存页面是否能正常显示这些数据');
    console.log('2. 验证库存数量和单位是否正确');
    console.log('3. 确认新的采购记录能自动同步到库存');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

testMaterialDisplay();