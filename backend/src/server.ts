import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { createServer as createHttpsServer } from 'https'
import { Server as SocketIOServer } from 'socket.io'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { networkInterfaces } from 'os'
import fs from 'fs'

// 导入路由
import authRoutes from './routes/auth.js'
import healthRoutes from './routes/health.js'
import dashboardRoutes from './routes/dashboard.js'
import purchaseRoutes from './routes/purchases.js'
import inventoryRoutes from './routes/inventory.js'
import supplierRoutes from './routes/suppliers.js'
import userRoutes from './routes/users.js'
import aiRoutes from './routes/ai.js'
import assistantRoutes from './routes/assistant.js'
import uploadRoutes from './routes/upload.js'

// 导入products路由
import productRoutes from './routes/products.js'

// 导入中间件和工具
import { errorHandler } from './middleware/errorHandler.js'
import { validateApiResponse } from './middleware/responseValidator.js'
import { logger } from './utils/logger.js'
import { testDatabaseConnection, closeDatabaseConnection } from './services/database.js'
import { getAccessUrls, getLocalIP, getPublicIP } from './utils/network.js'

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') })

// 网络配置
const localIP = getLocalIP()
const publicIP = process.env.PUBLIC_IP || '139.224.189.1'
const apiDomain = process.env.API_DOMAIN || 'api.dorblecapital.com'



const app = express()

// HTTP配置（开发环境使用HTTP避免证书问题）
let server
let useHttps = false

// 开发环境强制使用HTTP
if (process.env.NODE_ENV === 'development') {
  server = createServer(app)
  useHttps = false
  logger.info('开发环境：使用HTTP服务器')
} else {
  // 生产环境尝试使用HTTPS
  try {
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, '../localhost+3-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '../localhost+3.pem'))
    }
    server = createHttpsServer(httpsOptions, app)
    useHttps = true
    logger.info('生产环境：HTTPS服务器配置成功')
  } catch (error) {
    logger.warn('SSL证书文件不存在，使用HTTP服务器:', error.message)
    server = createServer(app)
    useHttps = false
  }
}

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
})

// 获取配置
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

// 安全中间件 - 临时禁用以排除CORS干扰
// app.use(helmet({
//   crossOriginEmbedderPolicy: false,
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'"],
//       scriptSrc: ["'self'"],
//       imgSrc: ["'self'", "data:", "https:"],
//     },
//   },
// }))

// 速率限制 - 开发环境放宽限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000'), // 5分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500'), // 限制每个IP 500个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // 开发环境跳过限流
  skip: (req) => {
    return process.env.NODE_ENV === 'development'
  }
})
app.use('/api', limiter)

