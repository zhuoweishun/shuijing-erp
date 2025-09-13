import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import * as crypto from 'crypto'

// 生成客户编码
function generateCustomerCode(created_at: Date, customer_id: string): string {
  const date_str = created_at.toISOString().slice(0, 10).replace(/-/g, '')
  // 使用客户ID的后3位作为序号
  const sequence = customer_id.slice(-3)
  return `CUS${date_str}${sequence.toUpperCase()}`
}

// 退货原因英文到中文的翻译映射
const REFUND_REASON_LABELS = {
  'quality_issue': '质量问题',
  'customer_dissatisfied': '客户不满意',
  'wrong_item': '发错商品',
  'damaged_shipping': '运输损坏',
  'customer_change_mind': '客户改变主意',
  'other': '其他原因'
} as const

// 将英文退货原因转换为中文显示
const translate_refund_reason = (reason: string): string => {
  return REFUND_REASON_LABELS[reason as keyof typeof REFUND_REASON_LABELS] || reason
}

const router = Router()

// 计算客户类型的函数（返回主要类型，前端会计算所有标签）
function calculateCustomerType(customer: any): string {
  const totalActiveOrders = customer.totalActiveOrders || customer.total_orders || 0
  const total_purchases = Number(customer.total_purchases) || 0
  const refund_rate = customer.refund_rate || 0
  const refund_count = customer.totalRefundedOrders || 0
  
  // 优先级判断：退货行为 > VIP > 复购 > 活跃度 > 新客户
  
  // 退货行为标签（高优先级）
  if (refund_rate >= 30) return 'ASSASSIN' // 退货率前20%（临时阈值30%）
  if (refund_count >= 5) return 'PICKY' // 退货次数前20%（临时阈值5次）
  
  // VIP客户（累计消费≥5000元）
  if (total_purchases >= 5000) return 'VIP'
  
  // 复购客户（订单数≥3）
  if (totalActiveOrders >= 3) return 'REPEAT'
  
  // 狂热客户（购买次数前20%，临时阈值10次）
  if (totalActiveOrders >= 10) return 'FANATIC'
  
  // 活跃度判断
  if (customer.last_purchase_date) {
    const days_since_last_purchase = Math.floor(
      (Date.now() - new Date(customer.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days_since_last_purchase >= 366) return 'LOST'
    if (days_since_last_purchase >= 181) return 'SILENT'
    if (days_since_last_purchase >= 91) return 'COOLING'
    if (days_since_last_purchase >= 31) return 'DECLINING'
  }
  
  // 新客户（首次购买）
  if (totalActiveOrders === 1) return 'NEW'
  
  return 'NEW'
}

// 获取客户分析数据 (前端调用的接口) - 必须在动态路由之前
router.get('/analytics', authenticateToken, asyncHandler(async (_req, res) => {
  try {
    const { time_period = 'all' } = req.query
    
    // 根据时间筛选计算日期范围
    let dateFilter = {}
    const now = new Date()
    
    switch (time_period) {
      case 'week':
        dateFilter = {
          created_at: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        }
        break
      case 'month':
        dateFilter = {
          created_at: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          }
        }
        break
      case 'half_year':
        dateFilter = {
          created_at: {
            gte: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
          }
        }
        break
      case 'year':
        dateFilter = {
          created_at: {
            gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          }
        }
        break
      case 'all':
      default:
        dateFilter = {}
        break
    }
    
    // 购买记录的时间筛选
    let purchaseDateFilter = {}
    if (time_period !== 'all') {
      purchaseDateFilter = dateFilter
    }
   // 总客户数（根据时间筛选）
    const [total_customers, currentPurchases, totalRevenue, new_customers, repeat_customers, vip_customers, active_customers, total_refunds, active_purchases] = await Promise.all([
      // 总客户数（根据时间筛选）
      prisma.customer.count({
        where: dateFilter
      }),
      // 总订单数（根据时间筛选，包括所有状态）
      prisma.customer_purchase.count({
        where: purchaseDateFilter
      }),
      // 总销售额（根据时间筛选）
      prisma.customer_purchase.aggregate({
        where: purchaseDateFilter,
        _sum: { total_price: true }
      }),
      // 30天内新客户
      prisma.customer.count({
        where: {
          ...dateFilter,
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      // 复购客户（订单数≥3）
      prisma.customer.count({
        where: {
          ...dateFilter,
          total_orders: {
            gte: 3
          }
        }
      }),
      // VIP客户（累计购买≥5000元）
      prisma.customer.count({
        where: {
          ...dateFilter,
          total_purchases: {
            gte: 5000
          }
        }
      }),
      // 活跃客户（90天内购买）
      prisma.customer.count({
        where: {
          ...dateFilter,
          last_purchase_date: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      // 总退货次数（根据时间筛选，通过购买记录状态统计）
      prisma.customer_purchase.count({
        where: {
          ...purchaseDateFilter,
          status: 'REFUNDED'
        }
      }),
      // 正常销售记录（用于毛利率计算，排除已退货记录）
      prisma.customer_purchase.findMany({
        where: {
          ...purchaseDateFilter,
          status: 'ACTIVE' // 只包含正常销售记录
        },
        include: {
          sku: {
            select: {
              total_cost: true
            }
          }
        }
      })
    ])
    
    // 计算正常销售记录的总成本和总售价
    let total_costAmount = 0
    let totalActiveSalesAmount = 0
    
    active_purchases.forEach((purchase) => {
      if (purchase.sku && purchase.sku.total_cost) {
        const costForThisPurchase = Number(purchase.sku.total_cost) * purchase.quantity
        total_costAmount += costForThisPurchase
      }
      totalActiveSalesAmount += Number(purchase.total_price)
    })
    
    const inactive_customers = total_customers - active_customers
    const average_order_value = currentPurchases > 0 ? Number(totalRevenue._sum?.total_price || 0) / currentPurchases : 0
    const repeat_purchase_rate = total_customers > 0 ? (repeat_customers / total_customers) * 100 : 0
    
    // 退货率计算逻辑：总订单数就是所有购买记录数（包括正常和已退货的）
    // 退货率 = 已退货记录数 / 总订单数 * 100%
    const refund_rate = currentPurchases > 0 ? (total_refunds / currentPurchases) * 100 : 0
    
    // 平均毛利率计算：(总实际售价 - 总实际成本) / 总实际售价 * 100%
    // 只计算正常销售记录，不包括已退货的记录
    const average_profit_margin = totalActiveSalesAmount > 0 ? ((totalActiveSalesAmount - total_costAmount) / totalActiveSalesAmount) * 100 : 0
    

    
    const totalSalesAmount = totalRevenue._sum?.total_price || 0
    
    res.json({
      success: true,
      message: '客户分析数据获取成功',
      data: {
        total_customers: total_customers,
        new_customers: new_customers,
        repeat_customers: repeat_customers,
        vip_customers: vip_customers,
        active_customers: active_customers,
        inactive_customers: inactive_customers,
        average_order_value: average_order_value,
        repeat_purchase_rate: repeat_purchase_rate,
        refund_rate: refund_rate,
        average_profit_margin: average_profit_margin,
        time_period: 'all'
      }
    })
  } catch (error) {
    // 即使出错也返回空数据，不返回404
    console.error('获取客户分析数据失败:', error)
    res.json({
        success: true,
        message: '客户分析数据获取成功',
        data: {
          total_customers: 0,
          new_customers: 0,
          repeat_customers: 0,
          vip_customers: 0,
          active_customers: 0,
          inactive_customers: 0,
        average_order_value: 0,
         repeat_purchase_rate: 0,
        refund_rate: 0,
         average_profit_margin: 0,
        time_period: 'all'
      }
    })
  }
  // 函数结束
  // 函数结束
}))

// 获取客户统计信息
router.get('/stats/overview', authenticateToken, asyncHandler(async (req, res) => {
  const [total_customers, total_purchases, total_revenue, recent_customers] = await Promise.all([
    prisma.customer.count(),
    prisma.customer_purchase.count(),
    prisma.customer_purchase.aggregate({
      _sum: { total_price: true }
    }),
    prisma.customer.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      include: {
        _count: {
          select: { purchases: true }
        }
      }
    })
  ])
  
  res.json({
    success: true,
    message: '客户统计信息获取成功',
    data: {
      total_customers: total_customers,
      total_purchases: total_purchases,
      total_revenue: total_revenue._sum.total_price || 0,
      recent_customers: recent_customers
    }
  })
  // 函数结束
  // 函数结束
}))

// 获取可用SKU列表（用于销售录入）- 必须在动态路由之前
router.get('/available-skus', authenticateToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query
  
  const skip = (Number(page) - 1) * Number(limit)
  
  // 构建查询条件：状态为ACTIVE且有库存的SKU
  const where = {
    status: 'ACTIVE' as const,
    available_quantity: {
      gt: 0
    },
    ...(search ? {
      OR: [
        { sku_code: { contains: String(search) } },
        { sku_name: { contains: String(search) } },
        { specification: { contains: String(search) } }
      ]
    } : {})
  }
  
  const [skus, total] = await Promise.all([
    prisma.product_sku.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { sku_name: 'asc' },
      select: {
        id: true,
        sku_code: true,
        sku_name: true,
        specification: true,
        unit_price: true,
        available_quantity: true,
        photos: true,
        status: true
      }
    }),
    prisma.product_sku.count({ where })
  ])
  
  // 转换字段格式以匹配前端期望的下划线格式
  const skusWithMapping = skus.map(sku => ({
    id: sku.id,
    sku_code: sku.sku_code,
      sku_name: sku.sku_name,
      specification: sku.specification,
      unit_price: sku.unit_price,
      selling_price: sku.unit_price, // 兼容字段
    available_quantity: sku.available_quantity,
    photos: sku.photos,
    status: sku.status
  }))
  
  res.json({
    success: true,
    message: '可用SKU列表获取成功',
    data: {
      skus: skusWithMapping,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / Number(limit))
      }
    }
  })
  // 函数结束
  // 函数结束
}))

