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

// 重新分配客户购买记录脚本
async function reassignCustomerPurchases() {
  let connection;
  
  try {
    console.log('🔄 开始重新分配客户购买记录...');
    console.log('💡 将为客户重新分配有库存的SKU商品');
    
    // 建立数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 1. 查询所有有库存的SKU
    console.log('\n📊 查询有库存的SKU...');
    const [availableSkus] = await connection.execute(`
      SELECT 
        id,
        skuCode,
        skuName,
        availableQuantity,
        sellingPrice
      FROM product_skus 
      WHERE availableQuantity > 0 AND status = 'ACTIVE'
      ORDER BY availableQuantity DESC, sellingPrice ASC
    `);
    
    console.log(`📋 找到 ${availableSkus.length} 个有库存的SKU`);
    
    if (availableSkus.length === 0) {
      console.log('❌ 没有找到有库存的SKU，无法重新分配');
      return;
    }
    
    // 显示可用SKU
    console.log('\n📦 可用SKU列表:');
    console.log('SKU名称 | 库存数量 | 销售价格');
    console.log(''.padEnd(60, '-'));
    availableSkus.forEach((sku, index) => {
      const skuName = sku.skuName.length > 30 ? sku.skuName.substring(0, 30) + '...' : sku.skuName;
      console.log(`${(index + 1).toString().padEnd(3)} ${skuName.padEnd(33)} | ${sku.availableQuantity.toString().padEnd(8)} | ¥${sku.sellingPrice}`);
    });
    
    // 2. 查询所有客户购买记录
    console.log('\n📊 查询客户购买记录...');
    const [purchases] = await connection.execute(`
      SELECT 
        cp.id,
        cp.customerId,
        cp.skuId,
        cp.skuName,
        cp.quantity,
        cp.unitPrice,
        cp.totalPrice,
        cp.purchaseDate,
        c.name as customer_name,
        c.phone as customer_phone
      FROM customer_purchases cp
      JOIN customers c ON cp.customerId = c.id
      WHERE cp.status = 'ACTIVE'
      ORDER BY cp.purchaseDate ASC
    `);
    
    console.log(`📋 找到 ${purchases.length} 条客户购买记录`);
    
    if (purchases.length === 0) {
      console.log('ℹ️  没有需要处理的购买记录');
      return;
    }
    
    // 3. 重新分配逻辑
    console.log('\n🔄 开始重新分配购买记录...');
    
    await connection.beginTransaction();
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const reassignments = [];
      
      // 创建SKU库存跟踪
      const skuInventory = new Map();
      availableSkus.forEach(sku => {
        skuInventory.set(sku.id, {
          ...sku,
          remainingQuantity: sku.availableQuantity
        });
      });
      
      for (const purchase of purchases) {
        console.log(`\n👤 处理客户: ${purchase.customer_name} (${purchase.customer_phone})`);
        console.log(`   原购买: ${purchase.skuName} x${purchase.quantity} = ¥${purchase.totalPrice}`);
        
        // 寻找合适的替代SKU
        let foundReplacement = false;
        
        for (const [skuId, skuData] of skuInventory) {
          if (skuData.remainingQuantity >= purchase.quantity) {
            // 找到合适的替代品
            const newTotalPrice = (skuData.sellingPrice * purchase.quantity).toFixed(2);
            
            console.log(`   ✅ 重新分配为: ${skuData.skuName} x${purchase.quantity} = ¥${newTotalPrice}`);
            
            try {
              // 更新购买记录
              await connection.execute(`
                UPDATE customer_purchases 
                SET skuId = ?, skuName = ?, unitPrice = ?, totalPrice = ?
                WHERE id = ?
              `, [
                skuId,
                skuData.skuName,
                skuData.sellingPrice,
                newTotalPrice,
                purchase.id
              ]);
              
              // 减少库存
              await connection.execute(`
                UPDATE product_skus 
                SET availableQuantity = availableQuantity - ?
                WHERE id = ?
              `, [purchase.quantity, skuId]);
              
              // 创建库存变更日志
              const logId = uuidv4();
              await connection.execute(`
                INSERT INTO sku_inventory_logs 
                (id, skuId, action, quantityChange, quantityBefore, quantityAfter, referenceType, referenceId, notes, userId, createdAt) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
              `, [
                logId,
                skuId,
                'SELL',
                -purchase.quantity,
                skuData.remainingQuantity,
                skuData.remainingQuantity - purchase.quantity,
                'SALE',
                purchase.id,
                `重新分配销售 - 客户: ${purchase.customer_name}`,
                'system'
              ]);
              
              // 更新本地库存跟踪
              skuData.remainingQuantity -= purchase.quantity;
              
              reassignments.push({
                customer: purchase.customer_name,
                oldSku: purchase.skuName,
                newSku: skuData.skuName,
                quantity: purchase.quantity,
                oldPrice: purchase.totalPrice,
                newPrice: newTotalPrice
              });
              
              successCount++;
              foundReplacement = true;
              break;
              
            } catch (error) {
              console.error(`   ❌ 更新失败: ${error.message}`);
              errorCount++;
              break;
            }
          }
        }
        
        if (!foundReplacement) {
          console.log(`   ❌ 无法找到足够库存的替代品`);
          errorCount++;
        }
      }
      
      // 提交事务
      await connection.commit();
      console.log('\n✅ 客户购买记录重新分配完成！');
      console.log(`📊 处理结果: 成功 ${successCount} 条记录，失败 ${errorCount} 条记录`);
      
      // 显示重新分配摘要
      if (reassignments.length > 0) {
        console.log('\n📋 重新分配摘要:');
        console.log('客户姓名 | 原商品 → 新商品 | 数量 | 价格变化');
        console.log(''.padEnd(80, '-'));
        
        reassignments.forEach((item, index) => {
          const oldSku = item.oldSku.length > 15 ? item.oldSku.substring(0, 15) + '...' : item.oldSku;
          const newSku = item.newSku.length > 15 ? item.newSku.substring(0, 15) + '...' : item.newSku;
          const priceChange = (parseFloat(item.newPrice) - parseFloat(item.oldPrice)).toFixed(2);
          const priceChangeStr = priceChange >= 0 ? `+¥${priceChange}` : `¥${priceChange}`;
          
          console.log(`${(index + 1).toString().padEnd(3)} ${item.customer.padEnd(8)} | ${oldSku} → ${newSku} | x${item.quantity} | ${priceChangeStr}`);
        });
        
        // 计算总价格变化
        const totalPriceChange = reassignments.reduce((sum, item) => {
          return sum + (parseFloat(item.newPrice) - parseFloat(item.oldPrice));
        }, 0);
        
        console.log('\n💰 总价格变化:', totalPriceChange >= 0 ? `+¥${totalPriceChange.toFixed(2)}` : `¥${totalPriceChange.toFixed(2)}`);
      }
      
    } catch (error) {
      await connection.rollback();
      console.error('\n❌ 事务回滚:', error.message);
      throw error;
    }
    
    console.log('\n🎉 客户购买记录重新分配完成！');
    console.log('💡 现在所有客户购买的都是有库存的商品');
    console.log('💡 库存数量已相应减少，不会出现负库存');
    console.log('💡 请检查客户管理和SKU列表页面确认更新结果');
    
  } catch (error) {
    console.error('❌ 重新分配失败:', error.message);
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
  reassignCustomerPurchases()
    .then(() => {
      console.log('\n🎉 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 脚本执行失败:', error);
      process.exit(1);
    });
}