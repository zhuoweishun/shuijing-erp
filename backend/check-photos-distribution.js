import mysql from 'mysql2/promise';

async function checkPhotosDistribution() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('=== 检查SKU photos字段分布 ===');
    
    // 1. 按photos值分组统计
    const [distribution] = await connection.execute(`
      SELECT photos, COUNT(*) as count
      FROM product_skus 
      GROUP BY photos
    `);
    
    console.log('\nSKU photos字段分组统计:');
    distribution.for_each(row => {
      console.log(`photos值: ${JSON.stringify(row.photos)} - 数量: ${row.count}`);
    });
    
    // 2. 检查photos字段的具体内容
    console.log('\n=== 详细检查photos字段内容 ===');
    const [samples] = await connection.execute(`
      SELECT 
        sku_name,
        photos,
        LENGTH(photos) as photo_length,
        photos IS NULL as is_null,
        photos = 'null' as is_string_null,
        photos = '' as is_empty
      FROM product_skus 
      LIMIT 5
    `);
    
    samples.for_each((row, index) => {
      console.log(`${index + 1}. ${row.sku_name}`);
      console.log(`   photos: ${row.photos}`);
      console.log(`   长度: ${row.photo_length}`);
      console.log(`   是否NULL: ${row.is_null}`);
      console.log(`   是否字符串null: ${row.is_string_null}`);
      console.log(`   是否空字符串: ${row.is_empty}`);
      console.log('---');
    });
    
    // 3. 检查实际的photos内容类型
    console.log('\n=== 检查photos内容类型 ===');
    const [contentCheck] = await connection.execute(`
      SELECT 
        CASE 
          WHEN photos IS NULL THEN 'NULL值'
          WHEN photos = 'null' THEN '字符串null'
          WHEN photos = '' THEN '空字符串'
          WHEN photos LIKE '[%]' THEN 'JSON数组格式'
          ELSE '其他格式'
        END as photo_type,
        COUNT(*) as count
      FROM product_skus
      GROUP BY 
        CASE 
          WHEN photos IS NULL THEN 'NULL值'
          WHEN photos = 'null' THEN '字符串null'
          WHEN photos = '' THEN '空字符串'
          WHEN photos LIKE '[%]' THEN 'JSON数组格式'
          ELSE '其他格式'
        END
    `);
    
    console.log('photos内容类型分布:');
    contentCheck.for_each(row => {
      console.log(`${row.photo_type}: ${row.count}个`);
    });
    
  } finally {
    await connection.end();
  }
}

checkPhotosDistribution().catch(console.error);