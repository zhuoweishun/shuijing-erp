import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { convertToApiFormat, convertFromApiFormat, filterSensitiveFields } from '../utils/fieldConverter'

const router = Router()



// 测试路由（无需认证）- 必须在/:id路由之前定义
router.get('/test', (req, res) => {
  console.log('🔥 [TEST] 测试路由被调用!')
  res.json({ success: true, message: '测试路由正常工作' })
})

// 测试路由（需要认证）- 必须在/:id路由之前定义
router.get('/test-auth', authenticateToken, (req, res) => {
  console.log('🔥 [TEST-AUTH] 认证测试路由被调用!')
  res.json({ success: true, message: '认证测试路由正常工作' })
})

// 获取可用原材料列表 - 必须在/:id路由之前定义
router.get('/materials', authenticateToken, asyncHandler(async (req, res) => {
  console.log('🔍 [Materials API] 接口被调用:', {
    query: req.query,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  })
  
  const { 
    search, 
    product_types,
    available_only = 'true', 
    min_quantity = 1 
  } = req.query
  
  try {
    // 构建查询条件，支持所有产品类型
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    
    if (search) {
      whereClause += ' AND p.productName LIKE ?'
      params.push(`%${search}%`)
    }
    
    // 产品类型筛选 - 处理字符串或数组格式
    let productTypesArray: string[] = []
    if (product_types) {
      if (typeof product_types === 'string') {
        // 如果是逗号分隔的字符串，分割成数组
        productTypesArray = product_types.split(',').map(type => type.trim()).filter(Boolean)
      } else if (Array.isArray(product_types)) {
        productTypesArray = product_types
      }
    }
    
    if (productTypesArray.length > 0) {
      const placeholders = productTypesArray.map(() => '?').join(',')
      whereClause += ` AND p.productType IN (${placeholders})`
      params.push(...productTypesArray)
    }
    
    // 使用通用的库存计算逻辑，支持所有产品类型
    const materialsQuery = `
      SELECT 
        p.id,
        p.productName as product_name,
        p.productType as product_type,
        p.beadDiameter as bead_diameter,
        p.specification,
        p.quality,
        p.totalBeads,
        p.pieceCount,
        p.quantity,
        p.beadsPerString,
        COALESCE(SUM(mu.quantityUsedBeads), 0) as used_beads,
        COALESCE(SUM(mu.quantityUsedPieces), 0) as used_pieces,
        -- 根据产品类型计算可用数量
        CASE 
          WHEN p.productType = 'LOOSE_BEADS' THEN 
            GREATEST(0, COALESCE(p.pieceCount, 0) - COALESCE(SUM(mu.quantityUsedPieces), 0))
          WHEN p.productType = 'BRACELET' THEN 
            GREATEST(0, COALESCE(p.totalBeads, 0) - COALESCE(SUM(mu.quantityUsedBeads), 0))
          WHEN p.productType IN ('ACCESSORIES', 'FINISHED') THEN 
            GREATEST(0, COALESCE(p.pieceCount, 0) - COALESCE(SUM(mu.quantityUsedPieces), 0))
          ELSE 0
        END as available_quantity,
        -- 计算单位成本
        CASE 
          WHEN p.productType = 'LOOSE_BEADS' AND p.pieceCount > 0 THEN 
            p.totalPrice / p.pieceCount
          WHEN p.productType = 'BRACELET' AND p.totalBeads > 0 THEN 
            p.pricePerBead
          WHEN p.productType IN ('ACCESSORIES', 'FINISHED') AND p.pieceCount > 0 THEN 
            p.totalPrice / p.pieceCount
          ELSE p.unitPrice
        END as unit_cost,
        p.pricePerBead as price_per_bead,
        p.pricePerGram as price_per_gram,
        p.totalPrice as total_price,
        p.unitPrice as unit_price,
        p.weight,
        p.photos,
        s.name as supplier_name,
        p.createdAt as created_at,
        p.updatedAt as updated_at
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchaseId
      LEFT JOIN suppliers s ON p.supplierId = s.id
      ${whereClause}
      GROUP BY p.id, p.productName, p.productType, p.beadDiameter, p.specification, p.quality, 
               p.totalBeads, p.pieceCount, p.quantity, p.beadsPerString, p.pricePerBead, p.pricePerGram, 
               p.totalPrice, p.unitPrice, p.weight, p.photos, s.name, p.createdAt, p.updatedAt
      ${available_only === 'true' ? 'HAVING available_quantity >= ?' : ''}
      ORDER BY p.createdAt DESC
    `
    
    if (available_only === 'true') {
      params.push(Number(min_quantity))
    }
    
    console.log('🔍 [Materials API] 执行SQL查询:', {
      query: materialsQuery.substring(0, 200) + '...',
      params,
      whereClause
    })
    
    const materialsResult = await prisma.$queryRawUnsafe(materialsQuery, ...(params || [])) as any[]
    
    console.log('🔍 [Materials API] SQL查询结果:', {
      resultCount: materialsResult.length,
      firstResult: materialsResult[0] || null
    })
    
    // 转换字段格式
    const formattedMaterials = materialsResult.map(material => {
      const converted = convertToApiFormat(material)
      
      // 手动添加前端期望的字段映射
      converted.purchase_id = material.id
      converted.available_quantity = Number(material.available_quantity)
      converted.unit_cost = Number(material.unit_cost) || 0
      
      // 添加手串相关的重要字段映射
      converted.quantity = material.quantity // 串数
      converted.beads_per_string = material.beadsPerString // 每串颗数
      converted.total_beads = material.totalBeads // 总颗数
      converted.piece_count = material.pieceCount // 片数/件数
      converted.used_beads = Number(material.used_beads) // 已用颗数
      converted.used_pieces = Number(material.used_pieces) // 已用片数/件数
      
      // 计算剩余数量（用于验证）
      if (material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET') {
        converted.remaining_beads = (material.totalBeads || 0) - Number(material.used_beads)
      } else {
        converted.remaining_pieces = (material.pieceCount || 0) - Number(material.used_pieces)
      }
      
      // 根据用户权限过滤敏感信息
      if (req.user.role === 'EMPLOYEE') {
        converted.price_per_bead = null
        converted.price_per_gram = null
        converted.total_price = null
        converted.unit_price = null
        converted.unit_cost = null
        converted.supplier_name = null
      }
      
      return converted
    })
    
    console.log('🔍 [Materials API] 准备返回响应:', {
      materialsCount: formattedMaterials.length,
      success: true
    })
    
    res.json({
      success: true,
      message: '获取可用原材料成功',
      data: {
        materials: formattedMaterials,
        total_count: formattedMaterials.length
      }
    })
  } catch (error) {
    console.error('获取原材料失败:', error)
    res.status(500).json({
      success: false,
      message: '获取原材料失败',
      error: {
        code: 'MATERIALS_FETCH_ERROR',
        details: error.message,
        stack: error.stack
      }
    })
  }
}))

// 成品创建数据验证schema
const createProductSchema = z.object({
  product_name: z.string().min(1, '成品名称不能为空').max(200, '成品名称不能超过200字符'),
  materials: z.array(z.object({
    purchase_id: z.string().min(1, '采购记录ID不能为空'),
    quantity_used_beads: z.number().int().positive('使用颗数必须是正整数')
  })).min(1, '至少需要选择一个原材料'),
  selling_price: z.number().positive('销售价格必须大于0').optional(),
  photos: z.array(z.string().url('图片URL格式不正确')).optional(),
  notes: z.string().optional()
})

// 获取销售列表
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    status,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query
  
  const where: any = {}
  
  if (search) {
    where.name = {
      contains: search as string
    }
  }
  
  if (status) {
    where.status = status
  }
  
  const products = await prisma.product.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true
        }
      },
      materialUsages: {
        include: {
          purchase: {
            select: {
              id: true,
              productName: true,
              beadDiameter: true,
              quality: true
            }
          }
        }
      }
    },
    orderBy: {
      [sort_by as string]: sort_order
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit)
  })
  
  const total = await prisma.product.count({ where })
  
  // 转换字段命名并过滤敏感信息
  const filteredProducts = products.map(product => {
    const converted = convertToApiFormat(product)
    
    if (req.user.role === 'EMPLOYEE') {
      // 雇员不能查看成本相关信息
      converted.unit_price = null
      converted.total_value = null
    }
    
    return converted
  })
  
  res.json({
    success: true,
    message: '获取销售列表成功',
    data: {
      products: filteredProducts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  })
}))

