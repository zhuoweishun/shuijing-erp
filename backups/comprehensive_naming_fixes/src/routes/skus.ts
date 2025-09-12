import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate_token } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { random_u_u_i_d, createHash } from 'crypto'
import {
  getSkuList, get_sku_details,
  adjust_sku_quantity,
  decrease_sku_quantity,
  create_sku_inventory_log
} from '../utils/skuUtils.js'

// 计算采购记录的剩余库存
const calculateRemainingQuantity = async (purchase: any, tx: any) => {
  // 获取该采购记录的总使用量（包括负数，正确处理退回情况）
  const totalUsage = await tx.material_usage.aggregate({
    where: { purchase_id: purchase.id },
    Sum: {
      quantity_used: true
    }
  })
  
  // 注意：这里使用代数和，负数MaterialUsage表示退回到库存
  const netUsedBeads = totalUsage.Sum.quantity_used || 0
  const netUsedPieces = totalUsage.Sum.quantity_used || 0
  
  // 根据产品类型计算原始库存和剩余库存
  let original_quantity = 0
  let remaining_quantity = 0
  
  switch (purchase.material_type) {case 'LOOSE_BEADS':
      originalQuantity = purchase.piece_count || 0
      remainingQuantity = originalQuantity - netUsedBeads
      break
    case 'BRACELET':
      originalQuantity = purchase.quantity || 0
      remainingQuantity = originalQuantity - netUsedBeads
      break
    case 'ACCESSORIES':
    case 'FINISHED':
      originalQuantity = purchase.piece_count || purchase.total_beads || 0
      // FINISHED类型需要同时计算两个字段，因为退回记录可能存储在quantityUsed中
      const netUsedTotal = netUsedBeads + netUsedPieces
      remainingQuantity = originalQuantity - netUsedTotal
      break
    default:
      // 对于其他类型，使用总颗数或片数，优先使用totalBeads
      originalQuantity = purchase.total_beads || purchase.piece_count || purchase.quantity || 0
      // 计算净使用量（正数表示消耗，负数表示退回）
      const netUsed = netUsedBeads + netUsedPieces
      remaining_quantity = original_quantity - netUsed
  }
  
  return Math.max(0, remainingQuantity)
}

const router = Router()

// 获取SKU列表
router.get('/', authenticate_token, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search = '', 
    status = 'ACTIVE' 
  } = req.query
  
  const result = await get_sku_list({
    page: Number(page),
    limit: Number(limit),
    search: String(search),
    status: String(status)
  })
  
  res.json({
    success: true,
    message: 'SKU列表获取成功',
    data: result
  })
}))

// 获取SKU详情
router.get('/:id', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  const userRole = req.user?.role
  
  const sku = await get_sku_details(id)
  
  if (!sku) {
    return res.status(404).json({
      success: false,
      message: 'SKU不存在'
    })
  }
  
  // 根据用户角色过滤敏感信息
  let filteredSku = { ...sku }
  if (userRole !== 'BOSS') {
    // 非管理员角色隐藏价格信息
    delete (filteredSku as any).selling_price
    delete (filteredSku as any).unit_price
    delete (filteredSku as any).total_value
    delete (filteredSku as any).total_cost
    delete (filteredSku as any).material_cost
    delete (filteredSku as any).labor_cost
    delete (filteredSku as any).craft_cost
    delete (filteredSku as any).profit_margin
  }
  
  res.json({
    success: true,
    message: 'SKU详情获取成功',
    data: filteredSku
  })
  return
}))

// 调整SKU库存
router.post('/:id/adjust', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { newQuantity, notes } = req.body
  
  // 验证输入
  const adjustSchema = z.object({
    new_quantity: z.number().int().min(0),
    notes: z.string().min(1, '请提供调整原因')
  })
  
  const validatedData = adjustSchema.parse({
    new_quantity: Number(newQuantity),
    notes: String(notes)
  })
  
  const result = await prisma.$transaction(async (tx) => {
    return await adjust_sku_quantity({ sku_id: id,
      new_quantity: validatedData.new_quantity,
      notes: validatedData.notes,
      user_id: req.user!.id,
      reference_type: 'PRODUCT',
      reference_id: '',
      tx: tx
    })
  })
  
  res.json({
    success: true,
    message: 'SKU库存调整成功',
    data: { sku_id: result.id,
      sku_code: result.sku_code,
      new_quantity: result.available_quantity,
      total_quantity: result.total_quantity
    }
  })
  return
}))

// 销售SKU（减少可售数量）
router.post('/:id/sell', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { 
    quantity = 1, 
    customer_name, 
    customer_phone, customer_address,
    sale_channel,
    reference_id, 
    notes,
    actual_total_price
  } = req.body
  
  // 验证输入
  const sellSchema = z.object({
    quantity: z.number().int().min(1),
    customer_name: z.string().min(2, '客户姓名至少需要2个字符'),
    customer_phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号格式'),
    customer_address: z.string().optional(),
    sale_channel: z.string().optional(),
    reference_id: z.string().optional(),
    notes: z.string().optional(),
    actual_total_price: z.number().positive().optional()
  })
  
  const validatedData = sellSchema.parse({
    quantity: Number(quantity),
    customer_name: String(customer_name),
    customer_phone: String(customer_phone),
    customer_address: customerAddress ? String(customer_address) : undefined,
    sale_channel: sale_channel ? String(sale_channel) : undefined,
    reference_id: reference_id ? String(reference_id) : undefined,
    notes: notes ? String(notes) : undefined,
    actual_total_price: actualTotalPrice ? Number(actual_total_price) : undefined
  })
  
  const result = await prisma.$transaction(async (tx) => {
    // 1. 查找或创建客户
    let customer = await tx.customer.findUnique({
      where: { phone: validatedData.customer_phone }
    })
    
    if (!customer) {
      customer = await tx.customer.create({
        data: {
          id: randomUUID(),
          name: validatedData.customer_name,
          phone: validatedData.customer_phone,
          address: validatedData.customer_address,
          total_purchases: 0,
          total_orders: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      })
    } else if (customer.name !== validatedData.customer_name || customer.address !== validatedData.customer_address) {
      // 更新客户信息（如果有变化）
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          name: validatedData.customer_name,
          address: validatedData.customer_address || customer.address,
          updated_at: new Date()
        }
      })
    }
    
    // 2. 获取SKU信息
    const sku = await tx.product_sku.findUnique({
      where: { id }
    })
    
    if (!sku) {
      throw new Error('SKU不存在')
    }
    
    // 使用实际销售总价，如果没有提供则使用SKU单价计算
    const total_price = validatedData.actual_total_price || (Number(sku.unit_price) * validatedData.quantity)
    
    // 3. 创建客户购买记录
    await tx.customer_purchase.create({
      data: {
        id: randomUUID(),
        customer_id: customer.id,
        sku_id: id,
        sku_name: sku.sku_name,
        quantity: validatedData.quantity,
        unit_price: total_price / validatedData.quantity, // 使用实际单价
        total_price: total_price,
        sale_channel: validatedData.sale_channel,
        notes: validatedData.notes,
        purchase_date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    })
    
    // 4. 减少SKU库存
    const updated_sku = await decrease_sku_quantity({ sku_id: id,
      quantity: validatedData.quantity,
      reference_id: validatedData.reference_id || '',
      notes: validatedData.notes || `销售给客户 ${validatedData.customer_name} ${validatedData.quantity} 件`,
      user_id: req.user!.id,
      tx: tx
    })

    // 5. 更新客户统计数据
    await tx.customer.update({
      where: { id: customer.id },
      data: {
        total_purchases: {
          increment: total_price
        },
        total_orders: {
          increment: 1
        },
        last_purchase_date: new Date(),
        updated_at: new Date()
      }
    })

    // 6. 创建财务收入记录
    await tx.financial_record.create({
      data: {
        type: 'INCOME',
        amount: total_price,
        description: `销售收入 - ${sku.sku_name}`,
        source_type: 'SALE',
        source_id: id,
        category: '销售收入',
        transaction_date: new Date(),
        notes: `客户：${validatedData.customer_name}，数量：${validatedData.quantity}件`,
        created_by_id: req.user!.id
      }
    })

    return { sku: updated_sku, customer, total_price }
  })
  
  res.json({
    success: true,
    message: 'SKU销售记录成功',
    data: { sku_id: result.sku.id,
      sku_code: result.sku.sku_code,
      sold_quantity: validatedData.quantity,
      remaining_quantity: result.sku.available_quantity,
      total_quantity: result.sku.total_quantity,
      customer: {
        id: result.customer.id,
        name: result.customer.name,
        phone: result.customer.phone,
        address: result.customer.address
      },
      sale_info: {
        sku_unit_price: result.sku.unit_price, // SKU标准单价
        actual_unit_price: result.total_price / validatedData.quantity, // 实际成交单价
        total_price: result.total_price, // 实际成交总价
        sale_channel: validatedData.sale_channel,
        discount_amount: validatedData.actual_total_price ? (result.sku.unit_price * validatedData.quantity) - result.total_price : 0
      }
    }
  })
  return
}))

