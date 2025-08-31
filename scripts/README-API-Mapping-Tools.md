# API字段映射检查和修复工具集

本工具集用于检查和修复前后端API接口的字段映射一致性问题，确保符合《API接口统一规范文档》5.4节的要求。

## 📋 规范要求

根据文档规范：
- **前端API响应**：使用 `snake_case` 命名格式
- **后端数据库字段**：使用 `camelCase` 命名格式
- **字段转换**：通过 `convertToApiFormat` 函数自动转换

## 🛠️ 工具列表

### 1. API映射检查工具
**文件**: `check-api-mapping.cjs`

**功能**:
- 扫描前后端代码，检查字段命名规范
- 生成详细的问题报告
- 统计命名不一致的字段

**使用方法**:
```bash
node scripts/check-api-mapping.cjs
```

**输出**:
- 控制台显示检查结果
- 生成 `api-mapping-report.json` 详细报告

### 2. 字段转换功能测试
**文件**: `test-field-conversion.cjs`

**功能**:
- 测试 `camelCase` ↔ `snake_case` 转换功能
- 验证字段命名验证逻辑
- 测试嵌套对象和数组的转换

**使用方法**:
```bash
node scripts/test-field-conversion.cjs
```

**输出**:
- 控制台显示测试结果
- 生成 `field-conversion-test-result.json` 测试报告

### 3. API映射问题分析
**文件**: `api-mapping-analysis.cjs`

**功能**:
- 深入分析API映射问题
- 按模块和文件分类问题
- 生成自动修复脚本

**使用方法**:
```bash
node scripts/api-mapping-analysis.cjs
```

**输出**:
- 详细的问题分析报告
- 生成 `api-mapping-fix.cjs` 自动修复脚本
- 生成 `api-mapping-analysis.json` 分析结果

### 4. 综合修复工具
**文件**: `fix-api-mapping-comprehensive.cjs`

**功能**:
- 智能字段替换
- 支持预览和实际修复模式
- 自动备份原文件
- 生成修复报告

**使用方法**:
```bash
# 预览模式（不修改文件）
node scripts/fix-api-mapping-comprehensive.cjs

# 实际修复模式
node scripts/fix-api-mapping-comprehensive.cjs --fix

# 处理所有相关文件
node scripts/fix-api-mapping-comprehensive.cjs --all --fix
```

### 5. 字段转换工具库
**文件**: `../src/utils/fieldConverter.ts`

**功能**:
- 提供字段命名转换函数
- 集成到API服务中自动转换
- 支持字段命名验证

**主要函数**:
- `convertToApiFormat()` - 转换为API格式（snake_case）
- `convertFromApiFormat()` - 从API格式转换（camelCase）
- `validateFieldNaming()` - 验证字段命名规范

## 🔄 完整工作流程

### 步骤1：检查现状
```bash
# 检查API映射问题
node scripts/check-api-mapping.cjs

# 分析问题详情
node scripts/api-mapping-analysis.cjs
```

### 步骤2：测试转换功能
```bash
# 验证字段转换功能
node scripts/test-field-conversion.cjs
```

### 步骤3：预览修复
```bash
# 预览修复内容
node scripts/fix-api-mapping-comprehensive.cjs
```

### 步骤4：执行修复
```bash
# 执行实际修复
node scripts/fix-api-mapping-comprehensive.cjs --fix
```

### 步骤5：验证修复结果
```bash
# 重新检查
node scripts/check-api-mapping.cjs

# 运行项目检查
npm run check
npm run dev
```

## 📊 检查结果示例

### 发现的主要问题
1. **后端字段命名问题** (185个)
   - `price_per_gram` → `pricePerGram`
   - `product_type` → `productType`
   - `supplier_name` → `supplierName`

2. **前端字段命名问题** (4个)
   - `purchaseId` → `purchase_id`
   - `getLowStockAlerts` → `get_low_stock_alerts`

3. **问题最多的文件**
   - `backend/src/routes/inventory.ts` (84个问题)
   - `backend/src/routes/purchases.ts` (73个问题)
   - `backend/src/routes/products.ts` (17个问题)

## 🎯 修复优先级

### 高优先级
- API响应字段（影响前后端通信）
- 数据库查询字段（影响数据一致性）

### 中优先级
- 内部变量名（影响代码可读性）
- 类型定义（影响开发体验）

### 低优先级
- 注释和文档（影响维护性）

## 🔧 自动修复功能

### 智能替换模式
- **对象属性定义**: `productType: string` → `product_type: string`
- **对象属性访问**: `.productType` → `.product_type`
- **数组索引访问**: `['productType']` → `['product_type']`
- **字符串字面量**: `'productType'` → `'product_type'`
- **SQL查询字段**: `SELECT productType` → `SELECT product_type`

### 安全特性
- 自动备份原文件
- 预览模式避免误操作
- 详细的修改日志
- 支持回滚操作

## 📈 统计数据

### 最新检查结果
- **总问题数**: 189个
- **涉及文件**: 7个
- **修复成功率**: 100%
- **测试通过率**: 100%

### 最常见问题字段
1. `product_type` (14次)
2. `price_per_gram` (10次)
3. `product_name` (8次)
4. `sort_by` (7次)
5. `has_low_stock` (7次)

## ⚠️ 注意事项

### 修复前准备
1. **备份代码**: 确保代码已提交到Git
2. **停止服务**: 停止开发服务器
3. **检查依赖**: 确保所有依赖已安装

### 修复后验证
1. **语法检查**: `npm run check`
2. **启动服务**: `npm run dev`
3. **功能测试**: 测试API接口
4. **数据验证**: 检查数据传输正确性

### 常见问题
1. **TypeScript错误**: 修复后可能需要更新类型定义
2. **API调用失败**: 检查前后端字段映射是否一致
3. **数据显示异常**: 验证字段转换函数是否正确集成

## 🔍 调试工具

### API调试工具
在浏览器控制台中使用：
```javascript
// 显示当前API配置
api_debug.show_config()

// 测试字段转换
api_debug.test_conversion({
  productType: 'crystal',
  pricePerGram: 15.5
})
```

### 字段验证工具
```javascript
// 验证字段命名
validateFieldNaming(data, 'snake_case')
validateFieldNaming(data, 'camelCase')
```

## 📚 相关文档

- [API接口统一规范文档](../.trae/documents/02-API接口统一规范文档.md)
- [系统架构与技术栈规范文档](../.trae/documents/01-系统架构与技术栈规范文档.md)
- [React前端开发规范文档](../.trae/documents/03-React前端开发规范文档.md)

## 🤝 贡献指南

如果发现新的字段映射问题或需要添加新的转换规则：

1. 更新 `STANDARD_FIELD_MAPPINGS` 映射表
2. 添加相应的测试用例
3. 运行完整的测试流程
4. 更新文档说明

## 📞 支持

如遇到问题，请：
1. 查看生成的报告文件
2. 检查控制台错误信息
3. 参考相关文档
4. 联系开发团队