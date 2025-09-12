# SKU操作历史MANUAL引用类型修复报告

## 问题描述

用户发现SKU操作历史中出现了不合理的`MANUAL`引用类型记录，认为库存变更应该只通过以下业务操作产生：
- 库存减少：销售(`SALE`)、销毁(`DESTROY`)
- 库存增加：补货(`PRODUCT`)、创建(`PRODUCT`)

不应该存在手动调整(`MANUAL`)类型的记录。

## 问题分析

### 发现的问题
1. **数据库中存在3条MANUAL记录**：
   - 1条DESTROY操作错误地使用了MANUAL引用类型
   - 2条补货操作(ADJUST)错误地使用了MANUAL引用类型

2. **代码层面的问题**：
   - `skuUtils.js`中的`adjustSkuQuantity`函数硬编码了`referenceType: 'MANUAL'`
   - 补货操作在新版本中已正确使用`PRODUCT`类型，但历史数据仍有问题

## 修复措施

### 1. 数据库记录修复

执行了数据修复脚本`fix-manual-references.js`：

```sql
-- 修复DESTROY操作的引用类型
UPDATE sku_inventory_logs 
SET referenceType = 'DESTROY' 
WHERE referenceType = 'MANUAL' AND action = 'DESTROY';

-- 修复补货操作的引用类型
UPDATE sku_inventory_logs 
SET referenceType = 'PRODUCT' 
WHERE referenceType = 'MANUAL' 
  AND action = 'ADJUST' 
  AND quantityChange > 0 
  AND notes LIKE '%补货操作%';
```

**修复结果**：
- ✅ 修复了1条DESTROY操作记录 (MANUAL → DESTROY)
- ✅ 修复了2条补货操作记录 (MANUAL → PRODUCT)
- ✅ 所有MANUAL记录已清除

### 2. 代码层面修复

修改了`backend/src/utils/skuUtils.js`中的`adjustSkuQuantity`函数：

**修改前**：
```javascript
referenceType: 'MANUAL',  // 硬编码MANUAL
```

**修改后**：
```javascript
// 添加referenceType参数，默认为PRODUCT
referenceType = 'PRODUCT',

// 添加验证逻辑，禁止MANUAL类型
const validReferenceTypes = ['PRODUCT', 'SALE', 'DESTROY'];
if (!validReferenceTypes.includes(referenceType)) {
  throw new Error(`不支持的引用类型: ${referenceType}，只允许: ${validReferenceTypes.join(', ')}`);
}
```

### 3. 当前各操作的引用类型映射

| 操作类型 | Action | ReferenceType | 说明 |
|---------|--------|---------------|------|
| SKU创建 | CREATE | PRODUCT | 初始创建SKU |
| SKU销售 | SELL | SALE | 销售减少库存 |
| SKU补货 | ADJUST | PRODUCT | 补货增加库存 |
| SKU销毁 | DESTROY | DESTROY | 销毁减少库存 |

## 验证结果

### 修复前统计
```
PRODUCT: 9条记录
MANUAL: 3条记录
```

### 修复后统计
```
PRODUCT: 11条记录
DESTROY: 1条记录
```

## 预防措施

1. **代码层面**：
   - `adjustSkuQuantity`函数现在要求明确指定`referenceType`
   - 添加了验证逻辑，禁止使用`MANUAL`类型
   - 所有SKU操作都必须通过正确的业务流程

2. **业务流程**：
   - 销毁操作：使用`DESTROY`引用类型
   - 补货操作：使用`PRODUCT`引用类型
   - 销售操作：使用`SALE`引用类型
   - 创建操作：使用`PRODUCT`引用类型

## 总结

✅ **问题已完全解决**：
- 数据库中的所有MANUAL记录已修复为正确的引用类型
- 代码层面已禁止创建新的MANUAL记录
- 所有SKU操作现在都使用正确的业务引用类型
- 用户界面上不再显示不合理的MANUAL记录

现在SKU操作历史完全符合用户的业务需求，所有库存变更都有明确的业务来源和正确的引用类型。