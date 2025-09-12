import mysql from 'mysql2/promise';

async function checkAllImageUrls() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 检查所有表中的图片URL...');
    
    // 检查采购表
    console.log('\n📦 检查采购表 (purchases):');
    const [purchaseRows] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM purchases 
      WHERE photos LIKE '%example.com%'
    `);
    console.log(`   示例URL数量: ${purchaseRows[0].count}`);
    
    // 检查产品表
    console.log('\n🎯 检查产品表 (products):');
    const [productRows] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE images LIKE '%example.com%'
    `);
    console.log(`   示例URL数量: ${productRows[0].count}`);
    
    // 检查SKU表
    console.log('\n📋 检查SKU表 (product_skus):');
    const [skuRows] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM product_skus 
      WHERE photos LIKE '%example.com%'
    `);
    console.log(`   示例URL数量: ${skuRows[0].count}`);
    
    // 详细检查产品表中的示例URL
    if (productRows[0].count > 0) {
      console.log('\n🔍 产品表中的示例URL详情:');
      const [productDetails] = await connection.execute(`
        SELECT id, name, images
        FROM products 
        WHERE images LIKE '%example.com%'
        LIMIT 5
      `);
      
      for (const product of productDetails) {
        console.log(`   产品: ${product.name}`);
        console.log(`   图片: ${product.images}`);
      }
    }
    
    // 详细检查SKU表中的示例URL
    if (skuRows[0].count > 0) {
      console.log('\n🔍 SKU表中的示例URL详情:');
      const [skuDetails] = await connection.execute(`
        SELECT id, sku_name, photos
        FROM product_skus 
        WHERE photos LIKE '%example.com%'
        LIMIT 5
      `);
      
      for (const sku of skuDetails) {
        console.log(`   SKU: ${sku.sku_name}`);
        console.log(`   图片: ${sku.photos}`);
      }
    }
    
    // 总结
    const totalExampleUrls = purchaseRows[0].count + productRows[0].count + skuRows[0].count;
    console.log('\n📊 总结:');
    console.log(`   总示例URL数量: ${totalExampleUrls}`);
    
    if (totalExampleUrls > 0) {
      console.log('\n🔧 需要修复的表:');
      if (purchaseRows[0].count > 0) console.log(`   - purchases表: ${purchaseRows[0].count} 条`);
      if (productRows[0].count > 0) console.log(`   - products表: ${productRows[0].count} 条`);
      if (skuRows[0].count > 0) console.log(`   - product_skus表: ${skuRows[0].count} 条`);
    } else {
      console.log('\n🎉 所有表中的图片URL都已修复！');
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

checkAllImageUrls().catch(console.error);