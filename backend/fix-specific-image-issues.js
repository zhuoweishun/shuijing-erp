import mysql from 'mysql2/promise';

async function fixSpecificImageIssues() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 检查特定CG编号的图片问题...');
    
    // 用户反映的问题记录
    const problemCodes = [
      'CG20250903002',
      'CG20250831001', 
      'CG20250831005'
    ];
    
    console.log(`\n📋 检查指定的${problemCodes.length}个CG编号:`);
    problemCodes.for_each(code => console.log(`  - ${code}`));
    
    let fixedCount = 0;
    let totalProblems = 0;
    
    // 检查指定的CG编号
    for (const code of problemCodes) {
      console.log(`\n🔍 检查 ${code}:`);
      
      const [rows] = await connection.execute(
        'SELECT id, purchase_code, product_name, photos FROM purchases WHERE purchase_code = ?',
        [code]
      );
      
      if (rows.length === 0) {
        console.log(`  ❌ 未找到记录`);
        continue;
      }
      
      const record = rows[0];
      console.log(`  📦 产品: ${record.product_name}`);
      console.log(`  🖼️  当前photos: ${record.photos}`);
      
      let needsFix = false;
      let currentPhotos = record.photos;
      
      // 检查photos字段问题
      if (!currentPhotos) {
        console.log(`  ❌ 问题: photos字段为空`);
        needsFix = true;
      } else if (typeof currentPhotos === 'string') {
        try {
          const parsed = JSON.parse(currentPhotos);
          if (Array.is_array(parsed)) {
            if (parsed.length === 0) {
              console.log(`  ❌ 问题: photos数组为空`);
              needsFix = true;
            } else {
              // 检查URL是否有效
              const firstUrl = parsed[0];
              if (firstUrl.includes('via.placeholder.com') || 
                  firstUrl.includes('trae-api-sg.mchost.guru') ||
                  !firstUrl.startsWith('http')) {
                console.log(`  ❌ 问题: 包含无效URL - ${firstUrl}`);
                needsFix = true;
              } else {
                console.log(`  ✅ photos格式正确`);
              }
            }
          } else {
            console.log(`  ❌ 问题: photos不是数组格式`);
            needsFix = true;
          }
        } catch (e) {
          console.log(`  ❌ 问题: JSON解析失败 - ${e.message}`);
          needsFix = true;
        }
      } else {
        console.log(`  ❌ 问题: photos字段类型错误`);
        needsFix = true;
      }
      
      if (needsFix) {
        totalProblems++;
        
        // 生成新的占位图片
        const newPhotoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZjNmNGY2Ii8+CjxyZWN0IHg9IjEwMCIgeT0iMTUwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzZiNzI4MCIgcng9IjgiLz4KPHN2ZyB4PSIxNzAiIHk9IjE3MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiPgo8cGF0aCBkPSJtMTUgOSA2IDZtLTYtNiA2LTZtLTYgNiA2IDZtLTYtNkw5IDNtNiA2TDMgOSIgc3Ryb2tlPSIjZjNmNGY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPHR4dCB4PSIyMDAiIHk9IjI4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Qcm9kdWN0IEltYWdlPC90eHQ+Cjwvc3ZnPgo=';
        
        const newPhotos = JSON.stringify([newPhotoUrl]);
        
        await connection.execute(
          'UPDATE purchases SET photos = ? WHERE id = ?',
          [newPhotos, record.id]
        );
        
        console.log(`  ✅ 已修复: 使用本地占位图片`);
        fixedCount++;
      }
    }
    
    // 查找所有类似问题的记录
    console.log(`\n🔍 查找所有图片问题记录...`);
    
    const [allRows] = await connection.execute(`
      SELECT id, purchase_code, product_name, photos 
      FROM purchases 
      WHERE photos IS NULL 
         OR photos = '' 
         OR photos = '[]'
         OR photos LIKE '%via.placeholder.com%'
         OR photos LIKE '%trae-api-sg.mchost.guru%'
      ORDER BY purchase_code
    `);
    
    console.log(`\n📊 发现 ${allRows.length} 条有图片问题的记录:`);
    
    for (const record of allRows) {
      console.log(`\n🔧 修复 ${record.purchase_code}: ${record.product_name}`);
      
      const newPhotoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZjNmNGY2Ii8+CjxyZWN0IHg9IjEwMCIgeT0iMTUwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzZiNzI4MCIgcng9IjgiLz4KPHN2ZyB4PSIxNzAiIHk9IjE3MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiPgo8cGF0aCBkPSJtMTUgOSA2IDZtLTYtNiA2LTZtLTYgNiA2IDZtLTYtNkw5IDNtNiA2TDMgOSIgc3Ryb2tlPSIjZjNmNGY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPHR4dCB4PSIyMDAiIHk9IjI4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Qcm9kdWN0IEltYWdlPC90eHQ+Cjwvc3ZnPgo=';
      const newPhotos = JSON.stringify([newPhotoUrl]);
      
      await connection.execute(
        'UPDATE purchases SET photos = ? WHERE id = ?',
        [newPhotos, record.id]
      );
      
      totalProblems++;
      fixedCount++;
    }
    
    // 最终验证
    console.log(`\n🔍 最终验证...`);
    
    const [verifyRows] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM purchases 
      WHERE photos IS NULL 
         OR photos = '' 
         OR photos = '[]'
         OR photos LIKE '%via.placeholder.com%'
         OR photos LIKE '%trae-api-sg.mchost.guru%'
    `);
    
    const remainingProblems = verifyRows[0].count;
    
    console.log(`\n📊 修复完成统计:`);
    console.log(`  🔧 总问题记录数: ${totalProblems}`);
    console.log(`  ✅ 成功修复数: ${fixedCount}`);
    console.log(`  ❌ 剩余问题数: ${remainingProblems}`);
    console.log(`  📈 修复成功率: ${totalProblems > 0 ? ((fixedCount / totalProblems) * 100).to_fixed(1) : 0}%`);
    
    if (remainingProblems === 0) {
      console.log(`\n🎉 所有图片问题已修复完成！`);
    } else {
      console.log(`\n⚠️  仍有 ${remainingProblems} 条记录存在图片问题`);
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

fixSpecificImageIssues().catch(console.error);