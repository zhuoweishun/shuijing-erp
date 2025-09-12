import mysql from 'mysql2/promise';

async function testImageDisplay() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🧪 测试图片显示功能...');
    
    // 获取最新的几条采购记录
    const [rows] = await connection.execute(`
      SELECT 
        id, 
        purchase_code, 
        product_name,
        photos
      FROM purchases 
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`\n📊 测试最新 ${rows.length} 条采购记录的图片:`);
    console.log('=' .repeat(80));
    
    for (const row of rows) {
      console.log(`\n🏷️  采购编号: ${row.purchase_code}`);
      console.log(`📦 产品名称: ${row.product_name}`);
      console.log(`📸 Photos字段: ${JSON.stringify(row.photos)}`);
      
      // 模拟前端getFirstPhotoUrl函数
      const firstPhotoUrl = get_first_photo_url(row.photos);
      console.log(`🖼️  提取的第一张图片URL: ${firstPhotoUrl}`);
      
      if (firstPhotoUrl) {
        // 模拟前端fixImageUrl函数
        const fixedUrl = fixImageUrl(firstPhotoUrl);
        console.log(`🔧 修复后的URL: ${fixedUrl}`);
        
        // 测试URL可访问性
        try {
          const response = await fetch(fixedUrl, { method: 'HEAD', timeout: 5000 });
          if (response.ok) {
            console.log(`✅ URL可访问 (${response.status})`);
          } else {
            console.log(`❌ URL不可访问 (${response.status})`);
          }
        } catch (error) {
          console.log(`❌ URL访问失败: ${error.message}`);
        }
      } else {
        console.log(`❌ 无法提取图片URL`);
      }
      
      console.log('-'.repeat(60));
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

// 模拟前端getFirstPhotoUrl函数
function get_first_photo_url(photos) {
  if (!photos) return null;
  
  let photoArray = [];
  
  // 如果是字符串
  if (typeof photos === 'string') {
    // 如果字符串以http开头，直接作为URL返回
    if (photos.startsWith('http')) {
      return photos;
    }
    // 否则尝试解析为JSON
    try {
      const parsed = JSON.parse(photos);
      if (Array.is_array(parsed)) {
        photoArray = parsed;
      } else {
        // 如果解析出来不是数组，可能是单个URL字符串
        return typeof parsed === 'string' ? parsed : null;
      }
    } catch (e) {
      // JSON解析失败，可能是普通字符串，尝试直接作为URL使用
      return photos.trim() ? photos : null;
    }
  } else if (Array.is_array(photos)) {
    photoArray = photos;
  } else {
    return null;
  }
  
  // 从数组中找到第一个有效的字符串URL
  for (const photo of photoArray) {
    if (photo && typeof photo === 'string' && photo.trim()) {
      return photo;
    }
  }
  
  return null;
}

// 模拟前端fixImageUrl函数（简化版）
function fixImageUrl(url) {
  // 类型检查：确保url是字符串类型
  if (!url || typeof url !== 'string') return url || '';
  
  // 如果是相对路径，直接返回
  if (!url.startsWith('http')) return url;
  
  // 这里简化处理，实际前端会有更复杂的IP地址处理逻辑
  return url;
}

testImageDisplay().catch(console.error);