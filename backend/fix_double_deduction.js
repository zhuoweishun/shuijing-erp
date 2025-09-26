import mysql from 'mysql2/promise';

async function fixDoubleDeduction() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });
  
  try {
    console.log('🔧 开始修复SKU20250924001的双倍扣减问题...');
    
    // 1. 查找SKU20250924001的ID
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
      sku_name: sku.sku_name
    });
    
    // 2. 查询该SKU的material_usage记录
    const [usages] = await connection.execute(`
      SELECT 
        mu.id,
        mu.material_id,
        mu.sku_id,
        mu.quantity_used,
        mu.unit_cost,
        mu.total_cost,
        mu.action,
        mu.created_at,
        m.material_name,
        m.material_type,
        m.remaining_quantity as current_remaining,
        m.used_quantity as current_used,
        m.original_quantity
      FROM material_usage mu
      LEFT JOIN materials m ON mu.material_id = m.id
      WHERE mu.sku_id = ?
      ORDER BY mu.created_at
    `, [sku.id]);
    
    console.log(`\n📋 找到 ${usages.length} 条MaterialUsage记录:`);
    
    // 3. 分析并修正每个材料的库存
    const materialsToFix = [
      {
        name: '镀金随行隔片',
        expected_deduction: 5,
        actual_deduction: 10,
        fix_amount: 5
      },
      {
        name: '玻利维亚紫水晶',
        expected_deduction: 5,
        actual_deduction: 10,
        fix_amount: 5
      },
      {
        name: '油胆',
        expected_deduction: 1,
        actual_deduction: 2,
        fix_amount: 1
      }
    ];
    
    for (const usage of usages) {
      console.log(`\n🔍 检查材料: ${usage.material_name}`);
      console.log('- material_id:', usage.material_id);
      console.log('- quantity_used:', usage.quantity_used);
      console.log('- current_remaining:', usage.current_remaining);
      console.log('- current_used:', usage.current_used);
      console.log('- original_quantity:', usage.original_quantity);
      
      // 查找是否需要修正这个材料
      const materialToFix = materialsToFix.find(m => 
        usage.material_name.includes(m.name) || m.name.includes(usage.material_name)
      );
      
      if (materialToFix) {
        console.log(`\n🔧 修正材料: ${usage.material_name}`);
        console.log(`- 预期扣减: ${materialToFix.expected_deduction}`);
        console.log(`- 实际扣减: ${materialToFix.actual_deduction}`);
        console.log(`- 需要加回: ${materialToFix.fix_amount}`);
        
        // 计算修正后的库存
        const new_remaining = Number(usage.current_remaining) + materialToFix.fix_amount;
        const new_used = Number(usage.current_used) - materialToFix.fix_amount;
        
        console.log(`- 修正前 remaining_quantity: ${usage.current_remaining}`);
        console.log(`- 修正后 remaining_quantity: ${new_remaining}`);
        console.log(`- 修正前 used_quantity: ${usage.current_used}`);
        console.log(`- 修正后 used_quantity: ${new_used}`);
        
        // 更新材料库存
        await connection.execute(`
          UPDATE materials 
          SET 
            remaining_quantity = ?,
            used_quantity = ?
          WHERE id = ?
        `, [new_remaining, new_used, usage.material_id]);
        
        // 更新material_usage记录中的quantity_used
        await connection.execute(`
          UPDATE material_usage 
          SET 
            quantity_used = ?,
            total_cost = ? * unit_cost
          WHERE id = ?
        `, [materialToFix.expected_deduction, materialToFix.expected_deduction, usage.id]);
        
        console.log('✅ 修正完成');
      } else {
        console.log('- 该材料无需修正');
      }
    }
    
    // 4. 验证修正结果
    console.log('\n🔍 验证修正结果...');
    
    const [afterFix] = await connection.execute(`
      SELECT 
        m.id,
        m.material_name,
        m.original_quantity,
        m.used_quantity,
        m.remaining_quantity,
        mu.quantity_used as usage_quantity
      FROM materials m
      LEFT JOIN material_usage mu ON m.id = mu.material_id AND mu.sku_id = ?
      WHERE m.material_name IN ('镀金随行隔片', '玻利维亚紫水晶') 
         OR m.material_name LIKE '%油胆%'
      ORDER BY m.material_name
    `, [sku.id]);
    
    console.log('\n📦 修正后的材料库存状态:');
    afterFix.forEach(material => {
      console.log(`\n材料: ${material.material_name}`);
      console.log('- original_quantity:', material.original_quantity);
      console.log('- used_quantity:', material.used_quantity);
      console.log('- remaining_quantity:', material.remaining_quantity);
      console.log('- usage_quantity:', material.usage_quantity);
      
      // 验证库存计算是否正确
      const calculated_remaining = Number(material.original_quantity) - Number(material.used_quantity);
      if (calculated_remaining === Number(material.remaining_quantity)) {
        console.log('✅ 库存计算正确');
      } else {
        console.log(`⚠️ 库存计算不一致: 计算值=${calculated_remaining}, 实际值=${material.remaining_quantity}`);
      }
    });
    
    // 5. 检查是否还有负库存
    const [negativeStock] = await connection.execute(`
      SELECT material_name, remaining_quantity
      FROM materials
      WHERE remaining_quantity < 0
    `);
    
    if (negativeStock.length === 0) {
      console.log('\n✅ 所有材料库存均为非负数');
    } else {
      console.log(`\n⚠️ 仍有 ${negativeStock.length} 个材料存在负库存:`);
      negativeStock.forEach(material => {
        console.log(`- ${material.material_name}: ${material.remaining_quantity}`);
      });
    }
    
    console.log('\n🎉 双倍扣减修复完成！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await connection.end();
  }
}

fixDoubleDeduction();