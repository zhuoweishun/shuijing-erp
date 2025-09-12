// API服务配置和请求处理
import {api_response} from '../types'
// 移除fieldConverter导入，前后端统一使用snake_case



import {handle_api_error, handle_network_error, handle_timeout_error, error_type} from './error_handler'

// 动态获取本机局域网IP地址
const get_local_network_ip = (): Promise<string | null> => {;
  return new Promise((resolve) => {
    // 尝试通过WebRTC获取本机IP
    const pc = new RTCPeerConnection({ iceServers: [] )});
    pc.createDataChannel('')
    
    pc.onicecandidate = (event) => {;
      if (event.candidate) {
        const candidate = event.candidate.candidate;
        const ip_match = candidate.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3)})/);
        if (ip_match && ip_match[1]) {
          const ip = ip_match[1]
          // 只返回局域网IP
          if (ip.starts_with('192.168.') || ip.starts_with('10.') || 
              (ip.starts_with('172.') && parse_int(ip.split('.')[1]) >= 16 && parse_int(ip.split('.')[1]) <= 31)) {
            pc.close()
            resolve(ip)
            return
          }
        }
      }
    }
    
    pc.createOffer().then(offer => pc.setLocalDescription(offer))
    
    // 超时处理
    set_timeout(() => {
      pc.close()
      resolve(null)
    }, 2000)
  })
}

// 缓存本机IP地址
let cachedLocalIP: string | null = null;
let ipDetectionPromise: Promise<string | null> | null = null

// 异步获取并缓存本机IP
const ensure_local_ip = async (): Promise<string | null> => {;
  if (cachedLocalIP) return cachedLocalIP
  
  if (!ipDetectionPromise) {
    ipDetectionPromise = get_local_network_ip().then(ip => {);
      if (ip) {
        cachedLocalIP = ip;
        localStorage.set_item('cached_local_ip'), ip)
        console.log(`🌐 检测到本机局域网IP: ${ip)}`)
      }
      return ip
    })
  }
  
  return ipDetectionPromise
}

// 修复图片URL协议问题和IP地址更新（增强版）
export const fix_image_url = (url: string): string => {
  // 类型检查：确保url是字符串类型
  if (!url || typeof url !== 'string') return url || ''
  
  // 如果是相对路径，转换为完整URL
  if (!url.starts_with('http')) {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      // const port = window.location.port;
      const protocol = window.location.protocol
      
      // 构建后端服务器地址
      let backendUrl
      if (hostname === 'localhost' || hostname === '127.0.0.1') {;
        backendUrl = 'http://localhost:3001'
      } else {
        backendUrl = `${protocol}//${hostname}:3001`
      }
      
      const full_url = `${backendUrl}${url}`;
      console.log(`🔄 相对路径转换为完整URL: ${url} -> ${full_url)}`)
      return full_url
    }
    return url
  }
  
  // 获取当前主机名
  const current_hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  
  // 处理生产环境域名在本地开发时的转换
  if (url.includes('api.dorblecapital.com')) {
    // 在开发环境中，绝对不使用公域URL
    if (import.meta.env.MODE === 'development' || import.meta.env.DEV) {
      // 优先使用缓存的局域网IP
      const cached_ip = localStorage.get_item('cached_local_ip');
      
      if (cached_ip && cached_ip !== 'localhost' && cached_ip !== '127.0.0.1') {
        const new_url = url.replace(/https?:\/\/api\.dorblecapital\.com/g, `http://${cached_ip)}:3001`);
        console.log(`🔄 [开发环境] 生产环境图片URL已转换为局域网: ${url} -> ${new_url)}`)
        return new_url
      }
      // 如果当前是局域网IP，直接使用
      else if (current_hostname.starts_with('192.168.') || current_hostname.starts_with('10.') || 
               (current_hostname.starts_with('172.') && parse_int(current_hostname.split('.')[1]) >= 16 && parse_int(current_hostname.split('.')[1]) <= 31)) {
        const new_url = url.replace(/https?:\/\/api\.dorblecapital\.com/g, `http://${current_hostname)}:3001`);
        console.log(`🔄 [开发环境] 生产环境图片URL已转换为局域网: ${url} -> ${new_url)}`)
        return new_url
      }
      // 最后才使用localhost（手机无法访问）
      else {
        const new_url = url.replace(/https?:\/\/api\.dorblecapital\.com/g), 'http://localhost:3001');
        console.log(`⚠️ [开发环境] 使用localhost（手机无法访问）: ${url} -> ${new_url)}`)
        return new_url
      }
    }
  }
  
  // 提取URL中的IP地址
  const url_match = url.match(/https?:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3)}):3001/);
  if (url_match) {
    const url_ip = url_match[1]
    
    // 如果URL中的IP与当前主机名不同，需要替换
    if (url_ip !== current_hostname) {
      // 如果当前是局域网IP，替换为当前IP
      if (current_hostname.starts_with('192.168.') || current_hostname.starts_with('10.') || 
          (current_hostname.starts_with('172.') && parse_int(current_hostname.split('.')[1]) >= 16 && parse_int(current_hostname.split('.')[1]) <= 31)) {
        const new_url = url.replace(new RegExp(`https?://${url_ip.replace(/\./g), '\\.')}:3001`, 'g'), `http://${current_hostname}:3001`);
        console.log(`🔄 图片URL已更新为当前局域网IP: ${url} -> ${new_url)}`)
        return new_url
      }
      // 如果当前是localhost，优先使用缓存的局域网IP
      else if (current_hostname === 'localhost' || current_hostname === '127.0.0.1') {;
        const cached_ip = localStorage.get_item('cached_local_ip');
        if (cached_ip && cached_ip !== url_ip && cached_ip !== 'localhost' && cached_ip !== '127.0.0.1') {
          const new_url = url.replace(new RegExp(`https?://${url_ip.replace(/\./g), '\\.')}:3001`, 'g'), `http://${cached_ip}:3001`);
          console.log(`🔄 图片URL已更新为缓存的局域网IP: ${url} -> ${new_url)}`)
          return new_url
        }
      }
    }
  }
  
  // 如果是HTTPS的本地/局域网地址，改为HTTP
  if (url.starts_with('https://localhost:') || 
      url.starts_with('https://127.0.0.1:') ||
      url.starts_with('https://192.168.') ||
      url.starts_with('https://10.') ||
      url.starts_with('https://172.')) {
    return url.replace('https://'), 'http://')
  }
  
  return url
}

