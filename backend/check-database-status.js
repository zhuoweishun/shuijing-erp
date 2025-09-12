import mysql from 'mysql2/promise';

async function checkDatabaseStatus() {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('🔍 检查数据库表结构和数据...');
    console.log('=' .repeat(60));

    // 1. 检查所有表
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 数据库中的表:');
    tables.for_each(table => {
      console.log('  -', Object.values(table)[0]);
    });

    // 2. 检查财务记录表
    const [financialCount] = await connection.execute('SELECT COUNT(*) as count FROM financial_records');
    console.log(`\n💰 financial_records表记录数: ${financialCount[0].count}`);

    // 3. 检查SKU表
    const [skuCount] = await connection.execute('SELECT COUNT(*) as count FROM product_skus');
    console.log(`📦 product_skus表记录数: ${skuCount[0].count}`);

    // 4. 检查采购记录表
    const [purchaseCount] = await connection.execute('SELECT COUNT(*) as count FROM purchases');
    console.log(`🛒 purchases表记录数: ${purchaseCount[0].count}`);

    // 5. 如果有SKU记录，显示最近的几个
    if (skuCount[0].count > 0) {
      const [recentSkus] = await connection.execute(`
        SELECT id, sku_name, material_cost, labor_cost, craft_cost, totalCost, created_at 
        FROM product_skus 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('\n🔧 最近5个SKU记录:');
      recentSkus.for_each((sku, i) => {
        console.log(`${i+1}. ${sku.sku_name}`);
        console.log(`   成本: 材料¥${sku.material_cost} + 人工¥${sku.labor_cost} + 工艺¥${sku.craft_cost} = 总¥${sku.total_cost}`);
        console.log(`   创建时间: ${new Date(sku.created_at).to_locale_string('zh-CN')}`);
        console.log('');
      });
    }

    // 6. 检查是否有采购记录
    if (purchaseCount[0].count > 0) {const [recentPurchases] = await connection.execute(`
        SELECT id, product_name, total_price, purchase_date, created_at
        FROM purchases 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('\n🛒 最近5个采购记录:');
      recentPurchases.for_each((purchase, i) => {
        console.log(`${i+1}. ${purchase.product_name} - ¥${purchase.total_price}`);
        console.log(`   采购日期: ${new Date(purchase.purchase_date).to_locale_string('zh-CN')}`);
        console.log(`   创建时间: ${new Date(purchase.created_at).to_locale_string('zh-CN')}`);
        console.log('');
      });
    }

    // 7. 检查财务记录表结构
    const [financialStructure] = await connection.execute('DESCRIBE financial_records');
    console.log('\n🏗️ financial_records表结构:');
    financialStructure.for_each(field => {
      console.log(`   ${field.Field}: ${field.Type} ${field.Null === 'YES' ? '(可空)' : '(非空)'}`);
    });

    // 8. 检查是否有任何财务相关的数据
    const [anyFinancial] = await connection.execute(`
      SELECT * FROM financial_records 
      ORDER BY createdAt DESC 
      LIMIT 3
    `);
    
    if (anyFinancial.length > 0) {
      console.log('\n💰 财务记录样例:');
      anyFinancial.for_each((record, i) => {
        console.log(`${i+1}. ${record.description} - ¥${record.amount}`);
        console.log(`   类型: ${record.record_type} | 引用: ${record.reference_type}`);
        console.log(`   时间: ${new Date(record.created_at).to_locale_string('zh-CN')}`);
        console.log('');
      });
    } else {
      console.log('\n❌ 财务记录表为空!');
      console.log('   这解释了为什么流水账没有显示任何记录');
    }

    await connection.end();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ 数据库状态检查完成');
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message);
  }
}

checkDatabaseStatus();