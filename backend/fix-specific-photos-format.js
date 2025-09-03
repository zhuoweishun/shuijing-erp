import mysql from 'mysql2/promise';

async function fixSpecificPhotosFormat() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('修复特定采购记录的photos字段格式...');
    
    // 问题采购编号列表
    const problemCodes = [
      'CG20250831498682', 'CG20250831126842', 'CG20250831903937', 
      'CG20250831989114', 'CG20250831492351', 'CG20250831531810', 
      'CG20250831263295', 'CG20250831955817', 'CG20250831949918',
      'CG20250831806055', 'CG20250831886477', 'CG20250831022476'
    ];
    
    console.log(`处理 ${problemCodes.length} 个问题记录...\n`);
    
    // 查询这些记录
    const placeholders = problemCodes.map(() => '?').join(',');
    const [rows] = await connection.execute(
      `SELECT id, purchaseCode, productName, photos FROM purchases WHERE purchaseCode IN (${placeholders})`,
      problemCodes
    );
    
    let fixedCount = 0;
    
    for (const row of rows) {
      console.log(`处理: ${row.purchaseCode} - ${row.productName}`);
      console.log(`当前photos: ${row.photos}`);
      
      // 强制转换为字符串并检查是否需要修复
        const photosStr = String(row.photos);
        let needsFix = false;
        
        try {
          JSON.parse(photosStr);
          console.log('⏭️  跳过: 已是有效JSON格式');
        } catch (e) {
          // JSON解析失败，说明是字符串格式，需要修复
          if (photosStr && photosStr.startsWith('http')) {
            needsFix = true;
            console.log('🔧 需要修复: 检测到URL字符串格式');
          } else {
            console.log(`⚠️  跳过: 无法处理的格式 - typeof=${typeof row.photos}, value=${photosStr}`);
          }
        }
      
      if (needsFix) {
         // 转换为JSON数组格式
         const photoArray = [photosStr];
        
        await connection.execute(
          'UPDATE purchases SET photos = ? WHERE id = ?',
          [JSON.stringify(photoArray), row.id]
        );
        
        console.log(`✅ 已修复: ${JSON.stringify(photoArray)}`);
        fixedCount++;
      }
      
      console.log('');
    }
    
    console.log(`修复完成！共修复了 ${fixedCount} 条记录`);
    
    // 验证修复结果
    console.log('\n=== 验证修复结果 ===');
    const [verifyRows] = await connection.execute(
      `SELECT purchaseCode, productName, photos FROM purchases WHERE purchaseCode IN (${placeholders})`,
      problemCodes
    );
    
    for (const row of verifyRows) {
      console.log(`\n${row.purchaseCode} - ${row.productName}`);
      try {
        const photos = JSON.parse(row.photos);
        if (Array.isArray(photos) && photos.length > 0) {
          console.log(`✅ 格式正确: ${photos[0]}`);
        } else {
          console.log('❌ 数组为空或无效');
        }
      } catch (e) {
        console.log(`❌ 仍然无法解析: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('修复过程中出错:', error);
  } finally {
    await connection.end();
  }
}

fixSpecificPhotosFormat();