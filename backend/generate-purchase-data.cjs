const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// 真实产品数据（根据文档必填项要求重新设计）
const realProductData = [
  // 紫水晶系列 - LOOSE_BEADS类型（必填：bead_diameter，可选：specification）
  { name: '紫水晶散珠', diameter: 6, quality: 'AA', beads: 200, pricePerGram: 8.5, weight: 25.2, type: 'LOOSE_BEADS', hasSpecification: false },
  { name: '紫水晶散珠', diameter: 8, quality: 'A', beads: 150, pricePerGram: 12.0, weight: 32.5, type: 'LOOSE_BEADS', hasSpecification: true, specification: 8 },
  { name: '紫水晶散珠', diameter: 10, quality: 'AB', beads: 120, pricePerGram: 18.0, weight: 45.8, type: 'LOOSE_BEADS', hasSpecification: false },
  
  // 手串系列 - BRACELET类型（必填：bead_diameter，可选：specification）
  { name: '玻利维亚紫手串', diameter: 8, quality: 'AA', beads: 22, pricePerGram: 25.0, weight: 18.9, type: 'BRACELET', hasSpecification: true, specification: 8 },
  { name: '玻利维亚紫手串', diameter: 10, quality: 'A', beads: 18, pricePerGram: 32.0, weight: 28.4, type: 'BRACELET', hasSpecification: false },
  
  // 发晶系列 - BRACELET类型
  { name: '银发晶手串', diameter: 8, quality: 'AA', beads: 20, pricePerGram: 45.0, weight: 20.1, type: 'BRACELET', hasSpecification: false },
  { name: '银发晶手串', diameter: 10, quality: 'A', beads: 16, pricePerGram: 68.0, weight: 32.5, type: 'BRACELET', hasSpecification: true, specification: 10 },
  { name: '白发晶手串', diameter: 8, quality: 'AA', beads: 18, pricePerGram: 38.0, weight: 19.2, type: 'BRACELET', hasSpecification: false },
  
  // 发晶系列 - LOOSE_BEADS类型
  { name: '白发晶圆珠', diameter: 6, quality: 'A', beads: 200, pricePerGram: 22.0, weight: 12.8, type: 'LOOSE_BEADS', hasSpecification: true, specification: 6 },
  { name: '白发晶圆珠', diameter: 10, quality: 'AB', beads: 120, pricePerGram: 45.0, weight: 38.6, type: 'LOOSE_BEADS', hasSpecification: false },
  
  // 草莓晶系列
  { name: '草莓晶圆珠', diameter: 6, quality: 'AA', beads: 160, pricePerBead: 1.80, weight: 14.5, type: 'LOOSE_BEADS' },
  { name: '草莓晶圆珠', diameter: 8, quality: 'A', beads: 140, pricePerBead: 2.60, weight: 24.8, type: 'LOOSE_BEADS' },
  { name: '草莓晶手串', diameter: 8, quality: 'AA', beads: 110, pricePerBead: 3.20, weight: 21.2, type: 'BRACELET' },
  { name: '鸽血红草莓晶手串', diameter: 10, quality: 'AA', beads: 80, pricePerBead: 8.50, weight: 35.2, type: 'BRACELET' },
  
  // 青金石系列
  { name: '青金石手串', diameter: 8, quality: 'A', beads: 130, pricePerBead: 2.80, weight: 26.4, type: 'BRACELET' },
  { name: '青金石手串', diameter: 10, quality: 'AA', beads: 100, pricePerBead: 4.20, weight: 42.1, type: 'BRACELET' },
  
  // 蓝晶系列
  { name: '蓝晶手串', diameter: 8, quality: 'A', beads: 120, pricePerBead: 3.50, weight: 22.8, type: 'BRACELET' },
  { name: '蓝晶手串', diameter: 10, quality: 'AA', beads: 95, pricePerBead: 5.20, weight: 38.9, type: 'BRACELET' },
  { name: '猫眼蓝晶手串', diameter: 8, quality: 'AA', beads: 85, pricePerBead: 6.80, weight: 20.5, type: 'BRACELET' },
  
  // 萤石系列
  { name: '绿萤石手串', diameter: 8, quality: 'A', beads: 140, pricePerBead: 1.80, weight: 25.6, type: 'BRACELET' },
  { name: '绿萤石手串', diameter: 10, quality: 'AA', beads: 110, pricePerBead: 2.50, weight: 41.2, type: 'BRACELET' },
  { name: '紫萤石手串', diameter: 8, quality: 'A', beads: 125, pricePerBead: 2.20, weight: 23.8, type: 'BRACELET' },
  { name: '蓝萤石手串', diameter: 8, quality: 'AA', beads: 105, pricePerBead: 3.80, weight: 21.9, type: 'BRACELET' },
  { name: '黄萤石随形', diameter: null, quality: 'A', beads: 200, pricePerBead: 1.20, weight: 45.8, type: 'LOOSE_BEADS' },
  { name: '羽毛绿萤石圆珠', diameter: 6, quality: 'AA', beads: 180, pricePerBead: 2.80, weight: 16.2, type: 'LOOSE_BEADS' },
  
  // 月光石系列
  { name: '灰月光长串', diameter: 6, quality: 'A', beads: 300, pricePerBead: 1.50, weight: 28.5, type: 'BRACELET' },
  { name: '奶茶月光手串', diameter: 8, quality: 'AA', beads: 110, pricePerBead: 4.20, weight: 22.1, type: 'BRACELET' },
  
  // 特殊水晶系列
  { name: '紫龙晶手串', diameter: 8, quality: 'A', beads: 120, pricePerBead: 3.80, weight: 24.6, type: 'BRACELET' },
  { name: '金箔锦鲤手串', diameter: 10, quality: 'AA', beads: 90, pricePerBead: 12.50, weight: 45.2, type: 'BRACELET' },
  { name: '魔鬼蓝海蓝宝手串', diameter: 8, quality: 'AA', beads: 75, pricePerBead: 15.80, weight: 28.9, type: 'BRACELET' },
  
  // 茶晶系列
  { name: '茶晶手串', diameter: 8, quality: 'A', beads: 135, pricePerBead: 1.80, weight: 26.8, type: 'BRACELET' },
  { name: '茶晶手串', diameter: 10, quality: 'AA', beads: 105, pricePerBead: 2.60, weight: 42.5, type: 'BRACELET' },
  
  // 随形水晶系列
  { name: '随形水晶', diameter: null, quality: 'A', beads: 250, pricePerBead: 0.80, weight: 52.3, type: 'LOOSE_BEADS' },
  { name: '花胶水晶随形', diameter: null, quality: 'AA', beads: 180, pricePerBead: 2.20, weight: 38.9, type: 'LOOSE_BEADS' },
  
  // 白水晶系列
  { name: '白水晶手串', diameter: 8, quality: 'A', beads: 150, pricePerBead: 1.20, weight: 24.5, type: 'BRACELET' },
  { name: '雪花白幽灵手串', diameter: 8, quality: 'AA', beads: 120, pricePerBead: 3.50, weight: 22.8, type: 'BRACELET' },
  { name: '雪花白幽灵手串', diameter: 10, quality: 'A', beads: 95, pricePerBead: 4.80, weight: 38.2, type: 'BRACELET' },
  
  // 兔毛系列
  { name: '彩兔毛手串', diameter: 8, quality: 'A', beads: 110, pricePerBead: 2.80, weight: 21.5, type: 'BRACELET' },
  { name: '彩兔毛手串', diameter: 10, quality: 'AA', beads: 85, pricePerBead: 4.20, weight: 34.8, type: 'BRACELET' },
  
  // 黑金超七系列
  { name: '黑金超手串', diameter: 8, quality: 'AA', beads: 95, pricePerBead: 8.50, weight: 28.9, type: 'BRACELET' },
  { name: '黑金超七随形', diameter: null, quality: 'A', beads: 150, pricePerBead: 5.20, weight: 48.6, type: 'LOOSE_BEADS' },
  
  // 特殊形状
  { name: '黑晶方糖', diameter: 8, quality: 'A', beads: 200, pricePerBead: 1.50, weight: 65.2, type: 'LOOSE_BEADS' },
  
  // 胶花系列
  { name: '黄胶花手串', diameter: 8, quality: 'A', beads: 125, pricePerBead: 2.20, weight: 23.8, type: 'BRACELET' },
  { name: '黄胶花手串', diameter: 10, quality: 'AA', beads: 100, pricePerBead: 3.50, weight: 38.5, type: 'BRACELET' },
  { name: '胶花手串', diameter: 8, quality: 'A', beads: 130, pricePerBead: 1.80, weight: 24.2, type: 'BRACELET' },
  { name: '油画胶花手串', diameter: 8, quality: 'AA', beads: 105, pricePerBead: 4.80, weight: 22.1, type: 'BRACELET' },
  
  // 粉水晶系列
  { name: '粉水晶手串', diameter: 6, quality: 'A', beads: 180, pricePerBead: 1.20, weight: 16.8, type: 'BRACELET' },
  { name: '粉水晶手串', diameter: 8, quality: 'AA', beads: 140, pricePerBead: 2.20, weight: 26.5, type: 'BRACELET' },
  { name: '粉水晶手串', diameter: 10, quality: 'A', beads: 110, pricePerBead: 3.50, weight: 42.8, type: 'BRACELET' },
  { name: '西柚粉晶手串', diameter: 8, quality: 'AA', beads: 95, pricePerBead: 4.80, weight: 21.9, type: 'BRACELET' },
  
  // 闪灵系列
  { name: '黑闪灵手串', diameter: 8, quality: 'A', beads: 115, pricePerBead: 3.20, weight: 25.8, type: 'BRACELET' },
  { name: '黑闪灵手串', diameter: 10, quality: 'AA', beads: 90, pricePerBead: 5.50, weight: 41.2, type: 'BRACELET' },
  
  // 阿塞系列
  { name: '白阿塞手串', diameter: 8, quality: 'A', beads: 125, pricePerBead: 2.80, weight: 24.6, type: 'BRACELET' },
  
  // 岫玉系列
  { name: '岫玉手串', diameter: 8, quality: 'A', beads: 135, pricePerBead: 1.50, weight: 32.5, type: 'BRACELET' },
  { name: '岫玉手串', diameter: 10, quality: 'AA', beads: 105, pricePerBead: 2.20, weight: 52.8, type: 'BRACELET' },
  
  // 其他宝石系列
  { name: '绿银石手串', diameter: 8, quality: 'A', beads: 120, pricePerBead: 3.50, weight: 28.9, type: 'BRACELET' },
  { name: '蓝纹石珠子', diameter: 6, quality: 'AA', beads: 200, pricePerBead: 2.80, weight: 18.5, type: 'LOOSE_BEADS' },
  { name: '红色虎纹石', diameter: 8, quality: 'A', beads: 140, pricePerBead: 2.20, weight: 35.8, type: 'LOOSE_BEADS' },
  { name: '蓝虎眼手串', diameter: 8, quality: 'A', beads: 130, pricePerBead: 2.50, weight: 32.1, type: 'BRACELET' },
  
  // 玛瑙系列
  { name: '红玛瑙', diameter: 8, quality: 'A', beads: 150, pricePerBead: 1.80, weight: 38.5, type: 'LOOSE_BEADS' },
  { name: '茶龙纹玛瑙散珠', diameter: 6, quality: 'A', beads: 250, pricePerBead: 1.20, weight: 28.9, type: 'LOOSE_BEADS' },
  { name: '红龙纹玛瑙散珠', diameter: 6, quality: 'AA', beads: 220, pricePerBead: 1.50, weight: 26.8, type: 'LOOSE_BEADS' },
  { name: '茶色龙纹玛瑙散珠', diameter: 8, quality: 'A', beads: 180, pricePerBead: 1.80, weight: 42.5, type: 'LOOSE_BEADS' },
  
  // 南红系列
  { name: '天然冰飘南红老型珠', diameter: 8, quality: 'AA', beads: 80, pricePerBead: 12.50, weight: 28.9, type: 'FINISHED' },
  { name: '南红老型珠', diameter: 6, quality: 'A', beads: 120, pricePerBead: 8.50, weight: 18.5, type: 'FINISHED' },
  
  // 绿松石系列
  { name: '天然绿松石圆珠', diameter: 6, quality: 'AA', beads: 150, pricePerBead: 6.80, weight: 22.5, type: 'LOOSE_BEADS' },
  { name: '天然绿松石圆珠', diameter: 8, quality: 'A', beads: 110, pricePerBead: 9.50, weight: 35.8, type: 'LOOSE_BEADS' },
  
  // 银曜石系列
  { name: '天然银曜石陨石', diameter: 8, quality: 'A', beads: 125, pricePerBead: 3.80, weight: 42.1, type: 'LOOSE_BEADS' },
  { name: '天然银耀石陨石圆珠', diameter: 6, quality: 'AA', beads: 180, pricePerBead: 2.50, weight: 28.5, type: 'LOOSE_BEADS' },
  { name: '天然银耀石陨石圆珠', diameter: 8, quality: 'A', beads: 140, pricePerBead: 3.20, weight: 45.2, type: 'LOOSE_BEADS' }
]

