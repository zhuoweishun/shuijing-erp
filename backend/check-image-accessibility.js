import mysql from 'mysql2/promise';
import fetch from 'node-fetch';

async function checkImageAccessibility() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 检查采购记录中图片URL的可访问性...');
    
    // 查询所有有图片的采购记录
    const [rows] = await connection.execute(`
      SELECT 
        id, 
        purchase_code, 
        product_name,
        photos
      FROM purchases 
      WHERE photos IS NOT NULL 
        AND JSON_LENGTH(photos) > 0
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n📊 检查 ${rows.length} 条记录的图片可访问性：`);
    console.log('=' .repeat(80));
    
    let accessibleCount = 0;
    let inaccessibleCount = 0;
    let exampleUrlCount = 0;
    let invalidUrlCount = 0;
    
    for (const row of rows) {
      console.log(`\n🏷️  采购编号: ${row.purchase_code}`);
      console.log(`📦 产品名称: ${row.product_name}`);
      
      try {
        const photos = typeof row.photos === 'string' ? JSON.parse(row.photos) : row.photos;
        
        if (Array.is_array(photos) && photos.length > 0) {
          const image_url = photos[0];
          console.log(`🖼️  图片URL: ${image_url}`);
          
          // 检查是否为示例URL
          if (imageUrl.includes('example.com')) {
            exampleUrlCount++;
            console.log(`🎯 URL状态: ⚠️  示例URL（无法访问）`);
            console.log(`💡 建议: 需要替换为真实的图片URL`);
          } else if (!imageUrl.startsWith('http')) {
            invalidUrlCount++;
            console.log(`🎯 URL状态: ❌ 无效的URL格式`);
          } else {
            // 尝试访问URL
            try {
              console.log(`🔗 正在检查URL可访问性...`);
              const response = await fetch(image_url, { 
                method: 'HEAD', 
                timeout: 5000 
              });
              
              if (response.ok) {
                accessibleCount++;
                console.log(`🎯 URL状态: ✅ 可访问 (${response.status})`);
                console.log(`📏 Content-Type: ${response.headers.get('content-type') || '未知'}`);
              } else {
                inaccessibleCount++;
                console.log(`🎯 URL状态: ❌ 不可访问 (${response.status})`);
              }
            } catch (error) {
              inaccessibleCount++;
              console.log(`🎯 URL状态: ❌ 访问失败 (${error.message})`);
            }
          }
        } else {
          console.log(`📭 图片状态: 无图片数据`);
        }
      } catch (error) {
        console.log(`❌ 解析photos字段失败: ${error.message}`);
      }
      
      console.log('-'.repeat(60));
    }
    
    // 统计总结
    console.log(`\n📈 图片URL检查总结：`);
    console.log('=' .repeat(50));
    console.log(`📊 检查记录数: ${rows.length}`);
    console.log(`✅ 可访问URL: ${accessibleCount}`);
    console.log(`❌ 不可访问URL: ${inaccessibleCount}`);
    console.log(`⚠️  示例URL: ${exampleUrlCount}`);
    console.log(`🚫 无效URL格式: ${invalidUrlCount}`);
    
    // 检查是否需要修复
    if (exampleUrlCount > 0) {
      console.log(`\n🔧 发现问题：`);
      console.log(`   - ${exampleUrlCount} 条记录使用示例URL，无法正常显示图片`);
      console.log(`   - 建议：需要上传真实图片或使用占位图片`);
      
      console.log(`\n💡 解决方案：`);
      console.log(`   1. 使用图片生成API创建占位图片`);
      console.log(`   2. 上传真实的产品图片`);
      console.log(`   3. 使用默认的产品类型图片`);
    }
    
    if (inaccessibleCount > 0) {
      console.log(`\n⚠️  ${inaccessibleCount} 条记录的图片URL无法访问`);
    }
    
    // 查询全库示例URL数量
    const [exampleCount] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM purchases 
      WHERE photos LIKE '%example.com%'
    `);
    
    console.log(`\n🔍 全库扫描：`);
    console.log(`📊 使用示例URL的记录总数: ${exampleCount[0].count}`);
    
    if (exampleCount[0].count > 0) {
      console.log(`\n🚨 这是导致采购列表图片无法显示的主要原因！`);
      console.log(`💡 建议立即修复这些示例URL`);
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

checkImageAccessibility().catch(console.error);