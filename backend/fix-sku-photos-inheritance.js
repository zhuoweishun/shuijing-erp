import fetch from 'node-fetch';
import mysql from 'mysql2/promise';

// API配置
const API_BASE_URL = 'http://localhost:3001/api/v1';
let authToken = null;

// 获取认证token
async function getAuthToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'boss',
        password: '123456'
      })
    });
    
    const result = await response.json();
    if (result.success) {
      authToken = result.data.token;
      console.log('✅ 认证成功');
      return true;
    } else {
      console.error('❌ 认证失败:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 认证请求失败:', error.message);
    return false;
  }
}

// 修复SKU图片继承问题
async function fixSkuPhotosInheritance() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔧 开始修复SKU图片继承问题...');
    
    // 1. 查找今天创建的SKU及其关联的原材料
    const [skuMaterials] = await connection.execute(`
      SELECT DISTINCT
        ps.id as sku_id,
        ps.sku_code,
        ps.sku_name,
        ps.photos as current_photos,
        GROUP_CONCAT(DISTINCT p.photos) as material_photos,
        COUNT(DISTINCT mu.purchase_id) as material_count
      FROM product_skus ps
      JOIN material_usage mu ON ps.id = mu.product_id
      JOIN purchases p ON mu.purchase_id = p.id
      WHERE DATE(ps.created_at) = CURDATE()
        AND p.photos IS NOT NULL 
        AND p.photos != ''
        AND p.photos != 'null'
      GROUP BY ps.id, ps.sku_code, ps.sku_name, ps.photos
      ORDER BY ps.created_at DESC
    `);
    
    console.log(`找到 ${skuMaterials.length} 个需要修复图片的SKU`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const sku of skuMaterials) {
      try {
        // 检查当前SKU是否已有图片
        let hasValidPhotos = false;
        if (sku.current_photos) {
          try {
            const currentPhotosArray = JSON.parse(sku.current_photos);
            hasValidPhotos = Array.is_array(currentPhotosArray) && currentPhotosArray.length > 0;
          } catch (e) {
            // 解析失败，认为没有有效图片
          }
        }
        
        if (hasValidPhotos) {
          console.log(`⏭️  跳过 ${sku.sku_code}: 已有图片`);
          skippedCount++;
          continue;
        }
        
        // 收集所有原材料的图片
        const allPhotos = [];
        const materialPhotosArray = sku.material_photos.split(',');
        
        for (const photoStr of materialPhotosArray) {
          if (photoStr && photoStr !== 'null' && photoStr !== '') {
            try {
              const photos = JSON.parse(photo_str);
              if (Array.is_array(photos)) {
                allPhotos.push(...photos);
              }
            } catch (e) {
              // 如果不是JSON格式，可能是单个URL
              if (photoStr.startsWith('http') || photoStr.startsWith('/uploads')) {
                allPhotos.push(photo_str);
              }
            }
          }
        }
        
        // 去重并过滤有效图片
        const uniquePhotos = [...new Set(allPhotos)].filter(photo => 
          photo && photo !== 'null' && photo !== ''
        );
        
        if (uniquePhotos.length > 0) {
          // 更新SKU的图片
          const photosJson = JSON.stringify(uniquePhotos);
          await connection.execute(
            'UPDATE product_skus SET photos = ? WHERE id = ?',
            [photosJson, sku.sku_id]
          );
          
          console.log(`✅ 修复 ${sku.sku_code}: 继承了 ${uniquePhotos.length} 张图片`);
          fixedCount++;
        } else {
          console.log(`⚠️  ${sku.sku_code}: 原材料没有有效图片`);
          skippedCount++;
        }
        
      } catch (error) {
        console.error(`❌ 修复 ${sku.sku_code} 失败:`, error.message);
      }
    }
    
    console.log(`\n📊 修复统计:`);
    console.log(`✅ 成功修复: ${fixedCount} 个SKU`);
    console.log(`⏭️  跳过: ${skippedCount} 个SKU`);
    
    // 2. 验证修复结果
    console.log('\n🔍 验证修复结果...');
    const [verifyResults] = await connection.execute(`
      SELECT 
        ps.sku_code,
        ps.sku_name,
        ps.photos,
        CASE 
          WHEN ps.photos IS NULL OR ps.photos = '' OR ps.photos = 'null' THEN '无图片'
          ELSE '有图片'
        END as photo_status
      FROM product_skus ps
      WHERE DATE(ps.created_at) = CURDATE()
      ORDER BY ps.created_at DESC
      LIMIT 20
    `);
    
    console.log('\n📋 前20个SKU的图片状态:');
    verifyResults.for_each((result, index) => {
      console.log(`${index + 1}. ${result.sku_code} - ${result.photo_status}`);
      if (result.photos && result.photos !== 'null' && result.photos !== '') {
        try {
          const photosArray = JSON.parse(result.photos);
          console.log(`   图片数量: ${photosArray.length}`);
        } catch (e) {
          console.log(`   图片格式异常`);
        }
      }
    });
    
    // 3. 统计图片继承情况
    const [photoStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_skus,
        SUM(CASE WHEN photos IS NOT NULL AND photos != '' AND photos != 'null' THEN 1 ELSE 0 END) as skus_with_photos,
        SUM(CASE WHEN photos IS NULL OR photos = '' OR photos = 'null' THEN 1 ELSE 0 END) as skus_without_photos
      FROM product_skus 
      WHERE DATE(createdAt) = CURDATE()
    `);
    
    const stats = photoStats[0];
    console.log(`\n📈 图片继承统计:`);
    console.log(`总SKU数: ${stats.total_skus}`);
    console.log(`有图片的SKU: ${stats.skus_with_photos}`);
    console.log(`无图片的SKU: ${stats.skus_without_photos}`);
    console.log(`图片继承率: ${((stats.skus_with_photos / stats.total_skus) * 100).to_fixed(2)}%`);
    
    console.log('\n🎉 SKU图片继承修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
  } finally {
    await connection.end();
  }
}

// 主函数
async function main() {
  console.log('🎯 开始修复SKU图片继承问题...');
  
  // 1. 获取认证token
  const authSuccess = await getAuthToken();
  if (!authSuccess) {
    console.error('❌ 认证失败，无法继续');
    return;
  }
  
  // 2. 修复图片继承
  await fixSkuPhotosInheritance();
}

// 执行主函数
main().catch(console.error);