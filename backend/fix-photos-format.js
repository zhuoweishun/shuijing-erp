import mysql from 'mysql2/promise';

async function fixPhotosFormat() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('修复photos字段格式...');
    
    // 查找所有photos字段不是JSON数组格式的记录
    const [rows] = await connection.execute(`
      SELECT id, purchaseCode, productName, photos 
      FROM purchases 
      WHERE photos IS NOT NULL 
      AND photos != ''
    `);

    console.log(`检查 ${rows.length} 条记录的photos格式`);
    
    let fixedCount = 0;
    
    for (const row of rows) {
      let needsFix = false;
      let newPhotos = null;
      
      try {
        // 尝试解析为JSON
        const parsed = JSON.parse(row.photos);
        if (Array.isArray(parsed)) {
          // 检查数组中是否有null或空值
          if (parsed.length === 0 || parsed[0] === null || parsed[0] === '') {
            needsFix = true;
          }
        } else {
          needsFix = true;
        }
      } catch (e) {
        // 解析失败，说明是字符串格式
        if (typeof row.photos === 'string' && row.photos.startsWith('http')) {
          newPhotos = [row.photos];
          needsFix = true;
        }
      }
      
      if (needsFix) {
        if (!newPhotos) {
          // 如果没有有效的图片URL，设置为空数组
          newPhotos = [];
        }
        
        await connection.execute(
          'UPDATE purchases SET photos = ? WHERE id = ?',
          [JSON.stringify(newPhotos), row.id]
        );
        console.log(`✓ 修复 ${row.purchaseCode} - 格式化photos字段`);
        fixedCount++;
      }
    }
    
    console.log(`\n格式修复完成！共修复了 ${fixedCount} 条记录`);
    
    // 再次验证
    const [emptyPhotoRows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE photos IS NULL 
      OR photos = '' 
      OR JSON_LENGTH(photos) = 0
    `);

    const [hasPhotoRows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE photos IS NOT NULL 
      AND photos != '' 
      AND JSON_LENGTH(photos) > 0
    `);

    console.log(`\n验证结果:`);
    console.log(`没有图片的记录: ${emptyPhotoRows[0].count}`);
    console.log(`有图片的记录: ${hasPhotoRows[0].count}`);
    
  } catch (error) {
    console.error('修复过程中出错:', error);
  } finally {
    await connection.end();
  }
}

fixPhotosFormat();