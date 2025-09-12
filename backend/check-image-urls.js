import mysql from 'mysql2/promise';

async function checkImageUrls() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 检查当前图片URL格式...');
    
    // 检查前3条记录的图片URL
    const [rows] = await connection.execute(`
      SELECT purchase_code, photos 
      FROM purchases 
      WHERE photos IS NOT NULL AND JSON_LENGTH(photos) > 0
      LIMIT 5
    `);
    
    console.log(`\n📊 检查 ${rows.length} 条记录:`);
    
    rows.for_each((row, index) => {
      console.log(`\n${index + 1}. 采购编号: ${row.purchase_code}`);
      console.log(`   数据类型: ${typeof row.photos}`);
      
      let photos;
      try {
        if (typeof row.photos === 'string') {
          photos = JSON.parse(row.photos);
        } else if (Array.is_array(row.photos)) {
          photos = row.photos;
        } else {
          console.log(`   ❌ 未知的photos数据类型: ${typeof row.photos}`);
          return;
        }
        
        if (Array.is_array(photos) && photos.length > 0) {
          const firstPhoto = photos[0];
          console.log(`   图片类型: ${getImageType(firstPhoto)}`);
          console.log(`   URL前缀: ${firstPhoto.substring(0, 50)}...`);
        } else {
          console.log('   ❌ photos不是有效数组');
        }
      } catch (e) {
        console.log(`   ❌ 处理失败: ${e.message}`);
        const dataStr = typeof row.photos === 'string' ? row.photos : JSON.stringify(row.photos);
        console.log(`   原始数据: ${dataStr.substring(0, 50)}...`);
      }
    });
    
    // 统计各种图片类型
    console.log('\n📊 图片类型统计:');
    const [statsRows] = await connection.execute(`
      SELECT 
        CASE 
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'data:image%' THEN 'Base64图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'https://picsum.photos%' THEN 'Picsum图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'http://localhost%' THEN '本地图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'http://192.168%' THEN '局域网图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'https://via.placeholder.com%' THEN 'Via占位图片'
          ELSE '其他类型'
        END as image_type,
        COUNT(*) as count
      FROM purchases 
      WHERE photos IS NOT NULL AND JSON_LENGTH(photos) > 0
      GROUP BY image_type
      ORDER BY count DESC
    `);
    
    statsRows.for_each(row => {
      console.log(`  ${row.image_type}: ${row.count} 条记录`);
    });
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

function getImageType(url) {
  if (url.startsWith('data:image')) return 'Base64图片';
  if (url.includes('picsum.photos')) return 'Picsum图片';
  if (url.includes('localhost')) return '本地图片';
  if (url.includes('192.168')) return '局域网图片';
  if (url.includes('via.placeholder.com')) return 'Via占位图片';
  return '其他类型';
}

// 执行检查
checkImageUrls().catch(console.error);