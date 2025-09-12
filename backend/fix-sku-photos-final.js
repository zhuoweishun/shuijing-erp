import mysql from 'mysql2/promise';

async function fixSkuPhotosFinal() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('=== 最终修复SKU图片问题 ===');
    
    // 1. 查找所有photos为字符串'null'的SKU
    console.log('\n1. 查找photos为字符串null的SKU...');
    const [nullPhotoSkus] = await connection.execute(`
      SELECT id, sku_name, photos
      FROM product_skus 
      WHERE photos = 'null'
      LIMIT 10
    `);
    
    console.log(`找到 ${nullPhotoSkus.length} 个photos为字符串null的SKU`);
    nullPhotoSkus.for_each((sku, index) => {
      console.log(`${index + 1}. ${sku.sku_name} - photos: ${sku.photos}`);
    });
    
    // 2. 为每个SKU找到第一个关联的采购记录的图片
    console.log('\n2. 开始修复SKU图片...');
    let fixedCount = 0;
    
    for (const sku of nullPhotoSkus) {
      try {
        // 找到这个SKU关联的第一个有图片的采购记录
        const [purchasePhotos] = await connection.execute(`
          SELECT p.photos, p.purchase_code, p.product_name
          FROM purchases p
          JOIN material_usage mu ON mu.purchase_id = p.id
          JOIN products prod ON prod.id = mu.product_id
          WHERE prod.sku_id = ?
            AND p.photos IS NOT NULL 
            AND p.photos != 'null'
            AND p.photos != ''
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
        }
      } catch (error) {
        console.log(`❌ 修复失败 ${sku.sku_name}: ${error.message}`);
      }
    }
    
    console.log(`\n=== 修复完成 ===`);
    console.log(`成功修复 ${fixedCount} 个SKU的图片`);
    
    // 3. 验证修复结果
    console.log('\n3. 验证修复结果...');
    const [verifyResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN photos != 'null' AND photos IS NOT NULL AND photos != '' THEN 1 END) as with_valid_photos,
        COUNT(CASE WHEN photos = 'null' THEN 1 END) as with_null_string
      FROM product_skus
    `);
    
    console.log(`总SKU数量: ${verifyResult[0].total}`);
    console.log(`有有效图片的SKU数量: ${verifyResult[0].with_valid_photos}`);
    console.log(`仍为字符串null的SKU数量: ${verifyResult[0].with_null_string}`);
    console.log(`图片覆盖率: ${(verifyResult[0].with_valid_photos / verifyResult[0].total * 100).to_fixed(1)}%`);
    
    // 4. 显示修复后的示例
    console.log('\n4. 修复后的SKU示例...');
    const [fixedExamples] = await connection.execute(`
      SELECT sku_name, photos
      FROM product_skus 
      WHERE photos != 'null' AND photos IS NOT NULL AND photos != ''
      LIMIT 5
    `);
    
    fixedExamples.for_each((sku, index) => {
      console.log(`${index + 1}. ${sku.sku_name}`);
      console.log(`   图片: ${sku.photos}`);
    });
    
  } finally {
    await connection.end();
  }
}

fixSkuPhotosFinal().catch(console.error);