const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

async function auditFinancialRecords() {
  let connection;
  
  try {
    console.log('🔍 开始财务流水账数据审计...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. 查询采购记录统计
    console.log('\n📊 采购记录统计:');
    const [purchaseStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_count,
        SUM(totalPrice) as total_amount,
        AVG(totalPrice) as avg_amount,
        MIN(purchaseDate) as earliest_date,
        MAX(purchaseDate) as latest_date
      FROM purchases
    `);
    
    console.log(`采购记录总数: ${purchaseStats[0].total_count}`);
    console.log(`采购总金额: ¥${purchaseStats[0].total_amount || 0}`);
    console.log(`平均采购金额: ¥${purchaseStats[0].avg_amount ? Number(purchaseStats[0].avg_amount).toFixed(2) : '0.00'}`);
    console.log(`采购时间范围: ${purchaseStats[0].earliest_date} 到 ${purchaseStats[0].latest_date}`);
    
    // 2. 查询SKU制作成本统计
    console.log('\n🔧 SKU制作成本统计:');
    const [skuStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_skus,
        COUNT(CASE WHEN laborCost > 0 OR craftCost > 0 THEN 1 END) as skus_with_cost,
        SUM(laborCost + craftCost) as total_cost,
        AVG(laborCost + craftCost) as avg_cost
      FROM product_skus
    `);
    
    console.log(`SKU总数: ${skuStats[0].total_skus}`);
    console.log(`有制作成本的SKU: ${skuStats[0].skus_with_cost}`);
    console.log(`总制作成本: ¥${skuStats[0].total_cost || 0}`);
    console.log(`平均制作成本: ¥${skuStats[0].avg_cost ? Number(skuStats[0].avg_cost).toFixed(2) : '0.00'}`);
    
    // 3. 查询客户购买记录统计
    console.log('\n👥 客户购买记录统计:');
    const [customerStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_purchases,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_purchases,
        COUNT(CASE WHEN status = 'REFUNDED' THEN 1 END) as refunded_purchases,
        SUM(CASE WHEN status = 'ACTIVE' THEN totalPrice ELSE 0 END) as active_amount,
        SUM(CASE WHEN status = 'REFUNDED' THEN totalPrice ELSE 0 END) as refunded_amount,
        COUNT(DISTINCT customerId) as unique_customers,
        COUNT(DISTINCT skuId) as unique_skus
      FROM customer_purchases
    `);
    
    console.log(`客户购买记录总数: ${customerStats[0].total_purchases}`);
    console.log(`有效购买记录: ${customerStats[0].active_purchases}`);
    console.log(`退货记录: ${customerStats[0].refunded_purchases}`);
    console.log(`有效销售金额: ¥${customerStats[0].active_amount || 0}`);
    console.log(`退货金额: ¥${customerStats[0].refunded_amount || 0}`);
    console.log(`涉及客户数: ${customerStats[0].unique_customers}`);
    console.log(`涉及SKU数: ${customerStats[0].unique_skus}`);
    
    // 4. 计算财务流水账总数
    console.log('\n💰 财务流水账总计算:');
    
    // 采购支出
    const purchaseExpense = purchaseStats[0].total_amount || 0;
    console.log(`采购支出记录: ${purchaseStats[0].total_count}条, 金额: ¥${purchaseExpense}`);
    
    // SKU制作成本
    const skuCostExpense = skuStats[0].total_cost || 0;
    const skuCostRecords = skuStats[0].skus_with_cost || 0;
    console.log(`SKU制作成本记录: ${skuCostRecords}条, 金额: ¥${skuCostExpense}`);
    
    // 客户销售收入
    const salesIncome = customerStats[0].active_amount || 0;
    const salesRecords = customerStats[0].active_purchases || 0;
    console.log(`客户销售收入记录: ${salesRecords}条, 金额: ¥${salesIncome}`);
    
    // 客户退货
    const refundAmount = customerStats[0].refunded_amount || 0;
    const refundRecords = customerStats[0].refunded_purchases || 0;
    console.log(`客户退货记录: ${refundRecords}条, 金额: ¥${refundAmount}`);
    
    // 总计
    const totalRecords = purchaseStats[0].total_count + skuCostRecords + salesRecords + refundRecords;
    const totalExpense = Number(purchaseExpense) + Number(skuCostExpense) + Number(refundAmount);
    const totalIncome = Number(salesIncome);
    const netProfit = totalIncome - totalExpense;
    
    console.log('\n📋 财务流水账汇总:');
    console.log(`总记录数: ${totalRecords}条`);
    console.log(`总支出: ¥${totalExpense.toFixed(2)}`);
    console.log(`总收入: ¥${totalIncome.toFixed(2)}`);
    console.log(`净利润: ¥${netProfit.toFixed(2)}`);
    
    // 5. 数据完整性检查
    console.log('\n⚠️  数据完整性检查:');
    
    // 检查无效SKU关联
    const [invalidSkus] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM customer_purchases cp
      LEFT JOIN product_skus ps ON cp.skuId = ps.id
      WHERE ps.id IS NULL
    `);
    console.log(`无效SKU关联: ${invalidSkus[0].count}条`);
    
    // 检查无效客户关联
    const [invalidCustomers] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM customer_purchases cp
      LEFT JOIN customers c ON cp.customerId = c.id
      WHERE c.id IS NULL
    `);
    console.log(`无效客户关联: ${invalidCustomers[0].count}条`);
    
    // 检查重复记录
    const [duplicates] = await connection.execute(`
      SELECT COUNT(*) as duplicate_groups
      FROM (
        SELECT customerId, skuId, purchaseDate, totalPrice, COUNT(*) as cnt
        FROM customer_purchases
        GROUP BY customerId, skuId, purchaseDate, totalPrice
        HAVING COUNT(*) > 1
      ) as dup
    `);
    console.log(`重复购买记录组: ${duplicates[0].duplicate_groups}组`);
    
    // 6. 异常数据检查
    console.log('\n🚨 异常数据检查:');
    
    // 检查异常高价记录
    const [highValuePurchases] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM customer_purchases
      WHERE totalPrice > 1000
    `);
    console.log(`异常高价客户购买(>1000元): ${highValuePurchases[0].count}条`);
    
    const [highValueSupplierPurchases] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM purchases
      WHERE totalPrice > 5000
    `);
    console.log(`异常高价采购(>5000元): ${highValueSupplierPurchases[0].count}条`);
    
    // 检查零金额或负金额记录
    const [zeroNegativePurchases] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM customer_purchases
      WHERE totalPrice <= 0
    `);
    console.log(`零/负金额客户购买: ${zeroNegativePurchases[0].count}条`);
    
    const [zeroNegativeSupplierPurchases] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM purchases
      WHERE totalPrice <= 0
    `);
    console.log(`零/负金额采购: ${zeroNegativeSupplierPurchases[0].count}条`);
    
    // 7. 详细分析可疑记录
    if (totalRecords > 200) {
      console.log('\n🔍 详细分析 - 记录数量异常高，检查可疑数据:');
      
      // 检查是否有大量相同金额的记录
      const [sameAmountRecords] = await connection.execute(`
        SELECT totalPrice, COUNT(*) as count
        FROM customer_purchases
        GROUP BY totalPrice
        HAVING COUNT(*) > 5
        ORDER BY count DESC
        LIMIT 10
      `);
      
      if (sameAmountRecords.length > 0) {
        console.log('相同金额的购买记录(可能是测试数据):');
        sameAmountRecords.forEach(record => {
          console.log(`  金额: ¥${record.totalPrice}, 出现次数: ${record.count}`);
        });
      }
      
      // 检查是否有大量相同日期的记录
      const [sameDateRecords] = await connection.execute(`
        SELECT DATE(purchaseDate) as purchase_date, COUNT(*) as count
        FROM customer_purchases
        GROUP BY DATE(purchaseDate)
        HAVING COUNT(*) > 10
        ORDER BY count DESC
        LIMIT 10
      `);
      
      if (sameDateRecords.length > 0) {
        console.log('\n相同日期的大量购买记录(可能是批量生成的测试数据):');
        sameDateRecords.forEach(record => {
          console.log(`  日期: ${record.purchase_date}, 记录数: ${record.count}`);
        });
      }
    }
    
    console.log('\n✅ 财务流水账数据审计完成!');
    
    if (totalRecords !== 252) {
      console.log(`\n⚠️  注意: 实际计算的流水账记录数(${totalRecords})与您提到的252条不符!`);
      console.log('可能的原因:');
      console.log('1. 财务视图的查询逻辑与实际业务表结构不匹配');
      console.log('2. 存在其他类型的财务记录未被统计');
      console.log('3. 之前的252条包含了已被清理的虚假数据');
    }
    
  } catch (error) {
    console.error('❌ 审计过程中发生错误:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行审计
auditFinancialRecords();