module.exports = {
  apps: [{
    // 应用基本配置
    name: 'shuijing-erp-api',
    script: './api/server.js',
    cwd: '/www/wwwroot/shuijing-erp',
    
    // 集群模式配置
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster',
    
    // 环境配置
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // 监控和重启配置
    watch: false, // 生产环境不建议开启文件监控
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 10,
    
    // 日志配置
    log_file: '/www/wwwroot/shuijing-erp/logs/combined.log',
    out_file: '/www/wwwroot/shuijing-erp/logs/out.log',
    error_file: '/www/wwwroot/shuijing-erp/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // 进程配置
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // 自动重启配置
    autorestart: true,
    restart_delay: 4000,
    
    // 健康检查
    health_check_grace_period: 3000,
    
    // 其他配置
    source_map_support: true,
    instance_var: 'INSTANCE_ID'
  }],
  
  // 部署配置
  deploy: {
    production: {
      user: 'root',
      host: '139.224.189.1',
      ref: 'origin/main',
      repo: 'https://github.com/zhuoweishun/shuijing-erp.git',
      path: '/www/wwwroot/shuijing-erp',
      'post-deploy': 'cd api && npm install --production && pm2 reload ecosystem.config.js --env production'
    }
  }
};