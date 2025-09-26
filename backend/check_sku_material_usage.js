import mysql from 'mysql2/promise';

async function checkSkuMaterialUsage() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });
  
  try {
    console.log('🔍 查询SKU20250924001的原材料使用情况...');
    
    // 1. 查找SKU20250924001
    const [skus] = await connection.execute(`
      SELECT id, sku_code, sku_name, total_quantity, available_quantity
      FROM product_skus 
      WHERE sku_code = 'SKU20250924001'
    `);
    
    if (skus.length === 0) {
      console.log('❌ 未找到SKU20250924001');
      return;
    }
    
    const sku = skus[0];
    console.log('✅ 找到SKU:', {
      id: sku.id,
      sku_code: sku.sku_code,
      sku_name: sku.sku_name,
      total_quantity: sku.total_quantity,
      available_quantity: sku.available_quantity
    });
    
    // 2. 查询该SKU的MaterialUsage记录
    const [usages] = await connection.execute(`
      SELECT 
        mu.id,
        mu.material_id,
        mu.sku_id,
        mu.quantity_used,
        mu.unit_cost,
        mu.total_cost,
        mu.action,
        mu.notes,
        mu.created_at,
        m.material_name,
        m.material_type,
        m.remaining_quantity as current_remaining,
        m.used_quantity as current_used
      FROM material_usage mu
      LEFT JOIN materials m ON mu.material_id = m.id
      WHERE mu.sku_id = ?
      ORDER BY mu.created_at
    `, [sku.id]);
    
    console.log(`\n📋 MaterialUsage记录 (${usages.length}条):`);
    usages.forEach((usage, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log('- material_id:', usage.material_id);
      console.log('- material_name:', usage.material_name);
      console.log('- material_type:', usage.material_type);
      console.log('- quantity_used:', usage.quantity_used);
      console.log('- unit_cost:', usage.unit_cost);
      console.log('- total_cost:', usage.total_cost);
      console.log('- action:', usage.action);
      console.log('- current_remaining:', usage.current_remaining);
      console.log('- current_used:', usage.current_used);
      console.log('- created_at:', usage.created_at);
    });
    
    // 3. 查询相关材料的当前库存状态
    console.log('\n📦 相关材料的当前库存状态:');
    const materialIds = [...new Set(usages.map(u => u.material_id))];
    
    for (const materialId of materialIds) {
      const [materials] = await connection.execute(`
        SELECT 
          id,
          material_name,
          material_type,
          original_quantity,
          used_quantity,
          remaining_quantity,
          unit_cost
        FROM materials
        WHERE id = ?
      `, [materialId]);
      
      if (materials.length > 0) {
        const material = materials[0];
        console.log(`\n材料: ${material.material_name}`);
        console.log('- material_type:', material.material_type);
        console.log('- original_quantity:', material.original_quantity);
        console.log('- used_quantity:', material.used_quantity);
        console.log('- remaining_quantity:', material.remaining_quantity);
        console.log('- unit_cost:', material.unit_cost);
      }
    }
    
    // 4. 检查是否有重复扣减的情况
    console.log('\n🔍 分析可能的重复扣减:');
    const materialUsageMap = new Map();
    
    usages.forEach(usage => {
      const key = usage.material_id;
      if (!materialUsageMap.has(key)) {
        materialUsageMap.set(key, []);
      }
      materialUsageMap.get(key).push(usage);
    });
    
    materialUsageMap.forEach((usageList, materialId) => {
      if (usageList.length > 1) {
        console.log(`\n⚠️ 材料 ${usageList[0].material_name} 有多条使用记录:`);
        usageList.forEach((usage, index) => {
          console.log(`  记录${index + 1}: quantity_used=${usage.quantity_used}, action=${usage.action}`);
        });
        
        const totalUsed = usageList.reduce((sum, usage) => sum + Number(usage.quantity_used), 0);
        console.log(`  总扣减量: ${totalUsed}`);
      }
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkSkuMaterialUsage();