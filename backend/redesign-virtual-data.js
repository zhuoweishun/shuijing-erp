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

// 重新设计虚拟数据创造功能
async function redesignVirtualData() {
  const connection = await mysql.create_connection(dbConfig);
  
  try {
    console.log('🚀 开始重新设计虚拟数据创造功能...');
    
    // 步骤1：清理现有错误数据
    console.log('\n📝 步骤1：清理现有错误数据');
    await cleanExistingData(connection);
    
    // 步骤2：创建真实图片文件
    console.log('\n📝 步骤2：创建真实图片文件');
    await createRealImageFiles();
    
    // 步骤3：重新创建采购记录
    console.log('\n📝 步骤3：重新创建采购记录');
    await createPurchaseRecords(connection);
    
    // 步骤4：重新创建SKU记录
    console.log('\n📝 步骤4：重新创建SKU记录');
    await createSkuRecords(connection);
    
    console.log('\n✅ 虚拟数据重新设计完成！');
    
  } catch (error) {
    console.error('❌ 重新设计失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 清理现有错误数据
async function cleanExistingData(connection) {
  console.log('🗑️ 清理SKU相关数据...');
  
  // 按照外键依赖关系的正确顺序删除数据
  
  // 删除客户购买记录
  await connection.execute('DELETE FROM customer_purchases');
  console.log('✅ 已清理客户购买记录');
  
  // 删除SKU库存日志
  await connection.execute('DELETE FROM sku_inventory_logs');
  console.log('✅ 已清理SKU库存日志');
  
  // 删除原材料使用记录（必须在删除products和purchases之前）
  await connection.execute('DELETE FROM material_usage');
  console.log('✅ 已清理原材料使用记录');
  
  // 删除成品记录
  await connection.execute('DELETE FROM products');
  console.log('✅ 已清理成品记录');
  
  // 删除SKU记录
  await connection.execute('DELETE FROM product_skus');
  console.log('✅ 已清理SKU记录');
  
  // 删除采购记录
  await connection.execute('DELETE FROM purchases');
  console.log('✅ 已清理采购记录');
  
  // 删除财务记录
  await connection.execute('DELETE FROM financial_records');
  console.log('✅ 已清理财务记录');
}

// 创建真实图片文件
async function createRealImageFiles() {
  const uploadsDir = path.join(_Dirname, 'uploads', 'purchases');
  
  // 确保目录存在
  if (!fs.exists_sync(uploadsDir)) {
    fs.mkdir_sync(uploadsDir, { recursive: true });
    console.log('✅ 创建uploads/purchases目录');
  }
  
  // 创建SVG图片文件
  const imageTemplates = [
    { name: 'white_crystal_beads.svg', color: '#f8f9fa', title: '白水晶散珠' },
    { name: 'purple_crystal_beads.svg', color: '#8b5cf6', title: '紫水晶散珠' },
    { name: 'rose_quartz_beads.svg', color: '#f472b6', title: '粉水晶散珠' },
    { name: 'green_aventurine_beads.svg', color: '#10b981', title: '绿东陵散珠' },
    { name: 'black_obsidian_beads.svg', color: '#1f2937', title: '黑曜石散珠' },
    { name: 'citrine_beads.svg', color: '#f59e0b', title: '黄水晶散珠' },
    { name: 'blue_lapis_beads.svg', color: '#3b82f6', title: '青金石散珠' },
    { name: 'red_jasper_beads.svg', color: '#ef4444', title: '红碧玉散珠' },
    { name: 'white_crystal_bracelet.svg', color: '#f8f9fa', title: '白水晶手串' },
    { name: 'purple_crystal_bracelet.svg', color: '#8b5cf6', title: '紫水晶手串' },
    { name: 'rose_quartz_bracelet.svg', color: '#f472b6', title: '粉水晶手串' },
    { name: 'green_aventurine_bracelet.svg', color: '#10b981', title: '绿东陵手串' },
    { name: 'black_obsidian_bracelet.svg', color: '#1f2937', title: '黑曜石手串' },
    { name: 'citrine_bracelet.svg', color: '#f59e0b', title: '黄水晶手串' },
    { name: 'blue_lapis_bracelet.svg', color: '#3b82f6', title: '青金石手串' },
    { name: 'red_jasper_bracelet.svg', color: '#ef4444', title: '红碧玉手串' },
    { name: 'silver_spacer_beads.svg', color: '#9ca3af', title: '银色隔珠配件' },
    { name: 'gold_spacer_beads.svg', color: '#f59e0b', title: '金色隔珠配件' },
    { name: 'tassel_pendant.svg', color: '#6b7280', title: '流苏吊坠配件' },
    { name: 'lotus_charm.svg', color: '#ec4899', title: '莲花吊坠配件' },
    { name: 'buddha_pendant.svg', color: '#92400e', title: '佛珠吊坠配件' },
    { name: 'crystal_pendant.svg', color: '#a855f7', title: '水晶吊坠配件' },
    { name: 'meditation_bracelet.svg', color: '#059669', title: '冥想手串成品' },
    { name: 'healing_bracelet.svg', color: '#7c3aed', title: '疗愈手串成品' },
    { name: 'protection_bracelet.svg', color: '#1f2937', title: '护身手串成品' }
  ];
  
  for (const template of imageTemplates) {
    const svgContent = createSvgImage(template.color, template.title);
    const filePath = path.join(uploadsDir, template.name);
    fs.write_file_sync(filePath, svgContent);
    console.log(`✅ 创建图片文件: ${template.name}`);
  }
}

// 创建SVG图片内容
function createSvgImage(color, title) {
  return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${adjustColor(color, -20)};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#grad)" rx="10" ry="10"/>
  <circle cx="200" cy="120" r="60" fill="${adjustColor(color, 30)}" opacity="0.8"/>
  <circle cx="160" cy="140" r="25" fill="${adjustColor(color, 50)}" opacity="0.6"/>
  <circle cx="240" cy="140" r="25" fill="${adjustColor(color, 50)}" opacity="0.6"/>
  <circle cx="200" cy="160" r="20" fill="${adjustColor(color, 70)}" opacity="0.4"/>
  <text x="200" y="220" font-family="Arial, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="white">${title}</text>
  <text x="200" y="240" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="white" opacity="0.8">高品质天然水晶</text>
  <text x="200" y="270" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="white" opacity="0.6">Crystal ERP System</text>
</svg>`;
}

// 调整颜色亮度
function adjustColor(color, percent) {
  if (color.startsWith('#')) {
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return `#${(0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).to_string(16).slice(1)}`;
  }
  return color;
}

// 重新创建采购记录
async function createPurchaseRecords(connection) {
  // 获取用户ID
  const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
  if (users.length === 0) {
    throw new Error('未找到用户，请先创建用户');
  }
  const userId = users[0].id;
  
  // 获取供应商ID
  const [suppliers] = await connection.execute('SELECT id FROM suppliers LIMIT 1');
  if (suppliers.length === 0) {
    throw new Error('未找到供应商，请先创建供应商');
  }
  const supplier_id = suppliers[0].id;
  
  // 采购记录数据
  const purchaseData = [
    // 散珠类型
    {
      product_name: '白水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 1000,
      pricePerPiece: 0.15,
      total_price: 150.0,
      quality: 'AA',
      photos: ['white_crystal_beads.svg']
    },
    {
      product_name: '紫水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 10.0,
      specification: 10.0,
      piece_count: 800,
      pricePerPiece: 0.25,
      total_price: 200.0,
      quality: 'AA',
      photos: ['purple_crystal_beads.svg']
    },
    {
      product_name: '粉水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 6.0,
      specification: 6.0,
      piece_count: 1200,
      pricePerPiece: 0.12,
      total_price: 144.0,
      quality: 'A',
      photos: ['rose_quartz_beads.svg']
    },
    {
      product_name: '绿东陵',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 12.0,
      specification: 12.0,
      piece_count: 600,
      pricePerPiece: 0.30,
      total_price: 180.0,
      quality: 'AA',
      photos: ['green_aventurine_beads.svg']
    },
    {
      product_name: '黑曜石',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 1000,
      pricePerPiece: 0.18,
      total_price: 180.0,
      quality: 'A',
      photos: ['black_obsidian_beads.svg']
    },
    {
      product_name: '黄水晶',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 10.0,
      specification: 10.0,
      piece_count: 700,
      pricePerPiece: 0.28,
      total_price: 196.0,
      quality: 'AA',
      photos: ['citrine_beads.svg']
    },
    {
      product_name: '青金石',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 8.0,
      specification: 8.0,
      piece_count: 800,
      pricePerPiece: 0.35,
      total_price: 280.0,
      quality: 'AA',
      photos: ['blue_lapis_beads.svg']
    },
    {
      product_name: '红碧玉',
      product_type: 'LOOSE_BEADS',
      unit_type: 'PIECES',
      bead_diameter: 6.0,
      specification: 6.0,
      piece_count: 1000,
      pricePerPiece: 0.20,
      total_price: 200.0,
      quality: 'A',
      photos: ['red_jasper_beads.svg']
    },
    
    // 手串类型
    {
      product_name: '白水晶手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 8.0,
      specification: 8.0,
      quantity: 10,
      beads_per_string: 20,
      total_beads: 200,
      price_per_bead: 0.15,
      unit_price: 3.0,
      total_price: 30.0,
      quality: 'AA',
      photos: ['white_crystal_bracelet.svg']
    },
    {
      product_name: '紫水晶手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 10.0,
      specification: 10.0,
      quantity: 8,
      beads_per_string: 16,
      total_beads: 128,
      price_per_bead: 0.25,
      unit_price: 4.0,
      total_price: 32.0,
      quality: 'AA',
      photos: ['purple_crystal_bracelet.svg']
    },
    {
      product_name: '粉水晶手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 6.0,
      specification: 6.0,
      quantity: 12,
      beads_per_string: 26,
      total_beads: 312,
      price_per_bead: 0.12,
      unit_price: 3.12,
      total_price: 37.44,
      quality: 'A',
      photos: ['rose_quartz_bracelet.svg']
    },
    {
      product_name: '绿东陵手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 12.0,
      specification: 12.0,
      quantity: 6,
      beads_per_string: 13,
      total_beads: 78,
      price_per_bead: 0.30,
      unit_price: 3.9,
      total_price: 23.4,
      quality: 'AA',
      photos: ['green_aventurine_bracelet.svg']
    },
    {
      product_name: '黑曜石手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 8.0,
      specification: 8.0,
      quantity: 10,
      beads_per_string: 20,
      total_beads: 200,
      price_per_bead: 0.18,
      unit_price: 3.6,
      total_price: 36.0,
      quality: 'A',
      photos: ['black_obsidian_bracelet.svg']
    },
    {
      product_name: '黄水晶手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 10.0,
      specification: 10.0,
      quantity: 7,
      beads_per_string: 16,
      total_beads: 112,
      price_per_bead: 0.28,
      unit_price: 4.48,
      total_price: 31.36,
      quality: 'AA',
      photos: ['citrine_bracelet.svg']
    },
    {
      product_name: '青金石手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 8.0,
      specification: 8.0,
      quantity: 8,
      beads_per_string: 20,
      total_beads: 160,
      price_per_bead: 0.35,
      unit_price: 7.0,
      total_price: 56.0,
      quality: 'AA',
      photos: ['blue_lapis_bracelet.svg']
    },
    {
      product_name: '红碧玉手串',
      product_type: 'BRACELET',
      unit_type: 'STRINGS',
      bead_diameter: 6.0,
      specification: 6.0,
      quantity: 10,
      beads_per_string: 26,
      total_beads: 260,
      price_per_bead: 0.20,
      unit_price: 5.2,
      total_price: 52.0,
      quality: 'A',
      photos: ['red_jasper_bracelet.svg']
    },
    
    // 配件类型
    {
      product_name: '银色隔珠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 4.0,
      piece_count: 500,
      pricePerPiece: 0.08,
      total_price: 40.0,
      quality: 'AA',
      photos: ['silver_spacer_beads.svg']
    },
    {
      product_name: '金色隔珠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 4.0,
      piece_count: 300,
      pricePerPiece: 0.12,
      total_price: 36.0,
      quality: 'AA',
      photos: ['gold_spacer_beads.svg']
    },
    {
      product_name: '流苏吊坠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 15.0,
      piece_count: 50,
      pricePerPiece: 2.5,
      total_price: 125.0,
      quality: 'AA',
      photos: ['tassel_pendant.svg']
    },
    {
      product_name: '莲花吊坠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 12.0,
      piece_count: 30,
      pricePerPiece: 3.0,
      total_price: 90.0,
      quality: 'AA',
      photos: ['lotus_charm.svg']
    },
    {
      product_name: '佛珠吊坠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 10.0,
      piece_count: 40,
      pricePerPiece: 2.8,
      total_price: 112.0,
      quality: 'A',
      photos: ['buddha_pendant.svg']
    },
    {
      product_name: '水晶吊坠',
      product_type: 'ACCESSORIES',
      unit_type: 'SLICES',
      specification: 8.0,
      piece_count: 60,
      pricePerPiece: 1.8,
      total_price: 108.0,
      quality: 'AA',
      photos: ['crystal_pendant.svg']
    },
    
    // 成品类型
    {
      product_name: '冥想手串',
      product_type: 'FINISHED',
      unit_type: 'ITEMS',
      specification: 16.0,
      piece_count: 5,
      pricePerPiece: 25.0,
      total_price: 125.0,
      quality: 'AA',
      photos: ['meditation_bracelet.svg']
    },
    {
      product_name: '疗愈手串',
      product_type: 'FINISHED',
      unit_type: 'ITEMS',
      specification: 18.0,
      piece_count: 3,
      pricePerPiece: 35.0,
      total_price: 105.0,
      quality: 'AA',
      photos: ['healing_bracelet.svg']
    },
    {
      product_name: '护身手串',
      product_type: 'FINISHED',
      unit_type: 'ITEMS',
      specification: 14.0,
      piece_count: 4,
      pricePerPiece: 28.0,
      total_price: 112.0,
      quality: 'A',
      photos: ['protection_bracelet.svg']
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
    
    console.log(`✅ 创建采购记录: ${data.product_name} (${purchase_code})`);
  }
}

// 重新创建SKU记录
async function createSkuRecords(connection) {
  console.log('🎯 开始创建SKU记录...');
  
  // 获取用户ID
  const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
  const userId = users[0].id;
  
  // 获取采购记录
  const [purchases] = await connection.execute(`
    SELECT id, purchase_code, product_name, product_type, photos, 
           bead_diameter, specification, price_per_bead, pricePerPiece
    FROM purchases 
    ORDER BY purchase_code
  `);
  
  // 创建直接转化SKU（单一原材料）
  for (let i = 0; i < Math.min(15, purchases.length); i++) {
    const purchase = purchases[i];
    await createDirectConversionSku(connection, purchase, userId, i + 1);
  }
  
  // 创建组合SKU（多种原材料）
  await createCombinationSkus(connection, purchases, userId);
}

// 创建直接转化SKU
async function createDirectConversionSku(connection, purchase, userId, index) {
  const sku_code = `SKU${new Date().to_i_s_o_string().slice(0, 10).replace(/-/g, '')}${String(index).pad_start(3, '0')}`;
  
  // 材料标识
  const materialSignature = [{
    purchase_id: purchase.id,
    product_name: purchase.product_name,
    product_type: purchase.product_type,
    quantity: 1
  }];
  
  const material_signature_hash = Buffer.from(JSON.stringify(materialSignature)).to_string('base64').slice(0, 32);
  
  // 计算成本和价格
  const material_cost = purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'BRACELET' 
    ? (purchase.price_per_bead || 0.2) * 20  // 假设使用20颗珠子
    : (purchase.pricePerPiece || 1.0) * 1; // 使用1个配件/成品
  
  const labor_cost = 5.0;
  const craft_cost = 3.0;
  const total_cost = materialCost + laborCost + craftCost;
  const selling_price = totalCost * 1.5; // 50%利润率
  const profit_margin = ((selling_price - totalCost) / sellingPrice * 100).to_fixed(2);
  
  // SKU名称
  const sku_name = `精品${purchase.product_name}手串`;
  
  // 图片继承：直接使用采购记录的图片
  const photos = purchase.photos;
  
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
  
  const id = `sku_${Date.now()}_${index}`;
  const description = `采用优质${purchase.product_name}制作的精美手串，工艺精湛，品质保证。`;
  const specification = `直径${purchase.bead_diameter || purchase.specification}mm`;
  
  await connection.execute(sql, [
    id, sku_code, sku_name, material_signature_hash, JSON.stringify(materialSignature),
    sellingPrice, sellingPrice, photos, description, specification,
    material_cost, labor_cost, craft_cost, totalCost, selling_price,
    profit_margin, userId
  ]);
  
  console.log(`✅ 创建直接转化SKU: ${ sku_name } (${ sku_code })`);
}

// 创建组合SKU
async function createCombinationSkus(connection, purchases, userId) {
  // 创建几个组合SKU示例
  const combinations = [
    {
      name: '七彩水晶能量手串',
      materials: ['白水晶', '紫水晶', '粉水晶', '绿东陵', '黄水晶'],
      description: '融合七种水晶能量的强力护身手串'
    },
    {
      name: '黑曜石护身手串',
      materials: ['黑曜石', '银色隔珠', '佛珠吊坠'],
      description: '强力辟邪护身，适合日常佩戴'
    },
    {
      name: '粉晶爱情手串',
      materials: ['粉水晶', '金色隔珠', '莲花吊坠'],
      description: '招桃花增进感情运势的专属手串'
    },
    {
      name: '青金石智慧手串',
      materials: ['青金石', '银色隔珠', '水晶吊坠'],
      description: '提升智慧和学业运势的能量手串'
    }
  ];
  
  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    const sku_code = `SKU${new Date().to_i_s_o_string().slice(0, 10).replace(/-/g, '')}${String(16 + i).pad_start(3, '0')}`;
    
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
          quantity: 1
        });
        
        // 收集图片
        if (purchase.photos) {
          try {
            const photoArray = JSON.parse(purchase.photos);
            combinedPhotos.push(...photoArray);
          } catch (e) {
            // 如果photos不是JSON格式，直接作为字符串处理
            if (typeof purchase.photos === 'string') {
              combinedPhotos.push(purchase.photos);
            }
          }
        }
        
        // 计算材料成本
        const cost = purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'BRACELET'
          ? (purchase.price_per_bead || 0.2) * 10
          : (purchase.pricePerPiece || 1.0) * 1;
        totalMaterialCost += cost;
      }
    }
    
    const material_signature_hash = Buffer.from(JSON.stringify(materialSignature)).to_string('base64').slice(0, 32);
    
    // 计算成本和价格
    const labor_cost = 8.0; // 组合SKU人工成本更高
    const craft_cost = 5.0; // 工艺成本更高
    const total_cost = totalMaterialCost + laborCost + craftCost;
    const selling_price = totalCost * 1.6; // 60%利润率
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
    const specification = '混合材质，精工制作';
    
    await connection.execute(sql, [
      id, sku_code, combo.name, material_signature_hash, JSON.stringify(materialSignature),
      sellingPrice, sellingPrice, JSON.stringify(uniquePhotos), combo.description, specification,
      totalMaterialCost, labor_cost, craft_cost, totalCost, selling_price,
      profit_margin, userId
    ]);
    
    console.log(`✅ 创建组合SKU: ${combo.name} (${ sku_code })`);
  }
}

// 执行重新设计
redesignVirtualData().catch(console.error);