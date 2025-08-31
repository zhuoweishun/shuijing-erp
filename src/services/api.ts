// API服务配置和请求处理
import { ApiResponse } from '../types'
import { convertToApiFormat, validateFieldNaming } from '../utils/fieldConverter'



import { handleApiError, handleNetworkError, handleTimeoutError, ErrorType } from './errorHandler'

// 修复图片URL协议问题和IP地址更新
export const fixImageUrl = (url: string): string => {
  if (!url) return url
  
  // 如果是相对路径，直接返回
  if (!url.startsWith('http')) return url
  
  // 获取当前主机名
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  
  // 提取URL中的IP地址
  const urlMatch = url.match(/https?:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):3001/)
  if (urlMatch) {
    const urlIP = urlMatch[1]
    
    // 如果URL中的IP与当前主机名不同，需要替换
    if (urlIP !== currentHostname) {
      // 如果当前是局域网IP，替换为当前IP
      if (currentHostname.startsWith('192.168.') || currentHostname.startsWith('10.') || 
          (currentHostname.startsWith('172.') && parseInt(currentHostname.split('.')[1]) >= 16 && parseInt(currentHostname.split('.')[1]) <= 31)) {
        const newUrl = url.replace(new RegExp(`https?://${urlIP.replace(/\./g, '\\.')}:3001`, 'g'), `http://${currentHostname}:3001`)
        console.log(`🔄 图片URL已更新: ${url} -> ${newUrl}`)
        return newUrl
      }
      // 如果当前是localhost，尝试使用缓存的IP
      else if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
        const cachedIP = localStorage.getItem('cached_local_ip') || localStorage.getItem('last_working_ip')
        if (cachedIP && cachedIP !== urlIP) {
          const newUrl = url.replace(new RegExp(`https?://${urlIP.replace(/\./g, '\\.')}:3001`, 'g'), `http://${cachedIP}:3001`)
          console.log(`🔄 图片URL已更新: ${url} -> ${newUrl}`)
          return newUrl
        }
      }
    }
  }
  
  // 如果是HTTPS的本地/局域网地址，改为HTTP
  if (url.startsWith('https://localhost:') || 
      url.startsWith('https://127.0.0.1:') ||
      url.startsWith('https://192.168.') ||
      url.startsWith('https://10.') ||
      url.startsWith('https://172.')) {
    return url.replace('https://', 'http://')
  }
  
  return url
}









// 简化的API基础URL获取
const getApiUrl = (): string => {
  // 1. 优先使用环境变量配置
  const envApiUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window as any).__VITE_API_URL__)
  if (envApiUrl && envApiUrl.trim() !== '') {
    const apiUrl = envApiUrl.endsWith('/api/v1') ? envApiUrl : `${envApiUrl}/api/v1`
    return apiUrl
  }
  
  // 2. 根据当前环境动态构建API地址
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // 如果是公网域名，使用公网API
    if (hostname.includes('dorblecapital.com')) {
      return 'https://api.dorblecapital.com/api/v1'
    }
    
    // 如果是局域网IP，动态构建局域网API地址
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || 
        (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31)) {
      return `http://${hostname}:3001/api/v1`
    }
    
    // localhost情况
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://localhost:3001/api/v1`
    }
    
    // 其他情况，本地开发环境使用HTTP
    return `http://${hostname}:3001/api/v1`
  }
  
  // 服务端渲染时的默认值
  return 'http://localhost:3001/api/v1'
}







// API配置
export const API_CONFIG = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
}

// 请求拦截器类型
interface RequestConfig extends RequestInit {
  timeout?: number
}

// 响应类型已从 ../types 导入

