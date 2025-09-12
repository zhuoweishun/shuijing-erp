import mysql from 'mysql2/promise';

async function verifySkuCreation() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 开始验证SKU创建结果...');
    
    // 1. 统计SKU总数
    const [skuCount] = await connection.execute('SELECT COUNT(*) as total FROM product_skus');
    console.log(`\n📊 SKU总数: ${skuCount[0].total}`);
    
    // 2. 统计最近创建的SKU（今天创建的）
    const [recentSkus] = await connection.execute(`
      SELECT COUNT(*) as recent_count 
      FROM product_skus 
      WHERE DATE(createdAt) = CURDATE()
    `);
    console.log(`📅 今天创建的SKU: ${recentSkus[0].recent_count}`);
    
    // 3. 检查SKU的基本信息
    const [skuDetails] = await connection.execute(`
      SELECT id, sku_code, sku_name, total_quantity, available_quantity, 
             material_cost, labor_cost, craft_cost, totalCost, selling_price, 
             profit_margin, status, createdAt
      FROM product_skus 
      WHERE DATE(createdAt) = CURDATE()
      ORDER BY createdAt DESC 
      LIMIT 10
    `);
    
    console.log('\n🔍 最新创建的10个SKU详情:');
    skuDetails.for_each((sku, index) => {
      console.log(`${index + 1}. ${sku.sku_code} - ${sku.sku_name}`);
      console.log(`   数量: ${sku.total_quantity}/${sku.available_quantity}`);
      console.log(`   成本: 材料¥${sku.material_cost} + 人工¥${sku.labor_cost} + 工艺¥${sku.craft_cost} = 总¥${sku.total_cost}`);
      console.log(`   售价: ¥${sku.selling_price}, 利润率: ${sku.profit_margin}%`);
      console.log(`   状态: ${sku.status}, 创建时间: ${sku.created_at}`);
      console.log('');
    });
    
    // 4. 检查MaterialUsage记录
    const [materialUsageCount] = await connection.execute(`
      SELECT COUNT(*) as usage_count 
      FROM material_usage mu
      JOIN product_skus ps ON mu.product_id = ps.id
      WHERE DATE(ps.created_at) = CURDATE()
    `);
    console.log(`📦 今天创建SKU的MaterialUsage记录数: ${materialUsageCount[0].usage_count}`);
    
    // 5. 检查MaterialUsage详情（前10条）
    const [materialUsageDetails] = await connection.execute(`
      SELECT mu.id, mu.product_id, mu.purchase_id, mu.quantity_used_beads, 
             mu.quantity_used_pieces, mu.created_at,
             ps.sku_code, ps.sku_name,
             p.purchase_code, p.product_name, p.product_type
      FROM material_usage mu
      JOIN product_skus ps ON mu.product_id = ps.id
      JOIN purchases p ON mu.purchase_id = p.id
      WHERE DATE(ps.created_at) = CURDATE()
      ORDER BY mu.created_at DESC
      LIMIT 15
    `);
    
    console.log('\n🔗 MaterialUsage记录详情（前15条）:');
    materialUsageDetails.for_each((usage, index) => {
      console.log(`${index + 1}. SKU: ${usage.sku_code} - ${usage.sku_name}`);
      console.log(`   原材料: ${usage.purchase_code} - ${usage.product_name} (${usage.product_type})`);
      console.log(`   使用量: ${usage.quantity_used_beads}颗, ${usage.quantity_used_pieces}件`);
      console.log(`   创建时间: ${usage.created_at}`);
      console.log('');
    });
    
    // 6. 统计不同制作模式的SKU数量
    const [modeStats] = await connection.execute(`
      SELECT 
        CASE 
          WHEN ps.sku_name LIKE '%组合%' THEN '组合制作模式'
          WHEN ps.sku_name LIKE '%保守%' THEN '保守直接转化模式'
          ELSE '直接转化模式'
        END as mode_type,
        COUNT(*) as count
      FROM product_skus ps
      WHERE DATE(ps.created_at) = CURDATE()
      GROUP BY mode_type
    `);
    
    console.log('\n📈 制作模式统计:');
    modeStats.for_each(stat => {
      console.log(`${stat.mode_type}: ${stat.count} 个SKU`);
    });
    
    // 7. 检查成本计算的合理性
    const [costStats] = await connection.execute(`
      SELECT 
        AVG(material_cost) as avg_material_cost,
        AVG(labor_cost) as avg_labor_cost,
        AVG(craft_cost) as avg_craft_cost,
        AVG(total_cost) as avg_total_cost,
        AVG(selling_price) as avg_selling_price,
        AVG(profit_margin) as avg_profit_margin,
        MIN(profit_margin) as min_profit_margin,
        MAX(profit_margin) as max_profit_margin
      FROM product_skus 
      WHERE DATE(createdAt) = CURDATE()
    `);
    
    console.log('\n💰 成本统计分析:');
    const cost = costStats[0];
    console.log(`平均材料成本: ¥${Number(cost.avg_material_cost).to_fixed(2)}`);
    console.log(`平均人工成本: ¥${Number(cost.avg_labor_cost).to_fixed(2)}`);
    console.log(`平均工艺成本: ¥${Number(cost.avg_craft_cost).to_fixed(2)}`);
    console.log(`平均总成本: ¥${Number(cost.avg_total_cost).to_fixed(2)}`);
    console.log(`平均售价: ¥${Number(cost.avg_selling_price).to_fixed(2)}`);
    console.log(`平均利润率: ${Number(cost.avg_profit_margin).to_fixed(2)}%`);
    console.log(`利润率范围: ${Number(cost.min_profit_margin).to_fixed(2)}% - ${Number(cost.max_profit_margin).to_fixed(2)}%`);
    
    // 8. 检查是否有异常数据
    const [anomalies] = await connection.execute(`
      SELECT sku_code, sku_name, totalCost, selling_price, profit_margin
      FROM product_skus 
      WHERE DATE(createdAt) = CURDATE()
        AND (totalCost <= 0 OR selling_price <= 0 OR profitMargin < 0 OR profit_margin > 100)
    `);
    
    if (anomalies.length > 0) {
      console.log('\n⚠️  发现异常数据:');
      anomalies.for_each(anomaly => {
        console.log(`${anomaly.sku_code}: 成本¥${anomaly.total_cost}, 售价¥${anomaly.selling_price}, 利润率${anomaly.profit_margin}%`);
      });
    } else {
      console.log('\n✅ 未发现异常数据，所有SKU的成本和利润率都在合理范围内');
    }
    
    // 9. 验证MaterialUsage的完整性
    const [orphanSkus] = await connection.execute(`
      SELECT ps.sku_code, ps.sku_name
      FROM product_skus ps
      LEFT JOIN material_usage mu ON ps.id = mu.product_id
      WHERE DATE(ps.created_at) = CURDATE() AND mu.id IS NULL
    `);
    
    if (orphanSkus.length > 0) {
      console.log('\n⚠️  发现没有MaterialUsage记录的SKU:');
      orphanSkus.for_each(sku => {
        console.log(`${sku.sku_code} - ${sku.sku_name}`);
      });
    } else {
      console.log('\n✅ 所有SKU都有对应的MaterialUsage记录');
    }
    
    console.log('\n🎉 SKU创建验证完成！');
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error);
  } finally {
    await connection.end();
  }
}

verifySkuCreation().catch(console.error);