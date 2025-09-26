// API服务配置和请求处理
import { ApiResponse } from '../types'
// 移除fieldConverter导入，前后端统一使用snake_case



import { handleApiError, handleNetworkError, handleTimeoutError, ErrorType } from './errorHandler'



// 动态获取本机局域网IP地址（增强版）
const get_local_network_ip = (): Promise<string | null> => {
  return new Promise((resolve) => {
    // 尝试通过WebRTC获取本机IP
    const pc = new RTCPeerConnection({ 
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // 添加STUN服务器提高成功率
    })
    pc.createDataChannel('')
    
    let resolved = false
    
    pc.onicecandidate = (event) => {
      if (event.candidate && !resolved) {
        const candidate = event.candidate.candidate
        console.log('🔍 [IP检测] ICE候选:', candidate)
        
        const ipMatch = candidate.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/)
        if (ipMatch && ipMatch[1]) {
          const ip = ipMatch[1]
          console.log('🔍 [IP检测] 发现IP:', ip)
          
          // 只返回局域网IP，排除回环地址
          if ((ip.startsWith('192.168.') || ip.startsWith('10.') || 
              (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) &&
              !ip.startsWith('127.')) {
            console.log('✅ [IP检测] 检测到有效局域网IP:', ip)
            resolved = true
            pc.close()
            resolve(ip)
            return
          }
        }
      }
    }
    
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer)
      console.log('🔍 [IP检测] WebRTC连接已建立，等待ICE候选...')
    }).catch(error => {
      console.warn('⚠️ [IP检测] WebRTC连接失败:', error)
      pc.close()
      resolve(null)
    })
    
    // 增加超时时间，给WebRTC更多时间
    setTimeout(() => {
      if (!resolved) {
        console.warn('⚠️ [IP检测] WebRTC超时，未检测到局域网IP')
        pc.close()
        resolve(null)
      }
    }, 5000) // 增加到5秒
  })
}

// 缓存本机IP地址
let cachedLocalIP: string | null = null

// 异步获取并缓存本机IP
const detectAndCacheLocalIP = async (): Promise<string | null> => {
  if (cachedLocalIP) {
    return cachedLocalIP
  }
  
  try {
    const ip = await get_local_network_ip()
    if (ip) {
      cachedLocalIP = ip
      localStorage.setItem('cached_local_ip', ip)
      console.log(`🌐 检测到本机局域网IP: ${ip}`)
    }
    return ip
  } catch (error) {
    console.error('❌ [IP检测] 获取IP失败:', error)
    return null
  }
}

// 修复图片URL协议问题和IP地址更新（增强版）
export const fixImageUrl = (url: string): string => {
  // 类型检查：确保url是字符串类型
  if (!url || typeof url !== 'string') return url || ''
  
  // 如果是相对路径，转换为完整URL
  if (!url.startsWith('http')) {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      // const port = window.location.port
      const protocol = window.location.protocol
      
      // 构建后端服务器地址
      let backendUrl
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        backendUrl = 'http://localhost:3001'
      } else {
        backendUrl = `${protocol}//${hostname}:3001`
      }
      
      const fullUrl = `${backendUrl}${url}`
      console.log(`🔄 相对路径转换为完整URL: ${url} -> ${fullUrl}`)
      return fullUrl
    }
    return url
  }
  
  // 获取当前主机名
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  
  // 处理生产环境域名在本地开发时的转换
  if (url.includes('api.dorblecapital.com')) {
    // 在开发环境中，绝对不使用公域URL
    if (import.meta.env.MODE === 'development' || import.meta.env.DEV) {
      // 优先使用缓存的局域网IP
      const cachedIP = localStorage.getItem('cached_local_ip')
      
      if (cachedIP && cachedIP !== 'localhost' && cachedIP !== '127.0.0.1') {
        const newUrl = url.replace(/https?:\/\/api\.dorblecapital\.com/g, `http://${cachedIP}:3001`)
        console.log(`🔄 [开发环境] 生产环境图片URL已转换为局域网: ${url} -> ${newUrl}`)
        return newUrl
      }
      // 如果当前是局域网IP，直接使用
      else if (currentHostname.startsWith('192.168.') || currentHostname.startsWith('10.') || 
               (currentHostname.startsWith('172.') && parseInt(currentHostname.split('.')[1]) >= 16 && parseInt(currentHostname.split('.')[1]) <= 31)) {
        const newUrl = url.replace(/https?:\/\/api\.dorblecapital\.com/g, `http://${currentHostname}:3001`)
        console.log(`🔄 [开发环境] 生产环境图片URL已转换为局域网: ${url} -> ${newUrl}`)
        return newUrl
      }
      // 最后才使用localhost（手机无法访问）
      else {
        const newUrl = url.replace(/https?:\/\/api\.dorblecapital\.com/g, 'http://localhost:3001')
        console.log(`⚠️ [开发环境] 使用localhost（手机无法访问）: ${url} -> ${newUrl}`)
        return newUrl
      }
    }
  }
  
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
        console.log(`🔄 图片URL已更新为当前局域网IP: ${url} -> ${newUrl}`)
        return newUrl
      }
      // 如果当前是localhost，优先使用缓存的局域网IP
      else if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
        const cachedIP = localStorage.getItem('cached_local_ip')
        if (cachedIP && cachedIP !== urlIP && cachedIP !== 'localhost' && cachedIP !== '127.0.0.1') {
          const newUrl = url.replace(new RegExp(`https?://${urlIP.replace(/\./g, '\\.')}:3001`, 'g'), `http://${cachedIP}:3001`)
          console.log(`🔄 图片URL已更新为缓存的局域网IP: ${url} -> ${newUrl}`)
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

// 添加全局调试函数
if (typeof window !== 'undefined' && import.meta.env.MODE === 'development') {
  (window as any).debugAPI = {
    // 重新检测IP
    async refreshIP() {
      console.log('🔄 重新检测IP地址...')
      cachedLocalIP = null
      localStorage.removeItem('cached_local_ip')
      const newIP = await detectAndCacheLocalIP()
      console.log('✅ IP检测完成:', newIP)
      if (newIP) {
        console.log('💡 建议刷新页面以使用新的IP地址')
      }
      return newIP
    },
    
    // 清除所有缓存
    clearCache() {
      console.log('🧹 清除API缓存...')
      cachedLocalIP = null
      localStorage.removeItem('cached_local_ip')
      console.log('✅ 缓存已清除')
    },
    
    // 获取当前API地址
    get_current_api_url() {
      const url = get_api_url()
      console.log('🔧 当前API地址:', url)
      return url
    },
    
    // 测试API连接
    async testConnection() {
      const apiUrl = get_api_url()
      const test_url = `${apiUrl}/health`
      console.log('🚀 测试API连接:', test_url)
      
      try {
        const response = await fetch(test_url)
        if (response.ok) {
          const data = await response.json()
          console.log('✅ API连接成功:', data)
          return { success: true, data }
        } else {
          console.log('❌ API连接失败:', response.status, response.statusText)
          return { success: false, status: response.status, statusText: response.statusText }
        }
      } catch (error: any) {
        console.log('❌ API连接错误:', error?.message || error)
        return { success: false, error: error?.message || String(error) }
      }
    }
  }
  
  console.log('🔧 调试工具已加载，可用命令:')
  console.log('  debugAPI.refreshIP() - 重新检测IP')
  console.log('  debugAPI.clearCache() - 清除缓存')
  console.log('  debugAPI.get_current_api_url() - 获取当前API地址')
  console.log('  debugAPI.testConnection() - 测试API连接')
}









// 简化的API基础URL获取（增强调试版本）
const get_api_url = (): string => {
  // 1. 优先使用环境变量配置
  const envApiUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window as any).__VITE_API_URL__)
  if (envApiUrl && envApiUrl.trim() !== '') {
    const apiUrl = envApiUrl.endsWith('/api/v1') ? envApiUrl : `${envApiUrl}/api/v1`
    if (import.meta.env.MODE === 'development') {
      console.log('🔧 [API_URL] 使用环境变量配置:', apiUrl)
    }
    return apiUrl
  }
  
  // 2. 根据当前环境动态构建API地址
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const cachedIP = localStorage.getItem('cached_local_ip')
    
    if (import.meta.env.MODE === 'development') {
      console.log('🔧 [API_URL] 当前主机名:', hostname)
      console.log('🔧 [API_URL] 缓存的IP:', cachedIP)
    }
    
    // 如果是公网域名，使用公网API
    if (hostname.includes('dorblecapital.com')) {
      const apiUrl = 'https://api.dorblecapital.com/api/v1'
      if (import.meta.env.MODE === 'development') {
        console.log('🔧 [API_URL] 使用公网域名:', apiUrl)
      }
      return apiUrl
    }
    
    // 如果是局域网IP，动态构建局域网API地址
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || 
        (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31)) {
      const apiUrl = `http://${hostname}:3001/api/v1`
      if (import.meta.env.MODE === 'development') {
        console.log('🔧 [API_URL] 使用局域网IP:', apiUrl)
      }
      return apiUrl
    }
    
    // localhost情况 - 强制使用localhost修复连接问题
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // 在开发环境中，强制使用localhost，忽略缓存的IP
      const apiUrl = `http://localhost:3001/api/v1`
      if (import.meta.env.MODE === 'development') {
        console.log('🔧 [API_URL] 强制使用localhost修复连接问题:', apiUrl)
        // 强制清除所有可能导致问题的缓存IP
        localStorage.removeItem('cached_local_ip')
        localStorage.removeItem('api_base_url')
        console.log('🧹 [API_URL] 已清除所有缓存的IP和URL')
      }
      return apiUrl
    }
    
    // 其他情况，本地开发环境使用HTTP
    const apiUrl = `http://${hostname}:3001/api/v1`
    if (import.meta.env.MODE === 'development') {
      console.log('🔧 [API_URL] 使用其他主机名:', apiUrl)
    }
    return apiUrl
  }
  
  // 服务端渲染时的默认值
  const apiUrl = 'http://localhost:3001/api/v1'
  if (import.meta.env.MODE === 'development') {
    console.log('🔧 [API_URL] 服务端渲染默认值:', apiUrl)
  }
  return apiUrl
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
  
  const search_params = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      // 处理数组参数
      if (Array.isArray(value)) {
        // 过滤掉空字符串和undefined，保留null值但转换为特殊标识
        const filtered_array = value
          .filter(item => item !== undefined && item !== '')
          .map(item => item === null ? 'null' : String(item))
        
        // 为每个数组元素添加单独的参数
        filtered_array.forEach(item => {
          search_params.append(key, item)
        })
      } else if (value !== null) {
        search_params.append(key, String(value))
      }
    }
  })
  
  const queryString = search_params.toString()
  return queryString ? `?${queryString}` : ''
}

