import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { file_u_r_l_to_path } from 'url';

const _Filename = fileURLToPath(import.meta.url);
const _Dirname = path.dirname(_Filename);

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

// 计算每串珠子数量（手串三填二规则）
function calculateBeadsPerString(diameter) {
  if (diameter <= 0) return 20; // 默认值
  // 标准手腕周长160mm，珠子直径计算每串颗数
  return Math.round(160 / diameter);
}

// 创建100个复杂多样的SKU
async function create100ComplexSkus() {
  const connection = await mysql.create_connection(dbConfig);
  
  try {
    console.log('🚀 开始创建100个复杂多样的SKU...');
    
    // 步骤1：清理现有数据
    console.log('\n📝 步骤1：清理现有数据');
    await cleanExistingData(connection);
    
    // 步骤2：创建复杂多样的采购记录
    console.log('\n📝 步骤2：创建复杂多样的采购记录');
    await createComplexPurchaseRecords(connection);
    
    // 步骤3：创建100个SKU
    console.log('\n📝 步骤3：创建100个SKU');
    await create100Skus(connection);
    
    console.log('\n✅ 100个复杂多样的SKU创建完成！');
    
  } catch (error) {
    console.error('❌ 创建失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 清理现有数据
async function cleanExistingData(connection) {
  console.log('🗑️ 清理现有数据...');
  
  // 按照外键依赖关系的正确顺序删除数据
  await connection.execute('DELETE FROM customer_purchases');
  console.log('✅ 已清理客户购买记录');
  
  await connection.execute('DELETE FROM sku_inventory_logs');
  console.log('✅ 已清理SKU库存日志');
  
  await connection.execute('DELETE FROM material_usage');
  console.log('✅ 已清理原材料使用记录');
  
  await connection.execute('DELETE FROM products');
  console.log('✅ 已清理成品记录');
  
  await connection.execute('DELETE FROM product_skus');
  console.log('✅ 已清理SKU记录');
  
  await connection.execute('DELETE FROM purchases');
  console.log('✅ 已清理采购记录');
  
  await connection.execute('DELETE FROM financial_records');
  console.log('✅ 已清理财务记录');
}

// 创建复杂多样的采购记录
async function createComplexPurchaseRecords(connection) {
  // 获取用户ID和供应商ID
  const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
  if (users.length === 0) {
    throw new Error('未找到用户，请先创建用户');
  }
  const userId = users[0].id;
  
  const [suppliers] = await connection.execute('SELECT id FROM suppliers LIMIT 1');
  if (suppliers.length === 0) {
    throw new Error('未找到供应商，请先创建供应商');
  }
  const supplier_id = suppliers[0].id;
  
  // 定义复杂多样的采购数据
  const purchaseData = [
    // 散珠类型 - 不同品质和大小的组合
    // 白水晶系列 - 相同材质不同大小和品质
    {
      product_name: '白水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 6.0,
      specification: 6.0,
      piece_count: 2000,
      pricePerPiece: 0.08,
      total_price: 160.0,
      quality: 'AA',
      photos: ['white_crystal_beads.svg']
    },
    {
      product_name: '白水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 1500,
      pricePerPiece: 0.12,
      total_price: 180.0,
      quality: 'AA',
      photos: ['white_crystal_beads.svg']
    },
    {
      product_name: '白水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 1200,
      pricePerPiece: 0.10,
      total_price: 120.0,
      quality: 'A',
      photos: ['white_crystal_beads.svg']
    },
    {
      product_name: '白水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 10.0,
      specification: 10.0,
      piece_count: 1000,
      pricePerPiece: 0.15,
      total_price: 150.0,
      quality: 'AA',
      photos: ['white_crystal_beads.svg']
    },
    {
      product_name: '白水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 12.0,
      specification: 12.0,
      piece_count: 800,
      pricePerPiece: 0.20,
      total_price: 160.0,
      quality: 'A',
      photos: ['white_crystal_beads.svg']
    },
    
    // 紫水晶系列 - 相同材质不同大小和品质
    {
      product_name: '紫水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 6.0,
      specification: 6.0,
      piece_count: 1800,
      pricePerPiece: 0.15,
      total_price: 270.0,
      quality: 'AA',
      photos: ['purple_crystal_beads.svg']
    },
    {
      product_name: '紫水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 1500,
      pricePerPiece: 0.18,
      total_price: 270.0,
      quality: 'A',
      photos: ['purple_crystal_beads.svg']
    },
    {
      product_name: '紫水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 10.0,
      specification: 10.0,
      piece_count: 1200,
      pricePerPiece: 0.25,
      total_price: 300.0,
      quality: 'AA',
      photos: ['purple_crystal_beads.svg']
    },
    {
      product_name: '紫水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 12.0,
      specification: 12.0,
      piece_count: 900,
      pricePerPiece: 0.30,
      total_price: 270.0,
      quality: 'AB',
      photos: ['purple_crystal_beads.svg']
    },
    
    // 粉水晶系列
    {
      product_name: '粉水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 6.0,
      specification: 6.0,
      piece_count: 2200,
      pricePerPiece: 0.09,
      total_price: 198.0,
      quality: 'A',
      photos: ['rose_quartz_beads.svg']
    },
    {
      product_name: '粉水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 1600,
      pricePerPiece: 0.12,
      total_price: 192.0,
      quality: 'AA',
      photos: ['rose_quartz_beads.svg']
    },
    {
      product_name: '粉水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 10.0,
      specification: 10.0,
      piece_count: 1100,
      pricePerPiece: 0.16,
      total_price: 176.0,
      quality: 'A',
      photos: ['rose_quartz_beads.svg']
    },
    
    // 绿东陵系列
    {
      product_name: '绿东陵',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 1400,
      pricePerPiece: 0.22,
      total_price: 308.0,
      quality: 'AA',
      photos: ['green_aventurine_beads.svg']
    },
    {
      product_name: '绿东陵',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 10.0,
      specification: 10.0,
      piece_count: 1000,
      pricePerPiece: 0.28,
      total_price: 280.0,
      quality: 'A',
      photos: ['green_aventurine_beads.svg']
    },
    {
      product_name: '绿东陵',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 12.0,
      specification: 12.0,
      piece_count: 700,
      pricePerPiece: 0.35,
      total_price: 245.0,
      quality: 'AA',
      photos: ['green_aventurine_beads.svg']
    },
    
    // 黑曜石系列
    {
      product_name: '黑曜石',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 6.0,
      specification: 6.0,
      piece_count: 2000,
      pricePerPiece: 0.10,
      total_price: 200.0,
      quality: 'A',
      photos: ['black_obsidian_beads.svg']
    },
    {
      product_name: '黑曜石',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 1500,
      pricePerPiece: 0.14,
      total_price: 210.0,
      quality: 'AA',
      photos: ['black_obsidian_beads.svg']
    },
    {
      product_name: '黑曜石',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 10.0,
      specification: 10.0,
      piece_count: 1200,
      pricePerPiece: 0.18,
      total_price: 216.0,
      quality: 'A',
      photos: ['black_obsidian_beads.svg']
    },
    
    // 黄水晶系列
    {
      product_name: '黄水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 1300,
      pricePerPiece: 0.20,
      total_price: 260.0,
      quality: 'AA',
      photos: ['citrine_beads.svg']
    },
    {
      product_name: '黄水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 10.0,
      specification: 10.0,
      piece_count: 1000,
      pricePerPiece: 0.26,
      total_price: 260.0,
      quality: 'A',
      photos: ['citrine_beads.svg']
    },
    
    // 青金石系列
    {
      product_name: '青金石',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 1100,
      pricePerPiece: 0.32,
      total_price: 352.0,
      quality: 'AA',
      photos: ['blue_lapis_beads.svg']
    },
    {
      product_name: '青金石',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 10.0,
      specification: 10.0,
      piece_count: 800,
      pricePerPiece: 0.40,
      total_price: 320.0,
      quality: 'A',
      photos: ['blue_lapis_beads.svg']
    },
    
    // 红碧玉系列
    {
      product_name: '红碧玉',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 6.0,
      specification: 6.0,
      piece_count: 1800,
      pricePerPiece: 0.11,
      total_price: 198.0,
      quality: 'A',
      photos: ['red_jasper_beads.svg']
    },
    {
      product_name: '红碧玉',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 1400,
      pricePerPiece: 0.15,
      total_price: 210.0,
      quality: 'AA',
      photos: ['red_jasper_beads.svg']
    },
    
    // 手串类型 - 严格按照三填二规则
    {
      product_name: '白水晶手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 8.0,
      specification: 8.0,
      quantity: 15,
      beads_per_string: calculateBeadsPerString(8.0), // 自动计算：160/8=20
      total_beads: 15 * calculateBeadsPerString(8.0), // 15*20=300
      price_per_bead: 0.12,
      unit_price: 0.12 * calculateBeadsPerString(8.0), // 0.12*20=2.4
      total_price: 15 * 0.12 * calculateBeadsPerString(8.0), // 15*2.4=36
      quality: 'AA',
      photos: ['white_crystal_bracelet.svg']
    },
    {
      product_name: '紫水晶手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 10.0,
      specification: 10.0,
      quantity: 12,
      beads_per_string: calculateBeadsPerString(10.0), // 160/10=16
      total_beads: 12 * calculateBeadsPerString(10.0), // 12*16=192
      price_per_bead: 0.25,
      unit_price: 0.25 * calculateBeadsPerString(10.0), // 0.25*16=4.0
      total_price: 12 * 0.25 * calculateBeadsPerString(10.0), // 12*4=48
      quality: 'AA',
      photos: ['purple_crystal_bracelet.svg']
    },
    {
      product_name: '粉水晶手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 6.0,
      specification: 6.0,
      quantity: 20,
      beads_per_string: calculateBeadsPerString(6.0), // 160/6≈27
      total_beads: 20 * calculateBeadsPerString(6.0),
      price_per_bead: 0.12,
      unit_price: 0.12 * calculateBeadsPerString(6.0),
      total_price: 20 * 0.12 * calculateBeadsPerString(6.0),
      quality: 'A',
      photos: ['rose_quartz_bracelet.svg']
    },
    {
      product_name: '绿东陵手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 12.0,
      specification: 12.0,
      quantity: 8,
      beads_per_string: calculateBeadsPerString(12.0), // 160/12≈13
      total_beads: 8 * calculateBeadsPerString(12.0),
      price_per_bead: 0.35,
      unit_price: 0.35 * calculateBeadsPerString(12.0),
      total_price: 8 * 0.35 * calculateBeadsPerString(12.0),
      quality: 'AA',
      photos: ['green_aventurine_bracelet.svg']
    },
    
    // 配件类型
    {
      product_name: '银色隔珠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 4.0,
      piece_count: 1000,
      pricePerPiece: 0.05,
      total_price: 50.0,
      quality: 'AA',
      photos: ['silver_spacer_beads.svg']
    },
    {
      product_name: '金色隔珠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 4.0,
      piece_count: 800,
      pricePerPiece: 0.08,
      total_price: 64.0,
      quality: 'AA',
      photos: ['gold_spacer_beads.svg']
    },
    {
      product_name: '流苏吊坠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 15.0,
      piece_count: 100,
      pricePerPiece: 1.5,
      total_price: 150.0,
      quality: 'AA',
      photos: ['tassel_pendant.svg']
    },
    {
      product_name: '莲花吊坠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 12.0,
      piece_count: 80,
      pricePerPiece: 2.0,
      total_price: 160.0,
      quality: 'AA',
      photos: ['lotus_charm.svg']
    },
    {
      product_name: '佛珠吊坠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 10.0,
      piece_count: 120,
      pricePerPiece: 1.2,
      total_price: 144.0,
      quality: 'A',
      photos: ['buddha_pendant.svg']
    },
    {
      product_name: '水晶吊坠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 8.0,
      piece_count: 150,
      pricePerPiece: 0.8,
      total_price: 120.0,
      quality: 'AA',
      photos: ['crystal_pendant.svg']
    }
  ];
  
  // 插入采购记录
  for (let i = 0; i < purchaseData.length; i++) {
    const data = purchaseData[i];
    const purchase_code = `CG${new Date().to_i_s_o_string().slice(0, 10).replace(/-/g, '')}${String(i + 1).pad_start(3, '0')}`;
    
    // 构建完整的图片URL
    const protocol = 'http';
    const host = 'localhost:3001';
    const photoUrls = data.photos.map(filename => `${protocol}://${host}/uploads/purchases/${filename}`);
    
    const sql = `
      INSERT INTO purchases (
        id, purchase_code, product_name, product_type, unit_type, 
        bead_diameter, specification, quantity, piece_count, 
        beads_per_string, total_beads, price_per_bead, pricePerPiece, 
        unit_price, total_price, quality, photos, purchase_date, 
        supplierId, userId, status, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, 'ACTIVE', NOW(), NOW()
      )
    `;
    
    const id = `purchase_${Date.now()}_${i}`;
    
    await connection.execute(sql, [
      id,
      purchase_code,
      data.product_name,
      data.product_type,
      data.unit_type,
      data.bead_diameter || null,
      data.specification || null,
      data.quantity || null,
      data.piece_count || null,
      data.beads_per_string || null,
      data.total_beads || null,
      data.price_per_bead || null,
      data.pricePerPiece || null,
      data.unit_price || null,
      data.total_price,
      data.quality,
      JSON.stringify(photoUrls),
      supplierId,
      userId
    ]);
    
    console.log(`✅ 创建采购记录: ${data.product_name} (${purchase_code}) - ${data.quality}级 ${data.bead_diameter || data.specification}mm`);
  }
}

// 创建100个SKU
async function create100Skus(connection) {
  console.log('🎯 开始创建100个SKU...');
  
  // 获取用户ID
  const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
  const userId = users[0].id;
  
  // 获取采购记录
  const [purchases] = await connection.execute(`
    SELECT id, purchase_code, product_name, product_type, photos, 
           bead_diameter, specification, price_per_bead, pricePerPiece,
           quality, piece_count, total_beads, beads_per_string
    FROM purchases 
    ORDER BY purchase_code
  `);
  
  let skuCount = 0;
  
  // 创建直接转化SKU（每个采购记录创建2-3个SKU）
  for (const purchase of purchases) {
    if (skuCount >= 80) break; // 保留20个位置给组合SKU
    
    // 每个采购记录创建2-3个不同数量的SKU
    const quantities = purchase.product_type === 'LOOSE_BEADS' ? [1, 2, 3] : 
                      purchase.product_type === 'BRACELET' ? [1, 2] :
                      purchase.product_type === 'ACCESSORIES' ? [1, 2, 3] : [1];
    
    for (const quantity of quantities) {
      if (skuCount >= 80) break;
      
      await createDirectConversionSku(connection, purchase, userId, skuCount + 1, quantity);
      skuCount++;
    }
  }
  
  // 创建组合SKU（20个）
  await createCombinationSkus(connection, purchases, userId, skuCount);
  
  console.log(`✅ 总共创建了100个SKU`);
}

// 创建直接转化SKU
async function createDirectConversionSku(connection, purchase, userId, index, quantity) {
  const sku_code = `SKU${new Date().to_i_s_o_string().slice(0, 10).replace(/-/g, '')}${String(index).pad_start(3, '0')}`;
  
  // 材料标识
  const materialSignature = [{
    purchase_id: purchase.id,
    product_name: purchase.product_name,
    product_type: purchase.product_type,
    quality: purchase.quality,
    specification: purchase.bead_diameter || purchase.specification,
    quantity: quantity
  }];
  
  const material_signature_hash = Buffer.from(JSON.stringify(materialSignature)).to_string('base64').slice(0, 32);
  
  // 计算成本和价格
  let material_cost = 0;
  if (purchase.product_type === 'LOOSE_BEADS') {
    // 散珠：使用20颗制作一个SKU
    material_cost = (purchase.pricePerPiece || 0.2) * 20 * quantity;
  } else if (purchase.product_type === 'BRACELET') {
    // 手串：直接转化，使用每串价格
    material_cost = (purchase.unit_price || purchase.price_per_bead * purchase.beads_per_string || 3.0) * quantity;
  } else {
    // 配件：使用每片价格
    material_cost = (purchase.pricePerPiece || 1.0) * quantity;
  }
  
  const labor_cost = 5.0 * quantity;
  const craft_cost = 3.0 * quantity;
  const total_cost = materialCost + laborCost + craftCost;
  const selling_price = totalCost * (1.3 + Math.random() * 0.4); // 30%-70%利润率
  const profit_margin = ((selling_price - totalCost) / sellingPrice * 100).to_fixed(2);
  
  // SKU名称
  const sku_name = `精品${purchase.product_name}${purchase.quality}级手串${quantity > 1 ? `(${quantity}件套装)` : ''}`;
  
  // 图片继承：直接使用采购记录的图片
  const photos = purchase.photos;
  
  // 规格描述
  const specification = purchase.product_type === 'BRACELET' 
    ? `直径${purchase.bead_diameter}mm，${purchase.beads_per_string}颗/串`
    : `${purchase.bead_diameter || purchase.specification}mm ${purchase.quality}级`;
  
  const sql = `
    INSERT INTO product_skus (
      id, sku_code, sku_name, material_signature_hash, materialSignature,
      total_quantity, available_quantity, unit_price, totalValue,
      photos, description, specification, material_cost, labor_cost,
      craft_cost, totalCost, selling_price, profit_margin, status,
      createdBy, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NOW(), NOW()
    )
  `;
  
  const id = `sku_${Date.now()}_${index}`;
  const description = `采用优质${purchase.product_name}${purchase.quality}级原料制作，工艺精湛，品质保证。${quantity > 1 ? `套装包含${quantity}件。` : ''}`;
  
  await connection.execute(sql, [
    id, sku_code, sku_name, material_signature_hash, JSON.stringify(materialSignature),
    quantity, quantity, sellingPrice, sellingPrice * quantity, photos, description, specification,
    material_cost, labor_cost, craft_cost, totalCost, selling_price,
    profit_margin, userId
  ]);
  
  console.log(`✅ 创建直接转化SKU: ${ sku_name } (${ sku_code }) - ¥${selling_price.to_fixed(2)}`);
}

// 创建组合SKU
async function createCombinationSkus(connection, purchases, userId, startIndex) {
  // 创建20个组合SKU
  const combinations = [
    {
      name: '七彩水晶能量手串',
      materials: ['白水晶', '紫水晶', '粉水晶', '绿东陵', '黄水晶'],
      description: '融合七种水晶能量的强力护身手串，平衡身心能量'
    },
    {
      name: '黑曜石护身手串',
      materials: ['黑曜石', '银色隔珠', '佛珠吊坠'],
      description: '强力辟邪护身，适合日常佩戴，保平安'
    },
    {
      name: '粉晶爱情手串',
      materials: ['粉水晶', '金色隔珠', '莲花吊坠'],
      description: '招桃花增进感情运势的专属手串，提升魅力'
    },
    {
      name: '青金石智慧手串',
      materials: ['青金石', '银色隔珠', '水晶吊坠'],
      description: '提升智慧和学业运势的能量手串，开启智慧'
    },
    {
      name: '白水晶净化手串',
      materials: ['白水晶', '银色隔珠'],
      description: '净化负能量，提升正能量的经典手串'
    },
    {
      name: '紫水晶贵族手串',
      materials: ['紫水晶', '金色隔珠', '流苏吊坠'],
      description: '高贵典雅，提升气质的贵族专属手串'
    },
    {
      name: '绿东陵财富手串',
      materials: ['绿东陵', '金色隔珠'],
      description: '招财进宝，提升财运的专业手串'
    },
    {
      name: '红碧玉活力手串',
      materials: ['红碧玉', '银色隔珠'],
      description: '增强活力，提升生命力的能量手串'
    },
    {
      name: '黄水晶阳光手串',
      materials: ['黄水晶', '金色隔珠', '莲花吊坠'],
      description: '带来阳光般的温暖和正能量'
    },
    {
      name: '混合水晶平衡手串',
      materials: ['白水晶', '粉水晶', '绿东陵'],
      description: '三种水晶完美平衡，调和身心能量'
    },
    {
      name: '黑曜石银饰手串',
      materials: ['黑曜石', '银色隔珠', '水晶吊坠'],
      description: '黑银搭配，时尚护身的现代手串'
    },
    {
      name: '紫粉双色手串',
      materials: ['紫水晶', '粉水晶', '银色隔珠'],
      description: '紫粉双色搭配，浪漫优雅的女性手串'
    },
    {
      name: '五行水晶手串',
      materials: ['白水晶', '黑曜石', '红碧玉', '黄水晶', '绿东陵'],
      description: '五行相配，全面平衡的风水手串'
    },
    {
      name: '佛系禅意手串',
      materials: ['白水晶', '佛珠吊坠', '银色隔珠'],
      description: '禅意十足，修身养性的佛系手串'
    },
    {
      name: '贵族金饰手串',
      materials: ['紫水晶', '黄水晶', '金色隔珠', '流苏吊坠'],
      description: '金紫搭配，彰显贵族气质的奢华手串'
    },
    {
      name: '清新自然手串',
      materials: ['粉水晶', '绿东陵', '莲花吊坠'],
      description: '清新自然，回归本真的田园风手串'
    },
    {
      name: '神秘黑金手串',
      materials: ['黑曜石', '黄水晶', '金色隔珠'],
      description: '黑金搭配，神秘高贵的时尚手串'
    },
    {
      name: '彩虹能量手串',
      materials: ['白水晶', '紫水晶', '粉水晶', '黄水晶', '绿东陵', '红碧玉'],
      description: '六色彩虹，全光谱能量的终极手串'
    },
    {
      name: '简约银饰手串',
      materials: ['白水晶', '银色隔珠', '水晶吊坠'],
      description: '简约而不简单，百搭的银饰手串'
    },
    {
      name: '复古流苏手串',
      materials: ['红碧玉', '黄水晶', '金色隔珠', '流苏吊坠'],
      description: '复古流苏设计，古典韵味的艺术手串'
    }
  ];
  
  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    const sku_code = `SKU${new Date().to_i_s_o_string().slice(0, 10).replace(/-/g, '')}${String(startIndex + i + 1).pad_start(3, '0')}`;
    
    // 查找对应的采购记录
    const materialSignature = [];
    const combinedPhotos = [];
    let totalMaterialCost = 0;
    
    for (const material_name of combo.materials) {
      const purchase = purchases.find(p => p.product_name.includes(material_name.replace('色', '')));
      if (purchase) {
        materialSignature.push({
          purchase_id: purchase.id,
          product_name: purchase.product_name,
          product_type: purchase.product_type,
          quality: purchase.quality,
          quantity: 1
        });
        
        // 收集图片
        if (purchase.photos) {
          try {
            const photoArray = JSON.parse(purchase.photos);
            combinedPhotos.push(...photoArray);
          } catch (e) {
            if (typeof purchase.photos === 'string') {
              combinedPhotos.push(purchase.photos);
            }
          }
        }
        
        // 计算材料成本
        const cost = purchase.product_type === 'LOOSE_BEADS' 
          ? (purchase.pricePerPiece || 0.2) * 15  // 使用15颗
          : purchase.product_type === 'BRACELET'
          ? (purchase.unit_price || 3.0) * 0.5     // 使用半串
          : (purchase.pricePerPiece || 1.0) * 1;  // 使用1个配件
        totalMaterialCost += cost;
      }
    }
    
    const material_signature_hash = Buffer.from(JSON.stringify(materialSignature)).to_string('base64').slice(0, 32);
    
    // 计算成本和价格
    const labor_cost = 12.0; // 组合SKU人工成本更高
    const craft_cost = 8.0;   // 工艺成本更高
    const total_cost = totalMaterialCost + laborCost + craftCost;
    const selling_price = totalCost * (1.5 + Math.random() * 0.5); // 50%-100%利润率
    const profit_margin = ((selling_price - totalCost) / sellingPrice * 100).to_fixed(2);
    
    // 去重图片
    const uniquePhotos = [...new Set(combinedPhotos)];
    
    const sql = `
      INSERT INTO product_skus (
        id, sku_code, sku_name, material_signature_hash, materialSignature,
        total_quantity, available_quantity, unit_price, totalValue,
        photos, description, specification, material_cost, labor_cost,
        craft_cost, totalCost, selling_price, profit_margin, status,
        createdBy, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NOW(), NOW()
      )
    `;
    
    const id = `sku_combo_${Date.now()}_${i}`;
    const specification = `混合材质，${combo.materials.length}种原料精工制作`;
    
    await connection.execute(sql, [
      id, sku_code, combo.name, material_signature_hash, JSON.stringify(materialSignature),
      sellingPrice, sellingPrice, JSON.stringify(uniquePhotos), combo.description, specification,
      totalMaterialCost, labor_cost, craft_cost, totalCost, selling_price,
      profit_margin, userId
    ]);
    
    console.log(`✅ 创建组合SKU: ${combo.name} (${ sku_code }) - ¥${selling_price.to_fixed(2)}`);
  }
}

// 执行创建
create100ComplexSkus().catch(console.error);