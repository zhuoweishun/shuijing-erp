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

### 3.1 采购列表查询（完整更新版）

**接口地址：** `GET /purchases`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认10 |
| search | string | 否 | 产品名称搜索（模糊匹配） |
| purchase_code_search | string | 否 | **采购编号搜索（支持模糊匹配）** |
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
| sort_order | string | 否 | 排序方式（asc/desc） |

**核心功能特性：**
- **多维度搜索**：支持产品名称和采购编号的独立搜索
- **多选筛选**：品质、产品类型、供应商支持多选筛选
- **范围筛选**：珠径、规格、价格支持最小值-最大值范围筛选
- **日期筛选**：支持采购日期范围筛选
- **智能排序**：支持多字段排序，包括规格动态字段选择
- **权限控制**：EMPLOYEE角色自动过滤敏感价格字段
- **分页优化**：支持自定义每页数量（10/20/50/100条）

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

### 3.2 采购记录创建（已修复）

**接口地址：** `POST /purchases`

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| purchase_name | string | 是 | 采购名称（修复：统一字段名） |
| purchase_type | string | 是 | 采购类型（LOOSE_BEADS/BRACELET/ACCESSORIES/FINISHED_MATERIAL） |
| supplier_id | string | 是 | 供应商ID |
| total_price | number | 是 | 总价格 |
| quality | string | 是 | 品质等级（AA/A/AB/B/C） |
| photos | array | 否 | 图片URL数组（JSON格式） |
| notes | string | 否 | 备注 |
| price_per_gram | number | 否 | 克价（散珠/手串必填） |
| weight | number | 否 | 重量（散珠/手串必填） |
| bead_diameter | number | 否 | 珠子直径（散珠/手串必填） |
| beads_per_string | number | 否 | 每串颗数（手串必填） |
| piece_count | number | 否 | 片数/件数（配件/成品必填） |
| min_stock_alert | number | 否 | 最低预警颗数 |
| natural_language_input | string | 否 | 自然语言录入信息 |
| ai_recognition_result | object | 否 | AI识别结果 |

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

## 五、原材料库存管理接口（重要更新）

### 5.1 层级式库存查询（核心接口）

**接口地址：** `GET /inventory/hierarchical`

**功能说明：** 获取按产品类型→规格→品相分层的库存数据，支持半成品、配件、成品原材料的统一查询

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
- **purchase到material映射**：后端自动将purchase字段映射为material字段
- **层级数据结构**：产品类型→规格→品相→批次的四级层级
- **库存计算逻辑**：remaining_quantity = original_quantity - used_quantity
- **权限控制**：EMPLOYEE角色自动过滤价格敏感信息
- **数据类型安全**：所有数值字段强制Number()转换

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
                    "purchase_id": "purchase_001",
                    "material_code": "CG20250116001",
                    "material_name": "紫水晶成品手串",
                    "material_type": "FINISHED_MATERIAL",
                    "material_date": "2025-01-16T00:00:00.000Z",
                    "supplier_name": "水晶供应商A",
                    "original_quantity": 20,
                    "used_quantity": 5,
                    "remaining_quantity": 15,
                    "price_per_unit": 280.00,
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

**字段映射规则：**
| 原字段名（purchase） | 映射字段名（material） | 说明 |
|---------------------|----------------------|------|
| purchase_name | material_name | 产品名称 |
| purchase_type | material_type | 产品类型 |
| purchase_code | material_code | 产品编号 |
| purchase_id | material_id | 产品ID |
| purchase_date | material_date | 采购日期 |

**映射逻辑特点：**
- **递归处理**：支持嵌套对象和数组的深度映射
- **Date对象保护**：特殊处理Date对象，避免被当作普通对象处理
- **库存增强**：自动添加inventory_unit、usage_rate、stock_status等库存特有字段
- **数据一致性**：确保前后端字段名完全一致

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

**数据类型安全处理：**
- **后端计算**：使用Number()强制类型转换，避免字符串拼接
- **前端防护**：显示前进行Number()转换，确保数值正确
- **SQL查询**：使用CAST()确保返回正确数据类型

**核心修复：**
```javascript
// 后端：强制数字类型转换（避免"16"+"1"="161"的问题）
const totalConsumption = convertedData.reduce((sum, item) => {
  return sum + Number(item.total_consumed); // 关键修复点
}, 0);

// 前端：防护性类型转换
const displayValue = Number(data.total_consumption).toLocaleString();
```

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

## 六、图片上传接口（新增）

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