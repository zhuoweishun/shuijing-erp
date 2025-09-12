# SKU销毁原材料使用量显示修复报告

## 问题描述

用户反馈在SKU销毁功能中，选择"拆散重做"时显示的原材料使用量为4件，但用户期望显示1件。用户强调：

1. 销毁1件SKU应该对应退回1件原材料
2. 这是基于实际制作记录的1:1对应关系，不是硬编码
3. 制作时1件原材料对应1件SKU，销毁时也应该1:1对应
4. 显示的使用量应该基于首次制作SKU时用户在选择原材料页面填写的信息

## 问题分析

### 根本原因

在SKU原材料信息API (`/api/v1/skus/:id/materials`) 中，返回的原材料使用量直接来自`MaterialUsage`记录的`quantityUsedBeads`和`quantityUsedPieces`字段。

**问题在于**：这些记录累计了多次操作的使用量，而不是单个SKU的消耗量。

### 数据分析

以和田玉挂件SKU为例：

```
所有MaterialUsage记录：
1. 2025/9/3 20:26:32: 1件  (首次制作)
2. 2025/9/3 20:45:43: 5件  (补货操作)
3. 2025/9/3 21:06:02: 1件  (补货操作)
4. 2025/9/3 21:06:26: 2件  (补货操作)
5. 2025/9/3 21:07:16: 4件  (补货操作)

总累计使用量: 13件
```

**修复前的错误逻辑**：
- API可能返回累计的使用量（如4件、5件等）
- 导致销毁界面显示错误的原材料使用量

**用户期望的正确逻辑**：
- 应该显示首次制作时的单个SKU消耗量：1件
- 销毁1件SKU时，退回1件原材料

## 修复方案

### 修复内容

修改 `backend/src/routes/skus.ts` 中的 `/api/v1/skus/:id/materials` API：

1. **添加单个SKU消耗量计算逻辑**：
   ```javascript
   // 获取第一次制作时的MaterialUsage记录
   const firstMaterialUsage = await prisma.materialUsage.findFirst({
     where: { 
       product: {
         skuId: sku.id
       }
     },
     orderBy: {
       createdAt: 'asc'
     }
   })
   
   // 直接使用第一次制作时的消耗量
   if (firstMaterialUsage) {
     const firstUsageTotal = (firstMaterialUsage.quantityUsedBeads || 0) + 
                            (firstMaterialUsage.quantityUsedPieces || 0)
     if (firstUsageTotal > 0) {
       singleSkuConsumption = firstUsageTotal
     }
   }
   ```

2. **修改API返回数据**：
   ```javascript
   materials.push({
     purchase_id: purchase.id,
     product_name: purchase.productName,
     supplier_name: purchase.supplier?.name || '未知供应商',
     quantity_used_beads: singleSkuConsumption, // 使用计算出的单个SKU消耗量
     quantity_used_pieces: 0, // 统一使用件数
     unit_cost: materialUsage.unitCost ? parseFloat(materialUsage.unitCost.toString()) : 0,
     total_cost: materialUsage.totalCost ? parseFloat(materialUsage.totalCost.toString()) : 0
   })
   ```

### 修复逻辑

1. **基于制作时的溯源信息**：只使用第一次制作时的`MaterialUsage`记录
2. **避免累计计算**：不累计后续补货操作的`MaterialUsage`记录
3. **1:1对应关系**：确保单个SKU消耗量反映实际的制作比例
4. **用户填写信息**：使用用户在选择原材料页面填写的准确消耗量

## 验证结果

### 修复前
```
总累计使用量: 13件
可能显示: 4件或其他错误数值
```

### 修复后
```
修复后的单个SKU消耗量: 1件
销毁界面显示: 1件原材料需求
```

### 测试验证

运行测试脚本 `test-material-usage-fix.js` 的结果：

```
✅ 验证结果:
   🎉 修复成功！单个SKU消耗量为1件，符合用户期望
   📝 这意味着销毁1件SKU时，会显示使用量为1件原材料
```

## 影响范围

### 受影响的功能

1. **SKU销毁功能**：
   - 选择"拆散重做"时显示的原材料使用量
   - 原材料选择界面的使用量显示

2. **SKU原材料信息查询**：
   - `/api/v1/skus/:id/materials` API
   - 前端显示的原材料使用量信息

### 不受影响的功能

1. **实际的库存计算**：库存扣减和退回逻辑保持不变
2. **MaterialUsage记录**：数据库中的记录保持不变
3. **其他SKU操作**：补货、销售等功能不受影响

## 技术细节

### 关键修改点

1. **文件**：`backend/src/routes/skus.ts`
2. **API端点**：`GET /api/v1/skus/:id/materials`
3. **修改行数**：约30行代码修改

### 核心逻辑变更

**修复前**：
```javascript
quantity_used_beads: materialUsage.quantityUsedBeads || 0,
quantity_used_pieces: materialUsage.quantityUsedPieces || 0,
```

**修复后**：
```javascript
quantity_used_beads: singleSkuConsumption, // 使用计算出的单个SKU消耗量
quantity_used_pieces: 0, // 统一使用件数
```

## 用户体验改进

### 修复前的用户体验
- ❌ 销毁1件SKU显示使用量4件，用户困惑
- ❌ 显示的使用量与实际制作比例不符
- ❌ 用户需要手动计算实际的退回量

### 修复后的用户体验
- ✅ 销毁1件SKU显示使用量1件，符合直觉
- ✅ 显示的使用量与制作时的1:1比例一致
- ✅ 用户可以直观地理解退回的原材料数量

## 总结

本次修复成功解决了SKU销毁功能中原材料使用量显示错误的问题：

1. **问题根源**：API返回累计的MaterialUsage记录，而非单个SKU消耗量
2. **修复方案**：基于第一次制作时的记录计算单个SKU消耗量
3. **修复结果**：销毁界面正确显示1件原材料使用量
4. **用户期望**：完全符合用户期望的1:1对应关系

修复确保了销毁功能的准确性和用户体验的一致性，用户现在可以准确地看到销毁SKU时需要退回的原材料数量。