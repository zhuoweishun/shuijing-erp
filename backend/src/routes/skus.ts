import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import crypto from 'crypto'
import { 
  getSkuList, 
  getSkuDetails, 
  adjustSkuQuantity, 
  decreaseSkuQuantity 
} from '../utils/skuUtils.js'
// 移除fieldConverter导入，直接使用snake_case

const router = Router()

// 获取SKU列表
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search = '', 
    status = 'ACTIVE' 
  } = req.query
  
  // 解析status参数，支持多状态查询
  let statusArray
  if (typeof status === 'string' && status.includes(',')) {
    statusArray = status.split(',').map(s => s.trim())
  } else {
    statusArray = String(status)
  }
  
  const result = await getSkuList({
    page: Number(page),
    limit: Number(limit),
    search: String(search),
    status: statusArray
  })
  
  return res.json({
    success: true,
    message: 'SKU列表获取成功',
    data: {
      ...result,
      skus: result.skus?.map((sku: any) => ({
        ...sku,
        created_at: sku.created_at,
        updated_at: sku.updated_at
      }))
    }
  })
}))

// 获取SKU详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userRole = req.user?.role || "USER"
    
    const sku = await getSkuDetails(id)
    
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
      delete filteredSku.selling_price
      delete filteredSku.unit_price
      delete filteredSku.total_value
      delete filteredSku.total_price
      delete filteredSku.material_cost
      delete filteredSku.labor_cost
      delete filteredSku.craft_cost
      delete filteredSku.profit_margin
    }
    
    // 直接使用蛇形命名，无需转换
    const convertedSku = {
      ...filteredSku,
      created_at: filteredSku.created_at,
      updated_at: filteredSku.updated_at
    }
    
    return res.json({
      success: true,
      message: 'SKU详情获取成功',
      data: convertedSku
    })
  } catch (error) {
    console.error('获取SKU详情失败:', error)
    return res.status(500).json({
      success: false,
      message: '获取SKU详情失败'
    })
  }
})

// 调整SKU库存
router.post('/:id/adjust', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { new_quantity, notes } = req.body
  
  // 验证输入
  const adjustSchema = z.object({
    new_quantity: z.number().int().min(0),
    notes: z.string().min(1, '请提供调整原因')
  })
  
  const validatedData = adjustSchema.parse({
    new_quantity: Number(new_quantity),
    notes: String(notes)
  })
  
  const result = await prisma.$transaction(async (_tx) => {
    return await adjustSkuQuantity({
      skuId: id,
      quantity: validatedData.new_quantity,
      reason: validatedData.notes || '手动调整'
    })
  })
  
  return res.json({
    success: true,
    message: 'SKU库存调整成功',
    data: {
      sku_id: result.id,
      sku_code: result.sku_code,
      new_quantity: result.available_quantity,
      total_quantity: result.total_quantity
    }
  })
}))

// 销售SKU（减少可售数量并创建客户记录）
router.post('/:id/sell', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { 
    quantity = 1, 
    reference_id, 
    notes,
    customer_name,
    customer_phone,
    customerAddress,
    sale_channel,
    actual_total_price
  } = req.body
  
  // 验证输入
  const sellSchema = z.object({
    quantity: z.number().int().min(1),
    reference_id: z.string().optional(),
    notes: z.string().optional(),
    customer_name: z.string().min(1, '客户姓名不能为空'),
    customer_phone: z.string().min(1, '客户电话不能为空'),
    customerAddress: z.string().optional(),
    sale_channel: z.string().optional(),
    actual_total_price: z.number().positive().optional()
  })
  
  const validatedData = sellSchema.parse({
    quantity: Number(quantity),
    reference_id: reference_id ? String(reference_id) : undefined,
    notes: notes ? String(notes) : undefined,
    customer_name: String(customer_name),
    customer_phone: String(customer_phone),
    customerAddress: customerAddress ? String(customerAddress) : undefined,
    sale_channel: sale_channel ? String(sale_channel) : undefined,
    actual_total_price: actual_total_price ? Number(actual_total_price) : undefined
  })
  
  const result = await prisma.$transaction(async (tx) => {
    // 1. 获取SKU信息
    const sku = await tx.productSku.findUnique({
      where: { id }
    })
    
    if (!sku) {
      throw new Error('SKU不存在')
    }
    
    // 2. 查找或创建客户
    let customer = await tx.customers.findFirst({
      where: {
        OR: [
          { phone: validatedData.customer_phone },
          { name: validatedData.customer_name }
        ]
      }
    })
    
    if (!customer) {
      // 创建新客户
      customer = await tx.customers.create({
        data: {
          id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: validatedData.customer_name,
          phone: validatedData.customer_phone,
          address: validatedData.customerAddress,
          total_purchases: 0.00,
          created_at: new Date(),
          updated_at: new Date()
        }
      })
    }
    
    // 3. 减少SKU库存
    const skuResult = await decreaseSkuQuantity({
      skuId: id,
      quantity: validatedData.quantity,
      referenceId: validatedData.reference_id,
      notes: validatedData.notes || `销售给客户: ${validatedData.customer_name} (${validatedData.customer_phone})`,
      userId: req.user?.id,
      tx: tx
    })
    
    // 4. 计算价格
    const unit_price = validatedData.actual_total_price 
      ? validatedData.actual_total_price / validatedData.quantity
      : Number(sku.selling_price || sku.unit_price || 0)
    const total_price = validatedData.actual_total_price || (unit_price * validatedData.quantity)
    
    // 5. 创建客户购买记录
    const purchase = await tx.customerPurchases.create({
      data: {
        id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customer_id: customer.id,
        sku_id: id,
        sku_name: sku.sku_name,
        quantity: validatedData.quantity,
        unit_price: unit_price,
        total_price: total_price,
        original_price: Number(sku.selling_price || sku.unit_price || 0),
        sale_channel: validatedData.sale_channel || 'DIRECT',
        notes: validatedData.notes,
        purchase_date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    })
    
    // 6. 更新客户统计信息
    await tx.customers.update({
      where: { id: customer.id },
      data: {
        total_purchases: {
          increment: total_price
        },
        total_orders: {
          increment: 1
        },
        last_purchase_date: new Date(),
        first_purchase_date: customer.first_purchase_date || new Date(),
        updated_at: new Date()
      }
    })
    
    return {
      sku: skuResult,
      customer,
      purchase
    }
  })
  
  return res.json({
    success: true,
    message: 'SKU销售记录成功，客户信息已更新',
    data: {
      sku_id: result.sku.id,
      sku_code: result.sku.sku_code,
      sold_quantity: validatedData.quantity,
      remaining_quantity: result.sku.available_quantity,
      total_quantity: result.sku.total_quantity,
      customer_id: result.customer.id,
      customer_name: result.customer.name,
      purchase_id: result.purchase.id
    }
  })
}))

// 获取SKU库存变更历史
router.get('/:id/history', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { page = 1, limit = 20 } = req.query
  
  const skip = (Number(page) - 1) * Number(limit)
  
  const [logs, total] = await Promise.all([
    prisma.skuInventoryLog.findMany({
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
    prisma.skuInventoryLog.count({
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
}))

// 获取SKU统计信息
router.get('/stats/overview', authenticateToken, asyncHandler(async (_, res) => {
  const [totalSkus, activeSkus, totalProducts, availableProducts] = await Promise.all([
    prisma.productSku.count(),
    prisma.productSku.count({ where: { status: 'ACTIVE' } }),
    prisma.productSku.aggregate({
      _sum: { total_quantity: true }
    }),
    prisma.productSku.aggregate({
      _sum: { available_quantity: true }
    })
  ])
  
  // 获取低库存SKU（可售数量 <= 1）
  const lowStockSkus = await prisma.productSku.findMany({
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
  
  return res.json({
    success: true,
    message: 'SKU统计信息获取成功',
    data: {
      total_skus: totalSkus,
      active_skus: activeSkus,
      total_products: totalProducts._sum.total_quantity || 0,
      available_products: availableProducts._sum.available_quantity || 0,
      low_stock_skus: lowStockSkus
    }
  })
}))

// 获取SKU使用的原材料信息
router.get('/:id/materials', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 获取SKU及其关联的原材料使用记录（只获取CREATE操作的记录）
  const sku = await prisma.productSku.findUnique({
    where: { id },
    include: {
      material_usages: {
        where: {
          action: 'CREATE'
        },
        include: {
          material: {
            include: {
              purchase: {
                include: {
                  supplier: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
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
  
  // 按material_id分组，只保留第一条记录作为配方数量
  const materialUsageMap = new Map()
  for (const usage of sku.material_usages) {
    const materialId = usage.material?.id
    if (materialId && !materialUsageMap.has(materialId)) {
      // 只保存第一条记录，这是原始配方数量
      materialUsageMap.set(materialId, usage)
    }
  }
  
  // 整理原材料数据
  const materials = Array.from(materialUsageMap.values()).map(usage => {
    const material = usage.material
    
    // 根据材料类型确定规格
    let specification = '未设置'
    if (material?.bead_diameter) {
      specification = `${material.bead_diameter}mm`
    } else if (material?.accessory_specification) {
      specification = material.accessory_specification
    } else if (material?.finished_material_specification) {
      specification = material.finished_material_specification
    }
    
    return {
      material_id: material?.id,
      material_code: material?.material_code,
      material_name: material?.material_name,
      material_type: material?.material_type,
      quality: material?.quality,
      specification: specification,
      quantity_used: usage.quantity_used,
      quantity_used_beads: usage.quantity_used_beads || 0,
      quantity_used_pieces: usage.quantity_used_pieces || 0,
      unit_cost: material?.unit_cost || 0,
      total_cost: usage.total_cost || 0,
      inventory_unit: material?.inventory_unit,
      remaining_quantity: material?.remaining_quantity || 0,
      supplier_name: material?.purchase?.supplier?.name || null,
      supplier_id: material?.purchase?.supplier?.id || null,
      usage_id: usage.id,
      created_at: usage.created_at
    }
  })
  
  return res.json({
    success: true,
    message: 'SKU原材料信息获取成功',
    data: {
      sku_id: sku.id,
      sku_code: sku.sku_code,
      sku_name: sku.sku_name,
      materials: materials
    }
  })
}))

// SKU销毁（拆散重做，原材料退回库存）
router.delete('/:id/destroy', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { 
    quantity = 1, 
    reason = '拆散重做', 
    return_to_material = true, 
    selected_materials = [], 
    custom_return_quantities = {} 
  } = req.body
  
  // 开启事务进行销毁操作
  const result = await prisma.$transaction(async (tx) => {
    // 查询SKU及其原材料使用记录
    const sku = await tx.productSku.findUnique({
      where: { id },
      include: {
        material_usages: {
          include: {
            material: {
              select: {
                id: true,
                material_name: true,
                material_type: true,
                remaining_quantity: true
              }
            }
          }
        }
      }
    })
    
    if (!sku) {
      throw new Error('SKU不存在')
    }
    
    // 移除状态检查，任何状态的SKU都可以销毁
    
    if (sku.available_quantity < quantity) {
      throw new Error(`SKU可售数量不足，当前可售：${sku.available_quantity}，需要销毁：${quantity}`)
    }
    
    // 记录要回滚的原材料信息
    const restoredMaterials = []
    
    // 只有在选择退回原材料时才进行回滚操作
    if (return_to_material) {
      // 按material_id分组，避免重复处理同一种原材料
      const materialUsageMap = new Map()
      for (const usage of sku.material_usages) {
        if (usage.material && usage.action === 'CREATE') {
          const materialId = usage.material.id
          if (!materialUsageMap.has(materialId)) {
            materialUsageMap.set(materialId, usage)
          } else {
            // 如果已存在，累加数量
            const existingUsage = materialUsageMap.get(materialId)
            existingUsage.quantity_used += usage.quantity_used
          }
        }
      }
      
      // 回滚原材料库存
      for (const [materialId, usage] of materialUsageMap) {
        if (usage.material) {
          // 检查是否选择了这个原材料进行退回
          if (selected_materials.length === 0 || selected_materials.includes(materialId)) {
            // 计算退回数量：使用自定义数量或默认按比例计算
            let returnQuantity = usage.quantity_used
            if (custom_return_quantities[materialId] !== undefined) {
              returnQuantity = custom_return_quantities[materialId]
            } else {
              // 按销毁数量比例计算退回数量
              returnQuantity = Math.floor((usage.quantity_used * quantity) / sku.total_quantity)
            }
            
            if (returnQuantity > 0) {
              // 将使用的数量退回到materials表的remaining_quantity
              const updatedMaterial = await tx.material.update({
                where: { id: usage.material.id },
                data: {
                  remaining_quantity: {
                    increment: returnQuantity
                  },
                  used_quantity: {
                    decrement: returnQuantity
                  }
                }
              })
              
              // 记录材料使用日志（退回操作）
              await tx.materialUsage.create({
                data: {
                  material_id: usage.material.id,
                  sku_id: id,
                  quantity_used: -returnQuantity, // 负数表示退回
                  unit_cost: usage.unit_cost,
                  total_cost: -(usage.unit_cost * returnQuantity), // 负数表示退回
                  action: 'RETURN',
                  notes: `SKU销毁退回：${reason}`
                }
              })
              
              restoredMaterials.push({
                material_id: usage.material.id,
                material_name: usage.material.material_name,
                material_type: usage.material.material_type,
                restored_quantity: returnQuantity,
                new_remaining_quantity: updatedMaterial.remaining_quantity
              })
            }
          }
        }
      }
    }
    
    // 构建销毁日志的详细信息
    let destroy_notes = `销毁原因：${reason}`
    
    // 如果返还了原材料，添加返还信息到日志中
    if (return_to_material && restoredMaterials.length > 0) {
      const returned_materials_info = restoredMaterials.map(log => 
        `${log.material_name} ${log.restored_quantity}${log.material_type === 'LOOSE_BEADS' ? '颗' : log.material_type === 'ACCESSORIES' ? '片' : '个'}`
      ).join('，')
      destroy_notes += `。返还原材料：${returned_materials_info}`
    }
    
    // 创建SKU库存日志
    await tx.skuInventoryLog.create({
      data: {
        sku_id: id,
        action: 'DESTROY',
        quantity_change: -quantity,
        quantity_before: sku.available_quantity,
        quantity_after: sku.available_quantity - quantity,
        reference_type: 'DESTROY',
        reference_id: id,
        notes: destroy_notes,
        user_id: req.user?.id
      }
    })
    
    // 更新SKU数量
    // 注意：total_quantity是累计制作数量，永远不应该减少，只有available_quantity应该减少
    const newAvailableQuantity = sku.available_quantity - quantity
    const newStatus = newAvailableQuantity <= 0 ? 'INACTIVE' : sku.status
    
    const destroyedSku = await tx.productSku.update({
      where: { id },
      data: {
        status: newStatus,
        // total_quantity保持不变，因为它记录的是历史累计制作数量
        available_quantity: Math.max(0, newAvailableQuantity),
        // 重新计算总价值（基于新的可用库存）
        total_value: parseFloat(sku.selling_price?.toString() || '0') * Math.max(0, newAvailableQuantity),
        updated_at: new Date()
      }
    })
    
    return {
      destroyed_sku: {
        id: destroyedSku.id,
        sku_code: destroyedSku.sku_code,
        sku_name: destroyedSku.sku_name
      },
      restored_materials: restoredMaterials
    }
  })
  
  return res.json({
    success: true,
    message: 'SKU销毁成功，原材料已退回库存',
    data: result
  })
}))

// 获取SKU溯源信息
router.get('/:id/traces', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 获取SKU及其关联的原材料使用记录（不使用Product模型）
  const sku = await prisma.productSku.findUnique({
    where: { id },
    include: {
      material_usages: {
        where: { 
          action: 'CREATE',
          quantity_used: {
            gt: 0
          }
        },
        include: {
          material: {
            include: {
              purchase: {
                include: {
                  supplier: true,
                  user: {
                    select: {
                      id: true,
                      user_name: true,
                      name: true
                    }
                  }
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
  
  // 整理溯源数据
  const traceData = []
  
  // 按material_id分组，只取第一条CREATE记录的数量作为配方数量
  const materialUsageMap = new Map()
  for (const usage of sku.material_usages) {
    const materialId = usage.material_id
    if (!materialUsageMap.has(materialId)) {
      // 只保存第一条记录，这是原始配方数量
      materialUsageMap.set(materialId, usage)
    }
  }
  
  // 遍历合并后的原材料使用记录
  for (const [materialId, materialUsage] of materialUsageMap) {
    const purchase = materialUsage.material?.purchase
      
      // 计算使用的总数量和单位
      const quantityUsed = materialUsage.quantity_used
      const unit = '颗'
      
      // 直接使用MaterialUsage表的unit_cost，如果为空则使用Material表的unit_cost
      let correctPrice = 0
      
      if (materialUsage.unit_cost) {
        correctPrice = parseFloat(materialUsage.unit_cost.toString())
      } else if (materialUsage.material?.unit_cost) {
        correctPrice = parseFloat(materialUsage.material.unit_cost.toString())
      }
      
      // 根据产品类型选择正确的规格字段
      let correctSpecification = '未设置'
      
      switch (purchase?.purchase_type) {
        case 'LOOSE_BEADS':
        case 'BRACELET':
          // 散珠和手串优先使用beadDiameter，备选specification
          if (purchase.bead_diameter) {
            correctSpecification = `${purchase.bead_diameter}mm`
          } else if (purchase.specification) {
            correctSpecification = `${purchase.specification}mm`
          }
          break
        case 'ACCESSORIES':
        case 'FINISHED_MATERIAL':
          // 饰品配件和成品优先使用specification，备选beadDiameter
          if (purchase?.specification) {
            correctSpecification = `${purchase.specification}mm`
          } else if (purchase?.bead_diameter) {
            correctSpecification = `${purchase.bead_diameter}mm`
          }
          break
        default:
          // 默认优先beadDiameter，备选specification
          if (purchase?.bead_diameter) {
            correctSpecification = `${purchase.bead_diameter}mm`
          } else if (purchase?.specification) {
            correctSpecification = `${purchase.specification}mm`
          }
      }
      
      // 获取采购人员信息
      const operatorName = purchase?.user?.name || purchase?.user?.user_name || '未知采购员'
      
      // 构建溯源记录
      const traceRecord = {
        id: `trace-${materialUsage.id}`,
        type: 'material',
        name: `${purchase?.purchase_name || materialUsage.material?.material_name || '未知产品'}采购`,
        description: `采购${purchase?.purchase_name || materialUsage.material?.material_name || '未知产品'}原材料用于制作`,
        timestamp: purchase?.purchase_date || materialUsage.created_at || new Date(),
        operator: operatorName,
        location: '采购部',
        status: 'completed',
        details: {
          supplier: purchase?.supplier?.name || '未知供应商',
          batch_number: purchase?.purchase_code || '无批次号',
          quantity: `${quantityUsed}${unit}`,
          quality_grade: purchase?.quality || '未设置',
          diameter: correctSpecification,
          purchase_price: `¥${correctPrice.toFixed(2)}`
        },
        materials: [{
          material_id: materialUsage.material?.id || materialUsage.id,
          material_name: purchase?.purchase_name || materialUsage.material?.material_name || '未知产品',
          quantity_used: quantityUsed,
          unit: unit,
          cost_per_unit: correctPrice,
          supplier: purchase?.supplier?.name || '未知供应商',
          batch_number: purchase?.purchase_code || '无批次号'
        }]
      }
      
      traceData.push(traceRecord)
  }
  
  // 按时间排序（最新的在前）
  traceData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  return res.json({
    success: true,
    message: 'SKU溯源信息获取成功',
    data: {
      sku_info: {
        id: sku.id,
        sku_code: sku.sku_code,
        sku_name: sku.sku_name,
        specification: sku.specification
      },
      traces: traceData
    }
  })
}))

// 获取SKU补货信息
router.get('/:id/restock-info', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 获取SKU及其关联的原材料使用记录（只查询CREATE操作的记录）
  const sku = await prisma.productSku.findUnique({
    where: { id },
    include: {
      material_usages: {
        where: { action: 'CREATE' },
        include: {
          material: {
            include: {
              purchase: {
                include: {
                  supplier: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
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
  
  // 按material_id分组，只取第一条CREATE记录的数量作为配方数量
  const materialUsageMap = new Map()
  for (const usage of sku.material_usages) {
    const materialId = usage.material_id
    if (!materialUsageMap.has(materialId)) {
      // 只保存第一条记录，这是原始配方数量
      materialUsageMap.set(materialId, {
        material_id: materialId,
        material: usage.material,
        quantity_used: usage.quantity_used, // 使用原始配方数量，不累加
        total_cost: usage.total_cost || 0
      })
    }
  }
  
  // 计算补货所需的原材料
  const required_materials = []
  const insufficient_materials = []
  let can_restock = true
  
  // 遍历合并后的原材料使用记录，计算每个原材料的需求量
  for (const [materialId, usage] of materialUsageMap) {
    const material = usage.material
    if (!material) continue
    
    const purchase = material.purchase
    const supplier_name = purchase?.supplier?.name || '未知供应商'
    
    // 计算每个SKU需要的原材料数量（合并后的总量）
    const quantity_needed_per_sku = usage.quantity_used
    const available_quantity = material.remaining_quantity || 0
    const is_sufficient = available_quantity >= quantity_needed_per_sku
    
    if (!is_sufficient) {
      can_restock = false
      insufficient_materials.push(material.material_name)
    }
    
    // 确定单位
    let unit = '件'
    switch (material.material_type) {
      case 'LOOSE_BEADS':
      case 'BRACELET':
        unit = '颗'
        break
      case 'ACCESSORIES':
        unit = '片'
        break
      case 'FINISHED_MATERIAL':
        unit = '件'
        break
    }
    
    // 获取规格信息
    let specification
    if (material.bead_diameter) {
      specification = material.bead_diameter
    } else if (material.accessory_specification) {
      specification = material.accessory_specification
    } else if (material.finished_material_specification) {
      specification = material.finished_material_specification
    }
    
    const restock_material = {
      material_id: material.id,
      material_name: material.material_name,
      material_type: material.material_type,
      supplier_name: supplier_name,
      material_code: material.material_code || material.id,
      bead_diameter: material.bead_diameter,
      specification: specification,
      quality: material.quality,
      quantity_needed_per_sku: quantity_needed_per_sku,
      available_quantity: available_quantity,
      unit_cost: parseFloat(material.unit_cost?.toString() || '0'),
      unit: unit,
      is_sufficient: is_sufficient
    }
    
    required_materials.push(restock_material)
  }
  
  const restock_info = {
    sku_id: sku.id,
    sku_code: sku.sku_code,
    sku_name: sku.sku_name,
    current_quantity: sku.available_quantity,
    labor_cost: parseFloat(sku.labor_cost?.toString() || '0'),
    craft_cost: parseFloat(sku.craft_cost?.toString() || '0'),
    required_materials: required_materials,
    can_restock: can_restock,
    insufficient_materials: insufficient_materials.length > 0 ? insufficient_materials : undefined
  }
  
  return res.json({
    success: true,
    message: 'SKU补货信息获取成功',
    data: restock_info
  })
}))

// SKU补货操作
router.post('/:id/restock', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { quantity = 1 } = req.body
  
  // 验证输入
  const restockSchema = z.object({
    quantity: z.number().int().min(1, '补货数量必须大于0')
  })
  
  const validatedData = restockSchema.parse({
    quantity: Number(quantity)
  })
  
  const result = await prisma.$transaction(async (tx) => {
    // 获取SKU及其关联的原材料使用记录（只查询CREATE操作的记录）
    const sku = await tx.productSku.findUnique({
      where: { id },
      include: {
        material_usages: {
          where: { action: 'CREATE' },
          include: {
            material: {
              select: {
                id: true,
                material_name: true,
                material_type: true,
                remaining_quantity: true,
                unit_cost: true
              }
            }
          }
        }
      }
    })
    
    if (!sku) {
      throw new Error('SKU不存在')
    }
    
    // 补货操作不需要验证SKU状态，任何状态的SKU都可以补货
    
    // 按material_id分组，只取第一条CREATE记录的数量作为配方数量
    const materialUsageMap = new Map()
    for (const usage of sku.material_usages) {
      const materialId = usage.material_id
      if (!materialUsageMap.has(materialId)) {
        // 只保存第一条记录，这是原始配方数量
        materialUsageMap.set(materialId, {
          material_id: materialId,
          material: usage.material,
          quantity_used: usage.quantity_used, // 使用原始配方数量，不累加
          total_cost: usage.total_cost || 0
        })
      }
    }
    
    // 验证原材料库存是否充足
    const insufficient_materials = []
    const consumed_materials = []
    let total_material_cost = 0
    
    for (const [materialId, usage] of materialUsageMap) {
      const material = usage.material
      if (!material) continue
      
      const required_quantity = usage.quantity_used * validatedData.quantity
      const available_quantity = material.remaining_quantity || 0
      
      if (available_quantity < required_quantity) {
        insufficient_materials.push({
          material_name: material.material_name,
          required: required_quantity,
          available: available_quantity
        })
      } else {
        consumed_materials.push({
          material_id: materialId,
          material_name: material.material_name,
          consumed_quantity: required_quantity,
          unit_cost: parseFloat(material.unit_cost?.toString() || '0')
        })
        total_material_cost += required_quantity * parseFloat(material.unit_cost?.toString() || '0')
      }
    }
    
    // 如果有原材料库存不足，返回错误
    if (insufficient_materials.length > 0) {
      const errorMsg = insufficient_materials.map(m => 
        `${m.material_name}(需要${m.required}，库存${m.available})`
      ).join('、')
      throw new Error(`原材料库存不足：${errorMsg}`)
    }
    
    // 扣减原材料库存
    for (const consumed of consumed_materials) {
      await tx.material.update({
        where: { id: consumed.material_id },
        data: {
          remaining_quantity: {
            decrement: consumed.consumed_quantity
          }
        }
      })
      
      // 创建原材料库存变更审计日志
      await tx.auditLog.create({
        data: {
          action: 'MATERIAL_CONSUME',
          resource: 'material',
          resource_id: consumed.material_id,
          details: `SKU补货消耗原材料 - SKU: ${sku.sku_code}, 材料: ${consumed.material_name}, 消耗数量: ${consumed.consumed_quantity}`,
          user_id: req.user?.id
        }
      })
    }
    
    // 增加SKU库存
    const updatedSku = await tx.productSku.update({
      where: { id },
      data: {
        total_quantity: {
          increment: validatedData.quantity
        },
        available_quantity: {
          increment: validatedData.quantity
        },
        // 重新计算总价值（基于新的可用库存）
        total_value: parseFloat(sku.selling_price?.toString() || '0') * (sku.available_quantity + validatedData.quantity)
      }
    })
    
    // 创建SKU库存变更日志
    await tx.skuInventoryLog.create({
      data: {
        sku_id: id,
        action: 'ADJUST',
        quantity_change: validatedData.quantity,
        quantity_before: sku.total_quantity,
        quantity_after: updatedSku.total_quantity,
        reference_type: 'MANUAL',
        notes: `补货 ${validatedData.quantity} 件，总成本: ${total_material_cost + (parseFloat(sku.labor_cost?.toString() || '0') * validatedData.quantity) + (parseFloat(sku.craft_cost?.toString() || '0') * validatedData.quantity)}`,
        user_id: req.user?.id || ''
      }
    })
    
    // 创建原材料使用记录
    for (const consumed of consumed_materials) {
      await tx.materialUsage.create({
        data: {
          sku_id: id,
          material_id: consumed.material_id,
          quantity_used: consumed.consumed_quantity,
          total_cost: consumed.consumed_quantity * consumed.unit_cost,
          action: 'CREATE'
        }
      })
    }
    
    return {
      sku: updatedSku,
      consumed_materials: consumed_materials.map(m => ({
        material_id: m.material_id,
        material_name: m.material_name,
        consumed_quantity: m.consumed_quantity,
        remaining_quantity: 0 // 需要重新查询获取最新库存
      })),
      total_cost: total_material_cost + (parseFloat(sku.labor_cost?.toString() || '0') * validatedData.quantity) + (parseFloat(sku.craft_cost?.toString() || '0') * validatedData.quantity)
    }
  })
  
  // 重新查询更新后的原材料库存
  const updatedMaterials = await Promise.all(
    result.consumed_materials.map(async (m) => {
      const material = await prisma.material.findUnique({
        where: { id: m.material_id },
        select: { remaining_quantity: true }
      })
      return {
        ...m,
        remaining_quantity: material?.remaining_quantity || 0
      }
    })
  )
  
  return res.json({
    success: true,
    message: `SKU补货成功，补货数量：${validatedData.quantity}件`,
    data: {
      sku_id: result.sku.id,
      sku_code: result.sku.sku_code,
      restocked_quantity: validatedData.quantity,
      new_total_quantity: result.sku.total_quantity,
      new_available_quantity: result.sku.available_quantity,
      consumed_materials: updatedMaterials,
      total_cost: result.total_cost
    }
  })
}))

// SKU控制（价格和状态管理）
router.put('/:id/control', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { selling_price, status, reason, status_reason } = req.body
  
  // 验证输入
  const controlSchema = z.object({
    selling_price: z.number().min(0, '售价必须大于等于0').optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    reason: z.string().optional(), // 调价原因
    status_reason: z.string().optional() // 状态变更原因
  })
  
  const validatedData = controlSchema.parse({
    selling_price: selling_price ? Number(selling_price) : undefined,
    status: status,
    reason: reason,
    status_reason: status_reason
  })
  
  // 检查SKU是否存在
  const sku = await prisma.productSku.findUnique({
    where: { id }
  })
  
  if (!sku) {
    return res.status(404).json({
      success: false,
      message: 'SKU不存在'
    })
  }
  
  // 构建更新数据
  const updateData: any = {
    updated_at: new Date()
  }
  
  if (validatedData.selling_price !== undefined) {
    updateData.selling_price = validatedData.selling_price
    // 重新计算利润率
    const totalCost = parseFloat(sku.total_cost?.toString() || '0')
    const newProfitMargin = validatedData.selling_price > 0 
      ? ((validatedData.selling_price - totalCost) / validatedData.selling_price) * 100 
      : 0
    updateData.profit_margin = newProfitMargin
    // 重新计算总价值（基于可用库存）
    updateData.total_value = validatedData.selling_price * sku.available_quantity
  }
  
  if (validatedData.status !== undefined) {
    updateData.status = validatedData.status
  }
  
  // 更新SKU
  const updatedSku = await prisma.productSku.update({
    where: { id },
    data: updateData
  })
  
  // 创建操作日志
  const changes = []
  if (validatedData.selling_price !== undefined) {
    const priceChange = `售价: ${sku.selling_price} → ${validatedData.selling_price}`
    if (validatedData.reason) {
      changes.push(`${priceChange}, 原因: ${validatedData.reason}`)
    } else {
      changes.push(priceChange)
    }
  }
  if (validatedData.status !== undefined) {
    const statusChange = `状态: ${sku.status} → ${validatedData.status}`
    if (validatedData.status_reason) {
      changes.push(`${statusChange}, 原因: ${validatedData.status_reason}`)
    } else {
      changes.push(statusChange)
    }
  }
  
  await prisma.skuInventoryLog.create({
    data: {
      sku_id: id,
      action: 'ADJUST',
      quantity_change: 0,
      quantity_before: sku.available_quantity,
      quantity_after: sku.available_quantity,
      reference_type: 'MANUAL',
      reference_id: id,
      notes: `SKU控制更新: ${changes.join(', ')}`,
      user_id: req.user?.id || ''
    }
  })
  
  return res.json({
    success: true,
    message: 'SKU控制更新成功',
    data: {
      sku_id: updatedSku.id,
      sku_code: updatedSku.sku_code,
      selling_price: updatedSku.selling_price,
      status: updatedSku.status,
      changes: changes
    }
  })
}))

export default router