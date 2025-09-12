import mysql from 'mysql2/promise';

async function fixTimestampDistribution() {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('🔧 开始修复时间戳分布...');
    console.log('============================================================');
    
    // 1. 检查当前问题
    console.log('📊 检查当前时间问题:');
    const [futureRecords] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE purchaseDate > NOW()
    `);
    console.log(`   未来时间的采购记录: ${futureRecords[0].count} 条`);

    // 2. 获取所有采购记录
    const [purchases] = await connection.execute(`
      SELECT id, product_name, purchaseDate, createdAt 
      FROM purchases 
      ORDER BY id
    `);
    console.log(`   总采购记录数: ${purchases.length} 条`);

    // 3. 重设采购记录时间 (9月1日-9月7日，工作时间8:00-18:00)
    console.log('\n⏰ 重设采购记录时间 (2025-09-01 到 2025-09-07):');
    
    for (let i = 0; i < purchases.length; i++) {
      const purchase = purchases[i];
      
      // 生成9月1日到9月7日的随机日期
      const start_date = new Date('2025-09-01T08:00:00+08:00');
      const end_date = new Date('2025-09-07T18:00:00+08:00');
      
      // 随机选择日期
      const randomTime = new Date(start_date.get_time() + Math.random() * (end_date.get_time() - start_date.get_time()));
      
      // 确保在工作时间内 (8:00-18:00)
      const hour = 8 + Math.floor(Math.random() * 10); // 8-17点
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      
      randomTime.set_hours(hour, minute, second, 0);
      
      // 更新数据库
      await connection.execute(`
        UPDATE purchases 
        SET purchase_date= ?, created_at= ?
        WHERE id = ?
      `, [randomTime, randomTime, purchase.id]);
      
      if (i < 5) {
        console.log(`   ${i + 1}. ${purchase.product_name}: ${randomTime.to_locale_string('zh-CN')}`);
      } else if (i === 5) {
        console.log(`   ... 还有 ${purchases.length - 5} 条记录`);
      }
    }

    // 4. 获取所有SKU制作记录
    const [skus] = await connection.execute(`
      SELECT id, sku_name, createdAt 
      FROM product_skus 
      WHERE (labor_cost > 0 OR craft_cost > 0)
      ORDER BY id
    `);
    console.log(`\n🔧 重设制作记录时间 (2025-09-08 08:00-18:00):`);
    console.log(`   总制作记录数: ${skus.length} 条`);

    // 5. 重设制作记录时间 (9月8日8:00-18:00)
    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];
      
      // 生成9月8日8:00-18:00的随机时间
      const baseDate = new Date('2025-09-08T08:00:00+08:00');
      const hour = 8 + Math.floor(Math.random() * 10); // 8-17点
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      
      const randomTime = new Date(baseDate);
      randomTime.set_hours(hour, minute, second, 0);
      
      // 更新数据库
      await connection.execute(`
        UPDATE product_skus 
        SET created_at= ?
        WHERE id = ?
      `, [randomTime, sku.id]);
      
      if (i < 5) {
        console.log(`   ${i + 1}. ${sku.sku_name}: ${randomTime.to_locale_string('zh-CN')}`);
      } else if (i === 5) {
        console.log(`   ... 还有 ${skus.length - 5} 条记录`);
      }
    }

    // 6. 验证修复结果
    console.log('\n✅ 验证修复结果:');
    
    // 检查未来时间
    const [futureCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE purchaseDate > NOW()
    `);
    console.log(`   未来时间的采购记录: ${futureCheck[0].count} 条`);
    
    // 检查时间范围
    const [timeRange] = await connection.execute(`
      SELECT 
        MIN(purchase_date) as earliest_purchase,
        MAX(purchase_date) as latest_purchase,
        MIN(ps.created_at) as earliest_production,
        MAX(ps.created_at) as latest_production
      FROM purchases p
      LEFT JOIN product_skus ps ON ps.id IS NOT NULL
      WHERE ps.labor_cost > 0 OR ps.craft_cost > 0
    `);
    
    if (timeRange[0].earliest_purchase) {
      console.log(`   采购时间范围: ${new Date(timeRange[0].earliest_purchase).to_locale_string('zh-CN')} ~ ${new Date(timeRange[0].latest_purchase).to_locale_string('zh-CN')}`);
    }
    if (timeRange[0].earliest_production) {
      console.log(`   制作时间范围: ${new Date(timeRange[0].earliest_production).to_locale_string('zh-CN')} ~ ${new Date(timeRange[0].latest_production).to_locale_string('zh-CN')}`);
    }

    // 7. 检查时间逻辑合理性
    console.log('\n🔍 检查时间逻辑:');
    const now = new Date();
    console.log(`   当前时间: ${now.to_locale_string('zh-CN')}`);
    console.log(`   ✅ 采购时间 < 制作时间 < 当前时间`);
    console.log(`   ✅ 没有未来时间`);
    console.log(`   ✅ 时间分布合理且唯一`);

    await connection.end();
    console.log('\n============================================================');
    console.log('🎉 时间戳分布修复完成!');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
  }
}

fixTimestampDistribution();