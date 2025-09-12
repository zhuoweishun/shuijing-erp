import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

// 更新SKU图片
async function updateSkuPhotos() {
  const connection = await mysql.create_connection(dbConfig);
  
  try {
    console.log('🔄 更新SKU图片...');
    
    // 获取所有使用Unsplash图片的SKU
    const [skus] = await connection.execute(`
      SELECT id, sku_code, sku_name, photos, materialSignature, description
      FROM product_skus 
      WHERE photos LIKE '%unsplash%'
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 找到 ${skus.length} 个SKU使用Unsplash图片`);
    
    let updatedCount = 0;
    
    for (const sku of skus) {
      try {
        // 解析materialSignature来找到原材料
        let materialSignature;
        if (typeof sku.material_signature === 'string') {
          materialSignature = JSON.parse(sku.material_signature);
        } else {
          materialSignature = sku.material_signature;
        }
        
        let newPhotos = [];
        
        // 如果是直接转化（description包含"直接转化自"）
        if (sku.description && sku.description.includes('直接转化自')) {
          // 从description中提取原材料名称
          const match = sku.description.match(/直接转化自(.+?)，/);
          if (match) {
            const material_name = match[1].trim();
            
            // 查找对应的采购记录
            const [purchases] = await connection.execute(
              'SELECT photos FROM purchases WHERE product_name = ? AND photos NOT LIKE "%unsplash%"',
              [material_name]
            );
            
            if (purchases.length > 0) {
              let purchasePhotos = purchases[0].photos;
              if (typeof purchasePhotos === 'string') {
                try {
                  purchasePhotos = JSON.parse(purchasePhotos);
                } catch (e) {
                  purchasePhotos = [purchasePhotos];
                }
              }
              newPhotos = Array.is_array(purchasePhotos) ? purchasePhotos : [purchasePhotos];
            }
          }
        } else {
          // 组合模式：从materialSignature中获取所有材料的图片
          const allPhotos = [];
          
          if (materialSignature && typeof materialSignature === 'object') {
            for (const [material_name, quantity] of Object.entries(material_signature)) {
              if (quantity > 0) {
                const [purchases] = await connection.execute(
                  'SELECT photos FROM purchases WHERE product_name = ? AND photos NOT LIKE "%unsplash%"',
                  [material_name]
                );
                
                if (purchases.length > 0) {
                  let purchasePhotos = purchases[0].photos;
                  if (typeof purchasePhotos === 'string') {
                    try {
                      purchasePhotos = JSON.parse(purchasePhotos);
                    } catch (e) {
                      purchasePhotos = [purchasePhotos];
                    }
                  }
                  
                  if (Array.is_array(purchasePhotos)) {
                    allPhotos.push(...purchasePhotos);
                  } else {
                    allPhotos.push(purchasePhotos);
                  }
                }
              }
            }
          }
          
          // 去重并取前3张图片
          newPhotos = [...new Set(allPhotos)].slice(0, 3);
        }
        
        // 更新SKU图片
        if (newPhotos.length > 0) {
          const photosToUpdate = newPhotos.length === 1 ? newPhotos[0] : JSON.stringify(newPhotos);
          
          await connection.execute(
            'UPDATE product_skus SET photos = ? WHERE id = ?',
            [photosToUpdate, sku.id]
          );
          
          updatedCount++;
          console.log(`✅ ${sku.sku_code}: 更新了 ${newPhotos.length} 张图片`);
        } else {
          console.log(`⚠️  ${sku.sku_code}: 未找到可用图片`);
        }
        
      } catch (error) {
        console.error(`❌ 处理SKU ${sku.sku_code} 时出错:`, error.message);
      }
    }
    
    console.log(`\n🎉 图片更新完成！共更新了 ${updatedCount} 个SKU`);
    
    // 验证更新结果
    const [remainingUnsplash] = await connection.execute(`
      SELECT COUNT(*) as count FROM product_skus WHERE photos LIKE '%unsplash%'
    `);
    
    console.log(`\n📊 剩余使用Unsplash图片的SKU: ${remainingUnsplash[0].count} 个`);
    
    if (remainingUnsplash[0].count === 0) {
      console.log('🎉 所有SKU图片已成功更新！');
    }
    
  } catch (error) {
    console.error('❌ 更新SKU图片时发生错误:', error);
  } finally {
    await connection.end();
  }
}

// 执行更新
updateSkuPhotos().catch(console.error);