import mysql from 'mysql2/promise';

async function testSalesTrigger() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    // 1. 首先查看现有的客户和SKU
    console.log('🔍 查看现有数据...');
    
    const [customers] = await connection.execute('SELECT id, name FROM customers LIMIT 3');
    console.log('客户列表:', customers);
    
    const [skus] = await connection.execute('SELECT id, sku_code, sku_name, selling_price FROM product_skus LIMIT 3');
    console.log('SKU列表:', skus);
    
    if (customers.length === 0 || skus.length === 0) {
      console.log('❌ 没有足够的测试数据，无法进行测试');
      return;
    }
    
    // 2. 记录测试前的财务记录数量
    const [beforeCount] = await connection.execute('SELECT COUNT(*) as count FROM financial_records WHERE category = "sales_income"');
    console.log(`📊 测试前销售收入记录数量: ${beforeCount[0].count}`);
    
    // 3. 创建一个测试销售记录
    const testCustomer = customers[0];
    const testSku = skus[0];
    const testQuantity = 1;
    const testUnitPrice = testSku.selling_price || 100;
    const testTotalPrice = testQuantity * testUnitPrice;
    
    console.log(`💰 创建测试销售记录: 客户${testCustomer.name} 购买 ${testSku.sku_name} x${testQuantity} = ¥${testTotalPrice}`);
    
    const testPurchaseId = `test_purchase_${Date.now()}`;
    
    await connection.execute(`
      INSERT INTO customer_purchases (
        id, customer_id, sku_id, sku_name, quantity, unit_price, total_price,
        status, purchase_date, sale_channel, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), 'MANUAL', NOW(), NOW())
    `, [testPurchaseId, testCustomer.id, testSku.id, testSku.sku_name, testQuantity, testUnitPrice, testTotalPrice]);
    
    // 4. 检查触发器是否创建了财务记录
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒确保触发器执行
    
    const [afterCount] = await connection.execute('SELECT COUNT(*) as count FROM financial_records WHERE category = "sales_income"');
    console.log(`📊 测试后销售收入记录数量: ${afterCount[0].count}`);
    
    // 5. 查看新创建的财务记录
    const [newRecords] = await connection.execute(`
      SELECT id, amount, description, category, record_type, reference_id, created_at 
      FROM financial_records 
      WHERE reference_id = ? AND category = 'sales_income'
    `, [testPurchaseId]);
    
    if (newRecords.length > 0) {
      console.log('✅ 触发器工作正常！创建的财务记录:');
      newRecords.forEach(record => {
        console.log(`  - ID: ${record.id}`);
        console.log(`  - 金额: ¥${record.amount}`);
        console.log(`  - 描述: ${record.description}`);
        console.log(`  - 类型: ${record.record_type}`);
        console.log(`  - 创建时间: ${record.created_at}`);
      });
    } else {
      console.log('❌ 触发器未工作！没有创建财务记录');
    }
    
    // 6. 清理测试数据
    console.log('🧹 清理测试数据...');
    await connection.execute('DELETE FROM financial_records WHERE reference_id = ?', [testPurchaseId]);
    await connection.execute('DELETE FROM customer_purchases WHERE id = ?', [testPurchaseId]);
    console.log('✅ 测试数据已清理');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await connection.end();
  }
}

testSalesTrigger();