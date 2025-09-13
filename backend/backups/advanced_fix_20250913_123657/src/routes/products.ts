import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
// 移除fieldConverter导入，直接使用snake_case
import { 
  findOrCreateSku, 
  createSkuInventoryLog,
  generateMaterialSignature 
} from '../utils/skuUtils.js'

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
        p.purchaseCode as purchase_code,
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
        p.created_at as created_at,
        p.updated_at as updated_at
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchaseId
      LEFT JOIN suppliers s ON p.supplierId = s.id
      ${whereClause}
      GROUP BY p.id, p.purchaseCode, p.productName, p.productType, p.beadDiameter, p.specification, p.quality, 
               p.totalBeads, p.pieceCount, p.quantity, p.beadsPerString, p.pricePerBead, p.pricePerGram, 
               p.totalPrice, p.unitPrice, p.weight, p.photos, s.name, p.created_at, p.updated_at
      ${available_only === 'true' ? 'HAVING available_quantity >= ?' : ''}
      ORDER BY p.created_at DESC
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
    
    // 直接使用蛇形命名格式，无需转换
    const formattedMaterials = materialsResult.map(material => {
      // 构建响应对象，所有字段已经是蛇形命名
      const converted = {
        ...material,
        purchase_id: material.id,
        available_quantity: Number(material.available_quantity),
        unit_cost: Number(material.unit_cost) || 0,
        
        // 添加手串相关的重要字段映射
        quantity: material.quantity, // 串数
        beads_per_string: material.beadsPerString, // 每串颗数
        total_beads: material.totalBeads, // 总颗数
        piece_count: material.pieceCount, // 片数/件数
        used_beads: Number(material.used_beads), // 已用颗数
        used_pieces: Number(material.used_pieces) // 已用片数/件数
      }
      
      // 计算剩余数量（用于验证）
      if (material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET') {
        converted.remaining_beads = (material.totalBeads || 0) - Number(material.used_beads)
      } else {
        converted.remaining_pieces = (material.pieceCount || 0) - Number(material.used_pieces)
      }
      
      // 根据用户权限过滤敏感信息
      if (req.user?.role === 'EMPLOYEE') {
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

// 旧的验证schema已删除，新的接口使用手动验证

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
    // 处理数组格式的status参数
    if (Array.isArray(status)) {
      where.status = {
        in: status
      }
    } else {
      where.status = status
    }
  }
  
  // 字段名映射：前端snake_case -> 数据库camelCase
  const fieldMapping: Record<string, string> = {
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
    'product_name': 'name',
    'product_code': 'productCode',
    'unit_price': 'unitPrice',
    'total_value': 'totalValue'
  }
  
  const dbSortField = fieldMapping[sort_by as string] || sort_by as string
  
  const products = await prisma.product.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          user_name: true
        }
      },
      material_usages: {
        include: {
          purchase: {
            select: {
              id: true,
              product_name: true,
              bead_diameter: true,
              specification: true,
              quality: true
            }
          }
        }
      }
    },
    orderBy: {
      [dbSortField]: sort_order
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit)
  })
  
  const total = await prisma.product.count({ where })
  
  // 直接使用蛇形命名，过滤敏感信息
  const filteredProducts = products.map((product, index) => {
    // 构建响应对象，所有字段已经是蛇形命名
    const converted = {
      ...product,
      created_at: product.created_at,
      updated_at: product.updated_at
    }
    
    if (req.user?.role === 'EMPLOYEE') {
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

// 旧的创建成品记录接口已被下方的完整实现替代
// 此接口已注释掉以避免路由冲突

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
          user_name: true
        }
      },
      material_usages: {
          include: {
            purchase: {
              select: {
                id: true,
                product_name: true,
                bead_diameter: true,
                specification: true,
                quality: true,
                price_per_bead: true
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
  
  // 直接使用蛇形命名，过滤敏感信息
  const converted = {
    ...product,
    created_at: product.created_at,
    updated_at: product.updated_at,
    material_usages: product.material_usages?.map((usage: any) => ({
      ...usage,
      created_at: usage.created_at,
      updated_at: usage.updated_at,
      purchase: {
        ...usage.purchase,
        price_per_bead: usage.purchase.price_per_bead
      }
    }))
  }
  
  if (req.user?.role === 'EMPLOYEE') {
    converted.unit_price = null
    converted.total_value = null
    // 过滤原材料价格信息
    converted.material_usages = converted.material_usages?.map((usage: any) => ({
      ...usage,
      purchase: {
        ...usage.purchase,
        price_per_bead: null
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
        material_usages: {
          include: {
            purchase: {
              select: {
                id: true,
                product_name: true,
                bead_diameter: true,
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
    const restoredMaterials = product.material_usages.map(usage => ({
      purchase_id: usage.purchase_id,
      product_name: usage.purchase.product_name,
      bead_diameter: usage.purchase.bead_diameter,
      quality: usage.purchase.quality,
      restored_quantity: usage.quantity_used
    }))
    
    // 删除原材料使用记录（自动回滚库存）
    await tx.materialUsage.deleteMany({
      where: { product_id: id }
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
    
    const usedBeads = material.quantity_used || 0
    const usedPieces = material.quantity_used || 0
    
    let materialCost = 0
    if (usedBeads > 0 && purchase.price_per_bead) {
      materialCost += usedBeads * Number(purchase.price_per_bead)
    }
    if (usedPieces > 0 && purchase.price_per_piece) {
      materialCost += usedPieces * Number(purchase.price_per_piece)
    }
    
    totalMaterialCost += materialCost
    materialDetails.push({
      purchase_id: material.purchase_id,
      product_name: purchase.product_name,
      used_beads: usedBeads,
      used_pieces: usedPieces,
      unit_cost: purchase.price_per_bead || purchase.price_per_piece || 0,
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
        include: { material_usages: true }
      })
      
      if (!purchase) {
        throw new Error(`采购记录 ${material.purchase_id} 不存在`)
      }
      
      // 根据产品类型计算已使用数量和可用库存
      let usedQuantity = 0
      let availableQuantity = 0
      let requiredQuantity = 0
      
      if (purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'BRACELET') {
        // 散珠和手串按颗计算
        usedQuantity = purchase.material_usages.reduce(
          (sum, usage) => sum + usage.quantity_used, 0
        )
        availableQuantity = (purchase.total_beads || 0) - usedQuantity
        requiredQuantity = material.quantity_used || 0
      } else if (purchase.product_type === 'ACCESSORIES' || purchase.product_type === 'FINISHED') {
        // 饰品配件和成品按片/件计算
        usedQuantity = purchase.material_usages.reduce(
          (sum, usage) => sum + usage.quantity_used, 0
        )
        availableQuantity = (purchase.piece_count || 0) - usedQuantity
        requiredQuantity = material.quantity_used || 0
      }
      
      if (availableQuantity < requiredQuantity) {
        const unit = purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'BRACELET' ? '颗' : 
                    purchase.product_type === 'ACCESSORIES' ? '片' : '件'
        throw new Error(`原材料 ${purchase.product_name} 库存不足，可用：${availableQuantity}${unit}，需要：${requiredQuantity}${unit}`)
      }
      
      // 计算原材料成本（根据产品类型和使用数量）
      let materialUnitCost = 0;
      let materialUsedQuantity = 0;
      
      if (purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'BRACELET') {
        // 散珠和手串使用每颗价格和颗数
        materialUnitCost = Number(purchase.price_per_bead) || 0;
        materialUsedQuantity = material.quantity_used || 0;
      } else if (purchase.product_type === 'ACCESSORIES' || purchase.product_type === 'FINISHED') {
        // 饰品配件和成品使用每片/每件价格和片数/件数
        materialUnitCost = Number(purchase.price_per_piece) || 0;
        materialUsedQuantity = material.quantity_used || 0;
      }
      
      // 如果单价为0，尝试使用其他价格字段作为备选
      if (materialUnitCost === 0) {
        materialUnitCost = Number(purchase.unit_price) || Number(purchase.total_price) || 0;
        // 如果使用总价，需要根据总数量计算单价
        if (materialUnitCost === Number(purchase.total_price) && purchase.piece_count > 0) {
          materialUnitCost = materialUnitCost / purchase.piece_count;
        }
      }
      
      // 累加材料成本：使用数量 × 单价
      if (materialUsedQuantity > 0 && materialUnitCost > 0) {
        totalMaterialCost += materialUsedQuantity * materialUnitCost;
      }
    }
    
    // 计算总成本
    const totalCost = totalMaterialCost + Number(labor_cost) + Number(craft_cost)
    
    // 准备原材料使用记录（用于SKU标识生成）
    const materialUsagesForSku = []
    for (const material of materials) {
      const purchase = await tx.purchase.findUnique({
        where: { id: material.purchase_id }
      })
      
      if (purchase) {
        materialUsagesForSku.push({
          quantity_used: material.quantity_used || 0,
          quantity_used: material.quantity_used || 0,
          purchase: {
            product_name: purchase.product_name,
            product_type: purchase.product_type,
            quality: purchase.quality,
            bead_diameter: purchase.bead_diameter,
            specification: purchase.specification
          }
        })
      }
    }
    
    // 查找或创建SKU
    // 计算SKU规格（从原材料推导）
    let skuSpecification = null;
    if (materialUsagesForSku.length > 0) {
      const firstMaterial = materialUsagesForSku[0].purchase;
      if (firstMaterial.product_type === 'LOOSE_BEADS' || firstMaterial.product_type === 'BRACELET') {
        // 散珠和手串优先使用bead_diameter
        if (firstMaterial.bead_diameter) {
          skuSpecification = `${firstMaterial.bead_diameter}mm`;
        } else if (firstMaterial.specification) {
          skuSpecification = `${firstMaterial.specification}mm`;
        }
      } else if (firstMaterial.product_type === 'ACCESSORIES' || firstMaterial.product_type === 'FINISHED') {
        // 饰品配件和成品优先使用specification
        if (firstMaterial.specification) {
          skuSpecification = `${firstMaterial.specification}mm`;
        } else if (firstMaterial.bead_diameter) {
          skuSpecification = `${firstMaterial.bead_diameter}mm`;
        }
      }
    }

    const { sku, isNewSku } = await findOrCreateSku({
      materialUsages: materialUsagesForSku,
      productName: product_name,
      sellingPrice: Number(selling_price),
      userId: req.user!.id,
      tx: tx,
      additionalData: {
        photos: photos.length > 0 ? JSON.stringify(photos) : null,
        description: description,
        specification: skuSpecification,
        materialCost: totalMaterialCost,
        laborCost: Number(labor_cost),
        craftCost: Number(craft_cost),
        totalCost: totalCost,
        profitMargin: Number(selling_price) > 0 
          ? ((Number(selling_price) - totalCost) / Number(selling_price) * 100)
          : 0
      }
    })
    
    // 创建成品记录并关联到SKU
    const product = await tx.product.create({
      data: {
        product_code: null, // 不再使用单独的成品编号
        name: product_name,
        description: description || null,
        unit_price: Number(selling_price),
        total_value: totalCost,
        unit: '件',
        quantity: 1,
        images: photos.length > 0 ? JSON.stringify(photos) : null,
        notes: description || null,
        user_id: req.user!.id,
        sku_id: sku.id // 关联到SKU
      }
    })
    
    // 创建原材料使用记录
    for (const material of materials) {
      const usedBeads = material.quantity_used || 0
      const usedPieces = material.quantity_used || 0
      
      if (usedBeads > 0 || usedPieces > 0) {
        await tx.materialUsage.create({
          data: {
            purchase_id: material.purchase_id,
            product_id: product.id,
            quantity_used: usedBeads,
            quantity_used: usedPieces
          }
        })
      }
    }
    
    // 创建SKU库存变更日志
    await createSkuInventoryLog({
      skuId: sku.id,
      action: 'CREATE',
      quantityChange: 1,
      quantityBefore: sku.totalQuantity - 1,
      quantityAfter: sku.totalQuantity,
      referenceType: 'PRODUCT',
      referenceId: product.id,
      notes: `组合制作模式创建成品: ${product_name}`,
      userId: req.user!.id,
      tx: tx
    })
    
    return {
      id: product.id,
      product_name,
      sku_code: sku.sku_code,
      sku_id: sku.id,
      is_new_sku: isNewSku,
      total_cost: totalCost,
      selling_price: Number(selling_price),
      profit: Number(selling_price) - totalCost,
      profit_margin: ((Number(selling_price) - totalCost) / Number(selling_price) * 100).toFixed(2),
      sku_total_quantity: sku.total_quantity,
      sku_available_quantity: sku.available_quantity
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
          include: { material_usages: true }
        })
        
        if (!purchase) {
          throw new Error(`原材料记录不存在`)
        }
        
        // 检查是否为成品类型的原材料
        if (purchase.product_type !== 'FINISHED') {
          throw new Error(`只能使用成品类型的原材料进行直接转化`)
        }
        
        // 计算已使用数量和可用库存（成品按件计算）
        const usedQuantity = purchase.material_usages.reduce(
          (sum, usage) => sum + usage.quantity_used, 0
        )
        const availableQuantity = (purchase.piece_count || 0) - usedQuantity
        
        if (availableQuantity < 1) {
          throw new Error(`原材料库存不足，可用：${availableQuantity}件，需要：1件`)
        }
        
        // 计算材料成本（根据产品类型选择正确的价格字段）
        let materialCost = 0;
        if (purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'BRACELET') {
          // 散珠和手串使用每颗价格
          materialCost = Number(purchase.price_per_bead) || 0;
        } else if (purchase.product_type === 'ACCESSORIES' || purchase.product_type === 'FINISHED') {
          // 饰品配件和成品使用每片/每件价格
          materialCost = Number(purchase.price_per_piece) || 0;
        }
        
        // 如果上述字段都为空，尝试使用其他价格字段作为备选
        if (materialCost === 0) {
          materialCost = Number(purchase.unit_price) || Number(purchase.total_price) || 0;
        }
        
        const laborCost = productData.labor_cost || 0;
        const craftCost = productData.craft_cost || 0;
        const totalCost = Number(materialCost) + Number(laborCost) + Number(craftCost);
        
        // 处理图片继承逻辑（直接转化模式）
        let productImages = null;
        if (productData.photos && productData.photos.length > 0) {
          // 如果前端传递了图片，使用前端图片
          productImages = JSON.stringify(productData.photos);
        } else if (purchase.photos) {
          // 如果前端没有图片，从原材料继承图片
          // purchase.photos从数据库查询出来已经是数组对象，直接使用
          let photosArray = purchase.photos;
          
          // 确保是数组格式
          if (!Array.isArray(photosArray)) {
            photosArray = [photosArray];
          }
          
          // 过滤无效的URL
          photosArray = photosArray.filter(url => url && typeof url === 'string' && url.trim() !== '');
          
          if (photosArray.length > 0) {
            productImages = JSON.stringify(photosArray);
          }
        }
        
        // 准备原材料使用记录（用于SKU标识生成）
        const materialUsagesForSku = [{
          quantity_used: 0,
          quantity_used: 1,
          purchase: {
            product_name: purchase.product_name,
            product_type: purchase.product_type,
            quality: purchase.quality,
            bead_diameter: purchase.bead_diameter,
            specification: purchase.specification
          }
        }]
        
        // 计算SKU规格（从原材料推导）
        let skuSpecification = null;
        if (purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'BRACELET') {
          // 散珠和手串优先使用bead_diameter
          if (purchase.bead_diameter) {
            skuSpecification = `${purchase.bead_diameter}mm`;
          } else if (purchase.specification) {
            skuSpecification = `${purchase.specification}mm`;
          }
        } else if (purchase.product_type === 'ACCESSORIES' || purchase.product_type === 'FINISHED') {
          // 饰品配件和成品优先使用specification
          if (purchase.specification) {
            skuSpecification = `${purchase.specification}mm`;
          } else if (purchase.bead_diameter) {
            skuSpecification = `${purchase.bead_diameter}mm`;
          }
        }

        // 查找或创建SKU
        const { sku, isNewSku } = await findOrCreateSku({
          materialUsages: materialUsagesForSku,
          productName: productData.product_name,
          sellingPrice: Number(productData.selling_price),
          user_id: req.user!.id,
          tx: tx,
          additionalData: {
            photos: productImages,
            description: productData.description,
            specification: skuSpecification,
            materialCost: materialCost,
            laborCost: laborCost,
            craftCost: craftCost,
            totalCost: totalCost,
            profitMargin: Number(productData.selling_price) > 0 
              ? ((Number(productData.selling_price) - totalCost) / Number(productData.selling_price) * 100)
              : 0
          }
        })
        
        // 创建成品记录并关联到SKU
        const product = await tx.product.create({
          data: {
            product_code: null, // 不再使用单独的成品编号
            name: productData.product_name,
            description: productData.description || null,
            unit_price: Number(productData.selling_price),
            total_value: totalCost,
            unit: '件',
            quantity: 1,
            images: productImages,
            notes: productData.description || null,
            user_id: req.user!.id,
            sku_id: sku.id // 关联到SKU
          }
        })
        
        // 创建原材料使用记录
        await tx.materialUsage.create({
          data: {
            purchase_id: productData.material_id,
            product_id: product.id,
            quantity_used: 0,
            quantity_used: 1
          }
        })
        
        // 创建SKU库存变更日志
        await createSkuInventoryLog({
          sku_id: sku.id,
          action: 'CREATE',
          quantity_change: 1,
          quantity_before: sku.total_quantity - 1,
          quantity_after: sku.total_quantity,
          reference_type: 'PRODUCT',
          reference_id: product.id,
          notes: `直接转化模式创建成品: ${productData.product_name}`,
          user_id: req.user!.id,
          tx: tx
        })
        
        return {
          id: product.id,
          sku_code: sku.sku_code,
          sku_id: sku.id,
          is_new_sku: isNewSku,
          product_name: productData.product_name,
          material_cost: Number(materialCost),
          total_cost: totalCost,
          selling_price: Number(productData.selling_price),
          profit_margin: Number(productData.selling_price) > 0 
            ? ((Number(productData.selling_price) - totalCost) / Number(productData.selling_price) * 100).toFixed(1)
            : '0.0',
          status: 'AVAILABLE',
          sku_total_quantity: sku.total_quantity,
          sku_available_quantity: sku.available_quantity
        }
      })
      
      createdProducts.push(result)
      
    } catch (error) {
      console.error(`批量创建第${i + 1}个成品失败:`, error)
      failedProducts.push({
        material_id: productData.material_id,
        error: (error as Error).message,
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