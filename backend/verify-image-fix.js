import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

// 验证图片修复结果
async function verifyImageFix() {
  const connection = await mysql.create_connection(dbConfig);
  
  try {
    console.log('🔍 验证图片修复结果...');
    
    // 检查采购记录中的图片
    const [purchases] = await connection.execute(`
      SELECT purchase_code, product_name, photos 
      FROM purchases 
      WHERE purchase_code IN (
        'CG20250904002', 'CG20250902005', 'CG20250831002', 'CG20250830004', 
        'CG20250829001', 'CG20250825002', 'CG20250822001', 'CG20250818003',
        'CG20250818007', 'CG20250818001', 'CG20250817003', 'CG20250816002',
        'CG20250814004', 'CG20250814002', 'CG20250813006', 'CG20250813005',
        'CG20250811003', 'CG20250811001', 'CG20250809005', 'CG20250808003',
        'CG20250807002', 'CG20250807001'
      )
      ORDER BY purchase_code
    `);
    
    console.log(`\n📊 检查的采购记录数量: ${purchases.length}`);
    
    let unsplashCount = 0;
    let svgCount = 0;
    let otherCount = 0;
    
    for (const purchase of purchases) {
      let photos = purchase.photos;
      
      // 解析photos字段
      if (typeof photos === 'string') {
        try {
          photos = JSON.parse(photos);
        } catch (e) {
          // 如果不是JSON，可能是单个URL
        }
      }
      
      // 检查图片类型
      let imageType = 'unknown';
      if (typeof photos === 'string') {
        if (photos.includes('unsplash')) {
          imageType = 'unsplash';
          unsplashCount++;
        } else if (photos.includes('data:image/svg+xml')) {
          imageType = 'svg';
          svgCount++;
        } else {
          imageType = 'other';
          otherCount++;
        }
      } else if (Array.is_array(photos)) {
        const hasUnsplash = photos.some(url => typeof url === 'string' && url.includes('unsplash'));
        const hasSvg = photos.some(url => typeof url === 'string' && url.includes('data:image/svg+xml'));
        
        if (hasUnsplash) {
          imageType = 'unsplash';
          unsplashCount++;
        } else if (hasSvg) {
          imageType = 'svg';
          svgCount++;
        } else {
          imageType = 'other';
          otherCount++;
        }
      }
      
      console.log(`${purchase.purchase_code}: ${imageType} - ${purchase.product_name}`);
    }
    
    console.log('\n📊 图片类型统计:');
    console.log(`  Unsplash图片: ${unsplashCount} 条`);
    console.log(`  SVG图片: ${svgCount} 条`);
    console.log(`  其他图片: ${otherCount} 条`);
    
    // 检查SKU图片
    const [skus] = await connection.execute(`
      SELECT sku_code, sku_name, photos 
      FROM product_skus 
      ORDER BY createdAt DESC 
      LIMIT 10
    `);
    
    console.log(`\n📊 最新SKU图片检查 (${skus.length}条):`);
    
    for (const sku of skus) {
      let photos = sku.photos;
      
      // 解析photos字段
      if (typeof photos === 'string') {
        try {
          photos = JSON.parse(photos);
        } catch (e) {
          // 如果不是JSON，可能是单个URL
        }
      }
      
      let imageType = 'unknown';
      if (typeof photos === 'string') {
        if (photos.includes('unsplash')) {
          imageType = 'unsplash ❌';
        } else if (photos.includes('data:image/svg+xml')) {
          imageType = 'svg ✅';
        } else {
          imageType = 'other';
        }
      } else if (Array.is_array(photos)) {
        const hasUnsplash = photos.some(url => typeof url === 'string' && url.includes('unsplash'));
        const hasSvg = photos.some(url => typeof url === 'string' && url.includes('data:image/svg+xml'));
        
        if (hasUnsplash) {
          imageType = 'unsplash ❌';
        } else if (hasSvg) {
          imageType = 'svg ✅';
        } else {
          imageType = 'other';
        }
      }
      
      console.log(`${sku.sku_code}: ${imageType}`);
    }
    
    if (unsplashCount === 0) {
      console.log('\n🎉 修复成功！所有指定的采购记录都不再使用Unsplash图片');
    } else {
      console.log(`\n⚠️  仍有 ${unsplashCount} 条记录使用Unsplash图片`);
    }
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error);
  } finally {
    await connection.end();
  }
}

// 执行验证
verifyImageFix().catch(console.error);