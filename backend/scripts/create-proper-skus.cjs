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

// 生成SKU编码
function generateSkuCode() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.getHours().toString().padStart(2, '0') + 
                  now.getMinutes().toString().padStart(2, '0') + 
                  now.getSeconds().toString().padStart(2, '0');
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `SKU${dateStr}${timeStr}${randomNum}`;
}

// 生成材料标识哈希
function generateMaterialSignatureHash(materialSignature) {
  const signatureString = JSON.stringify(materialSignature.sort((a, b) => a.purchaseId.localeCompare(b.purchaseId)));
  return crypto.createHash('md5').update(signatureString).digest('hex');
}

// SKU产品信息
const skuProducts = [
  {
    name: '紫水晶手串',
    specification: '8mm圆珠手串',
    description: '天然紫水晶制作的精美手串，色泽纯正',
    sellingPrice: 88.00,
    laborCost: 15.00,
    craftCost: 8.00
  },
  {
    name: '粉水晶手串',
    specification: '10mm圆珠手串',
    description: '温润粉水晶手串，寓意爱情美满',
    sellingPrice: 128.00,
    laborCost: 18.00,
    craftCost: 10.00
  },
  {
    name: '白水晶手串',
    specification: '8mm圆珠手串',
    description: '纯净白水晶手串，净化心灵',
    sellingPrice: 68.00,
    laborCost: 12.00,
    craftCost: 6.00
  },
  {
    name: '黑曜石手串',
    specification: '12mm圆珠手串',
    description: '神秘黑曜石手串，辟邪护身',
    sellingPrice: 158.00,
    laborCost: 20.00,
    craftCost: 12.00
  },
  {
    name: '青金石手串',
    specification: '10mm圆珠手串',
    description: '高贵青金石手串，象征智慧',
    sellingPrice: 98.00,
    laborCost: 16.00,
    craftCost: 9.00
  },
  {
    name: '玛瑙手串',
    specification: '8mm圆珠手串',
    description: '天然玛瑙手串，纹理独特',
    sellingPrice: 78.00,
    laborCost: 14.00,
    craftCost: 7.00
  },
  {
    name: '翡翠手串',
    specification: '10mm圆珠手串',
    description: '珍贵翡翠手串，温润如玉',
    sellingPrice: 288.00,
    laborCost: 25.00,
    craftCost: 15.00
  },
  {
    name: '碧玺手串',
    specification: '8mm圆珠手串',
    description: '彩色碧玺手串，色彩斑斓',
    sellingPrice: 188.00,
    laborCost: 22.00,
    craftCost: 13.00
  }
];

async function createProperSkus() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    // 获取用户ID
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    const userId = users[0]?.id;
    if (!userId) {
      throw new Error('没有找到用户');
    }
    
    // 获取可用的采购记录作为原材料
    const [purchases] = await connection.execute(`
      SELECT id, productName, unitPrice, quantity, quality, specification,
             purchaseCode, supplierId, productType
      FROM purchases 
      WHERE quantity > 0 
      ORDER BY createdAt DESC
      LIMIT 20
    `);
    
    if (purchases.length === 0) {
      console.log('❌ 没有找到可用的采购记录作为原材料');
      return;
    }
    
    console.log(`✅ 找到 ${purchases.length} 个可用的采购记录`);
    
    // 删除现有的SKU和相关记录（按外键依赖顺序）
    console.log('🗑️ 清理现有SKU数据...');
    await connection.execute('DELETE FROM customer_purchases');
    await connection.execute('DELETE FROM sku_inventory_logs');
    await connection.execute('DELETE FROM material_usage');
    await connection.execute('DELETE FROM product_skus');
    await connection.execute('DELETE FROM products WHERE unit = "件"');
    
    // 清理相关的财务记录
    await connection.execute('DELETE FROM financial_records WHERE referenceType IN ("SALE", "REFUND")');
    await connection.execute('DELETE FROM customer_notes');
    
    console.log('✅ 数据清理完成');
    
    const createdSkus = [];
    
    // 为每个SKU产品创建记录
    for (let i = 0; i < Math.min(skuProducts.length, purchases.length); i++) {
      const skuInfo = skuProducts[i];
      const purchase = purchases[i];
      
      console.log(`\n🔨 制作SKU: ${skuInfo.name}`);
      
      // 开始事务
      await connection.beginTransaction();
      
      try {
        // 1. 创建Product记录
        const productId = generateUUID();
        const initialQuantity = Math.floor(Math.random() * 8) + 3; // 3-10件
        
        await connection.execute(`
          INSERT INTO products (
            id, name, description, unit, quantity, unitPrice, totalValue, 
            images, userId, createdAt, updatedAt
          ) VALUES (?, ?, ?, '件', ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          productId,
          skuInfo.name,
          skuInfo.description,
          initialQuantity,
          skuInfo.sellingPrice,
          skuInfo.sellingPrice * initialQuantity,
          JSON.stringify([`https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(skuInfo.name + ' crystal bracelet jewelry')}&image_size=square`]),
          userId
        ]);
        
        // 2. 计算原材料消耗
        const materialQuantity = Math.floor(Math.random() * 3) + 2; // 每个SKU消耗2-4个原材料单位
        const materialCost = (purchase.unitPrice || 0) * materialQuantity;
        const totalCost = materialCost + skuInfo.laborCost + skuInfo.craftCost;
        const profitMargin = ((skuInfo.sellingPrice - totalCost) / skuInfo.sellingPrice * 100).toFixed(2);
        
        // 3. 创建MaterialUsage记录
        const materialUsageId = generateUUID();
        await connection.execute(`
          INSERT INTO material_usage (
            id, purchaseId, productId, quantityUsedPieces, quantityUsedBeads,
            unitCost, totalCost, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, 0, ?, ?, NOW(), NOW())
        `, [
          materialUsageId,
          purchase.id,
          productId,
          materialQuantity * initialQuantity, // 总消耗量
          purchase.unitPrice || 0,
          materialCost * initialQuantity
        ]);
        
        // 4. 更新采购记录的数量
        await connection.execute(`
          UPDATE purchases 
          SET quantity = quantity - ?
          WHERE id = ?
        `, [materialQuantity * initialQuantity, purchase.id]);
        
        // 5. 生成材料标识
        const materialSignature = [{
          purchaseId: purchase.id,
          productName: purchase.productName,
          quantity: materialQuantity,
          unitPrice: purchase.unitPrice || 0,
          totalCost: materialCost
        }];
        
        const materialSignatureHash = generateMaterialSignatureHash(materialSignature);
        
        // 6. 创建SKU记录
        const skuId = generateUUID();
        const skuCode = generateSkuCode();
        
        await connection.execute(`
          INSERT INTO product_skus (
            id, skuCode, skuName, description, specification, totalQuantity, 
            availableQuantity, unitPrice, totalValue, sellingPrice, profitMargin,
            status, photos, materialCost, laborCost, craftCost, totalCost,
            materialSignatureHash, materialSignature, createdBy, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          skuId,
          skuCode,
          skuInfo.name,
          skuInfo.description,
          skuInfo.specification,
          initialQuantity,
          initialQuantity,
          totalCost,
          skuInfo.sellingPrice * initialQuantity,
          skuInfo.sellingPrice,
          profitMargin,
          JSON.stringify([`https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(skuInfo.name + ' crystal bracelet jewelry')}&image_size=square`]),
          materialCost,
          skuInfo.laborCost,
          skuInfo.craftCost,
          totalCost,
          materialSignatureHash,
          JSON.stringify(materialSignature),
          userId
        ]);
        
        // 7. SKU创建完成（无需额外关联）
        
        await connection.commit();
        
        createdSkus.push({
          skuCode,
          name: skuInfo.name,
          quantity: initialQuantity,
          materialCost,
          totalCost,
          sellingPrice: skuInfo.sellingPrice,
          profitMargin
        });
        
        console.log(`✅ 成功创建 ${skuCode}: ${skuInfo.name}`);
        console.log(`   数量: ${initialQuantity}件`);
        console.log(`   原材料: ${purchase.productName} (消耗${materialQuantity * initialQuantity}单位)`);
        console.log(`   成本: 材料¥${materialCost} + 人工¥${skuInfo.laborCost} + 工艺¥${skuInfo.craftCost} = ¥${totalCost}`);
        console.log(`   售价: ¥${skuInfo.sellingPrice}, 利润率: ${profitMargin}%`);
        
      } catch (error) {
        await connection.rollback();
        console.error(`❌ 创建SKU失败: ${skuInfo.name}`, error.message);
      }
    }
    
    // 验证创建结果
    console.log('\n🔍 验证创建结果...');
    
    const [skuCount] = await connection.execute('SELECT COUNT(*) as count FROM product_skus');
    const [materialUsageCount] = await connection.execute('SELECT COUNT(*) as count FROM material_usage');
    const [productCount] = await connection.execute('SELECT COUNT(*) as count FROM products WHERE unit = "件"');
    
    console.log(`\n📊 创建统计:`);
    console.log(`- SKU数量: ${skuCount[0].count}`);
    console.log(`- MaterialUsage记录: ${materialUsageCount[0].count}`);
    console.log(`- Product记录: ${productCount[0].count}`);
    
    // 检查库存状态
    const [skuInventory] = await connection.execute(`
      SELECT skuCode, skuName, availableQuantity, totalQuantity, sellingPrice
      FROM product_skus 
      ORDER BY createdAt DESC
    `);
    
    console.log('\n📦 SKU库存状态:');
    skuInventory.forEach(sku => {
      console.log(`${sku.skuCode}: ${sku.skuName} - 可售:${sku.availableQuantity}件, 售价:¥${sku.sellingPrice}`);
    });
    
    console.log('\n✅ SKU制作完成！现在可以进行客户交易了。');
    
  } catch (error) {
    console.error('❌ 执行过程中出现错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔗 数据库连接已关闭');
    }
  }
}

// 执行SKU制作
createProperSkus().catch(console.error);