// CORS配置
app.use(cors({
  origin: function (origin, callback) {
    // 开发环境允许所有来源
    if (NODE_ENV === 'development') {
      return callback(null, true)
    }
    
    // 生产环境检查来源
    const allowedOrigins = [
      `https://${apiDomain}`,
      `https://${localIP}:5173`,
      `https://${publicIP}:5173`,
      `http://${localIP}:5173`,
      `http://${publicIP}:5173`,
      'https://localhost:5173',
      'http://localhost:5173'
    ]
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('不允许的CORS来源'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// 静态文件服务 - 修复CORS配置冲突
app.use('/uploads', (req, res, next) => {
  // 覆盖全局CORS设置，移除credentials冲突
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET')
  res.header('Access-Control-Allow-Credentials', 'false')
  
  // 添加调试日志
  console.log(`[CORS DEBUG] 静态文件请求: ${req.method} ${req.path}`)
  console.log(`[CORS DEBUG] Origin: ${req.headers.origin || 'undefined'}`)
  console.log(`[CORS DEBUG] 设置CORS头: Origin=*, Credentials=false`)
  
  next()
}, express.static(path.join(__dirname, '../uploads')))

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`)
  next()
})

// API响应字段格式验证中间件
app.use('/api', validateApiResponse)

// 基础中间件 - 先设置JSON解析
app.use((req, res, next) => {
  // 只跳过POST上传路由的JSON解析，DELETE等其他方法需要解析JSON
  if (req.path.startsWith('/api/v1/upload') && req.method === 'POST') {
    return next()
  }
  express.json({ limit: '10mb' })(req, res, next)
})

app.use((req, res, next) => {
  // 只跳过POST上传路由的URL编码解析
  if (req.path.startsWith('/api/v1/upload') && req.method === 'POST') {
    return next()
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next)
})

// 上传路由 - 现在在JSON解析中间件之后
app.use('/api/v1/upload', uploadRoutes)

// API路由
app.use('/api/v1/health', healthRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/purchases', purchaseRoutes)
// 注意：finished-products路由必须在inventory路由之前，避免路由冲突
app.use('/api/v1/finished-products', productRoutes)
app.use('/api/v1/inventory', inventoryRoutes)
app.use('/api/v1/suppliers', supplierRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/ai', aiRoutes)
app.use('/api/v1/assistant', assistantRoutes)

// 测试路由
app.get('/api/v1/test-server', (req, res) => {
  console.log('🔥 [SERVER TEST] 服务器测试路由被调用!')
  res.json({ success: true, message: '服务器测试路由正常工作' })
})

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '水晶ERP系统API服务',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    network: {
      localIP,
      publicIP,
      apiDomain
    }
  })
})

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `路由 ${req.originalUrl} 不存在`
  })
})

// 错误处理中间件
app.use(errorHandler)

// Socket.IO连接处理
io.on('connection', (socket) => {
  logger.info(`客户端连接: ${socket.id}`)
  
  socket.on('disconnect', () => {
    logger.info(`客户端断开连接: ${socket.id}`)
  })
  
  // 智能助理消息处理
  socket.on('assistant:message', (data) => {
    logger.info(`智能助理消息: ${socket.id}`, data)
    // 这里可以集成豆包AI处理
    socket.emit('assistant:response', {
      message: '智能助理功能正在开发中...',
      timestamp: new Date().toISOString()
    })
  })
})

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    const dbConnected = await testDatabaseConnection()
    if (!dbConnected) {
      logger.error('数据库连接失败，服务器启动中止')
      process.exit(1)
    }
    
    server.listen(PORT, '0.0.0.0', async () => {
      const protocol = useHttps ? 'https' : 'http'
      const urls = await getAccessUrls(Number(PORT), protocol)
      
      logger.info('🚀 水晶ERP系统后端服务启动成功!')
      logger.info(`📍 环境: ${NODE_ENV}`)
      logger.info(`🔒 协议: ${protocol.toUpperCase()}`)
      logger.info(`🌐 本地访问: ${urls.local}`)
      logger.info(`📱 局域网访问: ${urls.network}`)
      logger.info(`🌍 公网访问: ${urls.public}`)
      if (urls.domain) {
        logger.info(`🔗 域名访问: ${urls.domain}`)
      }
      logger.info('📋 API文档: /api/v1/health')
      logger.info('🔧 管理面板: 开发中...')
    })
  } catch (error) {
    logger.error('服务器启动失败:', error)
    process.exit(1)
  }
}

startServer()

// 优雅关闭
const gracefulShutdown = (signal) => {
  logger.info(`收到 ${signal} 信号，开始优雅关闭服务器...`)
  
  server.close(async () => {
    logger.info('HTTP服务器已关闭')
    
    // 关闭数据库连接
    await closeDatabaseConnection()
    
    // 关闭Socket.IO服务器
    io.close(() => {
      logger.info('Socket.IO服务器已关闭')
      process.exit(0)
    })
  })
  
  // 强制关闭超时
  setTimeout(() => {
    logger.error('强制关闭服务器')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason)
  process.exit(1)
})

export default app