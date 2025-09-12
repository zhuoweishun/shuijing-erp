const mysql = require('mysql2/promise');

async function verifyDataIntegrity() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('=== 数据完整性验证报告 ===\n');
    
    // 1. 检查无效的客户购买记录
    console.log('1. 检查客户购买记录与SKU对应关系...');
    const [invalidPurchases] = await connection.execute(`
      SELECT cp.id, cp.customerId, cp.skuId, cp.skuName 
      FROM customer_purchases cp 
      LEFT JOIN product_skus ps ON cp.skuId = ps.id 
      WHERE ps.id IS NULL AND cp.status = 'ACTIVE'
    `);
    
    if (invalidPurchases.length > 0) {
      console.log('❌ 发现无效的客户购买记录:', invalidPurchases.length, '条');
      console.log('详细信息:', invalidPurchases);
    } else {
      console.log('✅ 所有客户购买记录都对应有效的SKU');
    }
    
    // 2. 统计基本数据
    console.log('\n2. 基本数据统计...');
    const [customerStats] = await connection.execute('SELECT COUNT(*) as total_customers FROM customers');
    const [purchaseStats] = await connection.execute('SELECT COUNT(*) as total_purchases FROM customer_purchases WHERE status = "ACTIVE"');
    const [skuStats] = await connection.execute('SELECT COUNT(*) as total_skus, SUM(availableQuantity) as total_available FROM product_skus WHERE status = "ACTIVE"');
    
    console.log('客户总数:', customerStats[0].total_customers);
    console.log('有效购买记录数:', purchaseStats[0].total_purchases);
    console.log('SKU总数:', skuStats[0].total_skus);
    console.log('可用库存总数:', skuStats[0].total_available);
    
    // 3. 检查库存一致性
    console.log('\n3. 检查SKU库存一致性...');
    const [skuInventoryCheck] = await connection.execute(`
      SELECT 
        ps.id,
        ps.skuCode,
        ps.availableQuantity,
        COALESCE(SUM(cp.quantity), 0) as sold_quantity
      FROM product_skus ps
      LEFT JOIN customer_purchases cp ON ps.id = cp.skuId AND cp.status = 'ACTIVE'
      WHERE ps.status = 'ACTIVE'
      GROUP BY ps.id, ps.skuCode, ps.availableQuantity
      HAVING ps.availableQuantity < 0
    `);
    
    if (skuInventoryCheck.length > 0) {
      console.log('❌ 发现负库存SKU:', skuInventoryCheck.length, '个');
      console.log('详细信息:', skuInventoryCheck);
    } else {
      console.log('✅ 所有SKU库存数量正常');
    }
    
    // 4. 检查客户统计数据一致性
    console.log('\n4. 检查客户统计数据一致性...');
    const [customerDataCheck] = await connection.execute(`
      SELECT 
        c.id,
        c.name,
        c.totalPurchases as recorded_total,
        c.totalOrders as recorded_orders,
        COALESCE(SUM(cp.totalPrice), 0) as actual_total,
        COUNT(cp.id) as actual_orders
      FROM customers c
      LEFT JOIN customer_purchases cp ON c.id = cp.customerId AND cp.status = 'ACTIVE'
      GROUP BY c.id, c.name, c.totalPurchases, c.totalOrders
      HAVING 
        ABS(c.totalPurchases - COALESCE(SUM(cp.totalPrice), 0)) > 0.01 OR
        c.totalOrders != COUNT(cp.id)
    `);
    
    if (customerDataCheck.length > 0) {
      console.log('❌ 发现客户统计数据不一致:', customerDataCheck.length, '个客户');
      console.log('详细信息:', customerDataCheck);
    } else {
      console.log('✅ 所有客户统计数据一致');
    }
    
    // 5. 检查财务数据
    console.log('\n5. 财务数据验证...');
    const [financialCheck] = await connection.execute(`
      SELECT 
        SUM(cp.totalPrice) as total_sales_revenue
      FROM customer_purchases cp
      WHERE cp.status = 'ACTIVE'
    `);
    
    console.log('总销售收入:', financialCheck[0].total_sales_revenue || 0, '元');
    
    console.log('\n=== 验证完成 ===');
    
  } catch (error) {
    console.error('验证过程中出现错误:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyDataIntegrity();