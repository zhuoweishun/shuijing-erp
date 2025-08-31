const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// 10个供应商数据
const suppliers = [
  { name: '大宝珠宝', contact: '王大宝', phone: '13800138001', address: '广州市荔湾区华林玉器街' },
  { name: '丽人珠宝', contact: '李丽人', phone: '13800138002', address: '深圳市罗湖区水贝珠宝城' },
  { name: '阿月水晶', contact: '张阿月', phone: '13800138003', address: '东海县水晶城' },
  { name: '阿牛水晶', contact: '牛阿牛', phone: '13800138004', address: '东海县水晶批发市场' },
  { name: '市集淘货', contact: '陈淘货', phone: '13800138005', address: '义乌国际商贸城' },
  { name: '水晶之源', contact: '李水晶', phone: '13800138006', address: '连云港市东海县' },
  { name: '天然宝石', contact: '张天然', phone: '13800138007', address: '四川省甘孜州' },
  { name: '珠宝批发', contact: '王批发', phone: '13800138008', address: '广东省四会市' },
  { name: '东海水晶', contact: '陈东海', phone: '13800138009', address: '江苏省连云港市东海县' },
  { name: '义乌小商品', contact: '李义乌', phone: '13800138010', address: '浙江省义乌市国际商贸城' }
]

// 品相等级定义
const qualityLevels = ['AA', 'A', 'AB', 'B', 'C']

// 基础产品模板
const baseProducts = {
  LOOSE_BEADS: [
    { name: '紫水晶散珠', basePrice: 8.5, weightRange: [20, 35] },
    { name: '白发晶圆珠', basePrice: 45.0, weightRange: [25, 40] },
    { name: '草莓晶圆珠', basePrice: 18.0, weightRange: [15, 25] },
    { name: '青金石圆珠', basePrice: 28.0, weightRange: [20, 30] },
    { name: '月光石圆珠', basePrice: 42.0, weightRange: [18, 28] },
    { name: '黑曜石圆珠', basePrice: 12.0, weightRange: [22, 32] },
    { name: '玛瑙圆珠', basePrice: 15.0, weightRange: [25, 35] }
  ],
  BRACELET: [
    { name: '玻利维亚紫手串', basePrice: 25.0, weightRange: [15, 25] },
    { name: '银发晶手串', basePrice: 68.0, weightRange: [25, 40] },
    { name: '草莓晶手串', basePrice: 32.0, weightRange: [18, 28] },
    { name: '蓝晶手串', basePrice: 52.0, weightRange: [30, 45] },
    { name: '月光石手串', basePrice: 42.0, weightRange: [15, 22] },
    { name: '黑曜石手串', basePrice: 18.0, weightRange: [20, 30] },
    { name: '玛瑙手串', basePrice: 22.0, weightRange: [25, 35] }
  ],
  ACCESSORIES: [
    { name: '镀金隔片', basePrice: 15.0, weightRange: [1, 3] },
    { name: '银隔珠', basePrice: 25.0, weightRange: [1, 2] },
    { name: '金隔珠', basePrice: 85.0, weightRange: [1, 2] },
    { name: '南红隔珠', basePrice: 350.0, weightRange: [1, 2] },
    { name: '绿松石隔片', basePrice: 420.0, weightRange: [2, 4] },
    { name: '蜜蜡隔珠', basePrice: 180.0, weightRange: [1, 3] },
    { name: '和田玉隔片', basePrice: 280.0, weightRange: [2, 3] }
  ],
  FINISHED: [
    { name: '天然冰飘南红老型珠', basePrice: 1250.0, weightRange: [25, 35] },
    { name: '南红老型珠', basePrice: 850.0, weightRange: [15, 25] },
    { name: '天然绿松石雕件', basePrice: 680.0, weightRange: [30, 45] },
    { name: '精品蜜蜡雕件', basePrice: 1580.0, weightRange: [40, 55] },
    { name: '和田玉挂件', basePrice: 2200.0, weightRange: [45, 65] },
    { name: '翡翠雕件', basePrice: 3200.0, weightRange: [35, 50] },
    { name: '琥珀雕件', basePrice: 980.0, weightRange: [25, 40] }
  ]
}

// 生成随机日期（最近12个月内）
function getRandomDate() {
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000)
  const randomTime = twelveMonthsAgo.getTime() + Math.random() * (now.getTime() - twelveMonthsAgo.getTime())
  return new Date(randomTime)
}

