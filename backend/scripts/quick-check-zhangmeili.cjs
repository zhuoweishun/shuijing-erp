const mysql = require('mysql2/promise');
require('dotenv').config();

async function quickCheckZhangmeili() {
  let connection;
  
  try {
    const databaseUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
    const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!urlMatch) {
      throw new Error('无法解析DATABASE_URL');
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: parseInt(port)
    });

    console.log('🔍 快速检查张美丽的购买记录...');

    // 查找张美丽
    const [customers] = await connection.execute(
      'SELECT * FROM customers WHERE name = ?',
      ['张美丽']
    );

    if (customers.length === 0) {
      console.log('❌ 未找到客户"张美丽"');
      return;
    }

    const customer = customers[0];
    console.log(`✅ 找到客户: ${customer.name} (ID: ${customer.id})`);

    // 统计购买记录
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT skuId) as unique_skus,
        SUM(quantity) as total_quantity,
        SUM(totalPrice) as total_amount
      FROM customer_purchases 
      WHERE customerId = ? AND status = 'ACTIVE'
    `, [customer.id]);

    console.log('📊 购买统计:');
    console.log(`   购买记录总数: ${stats[0].total_records} 条`);
    console.log(`   不同SKU数量: ${stats[0].unique_skus} 个`);
    console.log(`   总购买件数: ${stats[0].total_quantity} 件`);
    console.log(`   总购买金额: ¥${parseFloat(stats[0].total_amount || 0).toFixed(2)}`);

    // 检查是否有重复SKU
    const [duplicates] = await connection.execute(`
      SELECT skuId, COUNT(*) as count
      FROM customer_purchases 
      WHERE customerId = ? AND status = 'ACTIVE'
      GROUP BY skuId
      HAVING COUNT(*) > 1
    `, [customer.id]);

    if (duplicates.length > 0) {
      console.log('⚠️  发现重复SKU购买:');
      duplicates.forEach(dup => {
        console.log(`   SKU ID ${dup.skuId}: ${dup.count} 条记录`);
      });
    } else {
      console.log('✅ 没有重复SKU购买记录');
    }

    // 结论
    if (stats[0].total_records === stats[0].unique_skus) {
      console.log('\n✅ 数据正常: 每个SKU只有一条购买记录');
    } else {
      console.log('\n❌ 数据异常: 购买记录数与SKU数量不匹配');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

quickCheckZhangmeili().catch(console.error);