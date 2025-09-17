# 半成品库存数据同步问题分析报告

## 问题描述
用户反映刚创建的"油胆"单珠在半成品库存中显示数量为0颗，但实际录入时填写的是1颗。

## 根本原因分析

### 1. 触发器逻辑缺陷
原始的数据同步触发器 `tr_purchase_insert_material` 中，对于 `LOOSE_BEADS` 类型的数量计算逻辑存在问题：

```sql
-- 原始有问题的逻辑
WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN 
  CASE 
    WHEN NEW.bead_diameter = 4.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 25)
    WHEN NEW.bead_diameter = 6.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 11)
    -- ... 其他直径的计算
  END
```

**问题**：触发器完全依赖 `weight` 字段来计算数量，但前端录入时用户直接填写的是 `piece_count` 字段。

### 2. 前后端字段优先级不一致

#### 前端验证逻辑（PurchaseEntry.tsx）
- **LOOSE_BEADS** 必填字段：`purchase_name`, `supplier_name`, `bead_diameter`, `piece_count`, `total_price`
- **BRACELET** 必填字段：`purchase_name`, `supplier_name`, `bead_diameter`, `quantity`, 价格相关字段（三选二）
- **ACCESSORIES** 必填字段：`purchase_name`, `supplier_name`, `specification`, `piece_count`, `total_price`
- **FINISHED_MATERIAL** 必填字段：`purchase_name`, `supplier_name`, `specification`, `piece_count`, `total_price`

#### 后端Schema验证（purchases.ts）
所有数量相关字段都是 `optional()`，没有强制必填验证。

#### 触发器计算逻辑
优先使用 `weight` 字段而不是用户实际填写的 `piece_count` 字段。

## 具体案例分析："油胆"

### 数据状态
- **purchases表**：`piece_count = 1`, `weight = null`
- **materials表（修复前）**：`original_quantity = 0`
- **materials表（修复后）**：`original_quantity = 1`

### 问题流程
1. 用户在前端录入"油胆"，填写 `piece_count = 1`
2. 后端接收数据，`weight` 字段为 `null`
3. 触发器执行时，由于 `weight` 为 `null`，计算结果为 `0`
4. materials表中 `original_quantity` 被设置为 `0`
5. 半成品库存显示数量为 `0`

## 解决方案

### 1. 修复触发器逻辑
修改数量计算优先级，优先使用用户实际填写的字段：

```sql
-- 修复后的逻辑
WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN 
  -- 优先使用piece_count，如果为空或0才使用weight计算
  COALESCE(NEW.piece_count, 
    CASE 
      WHEN COALESCE(NEW.weight, 0) > 0 THEN
        CASE 
          WHEN NEW.bead_diameter = 4.0 THEN FLOOR(NEW.weight * 25)
          WHEN NEW.bead_diameter = 6.0 THEN FLOOR(NEW.weight * 11)
          -- ... 其他直径的计算
        END
      ELSE 0
    END
  )
```

### 2. 四个类别的正确计算逻辑

#### LOOSE_BEADS（散珠）
- 优先级：`piece_count` > `weight计算` > `0`
- 必填字段：`piece_count`

#### BRACELET（手串）
- 优先级：`total_beads` > `piece_count` > `weight计算` > `1`
- 必填字段：`quantity`（手串数量）

#### ACCESSORIES（饰品配件）
- 优先级：`piece_count` > `1`
- 必填字段：`piece_count`

#### FINISHED_MATERIAL（成品）
- 优先级：`piece_count` > `1`
- 必填字段：`piece_count`

### 3. 数据修复
对于已存在的问题数据，运行修复脚本：

```javascript
// 修复"油胆"数据的脚本已执行
// 结果：original_quantity: 0 -> 1, remaining_quantity: 0 -> 1
```

## 验证结果

### 全面检查结果
执行 `check_all_categories_sync.js` 检查所有四个类别：

```
📊 总材料记录: 8
❌ 有同步问题的记录: 0
✅ 正常记录: 8
📈 问题比例: 0.00%
🎉 所有数据同步正常！
```

### "油胆"修复验证
```json
{
  "purchases_data": [{
    "piece_count": 1,
    "purchase_type": "LOOSE_BEADS"
  }],
  "materials_data": [{
    "original_quantity": 1,
    "remaining_quantity": 1
  }],
  "raw_inventory_calculation": [{
    "original_quantity": 1,
    "remaining_quantity": 1
  }]
}
```

## 预防措施

### 1. 前后端一致性
- 确保前端必填字段验证与后端schema验证一致
- 触发器逻辑应与前端录入流程保持一致

### 2. 数据完整性检查
- 定期运行数据同步检查脚本
- 监控 `original_quantity = 0` 但有实际数量的异常记录

### 3. 测试覆盖
- 为每个产品类别创建端到端测试
- 验证录入 -> 同步 -> 显示的完整流程

## 总结

问题的根本原因是触发器中的数量计算逻辑与前端录入流程不匹配。通过修复触发器逻辑，优先使用用户实际填写的字段，并对已有数据进行修复，问题已完全解决。

现在"油胆"在半成品库存中应该正确显示为1颗。