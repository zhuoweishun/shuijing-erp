import mysql from 'mysql2/promise';

async function checkRemainingBadUrls() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('检查数据库中剩余的错误图片URL...');
    
    // 查找所有包含错误URL的记录
    const [rows] = await connection.execute(`
      SELECT purchaseCode, productName, photos 
      FROM purchases 
      WHERE photos IS NOT NULL 
      AND photos != '' 
      AND (
        JSON_EXTRACT(photos, '$') LIKE '%trae-api-sg.mchost.guru%' 
        OR JSON_EXTRACT(photos, '$') LIKE '%lf-cdn.trae.ai%' 
        OR JSON_EXTRACT(photos, '$') LIKE '%text_to_image%'
      )
      ORDER BY updatedAt DESC
    `);

    console.log(`找到 ${rows.length} 条包含错误URL的记录:`);
    
    if (rows.length > 0) {
      rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.purchaseCode} - ${row.productName}`);
        console.log(`   Photos: ${row.photos}`);
        console.log('');
      });
      
      console.log('\n需要清理这些错误的URL...');
      
      // 清理这些错误的URL
      const [result] = await connection.execute(`
        UPDATE purchases 
        SET photos = JSON_ARRAY() 
        WHERE photos IS NOT NULL 
        AND photos != '' 
        AND (
          JSON_EXTRACT(photos, '$') LIKE '%trae-api-sg.mchost.guru%' 
          OR JSON_EXTRACT(photos, '$') LIKE '%lf-cdn.trae.ai%' 
          OR JSON_EXTRACT(photos, '$') LIKE '%text_to_image%'
        )
      `);
      
      console.log(`已清理 ${result.affectedRows} 条记录的错误URL`);
    } else {
      console.log('没有找到包含错误URL的记录');
    }
    
  } catch (error) {
    console.error('检查过程中出错:', error);
  } finally {
    await connection.end();
  }
}

checkRemainingBadUrls();