import mysql from 'mysql2/promise';

async function checkSecondOil() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });
  
  try {
    console.log('🔍 检查第二个油胆材料的详细情况...');
    
    // 查询第二个油胆的详细信息
    const materialId = 'mat_b8ef550f_1758090594';
    
    const [materialInfo] = await connection.execute(`
      SELECT 
        id,
        material_name,
        material_type,
        original_quantity,
        used_quantity,
        remaining_quantity,
        unit_cost,
        created_at
      FROM materials
      WHERE id = ?
    `, [materialId]);
    
    if (materialInfo.length > 0) {
      const material = materialInfo[0];
      console.log('\n📦 第二个油胆材料信息:');
      console.log('- material_id:', material.id);
      console.log('- material_name:', material.material_name);
      console.log('- material_type:', material.material_type);
      console.log('- original_quantity:', material.original_quantity);
      console.log('- used_quantity:', material.used_quantity);
      console.log('- remaining_quantity:', material.remaining_quantity);
      console.log('- unit_cost:', material.unit_cost);
      console.log('- created_at:', material.created_at);
      
      // 计算应该的剩余库存
      const calculatedRemaining = Number(material.original_quantity) - Number(material.used_quantity);
      console.log('- 计算的剩余库存:', calculatedRemaining);
      
      if (calculatedRemaining !== Number(material.remaining_quantity)) {
        console.log('⚠️ 库存数据不一致！');
      } else {
        console.log('✅ 库存数据一致');
      }
    }
    
    // 查询这个材料的所有使用记录
    const [usageRecords] = await connection.execute(`
      SELECT 
        mu.id,
        mu.sku_id,
        mu.quantity_used,
        mu.action,
        mu.created_at,
        ps.sku_code,
        ps.sku_name
      FROM material_usage mu
      LEFT JOIN product_skus ps ON mu.sku_id = ps.id
      WHERE mu.material_id = ?
      ORDER BY mu.created_at
    `, [materialId]);
    
    console.log(`\n📋 第二个油胆的使用记录 (${usageRecords.length}条):`);
    usageRecords.forEach((usage, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log('- usage_id:', usage.id);
      console.log('- sku_id:', usage.sku_id);
      console.log('- sku_code:', usage.sku_code);
      console.log('- sku_name:', usage.sku_name);
      console.log('- quantity_used:', usage.quantity_used);
      console.log('- action:', usage.action);
      console.log('- created_at:', usage.created_at);
    });
    
    // 计算总使用量
    const totalUsed = usageRecords.reduce((sum, record) => sum + Number(record.quantity_used), 0);
    console.log('\n🔍 使用量统计:');
    console.log('- MaterialUsage记录总使用量:', totalUsed);
    console.log('- Materials表中的used_quantity:', materialInfo[0]?.used_quantity);
    
    // 检查是否存在库存更新的问题
    if (totalUsed !== Number(materialInfo[0]?.used_quantity)) {
      console.log('⚠️ 使用量不一致！这可能是库存更新逻辑的问题。');
    }
    
    // 查询所有油胆材料，看看用户可能看到的是哪个
    const [allOils] = await connection.execute(`
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
    
    console.log('\n📋 所有油胆材料:');
    allOils.forEach((oil, index) => {
      console.log(`\n油胆 ${index + 1}:`);
      console.log('- material_id:', oil.id);
      console.log('- material_name:', oil.material_name);
      console.log('- original_quantity:', oil.original_quantity);
      console.log('- used_quantity:', oil.used_quantity);
      console.log('- remaining_quantity:', oil.remaining_quantity);
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkSecondOil();