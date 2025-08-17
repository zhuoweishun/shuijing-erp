# npm镜像源问题解决方案

## 问题分析

您遇到的错误是因为当前npm使用的是阿里云镜像源 `https://cdn.npmmirror.com`，该镜像源中缺少bcrypt等包。

## 解决方案

### 方案一：切换到npm官方源（推荐）

在阿里云服务器上执行以下命令：

```bash
# 切换到npm官方源
npm config set registry https://registry.npmjs.org/

# 验证源是否切换成功
npm config get registry

# 清除npm缓存
npm cache clean --force

# 重新安装依赖
cd /www/wwwroot/shuijing-erp/api
npm install --omit=dev
```

### 方案二：使用淘宝镜像源

```bash
# 切换到淘宝镜像源
npm config set registry https://registry.npmmirror.com/

# 清除缓存并重新安装
npm cache clean --force
cd /www/wwwroot/shuijing-erp/api
npm install --omit=dev
```

### 方案三：临时使用官方源安装

```bash
cd /www/wwwroot/shuijing-erp/api
npm install --omit=dev --registry https://registry.npmjs.org/
```

### 方案四：使用yarn替代npm

```bash
# 安装yarn
npm install -g yarn --registry https://registry.npmjs.org/

# 使用yarn安装依赖
cd /www/wwwroot/shuijing-erp/api
yarn install --production
```

## 推荐执行步骤

1. **首先尝试方案一**（切换到npm官方源）
2. 如果网络较慢，可以尝试方案二（淘宝镜像）
3. 如果仍有问题，使用方案四（yarn）

## 验证安装成功

安装完成后，检查是否有错误：

```bash
# 检查安装的包
npm list --depth=0

# 测试API服务
node server.js
```

如果看到 "🚀 水晶ERP API服务已启动" 消息，说明安装成功。