// 获取SKU库存变更历史
router.get('/:id/history', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { page = 1, limit = 20 } = req.query
  
  const skip = (Number(page) - 1) * Number(limit)
  
  const [logs, total] = await Promise.all([
    prisma.sku_inventory_log.findMany({
      where: { sku_id: id },
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            user_name: true,
            name: true
          }
        }
      }
    }),
    prisma.sku_inventory_log.count({
      where: { sku_id: id }
    })
  ])
  
  res.json({
    success: true,
    message: 'SKU库存变更历史获取成功',
    data: {
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / Number(limit))
      }
    }
  })
  return
}))

// 获取SKU统计信息
router.get('/stats/overview', authenticate_token, asyncHandler(async (req, res) => {
  const [totalSkus, activeSkus, totalProducts, availableProducts] = await Promise.all([
    prisma.product_sku.count(),
    prisma.product_sku.count({ where: { status: 'ACTIVE' } }),
    prisma.product_sku.aggregate({
      _sum: { total_quantity: true }
    }),
    prisma.product_sku.aggregate({
      _sum: { available_quantity: true }
    })
  ])
  
  // 获取低库存SKU（可售数量 <= 1）
  const lowStockSkus = await prisma.product_sku.findMany({
    where: {
      status: 'ACTIVE',
      available_quantity: {
        lte: 1
      }
    },
    select: {
      id: true,
      sku_code: true,
      sku_name: true,
      available_quantity: true,
      total_quantity: true
    },
    take: 10
  })
  
  res.json({
    success: true,
    message: 'SKU统计信息获取成功',
    data: {
      totalSkus: totalSkus,
      activeSkus: activeSkus,
      totalProducts: totalProducts._sum.total_quantity || 0,
      availableProducts: availableProducts._sum.available_quantity || 0,
      lowStockSkus: lowStockSkus
    }
  })
  return
}))

// 获取SKU溯源信息（制作配方）
router.get('/:id/trace', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  const sku = await prisma.product_sku.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          material_usages: {
            include: {
              purchase: {
                include: {
                  supplier: true,
                  user: true
                }
              }
            },
            orderBy: {
              created_at: 'asc' // 按创建时间排序，获取第一次制作时的记录
            }
          }
        }
      }
    }
  })
  
  if (!sku) {
    return res.status(404).json({
      success: false,
      message: 'SKU不存在'
    })
  }
  
  // 获取制作配方数据（基于第一次制作时的MaterialUsage记录）
  const recipeData = []
  const processedPurchaseIds = new Set()
  
  console.log(`🔍 [SKU配方] SKU: ${sku.sku_code}, 总数量: ${sku.total_quantity}`)
  
  // 遍历所有关联的成品，获取制作配方
  for (const product of sku.products) {
    // 只处理第一次制作时的原材料使用记录
    for (const material_usage of product.material_usages) {
      const purchase = material_usage.purchase
      
      // 检查purchase是否存在
      if (!purchase) {
        continue
      }
      
      // 避免重复处理同一个采购记录
      if (processedPurchaseIds.has(purchase.id)) {
        continue
      }
      processedPurchaseIds.add(purchase.id)
      
      // 根据产品类型选择正确的价格字段
      let correctPrice = 0
      
      switch (purchase.material_type) {
        case 'LOOSE_BEADS':
          correctPrice = parseFloat(purchase.price_per_bead?.toString() || '0')
          if (correctPrice === 0) {
            correctPrice = parseFloat(purchase.unit_price?.toString() || purchase.price_per_gram?.toString() || '0')
          }
          break
        case 'BRACELET':
          // 手串优先使用每颗价格，如果没有则使用每串价格
          correctPrice = parseFloat(purchase.price_per_bead?.toString() || '0')
          if (correctPrice === 0) {
            correctPrice = parseFloat(purchase.unit_price?.toString() || purchase.price_per_gram?.toString() || '0')
          }
          break
        case 'ACCESSORIES':
        case 'FINISHED':
          correctPrice = parseFloat(purchase.price_per_piece?.toString() || '0')
          if (correctPrice === 0) {
            correctPrice = parseFloat(purchase.unit_price?.toString() || purchase.price_per_gram?.toString() || purchase.price_per_bead?.toString() || '0')
          }
          break
        default:
          correctPrice = parseFloat(purchase.unit_price?.toString() || '0')
          if (correctPrice === 0) {
            correctPrice = parseFloat(purchase.price_per_bead?.toString() || purchase.price_per_gram?.toString() || purchase.price_per_piece?.toString() || '0')
          }
      }
      
      // 根据产品类型选择正确的规格字段
      let correctSpecification = '未设置'
      
      switch (purchase.material_type) {
        case 'LOOSE_BEADS':
        case 'BRACELET':
          if (purchase.bead_diameter) {
            correctSpecification = `${purchase.bead_diameter}mm`
          } else if (purchase.specification) {
            correctSpecification = `${purchase.specification}mm`
          }
          break
        case 'ACCESSORIES':
        case 'FINISHED':
          if (purchase.specification) {
            correctSpecification = `${purchase.specification}mm`
          } else if (purchase.bead_diameter) {
            correctSpecification = `${purchase.bead_diameter}mm`
          }
          break
        default:
          if (purchase.bead_diameter) {
            correctSpecification = `${purchase.bead_diameter}mm`
          } else if (purchase.specification) {
            correctSpecification = `${purchase.specification}mm`
          }
      }
      
      // 确定单位
      let unit = '件'
      if (purchase.material_type === 'LOOSE_BEADS' || purchase.material_type === 'BRACELET') {
        unit = '颗'
      }
      
      // 计算当前原材料的单个SKU消耗量（基于MaterialUsage记录）
      const materialBeads = material_usage.quantity_used || 0
      const materialPieces = material_usage.quantity_used || 0
      const materialTotal = materialBeads + materialPieces
      
      // 单个SKU的消耗量 = MaterialUsage记录中的数量（这个数量本身就是制作单个SKU时使用的原材料数量）
      const singleSkuConsumption = materialTotal > 0 ? materialTotal : 1
      
      // 计算单个SKU的单位成本
      const unitCostForSingleSku = correctPrice * singleSkuConsumption
      
      // 构建制作配方记录
      const recipeRecord = {
        id: `recipe-${purchase.id}`,
        type: 'recipe',
        material_name: purchase.product_name,
        specification: correctSpecification,
        quantityPerSku: singleSkuConsumption, // 单个SKU需要的数量
        unit: unit,
        supplier: purchase.supplier?.name || '未知供应商',
        cgNumber: purchase.purchase_code || '无CG编号',
        unit_cost: correctPrice, // 单位成本
        total_costPerSku: unitCostForSingleSku, // 单个SKU的总成本
        qualityGrade: purchase.quality || '未设置',
        purchase_date: purchase.purchase_date,
        details: {
          purchase_id: purchase.id,
          material_id: purchase.id,
          material_type: purchase.material_type || undefined,
          description: `制作单个${sku.sku_name}需要${singleSkuConsumption}${unit}${purchase.product_name}`
        }
      }
      
      recipeData.push(recipeRecord)
    }
  }
  
  // 按原材料名称排序
  recipeData.sort((a, b) => a.material_name.locale_compare(b.material_name))
  
  res.json({
    success: true,
    message: 'SKU制作配方获取成功',
    data: {
      sku_info: {
        id: sku.id,
        sku_code: sku.sku_code,
        sku_name: sku.sku_name,
        specification: sku.specification,
        total_quantity: sku.total_quantity
      },
      recipe: recipeData,
      summary: {
        total_materials: recipeData.length,
        total_costPerSku: recipeData.reduce((sum, item) => sum + item.total_costPerSku, 0)
      }
    }
  })
  return
}))

