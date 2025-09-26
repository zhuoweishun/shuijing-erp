# 文档 02：API接口统一规范文档

## 一、接口基础规范

### 1.1 基础URL
- 开发环境：`http://localhost:3001/api/v1`
- 生产环境：`http://api.dorblecapital.com/api/v1`

### 1.2 认证方式
所有API接口（除登录接口外）都需要在请求头中携带JWT Token：
```
Authorization: Bearer <token>
```

### 1.3 响应格式
所有API接口统一返回JSON格式：
```json
{
  "success": boolean,
  "message": string,
  "data": object | array | null,
  "error": {
    "code": string,
    "details": object
  }
}
```

## 二、认证接口

### 2.1 用户登录

**接口地址：** `POST /auth/login`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**请求示例：**
```json
{
  "username": "admin",
  "password": "123456"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_001",
      "username": "admin",
      "name": "管理员",
      "role": "BOSS"
    }
  }
}
```

## 三、SKU成品制作接口

### 3.1 获取可用原材料列表

**接口地址：** `GET /finished-products/materials`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| search | string | 否 | 原材料名称搜索 |
| available_only | boolean | 否 | 仅显示有库存的原材料，默认true |
| min_quantity | number | 否 | 最小库存数量，默认1 |
| material_types | array | 否 | 原材料类型筛选 |

**响应示例：**
```json
{
  "success": true,
  "message": "原材料列表获取成功",
  "data": {
    "materials": [
      {
        "id": "material_001",
        "material_code": "CG20250116001",
        "material_name": "紫水晶散珠",
        "material_type": "LOOSE_BEADS",
        "quality": "AA",
        "bead_diameter": 8.0,
        "specification": "8.0",
        "available_quantity": 1500,
        "inventory_unit": "PIECES",
        "unit_cost": 1.25,
        "supplier_name": "水晶供应商A",
        "photos": ["http://localhost:3001/uploads/purchases/image1.jpg"],
        "created_at": "2025-01-16T10:30:00.000Z"
      }
    ]
  }
}
```

### 3.2 成本计算接口

**接口地址：** `POST /finished-products/cost`

**请求参数：**
```json
{
  "materials": [
    {
      "material_id": "material_001",
      "quantity_used_beads": 20,
      "quantity_used_pieces": 0
    }
  ],
  "labor_cost": 20.0,
  "craft_cost": 100.0,
  "profit_margin": 50.0
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "成本计算成功",
  "data": {
    "material_cost": 25.0,
    "labor_cost": 20.0,
    "craft_cost": 100.0,
    "total_cost": 145.0,
    "suggested_price": 290.0,
    "profit_margin": 50.0
  }
}
```

### 3.3 组合制作模式创建SKU

**接口地址：** `POST /finished-products`

**请求参数：**
```json
{
  "sku_name": "紫水晶组合手串",
  "description": "精选紫水晶散珠组合制作",
  "specification": "8.0",
  "materials": [
    {
      "material_id": "material_001",
      "quantity_used_beads": 20,
      "quantity_used_pieces": 0
    }
  ],
  "labor_cost": 20.0,
  "craft_cost": 100.0,
  "selling_price": 280.0,
  "profit_margin": 48.21,
  "photos": ["http://localhost:3001/uploads/products/sku_001.jpg"]
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "SKU成品制作成功",
  "data": {
    "id": "sku_001",
    "sku_code": "SKU20250116001",
    "sku_name": "紫水晶组合手串",
    "material_cost": 25.0,
    "total_cost": 145.0,
    "selling_price": 280.0,
    "profit_margin": 48.21,
    "total_quantity": 1,
    "available_quantity": 1
  }
}
```

### 3.4 直接转化模式批量创建SKU

**接口地址：** `POST /finished-products/batch`

**请求参数：**
```json
{
  "products": [
    {
      "material_id": "material_001",
      "sku_name": "8mm紫水晶手串（销售成品）",
      "description": "",
      "specification": "8.0",
      "labor_cost": 20.0,
      "craft_cost": 100.0,
      "selling_price": 280.0,
      "photos": ["http://localhost:3001/uploads/purchases/image1.jpg"]
    }
  ]
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "批量创建成功",
  "data": {
    "success_count": 1,
    "failed_count": 0,
    "created_products": [
      {
        "id": "sku_002",
        "material_code": "CG20250116001",
        "sku_name": "8mm紫水晶手串（销售成品）",
        "material_cost": 25.0,
        "total_cost": 145.0,
        "selling_price": 280.0,
        "profit_margin": 48.21,
        "status": "ACTIVE"
      }
    ],
    "failed_products": []
  }
}
```

## 四、SKU管理接口

### 4.1 SKU列表查询

**接口地址：** `GET /skus`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认12（移动端）/20（桌面端） |
| search | string | 否 | SKU名称或编号搜索 |
| status | array | 否 | SKU状态筛选（ACTIVE/INACTIVE） |
| price_min | number | 否 | 最低价格 |
| price_max | number | 否 | 最高价格 |
| profit_margin_min | number | 否 | 最低利润率 |
| profit_margin_max | number | 否 | 最高利润率 |
| sort_by | string | 否 | 排序字段（created_at/sku_code/sku_name/selling_price/available_quantity） |
| sort_order | string | 否 | 排序方式（asc/desc），默认desc |

**响应示例：**
```json
{
  "success": true,
  "message": "SKU列表获取成功",
  "data": {
    "skus": [
      {
        "id": "sku_001",
        "sku_id": "sku_001",
        "sku_code": "SKU20250116001",
        "sku_name": "紫水晶组合手串",
        "specification": "8",
        "total_quantity": 5,
        "available_quantity": 3,
        "selling_price": 280.0,
        "unit_price": 280.0,
        "material_cost": 25.0,
        "labor_cost": 20.0,
        "craft_cost": 100.0,
        "total_cost": 145.0,
        "profit_margin": 48.21,
        "total_value": 840.0,
        "photos": ["http://localhost:3001/uploads/products/sku_001.jpg"],
        "status": "ACTIVE",
        "created_at": "2025-01-16T10:30:00.000Z",
        "updated_at": "2025-01-16T10:30:00.000Z",
        "last_sale_date": "2025-01-16T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 50,
      "total_pages": 5
    }
  }
}
```

### 4.2 SKU详情查询

**接口地址：** `GET /skus/:id`

**响应示例：**
```json
{
  "success": true,
  "message": "SKU详情获取成功",
  "data": {
    "id": "sku_001",
    "sku_code": "SKU20250116001",
    "sku_name": "紫水晶组合手串",
    "specification": "8",
    "description": "精选紫水晶散珠组合制作",
    "total_quantity": 5,
    "available_quantity": 3,
    "selling_price": 280.0,
    "unit_price": 280.0,
    "material_cost": 25.0,
    "labor_cost": 20.0,
    "craft_cost": 100.0,
    "total_cost": 145.0,
    "total_value": 840.0,
    "profit_margin": 48.21,
    "photos": ["http://localhost:3001/uploads/products/sku_001.jpg"],
    "status": "ACTIVE",
    "material_traces": [
      {
        "material_id": "material_001",
        "material_name": "紫水晶散珠",
        "quantity_used": 20,
        "unit": "颗",
        "cost_per_unit": 1.25,
        "supplier": "水晶供应商A",
        "batch_number": "CG20250116001"
      }
    ],
    "created_at": "2025-01-16T10:30:00.000Z",
    "updated_at": "2025-01-16T10:30:00.000Z",
    "last_sale_date": "2025-01-16T10:30:00.000Z"
  }
}
```

### 4.3 SKU销售接口

**接口地址：** `POST /skus/:id/sell`

**功能说明：** 销售指定数量的SKU，减少库存并记录销售信息

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| quantity | number | 是 | 销售数量 |
| customer_name | string | 是 | 客户姓名 |
| customer_phone | string | 是 | 客户电话 |
| customer_address | string | 否 | 客户地址 |
| sale_channel | string | 否 | 销售渠道 |
| notes | string | 否 | 备注信息 |
| actual_total_price | number | 否 | 实际销售总价（支持优惠价格） |

**请求示例：**
```json
{
  "quantity": 2,
  "customer_name": "张三",
  "customer_phone": "13800138000",
  "customer_address": "北京市朝阳区",
  "sale_channel": "线下门店",
  "notes": "客户要求包装精美",
  "actual_total_price": 560.0
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "SKU销售成功",
  "data": {
    "sale_id": "sale_001",
    "sku_id": "sku_001",
    "quantity_sold": 2,
    "unit_price": 280.0,
    "total_price": 560.0,
    "actual_total_price": 560.0,
    "remaining_quantity": 1,
    "sale_date": "2025-01-16T10:30:00.000Z"
  }
}
```

### 4.4 SKU销毁接口

**接口地址：** `DELETE /skus/:id/destroy`

**功能说明：** 销毁指定数量的SKU，可选择是否返还原材料到库存

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| quantity | number | 是 | 销毁数量 |
| reason | string | 是 | 销毁原因 |
| return_to_material | boolean | 是 | 是否返还原材料到库存 |
| selected_materials | array | 否 | 选择返还的原材料ID列表 |
| custom_return_quantities | object | 否 | 自定义返还数量 |

**请求示例：**
```json
{
  "quantity": 1,
  "reason": "质量问题",
  "return_to_material": true,
  "selected_materials": ["material_001"],
  "custom_return_quantities": {
    "material_001": 20
  }
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "SKU销毁成功",
  "data": {
    "destroy_id": "destroy_001",
    "sku_id": "sku_001",
    "quantity_destroyed": 1,
    "remaining_quantity": 2,
    "returned_materials": [
      {
        "material_id": "material_001",
        "material_name": "紫水晶散珠",
        "returned_quantity": 20,
        "unit": "颗"
      }
    ],
    "destroy_date": "2025-01-16T10:30:00.000Z"
  }
}
```

### 4.5 SKU库存调整接口

**接口路径：** `POST /api/v1/skus/{id}/adjust`

**功能说明：** 调整SKU库存数量（增加或减少）

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | SKU ID |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| type | string | 是 | 调整类型（increase/decrease） |
| quantity | number | 是 | 调整数量 |
| reason | string | 是 | 调整原因 |
| cost_adjustment | number | 否 | 成本调整 |

**请求示例：**
```json
{
  "type": "increase",
  "quantity": 2,
  "reason": "补货",
  "cost_adjustment": 0
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "库存调整成功",
  "data": {
    "sku_id": "sku_123",
    "old_quantity": 8,
    "new_quantity": 10,
    "adjustment": 2,
    "reason": "补货",
    "adjusted_at": "2024-01-01T00:00:00Z"
  }
}
```

### 4.6 SKU库存变更历史接口

**接口路径：** `GET /api/v1/skus/{id}/history`

**功能说明：** 获取SKU的库存变更历史记录

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | SKU ID |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页条数，默认20 |
| operation_type | string | 否 | 操作类型筛选（create/sell/destroy/adjust_increase/adjust_decrease） |
| start_date | string | 否 | 开始日期（YYYY-MM-DD） |
| end_date | string | 否 | 结束日期（YYYY-MM-DD） |
| operator | string | 否 | 操作员筛选 |

**响应示例：**
```json
{
  "success": true,
  "message": "获取库存变更历史成功",
  "data": {
    "history": [
      {
        "log_id": "log_001",
        "sku_id": "sku_123",
        "operation_type": "sell",
        "quantity_change": -2,
        "quantity_before": 10,
        "quantity_after": 8,
        "unit_price": 299.00,
        "total_amount": 598.00,
        "operator_id": "user_001",
        "operator_name": "张三",
        "reason": "客户购买",
        "notes": "客户要求包装精美",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "total_pages": 3
    }
  }
}
```

### 4.4 SKU销售记录

**接口地址：** `POST /skus/:id/sell`

**请求参数：**
```json
{
  "quantity": 1,
  "reference_id": "sale_001",
  "notes": "销售给客户张三"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "SKU销售记录成功",
  "data": {
    "sku_id": "sku_001",
    "sku_code": "SKU20250116001",
    "sold_quantity": 1,
    "remaining_quantity": 2,
    "total_quantity": 5
  }
}
```

### 4.5 SKU销毁操作

**接口地址：** `DELETE /skus/:id/destroy`

**请求参数：**
```json
{
  "quantity": 1,
  "reason": "质量问题",
  "return_to_material": true,
  "selected_materials": ["material_001"],
  "custom_return_quantities": {
    "material_001": 20
  }
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "SKU销毁成功",
  "data": {
    "sku_id": "sku_001",
    "destroyed_quantity": 1,
    "remaining_quantity": 1,
    "returned_materials": [
      {
        "material_id": "material_001",
        "material_name": "紫水晶散珠",
        "returned_quantity": 20,
        "new_quantity": 1520
      }
    ]
  }
}
```

### 4.6 SKU库存变更历史

**接口地址：** `GET /skus/:id/history`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |

**响应示例：**
```json
{
  "success": true,
  "message": "SKU历史记录获取成功",
  "data": {
    "logs": [
      {
        "log_id": "log_001",
        "sku_id": "sku_001",
        "action": "CREATE",
        "quantity_change": 1,
        "quantity_before": 0,
        "quantity_after": 1,
        "reason": "制作完成",
        "notes": "销毁原因：质量问题。返还原材料：紫水晶散珠 20颗",
        "operator_name": "管理员",
        "created_at": "2025-01-16T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "total_pages": 1
    }
  }
}
```

## 五、采购管理接口

### 5.1 采购列表查询（完整修复版）

**接口地址：** `GET /purchases`

**修复成果：**
- 实现了完整的多维度搜索、高级筛选、智能排序和响应式设计
- 支持产品名称和采购编号的独立搜索，500ms防抖处理
- 表头筛选器系统：多选、范围、日期、搜索筛选器
- 智能排序系统：规格动态排序，根据产品类型自动选择对应规格字段
- 分页管理系统：自定义分页、页码跳转、响应式分页
- 权限控制系统：角色检查、敏感数据过滤、操作权限控制

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认10，支持10/20/50/100 |
| search | string | 否 | 产品名称搜索（模糊匹配，500ms防抖） |
| purchase_code_search | string | 否 | **采购编号搜索（支持精确和模糊匹配）** |
| quality | array/string | 否 | 品质筛选（支持多选：AA/A/AB/B/C/UNKNOWN） |
| purchase_types | array/string | 否 | 产品类型筛选（支持多选：LOOSE_BEADS/BRACELET/ACCESSORIES/FINISHED_MATERIAL） |
| supplier | array/string | 否 | 供应商筛选（支持多选和模糊匹配） |
| start_date | string | 否 | 开始日期（YYYY-MM-DD格式） |
| end_date | string | 否 | 结束日期（YYYY-MM-DD格式） |
| diameter_min | number | 否 | 珠径最小值（mm） |
| diameter_max | number | 否 | 珠径最大值（mm） |
| specification_min | number | 否 | 规格最小值 |
| specification_max | number | 否 | 规格最大值 |
| price_per_gram_min | number | 否 | 克价最小值（元/克） |
| price_per_gram_max | number | 否 | 克价最大值（元/克） |
| total_price_min | number | 否 | 总价最小值（元） |
| total_price_max | number | 否 | 总价最大值（元） |
| sort_by | string | 否 | 排序字段（purchase_date/purchase_code/purchase_name/supplier/quantity/price_per_gram/total_price/bead_diameter/specification） |
| sort_order | string | 否 | 排序方式（asc/desc），默认采购日期倒序 |

**核心功能特性：**
- **多维度搜索**：支持产品名称和采购编号的独立搜索，组合搜索
- **表头筛选器系统**：多选筛选器、范围筛选器、日期筛选器、搜索筛选器
- **智能排序系统**：规格动态排序，根据产品类型自动选择对应规格字段
- **分页管理系统**：自定义分页、页码跳转、响应式分页显示
- **权限控制系统**：EMPLOYEE角色自动过滤敏感价格字段
- **响应式设计**：桌面端表格、移动端卡片、自适应布局
- **性能优化**：数据缓存、防抖搜索、虚拟滚动、图片懒加载

**筛选器类型映射：**
```typescript
const filter_types = {
  purchase_name: 'search',
  purchase_code: 'search', 
  quality: 'multi_select',
  purchase_type: 'multi_select',
  supplier: 'multi_select_with_search',
  bead_diameter: 'range',
  specification: 'range',
  price_per_gram: 'range',
  total_price: 'range',
  purchase_date: 'date_range'
}
```

**规格字段动态映射：**
```typescript
const get_specification_field = (purchase_type: string) => {
  const field_mapping = {
    'LOOSE_BEADS': 'bead_diameter',
    'BRACELET': 'bracelet_inner_diameter',
    'ACCESSORIES': 'accessory_specification', 
    'FINISHED_MATERIAL': 'finished_material_specification'
  }
  return field_mapping[purchase_type] || 'bead_diameter'
}
```

**权限控制逻辑：**
```typescript
// 敏感字段过滤
const filter_sensitive_fields = (purchases: Purchase[], user_role: string) => {
  if (user_role === 'EMPLOYEE') {
    return purchases.map(purchase => ({
      ...purchase,
      price_per_gram: null,
      total_price: null,
      weight: null
    }))
  }
  return purchases
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "采购列表获取成功",
  "data": {
    "purchases": [
      {
        "id": "purchase_001",
        "purchase_code": "CG20250116001",
        "purchase_name": "紫水晶散珠",
        "purchase_type": "LOOSE_BEADS",
        "quality": "AA",
        "bead_diameter": 8.0,
        "specification": 8.0,
        "quantity": 100,
        "piece_count": 1600,
        "price_per_gram": 25.0,
        "weight": 80.0,
        "total_price": 2000.00,
        "supplier": {
          "id": "supplier_001",
          "name": "水晶供应商A"
        },
        "photos": ["http://localhost:3001/uploads/purchases/image1.jpg"],
        "purchase_date": "2025-01-16T00:00:00.000Z",
        "notes": "品质优良，颜色均匀",
        "created_at": "2025-01-16T10:30:00.000Z",
        "edit_logs": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "total_pages": 5
    }
  }
}
```

### 3.2 采购记录创建（2025年1月修复版）

**接口地址：** `POST /purchases`

**修复内容：**
- **采购同步修复**：修复了采购录入没有同步到materials表的问题
- **字段名称统一**：purchase_name替代product_name，确保前后端字段完全一致
- **产品类型修复**：FINISHED_MATERIAL替代FINISHED，修复成品库存查询问题
- **数据类型处理**：修复了字符串拼接变数字相加的问题（"16"+"1"="161"变为16+1=17）
- **表单验证增强**：按类型差异化验证规则，提升数据质量
- **图片处理优化**：支持多文件上传、格式验证、大小限制和错误处理
- **materials表同步**：采购数据自动同步到materials表，确保库存数据一致性
- **错误处理完善**：用户友好的错误提示和重试机制

**请求参数（已修复）：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| purchase_name | string | 是 | 采购名称（修复：统一字段名，替代product_name） |
| purchase_type | string | 是 | 采购类型（LOOSE_BEADS/BRACELET/ACCESSORIES/FINISHED_MATERIAL） |
| supplier_id | string | 是 | 供应商ID |
| total_price | number | 是 | 总价格（修复：强制数字类型转换） |
| quality | string | 是 | 品质等级（AA/A/AB/B/C） |
| photos | array | 否 | 图片URL数组（JSON格式，修复：支持多文件上传） |
| notes | string | 否 | 备注 |
| price_per_gram | number | 否 | 克价（散珠/手串必填，修复：数字类型验证） |
| weight | number | 否 | 重量（散珠/手串必填，修复：数字类型验证） |
| bead_diameter | number | 否 | 珠子直径（散珠/手串必填，修复：数字类型验证） |
| beads_per_string | number | 否 | 每串颗数（手串必填） |
| piece_count | number | 否 | 片数/件数（配件/成品必填，修复：数字类型验证） |
| min_stock_alert | number | 否 | 最低预警颗数 |
| natural_language_input | string | 否 | 自然语言录入信息 |
| ai_recognition_result | object | 否 | AI识别结果 |

**表单验证规则（已修复）：**
```typescript
// 基础验证（修复：字段名称统一）
if (!data.purchase_name.trim()) errors.push('采购名称不能为空')
if (!data.supplier_id) errors.push('请选择供应商')
if (Number(data.total_price) <= 0) errors.push('总价格必须大于0') // 修复：强制数字转换
if (!data.photos || data.photos.length === 0) errors.push('请至少上传一张图片')

// 按类型差异化验证（修复：数据类型安全处理）
if (['LOOSE_BEADS', 'BRACELET'].includes(data.purchase_type)) {
  if (Number(data.price_per_gram) <= 0) errors.push('克价必须大于0')
  if (Number(data.weight) <= 0) errors.push('重量必须大于0')
  if (Number(data.bead_diameter) <= 0) errors.push('珠子直径必须大于0')
  
  if (data.purchase_type === 'BRACELET' && Number(data.beads_per_string) <= 0) {
    errors.push('每串颗数必须大于0')
  }
}

// 修复：FINISHED_MATERIAL替代FINISHED
if (['ACCESSORIES', 'FINISHED_MATERIAL'].includes(data.purchase_type)) {
  if (Number(data.piece_count) <= 0) errors.push('片数/件数必须大于0')
}

// 修复：materials表同步验证
if (!data.purchase_name) errors.push('采购名称是materials表同步的必要字段')
```

**自动计算逻辑（已修复）：**
```sql
-- 散珠总颗数计算（修复：数据类型安全处理）
total_beads = CASE 
  WHEN CAST(bead_diameter AS DECIMAL) = 4.0 THEN CAST(weight AS DECIMAL) * 25
  WHEN CAST(bead_diameter AS DECIMAL) = 6.0 THEN CAST(weight AS DECIMAL) * 11
  WHEN CAST(bead_diameter AS DECIMAL) = 8.0 THEN CAST(weight AS DECIMAL) * 6
  WHEN CAST(bead_diameter AS DECIMAL) = 10.0 THEN CAST(weight AS DECIMAL) * 4
  WHEN CAST(bead_diameter AS DECIMAL) = 12.0 THEN CAST(weight AS DECIMAL) * 3
  ELSE CAST(weight AS DECIMAL) * 5
END

-- materials表同步逻辑（修复：字段映射）
INSERT INTO materials (
  material_code, material_name, material_type, 
  remaining_quantity, unit_cost, inventory_unit,
  supplier_name, photos, created_at
) VALUES (
  purchase_code, purchase_name, purchase_type,  -- 修复：purchase_name映射到material_name
  COALESCE(total_beads, piece_count), 
  COALESCE(price_per_bead, price_per_piece),
  CASE purchase_type 
    WHEN 'LOOSE_BEADS' THEN 'PIECES'
    WHEN 'BRACELET' THEN 'STRINGS' 
    WHEN 'ACCESSORIES' THEN 'SLICES'
    WHEN 'FINISHED_MATERIAL' THEN 'ITEMS'  -- 修复：FINISHED_MATERIAL替代FINISHED
  END,
  supplier_name, photos, NOW()
)
```

