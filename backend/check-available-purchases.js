import mysql from 'mysql2/promise';

async function checkPurchases() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    const [purchases] = await connection.execute(`
      SELECT id, purchase_code, product_name, product_type, quality, 
             bead_diameter, specification, total_beads, piece_count, quantity, 
             beads_per_string, price_per_bead, pricePerPiece, total_price, 
             photos, supplier_id
      FROM purchases 
      WHERE (total_beads > 0 OR piece_count > 0 OR quantity > 0)
      ORDER BY created_at DESC 
      LIMIT 30
    `);

    console.log('=== 可用采购记录 ===');
    console.log(`总共找到 ${purchases.length} 条可用记录\n`);

    purchases.for_each((p, i) => {
      console.log(`${i+1}. ${p.purchase_code} - ${p.product_name} (${p.product_type})`);
      console.log(`   品质: ${p.quality || 'N/A'}, 规格: ${p.bead_diameter || p.specification || 'N/A'}mm`);
      console.log(`   库存: ${p.total_beads || 0}颗, ${p.piece_count || 0}件, ${p.quantity || 0}串`);
      console.log(`   成本: 每颗¥${p.price_per_bead || 0}, 每件¥${p.price_per_piece || 0}`);
      console.log(`   总价: ¥${p.total_price || 0}`);
      console.log(`   图片: ${p.photos ? 'Yes' : 'No'}, 供应商ID: ${p.supplier_id}`);
      console.log('');
    });

    // 按产品类型分组统计
    const typeStats = {};
    purchases.for_each(p => {
      if (!typeStats[p.product_type]) {
        typeStats[p.product_type] = 0;
      }
      typeStats[p.product_type]++;
    });

    console.log('=== 产品类型统计 ===');
    Object.entries(typeStats).for_each(([type, count]) => {
      console.log(`${type}: ${count} 条记录`);
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkPurchases().catch(console.error);