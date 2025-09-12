const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function analyzeFinancialGap() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  console.log('🔍 分析财务记录与客户购买的差异:');
  
  // 获取所有客户购买记录
  console.log('\n=== 所有客户购买记录 ===');
  const [allPurchases] = await connection.execute(
    'SELECT id, customerId, skuName, totalPrice, status, purchaseDate FROM customer_purchases ORDER BY purchaseDate DESC'
  );
  console.log(`总购买记录数: ${allPurchases.length}`);
  
  let totalPurchaseAmount = 0;
  let activePurchaseAmount = 0;
  let refundedAmount = 0;
  
  allPurchases.forEach((purchase, index) => {
    totalPurchaseAmount += parseFloat(purchase.totalPrice);
    if (purchase.status !== 'REFUNDED') {
      activePurchaseAmount += parseFloat(purchase.totalPrice);
    } else {
      refundedAmount += parseFloat(purchase.totalPrice);
    }
    console.log(`${index + 1}. ID:${purchase.id} 客户:${purchase.customerId} SKU:${purchase.skuName} 金额:¥${purchase.totalPrice} 状态:${purchase.status}`);
  });
  
  console.log(`\n购买统计:`);
  console.log(`总购买金额: ¥${totalPurchaseAmount.toFixed(2)}`);
  console.log(`有效购买金额(非退款): ¥${activePurchaseAmount.toFixed(2)}`);
  console.log(`退款金额: ¥${refundedAmount.toFixed(2)}`);
  
  // 检查哪些购买记录没有对应的财务INCOME记录
  console.log('\n=== 检查缺失的财务INCOME记录 ===');
  const [missingIncomeRecords] = await connection.execute(`
    SELECT cp.id, cp.customerId, cp.skuName, cp.totalPrice, cp.status, cp.purchaseDate
    FROM customer_purchases cp
    LEFT JOIN financial_records fr ON cp.id = fr.referenceId AND fr.recordType = 'INCOME'
    WHERE fr.id IS NULL AND cp.status != 'REFUNDED'
    ORDER BY cp.purchaseDate DESC
  `);
  
  if (missingIncomeRecords.length > 0) {
    console.log(`⚠️ 发现${missingIncomeRecords.length}条购买记录缺少对应的财务INCOME记录:`);
    let missingAmount = 0;
    missingIncomeRecords.forEach((record, index) => {
      missingAmount += parseFloat(record.totalPrice);
      console.log(`${index + 1}. 购买ID:${record.id} 客户:${record.customerId} SKU:${record.skuName} 金额:¥${record.totalPrice} 日期:${record.purchaseDate}`);
    });
    console.log(`缺失的财务记录总金额: ¥${missingAmount.toFixed(2)}`);
  } else {
    console.log('✅ 所有有效购买记录都有对应的财务INCOME记录');
  }
  
  // 检查是否有多余的财务INCOME记录
  console.log('\n=== 检查多余的财务INCOME记录 ===');
  const [extraIncomeRecords] = await connection.execute(`
    SELECT fr.id, fr.referenceId, fr.amount, fr.description, fr.createdAt
    FROM financial_records fr
    LEFT JOIN customer_purchases cp ON fr.referenceId = cp.id
    WHERE fr.recordType = 'INCOME' AND cp.id IS NULL
    ORDER BY fr.createdAt DESC
  `);
  
  if (extraIncomeRecords.length > 0) {
    console.log(`⚠️ 发现${extraIncomeRecords.length}条财务INCOME记录没有对应的购买记录:`);
    let extraAmount = 0;
    extraIncomeRecords.forEach((record, index) => {
      extraAmount += parseFloat(record.amount);
      console.log(`${index + 1}. 财务ID:${record.id} 引用ID:${record.referenceId} 金额:¥${record.amount} 描述:${record.description}`);
    });
    console.log(`多余的财务记录总金额: ¥${extraAmount.toFixed(2)}`);
  } else {
    console.log('✅ 所有财务INCOME记录都有对应的购买记录');
  }
  
  await connection.end();
}

analyzeFinancialGap().catch(console.error);