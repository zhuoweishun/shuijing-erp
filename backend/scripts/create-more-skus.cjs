const mysql = require('mysql2/promise');
require('dotenv').config();

// API配置
const API_BASE_URL = 'http://localhost:3001/api/v1';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWY4aDNnOHAwMDAwdHVwZ3E0Z2NyZncwIiwidXNlcm5hbWUiOiJib3NzIiwicm9sZSI6IkJPU1MiLCJpYXQiOjE3NTc0MTQxMDgsImV4cCI6MTc1ODAxODkwOH0.vGA0gH0Nfv8FacWgnBDfc9ZklcyFfRn3rnPebkDYF1o';

// SKU制作配方
const SKU_RECIPES = [
  {
    name: '天然紫水晶项链',
    type: 'NECKLACE',
    materials: [{ type: 'LOOSE_BEADS', name: '紫水晶', quantity: 2 }],
    sellingPrice: 168.00,
    quantity: 8
  },
  {
    name: '粉水晶散珠套装',
    type: 'LOOSE_BEADS_SET',
    materials: [{ type: 'LOOSE_BEADS', name: '粉水晶', quantity: 1 }],
    sellingPrice: 88.00,
    quantity: 10
  },
  {
    name: '黑曜石护身符',
    type: 'ACCESSORIES',
    materials: [{ type: 'LOOSE_BEADS', name: '黑曜石', quantity: 1 }],
    sellingPrice: 128.00,
    quantity: 6
  },
  {
    name: '白水晶能量手串',
    type: 'BRACELET',
    materials: [{ type: 'LOOSE_BEADS', name: '白水晶', quantity: 1 }],
    sellingPrice: 98.00,
    quantity: 12
  },
  {
    name: '玛瑙平安扣',
    type: 'ACCESSORIES',
    materials: [{ type: 'LOOSE_BEADS', name: '玛瑙', quantity: 1 }],
    sellingPrice: 118.00,
    quantity: 8
  },
  {
    name: '青金石冥想手串',
    type: 'BRACELET',
    materials: [{ type: 'LOOSE_BEADS', name: '青金石', quantity: 1 }],
    sellingPrice: 138.00,
    quantity: 10
  },
  {
    name: '碧玺招财手串',
    type: 'BRACELET',
    materials: [{ type: 'LOOSE_BEADS', name: '碧玺', quantity: 1 }],
    sellingPrice: 228.00,
    quantity: 6
  },
  {
    name: '翡翠如意吊坠',
    type: 'ACCESSORIES',
    materials: [{ type: 'LOOSE_BEADS', name: '翡翠', quantity: 1 }],
    sellingPrice: 388.00,
    quantity: 5
  },
  {
    name: '水晶球摆件',
    type: 'FINISHED',
    materials: [{ type: 'FINISHED', name: '水晶球', quantity: 1 }],
    sellingPrice: 158.00,
    quantity: 8
  },
  {
    name: '水晶摆件组合',
    type: 'FINISHED',
    materials: [{ type: 'FINISHED', name: '水晶摆件', quantity: 1 }],
    sellingPrice: 268.00,
    quantity: 6
  }
];

async function createMoreSkus() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  try {
    console.log('🎯 开始制作更多SKU...');
    
    // 动态导入fetch
    const { default: fetch } = await import('node-fetch');
    
    // 获取可用的原材料
    const [purchases] = await connection.execute(`
      SELECT id, productName, productType, quantity, specification, quality
      FROM purchases 
      WHERE status = 'ACTIVE' AND quantity > 0
      ORDER BY productType, productName
    `);
    
    console.log(`\n📦 找到 ${purchases.length} 种可用原材料`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const recipe of SKU_RECIPES) {
      try {
        console.log(`\n🔨 制作 ${recipe.name}...`);
        
        // 查找匹配的原材料
        const materials = [];
        for (const materialReq of recipe.materials) {
          const matchedPurchases = purchases.filter(p => 
            p.productType === materialReq.type && 
            p.productName.includes(materialReq.name) &&
            p.quantity >= materialReq.quantity
          );
          
          if (matchedPurchases.length === 0) {
            console.log(`   ❌ 找不到合适的原材料: ${materialReq.name} (${materialReq.type})`);
            continue;
          }
          
          // 选择第一个匹配的原材料
          const selectedPurchase = matchedPurchases[0];
          materials.push({
            purchaseId: selectedPurchase.id,
            quantityUsed: materialReq.quantity
          });
          
          console.log(`   ✅ 选择原材料: ${selectedPurchase.productName} (数量: ${materialReq.quantity})`);
        }
        
        if (materials.length === 0) {
          console.log(`   ❌ 跳过 ${recipe.name} - 没有合适的原材料`);
          errorCount++;
          continue;
        }
        
        // 调用API制作SKU
        const response = await fetch(`${API_BASE_URL}/finished-products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
          },
          body: JSON.stringify({
            product_name: recipe.name,
            selling_price: recipe.sellingPrice,
            materials: materials.map(m => ({
              purchase_id: m.purchaseId,
              quantity_used_beads: m.quantityUsed,
              quantity_used_pieces: 0
            })),
            description: `精心制作的${recipe.name}，采用优质天然材料`,
            labor_cost: 10,
            craft_cost: 5
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`   ✅ 成功制作 ${recipe.name} - SKU编号: ${result.skuCode}`);
          successCount++;
          
          // 更新原材料库存状态
          for (const material of materials) {
            await connection.execute(
              'UPDATE purchases SET quantity = quantity - ? WHERE id = ?',
              [material.quantityUsed, material.purchaseId]
            );
          }
        } else {
          const error = await response.text();
          console.log(`   ❌ 制作失败: ${error}`);
          errorCount++;
        }
        
        // 延迟一下避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`   ❌ 制作 ${recipe.name} 时出错:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 制作完成统计:`);
    console.log(`✅ 成功制作: ${successCount} 个SKU`);
    console.log(`❌ 制作失败: ${errorCount} 个SKU`);
    
    // 检查最新的SKU列表
    console.log('\n🎯 最新SKU列表:');
    const [newSkus] = await connection.execute(`
      SELECT skuCode, skuName, availableQuantity, sellingPrice, createdAt
      FROM product_skus 
      ORDER BY createdAt DESC 
      LIMIT 15
    `);
    
    newSkus.forEach((sku, index) => {
      console.log(`${index + 1}. ${sku.skuName} (${sku.skuCode})`);
      console.log(`   库存: ${sku.availableQuantity} | 售价: ¥${sku.sellingPrice}`);
      console.log(`   创建时间: ${sku.createdAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 制作SKU时出错:', error);
  } finally {
    await connection.end();
  }
}

createMoreSkus();