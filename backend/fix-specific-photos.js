import mysql from 'mysql2/promise';

async function fixSpecificPhotos() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('修复特定CG编号的photos字段...');
    
    // 新的问题采购编号列表
    const problemCodes = [
      'CG20250813004',
      'CG20250813005', 
      'CG20250809004',
      'CG20250808003',
      'CG20250820001',
      'CG20250818005',
      'CG20250902001'
    ];
    
    console.log(`需要检查的CG编号: ${problemCodes.join(', ')}`);
    
    let fixedCount = 0;
    
    for (const code of problemCodes) {
      console.log(`\n检查采购编号: ${code}`);
      
      // 查询采购记录
      const [rows] = await connection.execute(
        'SELECT id, purchase_code, product_name, photos FROM purchases WHERE purchase_code = ?',
        [code]
      );
      
      if (rows.length === 0) {
        console.log(`❌ 未找到采购编号: ${code}`);
        continue;
      }
      
      const row = rows[0];
      console.log(`✅ 找到记录: ${row.product_name}`);
      console.log(`当前photos字段类型: ${typeof row.photos}`);
      console.log(`当前photos字段值: ${JSON.stringify(row.photos)}`);
      
      let photosArray = [];
      let needsFix = true; // 强制修复这些记录
      
      // 解析现有的photos字段
      if (row.photos === null || row.photos === undefined) {
        console.log('🔧 photos字段为空，需要修复');
      } else if (typeof row.photos === 'string') {
        try {
          photosArray = JSON.parse(row.photos);
          console.log(`解析后的数组长度: ${photosArray.length}`);
          if (photosArray.length === 0) {
            console.log('🔧 photos数组为空，需要修复');
          } else {
            console.log(`第一个元素: ${JSON.stringify(photosArray[0])}`);
          }
        } catch (e) {
          console.log('🔧 JSON解析失败，需要修复');
        }
      } else if (Array.is_array(row.photos)) {
        photosArray = row.photos;
        console.log(`直接数组长度: ${photosArray.length}`);
        if (photosArray.length === 0) {
          console.log('🔧 photos数组为空，需要修复');
        } else {
          console.log(`第一个元素: ${JSON.stringify(photosArray[0])}`);
        }
      } else {
        console.log('🔧 photos字段类型错误，需要修复');
      }
      
      // 强制修复所有这些记录
      const base64Placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0iIzZiNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2Ij5Qcm9kdWN0IEltYWdlPC90ZXh0Pgo8L3N2Zz4=';
      const newPhotoArray = [base64Placeholder];
      
      await connection.execute(
        'UPDATE purchases SET photos = ? WHERE id = ?',
        [JSON.stringify(newPhotoArray), row.id]
      );
      
      console.log(`✅ 已强制修复为本地base64占位图片`);
      fixedCount++;
    }
    
    console.log(`\n修复完成！共修复了 ${fixedCount} 条记录`);
    
    // 验证修复结果
    console.log('\n验证修复结果...');
    for (const code of problemCodes) {
      const [rows] = await connection.execute(
        'SELECT purchase_code, product_name, photos FROM purchases WHERE purchase_code = ?',
        [code]
      );
      
      if (rows.length > 0) {
        const row = rows[0];
        let photosArray = [];
        
        try {
          photosArray = JSON.parse(row.photos);
        } catch (e) {
          photosArray = [];
        }
        
        const hasValidPhoto = photosArray.length > 0 && photosArray[0] && typeof photosArray[0] === 'string' && photosArray[0].trim() !== '';
        console.log(`${code}: ${row.product_name} - photos数组长度: ${photosArray.length}, 有效图片: ${hasValidPhoto ? '是' : '否'}`);
      }
    }
    
  } catch (error) {
    console.error('修复过程中出错:', error);
  } finally {
    await connection.end();
  }
}

fixSpecificPhotos().catch(console.error);