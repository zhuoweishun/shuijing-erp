/**
 * 简化的错误处理工具
 */

export class ErrorHandler {
  /**
   * 获取用户友好的错误信息
   */
  static getUserMessage(error: any): string {
    const message = error?.message || error?.toString() || '操作失败';
    
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return '网络连接失败，请检查网络后重试';
    }
    
    if (message.includes('401') || message.includes('unauthorized')) {
      return '登录状态已过期，请重新登录';
    }
    
    if (message.includes('403') || message.includes('permission')) {
      return '权限不足，无法执行此操作';
    }
    
    return '操作失败，请重试';
  }

  /**
   * 记录错误（开发环境）
   */
  static logError(error: any, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.error(`错误${context ? ` - ${context}` : ''}:`, error);
    }
  }
}