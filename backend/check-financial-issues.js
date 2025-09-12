import mysql from 'mysql2/promise';

async function checkFinancialRecords() {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('🔍 检查财务记录中的时间和类型异常...');
    console.log('=' .repeat(60));

    // 1. 检查最近的财务记录
    const [records] = await connection.execute(`
      SELECT id, recordType, amount, description, referenceType, 
             transactionDate, createdAt 
      FROM financial_records 
      ORDER BY createdAt DESC 
      LIMIT 20
    `);

    console.log('\n📋 最近20条财务记录:');
    records.for_each((record, index) => {
      const transactionDate = new Date(record.transactionDate);
      const created_at = new Date(record.created_at);
      const now = new Date();
      const isFutureTransaction = transactionDate > now;
      const isFutureCreated = created_at > now;
      
      console.log(`${index + 1}. ID: ${record.id}`);
      console.log(`   类型: ${record.record_type} | 引用类型: ${record.reference_type}`);
      console.log(`   金额: ¥${record.amount}`);
      console.log(`   描述: ${record.description}`);
      console.log(`   交易日期: ${transactionDate.to_locale_string('zh-CN')} ${isFutureTransaction ? '⚠️ 未来时间!' : ''}`);
      console.log(`   创建时间: ${created_at.to_locale_string('zh-CN')} ${isFutureCreated ? '⚠️ 未来时间!' : ''}`);
      console.log('');
    });

    // 2. 检查未来时间记录
    const [futureRecords] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM financial_records 
      WHERE transactionDate > NOW() OR createdAt > NOW()
    `);
    console.log(`⚠️ 发现 ${futureRecords[0].count} 条未来时间记录`);

    // 3. 检查具体的未来时间记录
    if (futureRecords[0].count > 0) {
      const [futureDetails] = await connection.execute(`
        SELECT id, recordType, description, transactionDate, created_at
        FROM financial_records 
        WHERE transactionDate > NOW() OR created_at > NOW()
        ORDER BY transactionDate DESC
      `);
      
      console.log('\n🚨 未来时间记录详情:');
      futureDetails.for_each((record, index) => {
        console.log(`${index + 1}. ID: ${record.id}`);
        console.log(`   类型: ${record.record_type}`);
        console.log(`   描述: ${record.description}`);
        console.log(`   交易日期: ${new Date(record.transactionDate).to_locale_string('zh-CN')}`);
        console.log(`   创建时间: ${new Date(record.created_at).to_locale_string('zh-CN')}`);
        console.log('');
      });
    }

    // 4. 检查SKU制作相关记录
    const [skuProductionRecords] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM financial_records 
      WHERE referenceType = 'PRODUCTION' 
         OR description LIKE '%制作%' 
         OR description LIKE '%人工%' 
         OR description LIKE '%工艺%'
    `);
    console.log(`🔧 SKU制作相关记录: ${skuProductionRecords[0].count} 条`);

    // 5. 检查记录类型分布
    const [typeDistribution] = await connection.execute(`
      SELECT recordType, referenceType, COUNT(*) as count
      FROM financial_records 
      GROUP BY recordType, referenceType
      ORDER BY count DESC
    `);
    
    console.log('\n📊 记录类型分布:');
    typeDistribution.for_each(row => {
      console.log(`   ${row.record_type} - ${row.reference_type}: ${row.count} 条`);
    });

    // 6. 检查最近的采购支出记录
    const [purchaseExpenses] = await connection.execute(`
      SELECT id, amount, description, transactionDate, createdAt
      FROM financial_records 
      WHERE recordType = 'EXPENSE' AND referenceType = 'PURCHASE'
      ORDER BY createdAt DESC
      LIMIT 10
    `);
    
    console.log('\n💰 最近10条采购支出记录:');
    purchaseExpenses.for_each((record, index) => {
      console.log(`${index + 1}. ${record.description} - ¥${record.amount}`);
      console.log(`   时间: ${new Date(record.created_at).to_locale_string('zh-CN')}`);
    });

    // 7. 检查是否有制作成本记录
    const [productionCosts] = await connection.execute(`
      SELECT id, recordType, amount, description, referenceType, createdAt
      FROM financial_records 
      WHERE description LIKE '%制作%' OR description LIKE '%人工%' OR description LIKE '%工艺%'
      ORDER BY createdAt DESC
      LIMIT 10
    `);
    
    console.log('\n🔨 制作成本相关记录:');
    if (productionCosts.length === 0) {
      console.log('   ❌ 未找到任何制作成本记录!');
      console.log('   这可能是问题所在 - SKU制作应该产生人工成本和工艺成本记录');
    } else {
      productionCosts.for_each((record, index) => {
        console.log(`${index + 1}. ${record.description} - ¥${record.amount}`);
        console.log(`   类型: ${record.record_type} | 引用: ${record.reference_type}`);
        console.log(`   时间: ${new Date(record.created_at).to_locale_string('zh-CN')}`);
      });
    }

    await connection.end();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ 财务记录检查完成');
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message);
  }
}

checkFinancialRecords();