// 创建成品记录
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  // 验证请求数据
  const validatedData = createProductSchema.parse(req.body)
  
  // 开启事务
  const result = await prisma.$transaction(async (tx) => {
    // 验证原材料库存是否充足
    for (const material of validatedData.materials) {
      const purchase = await tx.purchase.findUnique({
        where: { id: material.purchase_id },
        include: {
          materialUsages: true
        }
      })
      
      if (!purchase) {
        throw new Error(`采购记录 ${material.purchase_id} 不存在`)
      }
      
      // 计算已使用数量
      const usedQuantity = purchase.materialUsages.reduce(
        (sum, usage) => sum + usage.quantityUsedBeads, 0
      )
      
      const availableQuantity = (purchase.totalBeads || 0) - usedQuantity
      
      if (availableQuantity < material.quantity_used_beads) {
        throw new Error(`原材料 ${purchase.productName} 库存不足，可用：${availableQuantity}颗，需要：${material.quantity_used_beads}颗`)
      }
    }
    
    // 计算总成本
    let totalCost = 0
    for (const material of validatedData.materials) {
      const purchase = await tx.purchase.findUnique({
        where: { id: material.purchase_id }
      })
      
      if (purchase?.pricePerBead) {
        totalCost += Number(purchase.pricePerBead) * material.quantity_used_beads
      }
    }
    
    // 创建成品记录
    const product = await tx.product.create({
      data: {
        name: validatedData.product_name,
        unitPrice: validatedData.selling_price || 0,
        totalValue: totalCost,
        unit: '件',
        quantity: 1,
        images: validatedData.photos ? JSON.stringify(validatedData.photos) : null,
        notes: validatedData.notes,
        userId: req.user.id
      }
    })
    
    // 创建原材料使用记录
    for (const material of validatedData.materials) {
      await tx.materialUsage.create({
        data: {
          purchaseId: material.purchase_id,
          productId: product.id,
          quantityUsedBeads: material.quantity_used_beads
        }
      })
    }
    
    return product
  })
  
  res.status(201).json({
    success: true,
    message: '成品创建成功',
    data: {
      id: result.id,
      total_cost: req.user.role === 'BOSS' ? Number(result.totalValue) : null
    }
  })
}))

// 获取单个成品记录
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true
        }
      },
      materialUsages: {
        include: {
          purchase: {
            select: {
              id: true,
              productName: true,
              beadDiameter: true,
              quality: true,
              pricePerBead: true
            }
          }
        }
      }
    }
  })
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: '成品记录不存在'
    })
  }
  
  // 转换字段命名并过滤敏感信息
  const converted = convertToApiFormat(product)
  
  if (req.user.role === 'EMPLOYEE') {
    converted.unit_price = null
    converted.total_value = null
    // 过滤原材料价格信息
    converted.materialUsages = converted.materialUsages.map((usage: any) => ({
      ...usage,
      purchase: {
        ...usage.purchase,
        pricePerBead: null
      }
    }))
  }
  
  res.json({
    success: true,
    message: '获取成品记录成功',
    data: converted
  })
}))

// 成品销毁（含库存回滚）
router.delete('/:id/destroy', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 开启事务进行销毁操作
  const result = await prisma.$transaction(async (tx) => {
    // 查询成品及其原材料使用记录
    const product = await tx.product.findUnique({
      where: { id },
      include: {
        materialUsages: {
          include: {
            purchase: {
              select: {
                id: true,
                productName: true,
                beadDiameter: true,
                quality: true
              }
            }
          }
        }
      }
    })
    
    if (!product) {
      throw new Error('成品记录不存在')
    }
    
    // 记录要回滚的原材料信息
    const restoredMaterials = product.materialUsages.map(usage => ({
      purchase_id: usage.purchaseId,
      product_name: usage.purchase.productName,
      bead_diameter: usage.purchase.beadDiameter,
      quality: usage.purchase.quality,
      restored_quantity: usage.quantityUsedBeads
    }))
    
    // 删除原材料使用记录（自动回滚库存）
    await tx.materialUsage.deleteMany({
      where: { productId: id }
    })
    
    // 删除成品记录
    await tx.product.delete({
      where: { id }
    })
    
    return {
      destroyed_product_id: id,
      restored_materials: restoredMaterials
    }
  })
  
  res.json({
    success: true,
    message: '成品销毁成功，原材料已回滚',
    data: result
  })
}))

// 更新成品记录
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    success: false,
    message: '更新成品记录功能正在开发中...',
    error: {
      code: 'NOT_IMPLEMENTED',
      details: '该功能尚未实现'
    }
  })
}))

// 计算制作成本预估
router.post('/cost', authenticateToken, asyncHandler(async (req, res) => {
  const { materials, labor_cost = 0, craft_cost = 0, profit_margin = 30 } = req.body
  
  if (!materials || !Array.isArray(materials) || materials.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供原材料列表'
    })
  }
  
  let totalMaterialCost = 0
  const materialDetails = []
  
  // 计算原材料成本
  for (const material of materials) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: material.purchase_id }
    })
    
    if (!purchase) {
      return res.status(400).json({
        success: false,
        message: `采购记录 ${material.purchase_id} 不存在`
      })
    }
    
    const usedBeads = material.quantity_used_beads || 0
    const usedPieces = material.quantity_used_pieces || 0
    
    let materialCost = 0
    if (usedBeads > 0 && purchase.pricePerBead) {
      materialCost += usedBeads * Number(purchase.pricePerBead)
    }
    if (usedPieces > 0 && purchase.unitPrice) {
      materialCost += usedPieces * Number(purchase.unitPrice)
    }
    
    totalMaterialCost += materialCost
    materialDetails.push({
      purchase_id: material.purchase_id,
      product_name: purchase.productName,
      used_beads: usedBeads,
      used_pieces: usedPieces,
      unit_cost: purchase.pricePerBead || purchase.unitPrice || 0,
      material_cost: materialCost
    })
  }
  
  // 计算总成本
  const totalCost = totalMaterialCost + Number(labor_cost) + Number(craft_cost)
  
  // 计算建议售价
  const profitMultiplier = 1 + (Number(profit_margin) / 100)
  const suggestedPrice = totalCost * profitMultiplier
  
  res.json({
    success: true,
    message: '成本计算成功',
    data: {
      material_cost: totalMaterialCost,
      labor_cost: Number(labor_cost),
      craft_cost: Number(craft_cost),
      total_cost: totalCost,
      profit_margin: Number(profit_margin),
      pricing_suggestion: {
        suggested_price: Math.round(suggestedPrice * 100) / 100,
        min_price: Math.round(totalCost * 1.1 * 100) / 100,
        max_price: Math.round(totalCost * 2 * 100) / 100
      },
      material_details: materialDetails
    }
  })
}))

// 创建成品记录（重写原有的POST /接口）
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const {
    product_name,
    description,
    specification,
    materials,
    labor_cost = 0,
    craft_cost = 0,
    selling_price,
    profit_margin = 30,
    photos = []
  } = req.body
  
  // 验证必填字段
  if (!product_name || !materials || !Array.isArray(materials) || materials.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供成品名称和原材料列表'
    })
  }
  
  if (!selling_price || selling_price <= 0) {
    return res.status(400).json({
      success: false,
      message: '请设置有效的销售价格'
    })
  }
  
  // 开启事务
  const result = await prisma.$transaction(async (tx) => {
    // 验证原材料库存
    let totalMaterialCost = 0
    
    for (const material of materials) {
      const purchase = await tx.purchase.findUnique({
        where: { id: material.purchase_id },
        include: { materialUsages: true }
      })
      
      if (!purchase) {
        throw new Error(`采购记录 ${material.purchase_id} 不存在`)
      }
      
      // 根据产品类型计算已使用数量和可用库存
      let usedQuantity = 0
      let availableQuantity = 0
      let requiredQuantity = 0
      
      if (purchase.productType === 'LOOSE_BEADS' || purchase.productType === 'BRACELET') {
        // 散珠和手串按颗计算
        usedQuantity = purchase.materialUsages.reduce(
          (sum, usage) => sum + usage.quantityUsedBeads, 0
        )
        availableQuantity = (purchase.totalBeads || 0) - usedQuantity
        requiredQuantity = material.quantity_used_beads || 0
      } else if (purchase.productType === 'ACCESSORIES' || purchase.productType === 'FINISHED') {
        // 饰品配件和成品按片/件计算
        usedQuantity = purchase.materialUsages.reduce(
          (sum, usage) => sum + usage.quantityUsedPieces, 0
        )
        availableQuantity = (purchase.pieceCount || 0) - usedQuantity
        requiredQuantity = material.quantity_used_pieces || 0
      }
      
      if (availableQuantity < requiredQuantity) {
        const unit = purchase.productType === 'LOOSE_BEADS' || purchase.productType === 'BRACELET' ? '颗' : 
                    purchase.productType === 'ACCESSORIES' ? '片' : '件'
        throw new Error(`原材料 ${purchase.productName} 库存不足，可用：${availableQuantity}${unit}，需要：${requiredQuantity}${unit}`)
      }
      
      // 计算原材料成本
      if (material.quantity_used_beads && purchase.pricePerBead) {
        totalMaterialCost += material.quantity_used_beads * Number(purchase.pricePerBead)
      }
      if (material.quantity_used_pieces && purchase.unitPrice) {
        totalMaterialCost += material.quantity_used_pieces * Number(purchase.unitPrice)
      }
    }
    
    // 计算总成本
    const totalCost = totalMaterialCost + Number(labor_cost) + Number(craft_cost)
    
    // 创建成品记录
    const product = await tx.product.create({
      data: {
        name: product_name,
        unitPrice: Number(selling_price),
        totalValue: totalCost,
        unit: '件',
        quantity: 1,
        images: photos.length > 0 ? JSON.stringify(photos) : null,
        notes: description || null,
        userId: req.user.id
      }
    })
    
    // 创建原材料使用记录
    for (const material of materials) {
      const usedBeads = material.quantity_used_beads || 0
      const usedPieces = material.quantity_used_pieces || 0
      
      if (usedBeads > 0 || usedPieces > 0) {
        await tx.materialUsage.create({
          data: {
            purchaseId: material.purchase_id,
            productId: product.id,
            quantityUsedBeads: usedBeads,
            quantityUsedPieces: usedPieces
          }
        })
      }
    }
    
    return {
      id: product.id,
      product_name,
      total_cost: totalCost,
      selling_price: Number(selling_price),
      profit: Number(selling_price) - totalCost,
      profit_margin: ((Number(selling_price) - totalCost) / totalCost * 100).toFixed(2)
    }
  })
  
  res.status(201).json({
    success: true,
    message: '成品创建成功',
    data: result
  })
}))

