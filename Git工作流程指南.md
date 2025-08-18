# Git版本控制工作流程指南

## ✅ Git环境状态
- **Git版本**: 2.50.1.windows.1 ✅ 已安装
- **状态**: 可以直接使用

## 🔧 Git基础配置

### 第一步：配置用户信息

打开命令提示符或PowerShell，执行以下命令：

```bash
# 配置用户名（替换为您的真实姓名）
git config --global user.name "您的姓名"

# 配置邮箱（替换为您的邮箱）
git config --global user.email "your.email@example.com"

# 验证配置
git config --global --list
```

### 第二步：初始化项目仓库

在项目根目录执行：

```bash
# 初始化Git仓库
git init

# 添加所有文件到暂存区
git add .

# 创建初始提交
git commit -m "初始提交：水晶ERP系统"
```

## 🌐 连接远程仓库

### 选项1：GitHub（推荐）

1. **创建GitHub仓库**
   - 访问 https://github.com
   - 点击 "New repository"
   - 仓库名：`shuijing-erp`
   - 设置为私有仓库（Private）
   - 不要初始化README、.gitignore或LICENSE

2. **连接远程仓库**
   ```bash
   # 添加远程仓库（替换为您的GitHub用户名）
   git remote add origin https://github.com/您的用户名/shuijing-erp.git
   
   # 推送到远程仓库
   git branch -M main
   git push -u origin main
   ```

### 选项2：Gitee（国内访问更快）

1. **创建Gitee仓库**
   - 访问 https://gitee.com
   - 点击 "新建仓库"
   - 仓库名：`shuijing-erp`
   - 设置为私有仓库

2. **连接远程仓库**
   ```bash
   # 添加远程仓库
   git remote add origin https://gitee.com/您的用户名/shuijing-erp.git
   
   # 推送到远程仓库
   git branch -M main
   git push -u origin main
   ```

## 🔄 日常开发工作流程

### 标准开发流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 创建功能分支（可选，推荐）
git checkout -b feature/新功能名称

# 3. 进行开发工作
# ... 编写代码 ...

# 4. 查看修改状态
git status

# 5. 添加修改到暂存区
git add .
# 或者添加特定文件
git add src/pages/NewPage.tsx

# 6. 提交修改
git commit -m "feat: 添加新功能描述"

# 7. 推送到远程仓库
git push origin feature/新功能名称
# 或推送到主分支
git push origin main
```

### 提交信息规范

使用语义化提交信息：

```bash
# 新功能
git commit -m "feat: 添加产品管理页面"

# 修复bug
git commit -m "fix: 修复登录验证问题"

# 文档更新
git commit -m "docs: 更新API文档"

# 样式调整
git commit -m "style: 优化登录页面样式"

# 重构代码
git commit -m "refactor: 重构用户管理模块"

# 性能优化
git commit -m "perf: 优化数据库查询性能"

# 测试相关
git commit -m "test: 添加用户登录测试"
```

## 🏗️ 宝塔部署集成

### 方案1：手动部署

1. **本地开发完成后**
   ```bash
   # 提交并推送代码
   git add .
   git commit -m "feat: 完成新功能开发"
   git push origin main
   ```

2. **在宝塔服务器上**
   ```bash
   # 进入项目目录
   cd /www/wwwroot/shuijing-erp
   
   # 拉取最新代码
   git pull origin main
   
   # 安装依赖（如有新增）
   npm install
   
   # 构建前端
   npm run build
   
   # 重启后端服务
   pm2 restart ecosystem.config.cjs
   ```

### 方案2：自动化部署（推荐）

创建部署脚本 `deploy-to-baota.sh`：

```bash
#!/bin/bash
# 宝塔自动部署脚本

echo "开始部署水晶ERP系统..."

# 拉取最新代码
git pull origin main

# 检查是否有package.json变更
if git diff HEAD~1 HEAD --name-only | grep -q "package.json"; then
    echo "检测到依赖变更，重新安装..."
    npm install
fi

# 构建前端
echo "构建前端..."
npm run build

# 重启后端服务
echo "重启后端服务..."
pm2 restart ecosystem.config.cjs

echo "部署完成！"
```

在宝塔面板中设置Git钩子，代码推送后自动执行部署。

## 📁 .gitignore 配置

确保项目根目录有正确的 `.gitignore` 文件：

```gitignore
# 依赖目录
node_modules/

# 构建输出
dist/
build/

# 环境变量文件
.env
.env.local
.env.production

# 日志文件
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 运行时文件
pids/
*.pid
*.seed
*.pid.lock

# 上传文件
uploads/

# IDE文件
.vscode/
.idea/
*.swp
*.swo

# 操作系统文件
.DS_Store
Thumbs.db

# PM2文件
ecosystem.config.js

# 数据库文件
*.sqlite
*.db

# 临时文件
tmp/
temp/
```

## 🔐 安全最佳实践

### 1. 环境变量管理

- ✅ 将敏感信息放在 `.env` 文件中
- ✅ `.env` 文件加入 `.gitignore`
- ✅ 提供 `.env.example` 作为模板

### 2. 分支保护

```bash
# 创建开发分支
git checkout -b develop

# 功能开发在feature分支
git checkout -b feature/user-management

# 完成后合并到develop
git checkout develop
git merge feature/user-management

# 测试通过后合并到main
git checkout main
git merge develop
```

### 3. 代码审查

- 重要功能使用Pull Request
- 代码合并前进行审查
- 确保测试通过后再合并

## 🧪 测试和验证

### 部署前检查清单

```bash
# 1. 代码质量检查
npm run lint

# 2. 类型检查
npm run type-check

# 3. 构建测试
npm run build

# 4. 本地功能测试
npm run dev
# 手动测试主要功能

# 5. 提交代码
git add .
git commit -m "feat: 完成功能开发并通过测试"
git push origin main
```

## 🆘 常见问题解决

### 问题1：推送被拒绝
```bash
# 原因：远程仓库有新提交
# 解决：先拉取再推送
git pull origin main
git push origin main
```

### 问题2：合并冲突
```bash
# 查看冲突文件
git status

# 手动解决冲突后
git add 冲突文件名
git commit -m "resolve: 解决合并冲突"
```

### 问题3：撤销提交
```bash
# 撤销最后一次提交（保留修改）
git reset --soft HEAD~1

# 撤销最后一次提交（丢弃修改）
git reset --hard HEAD~1
```

## 🎯 完整工作流程示例

### 日常开发流程

```bash
# 1. 开始新的一天
git pull origin main

# 2. 创建功能分支
git checkout -b feature/product-search

# 3. 开发功能
# ... 编写代码 ...

# 4. 本地测试
npm run dev
# 测试功能是否正常

# 5. 提交代码
git add .
git commit -m "feat: 添加产品搜索功能"

# 6. 推送到远程
git push origin feature/product-search

# 7. 合并到主分支
git checkout main
git merge feature/product-search
git push origin main

# 8. 部署到宝塔
# 在宝塔服务器执行：git pull origin main && npm run build && pm2 restart ecosystem.config.cjs
```

现在您已经有了完整的Git工作流程，可以安全、高效地管理代码版本，实现本地开发到生产环境的无缝部署！