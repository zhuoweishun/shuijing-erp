import mysql from 'mysql2/promise';

async function verifyPhotosFix() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('验证图片修复结果...');
    
    // 1. 检查还有多少记录没有图片
    const [emptyPhotoRows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE photos IS NULL 
      OR photos = '' 
      OR JSON_LENGTH(photos) = 0
    `);

    console.log(`还有 ${emptyPhotoRows[0].count} 条记录没有图片`);
    
    // 2. 检查有图片的记录数量和类型
    const [hasPhotoRows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE photos IS NOT NULL 
      AND photos != '' 
      AND JSON_LENGTH(photos) > 0
    `);

    console.log(`有图片的记录数量: ${hasPhotoRows[0].count}`);
    
    // 3. 检查本地URL和云端URL的分布
    const [localUrlRows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE photos IS NOT NULL 
      AND JSON_EXTRACT(photos, '$[0]') LIKE '%localhost:3001%'
    `);

    const [cloudUrlRows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE photos IS NOT NULL 
      AND (
        JSON_EXTRACT(photos, '$[0]') LIKE '%trae-api-sg.mchost.guru%' 
        OR JSON_EXTRACT(photos, '$[0]') LIKE '%lf-cdn.trae.ai%'
      )
    `);

    console.log(`使用本地URL的记录: ${localUrlRows[0].count}`);
    console.log(`使用云端URL的记录: ${cloudUrlRows[0].count}`);
    
    // 4. 显示一些示例记录
    const [sampleRows] = await connection.execute(`
      SELECT purchaseCode, productName, photos 
      FROM purchases 
      WHERE photos IS NOT NULL 
      AND JSON_LENGTH(photos) > 0
      ORDER BY updatedAt DESC
      LIMIT 5
    `);

    console.log('\n最近更新的5条记录示例:');
    sampleRows.forEach((row, index) => {
      try {
        const photos = JSON.parse(row.photos);
        console.log(`${index + 1}. ${row.purchaseCode} - ${row.productName}`);
        console.log(`   图片URL: ${Array.isArray(photos) ? photos[0] : photos}`);
      } catch (e) {
        console.log(`${index + 1}. ${row.purchaseCode} - ${row.productName}`);
        console.log(`   图片URL (字符串): ${row.photos}`);
      }
    });
    
  } catch (error) {
    console.error('验证过程中出错:', error);
  } finally {
    await connection.end();
  }
}

verifyPhotosFix();