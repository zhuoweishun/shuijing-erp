import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
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
  
  const result = await getSkuList({
    page: Number(page),
    limit: Number(limit),
    search: String(search),
    status: String(status)
  })
  
  res.json({
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
  // 函数结束
  // 函数结束
}))

// 获取SKU详情
router.get('/:id', async (_req, res) => {
  try {
    const { id } = req.params
    const userRole = req.user?.role
    
    const sku = await getSkuDetails(id)
    
    if (!sku) {
      return res.status(404).json({
        success: false,
        message: 'SKU不存在'
      })
    }
    
    // 根据用户角色过滤敏感信息
    let filteredSku = { ...sku }
    if (userRole !== 'BOSS' && userRole !== 'MANAGER') {
      // 非管理员角色隐藏价格信息
      delete filteredSku.selling_price
      delete filteredSku.unit_price
      delete filteredSku.total_value
      delete filteredSku.total_cost
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
    
    res.json({
      success: true,
      message: 'SKU详情获取成功',
      data: convertedSku
    })
  } catch (error) {
    console.error('获取SKU详情失败:', error)
    res.status(500).json({
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
  
  const result = await prisma.$transaction(async (tx) => {
    return await adjustSkuQuantity({
      skuId: id,
      newQuantity: validatedData.new_quantity,
      notes: validatedData.notes,
      userId: req.user.id,
      tx: tx
    })
  })
  
  res.json({
    success: true,
    message: 'SKU库存调整成功',
    data: {
      sku_id: result.id,
      sku_code: result.skuCode,
      new_quantity: result.availableQuantity,
      total_quantity: result.totalQuantity
    }
  })
  // 函数结束
  // 函数结束
}))

// 销售SKU（减少可售数量）
router.post('/:id/sell', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { quantity = 1, reference_id, notes } = req.body
  
  // 验证输入
  const sellSchema = z.object({
    quantity: z.number().int().min(1),
    reference_id: z.string().optional(),
    notes: z.string().optional()
  })
  
  const validatedData = sellSchema.parse({
    quantity: Number(quantity),
    reference_id: reference_id ? String(reference_id) : undefined,
    notes: notes ? String(notes) : undefined
  })
  
  const result = await prisma.$transaction(async (tx) => {
    return await decreaseSkuQuantity({
      skuId: id,
      quantity: validatedData.quantity,
      referenceId: validatedData.reference_id,
      notes: validatedData.notes || `销售 ${validatedData.quantity} 件`,
      userId: req.user.id,
      tx: tx
    })
  })
  
  res.json({
    success: true,
    message: 'SKU销售记录成功',
    data: {
      sku_id: result.id,
      sku_code: result.skuCode,
      sold_quantity: validatedData.quantity,
      remaining_quantity: result.availableQuantity,
      total_quantity: result.totalQuantity
    }
  })
  // 函数结束
  // 函数结束
}))

// 获取SKU库存变更历史
router.get('/:id/history', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { page = 1, limit = 20 } = req.query
  
  const skip = (Number(page) - 1) * Number(limit)
  
  const [logs, total] = await Promise.all([
    prisma.skuInventoryLog.findMany({
      where: { skuId: id },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
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
      where: { skuId: id }
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
        totalPages: Math.ceil(total / Number(limit))
      }
    }
  })
  // 函数结束
  // 函数结束
}))

// 获取SKU统计信息
router.get('/stats/overview', authenticateToken, asyncHandler(async (req, res) => {
  const [totalSkus, activeSkus, totalProducts, availableProducts] = await Promise.all([
    prisma.productSku.count(),
    prisma.productSku.count({ where: { status: 'ACTIVE' } }),
    prisma.productSku.aggregate({
      _sum: { totalQuantity: true }
    }),
    prisma.productSku.aggregate({
      _sum: { availableQuantity: true }
    })
  ])
  
  // 获取低库存SKU（可售数量 <= 1）
  const lowStockSkus = await prisma.productSku.findMany({
    where: {
      status: 'ACTIVE',
      availableQuantity: {
        lte: 1
      }
    },
    select: {
      id: true,
      skuCode: true,
      skuName: true,
      availableQuantity: true,
      totalQuantity: true
    },
    take: 10
  })
  
  res.json({
    success: true,
    message: 'SKU统计信息获取成功',
    data: {
      total_skus: totalSkus,
      active_skus: activeSkus,
      total_products: totalProducts._sum.totalQuantity || 0,
      available_products: availableProducts._sum.availableQuantity || 0,
      low_stock_skus: lowStockSkus
    }
  })
  // 函数结束
  // 函数结束
}))

// 获取SKU溯源信息
router.get('/:id/traces', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 获取SKU及其关联的成品和原材料使用记录
  const sku = await prisma.productSku.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          material_usages: {
            include: {
              purchase: {
                select: {
                  id: true,
                  purchaseCode: true,
                  productName: true,
                  productType: true,
                  quality: true,
                  beadDiameter: true,
                  specification: true,
                  unitPrice: true,
                  pricePerGram: true,
                  pricePerBead: true,
                  pricePerPiece: true,
                  supplierId: true,
                  userId: true,
                  purchaseDate: true,
                  notes: true,
                  supplier: {
                    select: {
                      id: true,
                      name: true
                    }
                  },
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
  
  // 遍历所有关联的成品
  for (const product of sku.products) {
    // 遍历每个成品的原材料使用记录
    for (const materialUsage of product.materialUsages) {
      const purchase = materialUsage.purchase
      
      // 计算使用的总数量和单位
      let quantityUsed = 0
      let unit = ''
      
      if (materialUsage.quantityUsedBeads > 0) {
        quantityUsed = materialUsage.quantityUsedBeads
        unit = '颗'
      } else if (materialUsage.quantityUsedPieces > 0) {
        quantityUsed = materialUsage.quantityUsedPieces
        unit = '件'
      }
      
      // 根据产品类型选择正确的价格字段
      let correctPrice = 0
      
      switch (purchase.productType) {
        case 'LOOSE_BEADS':
          correctPrice = parseFloat(purchase.pricePerBead?.toString() || '0')
          // 如果pricePerBead为空，尝试其他价格字段
          if (correctPrice === 0) {
            correctPrice = parseFloat(purchase.unitPrice?.toString() || purchase.pricePerGram?.toString() || '0')
          }
          break
        case 'BRACELET':
          correctPrice = parseFloat(purchase.unitPrice?.toString() || '0')
          // 如果unitPrice为空，尝试其他价格字段
          if (correctPrice === 0) {
            correctPrice = parseFloat(purchase.pricePerBead?.toString() || purchase.pricePerGram?.toString() || '0')
          }
          break
        case 'ACCESSORIES':
        case 'FINISHED':
          correctPrice = parseFloat(purchase.pricePerPiece?.toString() || '0')
          // 如果pricePerPiece为空，尝试其他价格字段
          if (correctPrice === 0) {
            correctPrice = parseFloat(purchase.unitPrice?.toString() || purchase.pricePerGram?.toString() || purchase.pricePerBead?.toString() || '0')
          }
          break
        default:
          correctPrice = parseFloat(purchase.unitPrice?.toString() || '0')
          // 如果unitPrice为空，尝试其他价格字段
          if (correctPrice === 0) {
            correctPrice = parseFloat(purchase.pricePerBead?.toString() || purchase.pricePerGram?.toString() || purchase.pricePerPiece?.toString() || '0')
          }
      }
      
      // 根据产品类型选择正确的规格字段
      let correctSpecification = '未设置'
      
      switch (purchase.productType) {
        case 'LOOSE_BEADS':
        case 'BRACELET':
          // 散珠和手串优先使用beadDiameter，备选specification
          if (purchase.beadDiameter) {
            correctSpecification = `${purchase.beadDiameter}mm`
          } else if (purchase.specification) {
            correctSpecification = `${purchase.specification}mm`
          }
          break
        case 'ACCESSORIES':
        case 'FINISHED':
          // 饰品配件和成品优先使用specification，备选beadDiameter
          if (purchase.specification) {
            correctSpecification = `${purchase.specification}mm`
          } else if (purchase.beadDiameter) {
            correctSpecification = `${purchase.beadDiameter}mm`
          }
          break
        default:
          // 默认优先beadDiameter，备选specification
          if (purchase.beadDiameter) {
            correctSpecification = `${purchase.beadDiameter}mm`
          } else if (purchase.specification) {
            correctSpecification = `${purchase.specification}mm`
          }
      }
      
      // 获取采购人员信息
      const operatorName = purchase.user?.name || purchase.user?.username || '未知采购员'
      
      // 构建溯源记录
      const traceRecord = {
        id: `trace-${materialUsage.id}`,
        type: 'material',
        name: `${purchase.productName}采购`,
        description: `采购${purchase.productName}原材料用于制作`,
        timestamp: purchase.purchaseDate,
        operator: operatorName,
        location: '采购部',
        status: 'completed',
        details: {
          supplier: purchase.supplier?.name || '未知供应商',
          batch_number: purchase.purchaseCode || '无批次号',
          quantity: `${quantityUsed}${unit}`,
          quality_grade: purchase.quality || '未设置',
          diameter: correctSpecification,
          purchase_price: `¥${correctPrice.toFixed(2)}`
        },
        materials: [{
          material_id: purchase.id,
          material_name: purchase.productName,
          quantity_used: quantityUsed,
          unit: unit,
          cost_per_unit: materialUsage.unitCost ? parseFloat(materialUsage.unitCost.toString()) : correctPrice,
          supplier: purchase.supplier?.name || '未知供应商',
          batch_number: purchase.purchaseCode || '无批次号'
        }]
      }
      
      traceData.push(traceRecord)
    }
  }
  
  // 按时间排序（最新的在前）
  traceData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  
  res.json({
    success: true,
    message: 'SKU溯源信息获取成功',
    data: {
      sku_info: {
        id: sku.id,
        sku_code: sku.skuCode,
        sku_name: sku.skuName,
        specification: sku.specification
      },
      traces: traceData
    }
  })
  // 函数结束
  // 函数结束
}))

export default router