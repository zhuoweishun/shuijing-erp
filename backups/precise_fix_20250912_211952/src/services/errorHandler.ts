// 统一错误处理服务
import { toast } from 'sonner'

// 错误类型枚举（符合文档07规范）
export enum ErrorType {
  // 业务错误（4xx）
  VALIDATION_ERROR = 'VALIDATION_ERROR', // 参数验证失败
  INVALID_DIAMETER = 'INVALID_DIAMETER', // 珠子直径无效
  AI_RECOGNITION_FAILED = 'AI_RECOGNITION_FAILED', // AI识别失败
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK', // 库存不足
  insufficient_permissions = 'insufficient_permissions', // 权限不足
  CHAT_FAILED = 'CHAT_FAILED', // AI对话失败
  INSIGHTS_FAILED = 'INSIGHTS_FAILED', // 业务洞察失败
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY', // 重复数据
  
  // 网络错误（4xx/5xx）
  NETWORK_ERROR = 'NETWORK_ERROR', // 网络连接错误
  TIMEOUT_ERROR = 'TIMEOUT_ERROR', // 请求超时
  API_UNAVAILABLE = 'API_UNAVAILABLE', // API服务不可用
  
  // 系统错误（5xx）
  DATABASE_ERROR = 'DATABASE_ERROR', // 数据库错误
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR', // 外部服务错误（如OSS）
  ASSISTANT_ERROR = 'ASSISTANT_ERROR', // AI助理服务异常
  
  // 认证错误
  invalid_token = 'invalid_token', // 无效令牌
  token_expired = 'token_expired', // 令牌过期
  unauthorized = 'unauthorized', // 未授权
  FORBIDDEN = 'FORBIDDEN', // 禁止访问
  
  // 通用错误
  BAD_REQUEST = 'BAD_REQUEST', // 请求错误
  NOT_FOUND = 'NOT_FOUND', // 资源不存在
  CONFLICT = 'CONFLICT', // 资源冲突
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR', // 服务器内部错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR' // 未知错误
}

// 统一错误响应格式（符合文档07规范）
export interface ErrorResponse {
  success: false
  message: string
  error: {
    code: string
    details?: any
  }
}

// 错误处理配置
interface ErrorHandlerConfig {
  showToast?: boolean // 是否显示toast提示
  logError?: boolean // 是否记录错误日志
  redirectOnAuth?: boolean // 认证错误时是否重定向
  retryable?: boolean // 是否可重试
}

// 默认错误处理配置
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  showToast: true,
  logError: true,
  redirect_on_auth: true,
  retryable: false
}

