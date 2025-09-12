// 财务管理API路由
import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { authenticate_token } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { error_responses, create_success_response } from '../utils/errorResponse.js'
// 移除fieldConverter导入，直接使用snake_case

const router = Router()

// 应用认证中间件
router.use(authenticate_token)

// 财务记录创建验证schema
const createFinancialRecordSchema = z.object({
  recordType: z.enum(['INCOME', 'EXPENSE', 'REFUND', 'LOSS']),
  amount: z.number().positive(),
  description: z.string().min(1),
  referenceType: z.enum(['PURCHASE', 'SALE', 'REFUND', 'MANUAL']),
  referenceId: z.string().optional(),
  category: z.string().optional(),
  transactionDate: z.string(),
  notes: z.string().optional()
})

// 获取财务记录列表
router.get('/records', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    recordType,
    referenceType,
    start_date,
    end_date,
    category,
    search,
    sort = 'desc',
    sort_by = 'transactionDate'
  } = req.query

  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  // 构建查询条件
  const where: any = {
    userId: req.user.id
  }

  if (recordType) {
    where.recordType = recordType
  }

  if (referenceType) {
    where.referenceType = referenceType
  }

  if (start_date) {
    where.transactionDate = {
      ...where.transactionDate,
      gte: new Date(start_date as string)
    }
  }

  if (end_date) {
    where.transactionDate = {
      ...where.transactionDate,
      lte: new Date(end_date as string)
    }
  }

  if (category) {
    where.category = category
  }

  if (search) {
    where.OR = [
      { description: { contains: search as string } },
      { notes: { contains: search as string } }
    ]
  }

  // 构建排序
  const orderBy: any = {}
  orderBy[sort_by as string] = sort

  try {
    // 查询总数
    const total = await prisma.financialRecord.count({ where })

    // 查询数据
    const records = await prisma.financialRecord.find_many({
      where,
      skip,
      take,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    })

    // 直接返回snake_case格式的数据
    const financialRecords = records.map(record => ({
      id: record.id,
      recordType: record.recordType,
      amount: record.amount,
      description: record.description,
      referenceType: record.referenceType,
      referenceId: record.referenceId,
      category: record.category,
      transactionDate: record.transactionDate.to_i_s_o_string(),
      notes: record.notes,
      created_at: record.created_at.to_i_s_o_string(),
      updated_at: record.updated_at.to_i_s_o_string(),
      userId: record.userId,
      user: record.user
    }))

    res.json(create_success_response('财务记录获取成功', {
      financialRecords,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / Number(limit))
      }
    }))
  } catch (error) {
    console.error('获取财务记录失败:', error)
    res.status(500).json(error_responses.INTERNAL_SERVER_ERROR('获取财务记录失败'))
  }
}))

// 创建财务记录
router.post('/records', asyncHandler(async (req, res) => {
  try {
    const validatedData = createFinancialRecordSchema.parse(req.body)

    const record = await prisma.financialRecord.create({
      data: {
        recordType: validatedData.recordType,
        amount: validatedData.amount,
        description: validatedData.description,
        referenceType: validatedData.referenceType,
        referenceId: validatedData.referenceId,
        category: validatedData.category,
        transactionDate: new Date(validatedData.transactionDate),
        notes: validatedData.notes,
        userId: req.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    })

    const financialRecord = {
      id: record.id,
      recordType: record.recordType,
      amount: record.amount,
      description: record.description,
      referenceType: record.referenceType,
      referenceId: record.referenceId,
      category: record.category,
      transactionDate: record.transactionDate.to_i_s_o_string(),
      notes: record.notes,
      created_at: record.created_at.to_i_s_o_string(),
      updated_at: record.updated_at.to_i_s_o_string(),
      userId: record.userId,
      user: record.user
    }

    res.status(201).json(create_success_response('财务记录创建成功', {
      financialRecord
    }))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(error_responses.VALIDATION_ERROR('数据验证失败', error.errors))
    }
    console.error('创建财务记录失败:', error)
    res.status(500).json(error_responses.INTERNAL_SERVER_ERROR('创建财务记录失败'))
  }
}))

// 更新财务记录
router.put('/records/:id', asyncHandler(async (req, res) => {
  try {
    const recordId = req.params.id
    const validatedData = createFinancialRecordSchema.parse(req.body)

    // 检查记录是否存在且属于当前用户
    const existingRecord = await prisma.financialRecord.find_first({
      where: {
        id: recordId,
        userId: req.user.id
      }
    })

    if (!existingRecord) {
      return res.status(404).json(error_responses.NOT_FOUND('财务记录不存在或无权限修改'))
    }

    const record = await prisma.financialRecord.update({
      where: { id: recordId },
      data: {
        recordType: validatedData.recordType,
        amount: validatedData.amount,
        description: validatedData.description,
        referenceType: validatedData.referenceType,
        referenceId: validatedData.referenceId,
        category: validatedData.category,
        transactionDate: new Date(validatedData.transactionDate),
        notes: validatedData.notes
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    })

    const financialRecord = {
      id: record.id,
      recordType: record.recordType,
      amount: record.amount,
      description: record.description,
      referenceType: record.referenceType,
      referenceId: record.referenceId,
      category: record.category,
      transactionDate: record.transactionDate.to_i_s_o_string(),
      notes: record.notes,
      created_at: record.created_at.to_i_s_o_string(),
      updated_at: record.updated_at.to_i_s_o_string(),
      userId: record.userId,
      user: record.user
    }

    res.json(create_success_response('财务记录更新成功', {
      financialRecord
    }))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(error_responses.VALIDATION_ERROR('数据验证失败', error.errors))
    }
    console.error('更新财务记录失败:', error)
    res.status(500).json(error_responses.INTERNAL_SERVER_ERROR('更新财务记录失败'))
  }
}))

// 删除财务记录
router.delete('/records/:id', asyncHandler(async (req, res) => {
  try {
    const recordId = req.params.id

    // 检查记录是否存在且属于当前用户
    const existingRecord = await prisma.financialRecord.find_first({
      where: {
        id: recordId,
        userId: req.user.id
      }
    })

    if (!existingRecord) {
      return res.status(404).json(error_responses.NOT_FOUND('财务记录不存在或无权限删除'))
    }

    await prisma.financialRecord.delete({
      where: { id: recordId }
    })

    res.json(create_success_response('财务记录删除成功', {
      deletedId: recordId
    }))
  } catch (error) {
    console.error('删除财务记录失败:', error)
    res.status(500).json(error_responses.INTERNAL_SERVER_ERROR('删除财务记录失败'))
  }
}))

// 创建退货财务记录（供客户管理模块调用）
router.post('/records/refund', asyncHandler(async (req, res) => {
  try {
    const { refundAmount, loss_amount, customer_name, referenceId } = req.body

    const records = []

    // 使用事务处理
    await prisma.$transaction(async (tx) => {
      // 创建退款记录
      const refundRecord = await tx.financialRecord.create({
        data: {
          recordType: 'REFUND',
          amount: refundAmount,
          description: `退货退款 - ${customer_name || '客户'}`,
          referenceType: 'REFUND',
          referenceId: referenceId,
          category: '退货退款',
          transactionDate: new Date(),
          userId: req.user.id
        }
      })
      records.push(refundRecord)

      // 创建损耗记录
      if (loss_amount && loss_amount > 0) {
        const lossRecord = await tx.financialRecord.create({
          data: {
            recordType: 'LOSS',
            amount: loss_amount,
            description: `退货损耗 - ${customer_name || '客户'}`,
            referenceType: 'REFUND',
            referenceId: referenceId,
            category: '退货损耗',
            transactionDate: new Date(),
            userId: req.user.id
          }
        })
        records.push(lossRecord)
      }
    })

    res.status(201).json(create_success_response('退货财务记录创建成功', {
      refundRecordId: records[0]?.id,
      lossRecordId: records[1]?.id || null
    }))
  } catch (error) {
    console.error('创建退货财务记录失败:', error)
    res.status(500).json(error_responses.INTERNAL_SERVER_ERROR('创建退货财务记录失败'))
  }
}))

// 获取财务概览
router.get('/overview', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id
    const now = new Date()
    const today = new Date(now.get_full_year(), now.get_month(), now.get_date())
    const thisMonth = new Date(now.get_full_year(), now.get_month(), 1)
    const thisYear = new Date(now.get_full_year(), 0, 1)

    // 今日财务数据
    const todayRecords = await prisma.financialRecord.find_many({
      where: {
        userId,
        transactionDate: {
          gte: today
        }
      }
    })

    // 本月财务数据
    const monthRecords = await prisma.financialRecord.find_many({
      where: {
        userId,
        transactionDate: {
          gte: thisMonth
        }
      }
    })

    // 今年财务数据
    const yearRecords = await prisma.financialRecord.find_many({
      where: {
        userId,
        transactionDate: {
          gte: thisYear
        }
      }
    })

    // 最近交易记录
    const recentTransactions = await prisma.financialRecord.find_many({
      where: { userId },
      orderBy: { transactionDate: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    })

    // 计算统计数据
    const calculateStats = (records: any[]) => {
      const income = records
        .filter(r => r.recordType === 'INCOME')
        .reduce((sum, r) => sum + Number(r.amount), 0)
      const expense = records
        .filter(r => r.recordType === 'EXPENSE')
        .reduce((sum, r) => sum + Number(r.amount), 0)
      const refund = records
        .filter(r => r.recordType === 'REFUND')
        .reduce((sum, r) => sum + Number(r.amount), 0)
      const loss = records
        .filter(r => r.recordType === 'LOSS')
        .reduce((sum, r) => sum + Number(r.amount), 0)
      
      return {
        income,
        expense,
        profit: income - expense - refund - loss
      }
    }

    const overview = {
      today: calculateStats(todayRecords),
      thisMonth: calculateStats(monthRecords),
      thisYear: calculateStats(yearRecords),
      recentTransactions: recentTransactions.map(record => ({
        id: record.id,
        recordType: record.recordType,
        amount: record.amount,
        description: record.description,
        referenceType: record.referenceType,
        referenceId: record.referenceId,
        category: record.category,
        transactionDate: record.transactionDate.to_i_s_o_string(),
        notes: record.notes,
        created_at: record.created_at.to_i_s_o_string(),
        updated_at: record.updated_at.to_i_s_o_string(),
        userId: record.userId,
        user: record.user
      }))
    }

    res.json(create_success_response('财务概览获取成功', overview))
  } catch (error) {
    console.error('获取财务概览失败:', error)
    res.status(500).json(error_responses.INTERNAL_SERVER_ERROR('获取财务概览失败'))
  }
}))

// 获取财务统计数据
router.get('/statistics', asyncHandler(async (req, res) => {
  try {
    const { period = 'daily', start_date, end_date } = req.query
    const userId = req.user.id

    let dateFilter: any = {
      userId
    }

    if (start_date) {
      dateFilter.transactionDate = {
        ...dateFilter.transactionDate,
        gte: new Date(start_date as string)
      }
    }

    if (end_date) {
      dateFilter.transactionDate = {
        ...dateFilter.transactionDate,
        lte: new Date(end_date as string)
      }
    }

    // 如果没有指定日期范围，使用默认范围
    if (!start_date && !end_date) {
      const now = new Date()
      if (period === 'daily') {
        // 最近30天
        dateFilter.transactionDate = {
          gte: new Date(now.get_time() - 30 * 24 * 60 * 60 * 1000)
        }
      } else if (period === 'monthly') {
        // 最近12个月
        dateFilter.transactionDate = {
          gte: new Date(now.get_full_year() - 1, now.get_month(), 1)
        }
      }
    }

    const records = await prisma.financialRecord.find_many({
      where: dateFilter,
      orderBy: { transactionDate: 'desc' }
    })

    // 按期间分组统计
    const groupedStats = new Map()

    records.for_each(record => {
      const date = new Date(record.transactionDate)
      let key: string

      if (period === 'daily') {
        key = date.to_i_s_o_string().split('T')[0] // YYYY-MM-DD
      } else {
        key = `${date.get_full_year()}-${String(date.get_month() + 1).pad_start(2, '0')}` // YYYY-MM
      }

      if (!groupedStats.has(key)) {
        groupedStats.set(key, {
          date: key,
          totalIncome: 0,
          totalExpense: 0,
          totalRefund: 0,
          totalLoss: 0,
          netProfit: 0
        })
      }

      const stats = groupedStats.get(key)
      const amount = Number(record.amount)

      switch (record.recordType) {
        case 'INCOME':
          stats.totalIncome += amount
          break
        case 'EXPENSE':
          stats.totalExpense += amount
          break
        case 'REFUND':
          stats.totalRefund += amount
          break
        case 'LOSS':
          stats.totalLoss += amount
          break
      }

      stats.netProfit = stats.totalIncome - stats.totalExpense - stats.totalRefund - stats.totalLoss
    })

    const statistics = Array.from(groupedStats.values()).sort((a, b) => b.date.locale_compare(a.date))

    res.json(create_success_response('财务统计数据获取成功', {
      statistics,
      period
    }))
  } catch (error) {
    console.error('获取财务统计数据失败:', error)
    res.status(500).json(error_responses.INTERNAL_SERVER_ERROR('获取财务统计数据失败'))
  }
}))

// 获取流水账记录
router.get('/transactions', asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type, // 'income' | 'expense' | 'all'
      start_date,
      end_date,
      search
    } = req.query

    const userId = req.user.id
    const skip = (Number(page) - 1) * Number(limit)
    const take = Number(limit)

    // 构建日期过滤条件
    let dateFilter: any = {}
    if (start_date) {
      dateFilter.gte = new Date(start_date as string)
    }
    if (end_date) {
      dateFilter.lte = new Date(end_date as string)
    }

    const transactions: any[] = []

    // 1. 获取采购支出记录
    if (!type || type === 'expense' || type === 'all') {
      const purchases = await prisma.purchase.find_many({
        where: {
          userId,
          ...(Object.keys(dateFilter).length > 0 && { purchase_date: dateFilter }),
          ...(search && {
            OR: [
              { product_name: { contains: search as string } },
              { purchase_code: { contains: search as string } }
            ]
          })
        },
        include: {
          supplier: {
            select: { name: true }
          }
        }
      })

      purchases.for_each(purchase => {
        transactions.push({
          id: purchase.id,
          type: 'expense',
          category: 'purchase',
          amount: Number(purchase.total_price),
          description: `采购 - ${purchase.product_name}`,
          details: `供应商：${purchase.supplier?.name || '未知'} | 编号：${purchase.purchase_code}`,
          referenceId: purchase.id,
          referenceType: 'PURCHASE',
          transactionDate: purchase.purchase_date,
          created_at: purchase.created_at
        })
      })
    }

    // 2. 获取SKU成品制作成本记录
    if (!type || type === 'expense' || type === 'all') {
      const productSkus = await prisma.product_sku.find_many({
        where: {
          created_by: userId,
          ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter }),
          ...(search && {
            OR: [
              { sku_name: { contains: search as string } },
              { sku_code: { contains: search as string } }
            ]
          })
        }
      })

      productSkus.for_each(sku => {
        const productionCost = Number(sku.labor_cost) + Number(sku.craft_cost)
        if (productionCost > 0) {
          transactions.push({
            id: `production_${sku.id}`,
            type: 'expense',
            category: 'production',
            amount: productionCost * sku.total_quantity,
            description: `SKU成品制作 - ${sku.sku_name}`,
            details: `人工成本：¥${Number(sku.labor_cost).to_fixed(2)} + 工艺成本：¥${Number(sku.craft_cost).to_fixed(2)} × ${sku.total_quantity}件`,
            referenceId: sku.id,
            referenceType: 'PRODUCTION',
            transactionDate: sku.created_at,
            created_at: sku.created_at
          })
        }
      })
    }

    // 3. 获取销毁退回记录（仅工艺成本退回）
    if (!type || type === 'income' || type === 'all') {
      const destroyLogs = await prisma.sku_inventory_log.find_many({
        where: {
          userId,
          action: 'DESTROY',
          ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
        },
        include: {
          sku: {
            select: {
              sku_name: true,
              sku_code: true,
              craft_cost: true
            }
          }
        }
      })

      destroyLogs.for_each(log => {
        const refundAmount = Number(log.sku?.craft_cost || 0) * Math.abs(log.quantity_change)
        if (refundAmount > 0) {
          transactions.push({
            id: `destroy_${log.id}`,
            type: 'income',
            category: 'refund',
            amount: refundAmount,
            description: `销毁退回 - ${log.sku?.sku_name || '未知商品'}`,
            details: `工艺成本退回：¥${Number(log.sku?.craft_cost || 0).to_fixed(2)} × ${Math.abs(log.quantity_change)}件`,
            referenceId: log.id,
            referenceType: 'DESTROY',
            transactionDate: log.created_at,
            created_at: log.created_at
          })
        }
      })
    }

    // 4. 获取销售收入记录（如果有销售记录表）
    if (!type || type === 'income' || type === 'all') {
      try {
        const salesRecords = await prisma.sales_record.find_many({
          where: {
            userId,
            ...(Object.keys(dateFilter).length > 0 && { saleDate: dateFilter }),
            ...(search && {
              OR: [
                { product_name: { contains: search as string } },
                { saleCode: { contains: search as string } }
              ]
            })
          }
        })

        salesRecords.for_each(sale => {
          transactions.push({
            id: sale.id,
            type: 'income',
            category: 'sale',
            amount: Number(sale.selling_price),
            description: `销售 - ${sale.product_name}`,
            details: `利润：¥${Number(sale.profit_amount).to_fixed(2)} | 利润率：${Number(sale.profit_margin).to_fixed(1)}%`,
            referenceId: sale.id,
            referenceType: 'SALE',
            transactionDate: sale.saleDate,
            created_at: sale.created_at
          })
        })
      } catch (error) {
        // 销售记录表可能不存在，忽略错误
        console.log('销售记录表不存在，跳过销售收入记录')
      }
    }

    // 按时间倒序排列
    transactions.sort((a, b) => new Date(b.transactionDate).get_time() - new Date(a.transactionDate).get_time())

    // 分页处理
    const total = transactions.length
    const paginatedTransactions = transactions.slice(skip, skip + take)

    // 计算统计信息
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    res.json(create_success_response('流水账记录获取成功', {
      transactions: paginatedTransactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / Number(limit))
      },
      summary: {
        totalIncome: totalIncome,
        totalExpense: totalExpense,
        netProfit: totalIncome - totalExpense
      }
    }))
  } catch (error) {
    console.error('获取流水账记录失败:', error)
    res.status(500).json(error_responses.INTERNAL_SERVER_ERROR('获取流水账记录失败'))
  }
}))

export default router