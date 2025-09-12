// 财务管理模块类型定义
// 前端使用类型（蛇形命名）

export interface financial_record {
  id: string
  record_type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS'
  amount: number
  description: string
  reference_type: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL'
  reference_id?: string
  category?: string
  transaction_date: string
  notes?: string
  created_at: string
  updated_at: string
  user_id: string
}

// 财务统计类型
export interface financial_summary {
  date: string
  total_income: number
  total_expense: number
  total_refund: number
  total_loss: number
  net_profit: number
}

// 月度财务统计类型
export interface monthly_financial_summary {
  year: number
  month: number
  year_month: string
  total_income: number
  total_expense: number
  total_refund: number
  total_loss: number
  net_profit: number
}

// 财务记录创建请求类型
export interface create_financial_record_request {
  record_type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS'
  amount: number
  description: string
  reference_type: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL'
  reference_id?: string
  category?: string
  transaction_date: string
  notes?: string
}

// 财务记录查询参数类型
export interface financial_record_query {
  page?: number
  limit?: number
  record_type?: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS'
  reference_type?: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL'
  start_date?: string
  end_date?: string
  category?: string
  search?: string
  sort?: 'asc' | 'desc'
  sort_by?: string
}

// 财务概览数据类型
export interface financial_overview {
  today: {
    income: number
    expense: number
    profit: number
  }
  this_month: {
    income: number
    expense: number
    profit: number
  }
  this_year: {
    income: number
    expense: number
    profit: number
  }
  recent_transactions: financial_record[]
}

// 财务图表数据类型
export interface financial_chart_data {
  labels: string[]
  income_data: number[]
  expense_data: number[]
  profit_data: number[]
}

// 财务统计查询参数
export interface FinancialStatisticsQuery {
  period?: 'daily' | 'monthly'
  start_date?: string
  end_date?: string
}

// API响应类型
export interface financial_record_list_response {
  financial_records: financial_record[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface FinancialStatisticsResponse {
  statistics: financial_summary[] | monthly_financial_summary[]
  period: 'daily' | 'monthly'
}

// 财务记录类型标签映射
export const FINANCIAL_RECORD_TYPE_LABELS = {
  INCOME: '收入',
  EXPENSE: '支出',
  REFUND: '退款',
  LOSS: '损耗'
} as const

// 财务记录引用类型标签映射
export const FINANCIAL_REFERENCE_TYPE_LABELS = {
  PURCHASE: '采购',
  SALE: '销售',
  REFUND: '退货',
  MANUAL: '手动'
} as const

// 财务记录类型颜色映射
export const FINANCIAL_RECORD_TYPE_COLORS = {
  INCOME: 'text-green-600',
  EXPENSE: 'text-red-600',
  REFUND: 'text-orange-600',
  LOSS: 'text-gray-600'
} as const

// 财务记录类型背景色映射
export const FINANCIAL_RECORD_TYPE_BG_COLORS = {
  INCOME: 'bg-green-100',
  EXPENSE: 'bg-red-100',
  REFUND: 'bg-orange-100',
  LOSS: 'bg-gray-100'
} as const

// 流水账记录类型
export interface TransactionRecord {
  id: string
  type: 'income' | 'expense'
  category: 'purchase' | 'production' | 'refund' | 'sale'
  amount: number
  description: string
  details: string
  reference_id: string
  reference_type: 'PURCHASE' | 'PRODUCTION' | 'DESTROY' | 'SALE'
  transaction_date: string
  created_at: string
}

// 流水账查询参数类型
export interface TransactionQuery {
  page?: number
  limit?: number
  type?: 'income' | 'expense' | 'all'
  start_date?: string
  end_date?: string
  search?: string
}

// 流水账响应类型
export interface TransactionListResponse {
  transactions: TransactionRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  summary: {
    total_income: number
    total_expense: number
    net_profit: number
  }
}

// 流水账分类标签映射
export const TRANSACTION_CATEGORY_LABELS = {
  purchase: '采购支出',
  production: '制作成本',
  refund: '退货退款',
  sale: '销售收入'
} as const

// 流水账分类颜色映射
export const TRANSACTION_CATEGORY_COLORS = {
  purchase: 'text-red-600',
  production: 'text-orange-600',
  refund: 'text-blue-600',
  sale: 'text-green-600'
} as const

// 库存状况统计类型
export interface InventoryStatusData {
  stale_period_months: number
  stale_threshold_date: string
  
  // 原材料库存
  material_inventory: {
    total_cost: number
    stale_cost: number
    stale_count: number
    total_count: number
    stale_ratio: number
  }
  
  // SKU库存
  sku_inventory: {
    total_cost: number
    stale_cost: number
    stale_count: number
    total_count: number
    stale_ratio: number
  }
  
  // 总计
  total_inventory: {
    total_cost: number
    stale_cost: number
    stale_count: number
    total_count: number
    stale_ratio: number
  }
}

// 库存状况查询参数类型
export interface InventoryStatusQuery {
  stale_period?: '1' | '3' | '6' // 滞销时间：1个月、3个月、6个月
}

// 滞销时间标签映射
export const STALE_PERIOD_LABELS = {
  '1': '滞销1个月',
  '3': '滞销3个月',
  '6': '滞销6个月'
} as const