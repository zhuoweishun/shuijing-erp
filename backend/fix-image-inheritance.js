import mysql from 'mysql2/promise';

async function fixImageInheritance() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('=== 修复图片继承逻辑 ===\n');

    // 1. 修复products表图片继承purchases表图片
    console.log('🔧 步骤1: 修复库存原材料图片继承采购列表图片');
    
    // 查找可以匹配的products和purchases记录
    const [matchableRecords] = await connection.execute(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.images as current_images,
        pur.id as purchase_id,
        pur.purchase_code,
        pur.product_name,
        pur.photos as purchase_photos
      FROM products p
      JOIN purchases pur ON (
        p.name LIKE CONCAT('%', pur.product_name, '%') OR
        pur.product_name LIKE CONCAT('%', p.name, '%')
      )
      WHERE pur.photos IS NOT NULL 
        AND pur.photos != ''
        AND pur.photos LIKE '%http%'
        AND (p.images IS NULL OR p.images = '' OR p.images LIKE '%data:image%')
      LIMIT 20
    `);

    console.log(`找到 ${matchableRecords.length} 个可以修复的库存原材料记录`);
    
    let productsFixed = 0;
    for (const record of matchableRecords) {
      try {
        await connection.execute(
          'UPDATE products SET images = ? WHERE id = ?',
          [record.purchase_photos, record.product_id]
        );
        console.log(`   ✅ 修复: ${record.product_name} <- ${record.purchase_code}`);
        productsFixed++;
      } catch (error) {
        console.log(`   ❌ 修复失败: ${record.product_name} - ${error.message}`);
      }
    }
    
    console.log(`库存原材料图片修复完成: ${productsFixed}/${matchableRecords.length}\n`);

    // 2. 修复SKU直接转化模式图片继承库存成品图片
    console.log('🔧 步骤2: 修复SKU直接转化模式图片继承库存成品图片');
    
    // 查找直接转化的SKU（通过名称匹配单一原材料）
    const [directTransformSkus] = await connection.execute(`
      SELECT 
        ps.id as sku_id,
        ps.sku_code,
        ps.sku_name,
        ps.photos as current_photos,
        p.id as product_id,
        p.name as product_name,
        p.images as product_images
      FROM product_skus ps
      JOIN products p ON (
        ps.sku_name LIKE CONCAT('%', p.name, '%成品') OR
        ps.sku_name LIKE CONCAT(p.name, '%')
      )
      WHERE p.images IS NOT NULL 
        AND p.images != ''
        AND p.images LIKE '%http%'
        AND (ps.photos IS NULL OR ps.photos = '' OR ps.photos LIKE '%data:image%')
        AND ps.sku_name LIKE '%成品'
        AND ps.sku_name NOT LIKE '%组合%'
      LIMIT 30
    `);

    console.log(`找到 ${directTransformSkus.length} 个直接转化SKU需要修复图片`);
    
    let directSkusFixed = 0;
    for (const sku of directTransformSkus) {
      try {
        await connection.execute(
          'UPDATE product_skus SET photos = ? WHERE id = ?',
          [sku.product_images, sku.sku_id]
        );
        console.log(`   ✅ 修复直接转化SKU: ${sku.sku_code} <- ${sku.product_name}`);
        directSkusFixed++;
      } catch (error) {
        console.log(`   ❌ 修复失败: ${sku.sku_code} - ${error.message}`);
      }
    }
    
    console.log(`直接转化SKU图片修复完成: ${directSkusFixed}/${directTransformSkus.length}\n`);

    // 3. 为组合模式SKU生成新的组合图片
    console.log('🔧 步骤3: 为组合模式SKU生成组合风格图片');
    
    // 查找组合模式的SKU
    const [comboSkus] = await connection.execute(`
      SELECT 
        id,
        sku_code,
        sku_name,
        photos as current_photos
      FROM product_skus
      WHERE (photos IS NULL OR photos = '' OR photos LIKE '%data:image%')
        AND (skuName LIKE '%组合%' OR sku_name LIKE '%+%')
      LIMIT 20
    `);

    console.log(`找到 ${comboSkus.length} 个组合模式SKU需要生成图片`);
    
    // 生成组合风格图片的函数
    function generateComboImage(sku_name) {
      // 提取组合中的材料名称
      const materials = skuName.split(/[+组合]/).filter(m => m.trim() && !m.includes('手串') && !m.includes('成品'));
      const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
      const gradientColors = materials.slice(0, 2).map((_, i) => colors[i % colors.length]);
      
      return `data:image/svg+xml;base64,${Buffer.from(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="comboGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${gradientColors[0] || colors[0]};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${gradientColors[1] || colors[1]};stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" fill="url(#comboGrad)" rx="20"/>
          <circle cx="100" cy="80" r="25" fill="white" opacity="0.9"/>
          <circle cx="70" cy="130" r="20" fill="white" opacity="0.7"/>
          <circle cx="130" cy="130" r="20" fill="white" opacity="0.7"/>
          <text x="100" y="170" text-anchor="middle" fill="white" font-size="12" font-family="Arial">组合制作</text>
        </svg>
      `).to_string('base64')}`;
    }
    
    let comboSkusFixed = 0;
    for (const sku of comboSkus) {
      try {
        const comboImage = generateComboImage(sku.sku_name);
        await connection.execute(
          'UPDATE product_skus SET photos = ? WHERE id = ?',
          [JSON.stringify([comboImage]), sku.id]
        );
        console.log(`   ✅ 生成组合图片: ${sku.sku_code}`);
        comboSkusFixed++;
      } catch (error) {
        console.log(`   ❌ 生成失败: ${sku.sku_code} - ${error.message}`);
      }
    }
    
    console.log(`组合模式SKU图片生成完成: ${comboSkusFixed}/${comboSkus.length}\n`);

    // 4. 修复material_usage关联关系（如果需要的话）
    console.log('🔧 步骤4: 检查并修复material_usage关联关系');
    
    const [missingUsageCount] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM product_skus ps
      LEFT JOIN material_usage mu ON ps.id = mu.product_id
      WHERE mu.id IS NULL
    `);
    
    console.log(`发现 ${missingUsageCount[0].count} 个SKU缺少material_usage关联记录`);
    
    if (missingUsageCount[0].count > 0) {
      console.log('注意: material_usage关联记录缺失，这可能影响SKU溯源功能');
      console.log('建议重新运行SKU创建脚本来建立正确的关联关系');
    }

    // 5. 验证修复结果
    console.log('\n📊 修复结果验证:');
    
    const [finalStats] = await connection.execute(`
      SELECT 
        'products' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN images IS NOT NULL AND images != '' THEN 1 END) as has_images,
        COUNT(CASE WHEN images LIKE '%data:image%' THEN 1 END) as placeholder_images,
        COUNT(CASE WHEN images LIKE '%http%' THEN 1 END) as real_images
      FROM products
      UNION ALL
      SELECT 
        'product_skus' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN photos IS NOT NULL AND photos != '' THEN 1 END) as has_images,
        COUNT(CASE WHEN photos LIKE '%data:image%' THEN 1 END) as placeholder_images,
        COUNT(CASE WHEN photos LIKE '%http%' THEN 1 END) as real_images
      FROM product_skus
    `);

    finalStats.for_each(stat => {
      console.log(`${stat.table_name}表:`);
      console.log(`   总记录数: ${stat.total_records}`);
      console.log(`   有图片记录: ${stat.has_images}`);
      console.log(`   占位图片: ${stat.placeholder_images}`);
      console.log(`   真实图片: ${stat.real_images}`);
      console.log('');
    });

    console.log('✅ 图片继承逻辑修复完成!');
    console.log('\n📝 修复总结:');
    console.log(`- 库存原材料图片修复: ${productsFixed} 个`);
    console.log(`- 直接转化SKU图片修复: ${directSkusFixed} 个`);
    console.log(`- 组合模式SKU图片生成: ${comboSkusFixed} 个`);

  } catch (error) {
    console.error('修复图片继承逻辑失败:', error);
  } finally {
    await connection.end();
  }
}

fixImageInheritance().catch(console.error);