// 获取SKU的原材料信息
router.get('/:id/materials', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  const sku = await prisma.product_sku.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          material_usages: {
            include: {
              purchase: {
                include: {
                  supplier: true
                }
              }
            },
            orderBy: {
              created_at: 'asc'
            }
          }
        }
      }
    }
  })
  
  if (!sku) {
    return res.status(404).json({
      success: false,
      message: 'SKU不存在'
    })
  }
  
  // 计算单个SKU的原材料消耗量（基于第一次制作时的记录）
  let singleSkuConsumption = 1 // 默认值
  
  // 获取第一次制作时的MaterialUsage记录
  const firstMaterialUsage = await prisma.material_usage.findFirst({
    where: { 
      product: { sku_id: sku.id
      }
    },
    orderBy: {
      created_at: 'asc'
    }
  })
  
  if (firstMaterialUsage) {
    const firstUsageBeads = firstMaterialUsage.quantity_used || 0
    const firstUsagePieces = firstMaterialUsage.quantity_used || 0
    const firstUsageTotal = firstUsageBeads + firstUsagePieces
    
    // 直接使用第一次制作时的消耗量（用户在选择原材料页面填写的信息）
    // 这个数值就是单个SKU的消耗量，不需要除以总数量
    if (firstUsageTotal > 0) {
      singleSkuConsumption = firstUsageTotal
    }
  }
  
  console.log(`🔍 [SKU Materials API] SKU: ${sku.sku_code}`);
  console.log(`   总数量: ${sku.total_quantity}`);
  console.log(`   单个SKU消耗量: ${singleSkuConsumption}`);
  
  // 整理原材料信息
  const materials = []
  const processedPurchaseIds = new Set()
  
  for (const product of sku.products) {
    for (const material_usage of product.material_usages) {
      const purchase = material_usage.purchase
      
      // 避免重复添加同一个采购记录
      if (purchase && !processedPurchaseIds.has(purchase.id)) {
        processedPurchaseIds.add(purchase.id)
        
        // 根据原材料的实际使用情况分别设置颗数和件数
        const actualBeads = material_usage.quantity_used || 0
        const actualPieces = materialUsage.quantity_used || 0
        
        console.log(`🔍 [原材料] ${purchase.product_name}:`, {
          actualBeads,
          actualPieces,
          material_type: purchase.material_type
        })
        
        // 根据产品类型确定正确的单位成本
        let unit_cost = 0
        if (purchase) {
          switch (purchase.material_type) {
            case 'LOOSE_BEADS':
            case 'BRACELET':
              unitCost = purchase.price_per_bead ? parseFloat(purchase.price_per_bead.toString()) : 0
              break
            case 'ACCESSORIES':
            case 'FINISHED':
              unitCost = purchase.price_per_piece ? parseFloat(purchase.price_per_piece.toString()) : 0
              break
            default:
              unitCost = purchase.unit_price ? parseFloat(purchase.unit_price.toString()) : 
                        (purchase.price_per_bead ? parseFloat(purchase.price_per_bead.toString()) : 0)
          }
          
          materials.push({
            purchase_id: purchase.id,
            product_name: purchase.product_name || '',
            supplier_name: purchase.supplier?.name || undefined,
            quantity_used_beads: actualBeads, // 使用实际的颗数
            quantity_used_pieces: actualPieces, // 使用实际的件数
            unit_cost: unitCost, // 使用Purchase表中的正确价格字段
            total_cost: material_usage.total_cost ? parseFloat(material_usage.total_cost.toString()) : 0
          })
         }
      }
    }
  }
  
  res.json({
    success: true,
    message: 'SKU原材料信息获取成功',
    data: { sku_id: sku.id,
      sku_code: sku.sku_code,
      sku_name: sku.sku_name,
      materials: materials
    }
  })
  return
}))

