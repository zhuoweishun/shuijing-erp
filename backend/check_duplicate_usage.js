import mysql from 'mysql2/promise';

async function checkDuplicateUsage() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });
  
  try {
    console.log('🔍 检查是否存在重复的MaterialUsage记录...');
    
    // 1. 查找油胆的所有MaterialUsage记录
    const [oilUsages] = await connection.execute(`
      SELECT 
        mu.id,
        mu.material_id,
        mu.sku_id,
        mu.quantity_used,
        mu.action,
        mu.created_at,
        m.material_name,
        ps.sku_code,
        ps.sku_name
      FROM material_usage mu
      LEFT JOIN materials m ON mu.material_id = m.id
      LEFT JOIN product_skus ps ON mu.sku_id = ps.id
      WHERE m.material_name LIKE '%油胆%'
      ORDER BY mu.created_at
    `);
    
    console.log(`\n📋 油胆的MaterialUsage记录 (${oilUsages.length}条):`);
    oilUsages.forEach((usage, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log('- usage_id:', usage.id);
      console.log('- material_id:', usage.material_id);
      console.log('- sku_id:', usage.sku_id);
      console.log('- sku_code:', usage.sku_code);
      console.log('- sku_name:', usage.sku_name);
      console.log('- quantity_used:', usage.quantity_used);
      console.log('- action:', usage.action);
      console.log('- created_at:', usage.created_at);
    });
    
    // 2. 检查是否有重复的SKU使用同一个材料
    const [duplicateCheck] = await connection.execute(`
      SELECT 
        material_id,
        sku_id,
        COUNT(*) as usage_count,
        SUM(quantity_used) as total_used,
        GROUP_CONCAT(id) as usage_ids
      FROM material_usage
      WHERE material_id IN (
        SELECT id FROM materials WHERE material_name LIKE '%油胆%'
      )
      GROUP BY material_id, sku_id
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.length > 0) {
      console.log('\n⚠️ 发现重复的MaterialUsage记录:');
      duplicateCheck.forEach(dup => {
        console.log(`- material_id: ${dup.material_id}, sku_id: ${dup.sku_id}`);
        console.log(`- 重复次数: ${dup.usage_count}`);
        console.log(`- 总扣减量: ${dup.total_used}`);
        console.log(`- usage_ids: ${dup.usage_ids}`);
      });
    } else {
      console.log('\n✅ 没有发现重复的MaterialUsage记录');
    }
    
    // 3. 检查油胆的库存计算是否正确
    const [oilMaterial] = await connection.execute(`
      SELECT 
        id,
        material_name,
        original_quantity,
        used_quantity,
        remaining_quantity
      FROM materials
      WHERE material_name LIKE '%油胆%'
    `);
    
    if (oilMaterial.length > 0) {
      const material = oilMaterial[0];
      console.log('\n📦 油胆库存信息:');
      console.log('- material_id:', material.id);
      console.log('- material_name:', material.material_name);
      console.log('- original_quantity:', material.original_quantity);
      console.log('- used_quantity:', material.used_quantity);
      console.log('- remaining_quantity:', material.remaining_quantity);
      
      // 计算实际应该的库存
      const calculatedRemaining = Number(material.original_quantity) - Number(material.used_quantity);
      console.log('- 计算的剩余库存:', calculatedRemaining);
      
      if (calculatedRemaining !== Number(material.remaining_quantity)) {
        console.log('⚠️ 库存数据不一致！');
        console.log(`- 数据库中的remaining_quantity: ${material.remaining_quantity}`);
        console.log(`- 根据original_quantity - used_quantity计算: ${calculatedRemaining}`);
      }
    }
    
    // 4. 检查MaterialUsage表中的总扣减量是否与materials表中的used_quantity一致
    const [usageSum] = await connection.execute(`
      SELECT 
        mu.material_id,
        m.material_name,
        SUM(mu.quantity_used) as total_usage_from_records,
        m.used_quantity as used_quantity_in_materials
      FROM material_usage mu
      LEFT JOIN materials m ON mu.material_id = m.id
      WHERE m.material_name LIKE '%油胆%'
      GROUP BY mu.material_id, m.material_name, m.used_quantity
    `);
    
    if (usageSum.length > 0) {
      const sum = usageSum[0];
      console.log('\n🔍 库存扣减一致性检查:');
      console.log('- MaterialUsage记录总扣减量:', sum.total_usage_from_records);
      console.log('- Materials表中的used_quantity:', sum.used_quantity_in_materials);
      
      if (Number(sum.total_usage_from_records) !== Number(sum.used_quantity_in_materials)) {
        console.log('⚠️ 扣减量不一致！');
        console.log('这可能是导致库存为负数的原因。');
      } else {
        console.log('✅ 扣减量一致');
      }
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkDuplicateUsage();