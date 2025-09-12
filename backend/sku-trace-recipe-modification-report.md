# SKU溯源功能修改报告 - 从采购记录到制作配方

## 修改概述

根据用户需求，将SKU溯源功能从显示"采购记录使用情况"修改为显示"单个SKU的制作配方"。这是一个重要的业务逻辑调整，确保溯源信息正确反映SKU的固定制作组成。

## 问题分析

### 原有问题
1. **业务逻辑混淆**：溯源API显示的是采购记录的使用情况，而不是SKU的制作配方
2. **信息误导**：前端显示"使用0"等采购状态信息，与SKU制作配方无关
3. **数据结构不匹配**：API返回的traces格式不适合表示制作配方

### 用户期望
- SKU溯源应显示**固定的制作配方**
- 包含：原材料名称、单个SKU需要的数量、CG编号、供应商信息
- 基于第一次制作时的MaterialUsage记录
- 与采购记录的库存状态无关

## 修改内容

### 1. 后端API修改

#### 文件：`backend/src/routes/skus.ts`

**修改前**：
- API路径：`GET /api/v1/skus/:id/traces`
- 返回采购记录使用情况
- 数据结构：`{ traces: TraceNode[] }`

**修改后**：
- API路径：`GET /api/v1/skus/:id/trace`
- 返回SKU制作配方
- 数据结构：
```json
{
  "success": true,
  "message": "SKU制作配方获取成功",
  "data": {
    "sku_info": {
      "id": "string",
      "sku_code": "string",
      "sku_name": "string",
      "specification": "string",
      "total_quantity": number
    },
    "recipe": [
      {
        "id": "recipe-{purchase_id}",
        "type": "recipe",
        "material_name": "string",
        "specification": "string",
        "quantity_per_sku": number,
        "unit": "string",
        "supplier": "string",
        "cg_number": "string",
        "unit_cost": number,
        "total_cost_per_sku": number,
        "quality_grade": "string",
        "purchase_date": "string",
        "details": {
          "purchase_id": "string",
          "material_id": "string",
          "product_type": "string",
          "description": "string"
        }
      }
    ],
    "summary": {
      "total_materials": number,
      "total_cost_per_sku": number
    }
  }
}
```

#### 核心逻辑改进

1. **单个SKU消耗量计算**：
```javascript
// 计算单个SKU的消耗量：总消耗量 / SKU总数量
if (firstUsageTotal > 0 && sku.totalQuantity > 0) {
  singleSkuConsumption = Math.round(firstUsageTotal / sku.totalQuantity)
  if (singleSkuConsumption < 1) singleSkuConsumption = 1 // 最少为1
}
```

2. **避免重复处理**：
```javascript
// 避免重复处理同一个采购记录
if (processedPurchaseIds.has(purchase.id)) {
  continue
}
processedPurchaseIds.add(purchase.id)
```

3. **配方记录构建**：
```javascript
const recipeRecord = {
  id: `recipe-${purchase.id}`,
  type: 'recipe',
  material_name: purchase.productName,
  specification: correctSpecification,
  quantity_per_sku: singleSkuConsumption, // 单个SKU需要的数量
  unit: unit,
  supplier: purchase.supplier?.name || '未知供应商',
  cg_number: purchase.purchaseCode || '无CG编号',
  unit_cost: correctPrice, // 单位成本
  total_cost_per_sku: unitCostForSingleSku, // 单个SKU的总成本
  quality_grade: purchase.quality || '未设置',
  purchase_date: purchase.purchaseDate,
  details: {
    purchase_id: purchase.id,
    material_id: purchase.id,
    product_type: purchase.productType,
    description: `制作单个${sku.skuName}需要${singleSkuConsumption}${unit}${purchase.productName}`
  }
}
```

### 2. 前端API调用修改

#### 文件：`src/services/api.ts`

**修改**：
```typescript
// 获取SKU溯源信息（制作配方）
getTraces: (id: string) => apiClient.get(`/skus/${id}/trace`),
```

### 3. 前端组件修改

#### 文件：`src/components/SkuTraceView.tsx`

**主要改进**：

1. **数据状态管理**：
```typescript
const [recipeData, setRecipeData] = useState<any[]>([])
const [skuInfo, setSkuInfo] = useState<any>(null)
const [summary, setSummary] = useState<any>(null)
```

2. **API响应处理**：
```typescript
if (response.success && response.data) {
  setRecipeData(response.data.recipe || [])
  setSkuInfo(response.data.sku_info || null)
  setSummary(response.data.summary || null)
}
```

3. **UI界面优化**：
- 添加SKU配方信息概览区域
- 修改原材料列表显示为配方列表
- 更新展开详情为配方详情
- 调整字段显示（quantity_per_sku、cg_number等）

## 测试验证

### 测试脚本：`test-trace-logic.js`

创建了直接数据库查询测试脚本，验证溯源逻辑：

```javascript
// 测试结果示例
📦 测试SKU: SKU20250901001 - 琥珀雕件（销售成品）
   总数量: 5
   规格: 8mm

🔍 [SKU配方] SKU: SKU20250901001, 总数量: 5, 单个SKU消耗量: 1

🧾 制作配方 (1种原材料):
   1. 琥珀雕件
      规格: 8mm
      单个SKU需要: 1件
      供应商: 丽人珠宝
      CG编号: CG20250901145394
      单位成本: ¥751.44
      单个SKU总成本: ¥751.44
      品质等级: AB
      采购日期: 2025/9/1
      说明: 制作单个琥珀雕件（销售成品）需要1件琥珀雕件

📊 配方汇总:
   原材料种类: 1种
   单个SKU总成本: ¥751.44
```

## 业务价值

### 1. 准确的配方信息
- 显示制作单个SKU需要的确切原材料组成
- 包含数量、规格、供应商、CG编号等关键信息
- 基于实际制作记录，确保数据准确性

### 2. 成本核算支持
- 提供单个SKU的原材料成本明细
- 支持成本分析和定价决策
- 便于核算利润率

### 3. 质量追溯
- 明确每个SKU的原材料来源
- 支持质量问题追溯
- 便于供应商管理

### 4. 生产指导
- 为后续生产提供标准配方
- 确保产品一致性
- 支持批量生产计划

## 技术特点

### 1. 数据一致性
- 基于第一次制作时的MaterialUsage记录
- 避免补货记录干扰配方信息
- 确保配方的固定性和准确性

### 2. 性能优化
- 使用Set避免重复处理采购记录
- 按原材料名称排序，便于查看
- 合理的数据结构减少前端处理负担

### 3. 扩展性
- 支持多种原材料类型的价格字段选择
- 灵活的规格字段处理
- 预留扩展字段支持未来需求

## 总结

本次修改成功将SKU溯源功能从"采购记录使用情况"转换为"制作配方"，解决了业务逻辑混淆的问题。新的溯源功能：

✅ **正确显示制作配方**：单个SKU需要的原材料组成
✅ **包含关键信息**：数量、CG编号、供应商、成本等
✅ **基于实际记录**：使用第一次制作时的MaterialUsage数据
✅ **界面友好**：清晰的配方展示和详情查看
✅ **数据准确**：避免采购状态干扰，确保配方固定性

这一改进显著提升了SKU管理的准确性和实用性，为生产管理、成本核算和质量追溯提供了可靠的数据支持。