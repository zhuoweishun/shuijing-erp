const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

// 实际执行库存同步脚本
async function executeInventorySync() {
  let connection;
  
  try {
    console.log('🔄 开始实际库存同步操作...');
    console.log('⚠️  警告：此操作将实际修改数据库数据！');
    
    // 建立数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 1. 查询所有有效的客户购买记录
    console.log('\n📊 查询客户购买记录...');
    const [purchases] = await connection.execute(`
      SELECT 
        cp.id,
        cp.customerId,
        cp.skuId,
        cp.skuName,
        cp.quantity,
        cp.totalPrice,
        cp.purchaseDate,
        ps.availableQuantity as current_stock,
        c.name as customer_name,
        c.phone as customer_phone
      FROM customer_purchases cp
      JOIN product_skus ps ON cp.skuId = ps.id
      JOIN customers c ON cp.customerId = c.id
      WHERE cp.status = 'ACTIVE'
      ORDER BY cp.purchaseDate ASC
    `);
    
    console.log(`📋 找到 ${purchases.length} 条有效购买记录`);
    
    if (purchases.length === 0) {
      console.log('ℹ️  没有需要处理的购买记录');
      return;
    }
    
    // 2. 统计需要减少的库存
    const skuInventoryChanges = new Map();
    
    purchases.forEach(purchase => {
      const skuId = purchase.skuId;
      if (!skuInventoryChanges.has(skuId)) {
        skuInventoryChanges.set(skuId, {
          sku_id: skuId,
          sku_name: purchase.skuName,
          current_stock: purchase.current_stock,
          total_sold: 0,
          purchase_records: []
        });
      }
      
      const skuData = skuInventoryChanges.get(skuId);
      skuData.total_sold += purchase.quantity;
      skuData.purchase_records.push({
        purchase_id: purchase.id,
        customer_name: purchase.customer_name,
        quantity: purchase.quantity,
        purchase_date: purchase.purchaseDate
      });
    });
    
    // 3. 显示库存变更汇总
    console.log('\n📊 库存变更汇总:');
    console.log('SKU名称 | 当前库存 | 总销售量 | 变更后库存');
    console.log(''.padEnd(80, '-'));
    
    for (const [skuId, data] of skuInventoryChanges) {
      const skuName = data.sku_name.length > 30 ? data.sku_name.substring(0, 30) + '...' : data.sku_name;
      const afterStock = data.current_stock - data.total_sold;
      
      console.log(`${skuName.padEnd(33)} | ${data.current_stock.toString().padEnd(8)} | ${data.total_sold.toString().padEnd(8)} | ${afterStock.toString().padEnd(10)}`);
      
      if (afterStock < 0) {
        console.log(`⚠️  警告: SKU "${data.sku_name}" 库存不足，当前库存 ${data.current_stock}，需要减少 ${data.total_sold}`);
      }
    }
    
    // 4. 开始事务执行库存同步
    console.log('\n🔄 开始实际库存同步操作...');
    
    await connection.beginTransaction();
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const [skuId, data] of skuInventoryChanges) {
        const newStock = data.current_stock - data.total_sold;
        
        console.log(`\n📦 处理SKU: ${data.sku_name}`);
        console.log(`   当前库存: ${data.current_stock}`);
        console.log(`   总销售量: ${data.total_sold}`);
        console.log(`   新库存: ${newStock}`);
        
        try {
          // 更新SKU库存
          await connection.execute(
            'UPDATE product_skus SET availableQuantity = ? WHERE id = ?',
            [newStock, skuId]
          );
          
          console.log(`   ✅ 库存更新成功`);
          
          // 为每个购买记录创建库存变更日志
          for (const record of data.purchase_records) {
            const logId = uuidv4();
            await connection.execute(`
              INSERT INTO sku_inventory_logs 
              (id, skuId, action, quantityChange, quantityBefore, quantityAfter, referenceType, referenceId, notes, userId, createdAt) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
              logId,
              skuId,
              'SELL',
              -record.quantity,
              data.current_stock,
              newStock,
              'SALE',
              record.purchase_id,
              `客户购买记录同步 - ${record.customer_name}`,
              'system'
            ]);
          }
          
          console.log(`   ✅ 库存日志创建成功 (${data.purchase_records.length} 条)`);
          successCount++;
          
        } catch (error) {
          console.error(`   ❌ 处理失败: ${error.message}`);
          errorCount++;
        }
      }
      
      // 提交事务
      await connection.commit();
      console.log('\n✅ 库存同步完成');
      console.log(`📊 处理结果: 成功 ${successCount} 个SKU，失败 ${errorCount} 个SKU`);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    
    console.log('\n📋 库存同步执行完成');
    console.log('💡 请检查SKU列表页面确认库存状态已更新');
    
  } catch (error) {
    console.error('❌ 库存同步失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行脚本
if (require.main === module) {
  executeInventorySync()
    .then(() => {
      console.log('\n🎉 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 脚本执行失败:', error);
      process.exit(1);
    });
}