// 全中国主要城市列表
const MAJOR_CITIES = [
  '北京市', '上海市', '天津市', '重庆市', '广州市', '深圳市', '杭州市', '南京市', 
  '苏州市', '成都市', '武汉市', '西安市', '郑州市', '济南市', '青岛市', '大连市',
  '沈阳市', '长春市', '哈尔滨市', '石家庄市', '太原市', '呼和浩特市', '兰州市',
  '西宁市', '银川市', '乌鲁木齐市', '拉萨市', '昆明市', '贵阳市', '南宁市',
  '海口市', '三亚市', '福州市', '厦门市', '南昌市', '长沙市', '合肥市', '无锡市',
  '常州市', '宁波市', '温州市', '嘉兴市', '金华市', '台州市', '绍兴市', '湖州市',
  '丽水市', '衢州市', '舟山市', '东莞市', '佛山市', '中山市', '珠海市', '江门市',
  '惠州市', '汕头市', '湛江市', '茂名市', '肇庆市', '梅州市', '汕尾市', '河源市',
  '阳江市', '清远市', '潮州市', '揭阳市', '云浮市'
].sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'base' }))

// 从地址中提取城市信息
const extractCityFromAddress = (address: string) => {
  if (!address) return '未知'
  
  // 匹配常见的城市格式：省市区
  const cityMatch = address.match(/([^省]+省)?([^市]+市)/)
  if (cityMatch && cityMatch[2]) {
    return cityMatch[2]
  }
  
  // 匹配直辖市格式
  const municipalityMatch = address.match(/(北京|上海|天津|重庆)市?/)
  if (municipalityMatch) {
    return municipalityMatch[1] + '市'
  }
  
  // 如果无法匹配，返回地址的前几个字符
  return address.substring(0, 6) + '...'
}

// 获取客户列表
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search = '', 
    sort_by = 'created_at', 
    sort = 'desc',
    // 新增筛选参数
    customer_code_search = '',
    name_search = '',
    phone_search = '',
    city_filter = '',
    customer_type = '',
    total_orders_min = '',
    total_orders_max = '',
    total_all_orders_min = '',
    total_all_orders_max = '',
    total_purchases_min = '',
    total_purchases_max = '',
    first_purchase_start = '',
    first_purchase_end = '',
    last_purchase_start = '',
    last_purchase_end = '',
    get_city_stats = false // 是否获取城市统计数据
  } = req.query
  
  const skip = (Number(page) - 1) * Number(limit)
  
  // 构建筛选条件
  const whereConditions: any[] = []
  
  // 通用搜索（保持向后兼容）
  if (search) {
    whereConditions.push({
      OR: [
        { name: { contains: String(search) } },
        { phone: { contains: String(search) } },
        { address: { contains: String(search) } }
      ]
    })
  }
  
  // 客户名称搜索
  if (name_search) {
    whereConditions.push({
      name: { contains: String(name_search) }
    })
  }
  
  // 手机号搜索
  if (phone_search) {
    whereConditions.push({
      phone: { contains: String(phone_search) }
    })
  }
  
  // 城市筛选（从地址中匹配）
  if (city_filter) {
    const cities = String(city_filter).split(',')
    whereConditions.push({
      OR: cities.map(city => ({
        address: { contains: city.trim() }
      }))
    })
  }
  
  // 累计消费范围筛选
  if (total_purchases_min || total_purchases_max) {
    const purchaseFilter: any = {}
    if (total_purchases_min) {
      purchaseFilter.gte = Number(total_purchases_min)
    }
    if (total_purchases_max) {
      purchaseFilter.lte = Number(total_purchases_max)
    }
    whereConditions.push({
      total_purchases: purchaseFilter
    })
  }
  
  // 有效订单数范围筛选
  if (total_orders_min || total_orders_max) {
    const ordersFilter: any = {}
    if (total_orders_min) {
      ordersFilter.gte = Number(total_orders_min)
    }
    if (total_orders_max) {
      ordersFilter.lte = Number(total_orders_max)
    }
    whereConditions.push({
      total_orders: ordersFilter
    })
  }
  
  // 首次购买日期范围筛选
  if (first_purchase_start || first_purchase_end) {
    const dateFilter: any = {}
    if (first_purchase_start) {
      dateFilter.gte = new Date(String(first_purchase_start))
    }
    if (first_purchase_end) {
      dateFilter.lte = new Date(String(first_purchase_end))
    }
    whereConditions.push({
      first_purchase_date: dateFilter
    })
  }

  // 最后购买日期范围筛选
  if (last_purchase_start || last_purchase_end) {
    const dateFilter: any = {}
    if (last_purchase_start) {
      dateFilter.gte = new Date(String(last_purchase_start))
    }
    if (last_purchase_end) {
      dateFilter.lte = new Date(String(last_purchase_end))
    }
    whereConditions.push({
      last_purchase_date: dateFilter
    })
  }
  
  const where = whereConditions.length > 0 ? { AND: whereConditions } : {}
  
  // 处理排序
  let order_by: any = { created_at: 'desc' } // 默认排序
  
  const sortField = String(sort_by)
  const sort_order = String(sort) as 'asc' | 'desc'
  
  // 支持的排序字段映射
  const sortFieldMapping: { [key: string]: any } = {
    'name': { name: sort_order },
    'phone': { phone: sort_order },
    'total_purchases': { total_purchases: sort_order },
    'total_orders': { total_orders: sort_order },
    'first_purchase_date': { first_purchase_date: sort_order },
    'last_purchase_date': { last_purchase_date: sort_order },
    'created_at': { created_at: sort_order },
    'customer_code': 'application_level', // 需要在应用层排序
    'city': 'application_level', // 需要在应用层排序
    'customer_type': 'application_level' // 需要在应用层排序
  }
  
  if (sortFieldMapping[sortField]) {
    // 如果是数据库级别的排序，直接设置order_by
    if (sortFieldMapping[sortField] !== 'application_level') {
      order_by = sortFieldMapping[sortField]
    }
    // 应用层排序字段将在后面处理
  }
  
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: order_by,
      include: {
        _count: {
          select: { purchases: true }
        },
        purchases: {
          select: {
            id: true,
            status: true
          }
        }
      }
    }),
    prisma.customer.count({ where })
  ])
  
  // 为前端添加字段映射，确保兼容性
  let customersWithMapping = customers.map((customer, _index) => {
    // 计算总订单量（包含所有状态的订单）
    const total_all_orders = customer.purchases ? customer.purchases.length : 0
    
    // 计算有效订单量（排除已退货的订单）
    const totalActiveOrders = customer.purchases ? 
      customer.purchases.filter((purchase: any) => purchase.status === 'ACTIVE').length : 0
    
    // 计算退货相关统计
    const totalRefundedOrders = customer._count?.purchases || 0
    const refund_rate = total_all_orders > 0 ? (totalRefundedOrders / total_all_orders) * 100 : 0
    
    // 动态生成客户编码（基于创建日期和索引）
    const customer_code = generateCustomerCode(customer.created_at, customer.id)
    
    // 动态计算客户类型（传入退货统计数据）
    const customer_type = calculateCustomerType({
      ...customer,
      totalActiveOrders,
      total_all_orders,
      totalRefundedOrders,
      refund_rate
    })
    
    return {
      ...customer,
      customer_code: customer_code, // 动态生成的客户编码
      total_purchases: Number(customer.total_purchases) || 0,
      total_orders: totalActiveOrders, // 有效订单（不包含退货）
      total_all_orders: total_all_orders, // 总订单量（包含退货）
      refund_count: totalRefundedOrders, // 退货次数
      refund_rate: refund_rate, // 退货率
      last_purchase_date: customer.last_purchase_date,
      first_purchase_date: customer.first_purchase_date,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      customer_type: customer_type, // 动态计算客户类型
      // 移除purchases字段，避免返回过多数据
      purchases: undefined
    }
  })
  
  // 应用客户编码搜索筛选（在数据处理后进行）
  if (customer_code_search) {
    const codeSearch = String(customer_code_search).toLowerCase()
    customersWithMapping = customersWithMapping.filter(customer => 
      customer.customer_code.toLowerCase().includes(codeSearch)
    )
  }
  
  // 应用客户类型筛选（在数据处理后进行）
  if (customer_type) {
    const types = String(customer_type).split(',')
    customersWithMapping = customersWithMapping.filter(customer => 
      types.includes(customer.customer_type)
    )
  }
  
  // 应用总订单量范围筛选（在数据处理后进行）
  if (total_all_orders_min || total_all_orders_max) {
    customersWithMapping = customersWithMapping.filter(customer => {
      const total_all_orders = customer.total_all_orders || 0
      let match = true
      
      if (total_all_orders_min) {
        match = match && total_all_orders >= Number(total_all_orders_min)
      }
      
      if (total_all_orders_max) {
        match = match && total_all_orders <= Number(total_all_orders_max)
      }
      
      return match
    })
  }
  
  // 如果按应用层字段排序，需要在应用层进行排序
  if (sortField === 'total_all_orders') {
    customersWithMapping.sort((a, b) => {
      const aValue = a.total_all_orders || 0
      const bValue = b.total_all_orders || 0
      return sort_order === 'asc' ? aValue - bValue : bValue - aValue
    })
  } else if (sortField === 'customer_code') {
    customersWithMapping.sort((a, b) => {
      const aValue = a.customer_code || ''
      const bValue = b.customer_code || ''
      return sort_order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    })
  } else if (sortField === 'city') {
    customersWithMapping.sort((a, b) => {
      const aValue = extractCityFromAddress(a.address || '') || ''
      const bValue = extractCityFromAddress(b.address || '') || ''
      return sort_order === 'asc' ? aValue.localeCompare(bValue, 'zh-CN') : bValue.localeCompare(aValue, 'zh-CN')
    })
  } else if (sortField === 'customer_type') {
    customersWithMapping.sort((a, b) => {
      const aValue = a.customer_type || ''
      const bValue = b.customer_type || ''
      return sort_order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    })
  }
  
  // 获取城市统计数据（如果请求）
  let city_stats = null
  if (get_city_stats === 'true') {
    // 获取所有客户的城市信息
    const allCustomers = await prisma.customer.findMany({
      select: {
        address: true
      }
    })
    
    // 统计每个城市的客户数量
    const cityCount: { [key: string]: number } = {}
    allCustomers.forEach(customer => {
      const city = extractCityFromAddress(customer.address || '')
      if (city && city !== '未知') {
        cityCount[city] = (cityCount[city] || 0) + 1
      }
    })
    
    // 合并主要城市列表和实际数据城市
    const citySet = new Set([...MAJOR_CITIES, ...Object.keys(cityCount)])
    const allCities = Array.from(citySet)
    
    // 生成城市统计数据
    city_stats = allCities.map(city => ({
      name: city,
      count: cityCount[city] || 0
    }))
    
    // 二级排序：先按数量降序，再按拼音升序
    city_stats.sort((a, b) => {
      // 第一优先级：按数量降序
      if (a.count !== b.count) {
        return b.count - a.count
      }
      // 第二优先级：按拼音升序
      return a.name.localeCompare(b.name, 'zh-CN', { sensitivity: 'base' })
    })
  }

  res.json({
    success: true,
    message: '客户列表获取成功',
    data: {
      customers: customersWithMapping,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / Number(limit))
      },
      ...(city_stats && { city_stats })
    }
  })
  return
}))

// 获取客户详情
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: { purchase_date: 'desc' },
        include: {
          sku: {
            select: {
              id: true,
              sku_code: true,
              sku_name: true,
              specification: true
            }
          }
        }
      }
    }
  })
  
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: '客户不存在'
    })
  }
  
  // 为前端添加字段映射，确保兼容性
  const customerWithMapping = {
    ...customer,
    customer_code: generateCustomerCode(customer.created_at, customer.id), // 动态生成的客户编码
    total_purchases: Number(customer.total_purchases) || 0,
    total_orders: customer.total_orders || 0,
    last_purchase_date: customer.last_purchase_date,
    first_purchase_date: customer.first_purchase_date,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
    customer_type: calculateCustomerType(customer) // 动态计算客户类型
  }
  
  res.json({
    success: true,
    message: '客户详情获取成功',
    data: { customer: customerWithMapping }
  })
  return
}))

// 创建客户
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { name, phone, address, wechat, birthday, notes } = req.body
  
  // 验证输入
  const createSchema = z.object({
    name: z.string().min(2, '客户姓名至少需要2个字符'),
    phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号格式'),
    address: z.string().optional(),
    wechat: z.string().optional(),
    birthday: z.string().optional(),
    notes: z.string().optional()
  })
  
  const validatedData = createSchema.parse({
    name: String(name),
    phone: String(phone),
    address: address ? String(address) : undefined,
    wechat: wechat ? String(wechat) : undefined,
    birthday: birthday ? String(birthday) : undefined,
    notes: notes ? String(notes) : undefined
  })
  
  // 检查手机号是否已存在
  const existingCustomer = await prisma.customer.findUnique({
    where: { phone: validatedData.phone }
  })
  
  if (existingCustomer) {
    return res.status(400).json({
      success: false,
      message: '该手机号已被其他客户使用'
    })
  }
  
  const customer = await prisma.customer.create({
    data: {
      id: crypto.randomUUID(),
      name: validatedData.name,
      phone: validatedData.phone,
      address: validatedData.address,
      wechat: validatedData.wechat,
      birthday: validatedData.birthday ? new Date(validatedData.birthday) : null,
      notes: validatedData.notes,
      total_purchases: 0,
      total_orders: 0,
      created_at: new Date(),
      updated_at: new Date()
    }
  })
  
  // 为前端添加字段映射，确保兼容性
  const customerWithMapping = {
    ...customer,
    customer_code: generateCustomerCode(customer.created_at, customer.id), // 动态生成的客户编码
    total_purchases: Number(customer.total_purchases) || 0,
    total_orders: customer.total_orders || 0,
    last_purchase_date: customer.last_purchase_date,
    first_purchase_date: customer.first_purchase_date,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
    customer_type: calculateCustomerType(customer) // 动态计算客户类型
  }

  res.status(201).json({
    success: true,
    message: '客户创建成功',
    data: { customer: customerWithMapping }
  })
  return
}))

// 更新客户信息
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, phone, address, wechat, birthday, notes } = req.body
  
  // 验证输入
  const updateSchema = z.object({
    name: z.string().min(2, '客户姓名至少需要2个字符'),
    phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号格式'),
    address: z.string().optional(),
    wechat: z.string().optional(),
    birthday: z.string().optional(),
    notes: z.string().optional()
  })
  
  const validatedData = updateSchema.parse({
    name: String(name),
    phone: String(phone),
    address: address ? String(address) : undefined,
    wechat: wechat ? String(wechat) : undefined,
    birthday: birthday ? String(birthday) : undefined,
    notes: notes ? String(notes) : undefined
  })
  
  // 检查客户是否存在
  const existingCustomer = await prisma.customer.findUnique({
    where: { id }
  })
  
  if (!existingCustomer) {
    return res.status(404).json({
      success: false,
      message: '客户不存在'
    })
  }
  
  // 如果手机号有变化，检查新手机号是否已被其他客户使用
  if (validatedData.phone !== existingCustomer.phone) {
    const phoneExists = await prisma.customer.findUnique({
      where: { phone: validatedData.phone }
    })
    
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: '该手机号已被其他客户使用'
      })
    }
  }
  
  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: validatedData.name,
      phone: validatedData.phone,
      address: validatedData.address,
      wechat: validatedData.wechat,
      birthday: validatedData.birthday ? new Date(validatedData.birthday) : null,
      notes: validatedData.notes,
      updated_at: new Date()
    }
  })
  
  // 为前端添加字段映射，确保兼容性
  const customerWithMapping = {
    ...customer,
    customer_code: generateCustomerCode(customer.created_at, customer.id), // 动态生成的客户编码
    total_purchases: Number(customer.total_purchases) || 0,
    total_orders: customer.total_orders || 0,
    last_purchase_date: customer.last_purchase_date,
    first_purchase_date: customer.first_purchase_date,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
    customer_type: calculateCustomerType(customer) // 动态计算客户类型
  }
  
  res.json({
    success: true,
    message: '客户信息更新成功',
    data: { customer: customerWithMapping }
  })
  return
}))

// 删除客户
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 检查客户是否存在
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          purchases: true
        }
      }
    }
  })
  
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: '客户不存在'
    })
  }
  
  // 如果客户有购买记录，不允许删除
  if (customer._count?.purchases > 0) {
    return res.status(400).json({
      success: false,
      message: '该客户有购买记录，无法删除'
    })
  }
  
  await prisma.customer.delete({
    where: { id }
  })
  
  res.json({
    success: true,
    message: '客户删除成功'
  })
  return
}))

// 获取客户购买历史
router.get('/:id/purchases', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { page = 1, limit = 20 } = req.query
  
  const skip = (Number(page) - 1) * Number(limit)
  
  // 检查客户是否存在
  const customer = await prisma.customer.findUnique({
    where: { id }
  })
  
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: '客户不存在'
    })
  }
  
  const [purchases, total] = await Promise.all([
    prisma.customer_purchase.findMany({
      where: { customer_id: id },
      skip,
      take: Number(limit),
      orderBy: { purchase_date: 'desc' },
      select: {
        id: true,
        customer_id: true,
        sku_id: true,
        sku_name: true,
        quantity: true,
        unit_price: true,
        total_price: true,
        original_price: true,
        status: true,
        refund_date: true,
        refund_reason: true,
        refund_notes: true,
        sale_channel: true,
        notes: true,
        purchase_date: true,
        created_at: true,
        sku: {
          select: {
            id: true,
            sku_code: true,
            sku_name: true,
            specification: true,
            photos: true
          }
        }
      }
    }),
    prisma.customer_purchase.count({
      where: { customer_id: id }
    })
  ])
  
  res.json({
    success: true,
    message: '客户购买历史获取成功',
    data: {
      customer,
      purchases,
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



// 添加客户购买记录
router.post('/:id/purchases', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { sku_id, quantity, unit_price, total_price, sale_channel, notes } = req.body
  
  // 验证输入
  const purchaseSchema = z.object({ sku_id: z.string().min(1, 'SKU ID不能为空'),
    quantity: z.number().int().positive('数量必须是正整数'),
    unit_price: z.number().positive('单价必须大于0'),
    total_price: z.number().positive('总价必须大于0'),
    sale_channel: z.string().optional(),
    notes: z.string().optional()
  })
  
  const validatedData = purchaseSchema.parse({ sku_id: String(sku_id),
    quantity: Number(quantity),
    unit_price: Number(unit_price),
    total_price: Number(total_price),
    sale_channel: sale_channel ? String(sale_channel) : undefined,
    notes: notes ? String(notes) : undefined
  })
  
  // 检查客户是否存在
  const customer = await prisma.customer.findUnique({
    where: { id }
  })
  
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: '客户不存在'
    })
  }
  
  // 检查SKU是否存在
  const sku = await prisma.product_sku.findUnique({
    where: { id: validatedData.sku_id }
  })
  
  if (!sku) {
    return res.status(404).json({
      success: false,
      message: 'SKU不存在'
    })
  }
  
  // 创建客户购买记录
  const purchase = await prisma.customer_purchase.create({
    data: {
      id: crypto.randomUUID(),
      customer_id: id,
      sku_id: validatedData.sku_id,
      sku_name: sku.sku_name,
      quantity: validatedData.quantity,
      unit_price: validatedData.unit_price,
      total_price: validatedData.total_price,
      original_price: sku.unit_price || sku.selling_price || validatedData.unit_price,
      sale_channel: validatedData.sale_channel,
      notes: validatedData.notes,
      purchase_date: new Date(),
      created_at: new Date()
    }
  })
  
  res.status(201).json({
    success: true,
    message: '客户购买记录创建成功',
    data: { purchase }
  })
  return
}))

// 获取客户备注
router.get('/:id/notes', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 检查客户是否存在
  const customer = await prisma.customer.findUnique({
    where: { id }
  })
  
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: '客户不存在'
    })
  }
  
  const notes = await prisma.customer_note.findMany({
    where: { customer_id: id },
    orderBy: { created_at: 'desc' },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          user_name: true
        }
      }
    }
  })
  
  res.json({
    success: true,
    message: '客户备注获取成功',
    data: { notes }
  })
  return
}))

// 添加客户备注
router.post('/:id/notes', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { category, content } = req.body
  
  // 验证输入
  const noteSchema = z.object({
    category: z.enum(['PREFERENCE', 'BEHAVIOR', 'CONTACT', 'OTHER'], {
      message: '备注分类必须是：PREFERENCE、BEHAVIOR、CONTACT、OTHER 之一'
    }),
    content: z.string().min(1, '备注内容不能为空').max(1000, '备注内容不能超过1000字符')
  })
  
  const validatedData = noteSchema.parse({
    category: String(category),
    content: String(content)
  })
  
  // 检查客户是否存在
  const customer = await prisma.customer.findUnique({
    where: { id }
  })
  
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: '客户不存在'
    })
  }
  
  const note = await prisma.customer_note.create({
    data: {
      customer_id: id,
      category: validatedData.category as any,
      content: validatedData.content,
      created_by: req.user!.id
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          user_name: true
        }
      }
    }
  })
  
  res.status(201).json({
    success: true,
    message: '客户备注添加成功',
    data: { note }
  })
  return
}))

// 客户购买记录退货
router.post('/:customer_id/purchases/:purchase_id/refund', authenticateToken, asyncHandler(async (req, res) => {
  const { customer_id, purchase_id } = req.params
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
    // 1. 检查客户是否存在
    const customer = await tx.customer.findUnique({
      where: { id: customer_id }
    })
    
    if (!customer) {
      throw new Error('客户不存在')
    }
    
    // 2. 检查购买记录是否存在
    const purchase = await tx.customer_purchase.findUnique({
      where: { 
        id: purchase_id,
        customer_id: customer_id
      },
      include: {
        sku: true
      }
    })
    
    if (!purchase) {
      throw new Error('购买记录不存在')
    }
    
    // 3. 检查退货数量是否合理
    if (validatedData.quantity > purchase.quantity) {
      throw new Error(`退货数量不能超过购买数量，购买数量：${purchase.quantity}，退货数量：${validatedData.quantity}`)
    }
    
    // 4. 计算退款金额（如果没有提供则使用购买时的单价）
    const refund_amount = validatedData.refund_amount || (Number(purchase.unit_price) * validatedData.quantity)
    
    // 5. 增加SKU库存（退货回库存）
    const sku = purchase.sku
    const quantity_before = sku.available_quantity
    const quantity_after = quantity_before + validatedData.quantity
    const totalQuantityAfter = sku.total_quantity + validatedData.quantity
    
    const updated_sku = await tx.product_sku.update({
      where: { id: purchase.sku_id },
      data: {
        available_quantity: quantity_after,
        total_quantity: totalQuantityAfter,
        total_value: quantity_after * Number(sku.unit_price)
      }
    })
    
    // 6. 创建SKU库存变更日志
    const translated_reason = translate_refund_reason(validatedData.reason)
    await tx.sku_inventory_log.create({
      data: { sku_id: purchase.sku_id,
        action: 'ADJUST',
        quantity_change: validatedData.quantity,
        quantity_before: quantity_before,
        quantity_after: quantity_after,
        reference_type: 'REFUND',
        reference_id: purchase_id,
        notes: `客户退货入库：${customer.name}，退货原因：${translated_reason}${validatedData.notes ? `，备注：${validatedData.notes}` : ''}`,
        user_id: req.user!.id
      }
    })
    
    // 7. 更新客户统计数据（减少购买金额和订单数）
    await tx.customer.update({
      where: { id: customer_id },
      data: {
        total_purchases: {
          decrement: refund_amount
        },
        total_orders: {
          decrement: validatedData.quantity === purchase.quantity ? 1 : 0 // 只有全部退货才减少订单数
        },
        updated_at: new Date()
      }
    })
    
    // 8. 创建财务退款记录（负数金额，抵扣收入）
    await tx.financial_record.create({
      data: {
        record_type: 'REFUND',
        amount: -refund_amount, // 负数表示抵扣收入
        description: `客户退货退款 - ${purchase.sku.sku_name}`,
        reference_type: 'REFUND',
        reference_id: purchase_id,
        category: '客户退货',
        transaction_date: new Date(),
        notes: `客户：${customer.name}，退货原因：${translated_reason}，退货数量：${validatedData.quantity}件${validatedData.notes ? `，备注：${validatedData.notes}` : ''}`,
        user_id: req.user!.id
      }
    })
    
    // 9. 更新购买记录状态为已退货（保留记录，不删除）
    if (validatedData.quantity === purchase.quantity) {
      // 全部退货，标记为已退货状态
      await tx.customer_purchase.update({
        where: { id: purchase_id },
        data: {
          status: 'REFUNDED',
          refund_date: new Date(),
          refund_reason: validatedData.reason,
          refund_notes: validatedData.notes,
          updated_at: new Date()
        }
      })
    } else {
      // 部分退货，更新购买记录数量但保持ACTIVE状态
      await tx.customer_purchase.update({
        where: { id: purchase_id },
        data: {
          quantity: purchase.quantity - validatedData.quantity,
          total_price: Number(purchase.total_price) - refund_amount,
          updated_at: new Date()
        }
      })
      
      // 为退货部分创建新的已退货记录
      await tx.customer_purchase.create({
        data: {
          customer_id: customer_id,
          sku_id: purchase.sku_id,
          sku_name: purchase.sku_name,
          quantity: validatedData.quantity,
          unit_price: purchase.unit_price,
          original_price: purchase.original_price,
          total_price: refund_amount,
          status: 'REFUNDED',
          refund_date: new Date(),
          refund_reason: validatedData.reason,
          refund_notes: validatedData.notes,
          sale_channel: purchase.sale_channel,
          notes: purchase.notes,
          purchase_date: purchase.purchase_date
        }
      })
    }
    
    return {
      customer,
      purchase,
      sku: updated_sku,
      refund_amount: refund_amount,
      isFullRefund: validatedData.quantity === purchase.quantity
    }
  })
  
  res.json({
    success: true,
    message: '客户购买记录退货处理成功',
    data: {
      customer_id: result.customer.id,
      customer_name: result.customer.name,
      purchase_id: purchase_id,
      sku_id: result.purchase.sku_id,
      sku_name: result.purchase.sku_name,
      refunded_quantity: validatedData.quantity,
      refund_amount: result.refund_amount,
      isFullRefund: result.isFullRefund,
      newSkuQuantity: result.sku.available_quantity,
      reason: validatedData.reason,
      notes: validatedData.notes
    }
  })
  return
}))

export default router