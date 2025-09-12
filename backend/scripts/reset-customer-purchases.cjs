const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

async function resetCustomerPurchases() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔍 检查当前状态...');
    
    // 检查客户购买记录数量
    const [purchaseCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM customer_purchases'
    );
    console.log(`📊 当前客户购买记录数量: ${purchaseCount[0].count}`);
    
    // 检查SKU库存状态
    const [skuInventory] = await connection.execute(`
      SELECT skuCode, skuName, availableQuantity, totalQuantity
      FROM product_skus
      ORDER BY createdAt DESC
    `);
    
    console.log('\n📦 当前SKU库存状态:');
    skuInventory.forEach(sku => {
      const status = sku.availableQuantity < 0 ? '❌ 负库存' : 
                    sku.availableQuantity === 0 ? '⚠️ 缺货' : '✅ 正常';
      console.log(`${sku.skuCode}: ${sku.skuName} - 可售:${sku.availableQuantity}件, 总量:${sku.totalQuantity}件 ${status}`);
    });
    
    if (purchaseCount[0].count === 0) {
      console.log('\n✅ 没有客户购买记录需要清理');
      return;
    }
    
    console.log('\n🗑️ 开始清理客户购买记录和相关数据...');
    
    // 开始事务
    await connection.beginTransaction();
    
    try {
      // 1. 删除客户购买记录
      await connection.execute('DELETE FROM customer_purchases');
      console.log('✅ 已清理客户购买记录');
      
      // 2. 删除相关的财务记录
      await connection.execute('DELETE FROM financial_records WHERE referenceType IN ("SALE", "REFUND")');
      console.log('✅ 已清理相关财务记录');
      
      // 3. 删除客户备注
      await connection.execute('DELETE FROM customer_notes');
      console.log('✅ 已清理客户备注');
      
      // 4. 重置SKU库存为总量（恢复到制作完成时的状态）
      await connection.execute(`
        UPDATE product_skus 
        SET availableQuantity = totalQuantity
        WHERE totalQuantity > 0
      `);
      console.log('✅ 已重置SKU库存为总量');
      
      await connection.commit();
      console.log('\n🎉 数据重置完成！');
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    
    // 验证重置结果
    console.log('\n🔍 验证重置结果...');
    
    const [finalPurchaseCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM customer_purchases'
    );
    console.log(`📊 重置后客户购买记录数量: ${finalPurchaseCount[0].count}`);
    
    const [finalSkuInventory] = await connection.execute(`
      SELECT skuCode, skuName, availableQuantity, totalQuantity
      FROM product_skus
      ORDER BY createdAt DESC
    `);
    
    console.log('\n📦 重置后SKU库存状态:');
    let allNormal = true;
    finalSkuInventory.forEach(sku => {
      const status = sku.availableQuantity < 0 ? '❌ 负库存' : 
                    sku.availableQuantity === 0 ? '⚠️ 缺货' : '✅ 正常';
      console.log(`${sku.skuCode}: ${sku.skuName} - 可售:${sku.availableQuantity}件, 总量:${sku.totalQuantity}件 ${status}`);
      if (sku.availableQuantity < 0) allNormal = false;
    });
    
    if (allNormal) {
      console.log('\n✅ 所有SKU库存已恢复正常！');
      console.log('💡 现在可以按照正确的业务流程重新制作更多SKU，然后进行客户交易。');
    } else {
      console.log('\n⚠️ 仍有SKU库存异常，需要进一步检查。');
    }
    
    // 检查客户数量
    const [customerCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM customers'
    );
    console.log(`\n👥 客户数量: ${customerCount[0].count}个（客户信息保留）`);
    
  } catch (error) {
    console.error('❌ 执行过程中出现错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔗 数据库连接已关闭');
    }
  }
}

// 执行重置
resetCustomerPurchases().catch(console.error);