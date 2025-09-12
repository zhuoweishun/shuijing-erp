import mysql from 'mysql2/promise';

async function generateImageFixReport() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('📋 生成图片修复报告...');
    console.log('=' .repeat(80));
    
    // 1. 检查photos字段格式
    console.log('\n1️⃣ Photos字段格式检查:');
    const [formatCheck] = await connection.execute(`
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN photos IS NULL THEN 1 ELSE 0 END) as null_photos,
        SUM(CASE WHEN JSON_VALID(photos) = 1 THEN 1 ELSE 0 END) as valid_json,
        SUM(CASE WHEN JSON_TYPE(photos) = 'ARRAY' THEN 1 ELSE 0 END) as array_format
      FROM purchases
    `);
    
    const stats = formatCheck[0];
    console.log(`   📊 总记录数: ${stats.total_records}`);
    console.log(`   📭 NULL值: ${stats.null_photos}`);
    console.log(`   ✅ 有效JSON: ${stats.valid_json}`);
    console.log(`   🎯 数组格式: ${stats.array_format}`);
    
    const formatScore = (stats.array_format / stats.total_records * 100).to_fixed(1);
    console.log(`   🏆 格式正确率: ${formatScore}%`);
    
    // 2. 检查图片URL类型
    console.log('\n2️⃣ 图片URL类型分析:');
    const [urlCheck] = await connection.execute(`
      SELECT 
        SUM(CASE WHEN photos LIKE '%example.com%' THEN 1 ELSE 0 END) as example_urls,
        SUM(CASE WHEN photos LIKE '%trae-api-sg.mchost.guru%' THEN 1 ELSE 0 END) as trae_api_urls,
        SUM(CASE WHEN photos LIKE '%picsum.photos%' THEN 1 ELSE 0 END) as picsum_urls,
        SUM(CASE WHEN photos LIKE '%via.placeholder.com%' THEN 1 ELSE 0 END) as placeholder_urls,
        SUM(CASE WHEN photos LIKE '%localhost%' OR photos LIKE '%192.168.%' THEN 1 ELSE 0 END) as local_urls
      FROM purchases
      WHERE photos IS NOT NULL
    `);
    
    const urlStats = urlCheck[0];
    console.log(`   🚫 示例URL (example.com): ${urlStats.example_urls}`);
    console.log(`   ❌ 失效API (trae-api-sg): ${urlStats.trae_api_urls}`);
    console.log(`   🎲 随机图片 (picsum): ${urlStats.picsum_urls}`);
    console.log(`   🖼️  占位图片 (placeholder): ${urlStats.placeholder_urls}`);
    console.log(`   🏠 本地图片: ${urlStats.local_urls}`);
    
    // 3. 采样检查图片URL
    console.log('\n3️⃣ 图片URL采样检查:');
    const [sampleUrls] = await connection.execute(`
      SELECT 
        purchase_code,
        product_name,
        photos
      FROM purchases 
      WHERE photos IS NOT NULL
      ORDER BY createdAt DESC
      LIMIT 5
    `);
    
    for (const sample of sampleUrls) {
      console.log(`\n   🏷️  ${sample.purchase_code} - ${sample.product_name}`);
      try {
        const photos = JSON.parse(sample.photos);
        if (Array.is_array(photos) && photos.length > 0) {
          const url = photos[0];
          console.log(`   🖼️  图片URL: ${url.substring(0, 80)}${url.length > 80 ? '...' : ''}`);
          
          // 判断URL类型
          if (url.includes('via.placeholder.com')) {
            console.log(`   ✅ 状态: 占位图片 (应该可以显示)`);
          } else if (url.includes('picsum.photos')) {
            console.log(`   ✅ 状态: 随机图片 (应该可以显示)`);
          } else if (url.includes('localhost') || url.includes('192.168.')) {
            console.log(`   🏠 状态: 本地图片 (需要服务器运行)`);
          } else {
            console.log(`   ❓ 状态: 其他类型`);
          }
        } else {
          console.log(`   ❌ 图片数据: 无效数组`);
        }
      } catch (error) {
        console.log(`   ❌ 解析失败: ${error.message}`);
      }
    }
    
    // 4. 修复建议
    console.log('\n4️⃣ 修复状态总结:');
    const problemUrls = urlStats.example_urls + urlStats.trae_api_urls;
    
    if (problemUrls === 0) {
      console.log(`   🎉 所有问题URL已修复！`);
      console.log(`   ✅ 采购列表中的图片应该能正常显示`);
    } else {
      console.log(`   ⚠️  还有 ${problemUrls} 条记录存在问题URL`);
      console.log(`   🔧 建议运行修复脚本处理剩余问题`);
    }
    
    // 5. 前端显示建议
    console.log('\n5️⃣ 前端显示建议:');
    console.log(`   📱 刷新浏览器页面以查看修复效果`);
    console.log(`   🔍 检查浏览器控制台是否还有图片加载错误`);
    console.log(`   🖼️  如果图片仍不显示，检查网络连接和防火墙设置`);
    console.log(`   💡 占位图片显示为灰色背景的"Product Image"文字`);
    
    console.log('\n' + '=' .repeat(80));
    console.log('📋 图片修复报告生成完成！');
    
  } catch (error) {
    console.error('❌ 生成报告时出现错误:', error);
  } finally {
    await connection.end();
  }
}

generateImageFixReport().catch(console.error);