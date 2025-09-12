import mysql from 'mysql2/promise';

async function analyzeImageInheritance() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('=== 图片继承逻辑分析 ===\n');

    // 1. 分析采购记录的图片情况
    console.log('📸 采购记录图片分析:');
    const [purchaseImages] = await connection.execute(`
      SELECT 
        purchase_code,
        product_name,
        product_type,
        CASE 
          WHEN photos IS NULL OR photos = '' THEN '无图片'
          WHEN photos LIKE '%data:image%' THEN '占位图片'
          WHEN photos LIKE '%http%' THEN '真实图片'
          ELSE '其他格式'
        END as image_type,
        LENGTH(photos) as photo_data_length
      FROM purchases 
      ORDER BY purchase_code
      LIMIT 10
    `);

    purchaseImages.for_each(record => {
      console.log(`   ${record.purchase_code} - ${record.product_name} (${record.product_type})`);
      console.log(`   图片类型: ${record.image_type}, 数据长度: ${record.photo_data_length || 0}`);
      console.log('');
    });

    // 2. 分析库存成品的图片情况
    console.log('\n📦 库存成品图片分析:');
    const [productImages] = await connection.execute(`
      SELECT 
        productCode,
        name,
        category,
        CASE 
          WHEN images IS NULL OR images = '' THEN '无图片'
          WHEN images LIKE '%data:image%' THEN '占位图片'
          WHEN images LIKE '%http%' THEN '真实图片'
          ELSE '其他格式'
        END as image_type,
        LENGTH(images) as image_data_length
      FROM products 
      ORDER BY productCode
      LIMIT 10
    `);

    productImages.for_each(record => {
      console.log(`   ${record.product_code} - ${record.name} (${record.category})`);
      console.log(`   图片类型: ${record.image_type}, 数据长度: ${record.image_data_length || 0}`);
      console.log('');
    });

    // 3. 分析SKU的图片情况
    console.log('\n🏷️ SKU图片分析:');
    const [skuImages] = await connection.execute(`
      SELECT 
        sku_code,
        sku_name,
        CASE 
          WHEN photos IS NULL OR photos = '' THEN '无图片'
          WHEN photos LIKE '%data:image%' THEN '占位图片'
          WHEN photos LIKE '%http%' THEN '真实图片'
          ELSE '其他格式'
        END as image_type,
        LENGTH(photos) as photo_data_length
      FROM product_skus 
      ORDER BY skuCode
      LIMIT 10
    `);

    skuImages.for_each(record => {
      console.log(`   ${record.sku_code} - ${record.sku_name}`);
      console.log(`   图片类型: ${record.image_type}, 数据长度: ${record.photo_data_length || 0}`);
      console.log('');
    });

    // 4. 分析SKU与原材料的关联关系
    console.log('\n🔗 SKU与原材料关联分析:');
    const [skuMaterialRelation] = await connection.execute(`
      SELECT 
        ps.sku_code,
        ps.sku_name,
        COUNT(mu.id) as material_count,
        GROUP_CONCAT(DISTINCT p.purchase_code) as related_purchases
      FROM product_skus ps
      LEFT JOIN material_usage mu ON ps.id = mu.product_id
      LEFT JOIN purchases p ON mu.purchase_id = p.id
      GROUP BY ps.id
      ORDER BY ps.sku_code
      LIMIT 10
    `);

    skuMaterialRelation.for_each(record => {
      console.log(`   ${record.sku_code} - ${record.sku_name}`);
      console.log(`   关联原材料数: ${record.material_count}`);
      console.log(`   关联采购编号: ${record.related_purchases || '无'}`);
      console.log('');
    });

    // 5. 检查正确的业务逻辑应该是什么
    console.log('\n✅ 正确的业务逻辑应该是:');
    console.log('1. 库存原材料图片 = 继承采购列表的图片');
    console.log('   - products.images 应该来自 purchases.photos');
    console.log('2. SKU直接转化图片 = 继承库存成品的图片');
    console.log('   - 直接转化的 product_skus.photos 应该来自 products.images');
    console.log('3. SKU组合模式图片 = 另外生成的图片');
    console.log('   - 组合模式的 product_skus.photos 应该是新生成的组合图片');

    // 6. 检查当前实际的数据流
    console.log('\n❌ 当前数据流问题分析:');
    
    // 检查products表是否正确继承了purchases的图片
    const [inheritanceCheck] = await connection.execute(`
      SELECT 
        'products继承purchases图片' as check_type,
        COUNT(CASE WHEN p.images = pur.photos THEN 1 END) as correct_inheritance,
        COUNT(*) as total_products
      FROM products p
      LEFT JOIN purchases pur ON p.name LIKE CONCAT('%', pur.product_name, '%')
      WHERE pur.id IS NOT NULL
    `);

    if (inheritanceCheck.length > 0) {
      const check = inheritanceCheck[0];
      console.log(`   ${check.check_type}: ${check.correct_inheritance}/${check.total_products} 正确继承`);
    }

    // 检查SKU是否正确继承了products的图片
    const [skuInheritanceCheck] = await connection.execute(`
      SELECT 
        'SKU继承products图片' as check_type,
        COUNT(CASE WHEN ps.photos = p.images THEN 1 END) as correct_inheritance,
        COUNT(*) as total_skus
      FROM product_skus ps
      LEFT JOIN products p ON ps.sku_name LIKE CONCAT('%', p.name, '%')
      WHERE p.id IS NOT NULL
    `);

    if (skuInheritanceCheck.length > 0) {
      const check = skuInheritanceCheck[0];
      console.log(`   ${check.check_type}: ${check.correct_inheritance}/${check.total_skus} 正确继承`);
    }

  } catch (error) {
    console.error('分析图片继承逻辑失败:', error);
  } finally {
    await connection.end();
  }
}

analyzeImageInheritance().catch(console.error);