import mysql from 'mysql2/promise';

async function fixNegativeStock() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });
  
  try {
    console.log('🔧 开始修复负库存问题...');
    
    // 1. 查找所有有负库存的材料
    const [negativeStockMaterials] = await connection.execute(`
      SELECT 
        id,
        material_name,
        original_quantity,
        used_quantity,
        remaining_quantity
      FROM materials
      WHERE remaining_quantity < 0
    `);
    
    console.log(`\n📋 发现 ${negativeStockMaterials.length} 个负库存材料:`);
    
    for (const material of negativeStockMaterials) {
      console.log(`\n材料: ${material.material_name}`);
      console.log('- material_id:', material.id);
      console.log('- original_quantity:', material.original_quantity);
      console.log('- used_quantity:', material.used_quantity);
      console.log('- remaining_quantity:', material.remaining_quantity);
      
      // 计算正确的库存
      const correctRemaining = Number(material.original_quantity) - Number(material.used_quantity);
      console.log('- 正确的remaining_quantity应该是:', correctRemaining);
      
      // 修复库存
      await connection.execute(`
        UPDATE materials 
        SET remaining_quantity = ?
        WHERE id = ?
      `, [correctRemaining, material.id]);
      
      console.log('✅ 已修复');
    }
    
    // 2. 验证修复结果
    console.log('\n🔍 验证修复结果...');
    
    const [afterFix] = await connection.execute(`
      SELECT 
        id,
        material_name,
        original_quantity,
        used_quantity,
        remaining_quantity
      FROM materials
      WHERE remaining_quantity < 0
    `);
    
    if (afterFix.length === 0) {
      console.log('✅ 所有负库存问题已修复！');
    } else {
      console.log(`⚠️ 仍有 ${afterFix.length} 个材料存在负库存问题`);
      afterFix.forEach(material => {
        console.log(`- ${material.material_name}: ${material.remaining_quantity}`);
      });
    }
    
    // 3. 显示修复后的油胆库存状态
    console.log('\n📦 修复后的油胆库存状态:');
    
    const [oilMaterials] = await connection.execute(`
      SELECT 
        id,
        material_name,
        original_quantity,
        used_quantity,
        remaining_quantity
      FROM materials
      WHERE material_name LIKE '%油胆%'
      ORDER BY created_at
    `);
    
    oilMaterials.forEach((oil, index) => {
      console.log(`\n油胆 ${index + 1}:`);
      console.log('- material_id:', oil.id);
      console.log('- material_name:', oil.material_name);
      console.log('- original_quantity:', oil.original_quantity);
      console.log('- used_quantity:', oil.used_quantity);
      console.log('- remaining_quantity:', oil.remaining_quantity);
    });
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await connection.end();
  }
}

fixNegativeStock();