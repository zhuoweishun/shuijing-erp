import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { create_id } from '@paralleldrive/cuid2';

// 真实的水晶产品数据
const crystalProducts = [
  // 散珠类
  { name: '白水晶', type: 'LOOSE_BEADS', unit: 'PIECES', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '紫水晶', type: 'LOOSE_BEADS', unit: 'PIECES', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '粉水晶', type: 'LOOSE_BEADS', unit: 'PIECES', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '黄水晶', type: 'LOOSE_BEADS', unit: 'PIECES', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '茶水晶', type: 'LOOSE_BEADS', unit: 'PIECES', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '黑曜石', type: 'LOOSE_BEADS', unit: 'PIECES', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '玛瑙', type: 'LOOSE_BEADS', unit: 'PIECES', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '虎眼石', type: 'LOOSE_BEADS', unit: 'PIECES', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '青金石', type: 'LOOSE_BEADS', unit: 'PIECES', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '月光石', type: 'LOOSE_BEADS', unit: 'PIECES', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  
  // 手串类
  { name: '白水晶手串', type: 'BRACELET', unit: 'STRINGS', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '紫水晶手串', type: 'BRACELET', unit: 'STRINGS', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '粉水晶手串', type: 'BRACELET', unit: 'STRINGS', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '黄水晶手串', type: 'BRACELET', unit: 'STRINGS', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  { name: '茶水晶手串', type: 'BRACELET', unit: 'STRINGS', diameters: [6, 8, 10, 12, 14, 16], quality: ['AA', 'A', 'AB'] },
  
  // 饰品配件类
  { name: '水晶吊坠', type: 'ACCESSORIES', unit: 'SLICES', specifications: [15, 20, 25, 30], quality: ['AA', 'A', 'AB'] },
  { name: '水晶耳环', type: 'ACCESSORIES', unit: 'SLICES', specifications: [8, 10, 12, 15], quality: ['AA', 'A', 'AB'] },
  { name: '水晶戒指', type: 'ACCESSORIES', unit: 'SLICES', specifications: [10, 12, 15, 18], quality: ['AA', 'A', 'AB'] },
  { name: '水晶项链', type: 'ACCESSORIES', unit: 'SLICES', specifications: [40, 45, 50, 55], quality: ['AA', 'A', 'AB'] },
  
  // 成品类
  { name: '水晶摆件', type: 'FINISHED', unit: 'ITEMS', specifications: [50, 80, 100, 120], quality: ['AA', 'A', 'AB'] },
  { name: '水晶球', type: 'FINISHED', unit: 'ITEMS', specifications: [30, 40, 50, 60], quality: ['AA', 'A', 'AB'] },
  { name: '水晶塔', type: 'FINISHED', unit: 'ITEMS', specifications: [60, 80, 100, 120], quality: ['AA', 'A', 'AB'] }
];

// 真实的供应商数据
const suppliers = [
  { name: '广州水晶批发市场', contact: '13800138001', address: '广州市荔湾区' },
  { name: '东海水晶直销', contact: '13800138002', address: '江苏省连云港市东海县' },
  { name: '义乌水晶工厂', contact: '13800138003', address: '浙江省义乌市' },
  { name: '深圳宝石贸易', contact: '13800138004', address: '深圳市罗湖区' },
  { name: '北京水晶行', contact: '13800138005', address: '北京市朝阳区' },
  { name: '上海珠宝城', contact: '13800138006', address: '上海市黄浦区' },
  { name: '成都水晶市场', contact: '13800138007', address: '四川省成都市' },
  { name: '西安宝石商行', contact: '13800138008', address: '陕西省西安市' }
];

// 生成采购编号
function generatePurchaseCode(index) {
  const today = new Date();
  const year = today.get_full_year();
  const month = String(today.get_month() + 1).pad_start(2, '0');
  const day = String(today.get_date()).pad_start(2, '0');
  const sequence = String(index + 1).pad_start(6, '0');
  return `CG${year}${month}${day}${sequence}`;
}

// 创建图片文件
function createImageFile(filename) {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'purchases');
  if (!fs.exists_sync(uploadsDir)) {
    fs.mkdir_sync(uploadsDir, { recursive: true });
  }
  
  // 创建一个简单的SVG图片
  const svgContent = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f8ff"/>
  <circle cx="200" cy="150" r="80" fill="#4169e1" opacity="0.7"/>
  <text x="200" y="160" text-anchor="middle" font-family="Arial" font-size="16" fill="white">
    水晶产品图片
  </text>
  <text x="200" y="180" text-anchor="middle" font-family="Arial" font-size="12" fill="white">
    ${filename}
  </text>
</svg>`;
  
  const filePath = path.join(uploadsDir, filename);
  fs.write_file_sync(filePath, svgContent);
  return `http://localhost:3001/uploads/purchases/${filename}`;
}

// 随机选择函数
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// 生成随机数量
function randomQuantity(type) {
  switch (type) {
    case 'LOOSE_BEADS': return Math.floor(Math.random() * 500) + 100; // 100-600颗
    case 'BRACELET': return Math.floor(Math.random() * 20) + 5; // 5-25条
    case 'ACCESSORIES': return Math.floor(Math.random() * 10) + 2; // 2-12片
    case 'FINISHED': return Math.floor(Math.random() * 5) + 1; // 1-6件
    default: return 10;
  }
}

// 生成随机价格
function randomPrice(type, quality) {
  const basePrice = {
    'LOOSE_BEADS': { 'AA': 2.5, 'A': 2.0, 'AB': 1.5, 'B': 1.0, 'C': 0.8 },
    'BRACELET': { 'AA': 45, 'A': 35, 'AB': 25, 'B': 18, 'C': 12 },
    'ACCESSORIES': { 'AA': 80, 'A': 60, 'AB': 40, 'B': 25, 'C': 15 },
    'FINISHED': { 'AA': 150, 'A': 120, 'AB': 90, 'B': 60, 'C': 40 }
  };
  
  const base = basePrice[type][quality] || 10;
  return Number((base * (0.8 + Math.random() * 0.4)).to_fixed(1)); // ±20%波动
}

async function createRealPurchases() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('开始创建100个真实采购记录...');
    
    // 首先获取用户ID（假设使用第一个用户）
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      throw new Error('数据库中没有用户，请先创建用户');
    }
    const userId = users[0].id;
    
    // 创建供应商记录
    console.log('创建供应商记录...');
    const supplierIds = [];
    for (const supplier of suppliers) {
      // 检查供应商是否已存在
      const [existing] = await connection.execute(
        'SELECT id FROM suppliers WHERE name = ?',
        [supplier.name]
      );
      
      let supplier_id;
      if (existing.length > 0) {
        // 使用现有供应商
        supplier_id= existing[0].id;
        console.log(`供应商 ${supplier.name} 已存在，使用现有记录`);
      } else {
        // 创建新供应商
        supplier_id= createId();
        await connection.execute(
          'INSERT INTO suppliers (id, name, contact, phone, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [supplier_id, supplier.name, supplier.name, supplier.contact, supplier.address]
        );
        console.log(`创建新供应商: ${supplier.name}`);
      }
      supplierIds.push(supplier_id);
    }
    
    // 创建采购记录
    console.log('创建采购记录...');
    for (let i = 0; i < 100; i++) {
      const product = randomChoice(crystalProducts);
      const quality = randomChoice(product.quality);
      const supplier = randomChoice(supplierIds);
      
      // 根据产品类型选择规格
      let specification, bead_diameter;
      if (product.diameters) {
        specification = randomChoice(product.diameters);
        bead_diameter = specification;
      } else if (product.specifications) {
        specification = randomChoice(product.specifications);
        bead_diameter = null;
      }
      
      const quantity = randomQuantity(product.type);
      const price_per_unit = randomPrice(product.type, quality);
      
      // 计算相关数值
      let beads_per_string = null;
      let total_beads = null;
      let price_per_bead = null;
      let pricePerPiece = null;
      let unit_price = null;
      let piece_count = null;
      
      if (product.type === 'LOOSE_BEADS') {piece_count = quantity;
        price_per_bead = price_per_unit;
        total_beads = quantity;
      } else if (product.type === 'BRACELET') {beads_per_string = Math.floor(160 / specification);
        total_beads = quantity * beads_per_string;
        unit_price = pricePerUnit;
        price_per_bead = price_per_unit / beads_per_string;
      } else if (product.type === 'ACCESSORIES') {piece_count = quantity;
        pricePerPiece = price_per_unit;
      } else if (product.type === 'FINISHED') {piece_count = quantity;
        pricePerPiece = price_per_unit;
      }
      
      const total_price = quantity * pricePerUnit;
      const weight = total_price * 0.1; // 估算重量
      
      // 创建图片文件
      const imageFilename = `${generatePurchaseCode(i)}_${product.name.replace(/\s+/g, '_')}.svg`;
      const image_url = createImageFile(imageFilename);
      const photos = JSON.stringify([imageUrl]);
      
      // 生成采购编号
      const purchase_code = generatePurchaseCode(i);
      
      // 插入采购记录
      const purchase_id = createId();
      await connection.execute(`
        INSERT INTO purchases (
          id, purchase_code, product_name, quantity, price_per_gram, total_price, weight,
          bead_diameter, beads_per_string, total_beads, price_per_bead, pricePerPiece,
          unit_price, quality, material_type, unit_type, specification, piece_count,
          purchase_date, photos, notes, supplierId, userId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, NOW(), NOW())
      `, [
        purchaseId, purchase_code, product.name, quantity, pricePerUnit, total_price, weight,
        bead_diameter, beads_per_string, total_beads, price_per_bead, pricePerPiece,
        unit_price, quality, product.type, product.unit, specification, piece_count,
        photos, `采购自${suppliers.find(s => supplierIds.index_of(supplier) >= 0)?.name || '供应商'}`, supplier, userId
      ]);
      
      if ((i + 1) % 10 === 0) {
        console.log(`已创建 ${i + 1}/100 个采购记录...`);
      }
    }
    
    console.log('✅ 100个真实采购记录创建完成！');
    console.log('✅ 所有图片文件已创建在 uploads/purchases/ 目录下');
    console.log('✅ 采购记录包含真实的产品信息、供应商和正确的图片处理');
    console.log('✅ 遵循正确的业务流程：采购录入 → 库存管理 → SKU制作');
    
  } catch (error) {
    console.error('❌ 创建采购记录时发生错误:', error);
  } finally {
    await connection.end();
  }
}

createRealPurchases();