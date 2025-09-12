import mysql from 'mysql2/promise';

async function fixSkuPhotos() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('=== 开始修复SKU图片问题 ===');
    
    // 1. 检查MaterialUsage关联，找到SKU和采购记录的关系
    console.log('\n1. 检查MaterialUsage关联...');
    const [materialUsage] = await connection.execute(`
      SELECT 
        mu.id as usage_id,
        mu.purchase_id,
        mu.product_id,
        p.purchase_code,
        p.product_name,
        p.photos as purchase_photos,
        prod.sku_id,
        ps.sku_name,
        ps.photos as sku_photos
      FROM material_usage mu
      LEFT JOIN purchases p ON mu.purchase_id = p.id
      LEFT JOIN products prod ON mu.product_id = prod.id
      LEFT JOIN product_skus ps ON prod.sku_id = ps.id
      WHERE ps.id IS NOT NULL
      LIMIT 10
    `);
    
    console.log(`找到 ${materialUsage.length} 个MaterialUsage关联记录`);
    
    materialUsage.for_each((row, index) => {
      console.log(`${index + 1}. MaterialUsage关联:`);
      console.log(`   采购编号: ${row.purchase_code}`);
      console.log(`   采购产品: ${row.product_name}`);
      console.log(`   采购图片: ${row.purchase_photos}`);
      console.log(`   SKU ID: ${row.sku_id}`);
      console.log(`   SKU名称: ${row.sku_name}`);
      console.log(`   SKU图片: ${row.sku_photos}`);
      console.log('---');
    });
    
    // 2. 找到所有需要修复的SKU（photos为null但有关联的采购记录有图片）
    console.log('\n2. 查找需要修复的SKU...');
    const [skusToFix] = await connection.execute(`
      SELECT DISTINCT
        ps.id as sku_id,
        ps.sku_name,
        ps.photos as current_photos,
        p.photos as purchase_photos,
        p.purchase_code,
        p.product_name
      FROM product_skus ps
      JOIN products prod ON prod.sku_id = ps.id
      JOIN material_usage mu ON mu.product_id = prod.id
      JOIN purchases p ON p.id = mu.purchase_id
      WHERE (ps.photos IS NULL OR ps.photos = '' OR ps.photos = 'null')
        AND p.photos IS NOT NULL 
        AND p.photos != '' 
        AND p.photos != 'null'
    `);
    
    console.log(`找到 ${skusToFix.length} 个需要修复的SKU`);
    
    if (skusToFix.length === 0) {
      console.log('没有需要修复的SKU');
      return;
    }
    
    // 3. 开始修复
    console.log('\n3. 开始修复SKU图片...');
    let fixedCount = 0;
    
    for (const sku of skusToFix) {
      try {
        // 使用采购记录的图片更新SKU
        await connection.execute(
          'UPDATE product_skus SET photos = ? WHERE id = ?',
          [sku.purchase_photos, sku.sku_id]
        );
        
        console.log(`✅ 修复SKU: ${sku.sku_name}`);
        console.log(`   从采购记录 ${sku.purchase_code} 继承图片: ${sku.purchase_photos}`);
        fixedCount++;
      } catch (error) {
        console.log(`❌ 修复失败 ${sku.sku_name}: ${error.message}`);
      }
    }
    
    console.log(`\n=== 修复完成 ===`);
    console.log(`成功修复 ${fixedCount} 个SKU的图片`);
    
    // 4. 验证修复结果
    console.log('\n4. 验证修复结果...');
    const [verifyResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN photos IS NOT NULL AND photos != '' AND photos != 'null' THEN 1 END) as with_photos
      FROM product_skus
    `);
    
    console.log(`总SKU数量: ${verifyResult[0].total}`);
    console.log(`有图片的SKU数量: ${verifyResult[0].with_photos}`);
    console.log(`图片覆盖率: ${(verifyResult[0].with_photos / verifyResult[0].total * 100).to_fixed(1)}%`);
    
  } finally {
    await connection.end();
  }
}

fixSkuPhotos().catch(console.error);