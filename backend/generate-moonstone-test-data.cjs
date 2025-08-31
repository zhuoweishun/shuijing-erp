const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 生成随机日期（最近30天内）
function getRandomDate() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
  return new Date(randomTime);
}

// 生成随机采购编号
function generatePurchaseNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CG${year}${month}${day}${random}`;
}

// 生成随机图片URL
function getRandomImageUrl() {
  const imageIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const randomId = imageIds[Math.floor(Math.random() * imageIds.length)];
  return `https://picsum.photos/400/300?random=${randomId}`;
}

// 月光石手串测试数据
const moonstoneData = [
  // 2个AA级相同尺寸(8mm)
  {
    name: '月光石手串',
    category: 'BRACELET',
    material: '月光石',
    color: '白色',
    size: '8mm',
    grade: 'AA',
    weight: 15.5,
    piece_count: 1,
    beads_per_string: 22,
    total_price: 580,
    pricePerGram: 37.42,
    notes: 'AA级月光石，光泽度佳，蓝光明显'
  },
  {
    name: '月光石手串',
    category: 'BRACELET',
    material: '月光石',
    color: '白色',
    size: '8mm',
    grade: 'AA',
    weight: 16.2,
    piece_count: 1,
    beads_per_string: 22,
    total_price: 605,
    pricePerGram: 37.35,
    notes: 'AA级月光石，品质优良，蓝光效果好'
  },
  // 1个没有填写品相(10mm)
  {
    name: '月光石手串',
    category: 'BRACELET',
    material: '月光石',
    color: '白色',
    size: '10mm',
    grade: null,
    weight: 22.8,
    piece_count: 1,
    beads_per_string: 18,
    total_price: 720,
    pricePerGram: 31.58,
    notes: '10mm月光石手串，品相待评估'
  },
  // 2个AB级不同尺寸
  {
    name: '月光石手串',
    category: 'BRACELET',
    material: '月光石',
    color: '白色',
    size: '6mm',
    grade: 'AB',
    weight: 12.3,
    piece_count: 1,
    beads_per_string: 28,
    total_price: 420,
    pricePerGram: 34.15,
    notes: 'AB级月光石，6mm小珠，适合叠戴'
  },
  {
    name: '月光石手串',
    category: 'BRACELET',
    material: '月光石',
    color: '白色',
    size: '12mm',
    grade: 'AB',
    weight: 28.5,
    piece_count: 1,
    beads_per_string: 15,
    total_price: 950,
    pricePerGram: 33.33,
    notes: 'AB级月光石，12mm大珠，霸气款式'
  },
  // 其他5个不同批次
  {
    name: '月光石手串',
    category: 'BRACELET',
    material: '月光石',
    color: '灰白色',
    size: '9mm',
    grade: 'A',
    weight: 18.7,
    piece_count: 1,
    beads_per_string: 20,
    total_price: 560,
    pricePerGram: 29.95,
    notes: 'A级月光石，灰白色调，自然美感'
  },
  {
    name: '月光石手串',
    category: 'BRACELET',
    material: '月光石',
    color: '奶白色',
    size: '7mm',
    grade: 'AA',
    weight: 14.2,
    piece_count: 1,
    beads_per_string: 24,
    total_price: 680,
    pricePerGram: 47.89,
    notes: 'AA级月光石，奶白色，极品品质'
  },
  {
    name: '月光石手串',
    category: 'BRACELET',
    material: '月光石',
    color: '白色',
    size: '8.5mm',
    grade: 'AA',
    weight: 17.1,
    piece_count: 1,
    beads_per_string: 21,
    total_price: 650,
    pricePerGram: 38.01,
    notes: 'AA级月光石，蓝光强烈，收藏级'
  },
  {
    name: '月光石手串',
    category: 'BRACELET',
    material: '月光石',
    color: '透白色',
    size: '11mm',
    grade: 'A',
    weight: 25.6,
    piece_count: 1,
    beads_per_string: 16,
    total_price: 820,
    pricePerGram: 32.03,
    notes: 'A级月光石，透白色，通透度好'
  },
  {
    name: '月光石手串',
    category: 'BRACELET',
    material: '月光石',
    color: '白色',
    size: '9.5mm',
    grade: 'AB',
    weight: 20.3,
    piece_count: 1,
    beads_per_string: 19,
    total_price: 710,
    pricePerGram: 34.98,
    notes: 'AB级月光石，性价比高，适合日常佩戴'
  }
];

