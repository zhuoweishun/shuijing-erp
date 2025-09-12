import mysql from 'mysql2/promise';

async function debugSkuQuery() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('=== 调试SKU查询问题 ===');
    
    // 1. 直接查询所有SKU的photos字段
    console.log('\n1. 查询所有SKU的photos字段状态...');
    const [allSkus] = await connection.execute(`
      SELECT 
        id,
        sku_name,
        photos,
        photos IS NULL as isNull,
        photos = '' as isEmpty,
        photos = 'null' as isStringNull
      FROM product_skus 
      LIMIT 10
    `);
    
    allSkus.for_each((sku, index) => {
      console.log(`${index + 1}. ${sku.sku_name}`);
      console.log(`   photos: ${sku.photos}`);
      console.log(`   isNull: ${sku.isNull}`);
      console.log(`   isEmpty: ${sku.isEmpty}`);
      console.log(`   isStringNull: ${sku.isStringNull}`);
      console.log('---');
    });
    
    // 2. 检查有MaterialUsage关联的SKU
    console.log('\n2. 检查有MaterialUsage关联的SKU...');
    const [skusWithMaterial] = await connection.execute(`
      SELECT DISTINCT
        ps.id,
        ps.sku_name,
        ps.photos
      FROM product_skus ps
      JOIN products prod ON prod.sku_id = ps.id
      JOIN material_usage mu ON mu.product_id = prod.id
      LIMIT 10
    `);
    
    console.log(`找到 ${skusWithMaterial.length} 个有MaterialUsage关联的SKU`);
    skusWithMaterial.for_each((sku, index) => {
      console.log(`${index + 1}. ${sku.sku_name} - photos: ${sku.photos}`);
    });
    
    // 3. 检查采购记录的photos
    console.log('\n3. 检查采购记录的photos...');
    const [purchasesWithPhotos] = await connection.execute(`
      SELECT 
        id,
        purchase_code,
        product_name,
        photos,
        photos IS NOT NULL as has_photos
      FROM purchases 
      WHERE photos IS NOT NULL
      LIMIT 5
    `);
    
    console.log(`找到 ${purchasesWithPhotos.length} 个有图片的采购记录`);
    purchasesWithPhotos.for_each((purchase, index) => {
      console.log(`${index + 1}. ${purchase.purchase_code} - ${purchase.product_name}`);
      console.log(`   photos: ${purchase.photos}`);
    });
    
    // 4. 手动构建修复查询
    console.log('\n4. 手动查找需要修复的SKU...');
    const [needFix] = await connection.execute(`
      SELECT 
        ps.id as sku_id,
        ps.sku_name,
        ps.photos as sku_photos,
        COUNT(DISTINCT p.id) as purchase_count
      FROM product_skus ps
      JOIN products prod ON prod.sku_id = ps.id
      JOIN material_usage mu ON mu.product_id = prod.id
      JOIN purchases p ON p.id = mu.purchase_id
      WHERE ps.photos IS NULL
        AND p.photos IS NOT NULL
      GROUP BY ps.id, ps.sku_name, ps.photos
      LIMIT 10
    `);
    
    console.log(`找到 ${needFix.length} 个需要修复的SKU`);
    needFix.for_each((sku, index) => {
      console.log(`${index + 1}. ${sku.sku_name} - 关联 ${sku.purchase_count} 个采购记录`);
    });
    
  } finally {
    await connection.end();
  }
}

debugSkuQuery().catch(console.error);