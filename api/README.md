# 水晶ERP系统后端API

## 项目简介

这是水晶ERP系统的后端API服务，基于Express.js和MySQL构建，提供用户认证、产品管理、采购管理等功能。

## 技术栈

- **Node.js** - 运行环境
- **Express.js** - Web框架
- **MySQL** - 数据库
- **JWT** - 身份认证
- **Multer** - 文件上传
- **bcryptjs** - 密码加密

## 项目结构

```
api/
├── config/
│   └── database.js          # 数据库配置
├── middleware/
│   └── auth.js              # 认证中间件
├── routes/
│   ├── auth.js              # 认证路由
│   ├── users.js             # 用户管理路由
│   ├── products.js          # 产品管理路由
│   ├── purchases.js         # 采购管理路由
│   └── upload.js            # 文件上传路由
├── uploads/                 # 上传文件目录
├── .env                     # 环境变量配置
├── .env.example             # 环境变量示例
├── package.json             # 项目依赖
├── server.js                # 服务器入口文件
└── README.md                # 项目说明
```

## 本地开发

### 1. 安装依赖

```bash
cd api
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置相应的环境变量：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接信息：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=erp_user
DB_PASSWORD=erp123456
DB_NAME=shuijing_erp
```

### 3. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3001` 启动。

## 阿里云服务器部署

### 1. 上传代码到服务器

将整个 `api` 目录上传到阿里云服务器的 `/www/wwwroot/shuijing-erp/` 目录下。

### 2. 在宝塔面板中配置

#### 2.1 安装依赖

在宝塔面板的终端中执行：

```bash
cd /www/wwwroot/shuijing-erp/api
npm install --production
```

#### 2.2 配置环境变量

编辑 `.env` 文件，配置生产环境的数据库连接：

```env
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=erp_user
DB_PASSWORD=erp123456
DB_NAME=shuijing_erp
FRONTEND_URL=http://your-domain.com
```

#### 2.3 使用PM2管理进程

在宝塔面板的PM2管理器中：

1. 点击「添加项目」
2. 项目名称：`shuijing-erp-api`
3. 启动文件：`/www/wwwroot/shuijing-erp/api/server.js`
4. 项目目录：`/www/wwwroot/shuijing-erp/api`
5. 点击「提交」

#### 2.4 配置Nginx反向代理

在宝塔面板的网站设置中，添加反向代理：

```nginx
location /api {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 3. 测试API

访问 `http://your-domain.com/api/health` 检查API是否正常运行。

## API接口文档

### 认证接口

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/me` - 更新用户信息
- `PUT /api/auth/change-password` - 修改密码

### 用户管理接口（管理员）

- `GET /api/users` - 获取用户列表
- `GET /api/users/:id` - 获取用户详情
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户信息
- `PUT /api/users/:id/reset-password` - 重置用户密码
- `DELETE /api/users/:id` - 删除用户

### 产品管理接口

- `GET /api/products` - 获取产品列表
- `GET /api/products/:id` - 获取产品详情
- `POST /api/products` - 创建产品
- `PUT /api/products/:id` - 更新产品信息
- `DELETE /api/products/:id` - 删除产品
- `GET /api/products/stats/summary` - 获取产品统计

### 采购管理接口

- `GET /api/purchases` - 获取采购记录列表
- `GET /api/purchases/:id` - 获取采购记录详情
- `POST /api/purchases` - 创建采购记录
- `PUT /api/purchases/:id` - 更新采购记录
- `DELETE /api/purchases/:id` - 删除采购记录
- `GET /api/purchases/stats/summary` - 获取采购统计
- `GET /api/purchases/suppliers/list` - 获取供应商列表
- `GET /api/purchases/crystal-types/list` - 获取水晶类型列表

### 文件上传接口

- `POST /api/upload/single` - 单文件上传
- `POST /api/upload/multiple` - 多文件上传
- `GET /api/upload/files/:filename` - 获取文件
- `DELETE /api/upload/files/:filename` - 删除文件
- `GET /api/upload/files` - 获取文件列表（管理员）
- `POST /api/upload/cleanup` - 清理过期文件（管理员）

## 默认管理员账户

- 用户名：`admin`
- 密码：`admin123`
- 邮箱：`admin@shuijing.com`

**⚠️ 重要：请在生产环境中立即修改默认管理员密码！**

## 安全配置

1. **修改JWT密钥**：在生产环境中修改 `JWT_SECRET`
2. **修改默认密码**：修改默认管理员账户密码
3. **配置HTTPS**：在生产环境中启用HTTPS
4. **配置防火墙**：只开放必要的端口
5. **定期备份**：定期备份数据库和上传文件

## 故障排除

### 数据库连接失败

1. 检查数据库配置信息是否正确
2. 确认数据库用户权限
3. 检查数据库服务是否启动

### PM2进程启动失败

1. 检查Node.js版本是否兼容
2. 确认依赖包是否安装完整
3. 查看PM2日志：`pm2 logs shuijing-erp-api`

### 文件上传失败

1. 检查上传目录权限
2. 确认文件大小是否超过限制
3. 检查磁盘空间是否充足

## 联系支持

如有问题，请联系技术支持团队。