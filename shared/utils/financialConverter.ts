// 财务管理模块数据转换器
// 用于数据库驼峰命名和前端蛇形字段之间的转换

import { 
  financial_record, 
  financial_record_db,
  refund_record,
  refund_record_db,
  create_financial_record_request,
  create_refund_request
} from '../types/financial';

/**
 * 将数据库财务记录转换为前端格式
 * @param db_record 数据库记录（驼峰命名）
 * @returns 前端记录（蛇形命名）
 */
export function convert_financial_record_from_db(db_record: financial_record_db): financial_record {
  return {
    id: db_record.id,
    record_type: db_record.record_type,
    amount: Number(db_record.amount),
    description: db_record.description,
    reference_type: db_record.reference_type,
    reference_id: db_record.reference_id,
    category: db_record.category,
    transaction_date: db_record.transaction_date,
    notes: db_record.notes,
    created_at: db_record.created_at,
    updated_at: db_record.updated_at,
    user_id: db_record.user_id
  };
}

/**
 * 将前端财务记录转换为数据库格式
 * @param frontend_record 前端记录（蛇形命名）
 * @returns 数据库记录（驼峰命名）
 */
export function convert_financial_record_to_db(frontend_record: financial_record): financial_record_db {
  return {
    id: frontend_record.id,
    record_type: frontend_record.record_type,
    amount: frontend_record.amount,
    description: frontend_record.description,
    reference_type: frontend_record.reference_type,
    reference_id: frontend_record.reference_id,
    category: frontend_record.category,
    transaction_date: frontend_record.transaction_date,
    notes: frontend_record.notes,
    created_at: frontend_record.created_at,
    updated_at: frontend_record.updated_at,
    user_id: frontend_record.user_id
  };
}

/**
 * 将创建财务记录请求转换为数据库格式
 * @param request 创建请求（蛇形命名）
 * @param user_id 用户ID
 * @returns 数据库记录（驼峰命名）
 */
export function convert_create_financial_record_to_db(
  request: create_financial_record_request, 
  : string
): Partial<financial_record_db> {
  return {
    record_type: request.record_type,
    amount: request.amount,
    description: request.description,
    reference_type: request.reference_type,
    reference_id: request.reference_id,
    category: request.category,
    transaction_date: request.transaction_date,
    notes: request.notes,
    user_id: user_id
  };
}

/**
 * 将数据库退货记录转换为前端格式
 * @param db_record 数据库记录（驼峰命名）
 * @returns 前端记录（蛇形命名）
 */
export function convert_refund_record_from_db(db_record: refund_record_db): refund_record {
  return {
    id: db_record.id,
    sale_record_id: db_record.sale_record_id,
    sku_id: db_record.sku_id,
    customer_name: db_record.customer_name,
    customer_contact: db_record.customer_contact,
    refund_amount: Number(db_record.refund_amount),
    loss_amount: Number(db_record.loss_amount),
    reason: db_record.reason,
    refund_date: db_record.refund_date,
    status: db_record.status,
    notes: db_record.notes,
    created_at: db_record.created_at,
    updated_at: db_record.updated_at,
    user_id: db_record.user_id
  };
}

/**
 * 将前端退货记录转换为数据库格式
 * @param frontend_record 前端记录（蛇形命名）
 * @returns 数据库记录（驼峰命名）
 */
export function convert_refund_record_to_db(frontend_record: refund_record): refund_record_db {
  return {
    id: frontend_record.id,
    sale_record_id: frontend_record.sale_record_id,
    sku_id: frontend_record.sku_id,
    customer_name: frontend_record.customer_name,
    customer_contact: frontend_record.customer_contact,
    refund_amount: frontend_record.refund_amount,
    loss_amount: frontend_record.loss_amount,
    reason: frontend_record.reason,
    refund_date: frontend_record.refund_date,
    status: frontend_record.status,
    notes: frontend_record.notes,
    created_at: frontend_record.created_at,
    updated_at: frontend_record.updated_at,
    user_id: frontend_record.user_id
  };
}

/**
 * 将创建退货记录请求转换为数据库格式
 * @param request 创建请求（蛇形命名）
 * @param user_id 用户ID
 * @returns 数据库记录（驼峰命名）
 */
export function convert_create_refund_record_to_db(
  request: create_refund_request, 
  : string
): Partial<refund_record_db> {
  return {
    sale_record_id: request.sale_record_id,
    sku_id: request.sku_id,
    customer_name: request.customer_name,
    customer_contact: request.customer_contact,
    refund_amount: request.refund_amount,
    loss_amount: request.loss_amount || 20.00, // 默认损耗20元
    reason: request.reason,
    notes: request.notes,
    user_id: user_id
  };
}

/**
 * 批量转换数据库财务记录为前端格式
 * @param db_records 数据库记录数组
 * @returns 前端记录数组
 */
export function convert_financial_records_from_db(db_records: financial_record_db[]): financial_record[] {
  return db_records.map(convert_financial_record_from_db);
}

/**
 * 批量转换数据库退货记录为前端格式
 * @param db_records 数据库记录数组
 * @returns 前端记录数组
 */
export function convert_refund_records_from_db(db_records: refund_record_db[]): refund_record[] {
  return db_records.map(convert_refund_record_from_db);
}

/**
 * 转换财务统计数据的字段命名
 * @param db_data 数据库统计数据
 * @returns 前端统计数据
 */
export function convert_financial_summary_from_db(db_data: any) {
  return {
    date: db_data.date,
    total_income: Number(db_data.total_income || 0),
    total_expense: Number(db_data.total_expense || 0),
    total_refund: Number(db_data.total_refund || 0),
    total_loss: Number(db_data.total_loss || 0),
    net_profit: Number(db_data.net_profit || 0)
  };
}

/**
 * 转换月度财务统计数据的字段命名
 * @param db_data 数据库月度统计数据
 * @returns 前端月度统计数据
 */
export function convert_monthly_financial_summary_from_db(db_data: any) {
  return {
    year: db_data.year,
    month: db_data.month,
    year_month: db_data.year_month,
    total_income: Number(db_data.total_income || 0),
    total_expense: Number(db_data.total_expense || 0),
    total_refund: Number(db_data.total_refund || 0),
    total_loss: Number(db_data.total_loss || 0),
    net_profit: Number(db_data.net_profit || 0)
  };
}

/**
 * 格式化金额显示
 * @param amount 金额
 * @returns 格式化后的金额字符串
 */
export function format_amount(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * 格式化日期显示
 * @param dateString 日期字符串
 * @returns 格式化后的日期字符串
 */
export function format_date(dateString: string): string {
  const date = new Date(dateString);
  return date.to_locale_string('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai'
  });
}

/**
 * 格式化日期为YYYY-MM-DD格式
 * @param dateString 日期字符串
 * @returns YYYY-MM-DD格式的日期字符串
 */
export function format_date_only(dateString: string): string {
  const date = new Date(dateString);
  return date.to_i_s_o_string().split('T')[0];
}