# Supabase 手动集成指南

本指南将帮助您手动集成 Supabase 数据库到水晶销售管理系统。

## 步骤 1: 创建 Supabase 项目

1. 访问 [Supabase官网](https://supabase.com)
2. 注册账号并登录
3. 点击 "New Project" 创建新项目
4. 填写项目信息：
   - 项目名称：`crystal-erp` 或您喜欢的名称
   - 数据库密码：设置一个强密码并记住
   - 地区：选择离您最近的地区
5. 等待项目创建完成（通常需要1-2分钟）

## 步骤 2: 获取项目配置信息

1. 在项目仪表板中，点击左侧菜单的 "Settings" → "API"
2. 复制以下信息：
   - **Project URL**：类似 `https://xxxxx.supabase.co`
   - **anon public key**：以 `eyJ` 开头的长字符串

⚠️ **重要**：只使用 `anon` 密钥，不要使用 `service_role` 密钥！

## 步骤 3: 配置环境变量

1. 在项目根目录复制 `.env.example` 文件为 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入您的 Supabase 配置：
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## 步骤 4: 创建数据库表

1. 在 Supabase 仪表板中，点击左侧菜单的 "SQL Editor"
2. 点击 "New query"
3. 复制 `supabase/migrations/001_initial_schema.sql` 文件的全部内容
4. 粘贴到 SQL 编辑器中
5. 点击 "Run" 执行 SQL 脚本

如果执行成功，您应该看到以下表被创建：
- `user_profiles` - 用户配置表
- `purchases` - 采购记录表
- `products` - 成品记录表

## 步骤 5: 验证配置

1. 重启开发服务器：
   ```bash
   npm run dev
   ```

2. 打开浏览器访问应用
3. 如果配置正确，系统将自动检测到 Supabase 配置
4. 您可以在设置页面看到数据库连接状态

## 步骤 6: 启用身份认证（可选）

如果您需要用户登录功能：

1. 在 Supabase 仪表板中，点击 "Authentication" → "Settings"
2. 在 "Site URL" 中添加您的应用地址：`http://localhost:5173`
3. 启用您需要的登录方式（邮箱/密码、第三方登录等）

## 故障排除

### 问题 1: "Supabase未配置" 错误
- 检查 `.env` 文件是否存在且配置正确
- 确保环境变量名称以 `VITE_` 开头
- 重启开发服务器

### 问题 2: 数据库连接失败
- 检查 Project URL 是否正确
- 检查 anon key 是否正确
- 确保 Supabase 项目状态为 "Active"

### 问题 3: 权限错误
- 确保已执行完整的 SQL 迁移脚本
- 检查 RLS 策略是否正确创建
- 在 Supabase 仪表板的 "Authentication" 中检查用户状态

### 问题 4: 图片上传失败
- 确保存储桶 `crystal-photos` 已创建
- 检查存储桶的权限策略
- 确保用户已登录

## 数据迁移

如果您之前使用本地存储，可以通过以下方式迁移数据：

1. 在设置页面导出现有数据为 Excel 文件
2. 配置好 Supabase 后，使用导入功能将数据导入到数据库
3. 系统会自动将数据转换为 Supabase 格式

## 安全建议

1. **不要**将 `.env` 文件提交到版本控制系统
2. **不要**在前端代码中使用 `service_role` 密钥
3. 定期检查和更新 RLS 策略
4. 为生产环境设置适当的 CORS 策略
5. 启用 Supabase 的安全功能（如 IP 白名单等）

## 支持

如果您在集成过程中遇到问题：

1. 查看浏览器控制台的错误信息
2. 检查 Supabase 仪表板的日志
3. 参考 [Supabase 官方文档](https://supabase.com/docs)
4. 在项目 Issues 中提交问题

---

配置完成后，您的水晶销售管理系统将具备：
- 云端数据存储
- 用户身份认证
- 实时数据同步
- 图片云存储
- 数据安全保护