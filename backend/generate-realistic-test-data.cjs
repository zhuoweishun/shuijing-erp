const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// 根据文档必填项要求设计的真实测试数据
const testProductData = [
  // LOOSE_BEADS类型 - 必填：bead_diameter，可选：specification
  { 
    name: '紫水晶散珠', 
    diameter: 6, 
    quality: 'AA', 
    beads: 200, 
    pricePerGram: 8.5, 
    weight: 25.2, 
    type: 'LOOSE_BEADS', 
    hasSpecification: false 
  },
  { 
    name: '紫水晶散珠', 
    diameter: 8, 
    quality: 'A', 
    beads: 150, 
    pricePerGram: 12.0, 
    weight: 32.5, 
    type: 'LOOSE_BEADS', 
    hasSpecification: true, 
    specification: 8 
  },
  { 
    name: '白发晶圆珠', 
    diameter: 10, 
    quality: 'AB', 
    beads: 120, 
    pricePerGram: 45.0, 
    weight: 38.6, 
    type: 'LOOSE_BEADS', 
    hasSpecification: false 
  },
  { 
    name: '草莓晶圆珠', 
    diameter: 6, 
    quality: 'AA', 
    beads: 180, 
    pricePerGram: 18.0, 
    weight: 16.5, 
    type: 'LOOSE_BEADS', 
    hasSpecification: true, 
    specification: 6 
  },
  { 
    name: '青金石圆珠', 
    diameter: 8, 
    quality: 'A', 
    beads: 140, 
    pricePerGram: 28.0, 
    weight: 24.8, 
    type: 'LOOSE_BEADS', 
    hasSpecification: false 
  },

  // BRACELET类型 - 必填：bead_diameter，可选：specification
  { 
    name: '玻利维亚紫手串', 
    diameter: 8, 
    quality: 'AA', 
    beads: 22, 
    pricePerGram: 25.0, 
    weight: 18.9, 
    type: 'BRACELET', 
    hasSpecification: true, 
    specification: 8 
  },
  { 
    name: '银发晶手串', 
    diameter: 10, 
    quality: 'A', 
    beads: 16, 
    pricePerGram: 68.0, 
    weight: 32.5, 
    type: 'BRACELET', 
    hasSpecification: false 
  },
  { 
    name: '草莓晶手串', 
    diameter: 8, 
    quality: 'AA', 
    beads: 20, 
    pricePerGram: 32.0, 
    weight: 21.2, 
    type: 'BRACELET', 
    hasSpecification: true, 
    specification: 8 
  },
  { 
    name: '蓝晶手串', 
    diameter: 10, 
    quality: 'A', 
    beads: 18, 
    pricePerGram: 52.0, 
    weight: 38.9, 
    type: 'BRACELET', 
    hasSpecification: false 
  },
  { 
    name: '月光石手串', 
    diameter: 6, 
    quality: 'AA', 
    beads: 28, 
    pricePerGram: 42.0, 
    weight: 16.8, 
    type: 'BRACELET', 
    hasSpecification: true, 
    specification: 6 
  },

  // ACCESSORIES类型 - 必填：specification，可选：bead_diameter
  { 
    name: '镀金隔片', 
    specification: 3, 
    quality: null, 
    pieces: 500, 
    pricePerGram: 15.0, 
    weight: 2.5, 
    type: 'ACCESSORIES', 
    hasDiameter: false 
  },
  { 
    name: '银隔珠', 
    specification: 4, 
    quality: null, 
    pieces: 300, 
    pricePerGram: 25.0, 
    weight: 1.8, 
    type: 'ACCESSORIES', 
    hasDiameter: true, 
    diameter: 4 
  },
  { 
    name: '金隔珠', 
    specification: 3, 
    quality: null, 
    pieces: 200, 
    pricePerGram: 85.0, 
    weight: 1.5, 
    type: 'ACCESSORIES', 
    hasDiameter: false 
  },
  { 
    name: '南红隔珠', 
    specification: 4, 
    quality: 'A', 
    pieces: 100, 
    pricePerGram: 350.0, 
    weight: 1.5, 
    type: 'ACCESSORIES', 
    hasDiameter: true, 
    diameter: 4 
  },
  { 
    name: '绿松石隔片', 
    specification: 6, 
    quality: 'A', 
    pieces: 90, 
    pricePerGram: 420.0, 
    weight: 2.5, 
    type: 'ACCESSORIES', 
    hasDiameter: false 
  },

  // FINISHED类型 - 必填：specification，可选：bead_diameter
  { 
    name: '天然冰飘南红老型珠', 
    specification: 8, 
    quality: 'AA', 
    pieces: 80, 
    pricePerGram: 1250.0, 
    weight: 28.9, 
    type: 'FINISHED', 
    hasDiameter: true, 
    diameter: 8 
  },
  { 
    name: '南红老型珠', 
    specification: 6, 
    quality: 'A', 
    pieces: 120, 
    pricePerGram: 850.0, 
    weight: 18.5, 
    type: 'FINISHED', 
    hasDiameter: false 
  },
  { 
    name: '天然绿松石雕件', 
    specification: 10, 
    quality: 'AA', 
    pieces: 50, 
    pricePerGram: 680.0, 
    weight: 35.8, 
    type: 'FINISHED', 
    hasDiameter: true, 
    diameter: 10 
  },
  { 
    name: '精品蜜蜡雕件', 
    specification: 12, 
    quality: 'AA', 
    pieces: 30, 
    pricePerGram: 1580.0, 
    weight: 45.2, 
    type: 'FINISHED', 
    hasDiameter: false 
  },
  { 
    name: '和田玉挂件', 
    specification: 15, 
    quality: 'A', 
    pieces: 25, 
    pricePerGram: 2200.0, 
    weight: 52.8, 
    type: 'FINISHED', 
    hasDiameter: true, 
    diameter: 15 
  }
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
  // 根据直径计算每串珠子数，假设手串周长约16cm
  return Math.floor(160 / diameter)
}

// 计算数量（仅适用于手串）
function calculateQuantity(productType, totalBeads, beadsPerString) {
  if (productType !== 'BRACELET' || !beadsPerString) return null
  return Math.ceil(totalBeads / beadsPerString)
}

async function generateRealisticTestData() {
  try {
    console.log('🚀 开始生成真实测试数据...')
    
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
    console.log('👥 创建供应商...')
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
    
    // 生成采购记录
    console.log('💎 生成采购记录...')
    let purchaseCount = 0
    
    for (const product of testProductData) {
      const supplier = createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)]
      const purchaseDate = getRandomDate()
      const imageUrl = generateImageUrl(product.name)
      
      // 计算总价（总价 = 重量 × 克价）
      const totalPrice = product.weight * product.pricePerGram
      
      // 计算每串珠子数（仅适用于手串）
      const beadsPerString = product.type === 'BRACELET' ? calculateBeadsPerString(product.diameter) : null
      
      // 计算数量（仅适用于手串）
      const quantity = calculateQuantity(product.type, product.beads || product.pieces, beadsPerString)
      
      // 构建采购数据，严格按照文档必填项要求
      const purchaseData = {
        purchaseCode: generatePurchaseCode(),
        productName: product.name,
        productType: product.type,
        unitType: getUnitType(product.type),
        
        // 必填项处理
        beadDiameter: (product.type === 'LOOSE_BEADS' || product.type === 'BRACELET') ? product.diameter : 
                     (product.hasDiameter ? product.diameter : null),
        specification: (product.type === 'ACCESSORIES' || product.type === 'FINISHED') ? product.specification : 
                      (product.hasSpecification ? product.specification : null),
        
        // 数量相关字段
        quantity: quantity,
        pieceCount: product.beads || product.pieces,
        totalBeads: product.beads || product.pieces,
        beadsPerString: beadsPerString,
        
        // 价格相关字段
        pricePerGram: product.pricePerGram,
        totalPrice: totalPrice,
        weight: product.weight,
        
        // 其他字段
        quality: product.quality,
        minStockAlert: Math.floor((product.beads || product.pieces) * 0.1),
        purchaseDate: purchaseDate,
        photos: [imageUrl],
        notes: `真实测试数据 - ${product.type}类型 - ${product.name}`,
        supplierId: supplier.id,
        userId: user.id
      }
      
      await prisma.purchase.create({ data: purchaseData })
      purchaseCount++
      
      console.log(`   ✅ 已生成 ${product.name} (${product.type})`);
    }
    
    console.log('✅ 真实测试数据生成完成！')
    console.log(`📊 统计信息:`)
    console.log(`   - 供应商: ${createdSuppliers.length} 个`)
    console.log(`   - LOOSE_BEADS: ${testProductData.filter(p => p.type === 'LOOSE_BEADS').length} 种`)
    console.log(`   - BRACELET: ${testProductData.filter(p => p.type === 'BRACELET').length} 种`)
    console.log(`   - ACCESSORIES: ${testProductData.filter(p => p.type === 'ACCESSORIES').length} 种`)
    console.log(`   - FINISHED: ${testProductData.filter(p => p.type === 'FINISHED').length} 种`)
    console.log(`   - 总采购记录: ${purchaseCount} 条`)
    
  } catch (error) {
    console.error('❌ 生成测试数据失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 执行脚本
if (require.main === module) {
  generateRealisticTestData()
    .then(() => {
      console.log('🎉 脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { generateRealisticTestData }