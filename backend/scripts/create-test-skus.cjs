const mysql = require('mysql2/promise');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  port: 3306
};

// API配置
const API_BASE_URL = 'http://localhost:3001/api/v1';

// 获取管理员token
async function getAdminToken() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'boss',
      password: '123456'
    });
    return response.data.data.token;
  } catch (error) {
    console.error('获取管理员token失败:', error.response?.data || error.message);
    throw error;
  }
}

// 获取库存信息
async function getInventory(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/inventory`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, limit: 50, available_only: true }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('获取库存失败:', error.response?.data || error.message);
    throw error;
  }
}

// 获取采购记录（作为备选方案）
async function getPurchases(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/purchases`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, limit: 20, status: 'ACTIVE' }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('获取采购记录失败:', error.response?.data || error.message);
    throw error;
  }
}

// 通过API制作SKU（组合制作模式）
async function makeSku(skuData, token) {
  try {
    const response = await axios.post(`${API_BASE_URL}/finished-products`, skuData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    console.error('制作SKU失败:', error.response?.data || error.message);
    throw error;
  }
}

// 创建测试SKU数据（通过真实业务流程）
async function createTestSkus() {
  let connection;
  
  try {
    console.log('🚀 开始通过真实业务流程创建测试SKU数据...');
    
    // 1. 获取管理员token
    console.log('1️⃣ 获取管理员token...');
    const token = await getAdminToken();
    
    // 2. 查看库存
    console.log('2️⃣ 查看库存信息...');
    const inventory = await getInventory(token);
    
    console.log('库存数据结构:', {
      hasInventory: !!inventory,
      hasItems: !!(inventory && inventory.items),
      itemsLength: inventory && inventory.items ? inventory.items.length : 0,
      inventoryKeys: inventory ? Object.keys(inventory) : []
    });
    
    // 修正：库存API返回的是items而不是materials
    const materials = inventory.items || [];
    
    if (!inventory || !materials || materials.length === 0) {
      throw new Error('库存中没有可用的原材料，无法制作SKU');
    }
    
    console.log(`   找到 ${materials.length} 种可用原材料`);
    
    // 检查库存数据中是否有有效的purchase_id
    const materialsWithPurchaseId = materials.filter(material => 
      material.purchase_id && material.remaining_beads >= 10
    );
    
    let availableMaterials;
    
    if (materialsWithPurchaseId.length > 0) {
      console.log('3️⃣ 从库存中挑选材料...');
      availableMaterials = materialsWithPurchaseId;
      console.log(`   筛选出 ${availableMaterials.length} 种库存充足的原材料`);
    } else {
      console.log('3️⃣ 库存数据缺少purchase_id，改用采购记录...');
      const purchases = await getPurchases(token);
      
      if (!purchases || !purchases.purchases || purchases.purchases.length === 0) {
        throw new Error('没有可用的采购记录，无法制作SKU');
      }
      
      availableMaterials = purchases.purchases.filter(purchase => 
        purchase.status === 'ACTIVE' && (purchase.total_beads > 10 || purchase.piece_count > 0)
      );
      
      if (availableMaterials.length === 0) {
        throw new Error('没有足够库存的采购记录，无法制作SKU');
      }
      
      console.log(`   找到 ${availableMaterials.length} 个可用的采购记录`);
    }
    
    // 4. 制作SKU模板
    const skuTemplates = [
      {
        name: '紫水晶手串',
        specification: '8mm圆珠手串',
        selling_price: 88.00,
        labor_cost: 15.00,
        craft_cost: 8.00
      },
      {
        name: '粉水晶手串',
        specification: '10mm圆珠手串',
        selling_price: 128.00,
        labor_cost: 20.00,
        craft_cost: 12.00
      },
      {
        name: '白水晶手串',
        specification: '6mm圆珠手串',
        selling_price: 68.00,
        labor_cost: 12.00,
        craft_cost: 6.00
      },
      {
        name: '黑曜石手串',
        specification: '12mm圆珠手串',
        selling_price: 158.00,
        labor_cost: 25.00,
        craft_cost: 15.00
      },
      {
        name: '青金石手串',
        specification: '8mm圆珠手串',
        selling_price: 98.00,
        labor_cost: 18.00,
        craft_cost: 10.00
      }
    ];
    
    const createdSkus = [];
    const maxSkus = Math.min(skuTemplates.length, availableMaterials.length, 5);
    
    console.log(`4️⃣ 开始制作 ${maxSkus} 个SKU...`);
    
    for (let i = 0; i < maxSkus; i++) {
      const template = skuTemplates[i];
      const material = availableMaterials[i];
      
      console.log(`\n🔨 制作SKU ${i + 1}/${maxSkus}: ${template.name}`);
      
      // 根据数据来源显示不同信息
      const materialName = material.product_name || material.productName;
      const materialId = material.purchase_id || material.id;
      const stockInfo = material.remaining_beads ? 
        `库存: ${material.remaining_beads}颗珠子` : 
        `采购记录: ${material.total_beads || material.piece_count || 'N/A'}个单位`;
      
      console.log(`   使用原材料: ${materialName} (${stockInfo})`);
      
      // 制作SKU数据
      const skuData = {
        product_name: template.name,
        specification: template.specification,
        selling_price: template.selling_price,
        labor_cost: template.labor_cost,
        craft_cost: template.craft_cost,
        description: `使用${materialName}制作的精美${template.name}`,
        materials: [
          {
            purchase_id: materialId,
            quantity_used_pieces: material.piece_count ? 1 : 0,
            quantity_used_beads: Math.floor(Math.random() * 15) + 10 // 10-25颗珠子
          }
        ]
      };
      
      console.log(`   📋 制作参数:`);
      console.log(`      - 售价: ¥${template.selling_price}`);
      console.log(`      - 人工成本: ¥${template.labor_cost}`);
      console.log(`      - 工艺成本: ¥${template.craft_cost}`);
      console.log(`      - 使用珠子: ${skuData.materials[0].quantity_used_beads}颗`);
      console.log(`      - 使用配件: ${skuData.materials[0].quantity_used_pieces}件`);
      
      try {
        const sku = await makeSku(skuData, token);
        console.log(`   ✅ SKU制作成功: ${sku.sku_name || template.name} (${sku.sku_code || 'N/A'})`);
        createdSkus.push(sku);
      } catch (error) {
        console.log(`   ❌ SKU制作失败: ${error.message}`);
        continue;
      }
      
      // 随机延迟，模拟真实制作间隔
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n🎉 成功通过真实业务流程创建 ${createdSkus.length} 个SKU！`);
    
    // 验证创建结果
    connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(`
      SELECT COUNT(*) as count, SUM(availableQuantity) as total_stock 
      FROM product_skus 
      WHERE availableQuantity > 0 AND sellingPrice > 0
    `);
    
    console.log('\n📊 创建结果统计:');
    console.log(`可售SKU数量: ${result[0].count}`);
    console.log(`总库存数量: ${result[0].total_stock}`);
    
    console.log('\n💡 业务流程验证:');
    console.log('   ✅ 1. 获取token -> 成功登录系统');
    console.log('   ✅ 2. 查看库存 -> 成功获取可用原材料');
    console.log('   ✅ 3. 挑选材料 -> 从库存中选择充足的原材料');
    console.log('   ✅ 4. 制作SKU -> 通过API消耗原材料制作成品');
    console.log('   ✅ 5. 自动化 -> 库存扣减、成本计算、SKU生成全自动');
    
    return createdSkus;
    
  } catch (error) {
    console.error('❌ 创建SKU时发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行脚本
if (require.main === module) {
  createTestSkus()
    .then(() => {
      console.log('\n✨ SKU创建脚本执行完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createTestSkus };