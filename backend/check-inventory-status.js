import mysql from 'mysql2/promise';

async function checkInventoryStatus() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('=== 库存状态检查 ===\n');

    // 检查负库存的产品记录
    console.log('🔍 检查负库存的产品记录:');
    const [negativeInventory] = await connection.execute(`
      SELECT 
        productCode,
        name,
        quantity,
        unit_price,
        totalValue,
        status
      FROM products 
      WHERE quantity < 0
      ORDER BY productCode
    `);

    if (negativeInventory.length > 0) {
      console.log(`❌ 发现 ${negativeInventory.length} 条负库存记录:`);
      negativeInventory.for_each(record => {
        console.log(`   ${record.product_code} - ${record.name}`);
        console.log(`   库存数量: ${record.quantity}`);
        console.log(`   单价: ${record.unit_price}, 总价值: ${record.total_value}`);
        console.log(`   状态: ${record.status}`);
        console.log('');
      });
    } else {
      console.log('✅ 没有发现负库存记录');
    }

    // 检查库存情况统计
    console.log('\n📊 库存情况统计:');
    const [inventoryStats] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as total_records,
        SUM(quantity) as total_quantity,
        SUM(total_value) as total_value,
        COUNT(CASE WHEN quantity < 0 THEN 1 END) as negative_count
      FROM products 
      GROUP BY status
      ORDER BY status
    `);

    inventoryStats.for_each(stat => {
      console.log(`${stat.status}:`);
      console.log(`   总记录数: ${stat.total_records}`);
      console.log(`   总库存量: ${stat.total_quantity}`);
      console.log(`   总价值: ${stat.total_value}`);
      console.log(`   负库存数: ${stat.negative_count}`);
      console.log('');
    });

    // 检查MaterialUsage记录
    console.log('\n🔍 检查MaterialUsage记录统计:');
    const [materialUsageStats] = await connection.execute(`
      SELECT 
        COUNT(*) as record_count,
        SUM(quantity_used_pieces) as total_pieces_used,
        SUM(quantity_used_beads) as total_beads_used,
        SUM(total_cost) as total_cost
      FROM material_usage
    `);

    if (materialUsageStats.length > 0) {
      const stat = materialUsageStats[0];
      console.log('MaterialUsage总计:');
      console.log(`   记录数: ${stat.record_count}`);
      console.log(`   使用件数: ${stat.total_pieces_used || 0}`);
      console.log(`   使用珠数: ${stat.total_beads_used || 0}`);
      console.log(`   总成本: ${stat.total_cost || 0}`);
      console.log('');
    }

    // 检查SKU创建情况
    console.log('\n📦 检查SKU创建情况:');
    const [skuStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_skus,
        SUM(total_quantity) as total_sku_quantity,
        SUM(available_quantity) as available_sku_quantity,
        AVG(profit_margin) as avg_profit_margin
      FROM product_skus
    `);

    const skuStat = skuStats[0];
    console.log(`总SKU数量: ${skuStat.total_skus}`);
    console.log(`SKU总件数: ${skuStat.total_sku_quantity}`);
    console.log(`SKU可售件数: ${skuStat.available_sku_quantity}`);
    console.log(`平均利润率: ${skuStat.avg_profit_margin ? Number(skuStat.avg_profit_margin).to_fixed(2) + '%' : 'N/A'}`);

    // 检查图片数据
    console.log('\n🖼️ 检查图片数据:');
    const [imageStats] = await connection.execute(`
      SELECT 
        'purchases' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN photos IS NOT NULL AND photos != '' THEN 1 END) as has_photos,
        COUNT(CASE WHEN photos LIKE '%data:image%' THEN 1 END) as placeholder_photos,
        COUNT(CASE WHEN photos LIKE '%http%' THEN 1 END) as real_photos
      FROM purchases
      UNION ALL
      SELECT 
        'product_skus' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN photos IS NOT NULL AND photos != '' THEN 1 END) as has_photos,
        COUNT(CASE WHEN photos LIKE '%data:image%' THEN 1 END) as placeholder_photos,
        COUNT(CASE WHEN photos LIKE '%http%' THEN 1 END) as real_photos
      FROM product_skus
    `);

    imageStats.for_each(stat => {
      console.log(`${stat.table_name}表:`);
      console.log(`   总记录数: ${stat.total_records}`);
      console.log(`   有图片记录: ${stat.has_photos}`);
      console.log(`   占位图片: ${stat.placeholder_photos}`);
      console.log(`   真实图片: ${stat.real_photos}`);
      console.log('');
    });

  } catch (error) {
    console.error('检查库存状态失败:', error);
  } finally {
    await connection.end();
  }
}

checkInventoryStatus().catch(console.error);