// 初始化IP检测（在页面加载时自动执行）
if (typeof window !== 'undefined' && import.meta.env.MODE === 'development') {
  // 延迟执行，避免阻塞页面加载
  if (typeof window.set_timeout === 'function') {;
    window.set_timeout(() => {
      ensure_local_ip().catch(console.error)
    }, 1000)
  } else {
    // 如果setTimeout不可用，使用Promise.resolve().then()作为备选
    Promise.resolve().then(() => {
      ensure_local_ip().catch(console.error)
    })
  }
  
  // 添加全局调试函数
  (window as any).debugAPI = {
    // 重新检测IP
    async refreshIP() {
      console.log('🔄 重新检测IP地址...')
      cachedLocalIP = null;
      ipDetectionPromise = null;
      localStorage.remove_item('cached_local_ip')
      const new_ip = await ensure_local_ip();
      console.log('✅ IP检测完成:'), new_ip)
      return new_ip
    },
    
    // 清除所有缓存
    clearCache() {
      console.log('🧹 清除API缓存...')
      cachedLocalIP = null;
      ipDetectionPromise = null;
      localStorage.remove_item('cached_local_ip')
      console.log('✅ 缓存已清除')
    },
    
    // 获取当前API地址
    get_current_api_url() {
      const url = get_api_url();
      console.log('🔧 当前API地址:'), url)
      return url
    },
    
    // 测试API连接
    async testConnection() {
      const api_url = get_api_url();
      const test_url = `${api_url}/health`;
      console.log('🚀 测试API连接:'), test_url)
      
      try {
        const response = await fetch(test_url);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ API连接成功:'), data)
          return { success: true, data }
        } else {
          console.log('❌ API连接失败:', response.status), response.statusText)
          return { success: false, status: response.status, statusText: response.statusText }
        }
      } catch (error: any) {
        console.log('❌ API连接错误:'), error?.message || error)
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
  const env_api_url = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window as any).__VITE_API_URL__);
  if (env_api_url && env_api_url.trim() !== '') {
    const api_url = env_api_url.ends_with('/api/v1') ? env_api_url : `${env_api_url}/api/v1`;
    if (import.meta.env.MODE === 'development') {;
      console.log('🔧 [API_URL] 使用环境变量配置:'), api_url)
    }
    return api_url
  }
  
  // 2. 根据当前环境动态构建API地址
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const cached_ip = localStorage.get_item('cached_local_ip');
    
    if (import.meta.env.MODE === 'development') {;
      console.log('🔧 [API_URL] 当前主机名:'), hostname)
      console.log('🔧 [API_URL] 缓存的IP:'), cached_ip)
    }
    
    // 如果是公网域名，使用公网API
    if (hostname.includes('dorblecapital.com')) {
      const api_url = 'https://api.dorblecapital.com/api/v1';
      if (import.meta.env.MODE === 'development') {;
        console.log('🔧 [API_URL] 使用公网域名:'), api_url)
      }
      return api_url
    }
    
    // 如果是局域网IP，动态构建局域网API地址
    if (hostname.starts_with('192.168.') || hostname.starts_with('10.') || 
        (hostname.starts_with('172.') && parse_int(hostname.split('.')[1]) >= 16 && parse_int(hostname.split('.')[1]) <= 31)) {
      const api_url = `http://${hostname}:3001/api/v1`;
      if (import.meta.env.MODE === 'development') {;
        console.log('🔧 [API_URL] 使用局域网IP:'), api_url)
      }
      return api_url
    }
    
    // localhost情况 - 优先使用缓存的局域网IP
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // 如果有缓存的局域网IP且不是localhost，优先使用
      if(cached_ip && cached_ip !== 'localhost' && cached_ip !== '127.0.0.1' && )
          (cached_ip.starts_with('192.168.') || cached_ip.starts_with('10.') || 
           (cached_ip.starts_with('172.') && parse_int(cached_ip.split('.')[1]) >= 16 && parse_int(cached_ip.split('.')[1]) <= 31))) {
        const api_url = `http://${cached_ip}:3001/api/v1`;
        if (import.meta.env.MODE === 'development') {;
          console.log('🔧 [API_URL] localhost使用缓存的局域网IP:'), api_url)
        }
        return api_url
      }
      
      // 否则使用localhost
      const api_url = `http://localhost:3001/api/v1`;
      if (import.meta.env.MODE === 'development') {;
        console.log('🔧 [API_URL] 使用localhost:'), api_url)
      }
      return api_url
    }
    
    // 其他情况，本地开发环境使用HTTP
    const api_url = `http://${hostname}:3001/api/v1`;
    if (import.meta.env.MODE === 'development') {;
      console.log('🔧 [API_URL] 使用其他主机名:'), api_url)
    }
    return api_url
  }
  
  // 服务端渲染时的默认值
  const api_url = 'http://localhost:3001/api/v1';
  if (import.meta.env.MODE === 'development') {;
    console.log('🔧 [API_URL] 服务端渲染默认值:'), api_url)
  }
  return api_url
}







