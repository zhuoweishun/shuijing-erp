import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'
// 移除fieldConverter导入，直接使用snake_case
import { 
  findOrCreateSku, 
  createSkuInventoryLog} from '../utils/skuUtils.js'

const router = Router()



// 测试路由（无需认证）- 必须在/:id路由之前定义
router.get('/test', (_req, res) => {
  console.log('🔥 [TEST] 测试路由被调用!')
  res.json({ success: true, message: '测试路由正常工作' })
})

// 测试路由（需要认证）- 必须在/:id路由之前定义
router.get('/test-auth', authenticateToken, (_req, res) => {
  console.log('🔥 [TEST-AUTH] 认证测试路由被调用!')
  res.json({ success: true, message: '认证测试路由正常工作' })
})

// 获取可用原材料列表 - 必须在/:id路由之前定义
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
router.get('/materials', authenticateToken, asyncHandler(async (req, res) => {
  console.log('🔍 [Materials API] 接口被调用:', {
    query: req.query,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  })
  
  const { 
    search, 
    material_types,
    available_only = 'true', 
    min_quantity = 1 
  } = req.query
  
  try {
    // 构建查询条件，支持所有产品类型
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    
    if (search) {
      whereClause += ' AND m.material_name LIKE ?'
      params.push(`%${search}%`)
    }
    
    // 材料类型筛选 - 处理字符串或数组格式
    let materialTypesArray: string[] = []
    if (material_types) {
      if (typeof material_types === 'string') {
        // 如果是逗号分隔的字符串，分割成数组
        materialTypesArray = (material_types as string).split(',').map(type => type.trim()).filter(Boolean)
      } else if (Array.isArray(material_types)) {
        materialTypesArray = material_types as string[]
      }
    }
    
    if (materialTypesArray.length > 0) {
      const placeholders = materialTypesArray.map(() => '?').join(',')
      whereClause += ` AND m.material_type IN (${placeholders})`
      params.push(...materialTypesArray)
    }
    
    // 直接查询materials表，这是独立的库存数据表
    const materialsQuery = `
      SELECT 
        m.id,
        m.material_code,
        m.material_name,
        m.material_type,
        m.bead_diameter,
        m.accessory_specification,
        m.finished_material_specification,
        m.quality,
        m.original_quantity,
        m.used_quantity,
        m.remaining_quantity as available_quantity,
        m.inventory_unit,
        m.unit_cost,
        m.total_cost,
        m.photos,
        s.name as supplier_name,
        m.material_date,
        m.notes,
        m.created_at,
        m.updated_at
      FROM materials m
      LEFT JOIN suppliers s ON m.supplier_id = s.id
      ${whereClause}
      ${available_only === 'true' ? 'AND m.remaining_quantity >= ?' : ''}
      ORDER BY m.created_at DESC
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
      firstResult: materialsResult[0] || null,
      allIds: materialsResult.slice(0, 3).map(m => ({ id: m.id, name: m.material_name }))
    })
    
    // 格式化materials表数据
    const formattedMaterials = materialsResult.map(material => {
      // 构建响应对象，使用materials表的字段结构
      const converted = {
        id: material.id,
        material_id: material.id, // 兼容前端
        material_code: material.material_code,
        material_name: material.material_name,
        material_type: material.material_type,
        quality: material.quality,
        
        // 规格信息
        bead_diameter: material.bead_diameter,
        accessory_specification: material.accessory_specification,
        finished_material_specification: material.finished_material_specification,
        specification: material.accessory_specification || material.finished_material_specification, // 兼容前端
        
        // 库存信息
        original_quantity: Number(material.original_quantity),
        used_quantity: Number(material.used_quantity),
        available_quantity: Number(material.available_quantity),
        remaining_quantity: Number(material.available_quantity), // 兼容前端
        inventory_unit: material.inventory_unit,
        
        // 成本信息
        unit_cost: Number(material.unit_cost) || 0,
        total_cost: Number(material.total_cost) || 0,
        
        // 其他信息
        photos: material.photos,
        supplier_name: material.supplier_name,
        material_date: material.material_date,
        notes: material.notes,
        created_at: material.created_at,
        updated_at: material.updated_at
      }
      
      // 根据用户权限过滤敏感信息
      if ((req.user?.role || "USER") === 'EMPLOYEE') {
        // 注意：unit_cost保留给SKU制作功能使用，不过滤
        converted.supplier_name = null
        converted.total_cost = 0
      }
      
      return converted
    })
    
    console.log('🔍 [Materials API] 准备返回响应:', {
      materialsCount: formattedMaterials.length,
      success: true
    })
    
    return res.json({
      success: true,
      message: '获取可用原材料成功',
      data: {
        materials: formattedMaterials,
        total_count: formattedMaterials.length
      }
    })
  } catch (error) {
    console.error('获取原材料失败:', error)
    return res.status(500).json({
      success: false,
      message: '获取原材料失败',
      error: {
        code: 'MATERIALS_FETCH_ERROR',
        details: (error as Error).message,
        stack: (error as Error).stack
      }
    })
  }
  // 函数结束
  // 函数结束
}))

// 旧的验证schema已删除，新的接口使用手动验证

// 获取销售列表
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
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
    'created_at': 'created_at',
    'updated_at': 'updated_at',
    'purchase_name': 'name',
    'product_code': 'product_code',
    'unit_price': 'unit_price',
    'total_value': 'totalValue'
  }
  
  const dbSortField = fieldMapping[sort_by as string] || sort_by as string
  
  const [products, total] = await Promise.all([
    prisma.product.findMany({
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
                purchase_name: true,
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
    }),
    prisma.product.count({ where })
  ])
  
  // 直接使用蛇形命名，过滤敏感信息
  const filteredProducts = products.map((product, _index) => {
    // 构建响应对象，所有字段已经是蛇形命名
    const converted = {
      ...product,
      created_at: product.created_at,
      updated_at: product.updated_at
    }
    
    if ((req.user?.role || "USER") === 'EMPLOYEE') {
      // 雇员不能查看成本相关信息
      converted.unit_price = new Decimal(0)
      converted.total_value = new Decimal(0)
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
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
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
              purchase_name: true,
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
        price_per_bead: usage.purchase?.price_per_bead
      }
    }))
  }
  
  if ((req.user?.role || "USER") === 'EMPLOYEE') {
    converted.unit_price = new Decimal(0)
    converted.total_value = new Decimal(0)
    // 过滤原材料价格信息
    converted.material_usages = converted.material_usages?.map((usage: any) => ({
      ...usage,
      purchase: {
        ...usage.purchase,
        price_per_bead: null
      }
    }))
  }
  
  return res.json({
    success: true,
    message: '获取成品记录成功',
    data: converted
  })
}))

// 成品销毁（含库存回滚）
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
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
                purchase_name: true,
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
    const restoredMaterials = product.material_usages.map((usage: any) => ({
      purchase_id: usage.purchase_id,
      purchase_name: usage.purchase?.purchase_name,
      bead_diameter: usage.purchase?.bead_diameter,
      quality: usage.purchase?.quality,
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
  
  return res.json({
    success: true,
    message: '成品销毁成功，原材料已回滚',
    data: result
  })
}))

// 更新成品记录
router.put('/:id', authenticateToken, asyncHandler(async (_req, res) => {
  res.json({
    success: false,
    message: '更新成品记录功能正在开发中...',
    error: {
      code: 'NOT_IMPLEMENTED',
      details: '该功能尚未实现'
    }
  })
  // 函数结束
  // 函数结束
}))

// 计算制作成本预估
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
router.post('/cost', authenticateToken, asyncHandler(async (req, res) => {
  const { materials, labor_cost = 0, craft_cost = 0} = req.body
  
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
    const materialRecord = await prisma.material.findUnique({
      where: { id: material.material_id }
    })
    

    if (!materialRecord) {
      return res.status(400).json({
        success: false,
        message: `原材料记录 ${material.material_id} 不存在`
      })
    }
    
    const usedBeads = material.quantity_used_beads || 0
    const usedPieces = material.quantity_used_pieces || 0
    
    let materialCost = 0
    if (usedBeads > 0 && materialRecord.unit_cost) {
      materialCost += usedBeads * Number(materialRecord.unit_cost)
    }
    if (usedPieces > 0 && materialRecord.unit_cost) {
      materialCost += usedPieces * Number(materialRecord.unit_cost)
    }
    
    totalMaterialCost += materialCost
    materialDetails.push({
      material_id: material.material_id,
      material_name: materialRecord.material_name,
      used_beads: usedBeads,
      used_pieces: usedPieces,
      unit_cost: materialRecord.unit_cost || 0,
      material_cost: materialCost
    })
  }
  
  // 计算总成本
  const totalCost = totalMaterialCost + Number(labor_cost) + Number(craft_cost)
  
  // 计算建议售价
  const data = req.body;

  const profit_margin = data.profit_margin || 0;
  const profitMultiplier = 1 + (Number(profit_margin) / 100)
  const suggestedPrice = totalCost * profitMultiplier
  
  return res.json({
    success: true,
    message: '成本计算成功',
    data: {
      material_cost: totalMaterialCost,
      labor_cost: Number(labor_cost),
      craft_cost: Number(craft_cost),
      total_price: totalCost,
      profit_margin: Number(profit_margin),
      pricing_suggestion: {
        suggested_price: Math.round(suggestedPrice * 100) / 100,
        min_price: Math.round(totalCost * 1.1 * 100) / 100,
        max_price: Math.round(totalCost * 2 * 100) / 100
      },
      material_details: materialDetails
    }
  })
  // 函数结束
  // 函数结束
}))

// 创建成品记录（重写原有的POST /接口）
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const {
    sku_name,
    description,
    specification,
    materials,
    labor_cost = 0,
    craft_cost = 0,
    selling_price,
    photos = []
  } = req.body
  
  // 验证必填字段
  if (!sku_name || !materials || !Array.isArray(materials) || materials.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供SKU名称和原材料列表'
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
      const materialRecord = await tx.material.findUnique({
        where: { id: material.material_id }
      })
      

      if (!materialRecord) {
        throw new Error(`原材料记录 ${material.material_id} 不存在`)
      }
      
      // 根据材料类型计算库存和需求量
      const available_quantity = materialRecord.remaining_quantity || 0
      const requiredQuantityBeads = material.quantity_used_beads || 0
      const requiredQuantityPieces = material.quantity_used_pieces || 0
      const totalRequired = requiredQuantityBeads + requiredQuantityPieces
      
      if (available_quantity < totalRequired) {
        const unit = materialRecord.material_type === 'LOOSE_BEADS' || materialRecord.material_type === 'BRACELET' ? '颗' :
                    materialRecord.material_type === 'ACCESSORIES' ? '片' : '件'
        throw new Error(`原材料库存不足，可用：${available_quantity}${unit}，需要：${totalRequired}${unit}`)
      }
      
      // 计算原材料成本
      const materialUnitCost = Number(materialRecord.unit_cost) || 0;
      const materialUsedQuantity = requiredQuantityBeads + requiredQuantityPieces;
      
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
      // 获取完整的材料信息
      const materialRecord = await tx.material.findUnique({
        where: { id: material.material_id }
      })
      
      if (!materialRecord) {
        throw new Error(`原材料记录不存在，material_id: ${material.material_id}`)
      }
      
      const usedQuantity = (material.quantity_used_beads || 0) + (material.quantity_used_pieces || 0)
      materialUsagesForSku.push({
        material: {
          material_name: materialRecord.material_name,
          material_type: materialRecord.material_type,
          quality: materialRecord.quality,
          bead_diameter: materialRecord.bead_diameter,
          accessory_specification: materialRecord.accessory_specification,
          finished_material_specification: materialRecord.finished_material_specification
        },
        quantity_used_beads: material.quantity_used_beads || 0,
        quantity_used_pieces: material.quantity_used_pieces || 0,
        quantity_used: usedQuantity
      })
    }
    
    // 查找或创建SKU
    const { sku, is_new_sku, log_created } = await findOrCreateSku({
      material_usages: materialUsagesForSku,
      sku_name: sku_name,
      selling_price: Number(selling_price),
      user_id: req.user!.id,
      tx: tx,
      additional_data: {
        photos: photos.length > 0 ? photos : null,
        description: description || null,
        specification: specification || null,
        material_cost: totalMaterialCost,
        labor_cost: Number(labor_cost || 0),
        craft_cost: Number(craft_cost || 0),
        total_cost: totalCost,
        profit_margin: Number(selling_price) > 0 
          ? ((Number(selling_price) - totalCost) / Number(selling_price) * 100)
          : 0,
        reference_type: 'PRODUCT',
        notes: `组合制作模式创建成品: ${sku_name}`
      }
    })
    
    // 创建成品记录并关联到SKU
    const product = await tx.product.create({
      data: {
        product_code: null, // 不再使用单独的成品编号
        name: sku_name,
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
      const usedBeads = material.quantity_used_beads || 0
      const usedPieces = material.quantity_used_pieces || 0
      const totalUsed = usedBeads + usedPieces
      
      if (totalUsed > 0) {
        // 获取材料记录
        const materialRecord = await tx.material.findUnique({
          where: { id: material.material_id }
        })
        
        if (!materialRecord) {
          throw new Error(`原材料记录不存在，material_id: ${material.material_id}`)
        }
        
        const unitCost = materialRecord.unit_cost || 0
        
        await tx.materialUsage.create({
          data: {
            material_id: material.material_id,
            sku_id: sku.id,
            quantity_used: totalUsed,
            unit_cost: unitCost,
            total_cost: unitCost * totalUsed,
            action: 'CREATE'
          }
        })
        
        // 注意：不需要手动更新材料库存，数据库触发器会自动处理
        // 触发器会在MaterialUsage记录插入后自动更新used_quantity和remaining_quantity
      }
    }
    
    // 只在创建新SKU时创建库存变更日志，避免重复记录
    if (is_new_sku && !log_created) {
      await createSkuInventoryLog({
        sku_id: sku.id!,
        action: 'CREATE',
        quantity_change: 1,
        quantity_before: 0,
        quantity_after: 1,
        reference_type: 'PRODUCT',
        reference_id: product.id,
        notes: `组合制作模式创建新SKU: ${sku_name}`,
        user_id: req.user!.id,
        tx: tx
      })
    }
    
    return {
      id: product.id,
      sku_name,
      sku_code: sku.sku_code,
      sku_id: sku.id,
      is_new_sku: is_new_sku,
      total_price: totalCost,
      selling_price: Number(selling_price),
      profit: Number(selling_price) - totalCost,
      profit_margin: ((Number(selling_price) - totalCost) / Number(selling_price) * 100).toFixed(2),
      sku_total_quantity: sku.total_quantity,
      sku_available_quantity: sku.available_quantity
    }
  })
  
  return res.status(201).json({
    success: true,
    message: '成品创建成功',
    data: result
  })
  // 函数结束
  // 函数结束
}))

// 批量创建成品记录（直接转化模式）
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
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
    if (!product.material_id || !product.sku_name || !product.selling_price || product.selling_price <= 0) {
      return res.status(400).json({
        success: false,
        message: `第${i + 1}个成品信息不完整：需要原材料ID、SKU名称和有效的销售价格`
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
        // 添加调试日志
        console.log('🔍 [后端调试] 查询原材料:', {
          material_id: productData.material_id,
          material_id_type: typeof productData.material_id
        })
        
        // 验证原材料存在性和库存
        console.log('🔍 [后端调试] 开始查询原材料:', {
          material_id: productData.material_id,
          material_id_type: typeof productData.material_id,
          material_id_length: productData.material_id?.length
        })
        
        const materialRecord = await tx.material.findUnique({
          where: { id: productData.material_id }
        })
        
        console.log('🔍 [后端调试] 查询结果:', {
          found: !!materialRecord,
          material_id: materialRecord?.id,
          material_name: materialRecord?.material_name,
          material_type: materialRecord?.material_type,
          query_id: productData.material_id
        })

        if (!materialRecord) {
          throw new Error(`原材料记录不存在，material_id: ${productData.material_id}`)
        }
        
        // 检查是否为成品类型的原材料
        if (materialRecord.material_type !== 'FINISHED_MATERIAL') {
          throw new Error(`只能使用成品类型的原材料进行直接转化`)
        }
        
        // 检查库存
        const available_quantity = materialRecord.remaining_quantity || 0
        
        if (available_quantity < 1) {
          throw new Error(`原材料库存不足，可用：${available_quantity}件，需要：1件`)
        }
        
        // 计算材料成本
        const materialCost = Number(materialRecord.unit_cost) || 0;
        
        const laborCost = productData.labor_cost || 0;
        const craftCost = productData.craft_cost || 0;
        const totalCost = Number(materialCost) + Number(laborCost) + Number(craftCost);
        
        // 处理图片继承逻辑（直接转化模式）
        let productImages = null;
        if (productData.photos && productData.photos.length > 0) {
          // 如果前端传递了图片，使用前端图片
          productImages = JSON.stringify(productData.photos);
        } else if (materialRecord.photos) {
          // 如果前端没有图片，从原材料继承图片
          let photosArray = materialRecord.photos;
          
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
        // 移除未使用的变量
        
        // 移除未使用的变量

        // 准备原材料使用记录（用于SKU标识生成）
        // 添加额外的安全检查
        if (!materialRecord || !materialRecord.material_name) {
          throw new Error(`原材料记录数据不完整，material_id: ${productData.material_id}`);
        }
        
        const materialUsages = [{
          material: {
            material_name: materialRecord.material_name,
            material_type: materialRecord.material_type,
            quality: materialRecord.quality || null,
            bead_diameter: materialRecord.bead_diameter || null,
            specification: materialRecord.specification || null
          },
          quantity_used_beads: 0,
          quantity_used_pieces: 1
        }];

        // 查找或创建SKU
        const { sku, is_new_sku, log_created } = await findOrCreateSku({
          material_usages: materialUsages,
          sku_name: productData.sku_name,
          selling_price: Number(productData.selling_price),
          user_id: req.user!.id,
          tx: tx,
          additional_data: {
            photos: productImages ? JSON.parse(productImages) : null,
            description: productData.description || null,
            specification: productData.specification || null,
            materialCost: materialCost,
            laborCost: laborCost,
            craftCost: craftCost,
            totalCost: totalCost,
            profitMargin: Number(productData.selling_price) > 0 
              ? ((Number(productData.selling_price) - totalCost) / Number(productData.selling_price) * 100).toFixed(1)
              : '0.0',
            reference_type: 'PRODUCT',
            notes: `直接转化模式创建SKU: ${productData.sku_name}`
          }
        })
        
        // 创建SKU记录并关联到SKU
        const product = await tx.product.create({
          data: {
            product_code: null, // 不再使用单独的成品编号
            name: productData.sku_name,
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
        
        // 直接使用已验证的materialRecord
        const material = materialRecord;

        // 创建原材料使用记录
        await tx.materialUsage.create({
          data: {
            material_id: material.id,
            sku_id: sku.id,
            quantity_used: 1,
            unit_cost: material.unit_cost,
            total_cost: material.unit_cost * 1,
            action: 'CREATE'
          }
        })
        
        // 注意：不需要手动更新材料库存，数据库触发器会自动处理
        // 触发器会在MaterialUsage记录插入后自动更新used_quantity和remaining_quantity
        
        // 只在创建新SKU时创建库存变更日志，避免重复记录
        if (is_new_sku && !log_created) {
          await createSkuInventoryLog({
            sku_id: sku.id,
            action: 'CREATE',
            quantity_change: 1,
            quantity_before: 0,
            quantity_after: 1,
            reference_type: 'PRODUCT',
            reference_id: product.id,
            notes: `直接转化模式创建新SKU: ${productData.sku_name}`,
            user_id: req.user!.id,
            tx: tx
          })
        }
        
        return {
          id: product.id,
          sku_code: sku.sku_code,
          sku_id: sku.id,
          is_new_sku: is_new_sku,
          sku_name: productData.sku_name,
          material_cost: Number(materialCost),
          total_price: totalCost,
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
  
  return res.status(201).json({
    success: true,
    message,
    data: {
      success_count: successCount,
      failed_count: failedCount,
      created_products: createdProducts,
      failed_products: failedProducts
    }
  })
  // 函数结束
  // 函数结束
}))

export default router