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

// 库存同步脚本
async function syncInventoryFromPurchases() {
  let connection;
  
  try {
    console.log('🔄 开始库存同步操作...');
    
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
    
    // 2. 显示购买记录详情
    console.log('\n📝 购买记录详情:');
    console.log('序号 | 客户姓名 | 客户电话 | SKU名称 | 购买数量 | 当前库存 | 购买日期');
    console.log(''.padEnd(100, '-'));
    
    purchases.forEach((purchase, index) => {
      const customerName = purchase.customer_name || '未知客户';
      const customerPhone = purchase.customer_phone || '无电话';
      const skuName = purchase.skuName.length > 20 ? purchase.skuName.substring(0, 20) + '...' : purchase.skuName;
      const purchaseDate = new Date(purchase.purchaseDate).toLocaleDateString('zh-CN');
      
      console.log(`${(index + 1).toString().padEnd(4)} | ${customerName.padEnd(8)} | ${customerPhone.padEnd(11)} | ${skuName.padEnd(23)} | ${purchase.quantity.toString().padEnd(8)} | ${purchase.current_stock.toString().padEnd(8)} | ${purchaseDate}`);
    });
    
    // 3. 统计需要减少的库存
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
    
    // 4. 显示库存变更汇总
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
    
    // 5. 确认是否继续执行
    console.log('\n❓ 请确认是否继续执行库存同步操作？');
    console.log('   这将会根据客户购买记录减少对应SKU的库存数量');
    console.log('   输入 "yes" 继续，其他任何输入将取消操作');
    
    // 在实际环境中，这里应该等待用户输入确认
    // 为了脚本自动化，我们先显示操作预览
    console.log('\n🔍 操作预览模式 - 不会实际修改数据');
    
    // 6. 执行库存同步（预览模式）
    console.log('\n🔄 开始库存同步操作（预览模式）...');
    
    await connection.beginTransaction();
    
    try {
      for (const [skuId, data] of skuInventoryChanges) {
        const newStock = data.current_stock - data.total_sold;
        
        console.log(`\n📦 处理SKU: ${data.sku_name}`);
        console.log(`   当前库存: ${data.current_stock}`);
        console.log(`   总销售量: ${data.total_sold}`);
        console.log(`   新库存: ${newStock}`);
        
        // 预览模式：只显示SQL，不执行
        console.log(`   SQL预览: UPDATE product_skus SET available_quantity = ${newStock} WHERE id = '${skuId}'`);
        
        // 为每个购买记录创建库存变更日志（预览）
        for (const record of data.purchase_records) {
          const logId = uuidv4();
          console.log(`   日志预览: INSERT INTO sku_inventory_logs (id, sku_id, action, quantity_change, quantity_before, quantity_after, reference_type, reference_id, notes, user_id) VALUES ('${logId}', '${skuId}', 'SELL', -${record.quantity}, ${data.current_stock}, ${newStock}, 'SALE', '${record.purchase_id}', '客户购买记录同步 - ${record.customer_name}', 'system')`);
        }
      }
      
      // 预览模式：不提交事务
      await connection.rollback();
      console.log('\n✅ 预览完成，未实际修改数据');
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    
    console.log('\n📋 库存同步预览完成');
    console.log('💡 如需实际执行，请修改脚本中的预览模式设置');
    
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
  syncInventoryFromPurchases()
    .then(() => {
      console.log('\n🎉 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 脚本执行失败:', error);
      process.exit(1);
    });
}