// 生成图片URL
function generateImageUrl(productName) {
  const encodedName = encodeURIComponent(productName)
  return `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodedName}%20crystal%20beads%20jewelry%20high%20quality%20natural%20gemstone&image_size=square`
}

// 生成采购编号
function generatePurchaseCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  return `CG${date}${random}`
}

// 计算单位类型
function getUnitType(productType) {
  switch (productType) {
    case 'LOOSE_BEADS': return 'PIECES'
    case 'BRACELET': return 'STRINGS'
    case 'ACCESSORIES': return 'SLICES'
    case 'FINISHED': return 'ITEMS'
    default: return 'PIECES'
  }
}

// 计算每串珠子数（仅适用于手串）
function calculateBeadsPerString(diameter) {
  if (!diameter) return null
  return Math.floor(160 / diameter)
}

// 计算数量（仅适用于手串）
function calculateQuantity(productType, totalBeads, beadsPerString) {
  if (productType !== 'BRACELET' || !beadsPerString) return null
  return Math.ceil(totalBeads / beadsPerString)
}

// 生成随机重量
function getRandomWeight(weightRange) {
  const [min, max] = weightRange
  return Number((min + Math.random() * (max - min)).toFixed(3))
}

// 生成随机价格（基于品相调整）
function getRandomPrice(basePrice, quality) {
  const qualityMultiplier = {
    'AA': 1.2,
    'A': 1.0,
    'AB': 0.85,
    'B': 0.7,
    'C': 0.55
  }
  const multiplier = qualityMultiplier[quality] || 1.0
  const variation = 0.8 + Math.random() * 0.4 // 80%-120%的价格波动
  return Number((basePrice * multiplier * variation).toFixed(2))
}

// 生成随机规格
function getRandomSpecification(productType) {
  if (productType === 'LOOSE_BEADS' || productType === 'BRACELET') {
    // 珠子直径：6, 8, 10, 12, 14, 16mm
    const diameters = [6, 8, 10, 12, 14, 16]
    return diameters[Math.floor(Math.random() * diameters.length)]
  } else {
    // 饰品配件和成品规格：3-20mm
    return 3 + Math.floor(Math.random() * 18)
  }
}

// 生成随机数量
function getRandomPieceCount(productType) {
  switch (productType) {
    case 'LOOSE_BEADS':
      return 50 + Math.floor(Math.random() * 300) // 50-350颗
    case 'BRACELET':
      return 15 + Math.floor(Math.random() * 25) // 15-40颗（每串珠子数）
    case 'ACCESSORIES':
      return 20 + Math.floor(Math.random() * 480) // 20-500片
    case 'FINISHED':
      return 10 + Math.floor(Math.random() * 90) // 10-100件
    default:
      return 50
  }
}