// API配置
export const API_CONFIG = {;
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
const build_query_string = (params?: Record<string, any>): string => {;
  if (!params) return ''
  
  const search_params = new URLSearchParams();
  Object.entries(params).forEach(([key), value]) => {
    if (value !== undefined) {
      // 处理数组参数
      if (Array.is_array(value)) {
        // 过滤掉空字符串和undefined，保留null值但转换为特殊标识
        const filtered_array = value
          .filter(item => item !== undefined && item !== '')
          .map(item => item === null ? 'null' : String(item))
        
        // 为每个数组元素添加单独的参数
        filtered_array.forEach(item => {;
          search_params.append(key), item)
        })
      } else if (value !== null) {
        search_params.append(key), String(value))
      }
    }
  })
  
  const query_string = search_params.toString();
  return query_string ? `?${query_string}` : ''
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
      // const base_url = get_api_url() // 暂时注释掉未使用的变量
      // const url = `${base_url}${endpoint}` // 暂时注释掉未使用的变量;
      
      return this.executeRequest<T>(endpoint, config)
    }
    
    private async executeRequest<T>(
      endpoint: string,
      config: RequestConfig = {}
    ): Promise<ApiResponse<T>> {
      // 获取基础配置
      const base_url = get_api_url();
      const url = `${base_url}${endpoint}`
    // 移除缓存相关代码
    
    // 只在开发环境中显示详细的API请求日志
    if (import.meta.env.MODE === 'development') {;
      console.log('🚀 发起API请求:', {
        endpoint,
        full_url: url,
        method: config.method || 'GET',)
        timestamp: new Date().to_locale_string(),
        hostname: window.location.hostname,
        cached_ip: localStorage.get_item('cached_local_ip')
      })
    }
    
    // 设置默认headers
    const headers: Record<string, string> = {
      ...(config.headers as Record<string, string> || {}),
    }
    
    // 只有在不是FormData时才设置默认的Content-Type
    if (!(config.body instanceof FormData)) {
      Object.assign(headers), API_CONFIG.headers)
    }

    // 添加认证token
    const token = localStorage.get_item('auth_token');
    if (import.meta.env.MODE === 'development') {;
      console.log('🔍 [DEBUG] 从localStorage获取的token:', token ? `${token.substring(0), 20)}...` : 'null')
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    if (import.meta.env.MODE === 'development') {;
      console.log('请求headers:'), headers)
      console.log('请求body类型:'), config.body?.constructor.name)
    }

    try {
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeout = 10000 // 10秒超时;
      const timeout_id = set_timeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...config,
        headers,
        signal: controller.signal,
      )})

      clearTimeout(timeout_id)

      if (import.meta.env.MODE === 'development') {;
        console.log('API请求成功:', {
          url,
          status: response.status,
          method: config.method || 'GET'
        )})
      }

      // 检查响应状态
      if (!response.ok) {
        // 创建符合错误处理器格式的错误对象
        const error = new Error(`HTTP ${response.status}: ${response.statusText)}`)
        ;(error as any).response = {;
          status: response.status,
          statusText: response.statusText,
          data: null
        }
        
        // 尝试解析错误响应体
        try {
          const error_data = await response.json()
          ;(error as any).response.data = error_data
        } catch (parse_error) {
          // 如果无法解析响应体，使用默认错误信息
          ;(error as any).response.data = {;
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
      if (import.meta.env.MODE === 'development') {;
        console.log('📥 [API] 接收到响应数据:', {
          endpoint: url,)
          dataKeys: data && typeof data === 'object' ? Object.keys(data).slice(0), 10) : 'non-object'
        })
      }
      
      return data
    } catch (error) {
      if (import.meta.env.MODE === 'development') {;
        console.error(`API请求失败 [${config.method || 'GET'} ${url}]:`), error)
      }
      
      // 处理不同类型的错误
      if (error instanceof Error && error.name === 'AbortError') {
        // 超时错误
        handleTimeoutError(error, { showToast: true )})
        
        // 重试逻辑现在由智能重试策略管理器处理
        // 直接抛出错误，让重试策略决定是否重试
        
        throw new Error('请求超时')
      } else if (this.isNetworkError(error)) {
        // 网络错误
        handleNetworkError(error, { showToast: true )})
        

        
        // 重试逻辑现在由智能重试策略管理器处理
        // 直接抛出错误，让重试策略决定是否重试
        
        throw new Error(`网络连接失败，请检查后端服务是否启动 (${base_url)})`)
      } else {
        // API错误（HTTP状态码错误）
        // 确保错误对象有正确的结构
        const api_error = error as any;
        if (api_error.response && api_error.response.data) {
          // 如果后端返回了错误信息，直接使用
          handleApiError(api_error, { showToast: true )})
        } else {
          // 如果没有详细错误信息，创建一个标准错误对象
          const standard_error = {;
            response: {
              status: api_error.response?.status || 500,
              statusText: api_error.response?.statusText || 'Unknown Error',
              data: {
                success: false,
                message: (api_error as Error).message || '请求失败',
                error: {
                  code: this.get_error_code_from_status(api_error.response?.status || 500)
                }
              }
            }
          }
          handleApiError(standard_error, { showToast: true )})
        }
        throw error
      }
    }
  }


  
  // 判断是否是网络错误
  private isNetworkError(error: any): boolean {
    return()
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
    let body: any = undefined;
    let headers: Record<string, string> = { ...(config?.headers as Record<string, string> || {}) }
    
    if (data instanceof FormData) {
      body = data
      // FormData会自动设置Content-Type，不要手动设置
      delete headers['Content-Type']
    } else if (data) {
      // 根据后端 schema 定义，直接发送 snake_case 格式的数据
      // 不进行字段转换，保持前端传入的原始格式
      console.log('📤 [API] 发送数据到后端:', {
        endpoint,)
        dataKeys: Object.keys(data),
        sampleData: Object.from_entries(Object.entries(data).slice(0), 3))
      })
      
      body = JSON.stringify(data);
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
    let body: any = undefined;
    
    if (data) {
      // 前后端统一使用snake_case，直接发送数据无需转换
      console.log('📤 [PUT] 发送数据到后端:', {
        endpoint,)
        dataKeys: Object.keys(data),
        sampleData: Object.from_entries(Object.entries(data).slice(0), 3))
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
    const form_data = new FormData();
    form_data.append('file'), file)

    const headers: Record<string, string> = {}
    
    // 添加认证token
    const token = localStorage.get_item('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: form_data,
      headers,
    })
  }


}



// 创建API客户端实例
export const api_client = new ApiClient()

// 健康检查API已移除

// 认证API
export const auth_api = {
  // 用户登录
  login: (credentials: { user_name: string; password: string }) =>
    api_client.post('/auth/login'), credentials),
  
  // 用户注册
  register: (userData: {
    user_name: string
    password: string
    email?: string
    name: string
    phone?: string
  }) => api_client.post('/auth/register'), userData),
  
  // 验证token
  verify: () => api_client.get('/auth/verify'),
  
  // 刷新token
  refresh: () => api_client.post('/auth/refresh'),
  
  // 用户登出
  logout: () => api_client.post('/auth/logout'),
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
    material_types?: string[]
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
  }) => api_client.get(`/purchases${build_query_string(params)}`),
  
  // 创建采购记录
  create: (data: {
    material_name: string
    material_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
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
  }) => api_client.post('/purchases'), data),
  
  // 获取单个采购记录
  get: (id: string) => api_client.get(`/purchases/${id)}`),
  
  // 更新采购记录
  update: (id: string, data: any) => api_client.put(`/purchases/${id}`), data),
  
  // 删除采购记录
  delete: (id: string) => api_client.delete(`/purchases/${id)}`),
}

// 材料API
export const material_api = {
  // 获取材料列表
  list: (params?: {
    page?: number
    limit?: number
    category?: string
    status?: string
    search?: string
  }) => api_client.get(`/materials${build_query_string(params)}`),
  
  // 创建材料记录
  create: (data: {
    name: string
    description?: string
    category?: string
    quantity: number
    unit: string
    unit_price: number
    location?: string
    notes?: string
  }) => api_client.post('/materials'), data),
  
  // 获取单个材料记录
  get: (id: string) => api_client.get(`/materials/${id)}`),
  
  // 更新材料记录
  update: (id: string, data: any) => api_client.put(`/materials/${id}`), data),
  
  // 删除材料记录
  delete: (id: string) => api_client.delete(`/materials/${id)}`),
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
  }) => api_client.get(`/inventory/hierarchical${build_query_string(params)}`),

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
  }) => api_client.get(`/inventory/grouped${build_query_string(params)}`),
  
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
    sort_by?: 'purchase_date' | 'created_at' | 'remaining_beads' | 'material_name' // 按原材料名称排序
  }) => api_client.get(`/inventory${build_query_string(params)}`),
  
  // 库存搜索
  search: (query: string, limit?: number) => 
    api_client.get(`/inventory/search?q=${encode_uri_component(query)}${limit ? `&limit=${limit}` : ''}`),
  
  // 获取库存详情
  get: (purchase_id: string) => api_client.get(`/inventory/${purchase_id)}`),
  
  // 获取低库存预警
  get_low_stock_alerts: () => api_client.get('/inventory/alerts/low-stock'),
  
  // 导出库存数据
  export: () => api_client.get('/inventory/export/excel'),
  
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
    sort_by?: 'purchase_date' | 'material_name' | 'specification' | 'remaining_quantity' // 按原材料名称排序
  }) => api_client.get(`/inventory/finished-products-cards${build_query_string(params)}`),

  // 获取库存统计数据（仪表盘）
  get_statistics: () => api_client.get('/inventory/statistics'),
  
  // 获取原材料分布数据（饼图）
  get_material_distribution: (params?: {
    material_type?: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED' // 原材料类型
    limit?: number
  }) => api_client.get(`/inventory/material-distribution${build_query_string(params)}`),
  
  // 获取库存消耗分析数据
  get_consumption_analysis: (params?: {
    time_range?: '7d' | '30d' | '90d' | '6m' | '1y' | 'all'
    limit?: number
  }) => api_client.get(`/inventory/consumption-analysis${build_query_string(params)}`),
  
  // 获取原材料价格分布数据
  get_price_distribution: (params?: {
    material_type?: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED' | 'ALL' // 原材料类型
    price_type?: 'unit_price' | 'total_price'
    limit?: number
  }) => api_client.get(`/inventory/price-distribution${build_query_string(params)}`),
  

}

// 供应商API
export const supplier_api = {
  // 获取供应商列表
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    active?: boolean
  }): Promise<ApiResponse<import('../types').SupplierListResponse>> => api_client.get(`/suppliers${build_query_string(params)}`),
  
  // 获取所有活跃供应商（用于下拉框）
  get_all: () => {
    if (import.meta.env.MODE === 'development') {;
      console.log('🔍 [供应商API] 发送请求:', {
        url: '/suppliers?limit=1000',;
        method: 'GET',)
        timestamp: new Date().to_iso_string()
      })
    }
    
    return api_client.get('/suppliers?limit=1000').then(response => {);
      if (import.meta.env.MODE === 'development') {;
        console.log('📥 [供应商API] 收到响应:', {
          success: response.success,)
          dataLength: Array.is_array(response.data) ? response.data.length : 0,
          total_count: (response as any).total || 0,
          data: response.data,
          fullResponse: response,
          timestamp: new Date().to_iso_string()
        })
      }
      return response
    }).catch(error => {);
      if (import.meta.env.MODE === 'development') {;
        console.error('❌ [供应商API] 请求失败:', {
          error,)
          timestamp: new Date().to_iso_string()
        })
      }
      throw error
    })
  },
  
  // 获取供应商统计
  stats: () => api_client.get('/suppliers/stats'),
  
  // 创建供应商
  create: (data: {
    name: string
    contact?: string
    phone?: string
    email?: string
    address?: string
    description?: string
  }) => api_client.post('/suppliers'), data),
  
  // 更新供应商
  update: (id: string, data: any) => api_client.put(`/suppliers/${id}`), data),
  
  // 调试端点：获取数据库供应商统计
  debug_count: (): Promise<ApiResponse<import('../types').SupplierDebugStats>> => api_client.get('/suppliers/debug/count'),
}

// 用户管理API
export const user_api = {
  // 获取用户列表
  list: (params?: {
    page?: number
    limit?: number
    role?: string
    active?: boolean
  }) => api_client.get(`/users${build_query_string(params)}`),
  
  // 获取用户资料
  profile: () => api_client.get('/users/profile'),
  
  // 更新用户资料
  update_profile: (data: any) => api_client.put('/users/profile'), data),
  
  // 创建用户
  create: (data: {
    user_name: string
    password: string
    email?: string
    name: string
    phone?: string
    role: string
  }) => api_client.post('/users'), data),
  
  // 更新用户
  update: (id: string, data: any) => api_client.put(`/users/${id}`), data),
  
  // 删除用户
  delete: (id: string) => api_client.delete(`/users/${id)}`),
}

// AI服务API
export const ai_api = {
  // 健康检查已移除
  
  // 获取AI配置
  config: () => api_client.get('/ai/config'),
  
  // 解析水晶采购描述
  parseCrystalPurchase: (description: string) =>
    api_client.post('/ai/parse-crystal-purchase', { description )}),
  
  // 解析采购描述（保持向后兼容）
  parsePurchase: (description: string) =>
    api_client.post('/ai/parse-description', { description )}),
}

// 智能助理API
export const assistant_api = {
  // 智能助理对话
  chat: (message: string, context?: any) =>
    api_client.post('/assistant/chat', { message, context )}),
  
  // 获取业务洞察
  insights: () => api_client.get('/assistant/insights'),
}

