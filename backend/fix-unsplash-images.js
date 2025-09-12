import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

// 替代图片URL列表（使用可靠的图片源）
const alternativeImages = [
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMTAwQzI1NS4yMjggMTAwIDMwMCAxNDQuNzcyIDMwMCAyMDBDMzAwIDI1NS4yMjggMjU1LjIyOCAzMDAgMjAwIDMwMEMxNDQuNzcyIDMwMCAxMDAgMjU1LjIyOCAxMDAgMjAwQzEwMCAxNDQuNzcyIDE0NC43NzIgMTAwIDIwMCAxMDBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yMDAgMTQwQzIzMy4xMzcgMTQwIDI2MCAyMDYuODYzIDI2MCAyNDBDMjYwIDI3My4xMzcgMjMzLjEzNyAzMDAgMjAwIDMwMEMxNjYuODYzIDMwMCAxNDAgMjczLjEzNyAxNDAgMjQwQzE0MCAyMDYuODYzIDE2Ni44NjMgMTQwIDIwMCAxNDBaIiBmaWxsPSIjNjM3NEU4Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMzUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMzc0MTUxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPuawtOaZtuWOn+adkDwvdGV4dD4KPC9zdmc+',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRkVGM0Y0Ii8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjIwMCIgcj0iODAiIGZpbGw9IiNGRDdBODUiLz4KPGNpcmNsZSBjeD0iMjAwIiBjeT0iMjAwIiByPSI0MCIgZmlsbD0iI0VGNDQ0NCIvPgo8dGV4dCB4PSIyMDAiIHk9IjM1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzM3NDE1MSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2Ij7nuqLnuqLnkLM8L3RleHQ+Cjwvc3ZnPg==',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjBGREY0Ii8+CjxwYXRoIGQ9Ik0yMDAgMTAwTDI4MCAyMDBMMjAwIDMwMEwxMjAgMjAwTDIwMCAxMDBaIiBmaWxsPSIjMzRENTY4Ii8+CjxwYXRoIGQ9Ik0yMDAgMTQwTDI0MCAyMDBMMjAwIDI2MEwxNjAgMjAwTDIwMCAxNDBaIiBmaWxsPSIjMTBCOTgxIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMzUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMzc0MTUxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPue+oeawtOaZtjwvdGV4dD4KPC9zdmc+',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRkVGN0VEIi8+CjxyZWN0IHg9IjEyMCIgeT0iMTIwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI0Y1OUUwQiIvPgo8cmVjdCB4PSIxNDAiIHk9IjE0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNEOTI2MDYiLz4KPHR5ZXh0IHg9IjIwMCIgeT0iMzUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMzc0MTUxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPuWNl+e6ouawtDwvdGV4dD4KPC9zdmc+',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRkFGQUZBIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjIwMCIgcj0iMTAwIiBmaWxsPSIjRTVFN0VCIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjIwMCIgcj0iNjAiIGZpbGw9IiM5Q0EzQUYiLz4KPHR5ZXh0IHg9IjIwMCIgeT0iMzUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMzc0MTUxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPueZveawtOaZtjwvdGV4dD4KPC9zdmc+'
];

// 获取随机替代图片
function getRandomAlternativeImage() {
  return alternativeImages[Math.floor(Math.random() * alternativeImages.length)];
}

// 修复Unsplash图片URL
async function fixUnsplashImages() {
  const connection = await mysql.create_connection(dbConfig);
  
  try {
    console.log('🔍 查找使用Unsplash图片的采购记录...');
    
    // 查找所有使用Unsplash图片的采购记录
    const [purchases] = await connection.execute(`
      SELECT purchase_code, product_name, photos 
      FROM purchases 
      WHERE photos LIKE '%unsplash%'
      ORDER BY purchase_code
    `);
    
    console.log(`📊 找到 ${purchases.length} 条使用Unsplash图片的记录`);
    
    if (purchases.length === 0) {
      console.log('✅ 没有找到使用Unsplash图片的记录');
      return;
    }
    
    console.log('\n🔧 开始修复图片URL...');
    
    for (const purchase of purchases) {
      try {
        let photos = purchase.photos;
        let needsUpdate = false;
        
        // 解析photos字段
        if (typeof photos === 'string') {
          try {
            photos = JSON.parse(photos);
          } catch (e) {
            // 如果不是JSON，可能是单个URL
            if (photos.includes('unsplash')) {
              photos = getRandomAlternativeImage();
              needsUpdate = true;
            }
          }
        }
        
        // 如果是数组，检查每个URL
        if (Array.is_array(photos)) {
          const newPhotos = photos.map(url => {
            if (typeof url === 'string' && url.includes('unsplash')) {
              needsUpdate = true;
              return getRandomAlternativeImage();
            }
            return url;
          });
          
          if (needsUpdate) {
            photos = newPhotos;
          }
        }
        
        // 如果需要更新，执行数据库更新
        if (needsUpdate) {
          const photosJson = Array.is_array(photos) ? JSON.stringify(photos) : photos;
          
          await connection.execute(
            'UPDATE purchases SET photos = ? WHERE purchase_code = ?',
            [photosJson, purchase.purchase_code]
          );
          
          console.log(`✅ 已修复: ${purchase.purchase_code} - ${purchase.product_name}`);
        }
        
      } catch (error) {
        console.error(`❌ 修复失败 ${purchase.purchase_code}:`, error.message);
      }
    }
    
    console.log('\n🎉 图片URL修复完成！');
    
    // 验证修复结果
    const [remainingUnsplash] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE photos LIKE '%unsplash%'
    `);
    
    console.log(`📊 修复后仍有 ${remainingUnsplash[0].count} 条记录使用Unsplash图片`);
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
  } finally {
    await connection.end();
  }
}

// 执行修复
fixUnsplashImages().catch(console.error);