// 生成特殊组合数据
function generateSpecialCombinations(suppliers, createdSuppliers, user) {
  const combinations = []
  
  // 1. 相同规格不同品相（紫水晶散珠 8mm）
  const sameSpecDiffQuality = qualityLevels.map((quality, index) => {
    const supplier = createdSuppliers[index % createdSuppliers.length]
    const weight = getRandomWeight([20, 30])
    const pricePerGram = getRandomPrice(8.5, quality)
    const pieceCount = getRandomPieceCount('LOOSE_BEADS')
    
    return {
      productName: '紫水晶散珠',
      productType: 'LOOSE_BEADS',
      beadDiameter: 8,
      quality: quality,
      weight: weight,
      pricePerGram: pricePerGram,
      pieceCount: pieceCount,
      supplier: supplier,
      purchaseDate: getRandomDate(),
      notes: `特殊组合-相同规格不同品相-${quality}级`
    }
  })
  
  // 2. 不同规格相同品相（草莓晶手串 AA级）
  const diffSpecSameQuality = [6, 8, 10, 12].map((diameter, index) => {
    const supplier = createdSuppliers[index % createdSuppliers.length]
    const weight = getRandomWeight([15, 25])
    const pricePerGram = getRandomPrice(32.0, 'AA')
    const beadsPerString = calculateBeadsPerString(diameter)
    const totalBeads = getRandomPieceCount('BRACELET')
    const quantity = calculateQuantity('BRACELET', totalBeads, beadsPerString)
    
    return {
      productName: '草莓晶手串',
      productType: 'BRACELET',
      beadDiameter: diameter,
      quality: 'AA',
      weight: weight,
      pricePerGram: pricePerGram,
      quantity: quantity,
      pieceCount: totalBeads,
      beadsPerString: beadsPerString,
      supplier: supplier,
      purchaseDate: getRandomDate(),
      notes: `特殊组合-不同规格相同品相-${diameter}mm`
    }
  })
  
  // 3. 相同供应商不同时间（大宝珠宝的多次采购）
  const sameSupplierDiffTime = Array.from({length: 4}, (_, index) => {
    const supplier = createdSuppliers[0] // 大宝珠宝
    const products = ['银隔珠', '金隔珠', '南红隔珠', '绿松石隔片']
    const productName = products[index]
    const weight = getRandomWeight([1, 3])
    const pricePerGram = getRandomPrice(25.0 + index * 50, null)
    const pieceCount = getRandomPieceCount('ACCESSORIES')
    
    // 不同时间（间隔1-2个月）
    const baseDate = new Date()
    baseDate.setMonth(baseDate.getMonth() - (index + 1) * 2)
    
    return {
      productName: productName,
      productType: 'ACCESSORIES',
      specification: 3 + index,
      quality: index < 2 ? null : 'A',
      weight: weight,
      pricePerGram: pricePerGram,
      pieceCount: pieceCount,
      supplier: supplier,
      purchaseDate: baseDate,
      notes: `特殊组合-相同供应商不同时间-第${index + 1}次采购`
    }
  })
  
  // 4. 不同供应商相同产品（和田玉挂件）
  const diffSupplierSameProduct = Array.from({length: 4}, (_, index) => {
    const supplier = createdSuppliers[index + 2] // 从第3个供应商开始
    const weight = getRandomWeight([45, 65])
    const pricePerGram = getRandomPrice(2200.0, 'A')
    const pieceCount = getRandomPieceCount('FINISHED')
    
    return {
      productName: '和田玉挂件',
      productType: 'FINISHED',
      specification: 15,
      quality: 'A',
      weight: weight,
      pricePerGram: pricePerGram,
      pieceCount: pieceCount,
      supplier: supplier,
      purchaseDate: getRandomDate(),
      notes: `特殊组合-不同供应商相同产品-${supplier.name}`
    }
  })
  
  return [
    ...sameSpecDiffQuality,
    ...diffSpecSameQuality,
    ...sameSupplierDiffTime,
    ...diffSupplierSameProduct
  ]
}

// 生成常规数据
function generateRegularData(productType, count, createdSuppliers, user) {
  const products = baseProducts[productType]
  const regularData = []
  
  for (let i = 0; i < count; i++) {
    const product = products[i % products.length]
    const supplier = createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)]
    const quality = productType === 'ACCESSORIES' && Math.random() < 0.3 ? null : 
                   qualityLevels[Math.floor(Math.random() * qualityLevels.length)]
    
    const weight = getRandomWeight(product.weightRange)
    const pricePerGram = getRandomPrice(product.basePrice, quality)
    const pieceCount = getRandomPieceCount(productType)
    
    let data = {
      productName: product.name,
      productType: productType,
      quality: quality,
      weight: weight,
      pricePerGram: pricePerGram,
      pieceCount: pieceCount,
      supplier: supplier,
      purchaseDate: getRandomDate(),
      notes: `常规数据-${productType}类型`
    }
    
    if (productType === 'LOOSE_BEADS' || productType === 'BRACELET') {
      data.beadDiameter = getRandomSpecification(productType)
      if (productType === 'BRACELET') {
        data.beadsPerString = calculateBeadsPerString(data.beadDiameter)
        data.quantity = calculateQuantity(productType, pieceCount, data.beadsPerString)
      }
    } else {
      data.specification = getRandomSpecification(productType)
    }
    
    regularData.push(data)
  }
  
  return regularData
}

