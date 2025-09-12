import fetch from 'node-fetch';
import mysql from 'mysql2/promise';

// API配置
const API_BASE_URL = 'http://localhost:3001/api/v1';
let authToken = null;

// 获取认证token
async function getAuthToken() {
  const passwords = ['123456', 'password', 'boss123', 'admin123', '123', 'boss', 'crystal123'];
  
  for (const password of passwords) {
    try {
      console.log(`🔐 尝试密码: ${password}`);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'boss',
          password: password
        })
      });
      
      const result = await response.json();
      if (result.success) {
        authToken = result.data.token;
        console.log(`✅ 认证成功，密码: ${password}`);
        return true;
      } else {
        console.log(`❌ 密码 ${password} 失败:`, result.message);
      }
    } catch (error) {
      console.log(`❌ 密码 ${password} 请求失败:`, error.message);
    }
  }
  
  console.error('❌ 所有密码尝试失败');
  return false;
}

// 获取可用采购记录
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
      WHERE (total_beads > 0 OR piece_count > 0 OR quantity > 0)
      ORDER BY created_at DESC 
      LIMIT 30
    `);
    
    return purchases;
  } finally {
    await connection.end();
  }
}

// 组合制作模式：多个原材料组合成1个SKU
async function createComboSku(materials, index) {
  const product_name = `精品组合手串${String(index).pad_start(3, '0')}`;
  const description = `由${materials.length}种优质原材料精心组合制作`;
  
  // 构建材料使用记录
  const materialsData = materials.map(material => {
    const usage = {};
    usage.purchase_id = material.id;
    
    // 根据产品类型设置使用量
    if (material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET') {
      usage.quantity_used_beads = Math.min(20 + Math.floor(Math.random() * 30), material.total_beads || 0);
      usage.quantity_used_pieces = 0;
    } else {
      usage.quantity_used_beads = 0;
      usage.quantity_used_pieces = Math.min(1 + Math.floor(Math.random() * 3), material.piece_count || 0);
    }
    
    return usage;
  });
  
  const requestData = {
    product_name: product_name,
    description: description,
    specification: '8-12mm混合',
    materials: materialsData,
    labor_cost: 20.0 + Math.random() * 30,
    craft_cost: 50.0 + Math.random() * 100,
    selling_price: 200.0 + Math.random() * 500,
    profit_margin: 30 + Math.random() * 40
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
      console.log(`✅ 组合SKU ${index}: ${product_name} 创建成功`);
      return result.data;
    } else {
      console.error(`❌ 组合SKU ${index} 创建失败:`, result.message);
      return null;
    }
  } catch (error) {
    console.error(`❌ 组合SKU ${index} 请求失败:`, error.message);
    return null;
  }
}

// 直接转化模式：1个原材料转化成1个SKU
async function createDirectSku(material, index) {
  const product_name = `精品${material.product_name}${String(index).pad_start(3, '0')}`;
  const description = `直接转化自${material.product_name}的精美成品`;
  
  // 构建材料使用记录
  const materialsData = [{
    purchase_id: material.id,
    quantity_used_beads: material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' 
      ? Math.min(15 + Math.floor(Math.random() * 25), material.total_beads || 0) : 0,
    quantity_used_pieces: material.product_type === 'ACCESSORIES' || material.product_type === 'FINISHED'
      ? Math.min(1 + Math.floor(Math.random() * 2), material.piece_count || 0) : 0
  }];
  
  const requestData = {
    product_name: product_name,
    description: description,
    specification: `${material.bead_diameter || material.specification || 8}mm`,
    materials: materialsData,
    labor_cost: 15.0 + Math.random() * 20,
    craft_cost: 30.0 + Math.random() * 70,
    selling_price: 150.0 + Math.random() * 400,
    profit_margin: 25 + Math.random() * 35
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
      console.log(`✅ 直接SKU ${index}: ${product_name} 创建成功`);
      return result.data;
    } else {
      console.error(`❌ 直接SKU ${index} 创建失败:`, result.message);
      return null;
    }
  } catch (error) {
    console.error(`❌ 直接SKU ${index} 请求失败:`, error.message);
    return null;
  }
}

// 主函数
async function create100Skus() {
  console.log('🎯 开始创建100个SKU...');
  
  // 1. 获取认证token
  const authSuccess = await getAuthToken();
  if (!authSuccess) {
    console.error('❌ 认证失败，无法继续');
    return;
  }
  
  // 2. 获取可用采购记录
  console.log('📦 获取可用采购记录...');
  const purchases = await getAvailablePurchases();
  console.log(`📦 找到 ${purchases.length} 条可用采购记录`);
  
  if (purchases.length < 5) {
    console.error('❌ 可用采购记录不足，无法创建SKU');
    return;
  }
  
  const stats = {
    comboSuccess: 0,
    comboFailed: 0,
    directSuccess: 0,
    directFailed: 0
  };
  
  // 3. 创建50个组合制作SKU
  console.log('\n🔀 开始创建组合制作SKU...');
  for (let i = 1; i <= 50; i++) {
    // 随机选择2-4个原材料进行组合
    const materialCount = 2 + Math.floor(Math.random() * 3);
    const selected_materials = [];
    const usedIndices = new Set();
    
    while (selected_materials.length < materialCount) {
      const randomIndex = Math.floor(Math.random() * purchases.length);
      if (!usedIndices.has(randomIndex)) {
        selected_materials.push(purchases[randomIndex]);
        usedIndices.add(randomIndex);
      }
    }
    
    const result = await createComboSku(selected_materials, i);
    if (result) {
      stats.comboSuccess++;
    } else {
      stats.comboFailed++;
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 4. 创建50个直接转化SKU
  console.log('\n🔄 开始创建直接转化SKU...');
  for (let i = 1; i <= 50; i++) {
    // 随机选择一个原材料进行直接转化
    const randomIndex = Math.floor(Math.random() * purchases.length);
    const selectedMaterial = purchases[randomIndex];
    
    const result = await createDirectSku(selectedMaterial, i);
    if (result) {
      stats.directSuccess++;
    } else {
      stats.directFailed++;
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 5. 输出统计结果
  console.log('\n📊 创建统计结果:');
  console.log(`✅ 组合制作SKU成功: ${stats.comboSuccess}`);
  console.log(`❌ 组合制作SKU失败: ${stats.comboFailed}`);
  console.log(`✅ 直接转化SKU成功: ${stats.directSuccess}`);
  console.log(`❌ 直接转化SKU失败: ${stats.directFailed}`);
  console.log(`🎯 总成功: ${stats.comboSuccess + stats.directSuccess}`);
  console.log(`❌ 总失败: ${stats.comboFailed + stats.directFailed}`);
  
  console.log('\n🎉 SKU创建任务完成！');
}

// 执行主函数
create100Skus().catch(console.error);