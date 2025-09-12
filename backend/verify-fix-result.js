import mysql from 'mysql2/promise';

async function verifyFixResult() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    const problemCodes = [
      'CG20250813004',
      'CG20250813005', 
      'CG20250809004',
      'CG20250808003',
      'CG20250820001',
      'CG20250818005',
      'CG20250902001'
    ];
    
    console.log('验证修复结果...');
    
    for (const code of problemCodes) {
      const [rows] = await connection.execute(
        'SELECT purchase_code, product_name, photos FROM purchases WHERE purchase_code = ?',
        [code]
      );
      
      if (rows.length > 0) {
        const row = rows[0];
        console.log(`\n${code}: ${row.product_name}`);
        console.log(`photos字段类型: ${typeof row.photos}`);
        
        let photosArray = [];
        
        // 处理不同的数据类型
        if (Array.is_array(row.photos)) {
          photosArray = row.photos;
          console.log(`直接数组长度: ${photosArray.length}`);
        } else if (typeof row.photos === 'string') {
          try {
            photosArray = JSON.parse(row.photos);
            console.log(`解析后数组长度: ${photosArray.length}`);
          } catch (e) {
            console.log(`JSON解析失败: ${e.message}`);
          }
        } else {
          console.log(`未知的photos字段类型: ${typeof row.photos}`);
        }
        
        if (photosArray.length > 0) {
          console.log(`第一个元素类型: ${typeof photosArray[0]}`);
          console.log(`第一个元素前50字符: ${photosArray[0].substring(0, 50)}...`);
        }
        
        const hasValidPhoto = photosArray.length > 0 && photosArray[0] && typeof photosArray[0] === 'string' && photosArray[0].trim() !== '';
        console.log(`有效图片: ${hasValidPhoto ? '是' : '否'}`);
      } else {
        console.log(`${code}: 未找到记录`);
      }
    }
    
  } catch (error) {
    console.error('验证过程中出错:', error);
  } finally {
    await connection.end();
  }
}

verifyFixResult().catch(console.error);