// 销毁SKU
router.post('/:id/destroy', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { quantity, reason, return_to_material, selected_materials, customReturnQuantities } = req.body
  
  // 添加调试日志
  console.log('🔍 [销毁API] 接收到的原始数据:', {
    quantity: typeof quantity,
    reason: typeof reason,
    return_to_material: typeof returnToMaterial,
    selected_materials: selected_materials,
    custom_return_quantities: customReturnQuantities,
    customReturnQuantitiesType: typeof customReturnQuantities
  })
  
  // 处理customReturnQuantities的类型转换
  let processedCustomQuantities: Record<string, number> = {}
  if (customReturnQuantities && typeof customReturnQuantities === 'object') {
    console.log('🔍 [销毁API] 原始customReturnQuantities:', customReturnQuantities)
    Object.entries(customReturnQuantities).forEach(([key, value]) => {
      console.log(`🔍 [销毁API] 处理键值对: ${key} = ${value} (${typeof value})`)
      const num_value = Number(value) || 0
      console.log(`🔍 [销毁API] 转换后: ${key} = ${num_value} (${typeof num_value})`)
      processedCustomQuantities[key] = num_value
    })
  }
  
  console.log('🔍 [销毁API] 处理后的数据:', {
    processedCustomQuantities,
    sampleKey: Object.keys(processedCustomQuantities)[0],
    sampleValue: Object.values(processedCustomQuantities)[0],
    sampleValueType: typeof Object.values(processedCustomQuantities)[0]
  })
  
  // 验证输入
  const destroySchema = z.object({
    quantity: z.number().int().min(1),
    reason: z.string().min(1, '请提供销毁原因'),
    return_to_material: z.boolean(),
    selected_materials: z.array(z.string()).optional(),
    custom_return_quantities: z.any().optional() // 改为any类型，避免record验证问题
  })
  
  let validatedData
  try {
    validatedData = destroySchema.parse({
      quantity: Number(quantity),
      reason: String(reason),
      return_to_material: Boolean(returnToMaterial),
      selected_materials: selected_materials || [],
      custom_return_quantities: processedCustomQuantities
    })
    
    console.log('✅ [销毁API] 数据验证成功:', validatedData)
    
  } catch (validationError: any) {
    console.error('❌ [销毁API] 数据验证失败:', {
      error: validationError?.message || 'Unknown error',
      issues: validationError?.issues || validationError?.errors || [],
      receivedData: {
        quantity: Number(quantity),
        reason: String(reason),
        return_to_material: Boolean(returnToMaterial),
        selected_materials: selected_materials || [],
        custom_return_quantities: processedCustomQuantities
      }
    })
    throw validationError
  }
  
  const result = await prisma.$transaction(async (tx) => {
    // 1. 获取SKU信息
    const sku = await tx.product_sku.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            material_usages: {
              include: {
                purchase: true
              }
            }
          }
        }
      }
    })
    
    if (!sku) {
      throw new Error('SKU不存在')
    }
    
    if (sku.available_quantity < validatedData.quantity) {
      throw new Error(`SKU ${sku.sku_code} 可售数量不足，可售：${sku.available_quantity}，需要销毁：${validatedData.quantity}`)
    }
    
    const quantity_before = sku.available_quantity
    const quantity_after = quantity_before - validatedData.quantity
    
    // 2. 更新SKU数量
    const updated_sku = await tx.product_sku.update({
      where: { id },
      data: {
        available_quantity: quantity_after,
        total_quantity: sku.total_quantity - validatedData.quantity,
        total_value: quantity_after * Number(sku.unit_price)
      }
    })
    
    // 3. 创建库存变更日志
    await create_sku_inventory_log({ sku_id: id,
      action: 'DESTROY',
      quantity_change: -validatedData.quantity,
      quantity_before: quantity_before,
      quantity_after: quantity_after,
      reference_type: 'DESTROY',
      reference_id: '',
      notes: `销毁原因: ${validatedData.reason}`,
      user_id: req.user!.id,
      tx: tx
    })
    
    // 4. 如果选择退回原材料，处理原材料退回逻辑
    let returned_materials = []
    if (validatedData.return_to_material) {
      // 获取所有相关的原材料使用记录
      const material_usages = []
      for (const product of sku.products) {
        for (const material_usage of product.material_usages) {
          material_usages.push(material_usage)
        }
      }
      
      // 根据销毁原因决定退回哪些原材料
      if (validatedData.reason === '拆散重做' && validatedData.selected_materials && validatedData.selected_materials.length > 0) {
        // 拆散重做：按照配方数量*销毁数量计算退回数量
        for (const purchase_id of validatedData.selected_materials!) {
          const material_usage = material_usages.find(mu => mu.purchase_id === purchase_id)
          if (material_usage) {
            // 计算单个SKU的配方数量（从MaterialUsage记录中获取）
            const singleSkuBeads = material_usage.quantity_used || 0
            const singleSkuPieces = material_usage.quantity_used || 0
            
            // 退回数量 = 单个SKU配方数量 * 销毁数量
            const returnBeads = singleSkuBeads * validatedData.quantity
            const returnPieces = singleSkuPieces * validatedData.quantity
            
            // 直接创建退回记录，简化逻辑
              if (returnBeads > 0 || returnPieces > 0) {
                // 创建一个虚拟的Product记录来关联MaterialUsage
                const virtualProduct = await tx.product.create({
                  data: {
                    id: randomUUID(),
                    name: `SKU销毁退回-${sku.sku_code}`,
                    unit: '件',
                    unit_price: 0,
                    total_value: 0,
                    status: 'OFFLINE',
                    user_id: req.user!.id,
                    sku_id: id
                  }
                })
                
                // 创建负数的MaterialUsage记录表示退回
                if (purchaseId) {
                  await tx.material_usage.create({
                    data: {
                      material_id: purchase_id,
                      sku_id: id,
                      quantity_used: -(returnBeads + returnPieces), // 负数表示退回
                      unit_cost: 0,
                      total_cost: 0,
                      action: 'RETURN'
                    }
                  })
                }
                
                returnedMaterials.push({
                  purchase_id: purchase_id,
                  returnBeads: returnBeads,
                  returnPieces: returnPieces,
                  reason: validatedData.reason,
                  notes: `SKU销毁退回：${sku.sku_code}，销毁数量：${validatedData.quantity}，配方退回：${returnBeads}颗${returnPieces > 0 ? `+${returnPieces}件` : ''}`
                })
              }
          }
        }
        
        // 检查选中的采购记录是否可以改回ACTIVE状态
         for (const purchase_id of validatedData.selected_materials!) {
           // 计算该采购记录的总使用量（包括颗数和件数）
           const totalUsage = await tx.material_usage.aggregate({
             where: { purchase_id: purchase_id },
             _sum: {
               quantity_used: true
             }
           })
           
           const totalUsedBeads = totalUsage._sum.quantity_used || 0
           const totalUsedPieces = totalUsage._sum.quantity_used || 0
           
           // 如果总使用量为0或负数，说明已经完全退回，可以改为ACTIVE
           if (totalUsedBeads <= 0 && totalUsedPieces <= 0) {
             if (purchase_id) {
               await tx.purchase.update({
                 where: { id: purchase_id },
                 data: { status: 'ACTIVE' }
               })
             }
           }
         }
      } else if (validatedData.reason !== '赠送销毁' && validatedData.reason !== '库存遗失') {
        // 其他原因（除了赠送销毁和库存遗失）：退回所有原材料
        const allPurchaseIds = Array.from(new Set(material_usages.map(mu => mu.purchase_id)))
        
        for (const purchase_id of allPurchaseIds) {
          const material_usage = material_usages.find(mu => mu.purchase_id === purchase_id)
          if (material_usage) {
            const returnBeads = (material_usage.quantity_used || 0) * validatedData.quantity
            const returnPieces = (material_usage.quantity_used || 0) * validatedData.quantity
            
            if (returnBeads > 0 || returnPieces > 0) {
               // 创建一个虚拟的Product记录来关联MaterialUsage
               const virtualProduct = await tx.product.create({
                 data: {
                   id: randomUUID(),
                   name: `SKU销毁退回-${sku.sku_code}`,
                   unit: '件',
                   unit_price: 0,
                   total_value: 0,
                   status: 'OFFLINE',
                   user_id: req.user!.id,
                   sku_id: id
                 }
               })
               
               // 创建负数的MaterialUsage记录表示退回
               if (purchaseId) {
                 await tx.material_usage.create({
                   data: {
                     material_id: purchase_id, // 这里应该是materialId
                     sku_id: id,
                     quantity_used: -(returnBeads || returnPieces), // 负数表示退回
                     unit_cost: 0,
                     total_cost: 0,
                     action: 'RETURN'
                   }
                 })
               }
               
               returnedMaterials.push({
                 purchase_id: purchase_id,
                 returnBeads: returnBeads,
                 returnPieces: returnPieces,
                 reason: validatedData.reason,
                 notes: `SKU销毁退回：${sku.sku_code}，销毁数量：${validatedData.quantity}`
               })
             }
          }
        }
        
        // 检查所有采购记录是否可以改回ACTIVE状态
         for (const purchase_id of allPurchaseIds) {
           // 计算该采购记录的总使用量（包括刚才创建的负数记录）
           const totalUsage = await tx.material_usage.aggregate({
             where: { purchase_id: purchase_id },
             _sum: {
               quantity_used: true
             }
           })
           
           const totalUsedBeads = totalUsage._sum.quantity_used || 0
           const totalUsedPieces = totalUsage._sum.quantity_used || 0
           
           // 如果总使用量为0或负数，说明已经完全退回，可以改为ACTIVE
           if (totalUsedBeads <= 0 && totalUsedPieces <= 0) {
             if (purchase_id) {
               await tx.purchase.update({
                 where: { id: purchase_id },
                 data: { status: 'ACTIVE' }
               })
             }
           }
         }
      }
      // 赠送销毁和库存遗失：不退回任何原材料（returnedMaterials保持为空数组）
    }
    
    return { sku: updated_sku, returned_materials: returnedMaterials }
  })
  
  res.json({
    success: true,
    message: 'SKU销毁成功',
    data: { sku_id: result.sku.id,
      sku_code: result.sku.sku_code,
      destroyed_quantity: validatedData.quantity,
      remaining_quantity: result.sku.available_quantity,
      total_quantity: result.sku.total_quantity,
      returned_materials_count: result.returned_materials.length,
      returned_materials: result.returned_materials,
      reason: validatedData.reason,
      return_to_material: validatedData.return_to_material,
      custom_return_quantities: validatedData.custom_return_quantities
    }
  })
}))

// 获取SKU补货信息
router.get('/:id/restock-info', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  const sku = await prisma.product_sku.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          material_usages: {
            include: {
              purchase: {
                include: {
                  supplier: true
                }
              }
            }
          }
        }
      }
    }
  })
  
  if (!sku) {
    return res.status(404).json({
      success: false,
      message: 'SKU不存在'
    })
  }
  
  // 获取SKU所需的原材料信息
  
  const required_materials = []
  const processedPurchaseIds = new Set()
  
  for (const product of sku.products) {for (const material_usage of product.material_usages) {
      const purchase = material_usage.purchase
      
      // 避免重复添加同一个采购记录
      if (purchase && !processedPurchaseIds.has(purchase.id)) {
        processedPurchaseIds.add(purchase.id)
        
        // 计算剩余库存
        const remaining_quantity = await calculateRemainingQuantity(purchase, prisma)
        
        // 检查该采购记录是否还有库存（只要有剩余数量即可，不限制状态）
        const isAvailable = remaining_quantity > 0
        
        // 计算单个SKU所需的原材料数量（基于制作时的溯源信息）
        // 用户明确：读取制作时的溯源信息，第一次制作时的单个SKU消耗量
        // 计算方式：总消耗量 / 制作的SKU数量（只计算一次，避免重复计算）
        
        // 计算当前原材料的单个SKU消耗量（基于对应的MaterialUsage记录）
        let singleSkuConsumption = 1 // 默认值
        
        // 查找当前采购记录对应的MaterialUsage记录
        const currentMaterialUsage = await prisma.material_usage.findFirst({
          where: { 
            purchase_id: purchase.id,
            product: { sku_id: sku.id
            }
          },
          orderBy: {
            created_at: 'asc'
          }
        })
        
        if (currentMaterialUsage) {
          const usageBeads = currentMaterialUsage.quantity_used || 0
          const usagePieces = currentMaterialUsage.quantity_used || 0
          const usageTotal = usageBeads + usagePieces
          
          // 直接使用MaterialUsage记录中的数量（这个数量本身就是制作单个SKU时使用的原材料数量）
          singleSkuConsumption = usageTotal > 0 ? usageTotal : 1
        }
        
        const quantityNeeded = singleSkuConsumption
        const isSufficient = isAvailable && remainingQuantity >= quantityNeeded
        
        // 添加调试日志
        console.log(`🔍 [补货调试] 原材料: ${purchase.product_name}`, {purchase_id: purchase.id,
          status: purchase.status,
          remaining_quantity,
          skuTotalQuantity: sku.total_quantity,
          singleSkuConsumption,
          quantityNeeded,
          isAvailable,
          isSufficient,
          calculation: `单个SKU消耗量 = ${singleSkuConsumption}（基于第一条MaterialUsage记录）`,
          stockCheck: `${remaining_quantity} >= ${quantityNeeded} = ${remaining_quantity >= quantityNeeded}`,
          note: '单个SKU所需量 = 第一次制作时的消耗量 / 制作的SKU总数量（固定值，不受补货影响）'
        })
        
        required_materials.push({
          purchase_id: purchase.id,
          product_name: purchase.product_name || '',
          material_type: purchase.material_type || undefined,
          supplier_name: purchase.supplier?.name || undefined,
          purchase_code: purchase.purchase_code || undefined,
          bead_diameter: purchase.bead_diameter || undefined,
          specification: purchase.specification || undefined,
          quality: purchase.quality || undefined,
          quantityNeededPerSku: quantityNeeded,
          available_quantity: remaining_quantity,
          unit_cost: parseFloat(purchase.unit_price?.toString() || '0'),
          unit: '件', // 默认单位
          isSufficient: isSufficient
        })
      }
    }
  }
  
  // 检查是否所有原材料都充足
  const can_restock = requiredMaterials.length > 0 && requiredMaterials.every(material => material.isSufficient)
  const insufficient_materials = requiredMaterials
    .filter(material => !material.isSufficient)
    .map(material => `${material.product_name} (需要: ${material.quantityNeededPerSku}, 库存: ${material.available_quantity})`)
  
  res.json({
    success: true,
    message: '补货信息获取成功',
    data: { sku_id: sku.id,
      sku_code: sku.sku_code,
      sku_name: sku.sku_name,
      current_quantity: sku.available_quantity,
      labor_cost: parseFloat(sku.labor_cost?.toString() || '0'),
      craft_cost: parseFloat(sku.craft_cost?.toString() || '0'),
      required_materials: required_materials,
      can_restock: canRestock,
      insufficient_materials: insufficientMaterials.length > 0 ? insufficient_materials: undefined
    }
  })
  return
}))

// 执行SKU补货操作
router.post('/:id/restock', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { quantity } = req.body
  
  // 验证输入
  const restockSchema = z.object({
    quantity: z.number().int().min(1)
  })
  
  const validatedData = restockSchema.parse({
    quantity: Number(quantity)
  })
  
  const result = await prisma.$transaction(async (tx) => {
    // 1. 获取SKU信息和所需原材料
    const sku = await tx.product_sku.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            material_usages: {
              include: {
                purchase: {
                  include: {
                    supplier: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    if (!sku) {
      throw new Error('SKU不存在')
    }
    
    // 2. 收集所需原材料并检查库存
    const required_materials = []
    const processedPurchaseIds = new Set()
    
    // 计算单个SKU所需的原材料数量（基于制作时的溯源信息）
    // 只使用第一条MaterialUsage记录（制作时的记录），避免累计补货记录
    const firstMaterialUsage = await tx.material_usage.findFirst({
      where: { 
        product: { sku_id: sku.id
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    let singleSkuConsumption = 1 // 默认值
    if (firstMaterialUsage) {
      const firstUsageBeads = firstMaterialUsage.quantity_used || 0
      const firstUsagePieces = firstMaterialUsage.quantity_used || 0
      const firstUsageTotal = firstUsageBeads + firstUsagePieces
      
      // 直接使用第一次制作时的消耗量（用户在选择原材料页面填写的信息）
      singleSkuConsumption = firstUsageTotal > 0 ? firstUsageTotal : 1
    }
    
    for (const product of sku.products) {
      for (const material_usage of product.material_usages) {
        const purchase = material_usage.purchase
        
        if (!purchase) {
          continue
        }
        
        if (!processedPurchaseIds.has(purchase.id)) {
          processedPurchaseIds.add(purchase.id)
          
          // 计算剩余库存
          const remaining_quantity = await calculateRemainingQuantity(purchase, tx)
          
          // 使用固定的单个SKU消耗量，不累计MaterialUsage记录
          const quantityNeeded = singleSkuConsumption * validatedData.quantity
          
          if (remaining_quantity < quantityNeeded) {
            throw new Error(`原材料 ${purchase.product_name} 库存不足，需要: ${quantityNeeded}, 可用: ${remaining_quantity}`)
          }
          
          required_materials.push({
            purchase_id: purchase.id,
            product_name: purchase.product_name || '',
            quantityNeeded: quantityNeeded,
            unit_cost: parseFloat(purchase.unit_price?.toString() || '0'),
            currentRemaining: remaining_quantity
          })
        }
      }
    }
    
    if (required_materials.length === 0) {
      throw new Error('未找到SKU的原材料信息，无法补货')
    }
    
    // 3. 记录原材料消耗（通过materialUsage表记录，不直接修改采购记录）
    const consumed_materials = []
    for (const material of required_materials) {
      const newRemainingQuantity = material.currentRemaining - material.quantityNeeded
      
      // 根据产品类型创建原材料使用记录
       const purchase = await tx.purchase.findUnique({ where: { id: material.purchase_id } })
       
       if (!purchase) {
         throw new Error(`采购记录不存在: ${material.purchase_id}`)
       }
       
       let quantity_used = 0
       let quantity_used_pieces = 0
       
       if (purchase.material_type === 'LOOSE_BEADS' || purchase.material_type === 'BRACELET') {
         quantity_used = material.quantityNeeded
       } else if (purchase.material_type === 'ACCESSORIES' || purchase.material_type === 'FINISHED') {
         quantity_used_pieces = material.quantityNeeded
       } else {
         // 默认情况，优先使用beads
         quantity_used = material.quantityNeeded
       }
       
       if (material.purchase_id) {
         await tx.material_usage.create({
           data: {
             material_id: material.purchase_id, // 这里应该是materialId
             sku_id: id,
             quantity_used: quantity_used || quantity_used_pieces,
             unit_cost: material.unit_cost,
             total_cost: material.unit_cost * material.quantityNeeded,
             action: 'USE'
           }
         })
       }
      
      // 如果库存用完，更新采购记录状态为USED
      if (newRemainingQuantity <= 0) {
        await tx.purchase.update({
          where: { id: material.purchase_id },
          data: { status: 'USED' }
        })
      }
      
      consumedMaterials.push({
        purchase_id: material.purchase_id,
        product_name: material.product_name || '',
        consumed_quantity: material.quantityNeeded,
        remaining_quantity: newRemainingQuantity
      })
    }
    
    // 4. 计算总成本
    const material_cost = requiredMaterials.reduce((sum, material) => {
      return sum + (material.unit_cost * material.quantityNeeded)
    }, 0)
    const labor_cost = parseFloat(sku.labor_cost?.toString() || '0') * validatedData.quantity
    const craft_cost = parseFloat(sku.craft_cost?.toString() || '0') * validatedData.quantity
    const total_cost = materialCost + laborCost + craftCost
    
    // 5. 更新SKU库存
    const quantity_before = sku.available_quantity
    const quantity_after = quantity_before + validatedData.quantity
    const totalQuantityAfter = sku.total_quantity + validatedData.quantity
    
    const updated_sku = await tx.product_sku.update({
      where: { id },
      data: {
        available_quantity: quantity_after,
        total_quantity: totalQuantityAfter,
        total_value: quantity_after * Number(sku.unit_price),
        total_cost: (parseFloat(sku.total_cost?.toString() || '0') + total_cost)
      }
    })
    
    // 6. 创建库存变更日志
    await create_sku_inventory_log({ sku_id: id,
      action: 'ADJUST',
      quantity_change: validatedData.quantity,
      quantity_before: quantity_before,
      quantity_after: quantity_after,
      reference_type: 'PRODUCT',
      reference_id: '',
      notes: `补货操作，消耗原材料成本: ¥${material_cost.toFixed(2)}, 人工成本: ¥${labor_cost.toFixed(2)}, 工艺成本: ¥${craft_cost.toFixed(2)}`,
      user_id: req.user!.id,
      tx: tx
    })
    
    return {
      sku: updated_sku,
      consumed_materials: consumedMaterials,
      total_cost: total_cost
    }
  })
  
  res.json({
    success: true,
    message: 'SKU补货成功',
    data: { sku_id: result.sku.id,
      sku_code: result.sku.sku_code,
      restocked_quantity: validatedData.quantity,
      new_total_quantity: result.sku.total_quantity,
      new_available_quantity: result.sku.available_quantity,
      consumed_materials: result.consumed_materials,
      total_cost: result.total_cost
    }
  })
}))

// SKU调控接口（调整售价和状态）
router.put('/:id/control', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { action, newPrice, newStatus, reason } = req.body
  
  // 验证用户权限（只有BOSS可以调控）
  if (req.user!.role !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '只有BOSS角色可以使用SKU调控功能'
    })
  }
  
  // 验证输入
  const controlSchema = z.object({
    action: z.enum(['price', 'status']),
    newPrice: z.number().positive().optional(),
    newStatus: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    reason: z.string().min(1, '请提供操作原因')
  })
  
  const validatedData = controlSchema.parse({
    action: String(action),
    newPrice: newPrice ? Number(newPrice) : undefined,
    newStatus: newStatus ? String(newStatus) : undefined,
    reason: String(reason)
  })
  
  const result = await prisma.$transaction(async (tx) => {
    // 获取SKU信息
    const sku = await tx.product_sku.findUnique({
      where: { id }
    })
    
    if (!sku) {
      throw new Error('SKU不存在')
    }
    
    let updated_sku = sku
    let logMessage = ''
    
    if (validatedData.action === 'price') {
      // 调整售价
      if (!validatedData.newPrice) {
        throw new Error('调整售价时必须提供新价格')
      }
      
      const oldPrice = parseFloat(sku.selling_price?.toString() || '0')
      const newPrice = validatedData.newPrice
      
      // 使用SKU配方成本计算利润率：materialCost + laborCost + craftCost
      const material_cost = parseFloat(sku.material_cost?.toString() || '0')
      const labor_cost = parseFloat(sku.labor_cost?.toString() || '0')
      const craft_cost = parseFloat(sku.craft_cost?.toString() || '0')
      const recipeCost = material_cost + labor_cost + craft_cost
      
      // 计算新的利润率：((售价 - 配方成本) / 售价) * 100
      const newProfitMargin = newPrice > 0 ? ((newPrice - recipeCost) / newPrice) * 100 : 0
      
      updated_sku = await tx.product_sku.update({
        where: { id },
        data: {
          selling_price: newPrice,
          profit_margin: newProfitMargin,
          total_value: sku.available_quantity * newPrice,
          updated_at: new Date()
        }
      })
      
      logMessage = `调整售价：¥${oldPrice.toFixed(2)} → ¥${newPrice.toFixed(2)}，原因：${validatedData.reason}`
      
      // 记录调价日志
      await create_sku_inventory_log({ sku_id: id,
        action: 'ADJUST',
        quantity_change: 0,
        quantity_before: sku.available_quantity,
        quantity_after: sku.available_quantity,
        reference_type: 'MANUAL',
        reference_id: '',
        notes: logMessage,
        user_id: req.user!.id,
        tx: tx
      })
      
    } else if (validatedData.action === 'status') {
      // 调整状态
      if (!validatedData.newStatus) {
        throw new Error('调整状态时必须提供新状态')
      }
      
      const oldStatus = sku.status
      const newStatus = validatedData.newStatus
      
      updated_sku = await tx.product_sku.update({
        where: { id },
        data: {
          status: newStatus,
          updated_at: new Date()
        }
      })
      
      const statusText = {
        'ACTIVE': '活跃',
        'INACTIVE': '停用'
      }
      
      logMessage = `状态变更：${statusText[oldStatus]} → ${statusText[newStatus]}，原因：${validatedData.reason}`
      
      // 记录状态变更日志
      await create_sku_inventory_log({ sku_id: id,
        action: 'ADJUST',
        quantity_change: 0,
        quantity_before: sku.available_quantity,
        quantity_after: sku.available_quantity,
        reference_type: 'MANUAL',
        reference_id: '',
        notes: logMessage,
        user_id: req.user!.id,
        tx: tx
      })
    }
    
    return updated_sku
  })
  
  res.json({
    success: true,
    message: `SKU${validatedData.action === 'price' ? '调价' : '状态变更'}成功`,
    data: { sku_id: result.id,
      sku_code: result.sku_code,
      sku_name: result.sku_name,
      selling_price: result.selling_price,
      profit_margin: result.profit_margin,
      status: result.status,
      updated_at: result.updated_at
    }
  })
  return
}))

// SKU退货接口
router.post('/:id/refund', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { quantity, reason, refund_amount, notes } = req.body
  
  // 验证输入
  const refundSchema = z.object({
    quantity: z.number().int().min(1),
    reason: z.string().min(1, '请提供退货原因'),
    refund_amount: z.number().positive().optional(),
    notes: z.string().optional()
  })
  
  const validatedData = refundSchema.parse({
    quantity: Number(quantity),
    reason: String(reason),
    refund_amount: refund_amount ? Number(refund_amount) : undefined,
    notes: notes ? String(notes) : undefined
  })
  
  const result = await prisma.$transaction(async (tx) => {
    // 1. 获取SKU信息
    const sku = await tx.product_sku.findUnique({
      where: { id }
    })
    
    if (!sku) {
      throw new Error('SKU不存在')
    }
    
    // 2. 计算退款金额（如果没有提供则使用SKU单价）
    const refund_amount = validatedData.refund_amount || (Number(sku.unit_price) * validatedData.quantity)
    
    // 3. 增加SKU库存（退货回库存）
    const quantity_before = sku.available_quantity
    const quantity_after = quantity_before + validatedData.quantity
    const totalQuantityAfter = sku.total_quantity + validatedData.quantity
    
    const updated_sku = await tx.product_sku.update({
      where: { id },
      data: {
        available_quantity: quantity_after,
        total_quantity: totalQuantityAfter,
        total_value: quantity_after * Number(sku.unit_price)
      }
    })
    
    // 4. 创建库存变更日志
    await create_sku_inventory_log({ sku_id: id,
      action: 'ADJUST',
      quantity_change: validatedData.quantity,
      quantity_before: quantity_before,
      quantity_after: quantity_after,
      reference_type: 'REFUND',
      reference_id: '',
      notes: `退货入库：${validatedData.reason}${validatedData.notes ? `，备注：${validatedData.notes}` : ''}`,
      user_id: req.user!.id,
      tx: tx
    })
    
    // 5. 创建财务退款记录（负数金额，抵扣收入）
    await tx.financial_record.create({
      data: {
        type: 'REFUND',
        amount: -refund_amount, // 负数表示抵扣收入
        description: `退货退款 - ${sku.sku_name}`,
        source_type: 'REFUND',
        source_id: id,
        category: '退货退款',
        transaction_date: new Date(),
        notes: `退货原因：${validatedData.reason}，退货数量：${validatedData.quantity}件${validatedData.notes ? `，备注：${validatedData.notes}` : ''}`,
        created_by_id: req.user!.id
      }
    })
    
    return {
      sku: updated_sku,
      refund_amount: refund_amount
    }
  })
  
  res.json({
    success: true,
    message: 'SKU退货处理成功',
    data: { sku_id: result.sku.id,
      sku_code: result.sku.sku_code,
      refunded_quantity: validatedData.quantity,
      new_available_quantity: result.sku.available_quantity,
      new_total_quantity: result.sku.total_quantity,
      refund_amount: result.refund_amount,
      reason: validatedData.reason,
      notes: validatedData.notes
    }
  })
}))

// 从原材料制作SKU
router.post('/create-from-materials', authenticate_token, asyncHandler(async (req, res) => {
  const { 
    sku_name, 
    sku_code, 
    materials, // [{ material_id, quantity_used }]
    total_quantity,
    selling_price,
    labor_cost = 0,
    craftCost = 0,
    description,
    specification,
    photos = [],
    notes
  } = req.body
  const user_id = req.user?.id

  if (!user_id) {
    return res.status(401).json({
      success: false,
      message: '用户未认证'
    })
  }

  // 验证输入
  const createSkuSchema = z.object({
    sku_name: z.string().min(1, 'SKU名称不能为空'),
    sku_code: z.string().optional(),
    materials: z.array(z.object({
      material_id: z.string().min(1, '原材料ID不能为空'),
      quantity_used: z.number().int().min(1, '使用数量必须大于0')
    })).min(1, '至少需要一种原材料'),
    total_quantity: z.number().int().min(1, 'SKU数量必须大于0'),
    selling_price: z.number().min(0, '销售价格不能为负数'),
    labor_cost: z.number().min(0, '人工成本不能为负数').default(0),
    craft_cost: z.number().min(0, '工艺成本不能为负数').default(0),
    description: z.string().optional(),
    specification: z.string().optional(),
    photos: z.array(z.string()).default([]),
    notes: z.string().optional()
  })

  try {
    const validatedData = createSkuSchema.parse({
      sku_name,
      sku_code,
      materials,
      total_quantity: Number(total_quantity),
      selling_price: Number(selling_price),
      labor_cost: Number(labor_cost),
      craft_cost: Number(craft_cost),
      description,
      specification,
      photos,
      notes
    })

    // 生成SKU编号（如果没有提供）
    let finalSkuCode = validatedData.sku_code
    if (!finalSkuCode) {
      let isUnique = false
      let attempts = 0
      
      while (!isUnique && attempts < 10) {
        const now = new Date()
        const date_str = now.toISOString().slice(0, 10).replace(/-/g, '')
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        finalSkuCode = `SKU${date_str}${randomNum}`
        
        const existing = await prisma.product_sku.findUnique({
          where: { sku_code: finalSkuCode }
        })
        if (!existing) {
          isUnique = true
        }
        attempts++
      }

      if (!isUnique) {
        return res.status(500).json({
          success: false,
          message: '生成SKU编号失败，请重试'
        })
      }
    } else {
      // 检查SKU编号是否已存在
      const existing = await prisma.product_sku.findUnique({
        where: { sku_code: finalSkuCode }
      })
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'SKU编号已存在'
        })
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. 验证所有原材料是否存在且库存充足
      let totalMaterialCost = 0
      const materialDetails = []

      for (const material of validatedData.materials) {
        const materialRecord = await tx.material.findUnique({
          where: { id: material.material_id }
        })

        if (!materialRecord) {
          throw new Error(`原材料 ${material.material_id} 不存在`)
        }

        if (materialRecord.available_quantity < material.quantity_used) {
          throw new Error(`原材料 ${materialRecord.material_name} 库存不足，可用：${materialRecord.available_quantity}，需要：${material.quantity_used}`)
        }

        const material_cost = parseFloat(materialRecord.unit_cost.toString()) * material.quantity_used
        totalMaterialCost += material_cost
        
        materialDetails.push({
          ...materialRecord,
          quantity_used: material.quantity_used,
          cost: material_cost
        })
      }

      // 2. 生成原材料标识
      const material_signature = validatedData.materials.map(m => ({
        material_id: m.material_id,
        quantity_used: m.quantity_used
      }))
      const material_signature_hash = createHash('md5')
        .update(JSON.stringify(material_signature))
        .digest('hex')

      // 3. 计算成本和利润
      const total_cost = totalMaterialCost + validatedData.labor_cost + validatedData.craft_cost
      const unit_price = total_cost / validatedData.total_quantity
      const profit_margin = validatedData.selling_price > 0 
        ? ((validatedData.selling_price - unit_price) / validatedData.selling_price) * 100 
        : 0

      // 4. 创建SKU记录
      const sku = await tx.product_sku.create({
        data: {
          sku_code: finalSkuCode!,
          sku_name: validatedData.sku_name,
          material_signature_hash,
          material_signature,
          total_quantity: validatedData.total_quantity,
          available_quantity: validatedData.total_quantity,
          unit_price,
          total_value: validatedData.total_quantity * unit_price,
          selling_price: validatedData.selling_price,
          profit_margin,
          material_cost: totalMaterialCost,
          labor_cost: validatedData.labor_cost,
          craft_cost: validatedData.craft_cost,
          total_cost,
          photos: validatedData.photos,
          description: validatedData.description,
          specification: validatedData.specification,
          created_by: user_id
        }
      })

      // 5. 扣减原材料库存并创建使用记录
      for (const material of materialDetails) {
        // 更新原材料库存
        await tx.material.update({
          where: { id: material.id },
          data: {
            available_quantity: material.available_quantity - material.quantity_used,
            used_quantity: material.used_quantity + material.quantity_used
          }
        })

        // 创建原材料使用记录
        await tx.material_usage.create({
          data: {
            material_id: material.id,
            sku_id: sku.id,
            quantity_used: material.quantity_used,
            unit_cost: parseFloat(material.unit_cost.toString()),
            total_cost: material.cost,
            action: 'USE',
            notes: `制作SKU ${sku.sku_code} - ${sku.sku_name}`
          }
        })
      }

      // 6. 创建SKU库存日志
      await tx.sku_inventory_log.create({
        data: { sku_id: sku.id,
          action: 'CREATE',
          quantity_change: validatedData.total_quantity,
          quantity_before: 0,
          quantity_after: validatedData.total_quantity,
          reference_type: 'PRODUCT',
          reference_id: sku.id,
          notes: `从原材料制作SKU，使用原材料：${materialDetails.map(m => `${m.material_name}(${m.quantity_used}${m.unit})`).join(', ')}`,
          user_id
        }
      })

      return sku
    })

    // 获取完整的SKU信息返回
    const skuWithDetails = await prisma.product_sku.findUnique({
      where: { id: result.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            user_name: true
          }
        },
        material_usages: {
          include: {
            material: {
              select: {
                id: true,
                material_code: true,
                material_name: true,
                unit: true
              }
            }
          }
        }
      }
    })

    // 转换为API格式
    const apiFormatSku = skuWithDetails // 直接使用原始数据，不进行字段转换

    res.status(201).json({
      success: true,
      message: 'SKU制作成功',
      data: apiFormatSku
    })
    return
  } catch (error) {
    console.error('制作SKU失败:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.issues
      })
    }
    res.status(500).json({
      success: false,
      message: '制作SKU失败',
      error: error instanceof Error ? error.message : '未知错误'
    })
    return
  }
}))

export default router