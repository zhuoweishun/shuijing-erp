/**
 * 网络配置工具函数
 * 处理API基础URL的动态获取
 */

export interface networkConfig {
  api_base_url: string
  public_ip?: string
  local_ip?: string | null
}

/**
 * 获取网络配置
 * @returns {networkConfig} 网络配置对象
 */
export function get_network_config(): networkConfig {
  // 检查是否在生产环境
  if (import.meta.env.PROD) {
    // 生产环境使用公网API域名
    return {
      api_base_url: 'https://api.dorblecapital.com'
    }
  }
  
  // 开发环境根据当前hostname动态构建API地址
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // 如果是公网域名，使用公网API
    if (hostname.includes('dorblecapital.com')) {
      return {
        api_base_url: 'https://api.dorblecapital.com'
      }
    }
    
    // 如果是局域网IP，动态构建局域网API地址
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || 
        (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31)) {
      return {
        api_base_url: `http://${hostname}:3001`,
        local_ip: hostname
      }
    }
    
    // localhost情况
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return {
        api_base_url: 'http://localhost:3001'
      }
    }
    
    // 其他情况，使用当前hostname
    return {
      api_base_url: `http://${hostname}:3001`,
      local_ip: hostname
    }
  }
  
  // 服务端渲染时的默认值
  return {
    api_base_url: 'http://localhost:3001'
  }
}

/**
 * 获取本地IP地址
 * @returns {string | null} 本地IP地址或null
 */
// function get_local_ip(): string | null {
//   try {
//     // 尝试从window对象获取预设的IP
//     if (typeof window !== 'undefined' && window.__LOCAL_IP__) {
//       return window.__LOCAL_IP__
//     }
//     
//     // 尝试从当前页面URL获取IP
//     if (typeof window !== 'undefined') {
//       const hostname = window.location.hostname
//       // 如果hostname是IP地址格式，直接使用
//       if (is_valid_ip(hostname)) {
//         return hostname
//       }
//     }
//     
//     // 如果没有预设IP，返回null，将使用公网IP
//     return null
//   } catch (error) {
//     console.warn('获取本地IP失败:', error)
//     return null
//   }
// }

/**
 * 检查是否为有效的IP地址
 * @param {string} ip - 要检查的IP地址
 * @returns {boolean} 是否为有效IP
 */
// function is_valid_ip(ip: string): boolean {
//   const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
//   return ipRegex.test(ip)
// }

/**
 * 设置本地IP地址
 * @param {string} ip - 本地IP地址
 */
export function set_local_ip(ip: string): void {
  if (typeof window !== 'undefined') {
    window.__LOCAL_IP__ = ip
  }
}

/**
 * 检测网络连接状态
 * @param {string} url - 要检测的URL
 * @returns {Promise<boolean>} 连接状态
 */
export async function check_network_connection(url?: string): Promise<boolean> {
  const test_url = url || get_network_config().api_base_url
  
  try {
    const controller = new AbortController()
    const timeout_id = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(`${test_url}/health`, {
      method: 'GET',
      signal: controller.signal
    })
    
    clearTimeout(timeout_id)
    return response.ok
  } catch (error) {
    console.warn('网络连接检测失败:', error)
    return false
  }
}

/**
 * 获取最佳API端点
 * @returns {Promise<string>} 最佳API基础URL
 */
export async function get_best_api_endpoint(): Promise<string> {
  const config = get_network_config()
  
  // 如果是生产环境，直接返回生产API
  if (import.meta.env.PROD) {
    return config.api_base_url
  }
  
  // 开发环境测试多个端点
  const endpoints = [
    config.api_base_url,
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ]
  
  for (const endpoint of endpoints) {
    const is_connected = await check_network_connection(endpoint)
    if (is_connected) {
      return endpoint
    }
  }
  
  // 如果都连接失败，返回默认配置
  return config.api_base_url
}