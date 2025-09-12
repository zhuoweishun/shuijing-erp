import mysql from 'mysql2/promise';

async function checkSourceDataTime() {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('🔍 检查财务流水账源数据的时间问题...');
    console.log('=' .repeat(60));

    const now = new Date();
    console.log(`⏰ 当前时间: ${now.to_locale_string('zh-CN')}`);
    console.log('');

    // 1. 检查采购记录的时间
    console.log('📦 检查采购记录时间:');
    const [purchaseCount] = await connection.execute('SELECT COUNT(*) as count FROM purchases');
    console.log(`   总记录数: ${purchaseCount[0].count}`);
    
    const [purchaseFuture] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE purchaseDate > NOW() OR createdAt > NOW()
    `);
    console.log(`   未来时间记录: ${purchaseFuture[0].count}`);
    
    if (purchaseFuture[0].count > 0) {const [purchaseExamples] = await connection.execute(`
        SELECT product_name, purchase_date, created_at
        FROM purchases 
        WHERE purchaseDate > NOW() OR created_at > NOW()
        ORDER BY purchase_date DESC
        LIMIT 3
      `);
      
      console.log('   未来时间示例:');
      purchaseExamples.for_each((record, i) => {
        console.log(`   ${i+1}. ${record.product_name}`);
        console.log(`      采购日期: ${new Date(record.purchase_date).to_locale_string('zh-CN')}`);
        console.log(`      创建时间: ${new Date(record.created_at).to_locale_string('zh-CN')}`);
      });
    }
    console.log('');

    // 2. 检查SKU制作记录的时间
    console.log('🔧 检查SKU制作记录时间:');
    const [skuCount] = await connection.execute('SELECT COUNT(*) as count FROM product_skus');
    console.log(`   总记录数: ${skuCount[0].count}`);
    
    const [skuFuture] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM product_skus 
      WHERE createdAt > NOW() OR updatedAt > NOW()
    `);
    console.log(`   未来时间记录: ${skuFuture[0].count}`);
    
    if (skuFuture[0].count > 0) {
      const [skuExamples] = await connection.execute(`
        SELECT sku_name, created_at, updated_at, labor_cost, craft_cost
        FROM product_skus 
        WHERE created_at > NOW() OR updated_at > NOW()
        ORDER BY created_at DESC
        LIMIT 3
      `);
      
      console.log('   未来时间示例:');
      skuExamples.for_each((record, i) => {
        console.log(`   ${i+1}. ${record.sku_name}`);
        console.log(`      创建时间: ${new Date(record.created_at).to_locale_string('zh-CN')}`);
        console.log(`      更新时间: ${new Date(record.updated_at).to_locale_string('zh-CN')}`);
        console.log(`      人工成本: ¥${record.labor_cost}, 工艺成本: ¥${record.craft_cost}`);
      });
    }
    console.log('');

    // 3. 检查库存变更日志的时间
    console.log('📋 检查库存变更日志时间:');
    const [logCount] = await connection.execute('SELECT COUNT(*) as count FROM sku_inventory_logs');
    console.log(`   总记录数: ${logCount[0].count}`);
    
    const [logFuture] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM sku_inventory_logs 
      WHERE createdAt > NOW()
    `);
    console.log(`   未来时间记录: ${logFuture[0].count}`);
    
    if (logFuture[0].count > 0) {
      const [logExamples] = await connection.execute(`
        SELECT action, notes, created_at
        FROM sku_inventory_logs 
        WHERE created_at > NOW()
        ORDER BY created_at DESC
        LIMIT 3
      `);
      
      console.log('   未来时间示例:');
      logExamples.for_each((record, i) => {
        console.log(`   ${i+1}. 操作: ${record.action}`);
        console.log(`      创建时间: ${new Date(record.created_at).to_locale_string('zh-CN')}`);
        console.log(`      备注: ${record.notes || '无'}`);
      });
    }
    console.log('');

    // 4. 模拟财务流水账数据汇总（简化版）
    console.log('💰 模拟财务流水账数据汇总:');
    
    // 采购支出记录数
    const [purchaseRecords] = await connection.execute(`
      SELECT COUNT(*) as count, 
             MIN(purchase_date) as earliest, 
             MAX(purchase_date) as latest
      FROM purchases
    `);
    console.log(`   采购支出记录: ${purchaseRecords[0].count} 条`);
    if (purchaseRecords[0].count > 0) {
      console.log(`   时间范围: ${new Date(purchaseRecords[0].earliest).to_locale_string('zh-CN')} ~ ${new Date(purchaseRecords[0].latest).to_locale_string('zh-CN')}`);
    }
    
    // 制作成本记录数
    const [productionRecords] = await connection.execute(`
      SELECT COUNT(*) as count,
             MIN(createdAt) as earliest,
             MAX(createdAt) as latest
      FROM product_skus
      WHERE (labor_cost > 0 OR craft_cost > 0)
    `);
    console.log(`   制作成本记录: ${productionRecords[0].count} 条`);
    if (productionRecords[0].count > 0) {
      console.log(`   时间范围: ${new Date(productionRecords[0].earliest).to_locale_string('zh-CN')} ~ ${new Date(productionRecords[0].latest).to_locale_string('zh-CN')}`);
    }
    
    // 总计
    const totalRecords = purchaseRecords[0].count + productionRecords[0].count;
    console.log(`   预计流水账总记录数: ${totalRecords} 条`);
    console.log('');

    // 5. 检查最新的几条记录（按时间倒序）
    console.log('🕐 最新记录时间分析:');
    
    // 最新的采购记录
    const [latestPurchase] = await connection.execute(`
      SELECT product_name, purchase_date, createdAt
      FROM purchases
      ORDER BY purchaseDate DESC, createdAt DESC
      LIMIT 1
    `);
    
    if (latestPurchase.length > 0) {
      const record = latestPurchase[0];
      const purchaseTime = new Date(record.purchase_date);
      const isFuture = purchaseTime > now;
      console.log(`   最新采购: ${record.product_name}`);
      console.log(`   采购时间: ${purchaseTime.to_locale_string('zh-CN')} ${isFuture ? '⚠️ 未来时间!' : '✅'}`);
    }
    
    // 最新的SKU制作记录
    const [latestSku] = await connection.execute(`
      SELECT sku_name, createdAt
      FROM product_skus
      ORDER BY createdAt DESC
      LIMIT 1
    `);
    
    if (latestSku.length > 0) {
      const record = latestSku[0];
      const createTime = new Date(record.created_at);
      const isFuture = createTime > now;
      console.log(`   最新SKU: ${record.sku_name}`);
      console.log(`   创建时间: ${createTime.to_locale_string('zh-CN')} ${isFuture ? '⚠️ 未来时间!' : '✅'}`);
    }

    await connection.end();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ 源数据时间检查完成');
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message);
  }
}

checkSourceDataTime();