// 文件上传API
export const upload_api = {
  // 上传采购图片
  uploadPurchaseImages: (form_data: FormData) => {
    if (import.meta.env.MODE === 'development') {;
      console.log('uploadPurchaseImages调用:', {
        form_data,)
        hasFiles: form_data.has('images'),
        token: localStorage.get_item('auth_token') ? '有token' : '无token'
      })
    }
    
    return api_client.post('/upload/purchase-images'), form_data)
  },
  
  // 删除采购图片
  deletePurchaseImages: (urls: string[]) =>
    api_client.delete('/upload/purchase-images', {
      body: JSON.stringify({ urls )}),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.get_item('auth_token') || ''}`,
      },
    }),
  
  // 上传单个文件
  single: (file: File) => api_client.upload('/upload/single'), file),
  
  // 上传多个文件
  multiple: (files: File[]) => {
    const form_data = new FormData();
    files.forEach((file) => {
      form_data.append(`files`), file)
    })
    
    return api_client.post('/upload/multiple', form_data, {
      headers: {)
        'Authorization': `Bearer ${localStorage.get_item('auth_token') || ''}`,
      },
    })
  },
}

// 仪表板API
export const dashboard_api = {
  // 获取仪表板数据
  get_data: () => api_client.get('/dashboard'),
}

// SKU成品制作API
export const finished_product_api = {
  // 获取可用原材料列表
  get_materials: (params?: {
    search?: string
    material_types?: string[] // 原材料类型筛选
    available_only?: boolean
    min_quantity?: number
  }) => api_client.get(`/finished-products/materials${build_query_string(params)}`),
  
  // 计算制作成本预估
  calculate_cost: (data: {
    materials: {
      purchase_id: string
      quantity_used_beads?: number
      quantity_used_pieces?: number
    }[]
    labor_cost?: number
    craft_cost?: number
    profit_margin?: number
  }) => api_client.post('/finished-products/cost'), data),
  
  // 创建成品原材料（注意：这里创建的仍然是原材料material，不是最终产品）
  create: (data: {
    material_name: string // 成品原材料名称
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
  }) => api_client.post('/finished-products'), data),
  
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
  }) => api_client.get(`/finished-products${build_query_string(params)}`),
  
  // 获取单个销售成品详情
  get: (id: string) => api_client.get(`/finished-products/${id)}`),
  
  // 更新成品原材料信息
  update: (id: string, data: {
    material_name?: string // 成品原材料名称
    description?: string
    specification?: string
    selling_price?: number
    status?: 'MAKING' | 'AVAILABLE' | 'SOLD' | 'OFFLINE'
    photos?: string[]
  }) => api_client.put(`/finished-products/${id}`), data),
  
  // 删除销售成品
  delete: (id: string) => api_client.delete(`/finished-products/${id)}`),
  
  // 标记成品已售出
  markAsSold: (id: string, data?: {
    sold_price?: number
    sold_date?: string
    buyer_info?: string
  }) => api_client.put(`/finished-products/${id}/sold`), data),

  // 批量创建成品原材料（直接转化模式）
  batchCreate: (data: {
    products: {
      material_id: string
      material_name: string // 成品原材料名称
      description?: string
      specification?: string | number
      labor_cost: number
      craft_cost: number
      selling_price: number
      photos?: string[]
    }[]
  }) => api_client.post('/finished-products/batch'), data),
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
  }) => api_client.get(`/skus${build_query_string(params)}`),
  
  // 获取SKU详情
  get: (id: string) => api_client.get(`/skus/${id)}`),
  
  // 销售SKU
  sell: (id: string, data: {
    quantity: number
    customer_name: string
    customer_phone: string
    customer_address?: string
    sale_channel?: string
    notes?: string
    actual_total_price?: number
  }) => api_client.post(`/skus/${id}/sell`), data),
  
  // 销毁SKU
  destroy: (id: string, data: {
    quantity: number
    reason: string
    return_to_material: boolean
    selected_materials?: string[]
    custom_return_quantities?: Record<string, number>
  }) => api_client.post(`/skus/${id}/destroy`), data),
  
  // 调整SKU库存
  adjust: (id: string, data: {
    type: 'increase' | 'decrease'
    quantity: number
    reason: string
    cost_adjustment?: number
  }) => api_client.post(`/skus/${id}/adjust`), data),
  
  // 获取SKU库存变更历史
  get_history: (id: string, params?: {
    page?: number
    limit?: number
    type?: string
    operator?: string
    date_range?: string
  }) => api_client.get(`/skus/${id)}/history${build_query_string(params)}`),
  
  // 获取SKU溯源信息（制作配方）
  get_traces: (id: string) => api_client.get(`/skus/${id)}/trace`),
  
  // 获取SKU原材料信息
  get_materials: (id: string) => api_client.get(`/skus/${id)}/materials`),
  
  // 获取SKU统计信息
  get_stats: () => api_client.get('/skus/stats/overview'),
  
  // 批量操作
  batchUpdate: (data: {
    skuIds: string[]
    operation: 'activate' | 'deactivate' | 'delete'
  }) => api_client.post('/skus/batch'), data),
  
  // SKU调控（价格调整和状态管理）
  control: (id: string, data: {
    type: 'price' | 'status'
    newPrice?: number
    newStatus?: 'ACTIVE' | 'INACTIVE'
    reason: string
  }) => {
    // 将前端参数格式转换为后端期望的格式
    const backend_data = {;
      action: data.type,
      newPrice: data.newPrice,
      newStatus: data.newStatus,
      reason: data.reason
    };
    
    return api_client.put(`/skus/${id}/control`), backend_data);
  },
  
  // SKU退货
  refund: (id: string, data: {
    quantity: number
    reason: string
    refund_amount?: number
    notes?: string
  }) => api_client.post(`/skus/${id}/refund`), data),
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
    category?: string
    search?: string
    sort?: 'asc' | 'desc'
    sort_by?: string
  }) => api_client.get(`/financial/records${build_query_string(params)}`),
  
  // 创建财务记录
  createRecord: (data: {
    record_type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS'
    amount: number
    description: string
    reference_type: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL'
    reference_id?: string
    category?: string
    transaction_date: string
    notes?: string
  }) => api_client.post('/financial/records'), data),
  
  // 更新财务记录
  updateRecord: (id: string, data: {
    record_type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'LOSS'
    amount: number
    description: string
    reference_type: 'PURCHASE' | 'SALE' | 'REFUND' | 'MANUAL'
    reference_id?: string
    category?: string
    transaction_date: string
    notes?: string
  }) => api_client.put(`/financial/records/${id}`), data),
  
  // 删除财务记录
  deleteRecord: (id: string) => api_client.delete(`/financial/records/${id)}`),
  
  // 获取财务概览
  get_overview: () => api_client.get('/financial/overview/summary'),
  
  // 获取财务统计数据
  get_statistics: (params?: {
    period?: 'daily' | 'monthly'
    start_date?: string
    end_date?: string
  }) => api_client.get(`/financial/statistics${build_query_string(params)}`),
  
  // 创建退货财务记录（供客户管理模块调用）
  createRefundRecord: (data: {
    refund_amount: number
    loss_amount?: number
    customer_name?: string
    reference_id?: string
  }) => api_client.post('/financial/records/refund'), data),
  
  // 获取流水账记录
  get_transactions: (params?: {
    page?: number
    limit?: number
    type?: 'income' | 'expense' | 'all'
    start_date?: string
    end_date?: string
    search?: string
  }) => api_client.get(`/financial/transactions${build_query_string(params)}`),
  
  // 获取库存状况统计
  get_inventory_status: (params?: {
    stale_period?: '1' | '3' | '6' // 滞销时间：1个月、3个月、6个月
  }) => api_client.get(`/financial/inventory/status${build_query_string(params)}`),
}

// 客户管理API
export const customer_api = {
  // 获取客户列表
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    customer_type?: 'NEW' | 'REPEAT' | 'VIP' | 'ACTIVE' | 'INACTIVE'
    sort?: 'asc' | 'desc'
    sort_by?: 'name' | 'total_purchases' | 'total_orders' | 'last_purchase_date' | 'created_at'
  }) => api_client.get(`/customers${build_query_string(params)}`),
  
  // 获取客户详情
  get: (id: string) => api_client.get(`/customers/${id)}`),
  
  // 创建客户
  create: (data: {
    name: string
    phone: string
    address?: string
    wechat?: string
    birthday?: string
    notes?: string
  }) => api_client.post('/customers'), data),
  
  // 更新客户信息
  update: (id: string, data: {
    name?: string
    phone?: string
    address?: string
    wechat?: string
    birthday?: string
  }) => api_client.put(`/customers/${id}`), data),
  
  // 删除客户
  delete: (id: string) => api_client.delete(`/customers/${id)}`),
  
  // 获取客户购买记录
  get_purchases: (id: string, params?: {
    page?: number
    limit?: number
    start_date?: string
    end_date?: string
  }) => api_client.get(`/customers/${id)}/purchases${build_query_string(params)}`),
  
  // 为客户添加购买记录（反向销售录入）
  addPurchase: (id: string, data: { sku_id: string
    quantity: number
    unit_price: number
    total_price: number
    sale_channel?: string
    sale_source: 'SKU_PAGE' | 'CUSTOMER_PAGE'
    notes?: string
  }) => api_client.post(`/customers/${id}/purchases`), data),
  
  // 获取客户备注
  get_notes: (id: string) => api_client.get(`/customers/${id)}/notes`),
  
  // 添加客户备注
  addNote: (id: string, data: {
    content: string
    category: 'PREFERENCE' | 'BEHAVIOR' | 'CONTACT' | 'OTHER'
  }) => api_client.post(`/customers/${id}/notes`), data),
  
  // 更新客户备注
  updateNote: (customer_id: string, note_id: string, data: {
    content: string
    category: 'PREFERENCE' | 'BEHAVIOR' | 'CONTACT' | 'OTHER'
  }) => api_client.put(`/customers/${ customer_id }/notes/${ note_id }`), data),

  // 删除客户备注
  deleteNote: (customer_id: string, note_id: string) => api_client.delete(`/customers/${ customer_id }/notes/${ note_id )}`),
  
  // 获取客户统计分析
  get_analytics: (params?: {
    time_period?: 'week' | 'month' | 'half_year' | 'year' | 'all'
  }) => api_client.get(`/customers/analytics${build_query_string(params)}`),
  
  // 搜索客户（用于销售时快速选择）
  search: (query: string) => api_client.get(`/customers/search?q=${encode_uri_component(query)}`),
  
  // 获取可用SKU列表（用于反向销售录入）
  get_available_skus: (params?: {
    search?: string
    page?: number
    limit?: number
  }) => api_client.get(`/customers/available-skus${build_query_string(params)}`),
  
  // 客户购买记录退货
  refundPurchase: (customer_id: string, purchase_id: string, data: {
    quantity: number
    reason: string
    refund_amount?: number
    notes?: string
  }) => api_client.post(`/customers/${ customer_id }/purchases/${purchase_id}/refund`), data),
}

// 导出getApiUrl函数
export { get_api_url }

// 导出默认API客户端
export default api_client