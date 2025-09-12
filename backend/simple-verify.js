import mysql from 'mysql2/promise';

async function simpleVerify() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    const [rows] = await connection.execute(`
      SELECT sku_code, sku_name, photos, materialSignature
      FROM product_skus 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('最新5个SKU的图片情况:');
    
    for (const row of rows) {
      console.log(`\n${row.sku_code} - ${row.sku_name}`);
      
      // 判断制作模式
      let mode = '未知';
      try {
        const signature = JSON.parse(row.material_signature);
        mode = signature.length === 1 ? '直接转化' : '组合制作';
      } catch (e) {}
      
      console.log(`制作模式: ${mode}`);
      
      if (row.photos) {
        try {
          const photos = JSON.parse(row.photos);
          console.log(`图片数量: ${photos.length}`);
          
          photos.for_each((url, index) => {
            if (url.includes('data:image/svg+xml')) {
              if (url.includes('组合手串')) {
                console.log(`  [${index}] 组合风格占位图`);
              } else {
                console.log(`  [${index}] 单色占位图`);
              }
            } else {
              console.log(`  [${index}] 真实图片: ${url.substring(0, 50)}...`);
            }
          });
        } catch (e) {
          console.log('图片数据解析失败');
        }
      } else {
        console.log('无图片数据');
      }
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

simpleVerify();