// 配饰数据
const accessoryData = [
  { name: '镀金随行隔片', specification: 3, quality: null, pieces: 500, pricePerPiece: 0.15, weight: 2.5, type: 'ACCESSORIES' },
  { name: '镀金正方形隔珠', specification: 4, quality: null, pieces: 300, pricePerPiece: 0.25, weight: 1.8, type: 'ACCESSORIES' },
  { name: '银隔珠', specification: 3, quality: null, pieces: 400, pricePerPiece: 0.35, weight: 2.2, type: 'ACCESSORIES' },
  { name: '金隔珠', specification: 3, quality: null, pieces: 200, pricePerPiece: 0.85, weight: 1.5, type: 'ACCESSORIES' },
  { name: '镀金瓜子隔珠', specification: 5, quality: null, pieces: 250, pricePerPiece: 0.20, weight: 1.2, type: 'ACCESSORIES' },
  { name: '银色瓜子隔珠', specification: 5, quality: null, pieces: 280, pricePerPiece: 0.18, weight: 1.4, type: 'ACCESSORIES' },
  { name: '金色螺旋隔珠', specification: 4, quality: null, pieces: 180, pricePerPiece: 0.45, weight: 1.8, type: 'ACCESSORIES' },
  { name: '镀金隔珠', specification: 3, quality: null, pieces: 350, pricePerPiece: 0.28, weight: 2.1, type: 'ACCESSORIES' },
  { name: '镀金小隔珠', specification: 2, quality: null, pieces: 500, pricePerPiece: 0.12, weight: 1.5, type: 'ACCESSORIES' },
  { name: '镀金圆形隔片', specification: 6, quality: null, pieces: 200, pricePerPiece: 0.35, weight: 2.8, type: 'ACCESSORIES' },
  { name: '银色圆形隔片', specification: 6, quality: null, pieces: 220, pricePerPiece: 0.32, weight: 2.5, type: 'ACCESSORIES' },
  { name: '贝母隔珠', specification: 4, quality: null, pieces: 150, pricePerPiece: 0.65, weight: 1.2, type: 'ACCESSORIES' },
  { name: '老银六字真言隔珠', specification: 8, quality: null, pieces: 80, pricePerPiece: 2.50, weight: 3.5, type: 'ACCESSORIES' },
  { name: '银色叶子圆圈隔珠', specification: 5, quality: null, pieces: 120, pricePerPiece: 0.85, weight: 1.8, type: 'ACCESSORIES' },
  { name: '银色正方形隔珠', specification: 4, quality: null, pieces: 180, pricePerPiece: 0.45, weight: 2.1, type: 'ACCESSORIES' },
  { name: '银色长方形隔珠', specification: 6, quality: null, pieces: 160, pricePerPiece: 0.55, weight: 2.8, type: 'ACCESSORIES' },
  { name: '南红隔珠', specification: 4, quality: 'A', pieces: 100, pricePerPiece: 3.50, weight: 1.5, type: 'ACCESSORIES' },
  { name: '银色蝴蝶结配饰', specification: 10, quality: null, pieces: 50, pricePerPiece: 5.80, weight: 2.2, type: 'ACCESSORIES' },
  { name: '银色带钻隔片', specification: 6, quality: null, pieces: 80, pricePerPiece: 8.50, weight: 1.8, type: 'ACCESSORIES' },
  { name: '绿松石隔珠', specification: 4, quality: 'A', pieces: 120, pricePerPiece: 2.80, weight: 1.2, type: 'ACCESSORIES' },
  { name: '绿松石隔片', specification: 6, quality: 'A', pieces: 90, pricePerPiece: 4.20, weight: 2.5, type: 'ACCESSORIES' },
  { name: '黄色玉髓隔片', specification: 6, quality: 'A', pieces: 110, pricePerPiece: 1.80, weight: 2.1, type: 'ACCESSORIES' },
  { name: '玛瑙红无相隔珠', specification: 4, quality: 'A', pieces: 150, pricePerPiece: 1.50, weight: 1.8, type: 'ACCESSORIES' },
  { name: '铜管DIY饰品', specification: 5, quality: null, pieces: 200, pricePerPiece: 0.25, weight: 0.8, type: 'ACCESSORIES' },
  { name: 'k金DIY饰品', specification: 3, quality: null, pieces: 100, pricePerPiece: 1.20, weight: 0.5, type: 'ACCESSORIES' },
  { name: 'K金DIY饰品', specification: 3, quality: null, pieces: 80, pricePerPiece: 1.50, weight: 0.6, type: 'ACCESSORIES' },
  { name: '各色跑环', specification: 2, quality: null, pieces: 300, pricePerPiece: 0.08, weight: 0.3, type: 'ACCESSORIES' }
]

