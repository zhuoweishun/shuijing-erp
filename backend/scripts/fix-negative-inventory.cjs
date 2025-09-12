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

// 修复负库存脚本
async function fixNegativeInventory() {
  let connection;
  
  try {
    console.log('🔄 开始修复负库存问题...');
    console.log('💡 将所有负库存SKU调整为0库存');
    
    // 建立数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 1. 查询所有负库存的SKU
    console.log('\n📊 查询负库存SKU...');
    const [negativeSkus] = await connection.execute(`
      SELECT 
        id,
        skuCode,
        skuName,
        availableQuantity,
        sellingPrice
      FROM product_skus 
      WHERE availableQuantity < 0
      ORDER BY availableQuantity ASC
    `);
    
    console.log(`📋 找到 ${negativeSkus.length} 个负库存SKU`);
    
    if (negativeSkus.length === 0) {
      console.log('✅ 没有发现负库存SKU，无需修复');
      return;
    }
    
    // 显示负库存SKU列表
    console.log('\n📦 负库存SKU列表:');
    console.log('SKU名称 | 当前库存 | 销售价格');
    console.log(''.padEnd(60, '-'));
    
    let totalNegativeQuantity = 0;
    negativeSkus.forEach((sku, index) => {
      totalNegativeQuantity += Math.abs(sku.availableQuantity);
      const skuName = sku.skuName.length > 30 ? sku.skuName.substring(0, 30) + '...' : sku.skuName;
      console.log(`${(index + 1).toString().padEnd(3)} ${skuName.padEnd(33)} | ${sku.availableQuantity.toString().padEnd(8)} | ¥${sku.sellingPrice}`);
    });
    
    console.log(`\n📊 总负库存数量: ${totalNegativeQuantity}`);
    
    // 2. 开始修复负库存
    console.log('\n🔄 开始修复负库存...');
    
    await connection.beginTransaction();
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const fixedSkus = [];
      
      for (const sku of negativeSkus) {
        console.log(`\n📦 修复SKU: ${sku.skuName}`);
        console.log(`   当前库存: ${sku.availableQuantity}`);
        console.log(`   调整为: 0`);
        
        try {
          // 更新SKU库存为0
          const [updateResult] = await connection.execute(
            'UPDATE product_skus SET availableQuantity = 0 WHERE id = ?',
            [sku.id]
          );
          
          if (updateResult.affectedRows > 0) {
            console.log(`   ✅ 库存更新成功`);
            
            // 创建库存调整日志
            const logId = uuidv4();
            await connection.execute(`
              INSERT INTO sku_inventory_logs 
              (id, skuId, action, quantityChange, quantityBefore, quantityAfter, referenceType, referenceId, notes, userId, createdAt) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
              logId,
              sku.id,
              'ADJUST',
              -sku.availableQuantity, // 调整数量（正数，因为原库存是负数）
              sku.availableQuantity,
              0,
              'MANUAL',
              null,
              `负库存修复 - 将负库存${sku.availableQuantity}调整为0`,
              'system'
            ]);
            
            console.log(`   ✅ 创建调整日志成功`);
            successCount++;
            
            fixedSkus.push({
              skuName: sku.skuName,
              oldQuantity: sku.availableQuantity,
              newQuantity: 0,
              adjustment: -sku.availableQuantity
            });
            
          } else {
            console.log(`   ❌ 库存更新失败: 没有找到对应的SKU`);
            errorCount++;
          }
          
        } catch (error) {
          console.error(`   ❌ 处理失败: ${error.message}`);
          errorCount++;
        }
      }
      
      // 提交事务
      await connection.commit();
      console.log('\n✅ 负库存修复完成！');
      console.log(`📊 处理结果: 成功 ${successCount} 个SKU，失败 ${errorCount} 个SKU`);
      
      // 显示修复结果摘要
      if (fixedSkus.length > 0) {
        console.log('\n📋 修复结果摘要:');
        console.log('SKU名称 | 原库存 → 新库存 | 调整数量');
        console.log(''.padEnd(70, '-'));
        
        let totalAdjustment = 0;
        fixedSkus.forEach((item, index) => {
          totalAdjustment += item.adjustment;
          const skuName = item.skuName.length > 25 ? item.skuName.substring(0, 25) + '...' : item.skuName;
          console.log(`${(index + 1).toString().padEnd(3)} ${skuName.padEnd(28)} | ${item.oldQuantity.toString().padEnd(3)} → ${item.newQuantity.toString().padEnd(3)} | +${item.adjustment}`);
        });
        
        console.log(`\n📊 总调整数量: +${totalAdjustment}`);
      }
      
    } catch (error) {
      await connection.rollback();
      console.error('\n❌ 事务回滚:', error.message);
      throw error;
    }
    
    // 3. 验证修复结果
    console.log('\n🔍 验证修复结果...');
    const [remainingNegative] = await connection.execute(`
      SELECT COUNT(*) as count FROM product_skus WHERE availableQuantity < 0
    `);
    
    if (remainingNegative[0].count === 0) {
      console.log('✅ 验证通过：没有剩余负库存SKU');
    } else {
      console.log(`❌ 验证失败：仍有 ${remainingNegative[0].count} 个负库存SKU`);
    }
    
    console.log('\n🎉 负库存修复完成！');
    console.log('💡 所有负库存SKU已调整为0库存');
    console.log('💡 相关调整日志已记录到sku_inventory_logs表');
    console.log('💡 现在客户购买记录与SKU库存状态一致');
    console.log('💡 请检查SKU列表页面确认修复结果');
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
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
  fixNegativeInventory()
    .then(() => {
      console.log('\n🎉 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 脚本执行失败:', error);
      process.exit(1);
    });
}