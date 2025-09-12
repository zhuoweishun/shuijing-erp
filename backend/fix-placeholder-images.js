import mysql from 'mysql2/promise';

async function fixPlaceholderImages() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔧 修复占位图片URL问题...');
    
    // 查找所有使用via.placeholder.com的记录
    const [rows] = await connection.execute(`
      SELECT id, purchase_code, photos 
      FROM purchases 
      WHERE JSON_EXTRACT(photos, '$[0]') LIKE '%via.placeholder.com%'
    `);
    
    console.log(`📊 找到 ${rows.length} 条使用via.placeholder.com的记录`);
    
    if (rows.length === 0) {
      console.log('✅ 没有需要修复的记录');
      return;
    }
    
    let fixedCount = 0;
    
    for (const row of rows) {
      console.log(`\n🔍 处理采购记录: ${row.purchase_code}`);
      
      // 使用更可靠的占位图片服务
      // 方案1: 使用picsum.photos（更稳定）
      const newImageUrl = 'https://picsum.photos/400/400?grayscale&blur=1';
      
      // 方案2: 使用本地base64占位图片（最可靠）
      const base64Placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD1cIjQwMFwiIGhlaWdodD1cIjQwMFwiIHZpZXdCb3g9XCIwIDAgNDAwIDQwMFwiIGZpbGw9XCJub25lXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPgo8cmVjdCB3aWR0aD1cIjQwMFwiIGhlaWdodD1cIjQwMFwiIGZpbGw9XCIjRjNGNEY2XCIvPgo8dGV4dCB4PVwiMjAwXCIgeT1cIjIwMFwiIGZvbnQtZmFtaWx5PVwiQXJpYWwsIHNhbnMtc2VyaWZcIiBmb250LXNpemU9XCIxNlwiIGZpbGw9XCIjNkI3MjgwXCIgdGV4dC1hbmNob3I9XCJtaWRkbGVcIiBkeT1cIi4zZW1cIj7kuqflk4Hlm77niYc8L3RleHQ+Cjwvc3ZnPgo=';
      
      // 优先使用base64占位图片（最可靠）
      const finalImageUrl = base64Placeholder;
      
      // 更新photos字段
      const newPhotos = JSON.stringify([finalImageUrl]);
      
      await connection.execute(
        'UPDATE purchases SET photos = ? WHERE id = ?',
        [newPhotos, row.id]
      );
      
      console.log(`✅ 已修复为本地base64占位图片`);
      fixedCount++;
    }
    
    console.log(`\n🎉 修复完成！共修复了 ${fixedCount} 条记录`);
    
    // 验证修复结果
    console.log('\n🔍 验证修复结果...');
    const [verifyRows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE JSON_EXTRACT(photos, '$[0]') LIKE '%via.placeholder.com%'
    `);
    
    if (verifyRows[0].count === 0) {
      console.log('✅ 验证通过：所有via.placeholder.com链接已被替换');
    } else {
      console.log(`❌ 验证失败：仍有 ${verifyRows[0].count} 条记录使用via.placeholder.com`);
    }
    
    // 显示当前使用的图片类型统计
    console.log('\n📊 当前图片类型统计:');
    const [statsRows] = await connection.execute(`
      SELECT 
        CASE 
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'data:image%' THEN 'Base64占位图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'https://picsum.photos%' THEN 'Picsum占位图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'http://localhost%' THEN '本地上传图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'http://192.168%' THEN '局域网图片'
          ELSE '其他类型'
        END as image_type,
        COUNT(*) as count
      FROM purchases 
      WHERE photos IS NOT NULL AND JSON_LENGTH(photos) > 0
      GROUP BY image_type
      ORDER BY count DESC
    `);
    
    statsRows.for_each(row => {
      console.log(`  ${row.image_type}: ${row.count} 条记录`);
    });
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

// 执行修复
fixPlaceholderImages().catch(console.error);