// 批量创建成品记录（直接转化模式）
router.post('/batch', authenticateToken, asyncHandler(async (req, res) => {
  const { products } = req.body
  
  // 验证请求参数
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供成品列表'
    })
  }
  
  // 验证每个成品的必填字段
  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    if (!product.material_id || !product.product_name || !product.selling_price || product.selling_price <= 0) {
      return res.status(400).json({
        success: false,
        message: `第${i + 1}个成品信息不完整：需要原材料ID、成品名称和有效的销售价格`
      })
    }
  }
  
  const createdProducts = []
  const failedProducts = []
  
  // 逐个处理每个成品创建（避免事务过大）
  for (let i = 0; i < products.length; i++) {
    const productData = products[i]
    
    try {
      // 开启单个成品的事务
      const result = await prisma.$transaction(async (tx) => {
        // 验证原材料存在性和库存
        const purchase = await tx.purchase.findUnique({
          where: { id: productData.material_id },
          include: { materialUsages: true }
        })
        
        if (!purchase) {
          throw new Error(`原材料记录不存在`)
        }
        
        // 检查是否为成品类型的原材料
        if (purchase.productType !== 'FINISHED') {
          throw new Error(`只能使用成品类型的原材料进行直接转化`)
        }
        
        // 计算已使用数量和可用库存（成品按件计算）
        const usedQuantity = purchase.materialUsages.reduce(
          (sum, usage) => sum + usage.quantityUsedPieces, 0
        )
        const availableQuantity = (purchase.pieceCount || 0) - usedQuantity
        
        if (availableQuantity < 1) {
          throw new Error(`原材料库存不足，可用：${availableQuantity}件，需要：1件`)
        }
        
        // 计算成本
        const materialCost = purchase.unitPrice || 0
        const laborCost = productData.labor_cost || 0
        const craftCost = productData.craft_cost || 0
        const totalCost = Number(materialCost) + Number(laborCost) + Number(craftCost)
        
        // 生成成品编号
        const today = new Date()
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
        const existingCount = await tx.product.count({
          where: {
            createdAt: {
              gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
              lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
            }
          }
        })
        const productCode = `FP${dateStr}${String(existingCount + 1).padStart(3, '0')}`
        
        // 创建成品记录
        const product = await tx.product.create({
          data: {
            productCode: productCode,
            name: productData.product_name,
            description: productData.description || null,
            unitPrice: Number(productData.selling_price),
            totalValue: totalCost,
            unit: '件',
            quantity: 1,
            images: productData.photos && productData.photos.length > 0 ? JSON.stringify(productData.photos) : null,
            notes: productData.description || null,
            userId: req.user.id
          }
        })
        
        // 创建原材料使用记录
        await tx.materialUsage.create({
          data: {
            purchaseId: productData.material_id,
            productId: product.id,
            quantityUsedBeads: 0,
            quantityUsedPieces: 1
          }
        })
        
        return {
          id: product.id,
          product_code: productCode,
          product_name: productData.product_name,
          material_cost: Number(materialCost),
          total_cost: totalCost,
          selling_price: Number(productData.selling_price),
          profit_margin: Number(productData.selling_price) > 0 
            ? ((Number(productData.selling_price) - totalCost) / Number(productData.selling_price) * 100).toFixed(1)
            : '0.0',
          status: 'AVAILABLE'
        }
      })
      
      createdProducts.push(result)
      
    } catch (error) {
      console.error(`批量创建第${i + 1}个成品失败:`, error)
      failedProducts.push({
        material_id: productData.material_id,
        error: error.message,
        error_code: 'CREATION_FAILED'
      })
    }
  }
  
  const successCount = createdProducts.length
  const failedCount = failedProducts.length
  
  // 根据结果返回相应的状态码和消息
  if (successCount === 0) {
    return res.status(400).json({
      success: false,
      message: '批量创建全部失败',
      data: {
        success_count: 0,
        failed_count: failedCount,
        created_products: [],
        failed_products: failedProducts
      }
    })
  }
  
  const message = failedCount > 0 
    ? `批量创建部分成功：成功${successCount}个，失败${failedCount}个`
    : `批量创建全部成功：共创建${successCount}个成品`
  
  res.status(201).json({
    success: true,
    message,
    data: {
      success_count: successCount,
      failed_count: failedCount,
      created_products: createdProducts,
      failed_products: failedProducts
    }
  })
}))

export default router