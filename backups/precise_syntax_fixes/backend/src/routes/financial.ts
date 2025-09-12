import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate_token } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { convertToApiFormat, convertFromApiFormat } from '../utils/fieldConverter.js'

const router = Router()

// 简化的查询参数验证
const financialQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional()
})

// 库存状况查询参数验证
const inventoryQuerySchema = z.object({
  stalePeriod: z.enum(['1', '3', '6']).optional().default('1') // 滞销时间：1个月、3个月、6个月
})

const statisticsQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  groupBy: z.enum(['day', 'month']).optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional()
})

// 财务记录路由 - 包含采购支出、制作成本和销毁退回记录
router.get('/records', authenticate_token, asyncHandler(async (req, res) => {
  const query = financialQuerySchema.parse(req.query)
  const page = parseInt(query.page || '1')
  const limit = parseInt(query.limit || '20')
  const offset = (page - 1) * limit

  // 构建时间查询条件
  const timeWhere: any = {}
  if (query.start_date || query.end_date) {
    if (query.start_date) {
      timeWhere.gte = new Date(query.start_date)
    }
    if (query.end_date) {
      timeWhere.lte = new Date(query.end_date + 'T23:59:59.999Z')
    }
  }

  // 获取采购记录 - 所有采购记录都计入财务（简化状态逻辑）
  const purchases = await prisma.purchase.find_many({
    where: {
      ...(Object.keys(timeWhere).length > 0 ? { purchase_date: timeWhere } : {})
    },
    include: {
      supplier: { select: { id: true, name: true } },
      user: { select: { id: true, user_name: true, name: true } }
    }
  })

  // 获取SKU制作记录
  const skuCreations = await prisma.product_sku.find_many({
    where: {
      ...(Object.keys(timeWhere).length > 0 ? { created_at: timeWhere } : {})
    },
    include: {
      creator: { select: { id: true, user_name: true, name: true } }
    }
  })

  // 获取补货操作记录（从库存变更日志中获取）
  const restockLogs = await prisma.sku_inventory_log.find_many({
    where: {
      action: 'ADJUST',
      notes: {
        contains: '补货操作'
      },
      ...(Object.keys(timeWhere).length > 0 ? { created_at: timeWhere } : {})
    },
    include: {
      sku: { select: { sku_code: true, sku_name: true } },
      user: { select: { id: true, user_name: true, name: true } }
    }
  })

  // 销毁记录不再涉及财务 - 已移除相关查询

  // 获取财务记录（销售收入和退货记录）
  const financial_records = await prisma.financial_record.find_many({
    where: {
      type: {
        in: ['INCOME', 'REFUND']
      },
      ...(Object.keys(timeWhere).length > 0 ? { transaction_date: timeWhere } : {})
    },
    include: {
      user: { select: { id: true, user_name: true, name: true } }
    }
  })

  // 获取客户购买记录（销售收入）
  const customerPurchases = await prisma.customer_purchase.find_many({
    where: {
      ...(Object.keys(timeWhere).length > 0 ? { purchase_date: timeWhere } : {})
    },
    include: {
      customer: { select: { name: true } },
      sku: { select: { sku_name: true, sku_code: true } }
    }
  })

  // 转换为统一的财务记录格式
  const allRecords = [
    // 采购支出记录
    ...purchases.map(purchase => ({
      id: `purchase_${purchase.id}`,
      record_type: 'EXPENSE',
      amount: purchase.total_price,
      description: `采购支出 - ${purchase.product_name}`,
      reference_type: 'PURCHASE',
      reference_id: purchase.id,
      category: '采购支出',
      transaction_date: purchase.purchase_date.toISOString().split('T')[0],
      notes: `供应商: ${purchase.supplier?.name || '未知'}, 规格: ${purchase.specification || '无'}`,
      created_at: purchase.created_at,
      updated_at: purchase.updated_at,
      user: purchase.user ? {
        id: purchase.user.id,
        user_name: purchase.user.user_name,
        real_name: purchase.user.name
      } : null
    })),
    // 制作成本记录
    ...skuCreations.map(sku => {
      const labor_cost = Number(sku.labor_cost || 0)
      const craft_cost = Number(sku.craft_cost || 0)
      const quantity = Number(sku.total_quantity || 0)
      const total_cost = (labor_cost + craft_cost) * quantity
      return {
        id: `production_${sku.id}`,
        record_type: 'EXPENSE',
        amount: total_cost,
        description: `制作成本 - ${sku.sku_name}`,
        reference_type: 'PRODUCTION',
        reference_id: sku.id,
        category: '制作成本',
        transaction_date: sku.created_at.toISOString().split('T')[0],
        notes: `人工成本: ¥${labor_cost.toFixed(2)}, 工艺成本: ¥${craft_cost.toFixed(2)}, 数量: ${quantity}件`,
        created_at: sku.created_at,
        updated_at: sku.updated_at,
        user: sku.creator ? {
          id: sku.creator.id,
          user_name: sku.creator.user_name,
          real_name: sku.creator.name
        } : null
      }
    }),
    // 补货制作成本记录
    ...restockLogs.map(log => {
      // 从notes中提取成本信息
      const notes = log.notes || ''
      const laborCostMatch = notes.match(/人工成本: ¥([\d.]+)/)
      const craftCostMatch = notes.match(/工艺成本: ¥([\d.]+)/)
      const materialCostMatch = notes.match(/消耗原材料成本: ¥([\d.]+)/)
      
      const labor_cost = laborCostMatch ? Number(laborCostMatch[1]) : 0
      const craft_cost = craftCostMatch ? Number(craftCostMatch[1]) : 0
      const material_cost = materialCostMatch ? Number(materialCostMatch[1]) : 0
      const total_cost = labor_cost + craft_cost
      
      return {
        id: `restock_${log.id}`,
        record_type: 'EXPENSE',
        amount: total_cost,
        description: `补货制作成本 - ${log.sku.sku_name}`,
        reference_type: 'RESTOCK',
        reference_id: log.id,
        category: '制作成本',
        transaction_date: log.created_at.toISOString().split('T')[0],
        notes: `补货数量: ${log.quantity_change}件, 人工成本: ¥${labor_cost.toFixed(2)}, 工艺成本: ¥${craft_cost.toFixed(2)}`,
        created_at: log.created_at,
        updated_at: log.created_at,
        user: log.user ? {
          id: log.user.id,
          user_name: log.user.user_name,
          real_name: log.user.name
        } : null
      }
    }).filter(record => record.amount > 0), // 只包含有成本的记录
    // 销毁退回不涉及财务 - 已移除
    // 客户购买收入记录
    ...customerPurchases.filter(purchase => purchase.status === 'ACTIVE').map(purchase => ({
      id: `customer_sale_${purchase.id}`,
      record_type: 'INCOME',
      amount: Number(purchase.total_price),
      description: `销售收入 - ${purchase.sku.sku_name}`,
      reference_type: 'CUSTOMER_SALE',
      reference_id: purchase.id,
      category: '销售收入',
      transaction_date: purchase.purchase_date.toISOString().split('T')[0],
      notes: `客户: ${purchase.customer.name}, SKU编码: ${purchase.sku.sku_code}, 数量: ${purchase.quantity}件, 单价: ¥${Number(purchase.unit_price).toFixed(2)}`,
      created_at: purchase.created_at,
      updated_at: purchase.updated_at,
      user: null
    })),
    // 客户退货记录
    ...customerPurchases.filter(purchase => purchase.status === 'REFUNDED').map(purchase => ({
      id: `customer_refund_${purchase.id}`,
      record_type: 'REFUND',
      amount: Number(purchase.total_price),
      description: `客户退货退款 - ${purchase.sku.sku_name}`,
      reference_type: 'CUSTOMER_REFUND',
      reference_id: purchase.id,
      category: '客户退货',
      transaction_date: purchase.refund_date ? purchase.refund_date.toISOString().split('T')[0] : purchase.purchase_date.toISOString().split('T')[0],
      notes: `客户: ${purchase.customer.name}, SKU编码: ${purchase.sku.sku_code}, 退货数量: ${purchase.quantity}件, 退款金额: ¥${Number(purchase.total_price).toFixed(2)}${purchase.refund_reason ? `, 退货原因: ${purchase.refund_reason}` : ''}`,
      created_at: purchase.refund_date || purchase.created_at,
      updated_at: purchase.updated_at,
      user: null
    }))
  ]

  // 按创建时间倒序排序
  allRecords.sort((a, b) => new Date(b.created_at).get_time() - new Date(a.created_at).get_time())

  // 分页处理
  const total = allRecords.length
  const paginatedRecords = allRecords.slice(offset, offset + limit)

  res.json({
    success: true,
    data: {
      records: paginatedRecords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  })
}))

// 流水账路由 - 与records路由功能相同，但返回格式符合前端期望
router.get('/transactions', authenticate_token, asyncHandler(async (req, res) => {
  const query = financialQuerySchema.parse(req.query)
  const page = parseInt(query.page || '1')
  const limit = parseInt(query.limit || '20')
  const offset = (page - 1) * limit

  // 构建时间查询条件
  const timeWhere: any = {}
  if (query.start_date || query.end_date) {
    if (query.start_date) {
      timeWhere.gte = new Date(query.start_date)
    }
    if (query.end_date) {
      timeWhere.lte = new Date(query.end_date + 'T23:59:59.999Z')
    }
  }

  // 获取采购记录 - 所有采购记录都计入财务（简化状态逻辑）
  const purchases = await prisma.purchase.find_many({
    where: {
      ...(Object.keys(timeWhere).length > 0 ? { purchase_date: timeWhere } : {})
    },
    include: {
      supplier: { select: { id: true, name: true } },
      user: { select: { id: true, user_name: true, name: true } }
    }
  })

  // 获取SKU制作记录
  const skuCreations = await prisma.product_sku.find_many({
    where: {
      ...(Object.keys(timeWhere).length > 0 ? { created_at: timeWhere } : {})
    },
    include: {
      creator: { select: { id: true, user_name: true, name: true } }
    }
  })

  // 获取补货操作记录（从库存变更日志中获取）
  const restockLogs = await prisma.sku_inventory_log.find_many({
    where: {
      action: 'ADJUST',
      notes: {
        contains: '补货操作'
      },
      ...(Object.keys(timeWhere).length > 0 ? { created_at: timeWhere } : {})
    },
    include: {
      sku: { select: { sku_code: true, sku_name: true } },
      user: { select: { id: true, user_name: true, name: true } }
    }
  })

  // 销毁记录不再涉及财务 - 已移除相关查询

  // 获取财务记录（销售收入和退货记录）
  const financial_records = await prisma.financial_record.find_many({
    where: {
      ...(Object.keys(timeWhere).length > 0 ? { transaction_date: timeWhere } : {})
    }
  })

  // 获取客户购买记录（销售收入）
  const customerPurchases = await prisma.customer_purchase.find_many({
    where: {
      ...(Object.keys(timeWhere).length > 0 ? { purchase_date: timeWhere } : {})
    },
    include: {
      customer: { select: { name: true } },
      sku: { select: { sku_name: true, sku_code: true } }
    }
  })

  // 转换为流水账记录格式
  const allTransactions = [
    // 采购支出记录
    ...purchases.map(purchase => {
      // 格式化规格显示（根据产品类型使用正确的字段）
      let specificationDisplay = '无';
      
      switch (purchase.material_type) {
        case 'LOOSE_BEADS':
        case 'BRACELET':
          // 散珠和手串使用bead_diameter字段
          if (purchase.bead_diameter) {
            specificationDisplay = `直径: ${purchase.bead_diameter}mm`;
          }
          break;
        case 'ACCESSORIES':
          // 配件使用specification字段
          if (purchase.specification) {
            specificationDisplay = `规格: ${purchase.specification}mm`;
          }
          break;
        case 'FINISHED':
          // 成品使用specification字段
          if (purchase.specification) {
            specificationDisplay = `尺寸: ${purchase.specification}mm`;
          }
          break;
        default:
          // 其他类型优先使用specification，其次使用beadDiameter
          if (purchase.specification) {
            specificationDisplay = `规格: ${purchase.specification}mm`;
          } else if (purchase.bead_diameter) {
            specificationDisplay = `直径: ${purchase.bead_diameter}mm`;
          }
          break;
      }
      
      // 格式化数量显示（添加单位）
      let quantityDisplay = '';
      
      // 根据产品类型使用不同的数量字段
      let qty = null;
      switch (purchase.material_type) {
        case 'BRACELET':
          // 手串使用quantity字段
          qty = purchase.quantity;
          if (qty) {
            quantityDisplay = `数量: ${qty}串`;
          }
          break;
        case 'LOOSE_BEADS':
          // 散珠使用piece_count字段
          qty = purchase.piece_count;
          if (qty) {
            quantityDisplay = `数量: ${qty}颗`;
          }
          break;
        case 'ACCESSORIES':
          // 配件使用piece_count字段
          qty = purchase.piece_count;
          if (qty) {
            quantityDisplay = `数量: ${qty}片`;
          }
          break;
        case 'FINISHED':
          // 成品使用piece_count字段
          qty = purchase.piece_count;
          if (qty) {
            quantityDisplay = `数量: ${qty}件`;
          }
          break;
        default:
          // 其他类型优先使用quantity，其次使用piece_count
          qty = purchase.quantity || purchase.piece_count;
          if (qty) {
            quantityDisplay = `数量: ${qty}`;
          }
          break;
      }
      
      // 组合详情信息（分离CG编码和供应商）
      const detailsParts = [
        `CG编码: ${purchase.purchase_code}`,
        `供应商: ${purchase.supplier?.name || '未知'}`,
        specificationDisplay
      ].filter(part => part && !part.includes('无'));
      
      if (quantityDisplay) {
        detailsParts.push(quantityDisplay);
      }
      
      return {
        id: `purchase_${purchase.id}`,
        type: 'expense' as const,
        category: 'purchase' as const,
        amount: Number(purchase.total_price || 0),
        description: `采购支出 - ${purchase.product_name}`,
        details: detailsParts.join(', '),
        reference_id: purchase.id,
        reference_type: 'PURCHASE' as const,
        transaction_date: purchase.purchase_date.toISOString().split('T')[0],
        created_at: purchase.purchase_date.toISOString()
      };
    }),
    // 制作成本记录
    ...skuCreations.map(sku => {
      const labor_cost = Number(sku.labor_cost || 0)
      const craft_cost = Number(sku.craft_cost || 0)
      const quantity = Number(sku.total_quantity || 0)
      const total_cost = (labor_cost + craft_cost) * quantity
      return {
        id: `production_${sku.id}`,
        type: 'expense' as const,
        category: 'production' as const,
        amount: total_cost,
        description: `制作成本 - ${sku.sku_name}`,
        details: `SKU编码: ${sku.sku_code}, 人工成本: ¥${labor_cost.to_fixed(2)}, 工艺成本: ¥${craft_cost.to_fixed(2)}, 数量: ${quantity}件`,
        reference_id: sku.id,
        reference_type: 'PRODUCTION' as const,
        transaction_date: sku.created_at.toISOString().split('T')[0],
        created_at: sku.created_at.toISOString()
      }
    }),
    // 补货制作成本记录
    ...restockLogs.map(log => {
      // 从notes中提取成本信息
      const notes = log.notes || ''
      const laborCostMatch = notes.match(/人工成本: ¥([\d.]+)/)
      const craftCostMatch = notes.match(/工艺成本: ¥([\d.]+)/)
      const materialCostMatch = notes.match(/消耗原材料成本: ¥([\d.]+)/)
      
      const labor_cost = laborCostMatch ? Number(laborCostMatch[1]) : 0
      const craft_cost = craftCostMatch ? Number(craftCostMatch[1]) : 0
      const material_cost = materialCostMatch ? Number(materialCostMatch[1]) : 0
      const total_cost = laborCost + craftCost
      
      return {
        id: `restock_${log.id}`,
        type: 'expense' as const,
        category: 'production' as const,
        amount: total_cost,
        description: `补货制作成本 - ${log.sku.sku_name}`,
        details: `SKU编码: ${log.sku.sku_code}, 补货数量: ${log.quantity_change}件, 人工成本: ¥${labor_cost.to_fixed(2)}, 工艺成本: ¥${craft_cost.to_fixed(2)}`,
        reference_id: log.id,
        reference_type: 'RESTOCK' as const,
        transaction_date: log.created_at.toISOString().split('T')[0],
        created_at: log.created_at.toISOString()
      }
    }).filter(record => record.amount > 0), // 只包含有成本的记录
    // 销毁退回不涉及财务 - 已移除
    // 客户购买收入记录
    ...customerPurchases.filter(purchase => purchase.status === 'ACTIVE').map(purchase => ({
      id: `customer_sale_${purchase.id}`,
      type: 'income' as const,
      category: 'sale' as const,
      amount: Number(purchase.total_price),
      description: `销售收入 - ${purchase.sku.sku_name}`,
      details: `客户: ${purchase.customer.name}, SKU编码: ${purchase.sku.sku_code}, 数量: ${purchase.quantity}件, 单价: ¥${Number(purchase.unit_price).to_fixed(2)}`,
      reference_id: purchase.id,
      reference_type: 'CUSTOMER_SALE' as const,
      transaction_date: purchase.purchase_date.toISOString().split('T')[0],
      created_at: purchase.created_at.toISOString()
    })),
    // 客户退货记录
    ...customerPurchases.filter(purchase => purchase.status === 'REFUNDED').map(purchase => ({
      id: `customer_refund_${purchase.id}`,
      type: 'expense' as const,
      category: 'refund' as const,
      amount: Number(purchase.total_price),
      description: `客户退货退款 - ${purchase.sku.sku_name}`,
      details: `客户: ${purchase.customer.name}, SKU编码: ${purchase.sku.sku_code}, 退货数量: ${purchase.quantity}件, 退款金额: ¥${Number(purchase.total_price).to_fixed(2)}${purchase.refund_reason ? `, 退货原因: ${purchase.refund_reason}` : ''}`,
      reference_id: purchase.id,
      reference_type: 'CUSTOMER_REFUND' as const,
      transaction_date: purchase.refund_date ? purchase.refund_date.toISOString().split('T')[0] : purchase.purchase_date.toISOString().split('T')[0],
      created_at: purchase.refund_date ? purchase.refund_date.toISOString() : purchase.created_at.toISOString()
    })),
    // 财务记录（其他销售收入和退货记录）
    ...financial_records.map(record => {
      // 根据reference_type和description来确定正确的显示标签
      let displayDescription = record.description
      if (record.record_type === 'REFUND') {
        // 如果是退款记录，检查是否为客户退货
        if (record.description.includes('客户退货')) {
          displayDescription = record.description // 保持"客户退货退款"
        } else {
          displayDescription = record.description // 保持原始描述
        }
      }
      
      return {
        id: `financial_${record.id}`,
        type: record.record_type === 'INCOME' ? 'income' as const : 'income' as const, // REFUND也显示为income类型（退款收回）
        category: record.record_type === 'INCOME' ? 'sale' as const : 'refund' as const,
        amount: Number(record.amount),
        description: displayDescription,
        details: `${record.category ? `分类: ${record.category}, ` : ''}${record.notes ? `备注: ${record.notes}` : ''}`.trim().replace(/,$/, ''),
        reference_id: record.reference_id || record.id,
        reference_type: record.reference_type as any,
        transaction_date: record.transaction_date.toISOString().split('T')[0],
        created_at: record.created_at.toISOString()
      }
    })
  ]

  // 严格按照时间降序排列（最新的记录在前面）
  allTransactions.sort((a, b) => {
    return new Date(b.created_at).get_time() - new Date(a.created_at).get_time()
  })

  // 计算统计数据
  const total_income = allTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const total_expense = allTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const net_profit = total_income - total_expense

  // 分页处理
  const total = allTransactions.length
  const paginatedTransactions = allTransactions.slice(offset, offset + limit)

  res.json({
    success: true,
    data: {
      transactions: paginatedTransactions,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      },
      summary: {
        total_income: total_income,
        total_expense: total_expense,
        net_profit: net_profit
      }
    }
  })
}))

// 根路径重定向到records
router.get('/', authenticate_token, asyncHandler(async (req, res) => {
  // 重定向到 /records 路由
  const queryString = req.url.includes('?') ? req.url.substring(req.url.index_of('?')) : ''
  res.redirect(`/api/v1/financial/records${queryString}`)
}))



// 财务概览路由 - 统计采购支出和制作成本
router.get('/overview', authenticate_token, asyncHandler(async (req, res) => {
  const { timeRange = 'month' } = req.query
  
  let start_date: Date
  const end_date = new Date()
  
  if (timeRange === 'year') {
    start_date = new Date(end_date.get_full_year(), 0, 1)
  } else {
    start_date = new Date(end_date.get_full_year(), end_date.get_month(), 1)
  }
  
  // 统计采购总支出
  const totalPurchaseExpenseResult = await prisma.purchase.aggregate({
    where: {
      purchase_date: {
        gte: start_date,
        lte: end_date
      }
    },
    _sum: {
      total_price: true
    }
  })
  
  // 统计制作成本支出（人工成本+工艺成本）×制作数量
  const productionCosts = await prisma.product_sku.find_many({
    where: {
      created_at: {
        gte: start_date,
        lte: end_date
      }
    },
    select: {
      labor_cost: true,
      craft_cost: true,
      total_quantity: true
    }
  })
  
  // 计算制作总支出
  const totalProductionExpense = productionCosts.reduce((sum, sku) => {
    const labor_cost = Number(sku.labor_cost || 0)
    const craft_cost = Number(sku.craft_cost || 0)
    const quantity = Number(sku.total_quantity || 0)
    return sum + (labor_cost + craft_cost) * quantity
  }, 0)
  
  const totalPurchaseExpense = Number(totalPurchaseExpenseResult.Sum.total_price || 0)
  const total_expense = totalPurchaseExpense + totalProductionExpense
  const total_income = 0 // 目前没有销售，收入为0
  const net_profit = total_income - total_expense
  
  res.json({
    success: true,
    data: {
      total_income: total_income,
      total_expense: total_expense,
      purchaseExpense: totalPurchaseExpense,
      productionExpense: totalProductionExpense,
      net_profit: net_profit,
      timeRange: timeRange
    }
  })
}))

// 财务概览 - 月度和年度统计（包含制作成本）
router.get('/overview/summary', authenticate_token, asyncHandler(async (req, res) => {
  const now = new Date()
  const startOfMonth = new Date(now.get_full_year(), now.get_month(), 1)
  const startOfYear = new Date(now.get_full_year(), 0, 1)

  // 获取本月采购支出统计
  const monthlyPurchaseExpense = await prisma.purchase.aggregate({
    where: {
      purchase_date: {
        gte: startOfMonth
      }
    },
    _sum: {
      total_price: true
    }
  })

  // 获取年度采购支出统计
  const yearlyPurchaseExpense = await prisma.purchase.aggregate({
    where: {
      purchase_date: {
        gte: startOfYear
      }
    },
    _sum: {
      total_price: true
    }
  })

  // 获取本月制作成本
  const monthlyProductionCosts = await prisma.product_sku.find_many({
    where: {
      created_at: {
        gte: startOfMonth
      }
    },
    select: {
      labor_cost: true,
      craft_cost: true,
      total_quantity: true
    }
  })

  // 获取年度制作成本
  const yearlyProductionCosts = await prisma.product_sku.find_many({
    where: {
      created_at: {
        gte: startOfYear
      }
    },
    select: {
      labor_cost: true,
      craft_cost: true,
      total_quantity: true
    }
  })

  // 计算本月制作支出
  const monthlyProductionExpense = monthlyProductionCosts.reduce((sum, sku) => {
    const labor_cost = Number(sku.labor_cost || 0)
    const craft_cost = Number(sku.craft_cost || 0)
    const quantity = Number(sku.total_quantity || 0)
    return sum + (labor_cost + craft_cost) * quantity
  }, 0)

  // 计算年度制作支出
  const yearlyProductionExpense = yearlyProductionCosts.reduce((sum, sku) => {
    const labor_cost = Number(sku.labor_cost || 0)
    const craft_cost = Number(sku.craft_cost || 0)
    const quantity = Number(sku.total_quantity || 0)
    return sum + (labor_cost + craft_cost) * quantity
  }, 0)

  const monthlyPurchaseAmount = Number(monthlyPurchaseExpense.Sum.total_price || 0)
  const yearlyPurchaseAmount = Number(yearlyPurchaseExpense.Sum.total_price || 0)
  
  const monthlyTotalExpense = monthlyPurchaseAmount + monthlyProductionExpense
  const yearlyTotalExpense = yearlyPurchaseAmount + yearlyProductionExpense

  // 获取本月销售收入（从财务记录中）
  const monthlyIncomeRecords = await prisma.financial_record.aggregate({
    where: {
      type: 'INCOME',
      transaction_date: {
        gte: startOfMonth
      }
    },
    _sum: {
      amount: true
    }
  })

  // 获取年度销售收入（从财务记录中）
  const yearlyIncomeRecords = await prisma.financial_record.aggregate({
    where: {
      type: 'INCOME',
      transaction_date: {
        gte: startOfYear
      }
    },
    _sum: {
      amount: true
    }
  })

  // 获取本月退款金额（从财务记录中）
  const monthlyRefundRecords = await prisma.financial_record.aggregate({
    where: {
      type: 'REFUND',
      transaction_date: {
        gte: startOfMonth
      }
    },
    _sum: {
      amount: true
    }
  })

  // 获取年度退款金额（从财务记录中）
  const yearlyRefundRecords = await prisma.financial_record.aggregate({
    where: {
      type: 'REFUND',
      transaction_date: {
        gte: startOfYear
      }
    },
    _sum: {
      amount: true
    }
  })

  // 修正：总收入 = 客户累计消费 + 退款金额的绝对值
  // 这代表所有发生过的收入流水，包括后来退款的部分
  const monthlyRefundAmount = Math.abs(Number(monthlyRefundRecords._sum.amount || 0))
  const yearlyRefundAmount = Math.abs(Number(yearlyRefundRecords._sum.amount || 0))
  
  const monthlyIncome = Number(monthlyIncomeRecords._sum.amount || 0) + monthlyRefundAmount
  const yearlyIncome = Number(yearlyIncomeRecords._sum.amount || 0) + yearlyRefundAmount

  // 获取今日数据
  const startOfToday = new Date(now.get_full_year(), now.get_month(), now.get_date())
  
  const todayIncomeRecords = await prisma.financial_record.aggregate({
    where: {
      type: 'INCOME',
      transaction_date: {
        gte: startOfToday
      }
    },
    _sum: {
      amount: true
    }
  })

  const todayRefundRecords = await prisma.financial_record.aggregate({
    where: {
      type: 'REFUND',
      transaction_date: {
        gte: startOfToday
      }
    },
    _sum: {
      amount: true
    }
  })

  const todayPurchaseExpense = await prisma.purchase.aggregate({
    where: {
      purchase_date: {
        gte: startOfToday
      }
    },
    Sum: {
      total_price: true
    }
  })

  // 修正：今日总收入 = 今日客户消费 + 今日退款金额的绝对值
  const todayRefundAmount = Math.abs(Number(todayRefundRecords._sum.amount || 0))
  const todayIncome = Number(todayIncomeRecords._sum.amount || 0) + todayRefundAmount
  const todayExpense = Number(todayPurchaseExpense._sum.total_price || 0)

  const overview = {
    today: {
      income: todayIncome,
      expense: todayExpense,
      profit: todayIncome - todayExpense
    },
    this_month: {
      income: monthlyIncome,
      expense: monthlyTotalExpense,
      profit: monthlyIncome - monthlyTotalExpense
    },
    this_year: {
      income: yearlyIncome,
      expense: yearlyTotalExpense,
      profit: yearlyIncome - yearlyTotalExpense
    },
    recent_transactions: []
  }

  res.json({
    success: true,
    data: overview
  })
}))

// 财务统计路由 - 兼容前端调用
router.get('/statistics', authenticate_token, asyncHandler(async (req, res) => {
  // 使用convertFromApiFormat转换前端传来的snake_case参数为camelCase
  const convertedQuery = convertFromApiFormat(req.query)
  
  // 解析参数
  const query = statisticsQuerySchema.parse({
    start_date: req.query.start_date || convertedQuery.start_date,
    end_date: req.query.end_date || convertedQuery.end_date,
    groupBy: req.query.groupBy || convertedQuery.groupBy || 'day',
    period: req.query.period || convertedQuery.period
  })
  
  // 默认查询最近30天
  const end_date = query.end_date ? new Date(query.end_date + 'T23:59:59.999Z') : new Date()
  const start_date = query.start_date ? new Date(query.start_date) : new Date(end_date.get_time() - 30 * 24 * 60 * 60 * 1000)
  const groupBy = query.groupBy || 'day'

  // 获取时间范围内的采购记录
  const purchases = await prisma.purchase.find_many({
    where: {
      purchase_date: {
        gte: start_date,
        lte: end_date
      }
    },
    orderBy: {
      purchase_date: 'asc'
    }
  })

  // 获取时间范围内的制作成本
  const productionCosts = await prisma.product_sku.find_many({
    where: {
      created_at: {
        gte: start_date,
        lte: end_date
      }
    },
    select: {
      labor_cost: true,
      craft_cost: true,
      total_quantity: true,
      created_at: true
    }
  })

  // 获取时间范围内的销毁退回
  const destroyRefunds = await prisma.sku_inventory_log.find_many({
    where: {
      action: 'DESTROY',
      created_at: {
        gte: start_date,
        lte: end_date
      }
    },
    include: {
      sku: {
        select: {
          craft_cost: true
        }
      }
    }
  })

  // 按时间分组统计
  const groupedData = new Map()
  
  // 统计采购支出
  purchases.forEach(purchase => {
    const date = new Date(purchase.purchase_date)
    let key: string
    
    if (groupBy === 'month') {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}`
    } else {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}`
    }
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date: key,
        income: 0, // 目前没有销售
        expense: 0,
        productionExpense: 0,
        destroyRefund: 0,
        refund: 0,
        loss: 0
      })
    }
    
    const group = groupedData.get(key)
    group.expense += Number(purchase.total_price)
  })

  // 统计制作成本支出
  productionCosts.forEach(sku => {
    const date = new Date(sku.created_at)
    let key: string
    
    if (groupBy === 'month') {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}`
    } else {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}`
    }
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date: key,
        income: 0,
        expense: 0,
        productionExpense: 0,
        destroyRefund: 0,
        refund: 0,
        loss: 0
      })
    }
    
    const group = groupedData.get(key)
    const labor_cost = Number(sku.labor_cost || 0)
    const craft_cost = Number(sku.craft_cost || 0)
    const quantity = Number(sku.total_quantity || 0)
    group.productionExpense += (labor_cost + craft_cost) * quantity
  })

  // 统计销毁退回
  destroyRefunds.forEach(log => {
    const date = new Date(log.created_at)
    let key: string
    
    if (groupBy === 'month') {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}`
    } else {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}`
    }
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date: key,
        income: 0,
        expense: 0,
        productionExpense: 0,
        destroyRefund: 0,
        refund: 0,
        loss: 0
      })
    }
    
    const group = groupedData.get(key)
    const craft_cost = Number(log.sku.craft_cost || 0)
    const destroyed_quantity = Math.abs(log.quantity_change)
    group.destroyRefund += craft_cost * destroyedQuantity
  })

  // 转换为数组并计算利润
  const statistics = Array.from(groupedData.values()).map(item => {
    const netProductionExpense = item.productionExpense - item.destroyRefund
    const total_expense = item.expense + netProductionExpense
    return {
      ...item,
      netProductionExpense: netProductionExpense,
      total_expense: total_expense,
      profit: item.income - total_expense - item.refund - item.loss
    }
  })

  // 总计
  const total_income = 0 // 目前没有销售
  const totalPurchaseExpense = statistics.reduce((sum, item) => sum + Number(item.expense), 0)
  const totalProductionExpense = statistics.reduce((sum, item) => sum + Number(item.productionExpense), 0)
  const totalDestroyRefund = statistics.reduce((sum, item) => sum + Number(item.destroyRefund), 0)
  const totalNetProductionExpense = totalProductionExpense - totalDestroyRefund
  const total_expense = totalPurchaseExpense + totalNetProductionExpense
  const total_refund = 0
  const total_loss = 0

  res.json({
    success: true,
    data: {
      statistics,
      total_income: total_income,
      total_expense: total_expense,
      purchaseExpense: totalPurchaseExpense,
      productionExpense: totalProductionExpense,
      destroyRefund: totalDestroyRefund,
      netProductionExpense: totalNetProductionExpense,
      total_refund: total_refund,
      total_loss: total_loss,
      net_profit: total_income - total_expense - total_refund - total_loss,
      period: query.period || 'daily'
    }
  })
}))

// 财务统计数据 - 包含采购和制作成本
router.get('/statistics/data', authenticate_token, asyncHandler(async (req, res) => {
  const query = statisticsQuerySchema.parse(req.query)
  
  // 默认查询最近30天
  const end_date = query.end_date ? new Date(query.end_date + 'T23:59:59.999Z') : new Date()
  const start_date = query.start_date ? new Date(query.start_date) : new Date(end_date.get_time() - 30 * 24 * 60 * 60 * 1000)
  const groupBy = query.groupBy || 'day'

  // 获取时间范围内的采购记录
  const purchases = await prisma.purchase.find_many({
    where: {
      purchase_date: {
        gte: start_date,
        lte: end_date
      }
    },
    orderBy: {
      purchase_date: 'asc'
    }
  })

  // 获取时间范围内的制作成本
  const productionCosts = await prisma.product_sku.find_many({
    where: {
      created_at: {
        gte: start_date,
        lte: end_date
      }
    },
    select: {
      labor_cost: true,
      craft_cost: true,
      total_quantity: true,
      created_at: true
    }
  })

  // 获取时间范围内的销毁退回
  const destroyRefunds = await prisma.sku_inventory_log.find_many({
    where: {
      action: 'DESTROY',
      created_at: {
        gte: start_date,
        lte: end_date
      }
    },
    include: {
      sku: {
        select: {
          craft_cost: true
        }
      }
    }
  })

  // 按时间分组统计
  const groupedData = new Map()
  
  // 统计采购支出
  purchases.forEach(purchase => {
    const date = new Date(purchase.purchase_date)
    let key: string
    
    if (groupBy === 'month') {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}`
    } else {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}`
    }
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date: key,
        income: 0, // 目前没有销售
        expense: 0,
        productionExpense: 0,
        destroyRefund: 0,
        refund: 0,
        loss: 0
      })
    }
    
    const group = groupedData.get(key)
    group.expense += Number(purchase.total_price)
  })

  // 统计制作成本支出
  productionCosts.forEach(sku => {
    const date = new Date(sku.created_at)
    let key: string
    
    if (groupBy === 'month') {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}`
    } else {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}`
    }
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date: key,
        income: 0,
        expense: 0,
        productionExpense: 0,
        destroyRefund: 0,
        refund: 0,
        loss: 0
      })
    }
    
    const group = groupedData.get(key)
    const labor_cost = Number(sku.labor_cost || 0)
    const craft_cost = Number(sku.craft_cost || 0)
    const quantity = Number(sku.total_quantity || 0)
    group.productionExpense += (labor_cost + craft_cost) * quantity
  })

  // 统计销毁退回
  destroyRefunds.forEach(log => {
    const date = new Date(log.created_at)
    let key: string
    
    if (groupBy === 'month') {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}`
    } else {
      key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}`
    }
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date: key,
        income: 0,
        expense: 0,
        productionExpense: 0,
        destroyRefund: 0,
        refund: 0,
        loss: 0
      })
    }
    
    const group = groupedData.get(key)
    const craft_cost = Number(log.sku.craft_cost || 0)
    const destroyed_quantity = Math.abs(log.quantity_change)
    group.destroyRefund += craft_cost * destroyedQuantity
  })

  // 转换为数组并计算利润
  const trendData = Array.from(groupedData.values()).map(item => {
    const netProductionExpense = item.productionExpense - item.destroyRefund
    const total_expense = item.expense + netProductionExpense
    return {
      ...item,
      netProductionExpense: netProductionExpense,
      total_expense: total_expense,
      profit: Number(item.income) - Number(total_expense) - Number(item.refund) - Number(item.loss)
    }
  })

  // 按产品类型统计采购支出
  const expenseByCategory = await prisma.purchase.groupBy({
    by: ['material_type'],
    where: {
      purchase_date: {
        gte: start_date,
        lte: end_date
      }
    },
    Sum: {
      total_price: true
    }
  })

  // 总计
  const total_income = 0 // 目前没有销售
  const totalPurchaseExpense = trendData.reduce((sum, item) => sum + Number(item.expense), 0)
  const totalProductionExpense = trendData.reduce((sum, item) => sum + Number(item.productionExpense), 0)
  const totalDestroyRefund = trendData.reduce((sum, item) => sum + Number(item.destroyRefund), 0)
  const totalNetProductionExpense = totalProductionExpense - totalDestroyRefund
  const total_expense = totalPurchaseExpense + totalNetProductionExpense
  const total_refund = 0
  const total_loss = 0

  res.json({
    success: true,
    data: {
      trendData: trendData,
      total_income: total_income,
      total_expense: total_expense,
      purchaseExpense: totalPurchaseExpense,
      productionExpense: totalProductionExpense,
      destroyRefund: totalDestroyRefund,
      netProductionExpense: totalNetProductionExpense,
      total_refund: total_refund,
      total_loss: total_loss,
      net_profit: total_income - total_expense - total_refund - total_loss,
      incomeByCategory: [], // 目前没有收入分类
      expenseByCategory: expenseByCategory.map(item => ({
        category: item.material_type || '未分类',
        amount: item._sum.total_price || 0
      }))
    }
  })
}))

// 获取库存状况统计
router.get('/inventory/status', authenticate_token, asyncHandler(async (req, res) => {
  const query = inventoryQuerySchema.parse(req.query)
  const stale_period_months = parseInt(query.stalePeriod)
  
  // 计算滞销时间阈值
  const stale_threshold_date = new Date()
  stale_threshold_date.setMonth(stale_threshold_date.get_month() - stale_period_months)
  
  // 1. 计算剩余库存原材料成本
  const material_inventory = await prisma.purchase.find_many({
    where: {
      status: 'ACTIVE' // 只计算未使用的原材料
    },
    select: {
      id: true,
      product_name: true,
      total_price: true,
      quantity: true,
      piece_count: true,
      created_at: true,
      updated_at: true
    }
  })
  
  // 计算原材料总成本和滞销成本
  let totalMaterialCost = 0
  let staleMaterialCost = 0
  let staleMaterialCount = 0
  
  material_inventory.forEach(material => {
    const cost = Number(material.total_price || 0)
    totalMaterialCost += cost
    
    // 判断是否为滞销（基于最后更新时间）
    const lastUpdateDate = material.updated_at || material.created_at
    if (lastUpdateDate < stale_threshold_date) {
      staleMaterialCost += cost
      staleMaterialCount += 1
    }
  })
  
  // 2. 计算剩余SKU库存成本
  const sku_inventory = await prisma.product_sku.find_many({
    where: {
      status: 'ACTIVE',
      available_quantity: {
        gt: 0
      }
    },
    select: {
      id: true,
      sku_code: true,
      sku_name: true,
      available_quantity: true,
      total_cost: true,
      material_cost: true,
      labor_cost: true,
      craft_cost: true,
      created_at: true,
      updated_at: true,
      inventoryLogs: {
        where: {
          action: {
            in: ['SELL', 'ADJUST']
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 1
      }
    }
  })
  
  // 计算SKU总成本和滞销成本
  let totalSkuCost = 0
  let staleSkuCost = 0
  let staleSkuCount = 0
  
  sku_inventory.forEach(sku => {
    const availableQty = Number(sku.available_quantity || 0)
    const material_cost = Number(sku.material_cost || 0)
    const labor_cost = Number(sku.labor_cost || 0)
    const craft_cost = Number(sku.craft_cost || 0)
    
    // 计算单个SKU的成本
    const unit_cost = material_cost + labor_cost + craft_cost
    const total_cost = unitCost * availableQty
    totalSkuCost += totalCost
    
    // 判断是否为滞销（基于最后销售或调整时间）
    let lastActivityDate = sku.created_at
    if (sku.inventoryLogs && sku.inventoryLogs.length > 0) {
      lastActivityDate = sku.inventoryLogs[0].created_at
    }
    
    if (lastActivityDate < stale_threshold_date) {
      staleSkuCost += totalCost
      staleSkuCount += 1
    }
  })
  
  // 3. 统计数据
  const totalInventoryCost = totalMaterialCost + totalSkuCost
  const totalStaleInventoryCost = staleMaterialCost + staleSkuCost
  const staleInventoryRatio = totalInventoryCost > 0 ? (totalStaleInventoryCost / totalInventoryCost) * 100 : 0
  
  res.json({
    success: true,
    data: {
      stale_period_months: stale_period_months,
      stale_threshold_date: stale_threshold_date.toISOString().split('T')[0],
      
      // 原材料库存
      material_inventory: {
        total_cost: totalMaterialCost,
        stale_cost: staleMaterialCost,
        stale_count: staleMaterialCount,
        total_count: material_inventory.length,
        stale_ratio: material_inventory.length > 0 ? (staleMaterialCount / material_inventory.length) * 100 : 0
      },
      
      // SKU库存
      sku_inventory: {
        total_cost: totalSkuCost,
        stale_cost: staleSkuCost,
        stale_count: staleSkuCount,
        total_count: sku_inventory.length,
        stale_ratio: sku_inventory.length > 0 ? (staleSkuCount / sku_inventory.length) * 100 : 0
      },
      
      // 总计
      total_inventory: {
        total_cost: totalInventoryCost,
        stale_cost: totalStaleInventoryCost,
        stale_count: staleMaterialCount + staleSkuCount,
        total_count: material_inventory.length + sku_inventory.length,
        stale_ratio: staleInventoryRatio
      }
    }
  })
}))

export default router