import mysql from 'mysql2/promise';

async function finalFixPhotos() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔧 最终修复photos字段格式...');
    
    // 查询所有photos字段不是有效JSON数组的记录
    const [rows] = await connection.execute(`
      SELECT 
        id, 
        purchase_code, 
        product_name,
        photos
      FROM purchases 
      WHERE photos IS NOT NULL 
        AND (JSON_VALID(photos) = 0 OR JSON_TYPE(photos) != 'ARRAY')
      ORDER BY created_at DESC
    `);

    console.log(`\n📊 找到 ${rows.length} 条需要修复的记录`);
    
    if (rows.length === 0) {
      console.log('🎉 所有记录的photos字段格式都正确！');
      
      // 检查一些示例记录
      const [samples] = await connection.execute(`
        SELECT 
          purchase_code,
          product_name,
          photos
        FROM purchases 
        ORDER BY created_at DESC
        LIMIT 3
      `);
      
      console.log('\n📋 示例记录检查:');
      for (const sample of samples) {
        console.log(`\n🏷️  ${sample.purchase_code} - ${sample.product_name}`);
        console.log(`📸 Photos原始值: ${sample.photos}`);
        console.log(`📏 Photos长度: ${sample.photos ? sample.photos.length : 0}`);
        console.log(`🔍 Photos类型: ${typeof sample.photos}`);
        
        try {
          if (typeof sample.photos === 'string') {
            if (sample.photos.startsWith('[')) {
              // 尝试解析为JSON
              const parsed = JSON.parse(sample.photos);
              console.log(`✅ JSON解析成功: ${JSON.stringify(parsed)}`);
            } else {
              // 直接的URL字符串
              console.log(`🔗 直接URL字符串: ${sample.photos}`);
              console.log(`⚠️  需要转换为JSON数组格式`);
            }
          } else {
            console.log(`📄 非字符串类型: ${sample.photos}`);
          }
        } catch (error) {
          console.log(`❌ 处理失败: ${error.message}`);
        }
      }
      
      return;
    }
    
    console.log('=' .repeat(80));
    
    let fixedCount = 0;
    const placeholderUrl = 'https://via.placeholder.com/400x400/f3f4f6/6b7280?text=Product+Image';
    
    for (const row of rows) {
      console.log(`\n🏷️  处理: ${row.purchase_code} - ${row.product_name}`);
      console.log(`📸 当前photos值: ${row.photos}`);
      
      try {
        let newPhotos;
        
        if (typeof row.photos === 'string') {
          if (row.photos.startsWith('http')) {
            // 直接的URL字符串，转换为JSON数组
            newPhotos = JSON.stringify([row.photos]);
            console.log(`🔄 转换URL字符串为JSON数组`);
          } else {
            // 其他字符串格式，使用占位图片
            newPhotos = JSON.stringify([placeholderUrl]);
            console.log(`🖼️  使用占位图片`);
          }
        } else {
          // 非字符串类型，使用占位图片
          newPhotos = JSON.stringify([placeholderUrl]);
          console.log(`🖼️  使用占位图片`);
        }
        
        console.log(`📝 新photos值: ${new_photos}`);
        
        // 更新数据库
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
    
    // 最终验证
    const [finalCheck] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN JSON_VALID(photos) = 1 AND JSON_TYPE(photos) = 'ARRAY' THEN 1 ELSE 0 END) as valid_arrays
      FROM purchases 
      WHERE photos IS NOT NULL
    `);
    
    const finalStats = finalCheck[0];
    console.log(`\n🔍 最终验证：`);
    console.log(`📊 总记录数: ${finalStats.total}`);
    console.log(`✅ 有效JSON数组: ${finalStats.valid_arrays}`);
    console.log(`🏆 成功率: ${(finalStats.valid_arrays / finalStats.total * 100).to_fixed(1)}%`);
    
    if (finalStats.valid_arrays === finalStats.total) {
      console.log(`\n🎉 所有photos字段都已修复为正确的JSON数组格式！`);
      console.log(`💡 采购列表中的图片现在应该能正常显示了`);
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

finalFixPhotos().catch(console.error);