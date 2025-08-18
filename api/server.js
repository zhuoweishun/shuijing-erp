const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const purchaseRoutes = require('./routes/purchases');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: '请求过于频繁，请稍后再试'
});
app.use(limiter);

// CORS配置 - 简化配置，确保localhost访问正常
app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS检查 - 请求来源:', origin);
    
    // 允许的来源列表
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    // 如果没有origin（比如直接访问API或移动应用），也允许
    if (!origin) {
      console.log('CORS允许 - 无origin请求');
      return callback(null, true);
    }
    
    // 检查是否为localhost或127.0.0.1
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log('CORS允许 - localhost/127.0.0.1请求:', origin);
      return callback(null, true);
    }
    
    // 检查局域网IP
    const localNetworkRegex = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)\d{1,3}\.\d{1,3}:5173$/;
    if (localNetworkRegex.test(origin)) {
      console.log('CORS允许 - 局域网请求:', origin);
      return callback(null, true);
    }
    
    console.log('CORS拒绝 - 未授权来源:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 根路径处理
app.get('/', (req, res) => {
  res.json({ 
    message: '水晶ERP API服务',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      purchases: '/api/purchases',
      upload: '/api/upload'
    },
    timestamp: new Date().toISOString()
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '水晶ERP API服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/upload', uploadRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: '接口不存在',
    path: req.originalUrl 
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请联系管理员'
  });
});

// 启动服务器 - 绑定到0.0.0.0允许外部访问
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 水晶ERP API服务已启动`);
  console.log(`📍 本地访问: http://localhost:${PORT}`);
  console.log(`📱 局域网访问: http://0.0.0.0:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`🔗 CORS已配置支持局域网设备访问`);
});

module.exports = app;