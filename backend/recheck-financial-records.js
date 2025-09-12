import mysql from 'mysql2/promise';

async function recheckFinancialRecords() {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('🔍 重新检查财务记录...');
    console.log('=' .repeat(60));

    // 1. 检查财务记录总数
    const [count] = await connection.execute('SELECT COUNT(*) as count FROM financial_records');
    console.log(`💰 financial_records表实际记录数: ${count[0].count}`);

    if (count[0].count > 0) {
      // 2. 检查最新的财务记录
      const [records] = await connection.execute(`
        SELECT id, recordType, amount, description, referenceType, 
               transactionDate, created_at 
        FROM financial_records 
        ORDER BY transactionDate DESC, created_at DESC 
        LIMIT 10
      `);
      
      console.log('\n📋 最新10条财务记录:');
      records.for_each((record, i) => {
        const transactionDate = new Date(record.transactionDate);
        const created_at = new Date(record.created_at);
        const now = new Date();
        const isFutureTransaction = transactionDate > now;
        const isFutureCreated = created_at > now;
        
        console.log(`${i+1}. ${record.description} - ¥${record.amount}`);
        console.log(`   类型: ${record.record_type} | 引用: ${record.reference_type}`);
        console.log(`   交易时间: ${transactionDate.to_locale_string('zh-CN')} ${isFutureTransaction ? '⚠️ 未来时间!' : ''}`);
        console.log(`   创建时间: ${created_at.to_locale_string('zh-CN')} ${isFutureCreated ? '⚠️ 未来时间!' : ''}`);
        console.log('');
      });

      // 3. 检查未来时间记录数量
      const [futureCount] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM financial_records 
        WHERE transactionDate > NOW() OR createdAt > NOW()
      `);
      console.log(`⚠️ 未来时间记录数量: ${futureCount[0].count}`);

      // 4. 检查记录类型统计
      const [typeStats] = await connection.execute(`
        SELECT recordType, referenceType, COUNT(*) as count 
        FROM financial_records 
        GROUP BY recordType, referenceType 
        ORDER BY count DESC
      `);
      
      console.log('\n📊 记录类型统计:');
      typeStats.for_each(stat => {
        console.log(`   ${stat.record_type} - ${stat.reference_type}: ${stat.count} 条`);
      });

      // 5. 检查最早和最晚的记录时间
      const [timeRange] = await connection.execute(`
        SELECT 
          MIN(transactionDate) as earliest_transaction,
          MAX(transactionDate) as latest_transaction,
          MIN(createdAt) as earliest_created,
          MAX(createdAt) as latest_created
        FROM financial_records
      `);
      
      console.log('\n⏰ 时间范围:');
      console.log(`   最早交易时间: ${new Date(timeRange[0].earliest_transaction).to_locale_string('zh-CN')}`);
      console.log(`   最晚交易时间: ${new Date(timeRange[0].latest_transaction).to_locale_string('zh-CN')}`);
      console.log(`   最早创建时间: ${new Date(timeRange[0].earliest_created).to_locale_string('zh-CN')}`);
      console.log(`   最晚创建时间: ${new Date(timeRange[0].latest_created).to_locale_string('zh-CN')}`);

      // 6. 检查具体的未来时间记录
      if (futureCount[0].count > 0) {
        const [futureRecords] = await connection.execute(`
          SELECT description, transactionDate, created_at, recordType, referenceType
          FROM financial_records 
          WHERE transactionDate > NOW() OR created_at > NOW()
          ORDER BY transactionDate DESC
          LIMIT 5
        `);
        
        console.log('\n🚨 未来时间记录示例:');
        futureRecords.for_each((record, i) => {
          console.log(`${i+1}. ${record.description}`);
          console.log(`   交易时间: ${new Date(record.transactionDate).to_locale_string('zh-CN')}`);
          console.log(`   创建时间: ${new Date(record.created_at).to_locale_string('zh-CN')}`);
          console.log(`   类型: ${record.record_type} - ${record.reference_type}`);
          console.log('');
        });
      }

      // 7. 检查制作成本相关记录
      const [productionRecords] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM financial_records 
        WHERE referenceType = 'PRODUCTION' 
           OR description LIKE '%制作%' 
           OR description LIKE '%人工%' 
           OR description LIKE '%工艺%'
      `);
      
      console.log(`\n🔧 制作成本相关记录: ${productionRecords[0].count} 条`);
      
      if (productionRecords[0].count > 0) {
        const [productionDetails] = await connection.execute(`
          SELECT description, amount, transactionDate, notes
          FROM financial_records 
          WHERE referenceType = 'PRODUCTION' 
             OR description LIKE '%制作%' 
             OR description LIKE '%人工%' 
             OR description LIKE '%工艺%'
          ORDER BY transactionDate DESC
          LIMIT 5
        `);
        
        console.log('\n制作成本记录示例:');
        productionDetails.for_each((record, i) => {
          console.log(`${i+1}. ${record.description} - ¥${record.amount}`);
          console.log(`   时间: ${new Date(record.transactionDate).to_locale_string('zh-CN')}`);
          if (record.notes) {
            console.log(`   备注: ${record.notes}`);
          }
          console.log('');
        });
      }

    } else {
      console.log('\n❌ 财务记录表确实为空!');
    }

    await connection.end();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ 财务记录重新检查完成');
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message);
  }
}

recheckFinancialRecords();