// 创建请求实例
class ApiClient {
  // private defaultTimeout: number // 暂时注释掉未使用的属性

  constructor() {
    // this.defaultTimeout = API_CONFIG.timeout // 暂时注释掉
  }

  // 通用请求方法（带重试机制和智能错误处理）
  private async request<T>(
      endpoint: string,
      config: RequestConfig = {},
      // retry_count: number = 0 // 暂时注释掉未使用的参数
    ): Promise<ApiResponse<T>> {
      // const baseURL = get_api_url() // 暂时注释掉未使用的变量
      // const url = `${baseURL}${endpoint}` // 暂时注释掉未使用的变量
      
      return this.executeRequest<T>(endpoint, config)
    }
    
    private async executeRequest<T>(
      endpoint: string,
      config: RequestConfig = {}
    ): Promise<ApiResponse<T>> {
      // 获取基础配置
      const baseURL = get_api_url()
      const url = `${baseURL}${endpoint}`
    // 移除缓存相关代码
    
    // 只在开发环境中显示详细的API请求日志
    if (import.meta.env.MODE === 'development') {
      console.log('🚀 发起API请求:', {
        endpoint,
        fullUrl: url,
        method: config.method || 'GET',
        timestamp: new Date().toLocaleString(),
        hostname: window.location.hostname,
        cachedIP: localStorage.getItem('cached_local_ip')
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
      const timeout_id = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...config,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeout_id)

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
        } catch (parse_error) {
          // 如果无法解析响应体，使用默认错误信息
          ;(error as any).response.data = {
            success: false,
            message: response.statusText || '请求失败',
            error: {
              code: this.get_error_code_from_status(response.status)
            }
          }
        }
        
        throw error
      }


      
      const data = await response.json()
      
      // 请求成功，返回数据
      
      // 前后端统一使用snake_case，无需转换
      if (import.meta.env.MODE === 'development') {
        console.log('📥 [API] 接收到响应数据:', {
          endpoint: url,
          dataKeys: data && typeof data === 'object' ? Object.keys(data).slice(0, 10) : 'non-object'
        })
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
                  code: this.get_error_code_from_status(apiError.response?.status || 500)
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
      // 前后端统一使用snake_case，直接发送数据无需转换
      console.log('📤 [PUT] 发送数据到后端:', {
        endpoint,
        dataKeys: Object.keys(data),
        sampleData: Object.fromEntries(Object.entries(data).slice(0, 3))
      })
      
      body = JSON.stringify(data)
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
export const auth_api = {
  // 用户登录
  login: (credentials: { user_name: string; password: string }) =>
    apiClient.post('/auth/login', {
      user_name: credentials.user_name,
      password: credentials.password
    }),
  
  // 用户注册
  register: (userData: {
    user_name: string
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
export const purchase_api = {
  // 获取采购列表
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    quality?: string[] | string
    purchase_date_start?: string
    purchase_date_end?: string
    supplier?: string[]
    purchase_types?: string[]
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
    sort_by?: string
    sort?: 'asc' | 'desc'
  }) => apiClient.get(`/purchases${buildQueryString(params)}`),
  
  // 创建采购记录
  create: (data: {
    purchase_name: string
    purchase_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL'
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

// 材料API
export const material_api = {
  // 获取材料列表
  list: (params?: {
    page?: number
    limit?: number
    item_category?: string
    status?: string
    search?: string
  }) => apiClient.get(`/materials${buildQueryString(params)}`),
  
  // 创建材料记录
  create: (data: {
    name: string
    description?: string
    item_category?: string
    quantity: number
    unit: string
    unit_price: number
    location?: string
    notes?: string
  }) => apiClient.post('/materials', data),
  
  // 获取单个材料记录
  get: (id: string) => apiClient.get(`/materials/${id}`),
  
  // 更新材料记录
  update: (id: string, data: any) => apiClient.put(`/materials/${id}`, data),
  
  // 删除材料记录
  delete: (id: string) => apiClient.delete(`/materials/${id}`),
  
  // 获取原材料价格分布数据
  get_price_distribution: (params?: {
    material_type?: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL' | 'ALL' // 原材料类型
    price_type?: 'unit_price' | 'total_price'
    limit?: number
  }) => apiClient.get(`/materials/price-distribution${buildQueryString(params)}`)
}

// 库存API
export const inventory_api = {
  // 获取层级式库存列表（按材料类型分类：材料类型→规格→品相）
  list_hierarchical: (params?: {
    page?: number
    limit?: number
    search?: string
    material_types?: string[] // 原材料类型筛选（多选）
    quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
    low_stock_only?: boolean
    diameter_min?: string // 珠子直径范围
    diameter_max?: string
    specification_min?: string // 规格范围
    specification_max?: string
    sort?: 'asc' | 'desc'
    sort_by?: 'material_type' | 'total_quantity' // 按原材料类型排序
  }) => apiClient.get(`/inventory/hierarchical${buildQueryString(params)}`),

  // 获取分组库存列表（按原材料名称分组）
  list_grouped: (params?: {
    page?: number
    limit?: number
    search?: string
    material_types?: string[] // 原材料类型筛选（多选）
    quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
    low_stock_only?: boolean
    sort?: 'asc' | 'desc'
    sort_by?: 'material_name' | 'total_remaining_quantity' | 'material_type' // 按原材料名称和类型排序
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
    sort_by?: 'material_date' | 'created_at' | 'remaining_quantity' | 'material_name' // 按原材料名称排序
  }) => apiClient.get(`/inventory${buildQueryString(params)}`),
  
  // 库存搜索
  search: (query: string, limit?: number) => 
    apiClient.get(`/inventory/search?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ''}`),
  
  // 获取库存详情
  get: (purchase_id: string) => apiClient.get(`/inventory/${purchase_id}`),
  
  // 获取低库存预警
  get_low_stock_alerts: () => apiClient.get('/inventory/alerts/low-stock'),
  
  // 导出库存数据
  export: () => apiClient.get('/inventory/export/excel'),
  
  // 获取成品卡片数据（专用于成品展示）
  get_finished_products: (params?: {
    page?: number
    limit?: number
    search?: string
    quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
    low_stock_only?: boolean
    specification_min?: string
    specification_max?: string
    sort?: 'asc' | 'desc'
    sort_by?: 'material_date' | 'material_name' | 'specification' | 'remaining_quantity' // 按原材料名称排序
  }) => apiClient.get(`/inventory/finished-products-cards${buildQueryString(params)}`),

  // 获取库存统计数据（仪表盘）
  get_statistics: () => apiClient.get('/inventory/statistics'),
  
  // 获取原材料分布数据（饼图）
  get_material_distribution: (params?: {
    purchase_type?: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL' // 原材料类型（后端使用purchase_type）
    limit?: number
  }) => apiClient.get(`/inventory/material-distribution${buildQueryString(params)}`),
  
  // 获取库存消耗分析数据
  get_consumption_analysis: (params?: {
    time_range?: '7d' | '30d' | '90d' | '6m' | '1y' | 'all'
    limit?: number
  }) => apiClient.get(`/inventory/consumption-analysis${buildQueryString(params)}`),

  // 获取价格分布数据
  get_price_distribution: (params?: {
    material_type?: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL' | 'ALL'
    price_type?: 'unit_price' | 'total_price'
    limit?: number
  }) => apiClient.get(`/inventory/price-distribution${buildQueryString(params)}`)

}

// 供应商API
export const supplier_api = {
  // 获取供应商列表
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    active?: boolean
  }): Promise<ApiResponse<import('../types').SupplierListResponse>> => apiClient.get(`/suppliers${buildQueryString(params)}`),
  
  // 获取所有活跃供应商（用于下拉框）
  get_all: () => {
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
          dataLength: Array.isArray(response.data) ? response.data.length : 0,
          total_count: (response as any).total || 0,
          data: response.data,
          fullResponse: response,
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
export const user_api = {
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
  update_profile: (data: any) => apiClient.put('/users/profile', data),
  
  // 创建用户
  create: (data: {
    user_name: string
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
export const ai_api = {
  // 健康检查已移除
  
  // 获取AI配置
  config: () => apiClient.get('/ai/config'),
  
  // 解析水晶采购描述
  parseCrystalPurchase: (description: string) =>
    apiClient.post('/ai/parse-crystal-purchase', { description }),
  
  // 解析采购描述（保持向后兼容）
  parsePurchase: (description: string) =>
    apiClient.post('/ai/parse-description', { description }),
}

// 智能助理API
export const assistant_api = {
  // 智能助理对话
  chat: (message: string, context?: any) =>
    apiClient.post('/assistant/chat', { message, context }),
  
  // 获取业务洞察
  insights: () => apiClient.get('/assistant/insights'),
}

// 文件上传API
export const upload_api = {
  // 上传采购图片
  uploadPurchaseImages: (formData: FormData) => {
    if (import.meta.env.MODE === 'development') {
      console.log('uploadPurchaseImages调用:', {
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
export const dashboard_api = {
  // 获取仪表板数据
  get_data: () => apiClient.get('/dashboard'),
}

// SKU成品制作API
export const finished_product_api = {
  // 获取可用原材料列表
  get_materials: (params?: {
    search?: string
    material_types?: string[] // 修复：使用material_types参数名
    stock_status?: string[] // 库存状态筛选
    supplier_id?: string[]
    available_only?: boolean
    min_quantity?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }) => {
    // 转换参数以匹配materials接口
    const materialParams: any = {}
    if (params?.search) materialParams.search = params.search
    if (params?.material_types) materialParams.material_types = params.material_types // 修复：使用正确的参数名
    if (params?.stock_status) materialParams.stock_status = params.stock_status
    if (params?.supplier_id) materialParams.supplier_id = params.supplier_id
    if (params?.sort_by) materialParams.sort_by = params.sort_by
    if (params?.sort_order) materialParams.sort_order = params.sort_order
    
    // 如果只要有库存的，添加库存状态筛选
    if (params?.available_only) {
      materialParams.available_only = 'true'
    }
    
    // 调用正确的API路径（后端路由在products.ts中的/materials）
    return apiClient.get(`/finished-products/materials${buildQueryString(materialParams)}`);
  },
  
  // 计算制作成本预估
  calculate_cost: (data: {
    materials: {
      material_id: string
      quantity_used_beads?: number
      quantity_used_pieces?: number
    }[]
    labor_cost?: number
    craft_cost?: number
    profit_margin?: number
  }) => apiClient.post('/finished-products/cost', data),
  
  // 创建成品原材料（注意：这里创建的仍然是原材料material，不是最终产品）
  create: (data: {
    sku_name: string // SKU成品名称
    description?: string
    specification?: string
    materials: {
      material_id: string
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
  
  // 更新成品原材料信息
  update: (id: string, data: {
    sku_name?: string // SKU成品名称
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

  // 批量创建成品原材料（直接转化模式）
  batchCreate: (data: {
    products: {
      material_id: string
      sku_name: string // SKU成品名称
      description?: string
      specification?: string | number
      labor_cost: number
      craft_cost: number
      selling_price: number
      photos?: string[]
    }[]
  }) => apiClient.post('/finished-products/batch', data),
}

// SKU管理API
export const sku_api = {
  // 获取SKU列表
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    status?: ('ACTIVE' | 'INACTIVE')[]
    price_min?: number
    price_max?: number
    profit_margin_min?: number
    profit_margin_max?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }) => apiClient.get(`/skus${buildQueryString(params)}`),
  
  // 获取SKU详情
  get: (id: string) => apiClient.get(`/skus/${id}`),
  
  // 销售SKU
  sell: (id: string, data: {
    quantity: number
    customer_name: string
    customer_phone: string
    customerAddress?: string
    sale_channel?: string
    notes?: string
    actual_total_price?: number
  }) => apiClient.post(`/skus/${id}/sell`, data),
  
  // 销毁SKU
  destroy: (id: string, data: {
    quantity: number
    reason: string
    return_to_material: boolean
    selected_materials?: string[]
    custom_return_quantities?: Record<string, number>
  }) => apiClient.delete(`/skus/${id}/destroy`, { 
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  }),
  
  // 调整SKU库存
  adjust: (id: string, data: {
    type: 'increase' | 'decrease'
    quantity: number
    reason: string
    costAdjustment?: number
  }) => apiClient.post(`/skus/${id}/adjust`, data),
  
  // 获取SKU库存变更历史
  get_history: (id: string, params?: {
    page?: number
    limit?: number
    type?: string
    operator?: string
    date_range?: string
  }) => apiClient.get(`/skus/${id}/history${buildQueryString(params)}`),
  
  // 获取SKU溯源信息（制作配方）
  get_traces: (id: string) => apiClient.get(`/skus/${id}/traces`),
  
  // 获取SKU原材料信息
  get_materials: (id: string) => apiClient.get(`/skus/${id}/materials`),
  
  // 获取SKU统计信息
  get_stats: () => apiClient.get('/skus/stats/overview'),
  
  // 批量操作
  batchUpdate: (data: {
    skuIds: string[]
    operation: 'activate' | 'deactivate' | 'delete'
  }) => apiClient.post('/skus/batch', data),
  
  // SKU调控（价格调整和状态管理）
  control: (id: string, data: {
    type: 'price' | 'status'
    newPrice?: number
    newStatus?: 'ACTIVE' | 'INACTIVE'
    reason: string
  }) => {
    // 将前端参数格式转换为后端期望的格式
    const backendData: any = {};
    
    if (data.type === 'price' && data.newPrice !== undefined) {
      backendData.selling_price = data.newPrice;
      backendData.reason = data.reason; // 调价原因
    }
    
    if (data.type === 'status' && data.newStatus !== undefined) {
      backendData.status = data.newStatus;
      backendData.status_reason = data.reason; // 状态变更原因
    }
    
    console.log('🔍 [SKU控制] 发送到后端的数据:', backendData);
    return apiClient.put(`/skus/${id}/control`, backendData);
  },
  
  // SKU退货
  refund: (id: string, data: {
    quantity: number
    reason: string
    refund_amount?: number
    notes?: string
  }) => apiClient.post(`/skus/${id}/refund`, data),
}

// 财务管理API
export const financial_api = {
  // 获取财务记录列表
  get_records: (params?: {
    page?: number
    limit?: number
    record_type?: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS'
    reference_type?: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL'
    start_date?: string
    end_date?: string
    item_category?: string
    search?: string
    sort?: 'asc' | 'desc'
    sort_by?: string
  }) => apiClient.get(`/financial/records${buildQueryString(params)}`),
  
  // 创建财务记录
  createRecord: (data: {
    record_type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS'
    amount: number
    description: string
    reference_type: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL'
    reference_id?: string
    item_category?: string
    transaction_date: string
    notes?: string
  }) => apiClient.post('/financial/records', data),
  
  // 更新财务记录
  updateRecord: (id: string, data: {
    record_type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS'
    amount: number
    description: string
    reference_type: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL'
    reference_id?: string
    item_category?: string
    transaction_date: string
    notes?: string
  }) => apiClient.put(`/financial/records/${id}`, data),
  
  // 删除财务记录
  deleteRecord: (id: string) => apiClient.delete(`/financial/records/${id}`),
  
  // 获取财务概览
  get_overview: () => apiClient.get('/financial/overview/summary'),
  
  // 获取财务统计数据
  get_statistics: (params?: {
    period?: 'daily' | 'monthly'
    start_date?: string
    end_date?: string
  }) => apiClient.get(`/financial/statistics${buildQueryString(params)}`),
  
  // 创建退货财务记录（供客户管理模块调用）
  createRefundRecord: (data: {
    refund_amount: number
    loss_amount?: number
    customer_name?: string
    reference_id?: string
  }) => apiClient.post('/financial/records/refund', data),
  
  // 获取流水账记录
  get_transactions: (params?: {
    page?: number
    limit?: number
    type?: 'income' | 'expense' | 'all'
    start_date?: string
    end_date?: string
    search?: string
  }) => apiClient.get(`/financial/transactions${buildQueryString(params)}`),
  
  // 获取库存状况统计
  get_inventory_status: (params?: {
    stale_period?: '1' | '3' | '6' // 滞销时间：1个月、3个月、6个月
  }) => apiClient.get(`/financial/inventory/status${buildQueryString(params)}`),
}

// 客户管理API
export const customer_api = {
  // 获取客户列表
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    customer_type?: string
    customer_type_filter?: string
    sort?: 'asc' | 'desc'
    sort_by?: string
    // 新增筛选参数
    customer_code_search?: string
    name_search?: string
    phone_search?: string
    city_filter?: string
    total_orders_min?: string
    total_orders_max?: string
    total_all_orders_min?: string
    total_all_orders_max?: string
    total_purchases_min?: string
    total_purchases_max?: string
    first_purchase_start?: string
    first_purchase_end?: string
    last_purchase_start?: string
    last_purchase_end?: string
    getCityStats?: boolean
  }) => apiClient.get(`/customers${buildQueryString(params)}`),
  
  // 获取客户详情
  get: (id: string) => apiClient.get(`/customers/${id}`),
  
  // 创建客户
  create: (data: {
    name: string
    phone: string
    address?: string
    wechat?: string
    birthday?: string
    notes?: string
  }) => apiClient.post('/customers', data),
  
  // 更新客户信息
  update: (id: string, data: {
    name?: string
    phone?: string
    address?: string
    wechat?: string
    birthday?: string
  }) => apiClient.put(`/customers/${id}`, data),
  
  // 删除客户
  delete: (id: string) => apiClient.delete(`/customers/${id}`),
  
  // 获取客户购买记录
  get_purchases: (id: string, params?: {
    page?: number
    limit?: number
    start_date?: string
    end_date?: string
  }) => apiClient.get(`/customers/${id}/purchases${buildQueryString(params)}`),
  
  // 为客户添加购买记录（反向销售录入）
  addPurchase: (id: string, data: { sku_id: string
    quantity: number
    unit_price: number
    total_price: number
    sale_channel?: string
    sale_source: 'SKU_PAGE' | 'CUSTOMER_PAGE'
    notes?: string
  }) => apiClient.post(`/customers/${id}/purchases`, data),
  
  // 获取客户备注
  get_notes: (id: string) => apiClient.get(`/customers/${id}/notes`),
  
  // 添加客户备注
  addNote: (id: string, data: {
    content: string
    item_category: 'PREFERENCE' | 'BEHAVIOR' | 'CONTACT' | 'OTHER'
  }) => apiClient.post(`/customers/${id}/notes`, data),
  
  // 更新客户备注
  updateNote: (customer_id: string, note_id: string, data: {
    content: string
    item_category: 'PREFERENCE' | 'BEHAVIOR' | 'CONTACT' | 'OTHER'
  }) => apiClient.put(`/customers/${ customer_id }/notes/${ note_id }`, data),

  // 删除客户备注
  deleteNote: (customer_id: string, note_id: string) => apiClient.delete(`/customers/${ customer_id }/notes/${ note_id }`),
  
  // 获取客户统计分析
  get_analytics: (params?: {
    time_period?: 'week' | 'month' | 'half_year' | 'year' | 'all'
  }) => apiClient.get(`/customers/analytics${buildQueryString(params)}`),
  
  // 搜索客户（用于销售时快速选择）
  search: (query: string) => apiClient.get(`/customers/search?q=${encodeURIComponent(query)}`),
  
  // 获取可用SKU列表（用于反向销售录入）
  get_available_skus: (params?: {
    search?: string
    page?: number
    limit?: number
  }) => apiClient.get(`/customers/available-skus${buildQueryString(params)}`),
  
  // 客户购买记录退货
  refundPurchase: (customer_id: string, purchase_id: string, data: {
    quantity: number
    reason: string
    refund_amount?: number
    notes?: string
  }) => apiClient.post(`/customers/${ customer_id }/purchases/${purchase_id}/refund`, data),
}

// 导出getApiUrl函数
export { get_api_url }

// 导出默认API客户端
export default apiClient