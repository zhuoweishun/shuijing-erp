import mysql from 'mysql2/promise';

async function verifySkuImages() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 验证新创建SKU的图片数据...');
    
    // 获取最新创建的SKU
    const [skus] = await connection.execute(`
      SELECT 
        sku_code, 
        sku_name, 
        photos,
        materialSignature,
        created_at
      FROM product_skus 
      WHERE DATE(created_at) = CURDATE()
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`\n📊 找到${skus.length}个今日创建的SKU:`);
    
    let directTransformCount = 0;
    let comboModeCount = 0;
    let hasRealImagesCount = 0;
    let hasPlaceholderCount = 0;
    
    for (const sku of skus) {
      console.log(`\n${sku.sku_code} - ${sku.sku_name}:`);
      
      // 分析制作模式
      let materialCount = 0;
      try {
        const signature = JSON.parse(sku.material_signature);
        materialCount = signature.length;
      } catch (e) {
        console.log('  ⚠️  无法解析materialSignature');
      }
      
      const mode = materialCount === 1 ? '直接转化' : '组合制作';
      console.log(`  🔧 制作模式: ${mode} (${materialCount}种原材料)`);
      
      if (materialCount === 1) {
        directTransformCount++;
      } else {
        comboModeCount++;
      }
      
      // 分析图片数据
      if (sku.photos) {
        try {
          const photos = JSON.parse(sku.photos);
          if (Array.is_array(photos)) {
            console.log(`  📸 图片数量: ${photos.length}张`);
            
            let hasRealImages = false;
            photos.for_each((url, index) => {
              if (url.startsWith('data:image/svg+xml')) {
                if (url.includes('组合手串') || url.includes('珠子')) {
                  console.log(`    [${index}]: 占位图片 (${url.includes('组合手串') ? '组合风格' : '单色风格'})`);
                } else {
                  console.log(`    [${index}]: SVG图片`);
                }
              } else if (url.startsWith('http')) {
                console.log(`    [${index}]: 网络图片 - ${url.substring(0, 50)}...`);
                hasRealImages = true;
              } else {
                console.log(`    [${index}]: 其他格式 - ${url.substring(0, 30)}...`);
              }
            });
            
            if (hasRealImages) {
              hasRealImagesCount++;
            } else {
              hasPlaceholderCount++;
            }
          } else {
            console.log(`  ❌ 图片数据格式错误: 非数组`);
          }
        } catch (e) {
          console.log(`  ❌ 图片数据解析失败: ${e.message}`);
        }
      } else {
        console.log(`  ❌ 无图片数据`);
      }
    }
    
    console.log('\n📈 统计结果:');
    console.log(`直接转化模式: ${directTransformCount}个`);
    console.log(`组合制作模式: ${comboModeCount}个`);
    console.log(`包含真实图片: ${hasRealImagesCount}个`);
    console.log(`仅有占位图片: ${hasPlaceholderCount}个`);
    
    // 检查原材料图片情况
    console.log('\n🔍 检查原材料图片情况:');
    const [purchases] = await connection.execute(`
      SELECT purchase_code, product_name, photos
      FROM purchases 
      WHERE photos IS NOT NULL 
      LIMIT 5
    `);
    
    console.log(`找到${purchases.length}个有图片的采购记录:`);
    purchases.for_each(purchase => {
      console.log(`${purchase.purchase_code} - ${purchase.product_name}: ${purchase.photos ? '有图片' : '无图片'}`);
    });
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await connection.end();
  }
}