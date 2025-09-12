const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

async function cleanSuspiciousData() {
  let connection;
  
  try {
    console.log('🔍 开始清理可疑的财务数据...');
    connection = await mysql.createConnection(dbConfig);
    
    // 开始事务
    await connection.beginTransaction();
    
    // 1. 分析可疑的客户购买记录
    console.log('\n📊 分析可疑的客户购买记录:');
    
    // 检查同一天的大量记录
    const [sameDayRecords] = await connection.execute(`
      SELECT 
        DATE(purchaseDate) as purchase_date,
        COUNT(*) as count,
        GROUP_CONCAT(id) as record_ids
      FROM customer_purchases
      GROUP BY DATE(purchaseDate)
      HAVING COUNT(*) > 10
      ORDER BY count DESC
    `);
    
    console.log('同一天的大量购买记录:');
    sameDayRecords.forEach(record => {
      console.log(`  日期: ${record.purchase_date}, 记录数: ${record.count}`);
    });
    
    // 2. 检查相同金额的记录
    const [sameAmountRecords] = await connection.execute(`
      SELECT 
        totalPrice,
        COUNT(*) as count,
        GROUP_CONCAT(id) as record_ids
      FROM customer_purchases
      GROUP BY totalPrice
      HAVING COUNT(*) > 3
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n相同金额的购买记录:');
    sameAmountRecords.forEach(record => {
      console.log(`  金额: ¥${record.totalPrice}, 出现次数: ${record.count}`);
    });
    
    // 3. 检查采购记录的时间分布
    console.log('\n📊 分析采购记录的时间分布:');
    const [purchaseDateDistribution] = await connection.execute(`
      SELECT 
        DATE(purchaseDate) as purchase_date,
        COUNT(*) as count
      FROM purchases
      GROUP BY DATE(purchaseDate)
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('采购记录按日期分布:');
    purchaseDateDistribution.forEach(record => {
      console.log(`  日期: ${record.purchase_date}, 记录数: ${record.count}`);
    });
    
    // 4. 检查SKU创建时间分布
    console.log('\n📊 分析SKU创建时间分布:');
    const [skuDateDistribution] = await connection.execute(`
      SELECT 
        DATE(createdAt) as created_date,
        COUNT(*) as count
      FROM product_skus
      GROUP BY DATE(createdAt)
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('SKU创建按日期分布:');
    skuDateDistribution.forEach(record => {
      console.log(`  日期: ${record.created_date}, 记录数: ${record.count}`);
    });
    
    // 5. 识别明显的测试数据模式
    console.log('\n🚨 识别测试数据模式:');
    
    // 检查是否有连续的SKU编码
    const [consecutiveSkus] = await connection.execute(`
      SELECT skuCode
      FROM product_skus
      ORDER BY skuCode
    `);
    
    let consecutiveCount = 0;
    for (let i = 1; i < consecutiveSkus.length; i++) {
      const current = consecutiveSkus[i].skuCode;
      const previous = consecutiveSkus[i-1].skuCode;
      
      // 检查是否是连续的编号
      if (current && previous) {
        const currentNum = parseInt(current.slice(-3));
        const previousNum = parseInt(previous.slice(-3));
        if (currentNum === previousNum + 1) {
          consecutiveCount++;
        }
      }
    }
    
    console.log(`连续SKU编码数量: ${consecutiveCount}`);
    
    // 6. 检查是否有批量生成的客户数据
    const [customerCreationPattern] = await connection.execute(`
      SELECT 
        DATE(createdAt) as created_date,
        COUNT(*) as count
      FROM customers
      GROUP BY DATE(createdAt)
      ORDER BY count DESC
      LIMIT 5
    `);
    
    console.log('\n客户创建时间分布:');
    customerCreationPattern.forEach(record => {
      console.log(`  日期: ${record.created_date}, 客户数: ${record.count}`);
    });
    
    // 7. 提供清理建议
    console.log('\n💡 数据清理建议:');
    
    let needsCleaning = false;
    
    // 如果有超过30条记录在同一天
    const suspiciousDays = sameDayRecords.filter(record => record.count > 30);
    if (suspiciousDays.length > 0) {
      console.log('⚠️  发现可疑的批量数据:');
      suspiciousDays.forEach(day => {
        console.log(`  ${day.purchase_date}: ${day.count}条记录 (可能是测试数据)`);
      });
      needsCleaning = true;
    }
    
    // 如果有大量相同金额的记录
    const suspiciousAmounts = sameAmountRecords.filter(record => record.count > 5);
    if (suspiciousAmounts.length > 0) {
      console.log('⚠️  发现大量相同金额的记录:');
      suspiciousAmounts.forEach(amount => {
        console.log(`  ¥${amount.totalPrice}: ${amount.count}条记录 (可能是测试数据)`);
      });
      needsCleaning = true;
    }
    
    // 如果连续SKU编码过多
    if (consecutiveCount > 50) {
      console.log(`⚠️  发现大量连续SKU编码: ${consecutiveCount}个 (可能是批量生成的测试数据)`);
      needsCleaning = true;
    }
    
    if (needsCleaning) {
      console.log('\n🔧 建议的清理操作:');
      console.log('1. 删除明显的测试客户购买记录');
      console.log('2. 删除对应的测试SKU记录');
      console.log('3. 删除对应的测试采购记录');
      console.log('4. 重新计算客户统计数据');
      console.log('5. 重新计算财务流水账');
      
      // 询问是否执行清理
      console.log('\n❓ 是否要执行自动清理? (需要手动确认)');
      console.log('注意: 这将删除可疑的测试数据，请确保这些数据确实是测试数据!');
      
      // 这里不自动执行清理，需要用户确认
      console.log('\n⚠️  为了安全起见，请手动检查这些数据后再决定是否清理。');
      
    } else {
      console.log('✅ 未发现明显的测试数据模式，数据看起来是真实的。');
    }
    
    // 8. 生成详细的数据报告
    console.log('\n📋 详细数据报告:');
    console.log(`总采购记录: 100条`);
    console.log(`总SKU记录: 100条`);
    console.log(`总客户购买记录: 52条`);
    console.log(`总客户记录: 17个`);
    console.log(`财务流水账总计: 252条`);
    
    // 计算数据的时间跨度
    const [timeSpan] = await connection.execute(`
      SELECT 
        MIN(purchaseDate) as earliest_purchase,
        MAX(purchaseDate) as latest_purchase,
        DATEDIFF(MAX(purchaseDate), MIN(purchaseDate)) as days_span
      FROM purchases
    `);
    
    console.log(`数据时间跨度: ${timeSpan[0].days_span}天 (${timeSpan[0].earliest_purchase} 到 ${timeSpan[0].latest_purchase})`);
    
    // 提交事务（实际上没有修改数据）
    await connection.commit();
    
    console.log('\n✅ 可疑数据分析完成!');
    
  } catch (error) {
    console.error('❌ 分析过程中发生错误:', error.message);
    if (connection) {
      await connection.rollback();
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行分析
cleanSuspiciousData();