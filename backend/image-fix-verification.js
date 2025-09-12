import mysql from 'mysql2/promise';

async function verifyImageFix() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 验证图片修复效果...');
    
    // 1. 检查是否还有via.placeholder.com的链接
    const [viaRows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE JSON_EXTRACT(photos, '$[0]') LIKE '%via.placeholder.com%'
    `);
    
    console.log(`\n📊 修复验证结果:`);
    console.log(`❌ 仍使用via.placeholder.com的记录: ${viaRows[0].count} 条`);
    
    // 2. 检查base64图片数量
    const [base64Rows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE JSON_EXTRACT(photos, '$[0]') LIKE 'data:image%'
    `);
    
    console.log(`✅ 使用base64占位图片的记录: ${base64Rows[0].count} 条`);
    
    // 3. 总体统计
    const [totalRows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE photos IS NOT NULL AND JSON_LENGTH(photos) > 0
    `);
    
    console.log(`📊 总图片记录数: ${totalRows[0].count} 条`);
    
    // 4. 详细分类统计
    console.log('\n📊 详细图片类型分布:');
    const [detailRows] = await connection.execute(`
      SELECT 
        CASE 
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'data:image/svg+xml;base64%' THEN 'SVG Base64占位图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'data:image%' THEN '其他Base64图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'https://picsum.photos%' THEN 'Picsum占位图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'http://localhost%' THEN '本地上传图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'http://192.168%' THEN '局域网图片'
          WHEN JSON_EXTRACT(photos, '$[0]') LIKE 'https://via.placeholder.com%' THEN 'Via占位图片(需修复)'
          ELSE '其他类型'
        END as image_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / ${totalRows[0].count}, 2) as percentage
      FROM purchases 
      WHERE photos IS NOT NULL AND JSON_LENGTH(photos) > 0
      GROUP BY image_type
      ORDER BY count DESC
    `);
    
    detailRows.for_each(row => {
      const status = row.image_type.includes('需修复') ? '❌' : '✅';
      console.log(`  ${status} ${row.image_type}: ${row.count} 条 (${row.percentage}%)`);
    });
    
    // 5. 生成修复报告
    console.log('\n📋 修复报告总结:');
    
    if (viaRows[0].count === 0) {
      console.log('✅ 修复成功：所有via.placeholder.com链接已被替换');
      console.log('✅ 网络连接问题已解决：使用本地base64图片，无需外部网络');
      console.log('✅ 图片显示稳定性：base64图片在任何网络环境下都能正常显示');
    } else {
      console.log(`❌ 修复未完成：仍有 ${viaRows[0].count} 条记录需要处理`);
    }
    
    const base64Percentage = Math.round((base64Rows[0].count / totalRows[0].count) * 100);
    console.log(`📊 Base64占位图片覆盖率: ${base64Percentage}%`);
    
    // 6. 测试建议
    console.log('\n💡 测试建议:');
    console.log('1. 打开采购列表页面，检查图片是否正常显示');
    console.log('2. 在不同网络环境下测试（WiFi、移动网络、离线）');
    console.log('3. 检查浏览器控制台是否还有图片加载错误');
    console.log('4. 验证图片点击预览功能是否正常');
    
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

// 执行验证
verifyImageFix().catch(console.error);