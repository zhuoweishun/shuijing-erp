import mysql from 'mysql2/promise';

async function forceFixPhotos() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('=== 强制修复所有SKU图片 ===');
    
    // 1. 获取所有SKU
    const [allSkus] = await connection.execute(`
      SELECT id, sku_name, photos
      FROM product_skus 
      ORDER BY created_at DESC
    `);
    
    console.log(`找到 ${allSkus.length} 个SKU`);
    
    let fixedCount = 0;
    let noPhotoCount = 0;
    
    // 2. 为每个SKU找到关联的采购记录图片
    for (const sku of allSkus) {
      try {
        // 查找这个SKU关联的采购记录图片
        const [purchasePhotos] = await connection.execute(`
          SELECT DISTINCT p.photos, p.purchase_code, p.product_name
          FROM purchases p
          JOIN material_usage mu ON mu.purchase_id = p.id
          JOIN products prod ON prod.id = mu.product_id
          WHERE prod.sku_id = ?
            AND p.photos IS NOT NULL 
            AND p.photos != ''
            AND p.photos LIKE '[%]'
          ORDER BY p.created_at DESC
          LIMIT 1
        `, [sku.id]);
        
        if (purchasePhotos.length > 0) {
          const purchasePhoto = purchasePhotos[0];
          
          // 更新SKU的photos字段
          await connection.execute(
            'UPDATE product_skus SET photos = ? WHERE id = ?',
            [purchasePhoto.photos, sku.id]
          );
          
          console.log(`✅ 修复SKU: ${sku.sku_name}`);
          console.log(`   从采购记录 ${purchasePhoto.purchase_code} (${purchasePhoto.product_name}) 继承图片`);
          console.log(`   图片: ${purchasePhoto.photos}`);
          fixedCount++;
        } else {
          console.log(`⚠️  SKU ${sku.sku_name} 没有找到关联的有图片的采购记录`);
          noPhotoCount++;
        }
        
        // 每10个SKU显示一次进度
        if ((fixedCount + noPhotoCount) % 10 === 0) {
          console.log(`进度: ${fixedCount + noPhotoCount}/${allSkus.length}`);
        }
        
      } catch (error) {
        console.log(`❌ 修复失败 ${sku.sku_name}: ${error.message}`);
      }
    }
    
    console.log(`\n=== 修复完成 ===`);
    console.log(`成功修复: ${fixedCount} 个SKU`);
    console.log(`无法修复: ${noPhotoCount} 个SKU (没有关联的图片)`);
    
    // 3. 验证修复结果
    console.log('\n=== 验证修复结果 ===');
    const [afterFix] = await connection.execute(`
      SELECT 
        CASE 
          WHEN photos LIKE '[%]' THEN 'JSON数组格式(有图片)'
          WHEN photos IS NULL THEN 'NULL值'
          WHEN photos = '' THEN '空字符串'
          ELSE '其他格式'
        END as photo_type,
        COUNT(*) as count
      FROM product_skus
      GROUP BY 
        CASE 
          WHEN photos LIKE '[%]' THEN 'JSON数组格式(有图片)'
          WHEN photos IS NULL THEN 'NULL值'
          WHEN photos = '' THEN '空字符串'
          ELSE '其他格式'
        END
    `);
    
    console.log('修复后的photos类型分布:');
    afterFix.for_each(row => {
      console.log(`${row.photo_type}: ${row.count}个`);
    });
    
    // 4. 显示修复成功的示例
    console.log('\n=== 修复成功的SKU示例 ===');
    const [fixedExamples] = await connection.execute(`
      SELECT sku_name, photos
      FROM product_skus 
      WHERE photos LIKE '[%]'
      LIMIT 5
    `);
    
    if (fixedExamples.length > 0) {
      fixedExamples.for_each((sku, index) => {
        console.log(`${index + 1}. ${sku.sku_name}`);
        console.log(`   图片: ${sku.photos}`);
      });
    } else {
      console.log('没有找到修复成功的SKU示例');
    }
    
  } finally {
    await connection.end();
  }
}

forceFixPhotos().catch(console.error);