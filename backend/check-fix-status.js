import mysql from 'mysql2/promise';

async function checkFixStatus() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('检查修复状态...');
    
    // 问题采购编号列表
    const problemCodes = [
      'CG20250831498682', 'CG20250831126842', 'CG20250831903937', 
      'CG20250831989114', 'CG20250831492351', 'CG20250831531810', 
      'CG20250831263295', 'CG20250831955817', 'CG20250831949918',
      'CG20250831806055', 'CG20250831886477', 'CG20250831022476'
    ];
    
    // 重新查询这些记录
    const placeholders = problemCodes.map(() => '?').join(',');
    const [rows] = await connection.execute(
      `SELECT purchaseCode, productName, photos FROM purchases WHERE purchaseCode IN (${placeholders}) ORDER BY purchaseCode`,
      problemCodes
    );
    
    console.log(`找到 ${rows.length} 条记录\n`);
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const row of rows) {
      console.log(`${row.purchaseCode} - ${row.productName}`);
      console.log(`Photos原始值: ${row.photos}`);
      console.log(`Photos类型: ${typeof row.photos}`);
      
      try {
        const photosStr = String(row.photos);
        const parsed = JSON.parse(photosStr);
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`✅ 格式正确: ${parsed[0]}`);
          validCount++;
        } else {
          console.log(`❌ 数组为空: ${JSON.stringify(parsed)}`);
          invalidCount++;
        }
      } catch (e) {
        console.log(`❌ JSON解析失败: ${e.message}`);
        invalidCount++;
        
        // 如果仍然是字符串格式，再次尝试修复
        const photosStr = String(row.photos);
        if (photosStr.startsWith('http')) {
          console.log(`🔧 尝试再次修复...`);
          const photoArray = [photosStr];
          
          await connection.execute(
            'UPDATE purchases SET photos = ? WHERE purchaseCode = ?',
            [JSON.stringify(photoArray), row.purchaseCode]
          );
          
          console.log(`✅ 重新修复完成: ${JSON.stringify(photoArray)}`);
        }
      }
      
      console.log('');
    }
    
    console.log(`=== 总结 ===`);
    console.log(`有效记录: ${validCount}`);
    console.log(`无效记录: ${invalidCount}`);
    
  } catch (error) {
    console.error('检查过程中出错:', error);
  } finally {
    await connection.end();
  }
}

checkFixStatus();