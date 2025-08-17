# npm安装问题解决指南

## 问题描述

在阿里云服务器上安装npm依赖时遇到以下错误：
```
npm ERR! 404 Not Found - GET https://cdn.npmmirror.com/binaries/npm/bcryptjs
npm ERR! 404 'bcryptjs@^2.4.3' is not in this registry.
```

## 解决方案

### ✅ 方案一：使用更新后的package.json（推荐）

我们已经将 `bcryptjs` 替换为 `bcrypt`，这是一个更稳定且广泛支持的包。

**操作步骤：**

1. 确保使用最新的 `api/package.json` 文件
2. 在服务器上执行安装命令：

```bash
cd /www/wwwroot/shuijing-erp/api
npm install --omit=dev
```

### 方案二：更换npm镜像源

如果仍然遇到问题，可以尝试更换npm镜像源：

```bash
# 使用官方镜像源
npm config set registry https://registry.npmjs.org/

# 或使用淘宝镜像源
npm config set registry https://registry.npmmirror.com/

# 然后重新安装
npm install --omit=dev
```

### 方案三：清除npm缓存

```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules和package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install --omit=dev
```

### 方案四：使用yarn替代npm

```bash
# 安装yarn
npm install -g yarn

# 使用yarn安装依赖
yarn install --production
```

## 已修复的内容

### 1. 依赖包更新
- ✅ 将 `bcryptjs@^2.4.3` 替换为 `bcrypt@^5.1.1`
- ✅ bcrypt包更稳定，在各种环境下兼容性更好

### 2. 代码适配
- ✅ 更新 `api/routes/auth.js` 中的引用
- ✅ 更新 `api/routes/users.js` 中的引用
- ✅ API保持完全兼容，无需修改其他代码

## 验证安装

安装完成后，可以通过以下方式验证：

```bash
# 检查依赖是否正确安装
npm list

# 启动API服务测试
node server.js
```

如果看到以下输出，说明安装成功：
```
🚀 水晶ERP API服务已启动
📍 服务地址: http://localhost:3001
🌍 环境: production
⏰ 启动时间: 2024-01-15 16:30:00
```

## 常见问题

### Q: 为什么要替换bcryptjs？
A: bcrypt是原生C++实现，性能更好且更稳定。bcryptjs是纯JavaScript实现，在某些环境下可能遇到兼容性问题。

### Q: 替换后会影响现有数据吗？
A: 不会。bcrypt和bcryptjs使用相同的哈希算法，现有的密码哈希值完全兼容。

### Q: 如果还是安装失败怎么办？
A: 可以尝试：
1. 检查Node.js版本（推荐v16+）
2. 检查网络连接
3. 联系服务器管理员检查防火墙设置

## 下一步操作

安装成功后，请按照 `部署指南.md` 继续进行：
1. 配置环境变量
2. 使用PM2启动API服务
3. 配置Nginx反向代理
4. 部署前端应用