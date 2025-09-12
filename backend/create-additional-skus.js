import fetch from 'node-fetch';
import mysql from 'mysql2/promise';

// API配置
const API_BASE_URL = 'http://localhost:3001/api/v1';
let authToken = null;

// 获取认证token
async function getAuthToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'boss',
        password: '123456'
      })
    });
    
    const result = await response.json();
    if (result.success) {
      authToken = result.data.token;
      console.log('✅ 认证成功');
      return true;
    } else {
      console.error('❌ 认证失败:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 认证请求失败:', error.message);
    return false;
  }
}

// 获取可用采购记录（只选择库存充足的）
async function getAvailablePurchases() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    const [purchases] = await connection.execute(`
      SELECT id, purchase_code, product_name, product_type, quality, 
             bead_diameter, specification, total_beads, piece_count, quantity, 
             beads_per_string, price_per_bead, pricePerPiece, total_price, 
             photos, supplier_id
      FROM purchases 
      WHERE (total_beads >= 50 OR piece_count >= 5 OR quantity >= 3)
      ORDER BY total_beads DESC, piece_count DESC
      LIMIT 20
    `);
    
    return purchases;
  } finally {
    await connection.end();
  }
}

// 小量组合制作模式：使用更少的原材料
async function createSmallComboSku(materials, index) {
  const product_name = `精品小量组合${String(index).pad_start(3, '0')}`;
  const description = `由${materials.length}种优质原材料精心小量组合制作`;
  
  // 构建材料使用记录（使用更小的量）
  const materialsData = materials.map(material => {
    const usage = {};
    usage.purchase_id = material.id;
    
    // 根据产品类型设置更小的使用量
    if (material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET') {
      usage.quantity_used_beads = Math.min(5 + Math.floor(Math.random() * 10), Math.floor((material.total_beads || 0) * 0.1));
      usage.quantity_used_pieces = 0;
    } else {
      usage.quantity_used_beads = 0;
      usage.quantity_used_pieces = Math.min(1, Math.floor((material.piece_count || 0) * 0.2));
    }
    
    return usage;
  });
  
  const requestData = {
    product_name: product_name,
    description: description,
    specification: '6-10mm精选',
    materials: materialsData,
    labor_cost: 15.0 + Math.random() * 20,
    craft_cost: 30.0 + Math.random() * 50,
    selling_price: 120.0 + Math.random() * 280,
    profit_margin: 25 + Math.random() * 30
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/finished-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    if (result.success) {
      console.log(`✅ 小量组合SKU ${index}: ${product_name} 创建成功`);
      return result.data;
    } else {
      console.error(`❌ 小量组合SKU ${index} 创建失败:`, result.message);
      return null;
    }
  } catch (error) {
    console.error(`❌ 小量组合SKU ${index} 请求失败:`, error.message);
    return null;
  }
}

// 保守直接转化模式：使用更少的原材料
async function createConservativeDirectSku(material, index) {
  const product_name = `精品保守${material.product_name}${String(index).pad_start(3, '0')}`;
  const description = `保守用量转化自${material.product_name}的精美成品`;
  
  // 构建材料使用记录（使用更小的量）
  const materialsData = [{
    purchase_id: material.id,
    quantity_used_beads: material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' 
      ? Math.min(8 + Math.floor(Math.random() * 12), Math.floor((material.total_beads || 0) * 0.15)) : 0,
    quantity_used_pieces: material.product_type === 'ACCESSORIES' || material.product_type === 'FINISHED'
      ? Math.min(1, Math.floor((material.piece_count || 0) * 0.3)) : 0
  }];
  
  const requestData = {
    product_name: product_name,
    description: description,
    specification: `${material.bead_diameter || material.specification || 8}mm保守版`,
    materials: materialsData,
    labor_cost: 10.0 + Math.random() * 15,
    craft_cost: 20.0 + Math.random() * 40,
    selling_price: 100.0 + Math.random() * 250,
    profit_margin: 20 + Math.random() * 30
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/finished-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    if (result.success) {
      console.log(`✅ 保守直接SKU ${index}: ${product_name} 创建成功`);
      return result.data;
    } else {
      console.error(`❌ 保守直接SKU ${index} 创建失败:`, result.message);
      return null;
    }
  } catch (error) {
    console.error(`❌ 保守直接SKU ${index} 请求失败:`, error.message);
    return null;
  }
}

// 主函数
async function createAdditional38Skus() {
  console.log('🎯 开始创建额外的38个SKU...');
  
  // 1. 获取认证token
  const authSuccess = await getAuthToken();
  if (!authSuccess) {
    console.error('❌ 认证失败，无法继续');
    return;
  }
  
  // 2. 获取库存充足的采购记录
  console.log('📦 获取库存充足的采购记录...');
  const purchases = await getAvailablePurchases();
  console.log(`📦 找到 ${purchases.length} 条库存充足的采购记录`);
  
  if (purchases.length < 3) {
    console.error('❌ 库存充足的采购记录不足，无法创建SKU');
    return;
  }
  
  const stats = {
    smallComboSuccess: 0,
    smallComboFailed: 0,
    conservativeDirectSuccess: 0,
    conservativeDirectFailed: 0
  };
  
  // 3. 创建19个小量组合制作SKU
  console.log('\n🔀 开始创建小量组合制作SKU...');
  for (let i = 1; i <= 19; i++) {
    // 随机选择2-3个原材料进行小量组合
    const materialCount = 2 + Math.floor(Math.random() * 2);
    const selected_materials = [];
    const usedIndices = new Set();
    
    while (selected_materials.length < materialCount) {
      const randomIndex = Math.floor(Math.random() * purchases.length);
      if (!usedIndices.has(randomIndex)) {
        selected_materials.push(purchases[randomIndex]);
        usedIndices.add(randomIndex);
      }
    }
    
    const result = await createSmallComboSku(selected_materials, i + 50);
    if (result) {
      stats.smallComboSuccess++;
    } else {
      stats.smallComboFailed++;
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  
  // 4. 创建19个保守直接转化SKU
  console.log('\n🔄 开始创建保守直接转化SKU...');
  for (let i = 1; i <= 19; i++) {
    // 随机选择一个库存充足的原材料进行保守转化
    const randomIndex = Math.floor(Math.random() * purchases.length);
    const selectedMaterial = purchases[randomIndex];
    
    const result = await createConservativeDirectSku(selectedMaterial, i + 50);
    if (result) {
      stats.conservativeDirectSuccess++;
    } else {
      stats.conservativeDirectFailed++;
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  
  // 5. 输出统计结果
  console.log('\n📊 额外创建统计结果:');
  console.log(`✅ 小量组合SKU成功: ${stats.smallComboSuccess}`);
  console.log(`❌ 小量组合SKU失败: ${stats.smallComboFailed}`);
  console.log(`✅ 保守直接SKU成功: ${stats.conservativeDirectSuccess}`);
  console.log(`❌ 保守直接SKU失败: ${stats.conservativeDirectFailed}`);
  console.log(`🎯 本次成功: ${stats.smallComboSuccess + stats.conservativeDirectSuccess}`);
  console.log(`❌ 本次失败: ${stats.smallComboFailed + stats.conservativeDirectFailed}`);
  
  const totalSuccess = 62 + stats.smallComboSuccess + stats.conservativeDirectSuccess;
  console.log(`\n🏆 总计成功创建SKU: ${totalSuccess}`);
  
  if (totalSuccess >= 100) {
    console.log('🎉 恭喜！已成功创建100个SKU！');
  } else {
    console.log(`📈 还需要创建 ${100 - totalSuccess} 个SKU才能达到目标`);
  }
  
  console.log('\n🎉 额外SKU创建任务完成！');
}

// 执行主函数
createAdditional38Skus().catch(console.error);