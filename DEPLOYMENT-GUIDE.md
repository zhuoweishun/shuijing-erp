# 水晶ERP系统生产环境部署指南

## 概述

本指南提供了水晶ERP系统在生产环境中的完整部署和优化方案。包含前端构建、后端服务、数据库配置、Web服务器优化、安全加固、性能调优和监控系统等全方位的生产环境配置。

## 🚀 快速开始

### 前置条件

- Ubuntu 20.04+ 或 Debian 11+ 服务器
- Root权限访问
- 域名已解析到服务器IP
- 至少2GB RAM和20GB磁盘空间

### 一键部署脚本

```bash
# 下载并执行完整部署脚本
wget -O deploy-all.sh https://your-domain.com/scripts/deploy-all.sh
chmod +x deploy-all.sh
sudo ./deploy-all.sh
```

## 📋 部署步骤

### 1. 基础环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础依赖
sudo apt install -y curl wget git unzip
```

### 2. 安装Node.js和PM2

```bash
# 安装Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2
sudo npm install -g pm2
```

### 3. 安装MySQL

```bash
# 安装MySQL 8.0
sudo apt install -y mysql-server

# 安全配置
sudo mysql_secure_installation

# 创建数据库和用户
sudo mysql -e "CREATE DATABASE shuijing_erp;"
sudo mysql -e "CREATE USER 'erp_user'@'localhost' IDENTIFIED BY 'erp123456';"
sudo mysql -e "GRANT ALL PRIVILEGES ON shuijing_erp.* TO 'erp_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

### 4. 安装Nginx

```bash
# 安装Nginx
sudo apt install -y nginx

# 启用服务
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 5. 部署应用代码

```bash
# 创建部署目录
sudo mkdir -p /www/wwwroot/shuijing-erp
sudo chown -R ubuntu:ubuntu /www/wwwroot/shuijing-erp

# 克隆代码（或上传代码包）
cd /www/wwwroot/shuijing-erp
git clone https://github.com/your-repo/shuijing-erp.git .

# 安装依赖
npm install

# 构建前端
npm run build

# 配置环境变量
cp api/.env.example api/.env
# 编辑 api/.env 文件，配置数据库连接等
```

## 🔧 优化配置

### 1. Nginx优化配置

使用提供的优化配置文件：

```bash
# 配置Nginx
# 创建Nginx配置文件
sudo nano /etc/nginx/sites-available/shuijing-erp

# 修改域名配置
sudo sed -i 's/your-domain.com/实际域名/g' /etc/nginx/sites-available/shuijing-erp

# 启用站点
sudo ln -sf /etc/nginx/sites-available/shuijing-erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 2. SSL证书配置

```bash
# 运行SSL配置脚本
chmod +x ssl-setup.sh

# 编辑脚本中的域名和邮箱
vim ssl-setup.sh

# 执行SSL配置
sudo ./ssl-setup.sh
```

### 3. 安全加固

```bash
# 运行安全加固脚本
chmod +x security-hardening.sh
sudo ./security-hardening.sh
```

### 4. 性能优化

```bash
# 运行性能优化脚本
chmod +x performance-optimization.sh
sudo ./performance-optimization.sh
```

### 5. 监控系统

```bash
# 配置监控系统
# 手动配置系统监控
sudo apt install -y htop iotop
```

## 📊 监控和维护

### 监控仪表板

访问 `https://your-domain.com/monitoring/dashboard.html` 查看系统状态。

### 日常维护命令

```bash
# 查看PM2进程状态
pm2 status
pm2 logs

# 查看系统资源
htop
df -h
free -h

# 查看服务状态
sudo systemctl status nginx
sudo systemctl status mysql
sudo systemctl status redis-server

# 查看监控日志
tail -f /var/log/monitoring/alerts.log

# 生成性能报告
/opt/monitoring/scripts/generate-report.sh
```

### 备份策略

```bash
# 数据库备份
mysqldump -u erp_user -p shuijing_erp > backup_$(date +%Y%m%d).sql

# 代码备份
tar -czf code_backup_$(date +%Y%m%d).tar.gz /www/wwwroot/shuijing-erp

# 配置文件备份
tar -czf config_backup_$(date +%Y%m%d).tar.gz /etc/nginx /etc/mysql
```

## 🔍 故障排除

### 常见问题

#### 1. 前端页面无法访问

```bash
# 检查Nginx状态
sudo systemctl status nginx

# 检查Nginx配置
sudo nginx -t

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log
```

#### 2. API接口报错

```bash
# 检查PM2进程
pm2 status
pm2 logs

# 测试数据库连接
mysql -u erp_user -p -e "SELECT 1;"

# 查看API日志
tail -f /home/ubuntu/.pm2/logs/app-error.log
```

#### 3. 数据库连接失败

```bash
# 检查MySQL状态
sudo systemctl status mysql

# 测试数据库连接
mysql -u erp_user -p -e "SELECT 1;"

# 查看MySQL错误日志
sudo tail -f /var/log/mysql/error.log
```

#### 4. SSL证书问题

```bash
# 检查证书状态
sudo certbot certificates

# 手动续期证书
sudo certbot renew

# 测试证书配置
openssl s_client -connect your-domain.com:443
```

### 性能调优

#### 1. 数据库优化

```sql
-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SHOW GLOBAL STATUS LIKE 'Slow_queries';

-- 查看连接数
SHOW GLOBAL STATUS LIKE 'Threads_connected';
SHOW VARIABLES LIKE 'max_connections';

-- 查看缓存命中率
SHOW GLOBAL STATUS LIKE 'Qcache_hits';
SHOW GLOBAL STATUS LIKE 'Qcache_inserts';
```

#### 2. 应用优化

```bash
# 查看Node.js内存使用
pm2 monit

# 重启应用
pm2 restart all

# 查看应用性能
pm2 show shuijing-erp-api
```

## 📈 扩展和升级

### 水平扩展

1. **负载均衡配置**
   - 配置多个应用服务器
   - 使用Nginx负载均衡
   - 配置会话共享（Redis）

2. **数据库集群**
   - MySQL主从复制
   - 读写分离
   - 数据库连接池优化

### 版本升级

```bash
# 备份当前版本
pm2 stop all
cp -r /www/wwwroot/shuijing-erp /backup/shuijing-erp-$(date +%Y%m%d)

# 更新代码
cd /www/wwwroot/shuijing-erp
git pull origin main
npm install
npm run build

# 数据库迁移（如有）
node api/migrate.js

# 重启服务
pm2 restart all
```

## 🔐 安全最佳实践

### 1. 服务器安全

- 定期更新系统和软件包
- 配置防火墙规则
- 禁用不必要的服务
- 使用SSH密钥认证
- 定期备份重要数据

### 2. 应用安全

- 使用HTTPS加密传输
- 实施输入验证和SQL注入防护
- 配置CORS策略
- 使用安全的会话管理
- 定期安全审计

### 3. 数据库安全

- 使用强密码
- 限制数据库访问权限
- 启用二进制日志
- 定期备份数据
- 监控异常访问

## 📞 技术支持

### 联系方式

- 技术支持邮箱: support@your-domain.com
- 文档地址: https://docs.your-domain.com
- 问题反馈: https://github.com/your-repo/issues

### 维护时间

- 日常维护: 每日凌晨2:00-4:00
- 系统更新: 每周日凌晨1:00-3:00
- 紧急维护: 7x24小时响应

---

**注意**: 在生产环境中部署前，请务必在测试环境中验证所有配置和脚本。确保备份重要数据，并制定回滚计划。