**请求示例：**
```json
{
  "purchase_name": "紫水晶散珠",
  "purchase_type": "LOOSE_BEADS",
  "supplier_id": "supplier_001",
  "total_price": 2000.00,
  "quality": "AA",
  "price_per_gram": 25.0,
  "weight": 80.0,
  "bead_diameter": 8.0,
  "min_stock_alert": 50,
  "photos": ["http://localhost:3001/uploads/purchases/image1.jpg"],
  "notes": "品质优良，颜色均匀",
  "natural_language_input": "紫水晶散珠，8mm，AA级，25元/克，80克"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "采购记录创建成功",
  "data": {
    "id": "purchase_001",
    "purchase_code": "CG20241231001",
    "purchase_name": "紫水晶散珠",
    "purchase_type": "LOOSE_BEADS",
    "total_price": 2000.00,
    "remaining_quantity": 1600,
    "created_at": "2024-12-31T10:30:00.000Z"
  }
}
```

### 3.3 采购记录更新

**接口地址：** `PUT /purchases/:id`

**权限要求：** 仅BOSS角色可操作

**请求参数：** 与创建接口相同

### 3.4 采购记录删除

**接口地址：** `DELETE /purchases/:id`

**权限要求：** 仅BOSS角色可操作

**响应示例：**
```json
{
  "success": true,
  "message": "采购记录删除成功",
  "data": {
    "deleted_id": "purchase_001"
  }
}
```

## 四、成品制作接口

### 4.1 成品创建（组合制作模式）

**接口地址：** `POST /products`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| product_name | string | 是 | 成品名称 |
| description | string | 否 | 成品描述 |
| specification | string | 否 | 规格 |
| materials | array | 是 | 原材料使用记录 |
| labor_cost | number | 否 | 人工成本，默认0 |
| craft_cost | number | 否 | 工艺成本，默认0 |
| selling_price | number | 是 | 销售价格 |
| profit_margin | number | 否 | 目标利润率，默认30% |
| photos | array | 否 | 成品图片 |

**materials数组元素结构：**
```json
{
  "purchase_id": "purchase_001",
  "quantity_used_beads": 20,
  "quantity_used_pieces": 0
}
```

**成本计算规则：**
- 原材料成本 = Σ(使用数量 × 单位成本)
- 散珠/手串：使用quantity_used_beads × pricePerBead
- 配件/成品：使用quantity_used_pieces × pricePerPiece
- 总成本 = 原材料成本 + 人工成本 + 工艺成本
- 利润率 = (销售价格 - 总成本) / 销售价格 × 100%

### 4.2 成品批量创建（直接转化模式）

**接口地址：** `POST /products/batch`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| products | array | 是 | 成品信息数组 |

**products数组元素结构：**
```json
{
  "material_id": "purchase_001",
  "product_name": "紫水晶手串（销售成品）",
  "description": "成品描述",
  "labor_cost": 20.00,
  "craft_cost": 100.00,
  "selling_price": 280.00,
  "photos": ["可选，不传则自动继承原材料图片"]
}
```

**直接转化模式特点：**
- 自动继承原材料的图片和规格
- 原材料成本根据产品类型自动计算：
  - 散珠/手串：使用pricePerBead
  - 配件/成品：使用pricePerPiece
- 只能使用FINISHED类型的原材料
- 每个原材料只能转化1件成品

### 4.3 成本计算预估

**接口地址：** `POST /products/cost`

**功能说明：** 实时计算成品制作成本，用于组合制作模式的成本预估

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| materials | array | 是 | 原材料使用记录 |
| labor_cost | number | 否 | 人工成本，默认0 |
| craft_cost | number | 否 | 工艺成本，默认0 |
| profit_margin | number | 否 | 目标利润率，默认30% |

**响应示例：**
```json
{
  "success": true,
  "message": "成本计算成功",
  "data": {
    "material_cost": 150.00,
    "labor_cost": 20.00,
    "craft_cost": 100.00,
    "total_cost": 270.00,
    "profit_margin": 30,
    "pricing_suggestion": {
      "suggested_price": 351.00,
      "min_price": 297.00,
      "max_price": 540.00
    },
    "material_details": [
      {
        "purchase_id": "purchase_001",
        "product_name": "紫水晶散珠",
        "used_beads": 20,
        "used_pieces": 0,
        "unit_cost": 7.5,
        "material_cost": 150.00
      }
    ]
  }
}
```

### 4.4 成品列表查询

**接口地址：** `GET /products`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| search | string | 否 | 产品名称搜索 |
| status | string | 否 | 状态筛选 |

### 4.5 成品销毁

**接口地址：** `DELETE /products/:id`

**功能说明：** 销毁成品并自动回滚原材料库存

**业务规则：**
- 删除成品记录和关联的MaterialUsage记录
- 原材料库存自动重新计算（无需手动增加）
- 记录销毁操作日志
- 返回详细的回滚信息

**响应示例：**
```json
{
  "success": true,
  "message": "成品销毁成功，原材料库存已回滚",
  "data": {
    "deleted_product_id": "product_001",
    "rollback_details": [
      {
        "purchase_id": "purchase_001",
        "product_name": "紫水晶散珠",
        "returned_beads": 20,
        "returned_pieces": 0
      }
    ]
  }
}
```

## 五、库存管理接口（基于materials表架构）

### 5.1 materials库存查询接口

#### 5.1.1 材料库存列表查询

**接口地址：** `GET /api/materials`

**请求参数：**
```typescript
interface MaterialListRequest {
  page?: number
  limit?: number
  search?: string  // 搜索材料名称或编号
  material_type?: ProductType[]
  quality?: Quality[]
  stock_status?: ('SUFFICIENT' | 'LOW' | 'OUT')[]
  supplier_id?: string[]
  date_from?: string
  date_to?: string
  sort_by?: 'material_date' | 'material_name' | 'remaining_quantity' | 'unit_cost'
  sort_order?: 'asc' | 'desc'
}
```

**响应数据：**
```typescript
interface MaterialListResponse {
  materials: Material[]
  total: number
  page: number
  limit: number
  total_pages: number
}

interface Material {
  id: string
  material_code: string
  material_name: string
  material_type: ProductType
  quality: Quality
  
  // 规格信息（根据类型动态显示）
  bead_diameter?: number
  bracelet_inner_diameter?: number
  bracelet_bead_count?: number
  accessory_specification?: string
  finished_material_specification?: string
  
  // 库存信息
  original_quantity: number
  used_quantity: number
  remaining_quantity: number
  inventory_unit: UnitType
  
  // 价格信息
  unit_cost: number
  total_cost: number
  
  // 状态信息
  min_stock_alert?: number
  stock_status: 'SUFFICIENT' | 'LOW' | 'OUT'
  
  // 关联信息
  supplier?: {
    id: string
    name: string
  }
  source_purchase: {
    id: string
    purchase_code: string
    status: 'ACTIVE' | 'USED'
  }
  
  // 附加信息
  photos?: string[]
  material_date: string
  notes?: string
  
  // 审计信息
  created_at: string
  updated_at: string
  created_by: {
    id: string
    name: string
  }
}
```

#### 5.1.2 材料详情查询

**接口地址：** `GET /api/materials/:id`

**响应数据：**
```typescript
interface MaterialDetailResponse {
  material: Material
  usage_history: MaterialUsageRecord[]
  related_products: RelatedProduct[]
}

interface MaterialUsageRecord {
  id: string
  action: 'CREATE' | 'USE' | 'RETURN' | 'ADJUST'
  quantity_used: number
  total_cost: number
  unit_cost: number
  notes?: string
  created_at: string
  product?: {
    id: string
    name: string
    sku_code?: string
  }
  sku?: {
    id: string
    sku_code: string
    sku_name: string
  }
}

interface RelatedProduct {
  id: string
  name: string
  sku_code?: string
  quantity_used: number
  created_at: string
}
```

#### 5.1.3 材料使用记录创建

**接口地址：** `POST /api/materials/:id/usage`

**请求参数：**
```typescript
interface CreateMaterialUsageRequest {
  action: 'USE' | 'RETURN' | 'ADJUST'
  quantity_used: number
  product_id?: string
  sku_id?: string
  notes?: string
}
```

**响应数据：**
```typescript
interface CreateMaterialUsageResponse {
  usage_record: MaterialUsageRecord
  updated_material: {
    id: string
    used_quantity: number
    remaining_quantity: number
    stock_status: 'SUFFICIENT' | 'LOW' | 'OUT'
  }
}
```

#### 5.1.4 库存统计接口

**接口地址：** `GET /api/materials/statistics`

**响应数据：**
```typescript
interface MaterialStatisticsResponse {
  total_materials: number
  by_type: {
    [key in ProductType]: {
      count: number
      total_value: number
      sufficient: number
      low: number
      out: number
    }
  }
  by_quality: {
    [key in Quality]: {
      count: number
      total_value: number
    }
  }
  stock_alerts: {
    low_stock_count: number
    out_of_stock_count: number
    low_stock_materials: Material[]
  }
  recent_usage: {
    last_7_days: number
    last_30_days: number
    top_used_materials: {
      material: Material
      usage_count: number
      usage_quantity: number
    }[]
  }
}
```

### 5.2 层级式库存查询接口（原材料库存页面专用）

**接口地址：** `GET /api/inventory/hierarchical`

**请求参数：**
```typescript
interface InventoryQueryParams {
  page?: number
  limit?: number
  search?: string
  material_types?: string[] // 原材料类型筛选
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  low_stock_only?: boolean
  diameter_min?: number
  diameter_max?: number
  specification_min?: number
  specification_max?: number
  sort?: 'asc' | 'desc'
  sort_by?: string
}
```

**响应数据：**
```typescript
interface HierarchicalInventoryResponse {
  success: boolean
  data: {
    hierarchy: MaterialTypeGroup[]
    pagination: PaginationInfo
  }
}

interface MaterialTypeGroup {
  material_type: string
  total_quantity: number
  total_variants: number
  has_low_stock: boolean
  specifications: SpecificationData[]
}
```

### 5.3 层级式库存查询（核心接口）

**接口地址：** `GET /inventory/hierarchical`

**功能说明：** 基于materials表获取按原材料类型→规格→品相分层的库存数据，支持半成品、配件、成品原材料的统一查询

**数据源：** 直接查询materials表，无需复杂计算，性能优异

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| search | string | 否 | 产品名称搜索（模糊匹配） |
| material_types | array/string | 否 | **原材料类型筛选（支持多选：LOOSE_BEADS/BRACELET/ACCESSORIES/FINISHED_MATERIAL）** |
| quality | string | 否 | 品质筛选（AA/A/AB/B/C） |
| low_stock_only | boolean | 否 | 仅显示低库存 |
| diameter_min | number | 否 | 珠径最小值（mm） |
| diameter_max | number | 否 | 珠径最大值（mm） |
| specification_min | number | 否 | 规格最小值 |
| specification_max | number | 否 | 规格最大值 |
| sort | string | 否 | 排序方式（asc/desc） |
| sort_by | string | 否 | 排序字段（total_quantity/material_type/crystal_type） |

**核心功能特性：**
- **materials表直查**：直接查询materials表，避免复杂的purchase表计算
- **层级数据结构**：原材料类型→规格→品相→批次的四级层级
- **库存计算逻辑**：remaining_quantity = original_quantity - used_quantity（数据库计算字段）
- **库存状态自动判断**：stock_status根据remaining_quantity和min_stock_alert自动计算
- **权限控制**：EMPLOYEE角色自动过滤价格敏感信息
- **数据类型安全**：所有数值字段强制Number()转换
- **触发器同步**：purchase表变更自动同步到materials表

**响应示例：**
```json
{
  "success": true,
  "message": "层级式库存查询成功",
  "data": {
    "hierarchy": [
      {
        "material_type": "FINISHED_MATERIAL",
        "total_quantity": 45,
        "total_variants": 3,
        "has_low_stock": false,
        "specifications": [
          {
            "specification_value": 18.0,
            "specification_unit": "mm",
            "total_quantity": 45,
            "total_variants": 3,
            "has_low_stock": false,
            "qualities": [
              {
                "quality": "AA",
                "remaining_quantity": 15,
                "is_low_stock": false,
                "price_per_unit": 280.00,
                "batch_count": 1,
                "batches": [
                  {
                    "material_id": "material_001",
                    "material_code": "CG20250116001",
                    "material_name": "紫水晶成品手串",
                    "material_type": "FINISHED_MATERIAL",
                    "material_date": "2025-01-16T00:00:00.000Z",
                    "supplier_name": "水晶供应商A",
                    "original_quantity": 20,
                    "used_quantity": 5,
                    "remaining_quantity": 15,
                    "inventory_unit": "ITEMS",
                    "unit_cost": 280.00,
                    "stock_status": "SUFFICIENT",
                    "purchase_id": "purchase_001",
                    "photos": ["http://localhost:3001/uploads/purchases/image1.jpg"]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

### 5.2 purchase到material字段映射规范（核心机制）

**映射函数：** `mapPurchaseToMaterial(data)`

**修复成果：**
实现了完整的purchase到material映射机制、数据类型安全处理、层级式库存展示，重点关注字段规范、半成品库存、配件库存、成品原材料库存等核心功能的实现和优化。

**字段映射规则：**
| 原字段名（purchase） | 映射字段名（material） | 说明 |
|---------------------|----------------------|------|
| purchase_name | material_name | 产品名称 |
| purchase_type | material_type | 产品类型 |
| purchase_code | material_code | 产品编号 |
| purchase_id | material_id | 产品ID |
| purchase_date | material_date | 采购日期 |

**核心映射逻辑：**
```typescript
const mapPurchaseToMaterial = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(mapPurchaseToMaterial)
  }
  
  if (data instanceof Date) {
    return data // 保护Date对象
  }
  
  if (data && typeof data === 'object') {
    const mapped: any = {}
    
    for (const [key, value] of Object.entries(data)) {
      // 字段映射规则
      let newKey = key
      if (key === 'purchase_name') newKey = 'material_name'
      else if (key === 'purchase_type') newKey = 'material_type'
      else if (key === 'purchase_code') newKey = 'material_code'
      else if (key === 'purchase_id') newKey = 'material_id'
      else if (key === 'purchase_date') newKey = 'material_date'
      
      mapped[newKey] = mapPurchaseToMaterial(value)
    }
    
    // 添加库存特有字段
    if (mapped.material_type && mapped.original_quantity !== undefined) {
      mapped.inventory_unit = getUnit(mapped.material_type)
      mapped.usage_rate = Math.round((mapped.used_quantity / mapped.original_quantity) * 100)
      mapped.remaining_rate = 100 - mapped.usage_rate
      
      if (mapped.remaining_quantity <= 0) {
        mapped.stock_status = 'out'
      } else if (mapped.min_stock_alert && mapped.remaining_quantity <= mapped.min_stock_alert) {
        mapped.stock_status = 'low'
      } else {
        mapped.stock_status = 'sufficient'
      }
    }
    
    return mapped
  }
  
  return data
}
```

**映射逻辑特点：**
- **递归处理**：支持嵌套对象和数组的深度映射
- **Date对象保护**：特殊处理Date对象，避免被当作普通对象处理
- **库存增强**：自动添加inventory_unit、usage_rate、stock_status等库存特有字段
- **数据一致性**：确保前后端字段名完全一致
- **前端兼容**：前端组件兼容映射前后的字段名

**增强字段计算：**
```typescript
// 自动添加的库存特有字段
interface MaterialEnhancement {
  inventory_unit: string        // 库存单位（颗/片/件）
  usage_rate: number           // 使用率（%）
  remaining_rate: number       // 剩余率（%）
  stock_status: 'sufficient' | 'low' | 'out'  // 库存状态
}
```

### 5.3 库存统计

**接口地址：** `GET /inventory/stats`

**响应示例：**
```json
{
  "success": true,
  "message": "库存统计获取成功",
  "data": {
    "total_products": 150,
    "total_value": 50000.00,
    "low_stock_count": 5,
    "product_types": {
      "LOOSE_BEADS": 80,
      "BRACELET": 30,
      "ACCESSORIES": 25,
      "FINISHED_MATERIAL": 15
    }
  }
}
```

### 5.4 库存消耗分析（数据类型安全版）

**接口地址：** `GET /inventory/consumption-analysis`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| time_range | string | 否 | 时间范围（7d/30d/90d/1y） |
| material_type | string | 否 | **原材料类型筛选（使用material_type替代product_type）** |

**数据类型安全处理（重要修复）：**

**问题背景：**
- 库存消耗分析显示"161"而不是"17"
- 后端reduce计算时发生字符串拼接："16" + "1" = "161"
- 前端未对API返回数据进行类型验证

**解决方案：**
```typescript
// 后端：强制数字类型转换
const totalConsumption = convertedData.reduce((sum, item) => {
  return sum + Number(item.total_consumed) // 关键修复点
}, 0)

