import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

// 自定义错误类
export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.capture_stack_trace(this, this.constructor)
  }
}

// 错误处理中间件
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500
  let message = '服务器内部错误'
  let details: any = undefined

  // 自定义应用错误
  if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
  }
  // Prisma错误
  else if (error.name === 'PrismaClientKnownRequestError') {
    statusCode = 400
    message = '数据库操作失败'
    
    // 处理常见的Prisma错误
    const prismaError = error as any
    switch (prismaError.code) {
      case 'P2002':
        message = '数据已存在，违反唯一性约束'
        break
      case 'P2025':
        message = '记录不存在'
        statusCode = 404
        break
      case 'P2003':
        message = '外键约束失败'
        break
      case 'P2014':
        message = '数据关联冲突'
        break
      default:
        message = '数据库操作失败'
    }
  }
  // JWT错误
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401
    message = '无效的访问令牌'
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401
    message = '访问令牌已过期'
  }
  // Zod验证错误
  else if (error.name === 'ZodError') {
    statusCode = 400
    message = '数据验证失败'
    const zodError = error as any
    if (zodError.errors && zodError.errors.length > 0) {
      // 提取第一个验证错误的详细信息
      const firstError = zodError.errors[0]
      message = firstError.message || '数据验证失败'
      details = {
        field: firstError.path?.join('.') || 'unknown',
        value: firstError.received,
        expected: firstError.expected,
        errors: zodError.errors.map((err: any) => ({
          field: err.path?.join('.'),
          message: err.message,
          code: err.code
        }))
      }
    }
  }
  // 其他验证错误
  else if (error.name === 'ValidationError') {
    statusCode = 400
    message = '数据验证失败'
    details = error.message
  }
  // 语法错误
  else if (error instanceof SyntaxError) {
    statusCode = 400
    message = '请求数据格式错误'
  }
  // 其他错误
  else {
    message = process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : error.message
  }

  // 记录错误日志
  logger.error('API错误:', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      user_agent: req.get('User-Agent')
    },
    statusCode
  })

  // 生成错误码（符合文档07规范）
  const generateErrorCode = (error: Error, statusCode: number): string => {
    if (error instanceof AppError) {
      // 根据错误消息生成业务错误码
      if (error.message.includes('权限不足') || error.message.includes('权限')) return 'insufficient_permissions'
      if (error.message.includes('库存不足')) return 'INSUFFICIENT_STOCK'
      if (error.message.includes('直径') || error.message.includes('4-20mm')) return 'INVALID_DIAMETER'
      if (error.message.includes('AI识别') || error.message.includes('AI服务')) return 'AI_RECOGNITION_FAILED'
      if (error.message.includes('AI对话')) return 'CHAT_FAILED'
      if (error.message.includes('业务洞察')) return 'INSIGHTS_FAILED'
      if (error.message.includes('供应商名称已存在') || error.message.includes('重复')) return 'DUPLICATE_ENTRY'
    }
    
    // Prisma错误码映射（更详细）
    const prismaError = error as any
    if (prismaError.code) {
      switch (prismaError.code) {
        case 'P2002': 
          // 唯一约束违反
          if (prismaError.meta?.target?.includes('name')) {
            return 'DUPLICATE_SUPPLIER'
          }
          return 'DUPLICATE_ENTRY'
        case 'P2025': return 'RECORD_NOT_FOUND'
        case 'P2003': return 'FOREIGN_KEY_CONSTRAINT'
        case 'P2014': return 'RELATION_CONFLICT'
        case 'P1001': return 'DATABASE_ERROR'
        case 'P1002': return 'DATABASE_ERROR'
        case 'P1008': return 'TIMEOUT_ERROR'
        case 'P1017': return 'DATABASE_ERROR'
      }
    }
    
    // JWT错误码
    if (error.name === 'JsonWebTokenError') return 'invalid_token'
    if (error.name === 'TokenExpiredError') return 'token_expired'
    
    // Zod验证错误
     if (error.name === 'ZodError') return 'VALIDATION_ERROR'
     if (error.name === 'ValidationError') return 'VALIDATION_ERROR'
    
    // 网络和外部服务错误
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return 'EXTERNAL_SERVICE_ERROR'
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return 'TIMEOUT_ERROR'
    }
    
    // 默认错误码（符合文档07规范）
    switch (statusCode) {
      case 400: return 'BAD_REQUEST'
      case 401: return 'unauthorized'
      case 403: return 'FORBIDDEN'
      case 404: return 'NOT_FOUND'
      case 409: return 'CONFLICT'
      case 422: return 'VALIDATION_ERROR'
      case 500: return 'INTERNAL_SERVER_ERROR'
      case 502: return 'API_UNAVAILABLE'
      case 503: return 'API_UNAVAILABLE'
      case 504: return 'TIMEOUT_ERROR'
      default: return 'UNKNOWN_ERROR'
    }
  }
  
  const error_code = generateErrorCode(error, statusCode)
  
  // 返回符合ApiResponse<T>格式的错误响应
  const errorResponse: any = {
    success: false,
    message,
    error: {
      code: errorCode,
      details: details || (process.env.NODE_ENV === 'development' ? {
        name: error.name,
        stack: error.stack
      } : undefined)
    }
  }
  
  res.status(statusCode).json(errorResponse)
}

// 异步错误包装器
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// 404错误处理
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`路由 ${req.original_url} 不存在`, 404)
  next(error)
}

// 常用错误创建函数
export const createError = {
  badRequest: (message: string = '请求参数错误') => new AppError(message, 400),
  unauthorized: (message: string = '未授权访问') => new AppError(message, 401),
  forbidden: (message: string = '禁止访问') => new AppError(message, 403),
  notFound: (message: string = '资源不存在') => new AppError(message, 404),
  conflict: (message: string = '资源冲突') => new AppError(message, 409),
  internal: (message: string = '服务器内部错误') => new AppError(message, 500)
}