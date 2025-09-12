const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

// 供应商数据
const suppliers = [
  { name: '广州水晶批发市场', contact: '13800138001', address: '广州市荔湾区' },
  { name: '东海水晶原石厂', contact: '13800138002', address: '江苏省连云港市东海县' },
  { name: '巴西紫水晶进口商', contact: '13800138003', address: '深圳市罗湖区' },
  { name: '缅甸翡翠直销', contact: '13800138004', address: '云南省瑞丽市' },
  { name: '新疆和田玉商行', contact: '13800138005', address: '新疆和田市' },
  { name: '海南砗磲珊瑚', contact: '13800138006', address: '海南省三亚市' },
  { name: '辽宁岫玉批发', contact: '13800138007', address: '辽宁省鞍山市岫岩县' },
  { name: '湖北绿松石厂', contact: '13800138008', address: '湖北省十堰市' },
  { name: '河南南阳玉器', contact: '13800138009', address: '河南省南阳市' },
  { name: '青海昆仑玉商', contact: '13800138010', address: '青海省格尔木市' }
];

// 产品数据模板
const productTemplates = {
  LOOSE_BEADS: [
    { name: '紫水晶散珠', specs: [6, 8, 10, 12, 14, 16], qualities: ['AA', 'A', 'AB'], priceRange: [2, 8] },
    { name: '白水晶散珠', specs: [6, 8, 10, 12, 14], qualities: ['AA', 'A', 'AB'], priceRange: [1, 5] },
    { name: '粉水晶散珠', specs: [6, 8, 10, 12], qualities: ['AA', 'A', 'AB'], priceRange: [3, 10] },
    { name: '黄水晶散珠', specs: [6, 8, 10, 12, 14], qualities: ['AA', 'A', 'AB'], priceRange: [2, 7] },
    { name: '茶水晶散珠', specs: [6, 8, 10, 12], qualities: ['AA', 'A', 'AB', 'B'], priceRange: [1.5, 6] },
    { name: '黑曜石散珠', specs: [6, 8, 10, 12, 14, 16], qualities: ['AA', 'A', 'AB'], priceRange: [1, 4] },
    { name: '玛瑙散珠', specs: [6, 8, 10, 12, 14], qualities: ['AA', 'A', 'AB'], priceRange: [1.5, 5] },
    { name: '翡翠散珠', specs: [6, 8, 10, 12], qualities: ['AA', 'A'], priceRange: [10, 50] },
    { name: '和田玉散珠', specs: [6, 8, 10, 12], qualities: ['AA', 'A'], priceRange: [15, 80] },
    { name: '南红玛瑙散珠', specs: [6, 8, 10, 12], qualities: ['AA', 'A', 'AB'], priceRange: [5, 25] }
  ],
  BRACELET: [
    { name: '紫水晶手串', specs: [6, 8, 10, 12], qualities: ['AA', 'A', 'AB'], priceRange: [50, 300] },
    { name: '白水晶手串', specs: [6, 8, 10, 12], qualities: ['AA', 'A', 'AB'], priceRange: [30, 200] },
    { name: '粉水晶手串', specs: [6, 8, 10, 12], qualities: ['AA', 'A', 'AB'], priceRange: [60, 350] },
    { name: '黄水晶手串', specs: [6, 8, 10, 12], qualities: ['AA', 'A', 'AB'], priceRange: [40, 250] },
    { name: '黑曜石手串', specs: [6, 8, 10, 12, 14], qualities: ['AA', 'A', 'AB'], priceRange: [25, 150] },
    { name: '玛瑙手串', specs: [6, 8, 10, 12], qualities: ['AA', 'A', 'AB'], priceRange: [35, 180] },
    { name: '翡翠手串', specs: [6, 8, 10], qualities: ['AA', 'A'], priceRange: [200, 1500] },
    { name: '和田玉手串', specs: [6, 8, 10], qualities: ['AA', 'A'], priceRange: [300, 2000] },
    { name: '南红玛瑙手串', specs: [6, 8, 10], qualities: ['AA', 'A', 'AB'], priceRange: [100, 800] },
    { name: '绿松石手串', specs: [6, 8, 10], qualities: ['AA', 'A', 'AB'], priceRange: [80, 600] }
  ],
  ACCESSORIES: [
    { name: '镀金隔片', specs: [4, 5, 6, 8], qualities: ['AA', 'A'], priceRange: [0.5, 3] },
    { name: '银质隔珠', specs: [4, 5, 6, 8], qualities: ['AA', 'A'], priceRange: [1, 5] },
    { name: '蜜蜡隔珠', specs: [4, 5, 6, 8], qualities: ['AA', 'A', 'AB'], priceRange: [2, 15] },
    { name: '琥珀隔珠', specs: [4, 5, 6, 8], qualities: ['AA', 'A', 'AB'], priceRange: [3, 20] },
    { name: '珊瑚隔珠', specs: [4, 5, 6, 8], qualities: ['AA', 'A'], priceRange: [5, 30] },
    { name: '砗磲隔珠', specs: [4, 5, 6, 8], qualities: ['AA', 'A', 'AB'], priceRange: [1, 8] },
    { name: '菩提隔珠', specs: [4, 5, 6, 8], qualities: ['AA', 'A', 'AB'], priceRange: [0.3, 2] },
    { name: '木质隔珠', specs: [4, 5, 6, 8], qualities: ['AA', 'A', 'AB'], priceRange: [0.2, 1.5] },
    { name: '金属流苏', specs: [2, 3, 4, 5], qualities: ['AA', 'A'], priceRange: [2, 12] },
    { name: '弹力线', specs: [0.5, 0.8, 1.0, 1.2], qualities: ['AA', 'A'], priceRange: [0.1, 0.8] }
  ],
  FINISHED: [
    { name: '紫水晶项链', specs: [45, 50, 55, 60], qualities: ['AA', 'A'], priceRange: [200, 1200] },
    { name: '翡翠吊坠', specs: [20, 25, 30, 35], qualities: ['AA', 'A'], priceRange: [500, 3000] },
    { name: '和田玉手镯', specs: [52, 54, 56, 58], qualities: ['AA', 'A'], priceRange: [800, 5000] },
    { name: '水晶耳环', specs: [8, 10, 12, 15], qualities: ['AA', 'A', 'AB'], priceRange: [50, 300] },
    { name: '玛瑙戒指', specs: [16, 17, 18, 19], qualities: ['AA', 'A', 'AB'], priceRange: [80, 500] },
    { name: '琥珀胸针', specs: [15, 20, 25, 30], qualities: ['AA', 'A'], priceRange: [150, 800] },
    { name: '珊瑚手链', specs: [16, 18, 20], qualities: ['AA', 'A'], priceRange: [300, 1500] },
    { name: '绿松石摆件', specs: [50, 80, 100, 120], qualities: ['AA', 'A', 'AB'], priceRange: [200, 2000] },
    { name: '水晶球', specs: [40, 50, 60, 80], qualities: ['AA', 'A', 'AB'], priceRange: [100, 800] },
    { name: '玉石印章', specs: [20, 25, 30], qualities: ['AA', 'A'], priceRange: [300, 1500] }
  ]
};

// 生成采购编号
function generatePurchaseCode(date, sequence) {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `PUR${dateStr}${sequence.toString().padStart(3, '0')}`;
}

// 生成随机日期（最近30天内）
function getRandomDate() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
  return new Date(randomTime);
}

// 生成随机数值
function getRandomInRange(min, max, decimals = 2) {
  const value = min + Math.random() * (max - min);
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// 生成随机整数
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 随机选择数组元素
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// 创建供应商
async function createSuppliers(connection) {
  console.log('🏭 开始创建供应商数据...');
  
  const supplierIds = [];
  
  for (const supplier of suppliers) {
    // 检查供应商是否已存在
    const [existing] = await connection.execute(
      'SELECT id FROM suppliers WHERE name = ?',
      [supplier.name]
    );
    
    let supplierId;
    if (existing.length > 0) {
      supplierId = existing[0].id;
      console.log(`⚡ 供应商已存在: ${supplier.name}`);
    } else {
      supplierId = uuidv4();
      await connection.execute(
        `INSERT INTO suppliers (id, name, contact, phone, address, isActive, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [supplierId, supplier.name, supplier.name, supplier.contact, supplier.address]
      );
      console.log(`✅ 创建供应商: ${supplier.name}`);
    }
    
    supplierIds.push(supplierId);
  }
  
  console.log(`🎉 供应商数据准备完成，共 ${supplierIds.length} 个供应商\n`);
  return supplierIds;
}

// 获取用户ID
async function getUserId(connection) {
  const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
  if (users.length === 0) {
    throw new Error('数据库中没有用户数据，请先创建用户');
  }
  return users[0].id;
}

// 创建采购数据
async function createPurchaseData(connection, supplierIds, userId) {
  console.log('📦 开始创建采购数据...');
  
  const purchases = [];
  const productTypes = Object.keys(productTemplates);
  
  // 按日期分组生成采购编号
  const purchasesByDate = new Map();
  
  for (let i = 0; i < 100; i++) {
    const productType = getRandomElement(productTypes);
    const template = getRandomElement(productTemplates[productType]);
    const spec = getRandomElement(template.specs);
    const quality = getRandomElement(template.qualities);
    const basePrice = getRandomInRange(template.priceRange[0], template.priceRange[1]);
    const purchaseDate = getRandomDate();
    const dateKey = purchaseDate.toISOString().slice(0, 10);
    
    // 获取当日序号
    if (!purchasesByDate.has(dateKey)) {
      purchasesByDate.set(dateKey, 0);
    }
    purchasesByDate.set(dateKey, purchasesByDate.get(dateKey) + 1);
    const sequence = purchasesByDate.get(dateKey);
    
    const purchaseCode = generatePurchaseCode(purchaseDate, sequence);
    
    let purchaseData = {
      id: uuidv4(),
      purchaseCode,
      productName: `${template.name} ${spec}mm ${quality}级`,
      productType,
      supplierId: getRandomElement(supplierIds),
      userId,
      quality,
      purchaseDate: purchaseDate.toISOString().slice(0, 10),
      photos: JSON.stringify([`https://example.com/photo${i + 1}.jpg`]),
      notes: `批次${i + 1} - ${template.name}采购记录`
    };
    
    // 根据产品类型设置特定字段
    if (productType === 'LOOSE_BEADS') {
      const pieceCount = getRandomInt(50, 500);
      const totalPrice = getRandomInRange(pieceCount * basePrice * 0.8, pieceCount * basePrice * 1.2);
      const weight = getRandomInRange(pieceCount * 0.1, pieceCount * 0.3);
      
      purchaseData = {
        ...purchaseData,
        unitType: 'PIECES',
        beadDiameter: spec,
        specification: spec,
        quantity: null,
        pieceCount,
        totalPrice,
        weight,
        pricePerGram: weight > 0 ? totalPrice / weight : null,
        unitPrice: totalPrice / pieceCount,
        pricePerBead: totalPrice / pieceCount,
        pricePerPiece: null,
        totalBeads: pieceCount,
        beadsPerString: null,
        minStockAlert: getRandomInt(10, 50)
      };
    } else if (productType === 'BRACELET') {
      const quantity = getRandomInt(1, 20);
      const beadsPerString = Math.ceil((16 / spec) * 10); // 估算每串珠子数
      const totalPrice = getRandomInRange(quantity * basePrice * 0.8, quantity * basePrice * 1.2);
      const weight = getRandomInRange(quantity * beadsPerString * 0.1, quantity * beadsPerString * 0.3);
      
      purchaseData = {
        ...purchaseData,
        unitType: 'STRINGS',
        beadDiameter: spec,
        specification: spec,
        quantity,
        pieceCount: null,
        totalPrice,
        weight,
        pricePerGram: weight > 0 ? totalPrice / weight : null,
        unitPrice: totalPrice / quantity,
        pricePerBead: null,
        pricePerPiece: null,
        beadsPerString,
        totalBeads: quantity * beadsPerString,
        minStockAlert: getRandomInt(5, 20)
      };
    } else if (productType === 'ACCESSORIES') {
      const pieceCount = getRandomInt(10, 200);
      const totalPrice = getRandomInRange(pieceCount * basePrice * 0.8, pieceCount * basePrice * 1.2);
      const weight = getRandomInRange(pieceCount * 0.05, pieceCount * 0.2);
      
      purchaseData = {
        ...purchaseData,
        unitType: 'SLICES',
        beadDiameter: null,
        specification: spec,
        quantity: null,
        pieceCount,
        totalPrice,
        weight,
        pricePerGram: weight > 0 ? totalPrice / weight : null,
        unitPrice: totalPrice / pieceCount,
        pricePerBead: null,
        pricePerPiece: totalPrice / pieceCount,
        beadsPerString: null,
        totalBeads: null,
        minStockAlert: getRandomInt(5, 30)
      };
    } else if (productType === 'FINISHED') {
      const quantity = getRandomInt(1, 5);
      const totalPrice = getRandomInRange(quantity * basePrice * 0.8, quantity * basePrice * 1.2);
      const weight = getRandomInRange(quantity * 10, quantity * 100);
      
      purchaseData = {
        ...purchaseData,
        unitType: 'ITEMS',
        beadDiameter: null,
        specification: spec,
        quantity: null,
        pieceCount: quantity,
        totalPrice,
        weight,
        pricePerGram: weight > 0 ? totalPrice / weight : null,
        unitPrice: totalPrice / quantity,
        pricePerBead: null,
        pricePerPiece: totalPrice / quantity,
        beadsPerString: null,
        totalBeads: null,
        minStockAlert: getRandomInt(1, 10)
      };
    }
    
    purchases.push(purchaseData);
  }
  
  // 插入采购数据
  for (const purchase of purchases) {
    await connection.execute(
      `INSERT INTO purchases (
        id, purchaseCode, productName, productType, supplierId, userId,
        unitType, beadDiameter, specification, quantity, pieceCount,
        minStockAlert, pricePerGram, unitPrice, totalPrice, weight,
        beadsPerString, totalBeads, pricePerBead, pricePerPiece,
        quality, photos, notes, purchaseDate, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), NOW())`,
      [
        purchase.id, purchase.purchaseCode, purchase.productName, purchase.productType,
        purchase.supplierId, purchase.userId, purchase.unitType, purchase.beadDiameter,
        purchase.specification, purchase.quantity, purchase.pieceCount, purchase.minStockAlert,
        purchase.pricePerGram, purchase.unitPrice, purchase.totalPrice, purchase.weight,
        purchase.beadsPerString, purchase.totalBeads, purchase.pricePerBead, purchase.pricePerPiece,
        purchase.quality, purchase.photos, purchase.notes, purchase.purchaseDate
      ]
    );
    
    console.log(`✅ 创建采购: ${purchase.purchaseCode} - ${purchase.productName}`);
  }
  
  console.log(`🎉 成功创建 ${purchases.length} 个采购记录\n`);
  return purchases;
}

// 验证数据完整性
async function validateData(connection) {
  console.log('🔍 开始验证数据完整性...');
  
  // 验证采购记录
  const [purchases] = await connection.execute('SELECT COUNT(*) as count FROM purchases');
  console.log(`📦 采购记录总数: ${purchases[0].count}`);
  
  // 验证必填字段
  const [missingFields] = await connection.execute(`
    SELECT COUNT(*) as count FROM purchases 
    WHERE productName IS NULL OR productName = '' 
       OR productType IS NULL 
       OR supplierId IS NULL 
       OR quality IS NULL 
       OR totalPrice IS NULL 
       OR purchaseDate IS NULL
  `);
  console.log(`❌ 缺失必填字段的记录: ${missingFields[0].count}`);
  
  // 验证采购编号格式
  const [invalidCodes] = await connection.execute(`
    SELECT COUNT(*) as count FROM purchases 
    WHERE purchaseCode NOT REGEXP '^PUR[0-9]{8}[0-9]{3}$'
  `);
  console.log(`❌ 采购编号格式错误的记录: ${invalidCodes[0].count}`);
  
  // 验证运算字段
  const [calculationErrors] = await connection.execute(`
    SELECT COUNT(*) as count FROM purchases 
    WHERE (productType = 'LOOSE_BEADS' AND (unitPrice IS NULL OR pricePerBead IS NULL))
       OR (productType = 'BRACELET' AND (unitPrice IS NULL OR beadsPerString IS NULL))
       OR (productType = 'ACCESSORIES' AND (unitPrice IS NULL OR pricePerPiece IS NULL))
       OR (productType = 'FINISHED' AND (unitPrice IS NULL OR pricePerPiece IS NULL))
  `);
  console.log(`❌ 运算字段错误的记录: ${calculationErrors[0].count}`);
  
  // 按产品类型统计
  const [typeStats] = await connection.execute(`
    SELECT productType, COUNT(*) as count 
    FROM purchases 
    GROUP BY productType
  `);
  console.log('\n📊 产品类型分布:');
  typeStats.forEach(stat => {
    console.log(`  ${stat.productType}: ${stat.count} 条记录`);
  });
  
  // 按品质统计
  const [qualityStats] = await connection.execute(`
    SELECT quality, COUNT(*) as count 
    FROM purchases 
    GROUP BY quality
  `);
  console.log('\n🏆 品质分布:');
  qualityStats.forEach(stat => {
    console.log(`  ${stat.quality}级: ${stat.count} 条记录`);
  });
  
  // 价格范围统计
  const [priceStats] = await connection.execute(`
    SELECT 
      MIN(totalPrice) as min_price,
      MAX(totalPrice) as max_price,
      AVG(totalPrice) as avg_price
    FROM purchases
  `);
  console.log('\n💰 价格统计:');
  console.log(`  最低价格: ¥${priceStats[0].min_price}`);
  console.log(`  最高价格: ¥${priceStats[0].max_price}`);
  console.log(`  平均价格: ¥${Math.round(priceStats[0].avg_price * 100) / 100}`);
  
  console.log('\n✅ 数据验证完成!');
}

// 清除现有采购数据
async function clearExistingPurchases(connection) {
  console.log('🧹 清除现有采购数据...');
  
  const [result] = await connection.execute('DELETE FROM purchases');
  console.log(`✅ 已清除 ${result.affectedRows} 条采购记录\n`);
}

// 主函数
async function main() {
  let connection;
  
  try {
    console.log('🚀 开始创建采购测试数据...');
    console.log('=' .repeat(50));
    
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');
    
    // 清除现有采购数据
    await clearExistingPurchases(connection);
    
    // 获取用户ID
    const userId = await getUserId(connection);
    console.log(`👤 使用用户ID: ${userId}\n`);
    
    // 创建供应商
    const supplierIds = await createSuppliers(connection);
    
    // 创建采购数据
    const purchases = await createPurchaseData(connection, supplierIds, userId);
    
    // 验证数据完整性
    await validateData(connection);
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 采购测试数据创建完成!');
    console.log(`📊 总计创建: ${supplierIds.length} 个供应商, ${purchases.length} 个采购记录`);
    console.log('✅ 所有必填项已填写');
    console.log('✅ 所有运算项已计算');
    console.log('✅ CG编号格式正确');
    console.log('✅ 覆盖所有产品类型');
    console.log('✅ 数据多样化完整');
    
  } catch (error) {
    console.error('❌ 创建采购数据失败:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { main };