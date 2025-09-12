import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

// 验证图片显示效果
async function verifyImageDisplay() {
  const connection = await mysql.create_connection(dbConfig);
  
  try {
    console.log('🔍 验证图片显示效果...');
    
    // 检查采购记录的图片
    console.log('\n📋 采购记录图片验证:');
    const [purchases] = await connection.execute(`
      SELECT purchase_code, product_name, photos 
      FROM purchases 
      ORDER BY purchase_code
    `);
    
    console.log(`找到 ${purchases.length} 条采购记录`);
    
    for (const purchase of purchases) {
      try {
        const photos = JSON.parse(purchase.photos);
        console.log(`✅ ${purchase.purchase_code} (${purchase.product_name}): ${photos.length}张图片`);
        photos.for_each((photo, index) => {
          console.log(`   📸 图片${index + 1}: ${photo}`);
        });
      } catch (e) {
        console.log(`❌ ${purchase.purchase_code}: 图片数据格式错误 - ${purchase.photos}`);
      }
    }
    
    // 检查SKU记录的图片
    console.log('\n🎯 SKU记录图片验证:');
    const [skus] = await connection.execute(`
      SELECT skuCode, sku_name, photos 
      FROM product_skus 
      ORDER BY sku_code
    `);
    
    console.log(`找到 ${skus.length} 条SKU记录`);
    
    for (const sku of skus) {
      try {
        if (sku.photos) {
          const photos = JSON.parse(sku.photos);
          console.log(`✅ ${sku.sku_code} (${sku.sku_name}): ${photos.length}张图片`);
          photos.for_each((photo, index) => {
            console.log(`   📸 图片${index + 1}: ${photo}`);
          });
        } else {
          console.log(`⚠️ ${sku.sku_code}: 无图片数据`);
        }
      } catch (e) {
        console.log(`❌ ${sku.sku_code}: 图片数据格式错误 - ${sku.photos}`);
      }
    }
    
    // 统计图片类型
    console.log('\n📊 图片类型统计:');
    let svgCount = 0;
    let httpCount = 0;
    let otherCount = 0;
    
    for (const purchase of purchases) {
      try {
        const photos = JSON.parse(purchase.photos);
        for (const photo of photos) {
          if (photo.includes('.svg')) {
            svgCount++;
          } else if (photo.startsWith('http')) {
            httpCount++;
          } else {
            otherCount++;
          }
        }
      } catch (e) {
        otherCount++;
      }
    }
    
    for (const sku of skus) {
      try {
        if (sku.photos) {
          const photos = JSON.parse(sku.photos);
          for (const photo of photos) {
            if (photo.includes('.svg')) {
              svgCount++;
            } else if (photo.startsWith('http')) {
              httpCount++;
            } else {
              otherCount++;
            }
          }
        }
      } catch (e) {
        otherCount++;
      }
    }
    
    console.log(`📈 SVG图片: ${svgCount}张`);
    console.log(`🌐 HTTP图片: ${httpCount}张`);
    console.log(`❓ 其他格式: ${otherCount}张`);
    
    // 检查图片继承逻辑
    console.log('\n🔗 图片继承逻辑验证:');
    
    // 检查直接转化SKU（前15个）
    const directSkus = skus.slice(0, 15);
    console.log(`\n🎯 直接转化SKU (${directSkus.length}个):`);
    
    for (const sku of directSkus) {
      try {
        const skuPhotos = sku.photos ? JSON.parse(sku.photos) : [];
        const materialSignature = await connection.execute(
          'SELECT materialSignature FROM product_skus WHERE id = ?',
          [sku.id || `sku_${Date.now()}_${skus.index_of(sku) + 1}`]
        );
        
        console.log(`✅ ${sku.sku_code}: 继承了 ${skuPhotos.length} 张图片`);
      } catch (e) {
        console.log(`❌ ${sku.sku_code}: 继承逻辑检查失败`);
      }
    }
    
    // 检查组合SKU（后4个）
    const comboSkus = skus.slice(15);
    console.log(`\n🎨 组合SKU (${comboSkus.length}个):`);
    
    for (const sku of comboSkus) {
      try {
        const skuPhotos = sku.photos ? JSON.parse(sku.photos) : [];
        console.log(`✅ ${sku.sku_code}: 组合了 ${skuPhotos.length} 张图片`);
      } catch (e) {
        console.log(`❌ ${sku.sku_code}: 组合逻辑检查失败`);
      }
    }
    
    console.log('\n✅ 图片显示验证完成！');
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 执行验证
verifyImageDisplay().catch(console.error);