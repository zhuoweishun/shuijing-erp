const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

async function fixFinancialRecords() {
  let connection;
  
  try {
    console.log('🔧 开始修复财务记录...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. 清理现有的财务记录（只清理客户购买和退货相关的）
    console.log('\n🗑️ 清理现有的客户购买和退货财务记录...');
    const [deleteResult] = await connection.execute(`
      DELETE FROM financial_records 
      WHERE referenceType IN ('SALE', 'REFUND') 
      OR description LIKE '%客户购买%' 
      OR description LIKE '%客户退货%'
    `);
    console.log(`已删除 ${deleteResult.affectedRows} 条旧的财务记录`);
    
    // 2. 获取一个有效的用户ID
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    const userId = users[0]?.id || 'default-user';
    console.log(`使用用户ID: ${userId}`);
    
    // 3. 为所有ACTIVE状态的客户购买记录创建财务收入记录
    console.log('\n💰 为ACTIVE客户购买记录创建财务收入记录...');
    const [activePurchases] = await connection.execute(`
      SELECT 
        cp.id,
        cp.customerId,
        cp.skuId,
        cp.skuName,
        cp.quantity,
        cp.unitPrice,
        cp.totalPrice,
        cp.purchaseDate,
        cp.createdAt,
        c.name as customerName
      FROM customer_purchases cp
      JOIN customers c ON cp.customerId = c.id
      WHERE cp.status = 'ACTIVE'
    `);
    
    console.log(`找到 ${activePurchases.length} 条ACTIVE购买记录`);
    
    for (const purchase of activePurchases) {
      const recordId = generateId();
      await connection.execute(`
        INSERT INTO financial_records (
          id, recordType, amount, description, referenceType, referenceId, 
          category, transactionDate, notes, userId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        recordId,
        'INCOME',
        purchase.totalPrice,
        `销售收入 - ${purchase.skuName}`,
        'SALE',
        purchase.skuId,
        '销售收入',
        purchase.purchaseDate,
        `客户：${purchase.customerName}，数量：${purchase.quantity}件`,
        userId, // 使用真实用户ID
        purchase.createdAt,
        new Date()
      ]);
    }
    
    console.log(`✅ 已创建 ${activePurchases.length} 条收入记录`);
    
    // 4. 为所有REFUNDED状态的客户购买记录创建财务退款记录
    console.log('\n💸 为REFUNDED客户购买记录创建财务退款记录...');
    const [refundedPurchases] = await connection.execute(`
      SELECT 
        cp.id,
        cp.customerId,
        cp.skuId,
        cp.skuName,
        cp.quantity,
        cp.unitPrice,
        cp.totalPrice,
        cp.refundDate,
        cp.refundReason,
        cp.refundNotes,
        cp.createdAt,
        c.name as customerName
      FROM customer_purchases cp
      JOIN customers c ON cp.customerId = c.id
      WHERE cp.status = 'REFUNDED'
    `);
    
    console.log(`找到 ${refundedPurchases.length} 条REFUNDED购买记录`);
    
    for (const purchase of refundedPurchases) {
      const recordId = generateId();
      const refundDate = purchase.refundDate || purchase.createdAt;
      await connection.execute(`
        INSERT INTO financial_records (
          id, recordType, amount, description, referenceType, referenceId, 
          category, transactionDate, notes, userId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        recordId,
        'REFUND',
        purchase.totalPrice,
        `客户退货退款 - ${purchase.skuName}`,
        'REFUND',
        purchase.id,
        '客户退货',
        refundDate,
        `客户：${purchase.customerName}，退货原因：${purchase.refundReason || '未知'}，退货数量：${purchase.quantity}件${purchase.refundNotes ? `，备注：${purchase.refundNotes}` : ''}`,
        userId, // 使用真实用户ID
        refundDate,
        new Date()
      ]);
    }
    
    console.log(`✅ 已创建 ${refundedPurchases.length} 条退款记录`);
    
    // 5. 验证修复结果
    console.log('\n🔍 验证修复结果...');
    const [verifyStats] = await connection.execute(`
      SELECT 
        recordType,
        category,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM financial_records 
      WHERE userId = ?
      AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
      GROUP BY recordType, category
    `, [userId]);
    
    console.log('\n📊 修复后的财务记录统计：');
    verifyStats.forEach(stat => {
      console.log(`${stat.recordType} (${stat.category}): ${stat.count}条记录, 总金额: ¥${stat.total_amount}`);
    });
    
    // 6. 计算净收入
    const [netIncomeResult] = await connection.execute(`
      SELECT 
        SUM(CASE WHEN recordType = 'INCOME' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN recordType = 'REFUND' THEN amount ELSE 0 END) as total_refund
      FROM financial_records 
      WHERE userId = ?
      AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
    `, [userId]);
    
    const netIncome = netIncomeResult[0];
    const actualNetIncome = (netIncome.total_income || 0) - (netIncome.total_refund || 0);
    
    console.log('\n💰 财务汇总：');
    console.log(`总收入: ¥${netIncome.total_income || 0}`);
    console.log(`总退款: ¥${netIncome.total_refund || 0}`);
    console.log(`净收入: ¥${actualNetIncome}`);
    
    // 7. 对比客户购买记录
    const [customerComparison] = await connection.execute(`
      SELECT 
        SUM(CASE WHEN status = 'ACTIVE' THEN totalPrice ELSE 0 END) as active_total,
        SUM(CASE WHEN status = 'REFUNDED' THEN totalPrice ELSE 0 END) as refunded_total
      FROM customer_purchases
    `);
    
    const customerData = customerComparison[0];
    const customerNetIncome = (customerData.active_total || 0) - (customerData.refunded_total || 0);
    
    console.log('\n👥 客户购买记录对比：');
    console.log(`客户有效购买: ¥${customerData.active_total || 0}`);
    console.log(`客户退款购买: ¥${customerData.refunded_total || 0}`);
    console.log(`客户净消费: ¥${customerNetIncome}`);
    
    console.log('\n✅ 财务记录修复完成！');
    
    if (Math.abs(actualNetIncome - customerNetIncome) < 0.01) {
      console.log('🎉 财务数据与客户数据完全一致！');
    } else {
      console.log(`⚠️ 存在差异: ¥${actualNetIncome - customerNetIncome}`);
    }
    
  } catch (error) {
    console.error('❌ 修复财务记录时出错:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 生成唯一ID的函数
function generateId() {
  return 'fr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

fixFinancialRecords();