async function generateComprehensiveTestData() {
  try {
    console.log('🚀 开始生成100条全面测试数据...')
    
    // 清理现有数据
    console.log('🧹 清理现有数据...')
    await prisma.purchase.deleteMany({})
    await prisma.supplier.deleteMany({})
    
    // 获取或创建默认用户
    let user = await prisma.user.findFirst({
      where: { role: 'BOSS' }
    })
    
    if (!user) {
      const hashedPassword = await bcrypt.hash('123456', 10)
      user = await prisma.user.create({
        data: {
          username: 'boss',
          password: hashedPassword,
          email: 'boss@crystal-erp.com',
          name: '系统管理员',
          role: 'BOSS',
          isActive: true
        }
      })
      console.log('✅ 创建默认用户成功')
    }
    
    // 创建供应商
    console.log('👥 创建10个供应商...')
    const createdSuppliers = []
    for (const supplierData of suppliers) {
      const supplier = await prisma.supplier.create({
        data: {
          name: supplierData.name,
          contact: supplierData.contact,
          phone: supplierData.phone,
          address: supplierData.address,
          isActive: true
        }
      })
      createdSuppliers.push(supplier)
    }
    console.log(`✅ 供应商创建完成，共 ${createdSuppliers.length} 个`)
    
    // 生成特殊组合数据（17条）
    console.log('🎯 生成特殊组合数据...')
    const specialCombinations = generateSpecialCombinations(suppliers, createdSuppliers, user)
    
    // 生成常规数据（83条，每种类型约20-21条）
    console.log('📦 生成常规数据...')
    const regularLooseBeads = generateRegularData('LOOSE_BEADS', 21, createdSuppliers, user)
    const regularBracelets = generateRegularData('BRACELET', 21, createdSuppliers, user)
    const regularAccessories = generateRegularData('ACCESSORIES', 21, createdSuppliers, user)
    const regularFinished = generateRegularData('FINISHED', 20, createdSuppliers, user)
    
    // 合并所有数据
    const allData = [
      ...specialCombinations,
      ...regularLooseBeads,
      ...regularBracelets,
      ...regularAccessories,
      ...regularFinished
    ]
    
    console.log('💎 开始创建采购记录...')
    let purchaseCount = 0
    
    for (const data of allData) {
      // 计算总价
      const totalPrice = Number((data.weight * data.pricePerGram).toFixed(2))
      
      // 构建采购数据
      const purchaseData = {
        purchaseCode: generatePurchaseCode(),
        productName: data.productName,
        productType: data.productType,
        unitType: getUnitType(data.productType),
        
        // 规格字段
        beadDiameter: data.beadDiameter || null,
        specification: data.specification || null,
        
        // 数量相关字段
        quantity: data.quantity || null,
        pieceCount: data.pieceCount,
        totalBeads: data.pieceCount,
        beadsPerString: data.beadsPerString || null,
        
        // 价格相关字段
        pricePerGram: data.pricePerGram,
        totalPrice: totalPrice,
        weight: data.weight,
        
        // 其他字段
        quality: data.quality,
        minStockAlert: Math.floor(data.pieceCount * 0.1),
        purchaseDate: data.purchaseDate,
        photos: [generateImageUrl(data.productName)],
        notes: data.notes,
        supplierId: data.supplier.id,
        userId: user.id
      }
      
      await prisma.purchase.create({ data: purchaseData })
      purchaseCount++
      
      if (purchaseCount % 10 === 0) {
        console.log(`   ✅ 已生成 ${purchaseCount} 条记录...`)
      }
    }
    
    console.log('✅ 全面测试数据生成完成！')
    console.log(`📊 统计信息:`)
    console.log(`   - 供应商: ${createdSuppliers.length} 个`)
    console.log(`   - 特殊组合数据: ${specialCombinations.length} 条`)
    console.log(`   - LOOSE_BEADS: ${regularLooseBeads.length + specialCombinations.filter(d => d.productType === 'LOOSE_BEADS').length} 条`)
    console.log(`   - BRACELET: ${regularBracelets.length + specialCombinations.filter(d => d.productType === 'BRACELET').length} 条`)
    console.log(`   - ACCESSORIES: ${regularAccessories.length + specialCombinations.filter(d => d.productType === 'ACCESSORIES').length} 条`)
    console.log(`   - FINISHED: ${regularFinished.length + specialCombinations.filter(d => d.productType === 'FINISHED').length} 条`)
    console.log(`   - 总采购记录: ${purchaseCount} 条`)
    
    // 验证数据完整性
    const totalRecords = await prisma.purchase.count()
    console.log(`🔍 数据库验证: ${totalRecords} 条记录已保存`)
    
  } catch (error) {
    console.error('❌ 生成测试数据失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 执行脚本
if (require.main === module) {
  generateComprehensiveTestData()
    .then(() => {
      console.log('🎉 脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { generateComprehensiveTestData }