import { Router } from 'express'
import { logger } from '../utils/logger.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { checkDatabaseHealth } from '../services/database'
import { checkAIHealth } from '../services/ai'
import { checkNetworkHealth } from '../utils/network'
import os from 'os'

const router = Router()

// 基础健康检查
router.get('/', asyncHandler(async (req, res) => {
  const healthData = {
    success: true,
    message: '水晶ERP系统API服务运行正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
    },
    network: {
      local_ip: process.env.LOCAL_IP || 'localhost',
      public_ip: process.env.PUBLIC_IP || '139.224.189.1',
      api_domain: process.env.API_DOMAIN || 'api.dorblecapital.com'
    }
  }

  logger.info('基础健康检查请求', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  
  res.json(healthData)
}))

// 详细健康检查
router.get('/detailed', asyncHandler(async (req, res) => {
  // 并行检查所有服务
  const [dbHealth, aiHealth, networkHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkAIHealth(),
    checkNetworkHealth()
  ])
  
  const overallStatus = (
    dbHealth.status === 'healthy' && 
    aiHealth.status === 'healthy' && 
    networkHealth.status === 'healthy'
  ) ? 'healthy' : 'unhealthy'
  
  const healthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    
    // 系统信息
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      memoryUsage: process.memoryUsage()
    },
    
    // 服务状态
    services: {
      database: dbHealth,
      ai: aiHealth,
      network: networkHealth
    }
  }
  
  logger.info('详细健康检查请求', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    overallStatus
  })
  
  res.status(overallStatus === 'healthy' ? 200 : 503).json(healthData)
}))

// 就绪检查（用于容器编排）
router.get('/ready', asyncHandler(async (_req, res) => {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET']
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    res.status(503).json({
      status: 'not_ready',
      message: '缺少必要的环境变量',
      missing: missingVars,
      timestamp: new Date().toISOString()
    })
    return
  }
  
  // 检查数据库连接
  const dbHealth = await checkDatabaseHealth()
  if (dbHealth.status !== 'healthy') {
    res.status(503).json({
      status: 'not_ready',
      message: '数据库连接异常',
      details: dbHealth,
      timestamp: new Date().toISOString()
    })
    return
  }
  
  res.json({
    status: 'ready',
    message: '服务已就绪',
    timestamp: new Date().toISOString()
  })
}))

// 存活检查（用于容器编排）
router.get('/live', asyncHandler(async (req, res) => {
  logger.info('存活检查请求', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  
  res.json({
    success: true,
    message: '服务存活',
    alive: true,
    timestamp: new Date().toISOString()
  })
}))

export default router