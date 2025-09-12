import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate_token } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { filterSensitiveFields } from '../utils/fieldConverter.js'
import {
  find_or_create_sku,
  create_sku_inventory_log,
  generate_material_signature
} from '../utils/skuUtils.js'

const router = Router()



// 测试路由（无需认证）- 必须在/:id路由之前定义
router.get('/test', (req, res) => {
  console.log('🔥 [TEST] 测试路由被调用!')
  res.json({ success: true, message: '测试路由正常工作' })
})

// 测试路由（需要认证）- 必须在/:id路由之前定义
router.get('/test-auth', authenticate_token, (req, res) => {
  console.log('🔥 [TEST-AUTH] 认证测试路由被调用!')
  res.json({ success: true, message: '认证测试路由正常工作' })
})

// 获取可用原材料列表 - 必须在/:id路由之前定义
router.get('/materials', authenticate_token, asyncHandler(async (req, res) => {
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
      whereClause += ' AND p.product_name LIKE ?'  // 数据库字段保持不变，但概念上是materialName
      params.push(`%${search}%`)
    }
    
    // 原材料类型筛选 - 处理字符串或数组格式（包括半成品material和成品material）
    let materialTypesArray: string[] = []
    if (material_types) {  // 前端传入的参数名保持兼容
      if (typeof material_types === 'string') {
        // 如果是逗号分隔的字符串，分割成数组
        material_typesArray = material_types.split(',').map(type => type.trim()).filter(Boolean)
      } else if (Array.isArray(material_types)) {
        material_typesArray = material_types as string[]
      }
    }
    
    if (materialTypesArray.length > 0) {
      const placeholders = material_typesArray.map(() => '?').join(',')
      whereClause += ` AND p.material_type IN (${placeholders})`  // 数据库字段保持不变
      params.push(...materialTypesArray)
    }
    
    // 使用通用的库存计算逻辑，支持所有产品类型
    const materialsQuery = `
      SELECT 
        p.id,
        p.purchase_code as purchase_code,
    p.product_name as material_name,  -- 原材料名称（概念统一为material）
    p.material_type as material_type,  -- 原材料类型（LOOSE_BEADS/BRACELET/ACCESSORIES为半成品material，FINISHED为成品material）
    p.bead_diameter as bead_diameter,
        p.specification,
        p.quality,
        p.total_beads,
        p.piece_count,
        p.quantity,
        p.beads_per_string,
        COALESCE(SUM(mu.quantity_used), 0) as used_beads,
        COALESCE(SUM(mu.quantity_used), 0) as usedPieces,
        -- 根据原材料类型计算可用数量（半成品material和成品material）
        CASE 
          WHEN p.material_type = 'LOOSE_BEADS' THEN  -- 散珠半成品material
            GREATEST(0, COALESCE(p.piece_count, 0) - COALESCE(SUM(mu.quantity_used), 0))
          WHEN p.material_type = 'BRACELET' THEN     -- 手串半成品material
            GREATEST(0, COALESCE(p.total_beads, 0) - COALESCE(SUM(mu.quantity_used), 0))
          WHEN p.material_type = 'ACCESSORIES' THEN  -- 饰品配件半成品material
            GREATEST(0, COALESCE(p.piece_count, 0) - COALESCE(SUM(mu.quantity_used), 0))
          WHEN p.material_type = 'FINISHED' THEN     -- 成品material（成品原材料）
            GREATEST(0, COALESCE(p.piece_count, 0) - COALESCE(SUM(mu.quantity_used), 0))
          ELSE 0
        END as availableQuantity,
        -- 根据原材料类型计算单位成本
        CASE 
          WHEN p.material_type = 'LOOSE_BEADS' AND p.piece_count > 0 THEN 
            p.total_price / p.piece_count
          WHEN p.material_type = 'BRACELET' AND p.total_beads > 0 THEN 
            p.price_per_bead
          WHEN p.material_type IN ('ACCESSORIES', 'FINISHED') AND p.piece_count > 0 THEN 
            p.total_price / p.piece_count
          ELSE p.unit_price
        END as unitCost,
        p.price_per_bead as price_per_bead,
        p.price_per_gram as price_per_gram,
        p.total_price as total_price,
    p.unit_price as unit_price,
        p.weight,
        p.photos,
        s.name as supplier_name,
        p.created_at as created_at,
        p.updated_at as updated_at
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ${whereClause}
      GROUP BY p.id, p.purchase_code, p.product_name, p.material_type, p.bead_diameter, p.specification, p.quality, 
               p.total_beads, p.piece_count, p.quantity, p.beads_per_string, p.price_per_bead, p.price_per_gram, 
               p.total_price, p.unit_price, p.weight, p.photos, s.name, p.created_at, p.updated_at
      -- 注：productName在业务概念上是materialName，materialType在业务概念上是materialType
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
    
    const materialsResult = await prisma.$query_raw_unsafe(materialsQuery, ...(params || [])) as any[]
    
    console.log('🔍 [Materials API] SQL查询结果:', {
      resultCount: materialsResult.length,
      firstResult: materialsResult[0] || null
    })
    
    // 格式化原材料数据（统一使用material概念）
    const formattedMaterials = materialsResult.map(material => {
      const converted = {
        ...material,
        purchase_id: material.id,
        material_name: material.material_name, // 原材料名称（统一概念）
        material_type: material.material_type, // 原材料类型（半成品material或成品material）
        available_quantity: Number(material.available_quantity),
        unit_cost: Number(material.unit_cost) || 0
      }
      
      // SKU制作相关字段映射（支持两种制作模式）
      // 1. 半成品组合模式：使用LOOSE_BEADS、BRACELET、ACCESSORIES
      // 2. 直接转化模式：使用FINISHED成品material
      converted.quantity = material.quantity // 串数（手串类型）
      converted.beads_per_string = material.beads_per_string // 每串颗数
      converted.total_beads = material.total_beads // 总颗数
      converted.piece_count = material.piece_count // 片数/件数
      converted.used_beads = Number(material.used_beads) // 已用颗数
      converted.usedPieces = Number(material.usedPieces) // 已用片数/件数
      
      // 根据原材料类型计算剩余数量
      if (material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET') {
        // 半成品material：散珠和手串按颗数计算
        converted.remaining_beads = (material.total_beads || 0) - Number(material.used_beads)
      } else if (material.material_type === 'ACCESSORIES' || material.material_type === 'FINISHED') {
        // 半成品material（饰品配件）和成品material按片数/件数计算
        converted.remainingPieces = (material.piece_count || 0) - Number(material.usedPieces)
      }
      
      // 根据用户权限过滤敏感信息
      if (req.user!.role === 'EMPLOYEE') {
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
        details: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      }
    })
  }
}))

// 旧的验证schema已删除，新的接口使用手动验证

// 获取SKU销售列表
router.get('/', authenticate_token, asyncHandler(async (req, res) => {
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
  
  // 字段名映射：前端snake_case -> 数据库snake_case
  const fieldMapping: Record<string, string> = {
    'created_at': 'created_at',
    'updated_at': 'updated_at',
    'product_name': 'name',
    'productCode': 'productCode',
    'unit_price': 'unit_price',
    'total_value': 'total_value'
  }
  
  const dbSortField = fieldMapping[sort_by as string] || sort_by as string
  
  const products = await prisma.product.find_many({
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
  
  // 过滤敏感信息
  const filteredProducts = products.map((product, index) => {
    const converted = { ...product }
    
    if (req.user!.role === 'EMPLOYEE') {
      // 雇员不能查看成本相关信息
      delete (converted as any).unit_price
      delete (converted as any).total_value
    }
    
    return converted
  })
  
  res.json({
    success: true,
    message: '获取SKU销售列表成功',
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
  return
}))

// 旧的创建成品记录接口已被下方的完整实现替代
// 此接口已注释掉以避免路由冲突

// 获取单个成品记录
router.get('/:id', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  const product = await prisma.product.find_unique({
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
  
  // 过滤敏感信息
  const converted = { ...product }
  
  if (req.user!.role === 'EMPLOYEE') {
    delete (converted as any).unit_price
    delete (converted as any).total_value
  }
  
  res.json({
    success: true,
    message: '获取成品记录成功',
    data: converted
  })
  return
}))

// 成品销毁（含库存回滚）
router.delete('/:id/destroy', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 开启事务进行销毁操作
  const result = await prisma.$transaction(async (tx) => {
    // 查询成品及其原材料使用记录
    const product = await tx.product.find_unique({
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
    const restored_materials: any[] = []
    
    // 删除原材料使用记录（自动回滚库存）
    await tx.material_usage.delete_many({
      where: { product_id: id }
    })
    
    // 删除成品记录
    await tx.product.delete({
      where: { id }
    })
    
    return {
      destroyedProductId: id,
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
router.put('/:id', authenticate_token, asyncHandler(async (req, res) => {
  res.json({
    success: false,
    message: '更新成品记录功能正在开发中...',
    error: {
      code: 'NOT_IMPLEMENTED',
      details: '该功能尚未实现'
    }
  })
  return
}))

// 计算制作成本预估
router.post('/cost', authenticate_token, asyncHandler(async (req, res) => {
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
    const purchase = await prisma.purchase.find_unique({
      where: { id: material.purchase_id }
    })
    
    if (!purchase) {
      return res.status(400).json({
        success: false,
        message: `采购记录 ${material.purchase_id} 不存在`
      })
    }
    
    const used_beads = material.quantity_used_beads || 0
    const usedPieces = material.quantity_used_pieces || 0
    
    let material_cost = 0
    if (used_beads > 0 && purchase.price_per_bead) {
      material_cost += used_beads * Number(purchase.price_per_bead)
    }
    if (usedPieces > 0 && purchase.price_per_piece) {
      material_cost += usedPieces * Number(purchase.price_per_piece)
    }
    
    totalMaterialCost += materialCost
    materialDetails.push({
      purchase_id: material.purchase_id,
      product_name: purchase.product_name,
      used_beads: used_beads,
      usedPieces: usedPieces,
      unit_cost: purchase.price_per_bead || purchase.price_per_piece || 0,
      material_cost: material_cost
    })
  }
  
  // 计算总成本
  const total_cost = totalMaterialCost + Number(labor_cost) + Number(craft_cost)
  
  // 计算建议售价
  const profitMultiplier = 1 + (Number(profit_margin) / 100)
  const suggestedPrice = total_cost * profitMultiplier
  
  res.json({
    success: true,
    message: '成本计算成功',
    data: {
      material_cost: totalMaterialCost,
      labor_cost: Number(labor_cost),
      craft_cost: Number(craft_cost),
      total_cost: total_cost,
      profit_margin: Number(profit_margin),
      pricingSuggestion: {
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
        minPrice: Math.round(total_cost * 1.1 * 100) / 100,
        maxPrice: Math.round(total_cost * 2 * 100) / 100
      },
      materialDetails: materialDetails
    }
  })
  return
}))

// 创建成品记录（重写原有的POST /接口）
router.post('/', authenticate_token, asyncHandler(async (req, res) => {
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
      const purchase = await tx.purchase.find_unique({
        where: { id: material.purchase_id },
        include: { material_usages: true }
      })
      
      if (!purchase) {
        throw new Error(`采购记录 ${material.purchase_id} 不存在`)
      }
      
      // 根据产品类型计算已使用数量和可用库存
      let used_quantity = 0
      let available_quantity = 0
      let requiredQuantity = 0
      
      if (purchase.material_type === 'LOOSE_BEADS' || purchase.material_type === 'BRACELET') {// 散珠和手串按颗计算
        usedQuantity = purchase.material_usages.reduce(
          (sum, usage) => sum + usage.quantity_used, 0
        )
        available_quantity = (purchase.total_beads || 0) - used_quantity
        requiredQuantity = material.quantity_used_beads || 0
      } else if (purchase.material_type === 'ACCESSORIES' || purchase.material_type === 'FINISHED') {// 饰品配件和成品按片/件计算
        usedQuantity = purchase.material_usages.reduce(
          (sum, usage) => sum + usage.quantity_used, 0
        )
        available_quantity = (purchase.piece_count || 0) - used_quantity
        requiredQuantity = material.quantity_used_pieces || 0
      }
      
      if (available_quantity < requiredQuantity) {
        const unit = purchase.material_type === 'LOOSE_BEADS' || purchase.material_type === 'BRACELET' ? '颗' : 
                    purchase.material_type === 'ACCESSORIES' ? '片' : '件'
        throw new Error(`原材料 ${purchase.product_name} 库存不足，可用：${ available_quantity }${unit}，需要：${requiredQuantity}${unit}`)
      }
      
      // 计算原材料成本（根据产品类型和使用数量）
      let materialUnitCost = 0;
      let materialUsedQuantity = 0;
      
      if (purchase.material_type === 'LOOSE_BEADS' || purchase.material_type === 'BRACELET') {
        // 散珠和手串使用每颗价格和颗数
        materialUnitCost = Number(purchase.price_per_bead) || 0;
        materialUsedQuantity = material.quantity_used_beads || 0;
      } else if (purchase.material_type === 'ACCESSORIES' || purchase.material_type === 'FINISHED') {
        // 饰品配件和成品使用每片/每件价格和片数/件数
        materialUnitCost = Number(purchase.price_per_piece) || 0;
        materialUsedQuantity = material.quantity_used_pieces || 0;
      }
      
      // 如果单价为0，尝试使用其他价格字段作为备选
      if (materialUnitCost === 0) {
        materialUnitCost = Number(purchase.unit_price) || Number(purchase.total_price) || 0;
        // 如果使用总价，需要根据总数量计算单价
        if (materialUnitCost === Number(purchase.total_price) && (purchase.piece_count || 0) > 0) {
          materialUnitCost = materialUnitCost / (purchase.piece_count || 1);
        }
      }
      
      // 累加材料成本：使用数量 × 单价
      if (materialUsedQuantity > 0 && materialUnitCost > 0) {
        totalMaterialCost += materialUsedQuantity * materialUnitCost;
      }
    }
    
    // 计算总成本
    const total_cost = totalMaterialCost + Number(labor_cost) + Number(craft_cost)
    
    // 准备原材料使用记录（用于SKU标识生成）
    const materialUsagesForSku = []
    for (const material of materials) {
      const purchase = await tx.purchase.find_unique({
        where: { id: material.purchase_id }
      })
      
      if (purchase) {
        material_usagesForSku.push({
          quantity_used: (material.quantity_used_beads || 0) + (material.quantity_used_pieces || 0),
          purchase: {
            product_name: purchase.product_name,
            material_type: purchase.material_type,
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
      const firstMaterial = material_usagesForSku[0].purchase;
      if (firstMaterial.material_type === 'LOOSE_BEADS' || firstMaterial.material_type === 'BRACELET') {
        // 散珠和手串优先使用bead_diameter
        if (firstMaterial.bead_diameter) {
          skuSpecification = `${firstMaterial.bead_diameter}mm`;
        } else if (firstMaterial.specification) {
          skuSpecification = `${firstMaterial.specification}mm`;
        }
      } else if (firstMaterial.material_type === 'ACCESSORIES' || firstMaterial.material_type === 'FINISHED') {
        // 饰品配件和成品优先使用specification
        if (firstMaterial.specification) {
          skuSpecification = `${firstMaterial.specification}mm`;
        } else if (firstMaterial.bead_diameter) {
          skuSpecification = `${firstMaterial.bead_diameter}mm`;
        }
      }
    }

    const skuResult = await find_or_create_sku({
      material_usages: material_usagesForSku,
        product_name: product_name,
        selling_price: Number(selling_price),
      user_id: req.user!.id,
      tx: tx,
      additional_data: {
        photos: photos.length > 0 ? JSON.stringify(photos) : null,
        description: description,
        specification: skuSpecification,
        material_cost: totalMaterialCost,
            labor_cost: Number(labor_cost),
            craft_cost: Number(craft_cost),
        total_cost: total_cost,
        profit_margin: Number(selling_price) > 0 
              ? ((Number(selling_price) - total_cost) / Number(selling_price) * 100)
              : 0
      }
    })
    
    const sku = (skuResult as any).sku
     const is_new_sku = (skuResult as any).is_new_sku
    
    // 创建成品记录并关联到SKU
    const product = await tx.product.create({
      data: {
        product_code: null, // 不再使用单独的成品编号
        name: product_name,
        description: description || null,
        unit_price: Number(selling_price),
        total_value: total_cost,
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
      const used_beads = material.quantity_used_beads || 0
      const usedPieces = material.quantity_used_pieces || 0
      
      if (used_beads > 0 || usedPieces > 0) {
        await tx.material_usage.create({
          data: {
            material_id: material.purchase_id,
            product_id: product.id,
            quantity_used: used_beads || usedPieces,
            action: 'USE'
          }
        })
        
        // 将采购记录状态更新为USED（已使用）
        await tx.purchase.update({
          where: { id: material.purchase_id },
          data: { status: 'USED' }
        })
      }
    }
    
    // 创建SKU库存变更日志
    await create_sku_inventory_log({ sku_id: sku.id,
      action: 'CREATE',
      quantity_change: 1,
      quantity_before: sku.total_quantity - 1,
      quantity_after: sku.total_quantity,
      reference_type: 'PRODUCT',
      reference_id: product.id,
      notes: `组合制作模式创建成品: ${product_name}`,
      user_id: req.user!.id,
      tx: tx
    })
    
    return {
      id: product.id,
      product_name,
      sku_code: sku.sku_code,
      sku_id: sku.id,
      is_new_sku: is_new_sku,
      total_cost: total_cost,
      selling_price: Number(selling_price),
      profit: Number(selling_price) - total_cost,
      profit_margin: ((Number(selling_price) - total_cost) / Number(selling_price) * 100).toFixed(2),
      skuTotalQuantity: sku.total_quantity,
      skuAvailableQuantity: sku.available_quantity
    }
  })
  
  res.status(201).json({
    success: true,
    message: '成品创建成功',
    data: result
  })
  return
}))

// 批量创建成品记录（直接转化模式）
router.post('/batch', authenticate_token, asyncHandler(async (req, res) => {
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
  
  const created_products = []
  const failed_products = []
  
  // 逐个处理每个成品创建（避免事务过大）
  for (let i = 0; i < products.length; i++) {
    const productData = products[i]
    
    try {
      // 开启单个成品的事务
      const result = await prisma.$transaction(async (tx) => {
        // 验证原材料存在性和库存
        const purchase = await tx.purchase.find_unique({
          where: { id: productData.material_id },
          include: { material_usages: true }
        })
        
        if (!purchase) {
          throw new Error(`原材料记录不存在`)
        }
        
        // 检查是否为成品类型的原材料
        if (purchase.material_type !== 'FINISHED') {
          throw new Error(`只能使用成品类型的原材料进行直接转化`)
        }
        
        // 计算已使用数量和可用库存（成品按件计算）
        const used_quantity = purchase.material_usages.reduce(
          (sum, usage) => sum + usage.quantity_used, 0
        )
        const available_quantity = (purchase.piece_count || 0) - used_quantity
        
        if (available_quantity < 1) {
          throw new Error(`原材料库存不足，可用：${ available_quantity }件，需要：1件`)
        }
        
        // 计算材料成本（根据产品类型选择正确的价格字段）
        let material_cost = 0;
        if (purchase.material_type === 'FINISHED') {
          // 成品使用每件价格
          material_cost = Number(purchase.price_per_piece) || 0;
        } else if (purchase.material_type === 'FINISHED') {
          // 饰品配件和成品使用每片/每件价格
          material_cost = Number(purchase.price_per_piece) || 0;
        }
        
        // 如果上述字段都为空，尝试使用其他价格字段作为备选
        if (material_cost === 0) {
          material_cost = Number(purchase.unit_price) || Number(purchase.total_price) || 0;
        }
        
        const labor_cost = productData.labor_cost || 0;
        const craft_cost = productData.craft_cost || 0;
        const total_cost = Number(material_cost) + Number(labor_cost) + Number(craft_cost);
        
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
          quantity_used: 1,
          purchase: {
            material_name: purchase.product_name,  // 采购的原材料名称
            material_type: purchase.material_type,  // 采购的原材料类型
            quality: purchase.quality,
            bead_diameter: purchase.bead_diameter,
            specification: purchase.specification
          }
        }]
        
        // 计算SKU规格（从采购的原材料推导）
        let skuSpecification = null;
        if (purchase.material_type === 'FINISHED') {
          // 成品原料优先使用specification
          if (purchase.specification) {
            skuSpecification = `${purchase.specification}mm`;
          } else if (purchase.bead_diameter) {
            skuSpecification = `${purchase.bead_diameter}mm`;
          }
        } else if (purchase.material_type === 'FINISHED') {
          // 饰品配件和成品原料优先使用specification
          if (purchase.specification) {
            skuSpecification = `${purchase.specification}mm`;
          } else if (purchase.bead_diameter) {
            skuSpecification = `${purchase.bead_diameter}mm`;
          }
        }

        // 查找或创建SKU（库存管理单位）
        const skuResult = await find_or_create_sku({
          material_usages: material_usagesForSku,
          product_name: productData.product_name,  // 成品名称
          selling_price: Number(productData.selling_price),
          user_id: req.user!.id,
          tx: tx,
          additional_data: {
            photos: productImages,
            description: productData.description,
            specification: skuSpecification,
            material_cost: material_cost,
            labor_cost: labor_cost,
            craft_cost: craft_cost,
            total_cost: total_cost,
            profit_margin: Number(productData.selling_price) > 0 
              ? ((Number(productData.selling_price) - total_cost) / Number(productData.selling_price) * 100)
              : 0
          }
        })
        
        const sku = (skuResult as any).sku
         const is_new_sku = (skuResult as any).is_new_sku
        
        // 创建成品记录并关联到SKU（库存管理单位）
        const finishedProduct = await tx.product.create({
          data: {
            product_code: null, // 不再使用单独的成品编号
            name: productData.product_name,
            description: productData.description || null,
            unit_price: Number(productData.selling_price),
            total_value: total_cost,
            unit: '件',
            quantity: 1,
            images: productImages,
            notes: productData.description || null,
            user_id: req.user!.id,
            sku_id: sku.id // 关联到SKU（库存管理单位）
          }
        })
        
        // 创建原材料使用记录
        await tx.material_usage.create({
          data: {
            material_id: productData.material_id,
            product_id: finishedProduct.id,  // 关联到成品
            quantity_used: 1,
            action: 'USE'
          }
        })
        
        // 将采购记录状态更新为USED（已使用）
        await tx.purchase.update({
          where: { id: productData.material_id },
          data: { status: 'USED' }
        })
        
        // 创建SKU库存变更日志
        await create_sku_inventory_log({ sku_id: sku.id,
          action: 'CREATE',
          quantity_change: 1,
          quantity_before: sku.total_quantity - 1,
          quantity_after: sku.total_quantity,
          reference_type: 'FINISHED_PRODUCT',  // 明确指向成品
          reference_id: finishedProduct.id,
          notes: `直接转化模式创建成品: ${productData.product_name}`,
          user_id: req.user!.id,
          tx: tx
        })
        
        return {
          finishedProductId: finishedProduct.id,  // 成品ID
          sku_code: sku.sku_code,
          sku_id: sku.id,
          is_new_sku: is_new_sku,
          finishedProductName: productData.product_name,  // 成品名称
          material_cost: Number(material_cost),
          total_cost: total_cost,
          selling_price: Number(productData.selling_price),
          profit_margin: Number(productData.selling_price) > 0 
            ? ((Number(productData.selling_price) - total_cost) / Number(productData.selling_price) * 100).toFixed(1)
            : '0.0',
          status: 'AVAILABLE',
          skuTotalQuantity: sku.total_quantity,
          skuAvailableQuantity: sku.available_quantity
        }
      })
      
      created_products.push(result)
      
    } catch (error) {
      console.error(`批量创建第${i + 1}个成品失败:`, error)
      failed_products.push({
        material_id: productData.material_id,
        error: error instanceof Error ? error.message : '未知错误',
        error_code: 'CREATION_FAILED'
      })
    }
  }
  
  const success_count = created_products.length
  const failed_count = failed_products.length
  
  // 根据结果返回相应的状态码和消息
  if (success_count === 0) {
    return res.status(400).json({
      success: false,
      message: '批量创建全部失败',
      data: {
        success_count: 0,
        failed_count: failed_count,
        created_products: [],
        failed_products: failed_products
      }
    })
  }
  
  const message = failed_count > 0 
    ? `批量创建部分成功：成功${ success_count }个，失败${ failed_count }个`
    : `批量创建全部成功：共创建${ success_count }个成品`
  
  res.status(201).json({
    success: true,
    message,
    data: {
      success_count: success_count,
      failed_count: failed_count,
      created_products: created_products,
      failed_products: failed_products
    }
  })
  return
}))

export default router