// 供应商数据
const suppliers = [
  { name: '大宝珠宝', contact: '王大宝', phone: '13800138001', address: '广州市荔湾区华林玉器街' },
  { name: '丽人珠宝', contact: '李丽人', phone: '13800138002', address: '深圳市罗湖区水贝珠宝城' },
  { name: '阿月水晶', contact: '张阿月', phone: '13800138003', address: '东海县水晶城' },
  { name: '阿牛水晶', contact: '牛阿牛', phone: '13800138004', address: '东海县水晶批发市场' },
  { name: '市集淘货', contact: '陈淘货', phone: '13800138005', address: '义乌国际商贸城' },
  { name: '水晶之源', contact: '李水晶', phone: '13800138006', address: '连云港市东海县' },
  { name: '天然宝石', contact: '张天然', phone: '13800138007', address: '四川省甘孜州' },
  { name: '珠宝批发', contact: '王批发', phone: '13800138008', address: '广东省四会市' }
]

// 生成随机日期（最近6个月内）
function getRandomDate() {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime())
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

async function generatePurchaseData() {
  try {
    console.log('🚀 开始生成采购数据...')
    
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
    console.log('👥 创建供应商...')
    const createdSuppliers = []
    for (const supplierData of suppliers) {
      try {
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
      } catch (error) {
        if (error.code === 'P2002') {
          // 供应商已存在，查找现有的
          const existingSupplier = await prisma.supplier.findUnique({
            where: { name: supplierData.name }
          })
          if (existingSupplier) {
            createdSuppliers.push(existingSupplier)
          }
        } else {
          throw error
        }
      }
    }
    console.log(`✅ 供应商创建完成，共 ${createdSuppliers.length} 个`)
    
    // 生成水晶产品采购记录
    console.log('💎 生成水晶产品采购记录...')
    let purchaseCount = 0
    
    for (const product of realProductData) {
      const supplier = createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)]
      const purchaseDate = getRandomDate()
      const imageUrl = generateImageUrl(product.name)
      
      // 计算相关字段
      const totalPrice = product.pricePerBead * product.beads
      const pricePerGram = product.weight > 0 ? totalPrice / product.weight : 0
      const beadsPerString = product.diameter ? Math.floor(160 / product.diameter) : 20
      const quantity = product.type === 'BRACELET' ? Math.ceil(product.beads / beadsPerString) : null
      
      const purchaseData = {
        purchaseCode: generatePurchaseCode(),
        productName: product.name,
        productType: product.type,
        unitType: product.type === 'LOOSE_BEADS' ? 'PIECES' : 
                  product.type === 'BRACELET' ? 'STRINGS' : 
                  product.type === 'ACCESSORIES' ? 'SLICES' : 'ITEMS',
        beadDiameter: product.diameter,
        quantity: quantity,
        pieceCount: product.beads,
        totalBeads: product.beads,
        beadsPerString: beadsPerString,
        pricePerBead: product.pricePerBead,
        pricePerGram: pricePerGram,
        totalPrice: totalPrice,
        weight: product.weight,
        quality: product.quality,
        minStockAlert: Math.floor(product.beads * 0.1),
        purchaseDate: purchaseDate,
        photos: [imageUrl],
        notes: `真实业务产品 - ${product.name}`,
        supplierId: supplier.id,
        userId: user.id
      }
      
      await prisma.purchase.create({ data: purchaseData })
      purchaseCount++
      
      if (purchaseCount % 10 === 0) {
        console.log(`   已生成 ${purchaseCount} 条记录...`)
      }
    }
    
    // 生成配饰采购记录
    console.log('🎨 生成配饰采购记录...')
    
    for (const accessory of accessoryData) {
      const supplier = createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)]
      const purchaseDate = getRandomDate()
      const imageUrl = generateImageUrl(accessory.name)
      
      // 计算相关字段
      const totalPrice = accessory.pricePerPiece * accessory.pieces
      const pricePerGram = accessory.weight > 0 ? totalPrice / accessory.weight : 0
      
      const purchaseData = {
        purchaseCode: generatePurchaseCode(),
        productName: accessory.name,
        productType: accessory.type,
        unitType: 'SLICES',
        specification: accessory.specification,
        pieceCount: accessory.pieces,
        pricePerBead: accessory.pricePerPiece,
        pricePerGram: pricePerGram,
        totalPrice: totalPrice,
        weight: accessory.weight,
        quality: accessory.quality,
        minStockAlert: Math.floor(accessory.pieces * 0.05),
        purchaseDate: purchaseDate,
        photos: [imageUrl],
        notes: `配饰产品 - ${accessory.name}`,
        supplierId: supplier.id,
        userId: user.id
      }
      
      await prisma.purchase.create({ data: purchaseData })
      purchaseCount++
      
      if (purchaseCount % 10 === 0) {
        console.log(`   已生成 ${purchaseCount} 条记录...`)
      }
    }
    
    console.log('✅ 采购数据生成完成！')
    console.log(`📊 统计信息:`)
    console.log(`   - 供应商: ${createdSuppliers.length} 个`)
    console.log(`   - 水晶产品: ${realProductData.length} 种`)
    console.log(`   - 配饰产品: ${accessoryData.length} 种`)
    console.log(`   - 总采购记录: ${purchaseCount} 条`)
    
  } catch (error) {
    console.error('❌ 生成采购数据失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 执行脚本
if (require.main === module) {
  generatePurchaseData()
    .then(() => {
      console.log('🎉 脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { generatePurchaseData }