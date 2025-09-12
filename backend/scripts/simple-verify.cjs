const mysql = require('mysql2/promise');
require('dotenv').config();

async function simpleVerify() {
  let connection;
  
  try {
    const databaseUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
    const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    const [, user, password, host, port, database] = urlMatch;
    
    connection = await mysql.createConnection({
      host, user, password, database, port: parseInt(port)
    });

    console.log('=== 张美丽购买记录验证报告 ===');
    
    // 查找张美丽
    const [customers] = await connection.execute(
      'SELECT * FROM customers WHERE name = ?', ['张美丽']
    );

    if (customers.length === 0) {
      console.log('❌ 未找到客户"张美丽"');
      return;
    }

    const customer = customers[0];
    console.log(`✅ 客户: ${customer.name} (ID: ${customer.id})`);
    
    // 查询购买记录
    const [purchases] = await connection.execute(`
      SELECT 
        cp.id, cp.quantity, cp.unit_price, cp.total_price, cp.status, cp.created_at,
        ps.sku_code, ps.sku_name, ps.available_quantity, ps.total_quantity
      FROM customer_purchases cp
      JOIN product_skus ps ON cp.sku_id = ps.id
      WHERE cp.customer_id = ?
      ORDER BY cp.created_at DESC
    `, [customer.id]);

    console.log(`\n📊 购买记录总数: ${purchases.length} 条`);
    
    if (purchases.length === 0) {
      console.log('❌ 张美丽没有任何购买记录');
      return;
    }

    // 统计不同SKU数量
    const uniqueSkus = new Set(purchases.map(p => p.sku_code));
    console.log(`🎯 购买的不同SKU数量: ${uniqueSkus.size} 个`);
    
    // 统计总购买件数
    const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0);
    console.log(`📦 总购买件数: ${totalQuantity} 件`);
    
    // 统计总金额
    const totalAmount = purchases.reduce((sum, p) => sum + parseFloat(p.total_price), 0);
    console.log(`💰 总购买金额: ¥${totalAmount.toFixed(2)}`);
    
    console.log('\n📋 购买记录详情:');
    purchases.forEach((purchase, index) => {
      console.log(`${index + 1}. ${purchase.sku_code} - ${purchase.sku_name}`);
      console.log(`   数量: ${purchase.quantity}, 单价: ¥${purchase.unit_price}, 总价: ¥${purchase.total_price}`);
      console.log(`   状态: ${purchase.status}, 时间: ${purchase.created_at}`);
      console.log(`   当前库存: ${purchase.available_quantity}`);
    });
    
    console.log('\n🎯 验证结论:');
    if (uniqueSkus.size === 14) {
      console.log('✅ 确认: 张美丽确实购买了14个不同的SKU');
    } else {
      console.log(`❌ 不符合: 张美丽实际购买了${uniqueSkus.size}个不同的SKU，不是14个`);
    }
    
    // 检查库存状态
    const negativeStock = purchases.filter(p => p.available_quantity < 0);
    if (negativeStock.length > 0) {
      console.log(`⚠️  警告: 有${negativeStock.length}个SKU库存为负数`);
    } else {
      console.log('✅ 所有SKU库存状态正常');
    }

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

simpleVerify();