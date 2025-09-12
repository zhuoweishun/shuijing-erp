import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

// 简单修复SKU图片
async function fixSkuPhotosSimple() {
  const connection = await mysql.create_connection(dbConfig);
  
  try {
    console.log('🔄 简单修复SKU图片...');
    
    // 获取所有使用Unsplash图片的SKU
    const [skus] = await connection.execute(`
      SELECT id, sku_code, sku_name, photos
      FROM product_skus 
      WHERE JSON_EXTRACT(photos, '$') LIKE '%unsplash%' OR photos LIKE '%unsplash%'
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 找到 ${skus.length} 个SKU使用Unsplash图片`);
    
    // 获取一个可用的SVG图片作为替代
    const [samplePurchase] = await connection.execute(`
      SELECT photos FROM purchases 
      WHERE photos LIKE '%data:image/svg+xml%' 
      LIMIT 1
    `);
    
    if (samplePurchase.length === 0) {
      console.log('❌ 未找到可用的替代图片');
      return;
    }
    
    let replacementPhoto = samplePurchase[0].photos;
    if (typeof replacementPhoto === 'string') {
      try {
        const parsed = JSON.parse(replacementPhoto);
        replacementPhoto = Array.is_array(parsed) ? parsed[0] : parsed;
      } catch (e) {
        // 保持原样
      }
    }
    
    console.log('🔄 使用替代图片:', typeof replacementPhoto === 'string' ? replacementPhoto.substring(0, 50) + '...' : replacementPhoto);
    
    let updatedCount = 0;
    
    for (const sku of skus) {
      try {
        // 直接更新为替代图片
        await connection.execute(
          'UPDATE product_skus SET photos = ? WHERE id = ?',
          [JSON.stringify([replacementPhoto]), sku.id]
        );
        
        updatedCount++;
        console.log(`✅ ${sku.sku_code}: 已更新图片`);
        
      } catch (error) {
        console.error(`❌ 处理SKU ${sku.sku_code} 时出错:`, error.message);
      }
    }
    
    console.log(`\n🎉 图片更新完成！共更新了 ${updatedCount} 个SKU`);
    
    // 验证更新结果
    const [remainingUnsplash] = await connection.execute(`
      SELECT COUNT(*) as count FROM product_skus 
      WHERE JSON_EXTRACT(photos, '$') LIKE '%unsplash%' OR photos LIKE '%unsplash%'
    `);
    
    console.log(`\n📊 剩余使用Unsplash图片的SKU: ${remainingUnsplash[0].count} 个`);
    
    if (remainingUnsplash[0].count === 0) {
      console.log('🎉 所有SKU图片已成功更新！');
    }
    
    // 显示更新后的示例
    const [updatedSamples] = await connection.execute(`
      SELECT sku_code, photos FROM product_skus 
      ORDER BY updatedAt DESC 
      LIMIT 3
    `);
    
    console.log('\n📊 更新后的示例:');
    updatedSamples.for_each(sku => {
      let photoType = 'unknown';
      if (typeof sku.photos === 'string') {
        if (sku.photos.includes('unsplash')) {
          photoType = 'unsplash ❌';
        } else if (sku.photos.includes('data:image/svg+xml')) {
          photoType = 'svg ✅';
        }
      }
      console.log(`${sku.sku_code}: ${photoType}`);
    });
    
  } catch (error) {
    console.error('❌ 修复SKU图片时发生错误:', error);
  } finally {
    await connection.end();
  }
}

// 执行修复
fixSkuPhotosSimple().catch(console.error);