async function generateMoonstoneTestData() {
  try {
    console.log('开始生成月光石手串测试数据...');
    
    // 获取第一个用户
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error('数据库中没有用户数据，请先创建用户');
    }
    console.log(`使用用户: ${user.name} (ID: ${user.id})`);
    
    // 获取所有供应商
    const suppliers = await prisma.supplier.findMany();
    if (suppliers.length === 0) {
      throw new Error('数据库中没有供应商数据，请先创建供应商');
    }
    
    console.log(`找到 ${suppliers.length} 个供应商`);
    
    // 随机选择5个供应商
    const selectedSuppliers = [];
    const suppliersCopy = [...suppliers];
    for (let i = 0; i < Math.min(5, suppliers.length); i++) {
      const randomIndex = Math.floor(Math.random() * suppliersCopy.length);
      selectedSuppliers.push(suppliersCopy.splice(randomIndex, 1)[0]);
    }
    
    console.log(`选择了 ${selectedSuppliers.length} 个供应商:`);
    selectedSuppliers.forEach(supplier => {
      console.log(`- ${supplier.name} (ID: ${supplier.id})`);
    });
    
    // 生成采购数据
    const createdPurchases = [];
    
    for (let i = 0; i < moonstoneData.length; i++) {
      const data = moonstoneData[i];
      const supplier = selectedSuppliers[i % selectedSuppliers.length];
      
      // 计算总颗数
      const totalBeads = data.piece_count * data.beads_per_string;
      
      // 计算单颗价格
      const pricePerBead = data.total_price / totalBeads;
      
      const purchaseData = {
        purchaseCode: generatePurchaseNumber(),
        supplierId: supplier.id,
        userId: user.id,
        productName: data.name,
        productType: data.category,
        beadDiameter: parseFloat(data.size.replace('mm', '')),
        quality: data.grade,
        weight: data.weight,
        unitType: 'STRINGS',
        quantity: data.piece_count,
        beadsPerString: data.beads_per_string,
        totalBeads: totalBeads,
        totalPrice: data.total_price,
        pricePerGram: data.pricePerGram,
        pricePerBead: pricePerBead,
        purchaseDate: getRandomDate(),
        notes: data.notes,
        photos: [getRandomImageUrl()]
      };
      
      console.log(`\n创建第 ${i + 1} 个月光石手串:`);
      console.log(`- 名称: ${purchaseData.product_name}`);
      console.log(`- 尺寸: ${purchaseData.size}`);
      console.log(`- 品相: ${purchaseData.grade || '未填写'}`);
      console.log(`- 供应商: ${supplier.name}`);
      console.log(`- 总价: ${purchaseData.total_price}元`);
      console.log(`- 总颗数: ${purchaseData.totalBeads}颗`);
      console.log(`- 单颗价格: ${pricePerBead.toFixed(2)}元`);
      
      const purchase = await prisma.purchase.create({
        data: purchaseData
      });
      
      createdPurchases.push(purchase);
      console.log(`✓ 创建成功 (ID: ${purchase.id})`);
    }
    
    console.log(`\n\n=== 数据生成完成 ===`);
    console.log(`总共创建了 ${createdPurchases.length} 个月光石手串采购记录`);
    
    // 验证数据
    console.log('\n=== 数据验证 ===');
    const moonstonePurchases = await prisma.purchase.findMany({
      where: {
        productName: '月光石手串',
        productType: 'BRACELET'
      },
      include: {
        supplier: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`\n数据库中最新的 ${moonstonePurchases.length} 个月光石手串:`);
    moonstonePurchases.forEach((purchase, index) => {
      console.log(`${index + 1}. ${purchase.product_name} - ${purchase.size} - ${purchase.grade || '无品相'} - 单颗价格: ${purchase.pricePerBead?.toFixed(2) || 'N/A'}元`);
    });
    
    console.log('\n✅ 月光石手串测试数据生成完成！');
    console.log('现在可以在前端库存页面查看价格显示是否正确。');
    
  } catch (error) {
    console.error('❌ 生成测试数据时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
generateMoonstoneTestData()
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });