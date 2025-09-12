import mysql from 'mysql2/promise';

async function checkPurchasePhotos() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('=== 检查采购记录的photos字段内容 ===');
    
    // 查询最新的10个采购记录
    const [rows] = await connection.execute(`
      SELECT id, purchase_code, product_name, photos 
      FROM purchases 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`找到 ${rows.length} 个采购记录`);
    console.log('');
    
    rows.for_each((row, index) => {
      console.log(`${index + 1}. 采购: ${row.product_name}`);
      console.log(`   编号: ${row.purchase_code}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Photos: ${row.photos}`);
      console.log(`   Photos类型: ${typeof row.photos}`);
      
      // 尝试解析JSON
      if (row.photos) {
        try {
          const parsed = JSON.parse(row.photos);
          console.log(`   解析后: ${JSON.stringify(parsed)}`);
          console.log(`   是否为数组: ${Array.is_array(parsed)}`);
          if (Array.is_array(parsed)) {
            console.log(`   数组长度: ${parsed.length}`);
            parsed.for_each((url, i) => {
              console.log(`   图片${i + 1}: ${url}`);
            });
          }
        } catch (e) {
          console.log(`   JSON解析失败: ${e.message}`);
        }
      }
      console.log('---');
    });
    
    // 统计有photos的采购记录数量
    const [countResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN photos IS NOT NULL AND photos != '' AND photos != 'null' THEN 1 END) as with_photos
      FROM purchases
    `);
    
    console.log('\n=== 统计信息 ===');
    console.log(`总采购记录数量: ${countResult[0].total}`);
    console.log(`有有效photos字段的采购记录: ${countResult[0].with_photos}`);
    
    // 检查MaterialUsage记录，看看SKU和采购记录的关联
    console.log('\n=== 检查MaterialUsage关联 ===');
    const [materialUsage] = await connection.execute(`
      SELECT 
        mu.id,
        mu.purchase_id,
        mu.product_id,
        p.purchase_code,
        p.product_name,
        p.photos as purchase_photos,
        ps.sku_name,
        ps.photos as sku_photos
      FROM material_usages mu
      LEFT JOIN purchases p ON mu.purchase_id = p.id
      LEFT JOIN products prod ON mu.product_id = prod.id
      LEFT JOIN product_skus ps ON prod.sku_id = ps.id
      WHERE ps.id IS NOT NULL
      LIMIT 5
    `);
    
    materialUsage.for_each((row, index) => {
      console.log(`${index + 1}. MaterialUsage关联:`);
      console.log(`   采购编号: ${row.purchase_code}`);
      console.log(`   采购产品: ${row.product_name}`);
      console.log(`   采购图片: ${row.purchase_photos}`);
      console.log(`   SKU名称: ${row.sku_name}`);
      console.log(`   SKU图片: ${row.sku_photos}`);
      console.log('---');
    });
    
  } finally {
    await connection.end();
  }
}

checkPurchasePhotos().catch(console.error);