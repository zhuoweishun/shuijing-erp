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

## 三、采购管理接口

### 3.1 采购列表查询（更新版）

**接口地址：** `GET /purchases`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认10 |
| search | string | 否 | 产品名称搜索 |
| purchase_code_search | string | 否 | **新增：采购编号搜索（支持模糊匹配）** |
| quality | string | 否 | 品质筛选（AA/A/AB/B/C） |
| product_type | string | 否 | 产品类型筛选 |
| supplier_id | string | 否 | 供应商ID筛选 |
| sort | string | 否 | 排序方式（asc/desc） |
| sort_by | string | 否 | 排序字段 |

**响应示例：**
```json
{
  "success": true,
  "message": "采购列表获取成功",
  "data": {
    "purchases": [
      {
        "id": "purchase_001",
        "purchase_code": "PUR20240131001",
        "product_name": "紫水晶散珠",
        "product_type": "LOOSE_BEADS",
        "quality": "AA",
        "bead_diameter": 8.0,
        "specification": "8.0",
        "total_price": 2000.00,
        "supplier": {
          "id": "supplier_001",
          "name": "水晶供应商A"
        },
        "photos": ["https://example.com/photo1.jpg"],
        "purchase_date": "2024-01-31T00:00:00.000Z",
        "remaining_quantity": 1500,
        "created_at": "2024-01-31T10:30:00.000Z"
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

### 3.2 采购记录创建

**接口地址：** `POST /purchases`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| product_name | string | 是 | 产品名称 |
| product_type | string | 是 | 产品类型 |
| supplier_id | string | 是 | 供应商ID |
| total_price | number | 是 | 总价格 |
| quality | string | 是 | 品质等级 |
| photos | array | 否 | 图片URL数组 |
| notes | string | 否 | 备注 |

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

## 五、库存管理接口

### 5.1 库存统计

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
      "FINISHED": 15
    }
  }
}
```

### 5.2 库存消耗分析（更新版）

**接口地址：** `GET /inventory/consumption-analysis`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| time_range | string | 否 | 时间范围（7d/30d/90d/1y） |
| product_type | string | 否 | 产品类型筛选 |

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
        "product_name": "紫水晶散珠",
        "total_consumed": 17,
        "consumption_value": 120.00
      }
    ]
  }
}
```

**重要说明：** 后端确保返回的`total_consumption`为数字类型，前端进行Number()转换防护。

## 六、供应商管理接口

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

## 七、错误码表

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