// 前端：防护性类型转换
const displayValue = Number(data.total_consumption).toLocaleString()

// 数值字段安全处理函数
const safe_number_conversion = (value: any): number => {
  if (value === null || value === undefined) return 0
  const num = Number(value)
  return isNaN(num) ? 0 : num
}
```

**SQL类型转换规范：**
```sql
-- 确保返回数字类型，避免字符串拼接问题
CAST(COALESCE(SUM(mu.quantity_used_beads), 0) + COALESCE(SUM(mu.quantity_used_pieces), 0) AS UNSIGNED) as total_consumed

-- 价格字段处理
CAST(p.price_per_gram AS DECIMAL(10,2)) as price_per_gram,
CAST(p.total_price AS DECIMAL(12,2)) as total_price
```

**修复效果：**
- ✅ 库存消耗分析显示正确数值
- ✅ 所有库存数量字段显示正确
- ✅ 价格计算准确无误
- ✅ 前后端数据类型一致

**响应示例：**
```json
{
  "success": true,
  "message": "库存消耗分析获取成功",
  "data": {
    "total_consumption": 17,
    "consumption_details": [
      {
        "purchase_id": "purchase_001",
        "material_name": "紫水晶散珠",
        "total_consumed": 17,
        "consumption_value": 120.00
      }
    ]
  }
}
```

**重要说明：** 已修复数据类型混合导致的显示错误（"161"→17），后端和前端双重类型安全保护。

## 六、SKU销售管理接口（2025年1月修复版）

### 6.1 SKU列表查询（已修复）

**接口地址：** `GET /skus`

**修复内容：**
- **字段名称统一**：统一使用蛇形命名规则（customer_name、customer_phone等）
- **权限控制修复**：根据用户角色过滤敏感信息（成本、利润率等）
- **筛选功能优化**：支持多维度筛选和排序
- **库存状态修复**：实时显示准确的库存状态
- **API响应优化**：优化响应数据结构和错误处理

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| search | string | 否 | SKU名称或编号搜索 |
| status | array | 否 | 状态筛选（ACTIVE/INACTIVE） |
| price_min | number | 否 | 最低价格（BOSS角色可用） |
| price_max | number | 否 | 最高价格（BOSS角色可用） |
| profit_margin_min | number | 否 | 最低利润率（BOSS角色可用） |
| profit_margin_max | number | 否 | 最高利润率（BOSS角色可用） |
| sort_by | string | 否 | 排序字段（created_at/selling_price/available_quantity） |
| sort_order | string | 否 | 排序方向（asc/desc） |

**权限控制逻辑：**
```typescript
// 根据用户角色过滤敏感字段
const filterSensitiveFields = (skus: SKU[], userRole: string) => {
  if (userRole === 'EMPLOYEE') {
    return skus.map(sku => ({
      ...sku,
      material_cost: undefined,  // 隐藏材料成本
      total_cost: undefined,     // 隐藏总成本
      profit_margin: undefined   // 隐藏利润率
    }))
  }
  return skus
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "SKU列表获取成功",
  "data": {
    "skus": [
      {
        "id": "sku_001",
        "sku_code": "SKU20250116001",
        "sku_name": "紫水晶组合手串",
        "description": "精选紫水晶散珠组合制作",
        "specification": "8.0",
        "selling_price": 280.00,
        "material_cost": 25.00,  // EMPLOYEE角色不可见
        "total_cost": 145.00,    // EMPLOYEE角色不可见
        "profit_margin": 48.21,  // EMPLOYEE角色不可见
        "total_quantity": 5,
        "available_quantity": 3,
        "status": "ACTIVE",
        "photos": ["http://localhost:3001/uploads/skus/sku_001.jpg"],
        "created_at": "2025-01-16T10:30:00.000Z",
        "last_sale_at": "2025-01-16T15:20:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "total_pages": 3
    }
  }
}
```

### 6.2 SKU销售操作（已修复）

**接口地址：** `POST /skus/:id/sell`

**修复内容：**
- **字段映射修复**：修复了customer_name、customer_phone等字段映射问题
- **库存更新优化**：确保销售后库存正确更新
- **销售记录创建**：自动创建详细的销售记录
- **库存变动日志**：记录详细的库存变更历史
- **错误处理增强**：优化错误提示和验证逻辑

**请求参数（已修复）：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| quantity | number | 是 | 销售数量 |
| customer_name | string | 是 | 客户姓名（修复：统一字段名） |
| customer_phone | string | 是 | 客户电话（修复：统一字段名） |
| customer_address | string | 否 | 客户地址（修复：蛇形命名） |
| sale_channel | string | 否 | 销售渠道（DIRECT/ONLINE/WHOLESALE） |
| notes | string | 否 | 备注信息 |
| actual_total_price | number | 否 | 实际成交价格（支持优惠价） |

**业务验证规则：**
```typescript
// 销售前验证
if (quantity <= 0) throw new Error('销售数量必须大于0')
if (quantity > sku.available_quantity) throw new Error('销售数量不能超过可用库存')
if (sku.status !== 'ACTIVE') throw new Error('SKU状态异常，无法销售')
if (!customer_name.trim()) throw new Error('客户姓名不能为空')
if (!customer_phone.trim()) throw new Error('客户电话不能为空')
```

**请求示例：**
```json
{
  "quantity": 1,
  "customer_name": "张三",
  "customer_phone": "13800138000",
  "customer_address": "北京市朝阳区",
  "sale_channel": "DIRECT",
  "notes": "客户要求包装精美",
  "actual_total_price": 260.00
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "SKU销售成功",
  "data": {
    "sale_record_id": "sale_001",
    "sku_id": "sku_001",
    "quantity_sold": 1,
    "total_price": 260.00,
    "remaining_quantity": 2,
    "sale_time": "2025-01-16T16:30:00.000Z"
  }
}
```

### 6.3 SKU销毁操作（已修复）

**接口地址：** `DELETE /skus/:id/destroy`

**修复内容：**
- **返还原材料功能**：支持销毁时返还原材料到库存
- **权限验证增强**：确保只有BOSS或MANAGER角色可执行
- **库存回滚机制**：支持选择性返还原材料
- **详细日志记录**：记录销毁原因和返还原材料信息

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| quantity | number | 是 | 销毁数量 |
| reason | string | 是 | 销毁原因 |
| return_to_material | boolean | 是 | 是否返还原材料到库存 |
| selected_materials | array | 否 | 选择返还的原材料ID列表 |
| custom_return_quantities | object | 否 | 自定义返还数量 |

**请求示例：**
```json
{
  "quantity": 1,
  "reason": "质量问题",
  "return_to_material": true,
  "selected_materials": ["material_001", "material_002"],
  "custom_return_quantities": {
    "material_001": 15,
    "material_002": 2
  }
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "SKU销毁成功",
  "data": {
    "destroyed_quantity": 1,
    "remaining_quantity": 1,
    "returned_materials": [
      {
        "material_id": "material_001",
        "material_name": "紫水晶散珠",
        "returned_quantity": 15,
        "unit": "颗"
      }
    ]
  }
}
```

### 6.4 SKU库存调整（已修复）

**接口地址：** `POST /skus/:id/adjust`

**修复内容：**
- **调整类型支持**：支持增加和减少两种调整类型
- **成本调整功能**：支持同时调整库存和成本
- **权限控制**：确保只有BOSS角色可执行
- **详细日志记录**：记录调整原因和操作详情

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| type | string | 是 | 调整类型（increase/decrease） |
| quantity | number | 是 | 调整数量 |
| reason | string | 是 | 调整原因 |
| cost_adjustment | number | 否 | 成本调整金额 |

**请求示例：**
```json
{
  "type": "increase",
  "quantity": 2,
  "reason": "盘点发现多余库存",
  "cost_adjustment": 50.00
}
```

### 6.5 SKU库存变更历史（已修复）

**接口地址：** `GET /skus/:id/inventory-logs`

**修复内容：**
- **筛选功能完善**：支持按操作类型、时间范围筛选
- **分页优化**：支持大量历史记录的分页显示
- **详情展示**：显示详细的操作信息和返还原材料信息
- **权限控制**：根据角色显示不同级别的详情

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| operation_type | string | 否 | 操作类型筛选（SALE/DESTROY/ADJUST/RETURN） |
| start_date | string | 否 | 开始日期 |
| end_date | string | 否 | 结束日期 |

**响应示例：**
```json
{
  "success": true,
  "message": "库存变更历史获取成功",
  "data": {
    "logs": [
      {
        "id": "log_001",
        "operation_type": "SALE",
        "quantity_change": -1,
        "quantity_after": 2,
        "notes": "销售给客户张三",
        "operator_name": "admin",
        "created_at": "2025-01-16T16:30:00.000Z",
        "customer_info": {
          "customer_name": "张三",
          "customer_phone": "13800138000"
        }
      },
      {
        "id": "log_002",
        "operation_type": "DESTROY",
        "quantity_change": -1,
        "quantity_after": 3,
        "notes": "销毁原因：质量问题。返还原材料：紫水晶散珠 15颗",
        "operator_name": "admin",
        "created_at": "2025-01-16T14:20:00.000Z",
        "returned_materials": [
          {
            "material_name": "紫水晶散珠",
            "returned_quantity": 15,
            "unit": "颗"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "total_pages": 2
    }
  }
}
```

## 七、图片上传接口（新增）

### 6.1 采购图片上传

**接口地址：** `POST /uploads/purchase-images`

**请求方式：** multipart/form-data

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| images | file[] | 是 | 图片文件数组，支持多文件上传 |
| purchase_id | string | 否 | 采购记录ID（编辑时传入） |

**文件限制：**
- 支持格式：JPEG、PNG、WebP
- 单文件大小：最大10MB
- 总文件数量：最大5个
- 图片尺寸：建议不超过2048x2048

**响应示例：**
```json
{
  "success": true,
  "message": "图片上传成功",
  "data": {
    "uploaded_files": [
      {
        "filename": "image1_20241231_103000.jpg",
        "url": "http://localhost:3001/uploads/purchases/image1_20241231_103000.jpg",
        "size": 1024000,
        "mimetype": "image/jpeg"
      }
    ],
    "failed_files": []
  }
}
```

**错误处理：**
- 文件格式不支持：返回INVALID_FILE_FORMAT
- 文件过大：返回FILE_TOO_LARGE
- 上传失败：返回UPLOAD_FAILED

### 6.2 图片URL处理规范

**URL格式：**
- 开发环境：`http://localhost:3001/uploads/purchases/{filename}`
- 生产环境：`http://api.dorblecapital.com/uploads/purchases/{filename}`

**前端处理：**
```typescript
// 使用fixImageUrl函数处理跨域问题
import { fixImageUrl } from '@/services/api'

const processImageUrl = (url: string): string => {
  return fixImageUrl(url)
}
```

**存储规范：**
- 数据库存储：JSON数组格式 `["url1", "url2"]`
- 文件命名：`原文件名_时间戳.扩展名`
- 目录结构：`/uploads/purchases/YYYY/MM/`

## 七、供应商管理接口

### 6.1 供应商列表

**接口地址：** `GET /suppliers`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认1000 |
| search | string | 否 | 供应商名称搜索 |

### 6.2 供应商创建

**接口地址：** `POST /suppliers`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | 供应商名称 |
| contact | string | 否 | 联系方式 |
| address | string | 否 | 地址 |
| notes | string | 否 | 备注 |

## 七、客户管理接口（2025年1月修复版）

### 7.1 客户列表

**接口地址：** `GET /customers`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| search | string | 否 | 客户姓名或手机号搜索 |
| customer_type | string | 否 | 客户类型筛选（NEW/REPEAT/VIP/ACTIVE） |
| sort_by | string | 否 | 排序字段（name/total_spent/last_purchase_date） |
| sort_order | string | 否 | 排序方向（asc/desc），默认desc |

**响应示例：**
```json
{
  "success": true,
  "message": "客户列表获取成功",
  "data": {
    "customers": [
      {
        "id": "customer_001",
        "customer_name": "张三",
        "customer_phone": "13800138000",
        "total_spent": 1580.0,
        "purchase_count": 3,
        "last_purchase_date": "2025-01-15T10:30:00.000Z",
        "customer_type": "REPEAT",
        "notes": "VIP客户，喜欢紫水晶",
        "created_at": "2024-12-01T09:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "total_pages": 8
    }
  }
}
```

### 7.2 客户分析数据

**接口地址：** `GET /customers/analytics`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| start_date | string | 否 | 开始日期（YYYY-MM-DD） |
| end_date | string | 否 | 结束日期（YYYY-MM-DD） |

**响应示例：**
```json
{
  "success": true,
  "message": "客户分析数据获取成功",
  "data": {
    "total_customers": 156,
    "new_customers": 23,
    "repeat_customers": 89,
    "vip_customers": 12,
    "active_customers": 45,
    "average_order_value": 285.50,
    "average_profit_margin": 42.8,
    "refund_rate": 3.2,
    "total_revenue": 45680.0,
    "total_orders": 160,
    "period": {
      "start_date": "2024-12-01",
      "end_date": "2025-01-16"
    }
  }
}
```

### 7.3 客户详情

**接口地址：** `GET /customers/{customer_id}`

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| customer_id | string | 是 | 客户ID |

**响应示例：**
```json
{
  "success": true,
  "message": "客户详情获取成功",
  "data": {
    "customer": {
      "id": "customer_001",
      "customer_name": "张三",
      "customer_phone": "13800138000",
      "total_spent": 1580.0,
      "purchase_count": 3,
      "last_purchase_date": "2025-01-15T10:30:00.000Z",
      "customer_type": "REPEAT",
      "notes": "VIP客户，喜欢紫水晶",
      "created_at": "2024-12-01T09:00:00.000Z"
    },
    "purchase_history": [
      {
        "id": "purchase_001",
        "product_skus": {
          "sku_code": "SKU20250115001",
          "sku_name": "紫水晶手串",
          "specification": "8.0mm",
          "total_cost": 145.0
        },
        "quantity": 1,
        "total_price": 280.0,
        "purchase_date": "2025-01-15T10:30:00.000Z",
        "status": "ACTIVE",
        "notes": "客户很满意"
      },
      {
        "id": "purchase_002",
        "product_skus": {
          "sku_code": "SKU20250110002",
          "sku_name": "玛瑙手串",
          "specification": "10.0mm",
          "total_cost": 120.0
        },
        "quantity": 1,
        "total_price": 250.0,
        "purchase_date": "2025-01-10T14:20:00.000Z",
        "status": "REFUNDED",
        "refund_date": "2025-01-12T09:15:00.000Z",
        "refund_reason": "尺寸不合适",
        "refund_notes": "客户要求退货"
      }
    ]
  }
}
```

### 7.4 客户销售记录（反向销售录入）

**接口地址：** `POST /customers/{customer_id}/sales`

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| customer_id | string | 是 | 客户ID |

**请求参数：**
```json
{
  "sku_id": "sku_001",
  "quantity": 1,
  "selling_price": 280.0,
  "notes": "客户指定购买"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "销售记录创建成功",
  "data": {
    "purchase_id": "purchase_003",
    "customer_name": "张三",
    "sku_name": "紫水晶手串",
    "quantity": 1,
    "total_price": 280.0,
    "purchase_date": "2025-01-16T16:45:00.000Z",
    "remaining_stock": 2
  }
}
```

### 7.5 客户退货处理

**接口地址：** `POST /customers/refund`

**请求参数：**
```json
{
  "purchase_id": "purchase_001",
  "refund_reason": "质量问题",
  "refund_notes": "客户反馈产品有瑕疵"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "退货处理成功",
  "data": {
    "purchase_id": "purchase_001",
    "refund_date": "2025-01-16T17:00:00.000Z",
    "refunded_amount": 280.0,
    "restored_quantity": 1,
    "customer_updated": true
  }
}
```

### 7.6 客户信息更新

**接口地址：** `PUT /customers/{customer_id}`

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| customer_id | string | 是 | 客户ID |

**请求参数：**
```json
{
  "customer_name": "张三",
  "customer_phone": "13800138000",
  "notes": "VIP客户，喜欢紫水晶和玛瑙"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "客户信息更新成功",
  "data": {
    "customer": {
      "id": "customer_001",
      "customer_name": "张三",
      "customer_phone": "13800138000",
      "notes": "VIP客户，喜欢紫水晶和玛瑙",
      "updated_at": "2025-01-16T17:15:00.000Z"
    }
  }
}
```

### 7.7 客户创建

**接口地址：** `POST /customers`

**请求参数：**
```json
{
  "customer_name": "李四",
  "customer_phone": "13900139000",
  "notes": "新客户，通过朋友介绍"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "客户创建成功",
  "data": {
    "customer": {
      "id": "customer_157",
      "customer_name": "李四",
      "customer_phone": "13900139000",
      "total_spent": 0.0,
      "purchase_count": 0,
      "customer_type": "NEW",
      "notes": "新客户，通过朋友介绍",
      "created_at": "2025-01-16T17:30:00.000Z"
    }
  }
}
```

### 7.8 客户删除

**接口地址：** `DELETE /customers/{customer_id}`

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| customer_id | string | 是 | 客户ID |

**权限要求：** BOSS角色

**响应示例：**
```json
{
  "success": true,
  "message": "客户删除成功",
  "data": {
    "deleted_customer_id": "customer_001",
    "deleted_at": "2025-01-16T17:45:00.000Z"
  }
}
```

### 7.9 客户管理权限控制

**权限级别说明：**

| 操作 | BOSS | MANAGER | EMPLOYEE |
|------|------|---------|----------|
| 查看客户列表 | ✅ | ✅ | ✅ |
| 查看客户详情 | ✅ | ✅ | ✅ |
| 查看成本数据 | ✅ | ❌ | ❌ |
| 创建客户 | ✅ | ✅ | ✅ |
| 更新客户信息 | ✅ | ✅ | ❌ |
| 删除客户 | ✅ | ❌ | ❌ |
| 处理退货 | ✅ | ✅ | ❌ |
| 反向销售录入 | ✅ | ✅ | ✅ |
| 查看分析数据 | ✅ | ✅ | ✅ |

**权限验证：**
- 所有客户管理接口都需要认证
- 成本相关数据仅BOSS角色可见
- 删除操作仅BOSS角色可执行
- 退货处理需要BOSS或MANAGER权限

### 7.10 客户管理错误码

| 错误码 | 说明 |
|--------|------|
| CUSTOMER_NOT_FOUND | 客户不存在 |
| CUSTOMER_PHONE_EXISTS | 客户手机号已存在 |
| PURCHASE_NOT_FOUND | 销售记录不存在 |
| PURCHASE_ALREADY_REFUNDED | 销售记录已退货 |
| INSUFFICIENT_PERMISSION | 权限不足 |
| INVALID_CUSTOMER_DATA | 客户数据无效 |
| REFUND_FAILED | 退货处理失败 |
| CUSTOMER_HAS_PURCHASES | 客户有销售记录，无法删除 |
| SKU_OUT_OF_STOCK | SKU库存不足 |
| INVALID_REFUND_REASON | 无效的退货原因 |

## 八、错误码表

### 7.1 通用错误码
| 错误码 | 说明 |
|--------|------|
| UNAUTHORIZED | 未授权访问 |
| FORBIDDEN | 权限不足 |
| NOT_FOUND | 资源不存在 |
| VALIDATION_ERROR | 参数验证失败 |
| INTERNAL_ERROR | 服务器内部错误 |

### 7.2 业务错误码
| 错误码 | 说明 |
|--------|------|
| PURCHASE_NOT_FOUND | 采购记录不存在 |
| PURCHASE_DELETE_FAILED | 采购记录删除失败 |
| INSUFFICIENT_STOCK | 库存不足 |
| DUPLICATE_SUPPLIER_NAME | 供应商名称重复 |
| BUSINESS_CONSTRAINT_VIOLATION | 业务约束冲突 |
| FINISHED_PRODUCT_CREATE_FAILED | 成品创建失败 |
| MATERIAL_USAGE_INVALID | 原材料使用记录无效 |

## 八、接口版本控制

### 8.1 版本规范
- 当前版本：v1
- 版本格式：`/api/v{version}`
- 向后兼容原则：新版本保持对旧版本的兼容

### 8.2 字段命名规范
- 使用snake_case命名（如：purchase_code、product_name）
- 布尔字段使用is_前缀（如：is_active）
- 时间字段使用_at后缀（如：created_at、updated_at）

### 8.3 分页规范
- 默认页码：1
- 默认每页数量：根据接口而定
- 响应包含pagination对象：page、limit、total、total_pages

## 九、数据类型处理规范

### 9.1 数值类型安全
- 后端计算时使用Number()强制类型转换
- 前端显示时进行防护性Number()转换
- SQL查询使用CAST()确保返回正确类型

### 9.2 图片URL处理
- 支持开发环境和生产环境URL自动转换
- 前端使用fixImageUrl函数处理跨域问题
- 图片存储格式统一为JSON数组

### 9.3 拼音排序支持
- 支持中文字符的拼音首字母排序
- 完善的拼音映射表（包含蜜、镀等字符）
- 前端组件统一使用sortByPinyin函数