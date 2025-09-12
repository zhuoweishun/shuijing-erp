import mysql from 'mysql2/promise';

async function fixWithPlaceholder() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔧 使用占位图片修复图片URL...');
    
    // 查询所有记录，统一使用占位图片
    const [rows] = await connection.execute(`
      SELECT 
        id, 
        purchase_code, 
        product_name,
        product_type,
        photos
      FROM purchases 
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n📊 处理 ${rows.length} 条记录，使用统一占位图片`);
    console.log('=' .repeat(80));
    
    let fixedCount = 0;
    
    // 使用简单的占位图片URL
    const placeholderUrl = 'https://via.placeholder.com/400x400/f3f4f6/6b7280?text=Product+Image';
    
    for (const row of rows) {
      console.log(`\n🏷️  处理: ${row.purchase_code} - ${row.product_name}`);
      
      try {
        console.log(`🖼️  设置占位图片: ${placeholderUrl}`);
        
        // 更新数据库
        const newPhotos = JSON.stringify([placeholderUrl]);
        await connection.execute(
          'UPDATE purchases SET photos = ? WHERE id = ?',
          [newPhotos, row.id]
        );
        
        console.log(`✅ 已更新`);
        fixedCount++;
        
      } catch (error) {
        console.log(`❌ 修复失败: ${error.message}`);
      }
    }
    
    console.log(`\n📈 修复完成统计：`);
    console.log('=' .repeat(50));
    console.log(`✅ 成功修复: ${fixedCount} 条`);
    console.log(`📊 总处理数: ${rows.length} 条`);
    
    // 测试占位图片URL的可访问性
    console.log(`\n🧪 测试占位图片URL的可访问性...`);
    try {
      const response = await fetch(placeholderUrl, { method: 'GET', timeout: 5000 });
      if (response.ok) {
        console.log(`✅ 占位图片URL可正常访问 (${response.status})`);
        console.log(`📏 Content-Type: ${response.headers.get('content-type') || '未知'}`);
        console.log(`📐 Content-Length: ${response.headers.get('content-length') || '未知'}`);
      } else {
        console.log(`❌ 占位图片URL不可访问 (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ 占位图片URL访问失败: ${error.message}`);
    }
    
    console.log(`\n💡 修复说明：`);
    console.log(`   - 使用via.placeholder.com提供的占位图片服务`);
    console.log(`   - 图片尺寸: 400x400像素`);
    console.log(`   - 背景色: #f3f4f6 (浅灰色)`);
    console.log(`   - 文字色: #6b7280 (深灰色)`);
    console.log(`   - 显示文字: "Product Image"`);
    console.log(`   - 这些图片应该能在采购列表中正常显示`);
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

fixWithPlaceholder().catch(console.error);