// 辅助函数：构建查询字符串
const buildQueryString = (params?: Record<string, any>): string => {
  if (!params) return ''
  
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      // 处理数组参数
      if (Array.isArray(value)) {
        // 过滤掉空字符串和undefined，保留null值但转换为特殊标识
        const filteredArray = value
          .filter(item => item !== undefined && item !== '')
          .map(item => item === null ? 'null' : String(item))
        
        // 为每个数组元素添加单独的参数
        filteredArray.forEach(item => {
          searchParams.append(key, item)
        })
      } else if (value !== null) {
        searchParams.append(key, String(value))
      }
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

// 创建请求实例
class ApiClient {
  // private default_timeout: number // 暂时注释掉未使用的属性

  constructor() {
    // this.default_timeout = API_CONFIG.timeout // 暂时注释掉
  }

  // 通用请求方法（带重试机制和智能错误处理）
  private async request<T>(
      endpoint: string,
      config: RequestConfig = {},
      // retry_count: number = 0 // 暂时注释掉未使用的参数
    ): Promise<ApiResponse<T>> {
      // const baseURL = getApiUrl() // 暂时注释掉未使用的变量
      // const url = `${baseURL}${endpoint}` // 暂时注释掉未使用的变量
      
      return this.executeRequest<T>(endpoint, config)
    }
    
    private async executeRequest<T>(
      endpoint: string,
      config: RequestConfig = {}
    ): Promise<ApiResponse<T>> {
      // 获取基础配置
      const baseURL = getApiUrl()
      const url = `${baseURL}${endpoint}`
    // 移除缓存相关代码
    
    // 只在开发环境中显示详细的API请求日志
    if (import.meta.env.MODE === 'development') {
      console.log('🚀 发起API请求:', {
        endpoint,
        method: config.method || 'GET',
        timestamp: new Date().toLocaleString()
      })
    }
    
    // 设置默认headers
    const headers: Record<string, string> = {
      ...(config.headers as Record<string, string> || {}),
    }
    
    // 只有在不是FormData时才设置默认的Content-Type
    if (!(config.body instanceof FormData)) {
      Object.assign(headers, API_CONFIG.headers)
    }

    // 添加认证token
    const token = localStorage.getItem('auth_token')
    if (import.meta.env.MODE === 'development') {
      console.log('🔍 [DEBUG] 从localStorage获取的token:', token ? `${token.substring(0, 20)}...` : 'null')
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    if (import.meta.env.MODE === 'development') {
      console.log('请求headers:', headers)
      console.log('请求body类型:', config.body?.constructor.name)
    }

    try {
      // 创建AbortController用于超时控制
      const controller = new AbortController()
      const timeout = 10000 // 10秒超时
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...config,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (import.meta.env.MODE === 'development') {
        console.log('API请求成功:', {
          url,
          status: response.status,
          method: config.method || 'GET'
        })
      }

      // 检查响应状态
      if (!response.ok) {
        // 创建符合错误处理器格式的错误对象
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        ;(error as any).response = {
          status: response.status,
          statusText: response.statusText,
          data: null
        }
        
        // 尝试解析错误响应体
        try {
          const errorData = await response.json()
          ;(error as any).response.data = errorData
        } catch (parseError) {
          // 如果无法解析响应体，使用默认错误信息
          ;(error as any).response.data = {
            success: false,
            message: response.statusText || '请求失败',
            error: {
              code: this.getErrorCodeFromStatus(response.status)
            }
          }
        }
        
        throw error
      }


      
      const data = await response.json()
      
      // 请求成功，返回数据
      
      // 根据文档规范，API响应应使用snake_case格式
      // 如果后端返回的是camelCase，需要转换为snake_case
      if (data && typeof data === 'object') {
        // 验证响应字段命名格式
        const validation = validateFieldNaming(data, 'snake_case')
        if (!validation.isValid && Object.keys(validation.suggestions).length > 0) {
          if (import.meta.env.MODE === 'development') {
            console.warn('⚠️ API响应字段命名不符合规范:', {
              endpoint,
              invalidFields: validation.invalidFields,
              suggestions: validation.suggestions
            })
          }
          
          // 自动转换为规范格式
           const convertedData = convertToApiFormat(data)
           if (import.meta.env.MODE === 'development') {
             console.log('🔄 已自动转换字段格式为snake_case')
           }
           return convertedData as ApiResponse<T>
        }
      }
      
      return data
    } catch (error) {
      if (import.meta.env.MODE === 'development') {
        console.error(`API请求失败 [${config.method || 'GET'} ${url}]:`, error)
      }
      
      // 处理不同类型的错误
      if (error instanceof Error && error.name === 'AbortError') {
        // 超时错误
        handleTimeoutError(error, { showToast: true })
        
        // 重试逻辑现在由智能重试策略管理器处理
        // 直接抛出错误，让重试策略决定是否重试
        
        throw new Error('请求超时')
      } else if (this.isNetworkError(error)) {
        // 网络错误
        handleNetworkError(error, { showToast: true })
        

        
        // 重试逻辑现在由智能重试策略管理器处理
        // 直接抛出错误，让重试策略决定是否重试
        
        throw new Error(`网络连接失败，请检查后端服务是否启动 (${baseURL})`)
      } else {
        // API错误（HTTP状态码错误）
        // 确保错误对象有正确的结构
        const apiError = error as any
        if (apiError.response && apiError.response.data) {
          // 如果后端返回了错误信息，直接使用
          handleApiError(apiError, { showToast: true })
        } else {
          // 如果没有详细错误信息，创建一个标准错误对象
          const standardError = {
            response: {
              status: apiError.response?.status || 500,
              statusText: apiError.response?.statusText || 'Unknown Error',
              data: {
                success: false,
                message: (apiError as Error).message || '请求失败',
                error: {
                  code: this.getErrorCodeFromStatus(apiError.response?.status || 500)
                }
              }
            }
          }
          handleApiError(standardError, { showToast: true })
        }
        throw error
      }
    }
  }


  
  // 判断是否是网络错误
  private isNetworkError(error: any): boolean {
    return (
      (error instanceof TypeError && error.message.includes('Failed to fetch')) ||
      error.name === 'AbortError' ||
      (error.message && error.message.includes('NetworkError'))
    )
  }
  
  // 判断是否应该重试（保留用于未来扩展）
  // private shouldRetry(error: any): boolean {
  //   // 网络连接错误
  //   if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
  //     return true
  //   }
  //   
  //   // 超时错误
  //   if (error.name === 'AbortError') {
  //     return true
  //   }
  //   
  //   // 5xx服务器错误
  //   if (error.status >= 500) {
  //     return true
  //   }
  //   
  //   return false
  // }
  
  // 根据HTTP状态码获取错误码
  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 400: return ErrorType.BAD_REQUEST
      case 401: return ErrorType.UNAUTHORIZED
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


  // GET请求
  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  // POST请求
  async post<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    // 如果data是FormData，直接使用，不要JSON.stringify
    let body: any = undefined
    let headers: Record<string, string> = { ...(config?.headers as Record<string, string> || {}) }
    
    if (data instanceof FormData) {
      body = data
      // FormData会自动设置Content-Type，不要手动设置
      delete headers['Content-Type']
    } else if (data) {
      // 根据后端 schema 定义，直接发送 snake_case 格式的数据
      // 不进行字段转换，保持前端传入的原始格式
      console.log('📤 [API] 发送数据到后端:', {
        endpoint,
        dataKeys: Object.keys(data),
        sampleData: Object.fromEntries(Object.entries(data).slice(0, 3))
      })
      
      body = JSON.stringify(data)
      headers['Content-Type'] = 'application/json'
    }
    
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body,
      headers,
    })
  }

  // PUT请求
  async put<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    let body: any = undefined
    
    if (data) {
      // 根据API接口统一规范文档6.1节，前端发送给后端的数据应使用snake_case格式
      let processedData = data
      if (data && typeof data === 'object') {
        const validation = validateFieldNaming(data, 'snake_case')
        if (!validation.isValid && Object.keys(validation.suggestions).length > 0) {
          console.log('🔄 转换PUT请求数据字段格式为snake_case:', {
            endpoint,
            originalFields: validation.invalidFields,
            suggestions: validation.suggestions
          })
          processedData = convertToApiFormat(data)
        }
      }
      
      console.log('🔍 [PUT请求调试] 原始数据:', data)
      console.log('🔍 [PUT请求调试] 处理后数据:', processedData)
      console.log('🔍 [PUT请求调试] 即将发送的JSON:', JSON.stringify(processedData))
      
      body = JSON.stringify(processedData)
    }
    
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body,
      headers: {
        'Content-Type': 'application/json',
        ...(config?.headers as Record<string, string> || {})
      }
    })
  }

  // DELETE请求
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }

  // 文件上传
  async upload<T>(
    endpoint: string,
    file: File,
    config?: Omit<RequestConfig, 'headers'>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    const headers: Record<string, string> = {}
    
    // 添加认证token
    const token = localStorage.getItem('auth_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
      headers,
    })
  }


}



// 创建API客户端实例
export const apiClient = new ApiClient()

// 健康检查API已移除

// 认证API
export const authApi = {
  // 用户登录
  login: (credentials: { username: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  
  // 用户注册
  register: (userData: {
    username: string
    password: string
    email?: string
    name: string
    phone?: string
  }) => apiClient.post('/auth/register', userData),
  
  // 验证token
  verify: () => apiClient.get('/auth/verify'),
  
  // 刷新token
  refresh: () => apiClient.post('/auth/refresh'),
  
  // 用户登出
  logout: () => apiClient.post('/auth/logout'),
}

// 采购API
export const purchaseApi = {
  // 获取采购列表
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    quality?: string[] | string
    startDate?: string
    endDate?: string
    supplier?: string[]
    product_types?: string[]
    diameter_min?: string
    diameter_max?: string
    specification_min?: string
    specification_max?: string
    quantity_min?: string
    quantity_max?: string
    price_per_gram_min?: string
    price_per_gram_max?: string
    total_price_min?: string
    total_price_max?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) => apiClient.get(`/purchases${buildQueryString(params)}`),
  
  // 创建采购记录
  create: (data: {
    product_name: string
    product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
    unit_type: 'PIECES' | 'STRINGS' | 'SLICES' | 'ITEMS'
    bead_diameter?: number // 散珠和手串使用
    specification?: number // 饰品配件和成品使用
    quantity?: number // 手串数量
    piece_count?: number // 散珠颗数/饰品片数/成品件数
    min_stock_alert?: number
    price_per_gram?: number
    unit_price?: number
    total_price?: number
    weight?: number
    beads_per_string?: number
    total_beads?: number
    price_per_bead?: number
    quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
    supplier_name?: string
    supplier_id?: number
    notes?: string
    natural_language_input?: string
    ai_recognition_result?: any
    photos: string[]
  }) => apiClient.post('/purchases', data),
  
  // 获取单个采购记录
  get: (id: string) => apiClient.get(`/purchases/${id}`),
  
  // 更新采购记录
  update: (id: string, data: any) => apiClient.put(`/purchases/${id}`, data),
  
  // 删除采购记录
  delete: (id: string) => apiClient.delete(`/purchases/${id}`),
}

// 产品API
export const productApi = {
  // 获取产品列表
  list: (params?: {
    page?: number
    limit?: number
    category?: string
    status?: string
    search?: string
  }) => apiClient.get(`/products${buildQueryString(params)}`),
  
  // 创建产品记录
  create: (data: {
    name: string
    description?: string
    category?: string
    quantity: number
    unit: string
    unit_price: number
    location?: string
    notes?: string
  }) => apiClient.post('/products', data),
  
  // 获取单个产品记录
  get: (id: string) => apiClient.get(`/products/${id}`),
  
  // 更新产品记录
  update: (id: string, data: any) => apiClient.put(`/products/${id}`, data),
  
  // 删除产品记录
  delete: (id: string) => apiClient.delete(`/products/${id}`),
}

// 库存API
export const inventoryApi = {
  // 获取层级式库存列表（按产品类型分类：产品类型→规格→品相）
  list_hierarchical: (params?: {
    page?: number
    limit?: number
    search?: string
    product_types?: string[] // 产品类型筛选（多选）
    quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
    low_stock_only?: boolean
    diameter_min?: string // 珠子直径范围
    diameter_max?: string
    specification_min?: string // 规格范围
    specification_max?: string
    sort?: 'asc' | 'desc'
    sort_by?: 'product_type' | 'total_quantity'
  }) => apiClient.get(`/inventory/hierarchical${buildQueryString(params)}`),

  // 获取分组库存列表（按产品名称分组）
  list_grouped: (params?: {
    page?: number
    limit?: number
    search?: string
    product_types?: string[] // 产品类型筛选（多选）
    quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
    low_stock_only?: boolean
    sort?: 'asc' | 'desc'
    sort_by?: 'product_name' | 'total_remaining_quantity' | 'product_type'
  }) => apiClient.get(`/inventory/grouped${buildQueryString(params)}`),
  
  // 获取库存列表（原有接口保持兼容）
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
    low_stock_only?: boolean
    min_stock?: number
    max_stock?: number
    sort?: 'asc' | 'desc'
    sort_by?: 'purchase_date' | 'created_at' | 'remaining_beads' | 'product_name'
  }) => apiClient.get(`/inventory${buildQueryString(params)}`),
  
  // 库存搜索
  search: (query: string, limit?: number) => 
    apiClient.get(`/inventory/search?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ''}`),
  
  // 获取库存详情
  get: (purchaseId: string) => apiClient.get(`/inventory/${purchaseId}`),
  
  // 获取低库存预警
  getLowStockAlerts: () => apiClient.get('/inventory/alerts/low-stock'),
  
  // 导出库存数据
  export: () => apiClient.get('/inventory/export/excel'),
  
  // 获取成品卡片数据（专用于成品展示）
  getFinishedProducts: (params?: {
    page?: number
    limit?: number
    search?: string
    quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
    low_stock_only?: boolean
    specification_min?: string
    specification_max?: string
    sort?: 'asc' | 'desc'
    sort_by?: 'purchase_date' | 'product_name' | 'specification' | 'remaining_quantity'
  }) => apiClient.get(`/inventory/finished-products-cards${buildQueryString(params)}`),

  // 获取库存统计数据（仪表盘）
  getStatistics: () => apiClient.get('/inventory/statistics'),
  
  // 获取产品分布数据（饼图）
  getProductDistribution: (params?: {
    product_type?: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
    limit?: number
  }) => apiClient.get(`/inventory/product-distribution${buildQueryString(params)}`),
  
  // 获取库存消耗分析数据
  getConsumptionAnalysis: (params?: {
    time_range?: '7d' | '30d' | '90d' | '6m' | '1y' | 'all'
    limit?: number
  }) => apiClient.get(`/inventory/consumption-analysis${buildQueryString(params)}`),
  
  // 获取产品价格分布数据
  getPriceDistribution: (params?: {
    product_type?: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED' | 'ALL'
    price_type?: 'unit_price' | 'total_price'
    limit?: number
  }) => apiClient.get(`/inventory/price-distribution${buildQueryString(params)}`),
}

// 供应商API
export const supplierApi = {
  // 获取供应商列表
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    active?: boolean
  }): Promise<ApiResponse<import('../types').SupplierListResponse>> => apiClient.get(`/suppliers${buildQueryString(params)}`),
  
  // 获取所有活跃供应商（用于下拉框）
  getAll: () => {
    if (import.meta.env.MODE === 'development') {
      console.log('🔍 [供应商API] 发送请求:', {
        url: '/suppliers?limit=1000',
        method: 'GET',
        timestamp: new Date().toISOString()
      })
    }
    
    return apiClient.get('/suppliers?limit=1000').then(response => {
      if (import.meta.env.MODE === 'development') {
        console.log('📥 [供应商API] 收到响应:', {
          success: response.success,
          data_length: Array.isArray(response.data) ? response.data.length : 0,
          total_count: (response as any).total || 0,
          data: response.data,
          full_response: response,
          timestamp: new Date().toISOString()
        })
      }
      return response
    }).catch(error => {
      if (import.meta.env.MODE === 'development') {
        console.error('❌ [供应商API] 请求失败:', {
          error,
          timestamp: new Date().toISOString()
        })
      }
      throw error
    })
  },
  
  // 获取供应商统计
  stats: () => apiClient.get('/suppliers/stats'),
  
  // 创建供应商
  create: (data: {
    name: string
    contact?: string
    phone?: string
    email?: string
    address?: string
    description?: string
  }) => apiClient.post('/suppliers', data),
  
  // 更新供应商
  update: (id: string, data: any) => apiClient.put(`/suppliers/${id}`, data),
  
  // 调试端点：获取数据库供应商统计
  debug_count: (): Promise<ApiResponse<import('../types').SupplierDebugStats>> => apiClient.get('/suppliers/debug/count'),
}

// 用户管理API
export const userApi = {
  // 获取用户列表
  list: (params?: {
    page?: number
    limit?: number
    role?: string
    active?: boolean
  }) => apiClient.get(`/users${buildQueryString(params)}`),
  
  // 获取用户资料
  profile: () => apiClient.get('/users/profile'),
  
  // 更新用户资料
  updateProfile: (data: any) => apiClient.put('/users/profile', data),
  
  // 创建用户
  create: (data: {
    username: string
    password: string
    email?: string
    name: string
    phone?: string
    role: string
  }) => apiClient.post('/users', data),
  
  // 更新用户
  update: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
  
  // 删除用户
  delete: (id: string) => apiClient.delete(`/users/${id}`),
}

// AI服务API
export const aiApi = {
  // 健康检查已移除
  
  // 获取AI配置
  config: () => apiClient.get('/ai/config'),
  
  // 解析水晶采购描述
  parse_crystal_purchase: (description: string) =>
    apiClient.post('/ai/parse-crystal-purchase', { description }),
  
  // 解析采购描述（保持向后兼容）
  parse_purchase: (description: string) =>
    apiClient.post('/ai/parse-description', { description }),
}

// 智能助理API
export const assistantApi = {
  // 智能助理对话
  chat: (message: string, context?: any) =>
    apiClient.post('/assistant/chat', { message, context }),
  
  // 获取业务洞察
  insights: () => apiClient.get('/assistant/insights'),
}

