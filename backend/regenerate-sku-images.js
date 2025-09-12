import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

// 重新生成SKU图片
async function regenerateSkuImages() {
  const connection = await mysql.create_connection(dbConfig);
  
  try {
    console.log('🔄 重新生成SKU图片...');
    
    // 获取所有SKU
    const [skus] = await connection.execute(`
      SELECT id, sku_code, sku_name, sourceType, sourceIds, photos
      FROM product_skus 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 找到 ${skus.length} 个SKU需要更新图片`);
    
    let updatedCount = 0;
    
    for (const sku of skus) {
      let newPhotos = [];
      
      try {
        const sourceIds = JSON.parse(sku.sourceIds);
        
        if (sku.source_type === 'direct') {
          // 直接转化：继承库存记录的图片
          const inventoryId = sourceIds[0];
          const [inventoryRecords] = await connection.execute(
            'SELECT purchase_code FROM inventory WHERE id = ?',
            [inventoryId]
          );
          
          if (inventoryRecords.length > 0) {
            const purchase_code = inventoryRecords[0].purchase_code;
            const [purchaseRecords] = await connection.execute(
              'SELECT photos FROM purchases WHERE purchase_code = ?',
              [purchase_code]
            );
            
            if (purchaseRecords.length > 0) {
              let purchasePhotos = purchaseRecords[0].photos;
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
        } else if (sku.source_type === 'combination') {
          // 组合模式：收集所有相关图片
          const allPhotos = [];
          
          for (const inventoryId of sourceIds) {
            const [inventoryRecords] = await connection.execute(
              'SELECT purchase_code FROM inventory WHERE id = ?',
              [inventoryId]
            );
            
            if (inventoryRecords.length > 0) {
              const purchase_code = inventoryRecords[0].purchase_code;
              const [purchaseRecords] = await connection.execute(
                'SELECT photos FROM purchases WHERE purchase_code = ?',
                [purchase_code]
              );
              
              if (purchaseRecords.length > 0) {
                let purchasePhotos = purchaseRecords[0].photos;
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
          
          // 去重并取前3张图片
          newPhotos = [...new Set(allPhotos)].slice(0, 3);
        }
        
        // 更新SKU图片
        if (newPhotos.length > 0) {
          await connection.execute(
            'UPDATE product_skus SET photos = ? WHERE id = ?',
            [JSON.stringify(newPhotos), sku.id]
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
    const [updatedSkus] = await connection.execute(`
      SELECT sku_code, photos 
      FROM product_skus 
      ORDER BY createdAt DESC 
      LIMIT 5
    `);
    
    console.log('\n📊 验证更新结果（最新5个SKU）:');
    for (const sku of updatedSkus) {
      let photos = sku.photos;
      if (typeof photos === 'string') {
        try {
          photos = JSON.parse(photos);
        } catch (e) {
          // 保持原样
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
          imageType = `svg ✅ (${photos.length}张)`;
        } else {
          imageType = 'other';
        }
      }
      
      console.log(`${sku.sku_code}: ${imageType}`);
    }
    
  } catch (error) {
    console.error('❌ 重新生成SKU图片时发生错误:', error);
  } finally {
    await connection.end();
  }
}

// 执行重新生成
regenerateSkuImages().catch(console.error);