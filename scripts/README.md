# 驼峰字段转换工具

这个工具用于批量查找和转换项目中不符合规范的驼峰字段为下划线字段。根据文档规范，API响应应使用下划线命名（snake_case）。

## 文件说明

- `convert-camel-to-snake.cjs` - 主要的转换脚本
- `field-analysis.cjs` - 字段分析脚本，用于生成详细的统计报告
- `README.md` - 使用说明文档

## 使用方法

### 1. 查看需要转换的字段

```bash
# 扫描并显示所有需要转换的驼峰字段
node scripts/convert-camel-to-snake.cjs
```

### 2. 查看详细的字段分析报告

```bash
# 显示字段统计信息和出现频率
node scripts/field-analysis.cjs
```

### 3. 执行批量替换

```bash
# 执行批量替换（谨慎使用，建议先备份代码）
node scripts/convert-camel-to-snake.cjs --replace
```

## 功能特性

### 智能排除规则

脚本会自动排除以下内容，避免误转换：

- **React组件名** - 如 `Component`、`Element` 等
- **函数名** - 以动词开头的函数，如 `getUserInfo`、`handleClick` 等
- **React Hooks** - 如 `useState`、`useEffect` 等
- **事件处理函数** - 如 `onClick`、`onChange` 等
- **布尔值前缀** - 如 `isLoading`、`hasPermission` 等
- **TypeScript类型名** - 如 `UserType`、`ApiResponse` 等
- **JavaScript内置方法** - 如 `toLowerCase`、`forEach`、`toFixed` 等
- **常见缩写** - 如 `API`、`HTTP`、`URL` 等

### 扫描范围

脚本会扫描 `src` 目录下的所有 `.ts` 和 `.tsx` 文件，重点关注：

1. **字段定义** - 接口和类型定义中的字段名
2. **属性访问** - 对象属性的访问
3. **字符串字面量** - API相关的字符串字段名

### 转换示例

| 原字段名 | 转换后 | 出现次数 | 说明 |
|---------|--------|----------|------|
| `createdAt` | `created_at` | 45次 | 创建时间字段 |
| `updatedAt` | `updated_at` | 45次 | 更新时间字段 |
| `supplierName` | `supplier_name` | 10次 | 供应商名称 |
| `productName` | `product_name` | 8次 | 产品名称 |
| `realName` | `real_name` | 6次 | 真实姓名 |

## 重点关注的API字段

根据分析，以下字段是API相关的重要字段，建议优先转换：

- `startDate` → `start_date`
- `endDate` → `end_date`
- `supplierName` → `supplier_name`
- `unitType` → `unit_type`
- `purchaseId` → `purchase_id`
- `productName` → `product_name`
- `realName` → `real_name`

## 安全提示

⚠️ **重要提醒**：

1. **备份代码** - 执行批量替换前，请确保代码已提交到Git或已备份
2. **测试验证** - 替换后请运行测试确保功能正常
3. **分步执行** - 建议先在小范围测试，确认无误后再全量执行
4. **文档同步** - 字段名修改后，需要同步更新相关文档

## 统计信息

当前项目扫描结果：
- 总计发现：**646个** 驼峰字段需要转换
- 涉及字段：**约200个** 不同的字段名
- 文件范围：`src` 目录下的所有 TypeScript 文件

### 按类型分布
- 字段定义：287个
- 属性访问：303个
- 字符串字面量：56个

## 注意事项

1. **数据库字段** - 数据库字段保持驼峰命名（camelCase）
2. **API响应** - API响应字段使用下划线命名（snake_case）
3. **前端组件** - React组件内部状态可以保持驼峰命名
4. **类型定义** - TypeScript接口定义建议使用下划线命名以匹配API

## 相关文档

- 《API接口统一规范文档》- 字段命名规范
- 《数据库设计与数据规则文档》- 数据库字段规范
- 《React前端开发规范文档》- 前端开发规范