// 文件上传API
export const uploadApi = {
  // 上传采购图片
  upload_purchase_images: (formData: FormData) => {
    if (import.meta.env.MODE === 'development') {
      console.log('upload_purchase_images调用:', {
        formData,
        hasFiles: formData.has('images'),
        token: localStorage.getItem('auth_token') ? '有token' : '无token'
      })
    }
    
    return apiClient.post('/upload/purchase-images', formData)
  },
  
  // 删除采购图片
  deletePurchaseImages: (urls: string[]) =>
    apiClient.delete('/upload/purchase-images', {
      body: JSON.stringify({ urls }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
    }),
  
  // 上传单个文件
  single: (file: File) => apiClient.upload('/upload/single', file),
  
  // 上传多个文件
  multiple: (files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append(`files`, file)
    })
    
    return apiClient.post('/upload/multiple', formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
    })
  },
}

// 仪表板API
export const dashboardApi = {
  // 获取仪表板数据
  getData: () => apiClient.get('/dashboard'),
}

// 成品制作API
export const finishedProductApi = {
  // 获取可用原材料列表
  getMaterials: (params?: {
    search?: string
    product_types?: string[]
    available_only?: boolean
    min_quantity?: number
  }) => apiClient.get(`/finished-products/materials${buildQueryString(params)}`),
  
  // 计算制作成本预估
  calculateCost: (data: {
    materials: {
      purchase_id: string
      quantity_used_beads?: number
      quantity_used_pieces?: number
    }[]
    labor_cost?: number
    craft_cost?: number
    profit_margin?: number
  }) => apiClient.post('/finished-products/cost', data),
  
  // 创建销售成品
  create: (data: {
    product_name: string
    description?: string
    specification?: string
    materials: {
      purchase_id: string
      quantity_used_beads?: number
      quantity_used_pieces?: number
    }[]
    labor_cost?: number
    craft_cost?: number
    selling_price: number
    profit_margin?: number
    photos?: string[]
  }) => apiClient.post('/finished-products', data),
  
  // 获取销售成品列表
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    status?: 'MAKING' | 'AVAILABLE' | 'SOLD' | 'OFFLINE'
    created_by?: string
    start_date?: string
    end_date?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }) => apiClient.get(`/finished-products${buildQueryString(params)}`),
  
  // 获取单个销售成品详情
  get: (id: string) => apiClient.get(`/finished-products/${id}`),
  
  // 更新销售成品信息
  update: (id: string, data: {
    product_name?: string
    description?: string
    specification?: string
    selling_price?: number
    status?: 'MAKING' | 'AVAILABLE' | 'SOLD' | 'OFFLINE'
    photos?: string[]
  }) => apiClient.put(`/finished-products/${id}`, data),
  
  // 删除销售成品
  delete: (id: string) => apiClient.delete(`/finished-products/${id}`),
  
  // 标记成品已售出
  markAsSold: (id: string, data?: {
    sold_price?: number
    sold_date?: string
    buyer_info?: string
  }) => apiClient.put(`/finished-products/${id}/sold`, data),

  // 批量创建销售成品（直接转化模式）
  batchCreate: (data: {
    products: {
      material_id: string
      product_name: string
      description?: string
      specification?: string
      labor_cost: number
      craft_cost: number
      selling_price: number
      photos?: string[]
    }[]
  }) => apiClient.post('/finished-products/batch', data),
}

// 导出getApiUrl函数
export { getApiUrl }

// 导出默认API客户端
export default apiClient