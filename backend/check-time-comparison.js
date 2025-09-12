import mysql from 'mysql2/promise';

async function checkTimes() {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('=== 检查purchases表的时间数据 ===');
    const [purchases] = await connection.execute(
      'SELECT id, product_name, total_price, purchase_date, createdAt FROM purchases ORDER BY createdAt DESC LIMIT 10'
    );
    purchases.for_each(p => {
      console.log(`ID: ${p.id}, 产品: ${p.product_name}, 金额: ${p.total_price}, 采购日期: ${p.purchase_date}, 创建时间: ${p.created_at}`);
    });

    console.log('\n=== 检查financial_records表的时间数据 ===');
    const [records] = await connection.execute(
      'SELECT id, recordType, description, amount, transactionDate, createdAt FROM financial_records WHERE recordType = "EXPENSE" ORDER BY transactionDate DESC LIMIT 10'
    );
    records.for_each(r => {
      console.log(`ID: ${r.id}, 类型: ${r.record_type}, 描述: ${r.description}, 金额: ${r.amount}, 交易日期: ${r.transaction_date}, 创建时间: ${r.created_at}`);
    });

    console.log('\n=== 对比相同采购记录的时间 ===');
    const [comparison] = await connection.execute(`
      SELECT 
        p.id as purchase_id, 
        p.product_name, 
        p.total_price, 
        p.purchase_date as purchase_date,
        p.created_at as purchase_created_time, 
        fr.transaction_date as record_transaction_time,
        fr.created_at as record_created_time,
        fr.id as record_id
      FROM purchases p 
      LEFT JOIN financial_records fr ON fr.reference_id = p.id
        AND fr.record_type = 'EXPENSE' 
      ORDER BY p.created_at DESC 
      LIMIT 5
    `);
    
    comparison.for_each(c => {
      const purchaseTimeDiff = c.purchase_date && c.record_transaction_time ? 
        Math.abs(new Date(c.purchase_date) - new Date(c.record_transaction_time)) / 1000 : 'N/A';
      const createdTimeDiff = c.purchase_created_time && c.record_created_time ? 
        Math.abs(new Date(c.purchase_created_time) - new Date(c.record_created_time)) / 1000 : 'N/A';
      console.log(`采购ID: ${c.purchase_id}, 产品: ${c.product_name}, 采购日期: ${c.purchase_date}, 流水交易日期: ${c.record_transaction_time}, 采购创建时间: ${c.purchase_created_time}, 流水创建时间: ${c.record_created_time}`);
      console.log(`  采购日期与流水交易日期差: ${purchaseTimeDiff}秒, 创建时间差: ${createdTimeDiff}秒`);
    });

    console.log('\n=== 检查是否有未来时间 ===');
    const now = new Date();
    console.log(`当前时间: ${now}`);
    
    const [futurePurchases] = await connection.execute(
      'SELECT id, product_name, purchase_date, createdAt FROM purchases WHERE purchaseDate > NOW() OR createdAt > NOW() ORDER BY createdAt DESC'
    );
    
    if (futurePurchases.length > 0) {
      console.log('发现未来时间的采购记录:');
      futurePurchases.for_each(r => {
        console.log(`ID: ${r.id}, 产品: ${r.product_name}, 采购日期: ${r.purchase_date}, 创建时间: ${r.created_at}`);
      });
    } else {
      console.log('没有发现未来时间的采购记录');
    }

    const [futureFinancial] = await connection.execute(
      'SELECT id, description, transactionDate, createdAt FROM financial_records WHERE transactionDate > NOW() OR createdAt > NOW() ORDER BY transactionDate DESC'
    );
    
    if (futureFinancial.length > 0) {
      console.log('发现未来时间的财务记录:');
      futureFinancial.for_each(r => {
        console.log(`ID: ${r.id}, 描述: ${r.description}, 交易日期: ${r.transaction_date}, 创建时间: ${r.created_at}`);
      });
    } else {
      console.log('没有发现未来时间的财务记录');
    }

    await connection.end();
  } catch (error) {
    console.error('检查时间数据时出错:', error);
  }
}

checkTimes();