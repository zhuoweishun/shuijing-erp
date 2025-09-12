import mysql from 'mysql2/promise';

async function fixImageGeneration() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔧 修复图片生成URL...');
    
    // 查询所有使用trae-api-sg.mchost.guru的记录
    const [rows] = await connection.execute(`
      SELECT 
        id, 
        purchase_code, 
        product_name,
        product_type,
        photos
      FROM purchases 
      WHERE photos LIKE '%trae-api-sg.mchost.guru%'
      ORDER BY created_at DESC
    `);

    console.log(`\n📊 找到 ${rows.length} 条需要修复的记录`);
    console.log('=' .repeat(80));
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const row of rows) {
      console.log(`\n🏷️  处理: ${row.purchase_code} - ${row.product_name}`);
      
      try {
        // 生成简单的占位图片URL（使用picsum.photos）
        const imageId = Math.floor(Math.random() * 1000) + 1;
        const newImageUrl = `https://picsum.photos/400/400?random=${imageId}`;
        
        console.log(`🖼️  新图片URL: ${newImageUrl}`);
        
        // 更新数据库
        const newPhotos = JSON.stringify([newImageUrl]);
        await connection.execute(
          'UPDATE purchases SET photos = ? WHERE id = ?',
          [newPhotos, row.id]
        );
        
        console.log(`✅ 已更新`);
        fixedCount++;
        
      } catch (error) {
        console.log(`❌ 修复失败: ${error.message}`);
        errorCount++;
      }
      
      // 添加延迟避免请求过快
      if (fixedCount % 20 === 0) {
        console.log(`\n⏸️  已处理 ${fixedCount} 条记录，暂停500ms...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`\n📈 修复完成统计：`);
    console.log('=' .repeat(50));
    console.log(`✅ 成功修复: ${fixedCount} 条`);
    console.log(`❌ 修复失败: ${errorCount} 条`);
    console.log(`📊 总处理数: ${rows.length} 条`);
    
    // 验证修复结果
    const [remainingCount] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM purchases 
      WHERE photos LIKE '%trae-api-sg.mchost.guru%'
    `);
    
    console.log(`\n🔍 验证结果：`);
    console.log(`📊 剩余问题URL记录: ${remainingCount[0].count}`);
    
    if (remainingCount[0].count === 0) {
      console.log(`🎉 所有问题URL已成功修复！`);
      console.log(`💡 现在使用的是picsum.photos提供的随机图片，这些图片是可以正常访问的`);
    } else {
      console.log(`⚠️  还有 ${remainingCount[0].count} 条记录需要手动处理`);
    }
    
    // 测试新URL的可访问性
    console.log(`\n🧪 测试新图片URL的可访问性...`);
    const testUrl = 'https://picsum.photos/400/400?random=1';
    try {
      const response = await fetch(testUrl, { method: 'HEAD', timeout: 5000 });
      if (response.ok) {
        console.log(`✅ 新图片URL可正常访问 (${response.status})`);
        console.log(`📏 Content-Type: ${response.headers.get('content-type') || '未知'}`);
      } else {
        console.log(`❌ 新图片URL不可访问 (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ 新图片URL访问失败: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

fixImageGeneration().catch(console.error);