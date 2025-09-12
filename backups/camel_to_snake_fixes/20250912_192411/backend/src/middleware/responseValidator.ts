import { Request, Response, NextFunction } from 'express'
import { validateFieldNaming } from '../utils/fieldConverter'

/**
 * API响应字段格式验证中间件
 * 确保所有API响应的字段都符合snake_case规范
 */
export const validateApiResponse = (req: Request, res: Response, next: NextFunction) => {
  // 保存原始的json方法
  const originalJson = res.json
  
  // 重写json方法，在发送响应前进行验证
  res.json = function(body: any) {
    try {
      // 验证响应数据的字段命名格式
      if (body && typeof body === 'object') {
        validateResponseFields(body, req.path)
      }
      
      // 调用原始的json方法发送响应
      return originalJson.call(this, body)
    } catch (error) {
      console.error('API响应字段格式验证失败:', {
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : '未知错误',
        body: JSON.stringify(body, null, 2)
      })
      
      // 在开发环境下抛出错误，生产环境下记录警告但继续发送响应
      if (process.env.NODE_ENV === 'development') {
        return originalJson.call(this, {
          success: false,
          message: '服务器内部错误：响应字段格式不符合规范',
          error: error instanceof Error ? error.message : '未知错误'
        })
      } else {
        console.warn('生产环境下检测到字段格式问题，但继续发送响应')
        return originalJson.call(this, body)
      }
    }
  }
  
  next()
}

/**
 * 递归验证响应数据中的字段命名格式
 * @param data 要验证的数据
 * @param path API路径，用于错误日志
 */
function validateResponseFields(data: any, path: string): void {
  if (!data || typeof data !== 'object') {
    return
  }
  
  // 跳过某些特殊字段的验证
  const skipValidationFields = ['error', 'stack', 'code']
  
  if (Array.isArray(data)) {
    // 验证数组中的每个元素
    data.forEach((item, index) => {
      try {
        validateResponseFields(item, `${path}[${index}]`)
      } catch (error) {
        throw new Error(`数组索引 ${index} 处的字段格式错误: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    })
  } else {
    // 验证对象的字段名
    Object.keys(data).forEach(key => {
      // 跳过特殊字段
      if (skipValidationFields.includes(key)) {
        return
      }
      
      // 验证字段名是否符合snake_case格式
      const isSnakeCase = /^[a-z][a-z0-9_]*$/.test(key)
      if (!isSnakeCase) {
        throw new Error(`字段 "${key}" 不符合snake_case命名规范`)
      }
      
      // 递归验证嵌套对象
      if (data[key] && typeof data[key] === 'object') {
        try {
          validateResponseFields(data[key], `${path}.${key}`)
        } catch (error) {
          throw new Error(`字段 "${key}" 中的嵌套数据格式错误: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      }
    })
  }
}

/**
 * 验证特定API端点的响应格式
 * @param endpoint API端点路径
 * @param response_data 响应数据
 */
export function validateEndpointResponse(endpoint: string, response_data: any): boolean {
  try {
    validateResponseFields(response_data, endpoint)
    return true
  } catch (error) {
    console.error(`API端点 ${endpoint} 响应格式验证失败:`, error instanceof Error ? error.message : '未知错误')
    return false
  }
}

/**
 * 开发环境下的严格验证模式
 * 在开发环境下对所有API响应进行严格的字段格式检查
 */
export const strictValidationMode = process.env.NODE_ENV === 'development'

/**
 * 字段格式验证配置
 */
export const validationConfig = {
  // 是否启用响应验证
  enabled: process.env.FIELD_VALIDATION_ENABLED !== 'false',
  
  // 是否在验证失败时抛出错误（开发环境默认true，生产环境默认false）
  throwOnError: process.env.NODE_ENV === 'development',
  
  // 需要跳过验证的API路径
  skipPaths: [
    '/health',
    '/ping',
    '/api/health'
  ],
  
  // 需要跳过验证的字段名
  skipFields: [
    'error',
    'stack',
    'code',
    'errno',
    'syscall',
    'hostname'
  ]
}