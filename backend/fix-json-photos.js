import mysql from 'mysql2/promise';

async function fixJsonPhotos() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('修复JSON类型的photos字段...');
    
    // 问题采购编号列表
    const problemCodes = [
      'CG20250831498682', 'CG20250831126842', 'CG20250831903937', 
      'CG20250831989114', 'CG20250831492351', 'CG20250831531810', 
      'CG20250831263295', 'CG20250831955817', 'CG20250831949918',
      'CG20250831806055', 'CG20250831886477', 'CG20250831022476'
    ];
    
    console.log(`处理 ${problemCodes.length} 个问题记录...\n`);
    
    // 查询这些记录，使用CAST转换JSON为字符串
    const placeholders = problemCodes.map(() => '?').join(',');
    const [rows] = await connection.execute(
      `SELECT id, purchaseCode, productName, CAST(photos AS CHAR) as photos_str FROM purchases WHERE purchaseCode IN (${placeholders})`,
      problemCodes
    );
    
    let fixedCount = 0;
    
    for (const row of rows) {
      console.log(`处理: ${row.purchaseCode} - ${row.productName}`);
      console.log(`当前photos_str: ${row.photos_str}`);
      
      // 检查是否是URL字符串格式
      if (row.photos_str && row.photos_str.startsWith('http')) {
        // 创建JSON数组
        const photoArray = [row.photos_str];
        
        // 使用JSON_ARRAY函数直接更新
        await connection.execute(
          'UPDATE purchases SET photos = JSON_ARRAY(?) WHERE id = ?',
          [row.photos_str, row.id]
        );
        
        console.log(`✅ 已修复为JSON数组: ${JSON.stringify(photoArray)}`);
        fixedCount++;
      } else {
        console.log('⏭️  跳过: 不是URL字符串格式');
      }
      
      console.log('');
    }
    
    console.log(`修复完成！共修复了 ${fixedCount} 条记录`);
    
    // 验证修复结果
    console.log('\n=== 验证修复结果 ===');
    const [verifyRows] = await connection.execute(
      `SELECT purchaseCode, productName, photos, JSON_EXTRACT(photos, '$[0]') as first_photo FROM purchases WHERE purchaseCode IN (${placeholders})`,
      problemCodes
    );
    
    let successCount = 0;
    let failCount = 0;
    
    for (const row of verifyRows) {
      console.log(`\n${row.purchaseCode} - ${row.productName}`);
      console.log(`Photos JSON: ${JSON.stringify(row.photos)}`);
      console.log(`第一张图片: ${row.first_photo}`);
      
      if (row.first_photo && row.first_photo.startsWith('http')) {
        console.log('✅ 修复成功');
        successCount++;
      } else {
        console.log('❌ 修复失败');
        failCount++;
      }
    }
    
    console.log(`\n=== 最终结果 ===`);
    console.log(`修复成功: ${successCount}`);
    console.log(`修复失败: ${failCount}`);
    
  } catch (error) {
    console.error('修复过程中出错:', error);
  } finally {
    await connection.end();
  }
}

fixJsonPhotos();