// 错误码到用户友好消息的映射
const ERROR_MESSAGES: Record<string, string> = {
  // 业务错误
  [ErrorType.VALIDATION_ERROR]: '输入数据格式不正确，请检查后重试',
  [ErrorType.INVALID_DIAMETER]: '珠子直径必须在4-20mm之间',
  [ErrorType.AI_RECOGNITION_FAILED]: 'AI识别服务暂时不可用，请稍后重试',
  [ErrorType.INSUFFICIENT_STOCK]: '库存不足，无法完成操作',
  [ErrorType.insufficient_permissions]: '权限不足，请联系管理员',
  [ErrorType.CHAT_FAILED]: 'AI对话服务暂时不可用',
  [ErrorType.INSIGHTS_FAILED]: '业务洞察分析失败',
  [ErrorType.DUPLICATE_ENTRY]: '数据已存在，请检查后重试',
  
  // 网络错误
  [ErrorType.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
  [ErrorType.TIMEOUT_ERROR]: '请求超时，请稍后重试',
  [ErrorType.API_UNAVAILABLE]: 'API服务暂时不可用，请稍后重试',
  
  // 系统错误
  [ErrorType.DATABASE_ERROR]: '数据库操作失败，请稍后重试',
  [ErrorType.EXTERNAL_SERVICE_ERROR]: '外部服务暂时不可用',
  [ErrorType.ASSISTANT_ERROR]: 'AI助理服务异常',
  
  // 认证错误
  [ErrorType.invalid_token]: '登录状态无效，请重新登录',
  [ErrorType.token_expired]: '登录已过期，请重新登录',
  [ErrorType.unauthorized]: '未授权访问，请先登录',
  [ErrorType.FORBIDDEN]: '禁止访问，权限不足',
  
  // 通用错误
  [ErrorType.BAD_REQUEST]: '请求参数错误',
  [ErrorType.NOT_FOUND]: '请求的资源不存在',
  [ErrorType.CONFLICT]: '操作冲突，请稍后重试',
  [ErrorType.INTERNAL_SERVER_ERROR]: '服务器内部错误，请稍后重试',
  [ErrorType.UNKNOWN_ERROR]: '未知错误，请稍后重试'
}

// 可重试的错误类型
const RETRYABLE_ERRORS = new Set([
  ErrorType.NETWORK_ERROR,
  ErrorType.TIMEOUT_ERROR,
  ErrorType.API_UNAVAILABLE,
  ErrorType.DATABASE_ERROR,
  ErrorType.EXTERNAL_SERVICE_ERROR,
  ErrorType.INTERNAL_SERVER_ERROR
])

// 需要重定向到登录页的错误类型
const auth_redirect_errors = new Set([
  ErrorType.invalid_token,
  ErrorType.token_expired,
  ErrorType.unauthorized
])

// 统一错误处理类
export class ErrorHandler {
  private static instance: ErrorHandler
  private retryCount = new Map<string, number>()
  private maxRetries = 3
  
  private constructor() {}
  
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }
  
  // 处理API错误响应
  handleApiError(error: any, config: Partial<ErrorHandlerConfig> = {}): void {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }
    
    let errorResponse: ErrorResponse
    let statusCode = 500
    
    // 解析错误响应
    if (error.response) {
      // HTTP错误响应
      statusCode = error.response.status
      errorResponse = error.response.data || {
        success: false,
        message: error.response.status_text || '请求失败',
        error: {
          code: this.get_error_code_from_status(statusCode)
        }
      }
    } else if (error.request) {
      // 网络错误
      errorResponse = {
        success: false,
        message: '网络连接失败',
        error: {
          code: ErrorType.NETWORK_ERROR,
          details: {
            type: 'network_error',
            message: error.message
          }
        }
      }
    } else {
      // 其他错误
      errorResponse = {
        success: false,
        message: error.message || '未知错误',
        error: {
          code: ErrorType.UNKNOWN_ERROR,
          details: {
            type: 'unknown_error',
            message: error.message
          }
        }
      }
    }
    
    // 记录错误日志
    if (finalConfig.logError) {
      this.logError(errorResponse, error)
    }
    
    // 处理认证错误
    if (finalConfig.redirect_on_auth && errorResponse.error?.code && AUTH_REDIRECT_ERRORS.has(errorResponse.error.code as ErrorType)) {
      this.handleAuthError()
      return
    }
    
    // 显示用户友好的错误提示
    if (finalConfig.showToast) {
      this.showErrorToast(errorResponse)
    }
    
    // 检查是否可重试
    if (finalConfig.retryable && errorResponse.error?.code && this.isRetryable(errorResponse.error.code)) {
      // 重试逻辑由调用方处理
      console.log('🔄 错误可重试:', errorResponse.error.code)
    }
  }
  
  // 处理网络错误
  handleNetworkError(error: any, config: Partial<ErrorHandlerConfig> = {}): void {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }
    
    const errorResponse: ErrorResponse = {
      success: false,
      message: '网络连接失败，请检查网络设置',
      error: {
        code: ErrorType.NETWORK_ERROR,
        details: {
          type: 'network_error',
          message: error.message,
          url: error.config?.url
        }
      }
    }
    
    if (finalConfig.logError) {
      this.logError(errorResponse, error)
    }
    
    if (finalConfig.showToast) {
      this.showErrorToast(errorResponse)
    }
  }
  
  // 处理超时错误
  handleTimeoutError(error: any, config: Partial<ErrorHandlerConfig> = {}): void {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }
    
    const errorResponse: ErrorResponse = {
      success: false,
      message: '请求超时，请稍后重试',
      error: {
        code: ErrorType.TIMEOUT_ERROR,
        details: {
          type: 'timeout_error',
          timeout: error.config?.timeout
        }
      }
    }
    
    if (finalConfig.logError) {
      this.logError(errorResponse, error)
    }
    
    if (finalConfig.showToast) {
      this.showErrorToast(errorResponse)
    }
  }
  
  // 显示错误Toast
  private showErrorToast(errorResponse: ErrorResponse): void {
    const error_code = errorResponse.error?.code || ErrorType.UNKNOWN_ERROR
    
    // 优先使用后端返回的具体错误消息，如果没有则使用预定义消息
    let userMessage = errorResponse.message
    if (!userMessage || userMessage === '请求失败' || userMessage === 'Bad Request') {
      userMessage = ERROR_MESSAGES[error_code] || '操作失败，请稍后重试'
    }
    
    // 根据错误类型选择不同的toast样式
    if (AUTH_REDIRECT_ERRORS.has(error_code as ErrorType)) {
      toast.error(userMessage, {
        duration: 5000,
        description: '即将跳转到登录页面'
      })
    } else if (RETRYABLE_ERRORS.has(error_code as ErrorType)) {
      toast.error(userMessage, {
        duration: 4000,
        description: '系统将自动重试'
      })
    } else {
      toast.error(userMessage, {
        duration: 3000
      })
    }
  }
  
  // 处理认证错误
  private handleAuthError(): void {
    // 清除认证信息
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
    
    // 延迟跳转，让用户看到错误提示
    setTimeout(() => {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }, 2000)
  }
  
  // 记录错误日志
  private logError(errorResponse: ErrorResponse, originalError: any): void {
    // 检查是否是正常的"无数据"情况，这些情况不应该记录为错误
    const isNoDataScenario = (
      errorResponse.message?.includes('客户不存在') ||
      errorResponse.message?.includes('没有找到') ||
      (errorResponse.error?.code === ErrorType.NOT_FOUND && 
       (window.location.pathname.includes('/customers') || 
        originalError.config?.url?.includes('/customers')))
    )
    
    // 如果是正常的无数据情况，不记录错误日志
    if (isNoDataScenario) {
      return
    }
    
    const logData = {
      timestamp: new Date().toISOString(),
      error_code: errorResponse.error?.code || ErrorType.UNKNOWN_ERROR,
      message: errorResponse.message,
      details: errorResponse.error?.details,
      originalError: {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      },
      user_agent: navigator.user_agent,
      url: window.location.href,
      user_id: localStorage.get_item('')
    }
    
    // 根据环境控制日志输出级别
    if (import.meta.env.MODE === 'development') {
      // 开发环境：显示详细的错误日志
      console.error('🚨 API错误详情:', logData)
    } else {
      // 生产环境：只显示简化的错误信息
      console.error(`API错误: ${errorResponse.message} (${errorResponse.error?.code})`)
    }
    
    // 在生产环境中，这里可以发送错误日志到监控服务
    if (import.meta.env.MODE === 'production') {
      // TODO: 发送到错误监控服务（如Sentry）
    }
  }
  
  // 根据HTTP状态码获取错误码
  private get_error_code_from_status(status: number): string {
    switch (status) {
      case 400: return ErrorType.BAD_REQUEST
      case 401: return ErrorType.unauthorized
      case 403: return ErrorType.FORBIDDEN
      case 404: return ErrorType.NOT_FOUND
      case 409: return ErrorType.CONFLICT
      case 422: return ErrorType.VALIDATION_ERROR
      case 500: return ErrorType.INTERNAL_SERVER_ERROR
      case 502:
      case 503:
      case 504: return ErrorType.API_UNAVAILABLE
      default: return ErrorType.UNKNOWN_ERROR
    }
  }
  
  // 检查错误是否可重试
  private isRetryable(error_code: string): boolean {
    return RETRYABLE_ERRORS.has(error_code as ErrorType)
  }
  
  // 获取重试次数
  getRetryCount(key: string): number {
    return this.retry_count.get(key) || 0
  }
  
  // 增加重试次数
  incrementRetryCount(key: string): number {
    const count = this.get_retry_count(key) + 1
    this.retry_count.set(key, count)
    return count
  }
  
  // 重置重试次数
  resetRetryCount(key: string): void {
    this.retry_count.delete(key)
  }
  
  // 检查是否可以重试
  canRetry(key: string): boolean {
    return this.get_retry_count(key) < this.maxRetries
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance()

// 便捷的错误处理函数
export const handleApiError = (error: any, config?: Partial<ErrorHandlerConfig>) => {
  errorHandler.handleApiError(error, config)
}

export const handleNetworkError = (error: any, config?: Partial<ErrorHandlerConfig>) => {
  errorHandler.handleNetworkError(error, config)
}

export const handleTimeoutError = (error: any, config?: Partial<ErrorHandlerConfig>) => {
  errorHandler.handleTimeoutError(error, config)
}