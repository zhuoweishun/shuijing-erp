import mysql from 'mysql2/promise';

async function clearFakeData() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('开始清理错误的假数据...');
    
    // 1. 删除所有SKU相关数据
    console.log('删除SKU库存日志...');
    await connection.execute('DELETE FROM sku_inventory_logs');
    
    console.log('删除客户购买记录...');
    await connection.execute('DELETE FROM customer_purchases');
    
    console.log('删除原材料使用记录...');
    await connection.execute('DELETE FROM material_usage');
    
    console.log('删除成品记录...');
    await connection.execute('DELETE FROM products');
    
    console.log('删除SKU记录...');
    await connection.execute('DELETE FROM product_skus');
    
    // 2. 删除所有采购记录（重新开始）
    console.log('删除编辑日志...');
    await connection.execute('DELETE FROM edit_logs');
    
    console.log('删除采购记录...');
    await connection.execute('DELETE FROM purchases');
    
    // 3. 删除财务记录（如果表存在）
    try {
      console.log('删除财务记录...');
      await connection.execute('DELETE FROM financial_transactions');
    } catch (error) {
      console.log('财务记录表不存在，跳过...');
    }
    
    // 4. 重置自增ID
    console.log('重置自增ID...');
    await connection.execute('ALTER TABLE purchases AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE product_skus AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE products AUTO_INCREMENT = 1');
    try {
      await connection.execute('ALTER TABLE financial_transactions AUTO_INCREMENT = 1');
    } catch (error) {
      console.log('财务记录表不存在，跳过重置...');
    }
    
    console.log('✅ 所有假数据已清理完成！');
    console.log('现在可以重新创建正确的采购记录了。');
    
  } catch (error) {
    console.error('❌ 清理数据时发生错误:', error);
  } finally {
    await connection.end();
  }
}

clearFakeData();