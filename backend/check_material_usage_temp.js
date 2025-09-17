import mysql from 'mysql2/promise';

async function checkMaterialUsage() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });
  
  try {
    console.log('🔍 查询采购记录 cmfnmiw6z000513utzdf2hjon 的material_usage情况...');
    
    const [usages] = await connection.execute(`
      SELECT 
        mu.id,
        mu.purchase_id,
        mu.material_id,
        mu.sku_id,
        mu.quantity_used,
        mu.action,
        mu.notes,
        ps.sku_name,
        ps.sku_code,
        m.material_name,
        m.material_code
      FROM material_usage mu
      LEFT JOIN product_skus ps ON mu.sku_id = ps.id
      LEFT JOIN materials m ON mu.material_id = m.id
      WHERE mu.purchase_id = ?
    `, ['cmfnmiw6z000513utzdf2hjon']);
    
    console.log(`\n📊 找到 ${usages.length} 条material_usage记录:`);
    
    usages.forEach((usage, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log('- usage_id:', usage.id);
      console.log('- purchase_id:', usage.purchase_id);
      console.log('- material_id:', usage.material_id);
      console.log('- material_name:', usage.material_name);
      console.log('- material_code:', usage.material_code);
      console.log('- sku_id:', usage.sku_id);
      console.log('- sku_name:', usage.sku_name);
      console.log('- sku_code:', usage.sku_code);
      console.log('- quantity_used:', usage.quantity_used);
      console.log('- action:', usage.action);
      console.log('- notes:', usage.notes);
    });
    
    if (usages.length === 0) {
      console.log('\n✅ 没有找到任何material_usage记录，该采购记录应该可以删除。');
    } else {
      console.log(`\n⚠️ 该采购记录被 ${usages.length} 个SKU使用，需要先处理这些SKU才能删除采购记录。`);
      
      // 查询具体的SKU信息
      const skuIds = [...new Set(usages.map(u => u.sku_id).filter(Boolean))];
      if (skuIds.length > 0) {
        console.log('\n📋 涉及的SKU详情:');
        for (const skuId of skuIds) {
          const [skuInfo] = await connection.execute(`
            SELECT sku_code, sku_name, total_quantity, available_quantity, status
            FROM product_skus
            WHERE id = ?
          `, [skuId]);
          
          if (skuInfo.length > 0) {
            const sku = skuInfo[0];
            console.log(`\n- SKU: ${sku.sku_code} (${sku.sku_name})`);
            console.log(`  状态: ${sku.status}`);
            console.log(`  总数量: ${sku.total_quantity}`);
            console.log(`  可用数量: ${sku.available_quantity}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkMaterialUsage();