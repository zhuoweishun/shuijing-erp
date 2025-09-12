// 财务管理模块类型定义
// 遵循数据库驼峰命名，前端蛇形字段的转换规范

// 数据库字段类型（驼峰命名）
export interface financial_record_db {
  id: string;
  record_type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS';
  amount: number;
  description: string;
  reference_type: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL';
  reference_id?: string;
  category?: string;
  transaction_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// 前端使用类型（蛇形命名）
export interface financial_record {
  id: string;
  record_type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS';
  amount: number;
  description: string;
  reference_type: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL';
  reference_id?: string;
  category?: string;
  transaction_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// 退货记录数据库类型（驼峰命名）
export interface refund_record_db {
  id: string;
  sale_record_id?: string;
  sku_id?: string;
  customer_name?: string;
  customer_contact?: string;
  refund_amount: number;
  loss_amount: number;
  reason?: string;
  refund_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  notes?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// 退货记录前端类型（蛇形命名）
export interface refund_record {
  id: string;
  sale_record_id?: string;
  sku_id?: string;
  customer_name?: string;
  customer_contact?: string;
  refund_amount: number;
  loss_amount: number;
  reason?: string;
  refund_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  notes?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// 财务统计类型
export interface financial_summary {
  date: string;
  total_income: number;
  total_expense: number;
  total_refund: number;
  total_loss: number;
  net_profit: number;
}

// 月度财务统计类型
export interface monthly_financial_summary {
  year: number;
  month: number;
  year_month: string;
  total_income: number;
  total_expense: number;
  total_refund: number;
  total_loss: number;
  net_profit: number;
}

// 财务记录创建请求类型
export interface create_financial_record_request {
  record_type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS';
  amount: number;
  description: string;
  reference_type: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL';
  reference_id?: string;
  category?: string;
  transaction_date: string;
  notes?: string;
}

// 退货处理请求类型
export interface create_refund_request {
  sale_record_id?: string;
  sku_id?: string;
  customer_name?: string;
  customer_contact?: string;
  refund_amount: number;
  loss_amount?: number;
  reason?: string;
  notes?: string;
}

// 财务记录查询参数类型
export interface financial_record_query {
  page?: number;
  limit?: number;
  record_type?: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS';
  reference_type?: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL';
  start_date?: string;
  end_date?: string;
  category?: string;
  search?: string;
  sort?: 'asc' | 'desc';
  sort_by?: string;
}

// 退货记录查询参数类型
export interface refund_record_query {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  start_date?: string;
  end_date?: string;
  customer_name?: string;
  search?: string;
  sort?: 'asc' | 'desc';
  sort_by?: string;
}

// 财务概览数据类型
export interface financial_overview {
  today: {
    income: number;
    expense: number;
    profit: number;
  };
  this_month: {
    income: number;
    expense: number;
    profit: number;
  };
  this_year: {
    income: number;
    expense: number;
    profit: number;
  };
  recent_transactions: financial_record[];
}

// 财务图表数据类型
export interface financial_chart_data {
  labels: string[];
  income_data: number[];
  expense_data: number[];
  profit_data: number[];
}

// API响应类型
export interface financial_record_list_response {
  financial_records: financial_record[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface refund_record_list_response {
  refund_records: refund_record[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// 财务记录类型标签映射
export const FINANCIAL_RECORD_TYPE_LABELS = {
  INCOME: '收入',
  EXPENSE: '支出',
  REFUND: '退款',
  LOSS: '损耗'
} as const;

// 财务记录引用类型标签映射
export const FINANCIAL_REFERENCE_TYPE_LABELS = {
  PURCHASE: '采购',
  SALE: '销售',
  REFUND: '退货',
  MANUAL: '手动'
} as const;

// 退货状态标签映射
export const REFUND_STATUS_LABELS = {
  PENDING: '待处理',
  APPROVED: '已批准',
  REJECTED: '已拒绝',
  COMPLETED: '已完成'
} as const;

// 财务记录类型颜色映射
export const FINANCIAL_RECORD_TYPE_COLORS = {
  INCOME: 'text-green-600',
  EXPENSE: 'text-red-600',
  REFUND: 'text-orange-600',
  LOSS: 'text-gray-600'
} as const;

// 退货状态颜色映射
export const REFUND_STATUS_COLORS = {
  PENDING: 'text-yellow-600',
  APPROVED: 'text-blue-600',
  REJECTED: 'text-red-600',
  COMPLETED: 'text-green-600'
} as const;