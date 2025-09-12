const mysql = require('mysql2/promise');
const crypto = require('crypto');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

// 生成UUID
function generateUUID() {
  return crypto.randomUUID();
}

async function fixAndRestockSkus() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔍 检查当前库存状态...');
    
    // 获取所有SKU的库存情况
    const [skus] = await connection.execute(`
      SELECT id, skuCode, skuName, availableQuantity, totalQuantity, sellingPrice
      FROM product_skus
      ORDER BY createdAt DESC
    `);
    
    console.log('📦 当前库存状态:');
    skus.forEach(sku => {
      const status = sku.availableQuantity < 0 ? '❌ 负库存' : 
                    sku.availableQuantity === 0 ? '⚠️ 缺货' : '✅ 正常';
      console.log(`${sku.skuCode}: ${sku.skuName} - 可售:${sku.availableQuantity}件, 总量:${sku.totalQuantity}件 ${status}`);
    });
    
    // 获取用户ID
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    const userId = users[0]?.id;
    
    console.log('\n🔧 开始修复和补货...');
    
    for (const sku of skus) {
      if (sku.availableQuantity < 20) { // 确保每个SKU至少有20件库存
        const targetStock = 25; // 目标库存25件
        const needToAdd = targetStock - sku.availableQuantity;
        
        console.log(`\n📈 补货 ${sku.skuCode}: ${sku.skuName}`);
        console.log(`   当前可售: ${sku.availableQuantity}件`);
        console.log(`   目标库存: ${targetStock}件`);
        console.log(`   需要补货: ${needToAdd}件`);
        
        // 开始事务
        await connection.beginTransaction();
        
        try {
          // 1. 更新SKU库存
          await connection.execute(`
            UPDATE product_skus 
            SET availableQuantity = ?, 
                totalQuantity = GREATEST(totalQuantity, ?),
                updatedAt = NOW()
            WHERE id = ?
          `, [targetStock, targetStock, sku.id]);
          
          // 2. 获取该SKU的原始MaterialUsage记录（用于计算补货成本）
          const [originalMaterials] = await connection.execute(`
            SELECT mu.*, p.productName, p.unitPrice
            FROM material_usage mu
            JOIN purchases p ON mu.purchaseId = p.id
            WHERE mu.productId IN (
              SELECT id FROM products WHERE id IN (
                SELECT DISTINCT productId FROM material_usage WHERE productId IS NOT NULL
              )
            )
            LIMIT 1
          `);
          
          if (originalMaterials.length > 0) {
            const material = originalMaterials[0];
            
            // 3. 创建补货的MaterialUsage记录
            await connection.execute(`
              INSERT INTO material_usage (
                id, purchaseId, productId, quantityUsedPieces, quantityUsedBeads,
                unitCost, totalCost, createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, 0, ?, ?, NOW(), NOW())
            `, [
              generateUUID(),
              material.purchaseId,
              material.productId,
              needToAdd * 2, // 假设每件SKU需要2个原材料单位
              material.unitCost || 0,
              (material.unitCost || 0) * needToAdd * 2
            ]);
          }
          
          // 4. 创建库存变更日志（如果表存在）
          try {
            await connection.execute(`
              INSERT INTO sku_inventory_logs (
                id, skuId, operationType, quantityChange, quantityAfter,
                reason, createdBy, createdAt, updatedAt
              ) VALUES (?, ?, 'RESTOCK', ?, ?, '系统补货修复负库存', ?, NOW(), NOW())
            `, [
              generateUUID(),
              sku.id,
              needToAdd,
              targetStock,
              userId
            ]);
          } catch (logError) {
            console.log(`   ⚠️ 库存日志记录失败（表可能不存在）: ${logError.message}`);
          }
          
          await connection.commit();
          console.log(`   ✅ 补货成功: ${sku.skuName} 现有库存 ${targetStock}件`);
          
        } catch (error) {
          await connection.rollback();
          console.error(`   ❌ 补货失败: ${sku.skuName}`, error.message);
        }
      } else {
        console.log(`✓ ${sku.skuCode}: ${sku.skuName} 库存充足 (${sku.availableQuantity}件)`);
      }
    }
    
    // 验证修复结果
    console.log('\n🔍 验证修复结果...');
    
    const [fixedSkus] = await connection.execute(`
      SELECT skuCode, skuName, availableQuantity, totalQuantity
      FROM product_skus
      ORDER BY createdAt DESC
    `);
    
    console.log('\n📊 修复后库存状态:');
    let totalAvailable = 0;
    fixedSkus.forEach(sku => {
      const status = sku.availableQuantity < 0 ? '❌ 仍有问题' : 
                    sku.availableQuantity === 0 ? '⚠️ 缺货' : '✅ 正常';
      console.log(`${sku.skuCode}: ${sku.skuName} - 可售:${sku.availableQuantity}件, 总量:${sku.totalQuantity}件 ${status}`);
      totalAvailable += sku.availableQuantity;
    });
    
    console.log(`\n📈 总可售库存: ${totalAvailable}件`);
    
    // 统计可售SKU数量
    const [availableCount] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM product_skus 
      WHERE availableQuantity > 0
    `);
    
    console.log(`✅ 可售SKU数量: ${availableCount[0].count}个`);
    
    if (availableCount[0].count === fixedSkus.length && totalAvailable > 100) {
      console.log('\n🎉 库存修复完成！现在有充足的库存可以进行客户交易了。');
      console.log('💡 建议：在进行客户交易时，请确保每次购买前检查库存充足性。');
    } else {
      console.log('\n⚠️ 库存修复可能不完整，请检查具体问题。');
    }
    
  } catch (error) {
    console.error('❌ 执行过程中出现错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔗 数据库连接已关闭');
    }
  }
}

// 执行修复
fixAndRestockSkus().catch(console.error);