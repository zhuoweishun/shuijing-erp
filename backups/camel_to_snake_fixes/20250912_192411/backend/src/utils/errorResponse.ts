// 统一错误响应工具函数

/**
 * 创建统一的错误响应格式
 * @param message 错误消息
 * @param code 错误码
 * @param details 错误详情（可选）
 * @returns 统一格式的错误响应对象
 */
export function createErrorResponse(
  message: string,
  code: string,
  details?: any
) {
  return {
    success: false,
    message,
    error: {
      code,
      details
    }
  }
}

/**
 * 创建成功响应格式
 * @param message 成功消息
 * @param data 响应数据（可选）
 * @returns 统一格式的成功响应对象
 */
export function createSuccessResponse(
  message: string,
  data?: any
) {
  const response: any = {
    success: true,
    message
  }
  
  if (data !== undefined) {
    response.data = data
  }
  
  return response
}

/**
 * 常用错误响应创建函数
 */
export const ErrorResponses = {
  // 400 错误
  bad_request: (message: string = '请求参数错误', details?: any) => 
    createErrorResponse(message, 'BAD_REQUEST', details),
  
  validation: (message: string = '数据验证失败', details?: any) => 
    createErrorResponse(message, 'VALIDATION_ERROR', details),
  
  // 401 错误
  unauthorized: (message: string = '未授权访问', details?: any) => 
    createErrorResponse(message, 'unauthorized', details),
  
  invalid_token: (message: string = '无效的访问令牌', details?: any) => 
    createErrorResponse(message, 'invalid_token', details),
  
  token_expired: (message: string = '访问令牌已过期', details?: any) => 
    createErrorResponse(message, 'token_expired', details),
  
  // 403 错误
  forbidden: (message: string = '禁止访问', details?: any) => 
    createErrorResponse(message, 'FORBIDDEN', details),
  
  insufficient_permissions: (message: string = '权限不足', details?: any) => 
    createErrorResponse(message, 'insufficient_permissions', details),
  
  // 404 错误
  not_found: (message: string = '资源不存在', details?: any) => 
    createErrorResponse(message, 'NOT_FOUND', details),
  
  record_not_found: (message: string = '记录不存在', details?: any) => 
    createErrorResponse(message, 'RECORD_NOT_FOUND', details),
  
  // 409 错误
  conflict: (message: string = '资源冲突', details?: any) => 
    createErrorResponse(message, 'CONFLICT', details),
  
  duplicate_entry: (message: string = '数据已存在', details?: any) => 
    createErrorResponse(message, 'DUPLICATE_ENTRY', details),
  
  // 500 错误
  internal: (message: string = '服务器内部错误', details?: any) => 
    createErrorResponse(message, 'INTERNAL_SERVER_ERROR', details),
  
  database_error: (message: string = '数据库操作失败', details?: any) => 
    createErrorResponse(message, 'DATABASE_ERROR', details),
  
  // 业务特定错误
  insufficient_stock: (message: string = '库存不足', details?: any) => 
    createErrorResponse(message, 'INSUFFICIENT_STOCK', details),
  
  invalid_diameter: (message: string = '珠子直径必须在4-20mm范围内', details?: any) => 
    createErrorResponse(message, 'INVALID_DIAMETER', details),
  
  ai_service_error: (message: string = 'AI服务异常', details?: any) => 
    createErrorResponse(message, 'AI_SERVICE_ERROR', details)
}