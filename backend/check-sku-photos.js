import mysql from 'mysql2/promise';

async function checkSkuPhotos() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('=== 检查SKU的photos字段内容 ===');
    
    // 查询最新的10个SKU
    const [rows] = await connection.execute(`
      SELECT id, sku_name, photos 
      FROM product_skus 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`找到 ${rows.length} 个SKU`);
    console.log('');
    
    rows.for_each((row, index) => {
      console.log(`${index + 1}. SKU: ${row.sku_name}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Photos: ${row.photos}`);
      console.log(`   Photos类型: ${typeof row.photos}`);
      
      // 尝试解析JSON
      if (row.photos) {
        try {
          const parsed = JSON.parse(row.photos);
          console.log(`   解析后: ${JSON.stringify(parsed)}`);
          console.log(`   是否为数组: ${Array.is_array(parsed)}`);
          if (Array.is_array(parsed)) {
            console.log(`   数组长度: ${parsed.length}`);
          }
        } catch (e) {
          console.log(`   JSON解析失败: ${e.message}`);
        }
      }
      console.log('---');
    });
    
    // 统计有photos的SKU数量
    const [countResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN photos IS NOT NULL AND photos != '' THEN 1 END) as with_photos
      FROM product_skus
    `);
    
    console.log('\n=== 统计信息 ===');
    console.log(`总SKU数量: ${countResult[0].total}`);
    console.log(`有photos字段的SKU: ${countResult[0].with_photos}`);
    
  } finally {
    await connection.end();
  }
}

checkSkuPhotos().catch(console.error);