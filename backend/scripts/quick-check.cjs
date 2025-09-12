const mysql = require('mysql2/promise');
require('dotenv').config();

async function quickCheck() {
  let connection;
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    const [, user, password, host, port, database] = urlMatch;
    
    connection = await mysql.createConnection({
      host, user, password, database, port: parseInt(port)
    });

    console.log('🔍 快速检查张美丽的购买记录...');
    
    // 查找张美丽
    const [customers] = await connection.execute(
      'SELECT id, name, phone FROM customers WHERE name = ?', ['张美丽']
    );

    if (customers.length === 0) {
      console.log('❌ 未找到客户"张美丽"');
      return;
    }

    const customer = customers[0];
    console.log(`✅ 找到客户: ${customer.name} (ID: ${customer.id}, 电话: ${customer.phone || '无'})`);
    
    // 查询购买记录数量
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM customer_purchases WHERE customer_id = ?', 
      [customer.id]
    );
    
    const totalRecords = countResult[0].count;
    console.log(`📊 购买记录总数: ${totalRecords} 条`);
    
    if (totalRecords === 0) {
      console.log('❌ 张美丽没有任何购买记录');
      return;
    }
    
    // 查询不同SKU数量
    const [skuCountResult] = await connection.execute(
      'SELECT COUNT(DISTINCT sku_id) as unique_skus FROM customer_purchases WHERE customer_id = ?', 
      [customer.id]
    );
    
    const uniqueSkuCount = skuCountResult[0].unique_skus;
    console.log(`🎯 购买的不同SKU数量: ${uniqueSkuCount} 个`);
    
    // 查询总购买件数
    const [quantityResult] = await connection.execute(
      'SELECT SUM(quantity) as total_quantity FROM customer_purchases WHERE customer_id = ?', 
      [customer.id]
    );
    
    const totalQuantity = quantityResult[0].total_quantity || 0;
    console.log(`📦 总购买件数: ${totalQuantity} 件`);
    
    // 查询总金额
    const [amountResult] = await connection.execute(
      'SELECT SUM(total_price) as total_amount FROM customer_purchases WHERE customer_id = ?', 
      [customer.id]
    );
    
    const totalAmount = parseFloat(amountResult[0].total_amount || 0);
    console.log(`💰 总购买金额: ¥${totalAmount.toFixed(2)}`);
    
    // 验证结论
    console.log('\n🎯 验证结论:');
    if (uniqueSkuCount === 14) {
      console.log('✅ 确认: 张美丽确实购买了14个不同的SKU');
    } else {
      console.log(`❌ 不符合: 张美丽实际购买了${uniqueSkuCount}个不同的SKU，不是14个`);
    }
    
    // 检查最近的几条购买记录
    console.log('\n📋 最近5条购买记录:');
    const [recentPurchases] = await connection.execute(`
      SELECT 
        cp.id, cp.quantity, cp.unit_price, cp.total_price, cp.status, cp.created_at,
        ps.sku_code, ps.sku_name
      FROM customer_purchases cp
      JOIN product_skus ps ON cp.sku_id = ps.id
      WHERE cp.customer_id = ?
      ORDER BY cp.created_at DESC
      LIMIT 5
    `, [customer.id]);
    
    recentPurchases.forEach((purchase, index) => {
      console.log(`${index + 1}. ${purchase.sku_code} - ${purchase.sku_name}`);
      console.log(`   数量: ${purchase.quantity}, 单价: ¥${purchase.unit_price}, 总价: ¥${purchase.total_price}`);
      console.log(`   状态: ${purchase.status}, 时间: ${purchase.created_at}`);
    });

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

quickCheck()