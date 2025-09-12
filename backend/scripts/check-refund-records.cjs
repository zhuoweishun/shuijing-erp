const mysql = require('mysql2/promise');

// 检查财务记录中的退款异常
async function checkRefundRecords() {
  let connection;
  
  try {
    console.log('🔍 检查财务记录中的退款异常...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      port: 3306
    });
    
    // 获取所有退款记录
    const [refundRecords] = await connection.execute(`
      SELECT id, recordType, amount, description, referenceType, referenceId, createdAt 
      FROM financial_records 
      WHERE recordType = 'REFUND' 
      ORDER BY referenceId, createdAt
    `);
    
    console.log('退款记录总数:', refundRecords.length);
    
    // 按referenceId分组检查重复记录
    const groupedByRef = {};
    refundRecords.forEach(record => {
      const key = record.referenceId || 'no_ref';
      if (!groupedByRef[key]) groupedByRef[key] = [];
      groupedByRef[key].push(record);
    });
    
    console.log('\n🔍 检查重复退款记录:');
    let duplicateCount = 0;
    Object.keys(groupedByRef).forEach(refId => {
      const records = groupedByRef[refId];
      if (records.length > 1) {
        duplicateCount++;
        console.log(`\n⚠️  referenceId ${refId} 有 ${records.length} 条记录:`);
        records.forEach(r => {
          console.log(`  - ID: ${r.id}, 金额: ${r.amount}, 时间: ${r.createdAt}`);
        });
      }
    });
    
    if (duplicateCount === 0) {
      console.log('✅ 没有发现重复的退款记录');
    } else {
      console.log(`❌ 发现 ${duplicateCount} 个重复退款记录`);
    }
    
    console.log('\n🔍 检查正负金额异常:');
    let positiveRefundCount = 0;
    refundRecords.forEach(record => {
      if (record.amount > 0) {
        positiveRefundCount++;
        console.log(`⚠️  退款记录为正数: ID ${record.id}, 金额: ${record.amount}, 描述: ${record.description}`);
      }
    });
    
    if (positiveRefundCount === 0) {
      console.log('✅ 所有退款记录金额都为负数（正确）');
    } else {
      console.log(`❌ 发现 ${positiveRefundCount} 条退款记录为正数（错误）`);
    }
    
    // 检查是否有同一笔退货既有正数又有负数记录
    console.log('\n🔍 检查同一退货的正负记录:');
    let conflictCount = 0;
    Object.keys(groupedByRef).forEach(refId => {
      const records = groupedByRef[refId];
      if (records.length > 1) {
        const hasPositive = records.some(r => r.amount > 0);
        const hasNegative = records.some(r => r.amount < 0);
        if (hasPositive && hasNegative) {
          conflictCount++;
          console.log(`❌ referenceId ${refId} 既有正数又有负数记录:`);
          records.forEach(r => {
            console.log(`  - ID: ${r.id}, 金额: ${r.amount}`);
          });
        }
      }
    });
    
    if (conflictCount === 0) {
      console.log('✅ 没有发现同一退货的正负冲突记录');
    } else {
      console.log(`❌ 发现 ${conflictCount} 个退货有正负冲突记录`);
    }
    
    console.log('\n📊 检查结果汇总:');
    console.log(`- 退款记录总数: ${refundRecords.length}`);
    console.log(`- 重复记录数: ${duplicateCount}`);
    console.log(`- 正数退款记录数: ${positiveRefundCount}`);
    console.log(`- 正负冲突记录数: ${conflictCount}`);
    
    if (duplicateCount > 0 || positiveRefundCount > 0 || conflictCount > 0) {
      console.log('\n❌ 发现财务记录异常，需要修复！');
    } else {
      console.log('\n✅ 财务记录正常');
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行检查
if (require.main === module) {
  checkRefundRecords()
    .then(() => {
      console.log('\n✨ 检查完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 检查失败:', error);
      process.exit(1);
    });
}

module.exports = { checkRefundRecords };