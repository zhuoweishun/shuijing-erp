import { networkInterfaces } from 'os'
import { logger } from './logger'

// 获取本地IP地址
export const getLocalIP = (): string => {
  const interfaces = networkInterfaces()
  
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name]
    if (!nets) continue
    
    for (const net of nets) {
      // 跳过内部地址和IPv6地址
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  
  return 'localhost'
}

// 获取公网IP地址
export const getPublicIP = async (): Promise<string> => {
  try {
    // 尝试多个服务来获取公网IP
    const services = [
      'https://api.ipify.org?format=text',
      'https://icanhazip.com',
      'https://ipinfo.io/ip'
    ]
    
    for (const service of services) {
      try {
        const response = await fetch(service, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Crystal-ERP/1.0'
          }
        })
        
        if (response.ok) {
          const ip = (await response.text()).trim()
          if (isValidIP(ip)) {
            logger.info(`获取公网IP成功: ${ip}`, { service })
            return ip
          }
        }
      } catch (error) {
        logger.warn(`从 ${service} 获取公网IP失败`, { error })
        continue
      }
    }
    
    // 如果所有服务都失败，返回配置的公网IP
    const configuredPublicIP = process.env.PUBLIC_IP || '139.224.189.1'
    logger.info(`使用配置的公网IP: ${configuredPublicIP}`)
    return configuredPublicIP
    
  } catch (error) {
    logger.error('获取公网IP失败', { error })
    return process.env.PUBLIC_IP || '139.224.189.1'
  }
}

// 验证IP地址格式
export const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip)
}

// 获取所有可用的访问地址
export const getAccessUrls = async (port: number = 3001, protocol: string = 'http'): Promise<{
  local: string
  network: string
  public: string
  domain?: string
}> => {
  const localIP = getLocalIP()
  const publicIP = await getPublicIP()
  const domain = process.env.API_DOMAIN || 'api.dorblecapital.com'
  
  return {
    local: `${protocol}://localhost:${port}`,
    network: `${protocol}://${localIP}:${port}`,
    public: `${protocol}://${publicIP}:${port}`,
    domain: process.env.NODE_ENV === 'production' ? `https://${domain}` : undefined
  }
}

// 检测端口是否可用
export const isPortAvailable = async (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const net = require('net')
    const server = net.createServer()
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true)
      })
      server.close()
    })
    
    server.on('error', () => {
      resolve(false)
    })
  })
}

// 获取推荐的端口
export const getAvailablePort = async (startPort: number = 3001): Promise<number> => {
  for (let port = startPort; port <= startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port
    }
  }
  throw new Error('没有找到可用的端口')
}

// 网络健康检查
export const checkNetworkHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy'
  message: string
  details: any
}> => {
  try {
    const localIP = getLocalIP()
    const publicIP = await getPublicIP()
    
    return {
      status: 'healthy',
      message: '网络连接正常',
      details: {
        localIP,
        publicIP,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: '网络连接异常',
      details: {
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      }
    }
  }
}