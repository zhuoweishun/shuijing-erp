# API接口统一规范文档（前后端对接核心）

## 一、基础规范（统一现有规则）

### 1.1 通用配置（提取自《API接口规范文档》1-3章）

| 规范项   | 统一标准                                                                                   | 来源文档           |
| ----- | -------------------------------------------------------------------------------------- | -------------- |
| API前缀 | 所有接口统一前缀/api/v1/                                                                       | 《系统架构文档》4.2    |
| 认证方式  | JWT Bearer Token（有效期24h）                                                               | 《API接口规范文档》1.1 |
| 请求头   | Web端：Content-Type: application/json + Authorization鸿蒙端：新增 X-Client-Platform: HarmonyOS | 《API接口规范文档》1.2 |
| 响应格式  | 统一ApiResponse<T>结构                                                                     | 《API接口规范文档》1.3 |
| 分页默认值 | page=1，limit=10（最大100）                                                                 | 《API接口规范文档》12  |

### 1.2 响应格式定义（复用现有TypeScript接口）

```typescript
interface ApiResponse<T = any> {
  success: boolean;          // 请求状态
  message: string;           // 提示信息
  data?: T;                  // 业务数据
  error?: {                  // 错误信息（失败时返回）
    code: string;            // 错误码（如INVALID_DIAMETER）
    details?: any;           // 错误详情（如字段验证失败）
  };
}
```

## 二、核心接口清单（按模块提取，无新增）

### 2.1 认证管理接口（用户登录认证系统）

| 接口路径                  | 方法   | 权限  | 核心参数                 | 响应核心字段     | 功能说明         |
| --------------------- | ---- | --- | -------------------- | ---------- | ------------ |
| /api/v1/auth/login    | POST | 无   | username、password    | user、token | 用户登录         |
| /api/v1/auth/verify   | GET  | 无   | Authorization Header | user       | Token验证      |
| /api/v1/auth/logout   | POST | 已认证 | 无                    | message    | 用户登出         |
| /api/v1/auth/register | POST | 无   | 暂未实现                 | 暂未实现       | 用户注册（开发中）    |
| /api/v1/auth/refresh  | POST | 已认证 | 暂未实现                 | 暂未实现       | Token刷新（开发中） |

#### 2.1.1 用户登录接口详细规范

**接口路径：** `POST /api/v1/auth/login`

**请求参数：**

```typescript
{
  "username": "boss",
  "password": "123456"
}
```

**响应数据结构：**

```typescript
// 登录成功
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_001",
      "username": "boss",
      "real_name": "系统管理员",
      "name": "系统管理员",
      "email": "admin@example.com",
      "role": "BOSS",
      "avatar": null,
      "status": "active",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  }
}

// 登录失败
{
  "success": false,
  "message": "用户名或密码错误",
  "error": {
    "code": "INVALID_CREDENTIALS"
  }
 }
 ```

## 八、销售记录管理接口

### 8.1 销售记录接口清单

| 接口路径                        | 方法   | 权限  | 核心参数                                              | 响应核心字段                   | 功能说明       |
| --------------------------- | ---- | --- | ------------------------------------------------- | ------------------------ | ---------- |
| /api/v1/sales-records       | GET  | 已认证 | page、search、date_range、profit_margin_range       | sales_records[]、pagination | 销售记录列表查询   |
| /api/v1/sales-records/:id   | GET  | 已认证 | id                                                | sale_record、product_info | 获取销售记录详情   |
| /api/v1/sales-records/:id   | PUT  | 已认证 | sold_price、buyer_info、notes                     | updated_sale_record      | 更新销售记录     |
| /api/v1/sales-records/:id   | DELETE | 仅老板 | id                                                | deleted_sale_id          | 删除销售记录     |
| /api/v1/sales-records/stats | GET  | 已认证 | time_range、group_by                              | statistics、charts_data   | 销售统计分析     |
| /api/v1/sales-records/export | GET  | 已认证 | start_date、end_date、format                      | download_url、filename    | 导出销售数据     |

### 8.2 销售记录查询接口详细规范

#### 8.2.1 销售记录列表查询

**接口路径：** `GET /api/v1/sales-records`

**权限要求：** 已认证用户

**请求参数：**

```typescript
{
  "page": 1,
  "limit": 20,
  "search": "紫水晶",
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  },
  "profit_margin_range": {
    "min": 20.0,
    "max": 50.0
  },
  "sale_channel": "线下门店",
  "sort_by": "sale_date",
  "sort_order": "desc"
}
```

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "查询成功",
  "data": {
    "sales_records": [
      {
        "id": "sale_uuid",
        "sale_code": "SL20240115001",
        "product_name": "紫水晶多宝手串",
        "product_code": "FP20240115001",
        "selling_price": 128.00,
        "total_cost": 80.00,
        "profit_amount": 48.00,
        "profit_margin": 37.50,
        "buyer_info": "张三，手机：138xxxx",
        "sale_date": "2024-01-15T14:30:00.000Z",
        "sale_channel": "线下门店",
        "created_at": "2024-01-15T14:30:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 56,
      "per_page": 20,
      "has_next": true,
      "has_prev": false
    },
    "summary": {
      "total_sales_amount": 12580.00,
      "total_profit_amount": 4732.50,
      "average_profit_margin": 37.63,
      "total_records": 56
    }
  }
}
```

### 8.3 销售统计分析接口

#### 8.3.1 销售统计数据

**接口路径：** `GET /api/v1/sales-records/stats`

**权限要求：** 已认证用户（老板可见完整财务数据）

**请求参数：**

```typescript
{
  "time_range": "30d", // 7d, 30d, 90d, 6m, 1y, all
  "group_by": "day", // day, week, month
  "include_cost_data": true // 仅老板可用
}
```

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "统计查询成功",
  "data": {
    "statistics": {
      "total_sales_count": 156,
      "total_sales_amount": 25680.00,
      "total_profit_amount": 9654.50,
      "average_profit_margin": 37.59,
      "best_selling_products": [
        {
          "product_name": "8mm紫水晶手串",
          "sales_count": 12,
          "total_amount": 1176.00
        }
      ],
      "sales_by_channel": [
        {
          "channel": "线下门店",
          "count": 89,
          "amount": 15420.00
        },
        {
          "channel": "线上平台",
          "count": 67,
          "amount": 10260.00
        }
      ]
    },
    "charts_data": {
      "daily_sales": [
        {
          "date": "2024-01-15",
          "sales_count": 3,
          "sales_amount": 384.00,
          "profit_amount": 144.50
        }
      ],
      "profit_margin_distribution": [
        {
          "range": "20-30%",
          "count": 45
        },
        {
          "range": "30-40%",
          "count": 78
        },
        {
          "range": "40-50%",
          "count": 33
        }
      ]
    }
  }
}
```

## 九、业务逻辑验证规则

### 9.1 成品制作业务约束

**库存充足性验证：**

```typescript
// 验证原材料库存是否充足
interface StockValidation {
  purchase_id: string;
  required_beads?: number;
  required_pieces?: number;
  available_beads?: number;
  available_pieces?: number;
  is_sufficient: boolean;
}

// 错误响应示例
{
  "success": false,
  "message": "部分原材料库存不足",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "details": {
      "insufficient_materials": [
        {
          "purchase_id": "purchase_uuid_1",
          "product_name": "8mm紫水晶手串",
          "required": 25,
          "available": 20,
          "shortage": 5,
          "unit_type": "beads"
        }
      ]
    }
  }
}
```

**成品编号生成规则：**

- 格式：`FP + YYYYMMDD + 3位序号`
- 示例：`FP20240115001`（2024年1月15日第1个成品）
- 序号范围：001-999，每日重新计数
- 唯一性：通过数据库UNIQUE约束保证

**成本计算规则：**

```typescript
// 成本计算公式
interface CostCalculation {
  material_cost: number;    // 原材料成本（自动计算）
  labor_cost: number;       // 人工成本（手动输入）
  craft_cost: number;       // 工艺成本（手动输入）
  total_cost: number;       // 总成本 = material_cost + labor_cost + craft_cost
  selling_price: number;    // 销售价格（手动输入）
  profit_amount: number;    // 利润金额 = selling_price - total_cost
  profit_margin: number;    // 利润率 = (profit_amount / selling_price) * 100
}
```

### 9.2 销售记录业务约束

**销售编号生成规则：**

- 格式：`SL + YYYYMMDD + 3位序号`
- 示例：`SL20240115001`（2024年1月15日第1笔销售）
- 序号范围：001-999，每日重新计数

**成品状态变更规则：**

```typescript
// 销售时的状态变更
interface ProductStatusChange {
  before_sale: 'IN_STOCK';     // 销售前必须是有库存状态
  after_sale: 'OUT_OF_STOCK';  // 销售后变为无库存状态
  reversible: false;           // 销售操作不可逆（除非删除销售记录）
}
```

### 9.3 权限控制规则

**角色权限矩阵：**

| 操作类型 | BOSS | EMPLOYEE | 说明 |
|---------|------|----------|------|
| 创建成品 | ✅ | ✅ | 所有用户可创建 |
| 查看成品列表 | ✅ | ✅ | 所有用户可查看 |
| 查看成本信息 | ✅ | ❌ | 仅老板可见成本数据 |
| 删除成品 | ✅ | ❌ | 仅老板可删除 |
| 标记售出 | ✅ | ✅ | 所有用户可操作 |
| 查看销售记录 | ✅ | ✅ | 所有用户可查看 |
| 查看利润数据 | ✅ | ❌ | 仅老板可见利润信息 |
| 删除销售记录 | ✅ | ❌ | 仅老板可删除 |

**成本信息过滤规则：**

```typescript
// 员工角色时过滤敏感字段
function filterSensitiveFields(product: any, userRole: string) {
  if (userRole === 'EMPLOYEE') {
    const { 
      material_cost, 
      labor_cost, 
      craft_cost, 
      total_cost, 
      profit_margin,
      profit_amount,
      ...publicFields 
    } = product;
    return publicFields;
  }
  return product;
}
```

## 十、错误处理和状态码定义

### 10.1 HTTP状态码规范

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | 成功 | 查询、更新操作成功 |
| 201 | 创建成功 | 成品创建、销售记录创建 |
| 400 | 请求错误 | 参数验证失败、业务约束违反 |
| 401 | 未认证 | Token无效或过期 |
| 403 | 权限不足 | 员工尝试访问老板权限功能 |
| 404 | 资源不存在 | 成品或销售记录不存在 |
| 409 | 冲突 | 库存不足、重复操作 |
| 500 | 服务器错误 | 系统内部错误 |

### 10.2 业务错误码定义

**成品制作相关错误：**

```typescript
interface FinishedProductErrors {
  INSUFFICIENT_STOCK: '原材料库存不足';
  INVALID_MATERIAL: '无效的原材料ID';
  INVALID_COST_DATA: '成本数据格式错误';
  PRODUCT_NOT_FOUND: '成品不存在';
  PRODUCT_ALREADY_SOLD: '成品已售出，无法修改';
  INVALID_PROFIT_MARGIN: '利润率必须大于0';
}
```

**销售记录相关错误：**

```typescript
interface SalesRecordErrors {
  PRODUCT_NOT_AVAILABLE: '成品不可售（状态异常）';
  INVALID_SALE_PRICE: '销售价格必须大于0';
  SALE_RECORD_NOT_FOUND: '销售记录不存在';
  CANNOT_DELETE_SALE: '无法删除销售记录（业务约束）';
  INVALID_DATE_RANGE: '日期范围无效';
}
```

**通用错误响应格式：**

```typescript
{
  "success": false,
  "message": "用户友好的错误描述",
  "error": {
    "code": "ERROR_CODE",
    "details": {
      // 具体的错误详情
      "field": "field_name",
      "value": "invalid_value",
      "constraint": "validation_rule"
    }
  }
}
```

### 7.3 成品查询接口详细规范

#### 7.3.1 成品列表查询

**接口路径：** `GET /api/v1/finished-products`

**权限要求：** 已认证用户

**请求参数：**

```typescript
{
  "page": 1,
  "limit": 20,
  "search": "紫水晶",
  "quality": "AA",
  "low_stock_only": false,
  "specification_min": 8.0,
  "specification_max": 12.0,
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "查询成功",
  "data": {
    "products": [
      {
        "id": "product_uuid",
        "product_code": "FP20240115001",
        "product_name": "紫水晶多宝手串",
        "description": "8mm紫水晶配金珠设计款",
        "specification": 8.0,
        "selling_price": 128.00,
        "status": "IN_STOCK",
        "photos": ["url1", "url2"],
        "created_at": "2024-01-15T10:30:00.000Z",
        // 老板可见的成本信息
        "material_cost": 45.00,
        "labor_cost": 20.00,
        "craft_cost": 15.00,
        "total_cost": 80.00,
        "profit_margin": 37.50
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 98,
      "per_page": 20,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

#### 7.3.2 成品详情查询

**接口路径：** `GET /api/v1/finished-products/:id`

**权限要求：** 已认证用户

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "查询成功",
  "data": {
    "product": {
      "id": "product_uuid",
      "product_code": "FP20240115001",
      "product_name": "紫水晶多宝手串",
      "description": "8mm紫水晶配金珠设计款",
      "specification": 8.0,
      "selling_price": 128.00,
      "status": "IN_STOCK",
      "photos": ["url1", "url2"],
      "material_cost": 45.00,
      "labor_cost": 20.00,
      "craft_cost": 15.00,
      "total_cost": 80.00,
      "profit_margin": 37.50,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    "material_usage": [
      {
        "id": "usage_uuid_1",
        "purchase_id": "purchase_uuid_1",
        "product_name": "8mm紫水晶手串",
        "quantity_used_beads": 20,
        "quantity_used_pieces": 0,
        "unit_cost": 2.25,
        "total_cost": 45.00
      }
    ]
  }
}
```

### 7.4 成品销售接口详细规范

#### 7.4.1 标记成品已售出

**接口路径：** `PUT /api/v1/finished-products/:id/sold`

**权限要求：** 已认证用户

**请求参数：**

```typescript
{
  "sold_price": 128.00,
  "sold_date": "2024-01-15T14:30:00.000Z",
  "buyer_info": "张三，手机：138xxxx",
  "sale_channel": "线下门店",
  "notes": "客户很满意，推荐朋友"
}
```

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "成品已标记为售出",
  "data": {
    "sale_record": {
      "id": "sale_uuid",
      "sale_code": "SL20240115001",
      "product_id": "product_uuid",
      "product_name": "紫水晶多宝手串",
      "product_code": "FP20240115001",
      "selling_price": 128.00,
      "original_price": 128.00,
      "material_cost": 45.00,
      "labor_cost": 20.00,
      "craft_cost": 15.00,
      "total_cost": 80.00,
      "profit_amount": 48.00,
      "profit_margin": 37.50,
      "buyer_info": "张三，手机：138xxxx",
      "sale_date": "2024-01-15T14:30:00.000Z",
      "sale_channel": "线下门店",
      "notes": "客户很满意，推荐朋友",
      "created_at": "2024-01-15T14:30:00.000Z"
    },
    "updated_product": {
      "id": "product_uuid",
      "status": "OUT_OF_STOCK"
    }
  }
}
```

### 7.5 成本计算接口详细规范

#### 7.5.1 制作成本预估

**接口路径：** `POST /api/v1/finished-products/cost`

**权限要求：** 已认证用户

**请求参数：**

```typescript
{
  "materials": [
    {
      "purchase_id": "purchase_uuid_1",
      "quantity_used_beads": 20,
      "quantity_used_pieces": 0
    },
    {
      "purchase_id": "purchase_uuid_2",
      "quantity_used_beads": 0,
      "quantity_used_pieces": 3
    }
  ],
  "labor_cost": 20.00,
  "craft_cost": 15.00,
  "profit_margin": 40.0
}
```

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "成本计算成功",
  "data": {
    "estimated_cost": {
      "material_cost": 45.00,
      "labor_cost": 20.00,
      "craft_cost": 15.00,
      "total_cost": 80.00,
      "suggested_price": 133.33,
      "profit_margin": 40.0
    },
    "breakdown": [
      {
        "purchase_id": "purchase_uuid_1",
        "product_name": "8mm紫水晶手串",
        "quantity_used": 20,
        "unit_type": "beads",
        "unit_cost": 2.25,
        "total_cost": 45.00
      }
    ],
    "availability_check": {
      "all_available": true,
      "insufficient_materials": []
    }
  }
}
```

**业务逻辑：**

* 验证用户名和密码不能为空

* 查找用户并验证密码（bcrypt加密）

* 检查用户状态（isActive）

* 生成JWT Token（有效期24小时）

* 更新用户最后登录时间

* 记录登录操作日志

#### 2.1.2 Token验证接口

**接口路径：** `GET /api/v1/auth/verify`

**请求头：**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应数据结构：**

```typescript
// 验证成功
{
  "success": true,
  "message": "Token验证成功",
  "data": {
    "id": "user_001",
    "username": "boss",
    "real_name": "系统管理员",
    "name": "系统管理员",
    "email": "admin@example.com",
    "role": "BOSS",
    "avatar": null,
    "status": "active",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}

// 验证失败
{
  "success": false,
  "message": "Token无效或已过期",
  "error": {
    "code": "INVALID_TOKEN"
  }
}
```

#### 2.1.3 用户登出接口

**接口路径：** `POST /api/v1/auth/logout`

**权限要求：** 已认证用户

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "登出成功"
}
```

**业务逻辑：**

* 记录用户登出操作日志

* 前端清除本地存储的Token和用户信息

* 后端暂未实现Token黑名单机制（待开发）

### 2.2 采购管理接口（扩展产品类型支持）

| 接口路径                           | 方法     | 权限  | 核心参数                                                                    | 响应核心字段                     | 功能说明                |
| ------------------------------ | ------ | --- | ----------------------------------------------------------------------- | -------------------------- | ------------------- |
| /api/v1/purchases              | POST   | 已认证 | product\_name、product\_type、bead\_diameter、photos                       | id、purchase\_code          | 创建采购记录（支持4种产品类型）    |
| /api/v1/purchases              | GET    | 已认证 | page、search、quality、product\_types\[]、specificationMin、specificationMax | purchases\[]、pagination    | 采购列表查询（支持类型筛选和规格筛选） |
| /api/v1/purchases/:id          | PUT    | 已认证 | product\_name、price\_per\_gram、total\_price                             | purchase                   | 更新采购记录              |
| /api/v1/purchases/:id          | DELETE | 仅老板 | id                                                                      | deleted\_purchase\_id      | 删除采购记录（含业务逻辑验证）    |
| /api/v1/purchases/batch-import | POST   | 仅老板 | file（Excel）                                                             | total\_rows、success\_count | 批量导入采购数据            |
| /api/v1/purchases/export       | GET    | 已认证 | start\_date、end\_date、product\_types\[]                                 | download\_url、filename     | 导出采购数据              |

#### 2.2.1 采购删除接口详细规范

**接口路径：** `DELETE /api/v1/purchases/:id`

**权限要求：** 仅BOSS角色可以删除采购记录

**业务逻辑验证：**

1. **权限验证：** 检查当前用户角色是否为BOSS
2. **存在性验证：** 检查采购记录是否存在
3. **业务约束验证：** 检查是否有成品正在使用该采购记录的珠子
4. **数据完整性：** 使用数据库事务确保删除操作的原子性

**请求参数：**

```typescript
// URL参数
{
  "id": "purchase_uuid" // 采购记录ID
}
```

**响应数据结构：**

```typescript
// 删除成功
{
  "success": true,
  "message": "采购记录删除成功，相关库存数据已同步更新",
  "data": {
    "deletedPurchase": {
      "id": "purchase_uuid",
      "productName": "南红老型珠",
      "purchaseCode": "P20240115001"
    }
  }
}

// 权限不足错误
{
  "success": false,
  "message": "只有老板可以删除采购记录",
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS"
  }
}

// 采购记录不存在错误
{
  "success": false,
  "message": "采购记录不存在",
  "error": {
    "code": "PURCHASE_NOT_FOUND"
  }
}

// 业务约束错误（成品使用中）
{
  "success": false,
  "message": "无法删除该采购记录，因为以下成品正在使用其珠子：南红老型珠（销售成品）#1、南红老型珠（销售成品）#2。请先将这些成品拆散，使珠子回退到库存后再删除。",
  "error": {
    "code": "BUSINESS_CONSTRAINT_VIOLATION"
  },
  "data": {
    "usedByProducts": [
      {
        "productId": "product_uuid_1",
        "productName": "南红老型珠（销售成品）#1",
        "quantityUsed": 108
      },
      {
        "productId": "product_uuid_2",
        "productName": "南红老型珠（销售成品）#2",
        "quantityUsed": 216
      }
    ]
  }
}

// 系统错误
{
  "success": false,
  "message": "删除采购记录时发生错误，请稍后重试",
  "error": {
    "code": "SYSTEM_ERROR"
  }
}
```

**业务规则：**

* 只有BOSS角色可以删除采购记录
* 如果采购记录的珠子被成品使用，则不能删除
* 删除操作会同时清理相关库存数据
* 删除操作会记录详细的审计日志
* 使用数据库事务确保操作的原子性

**错误处理：**

* 403错误：权限不足
* 404错误：采购记录不存在
* 400错误：业务约束冲突（成品使用中）
* 500错误：系统内部错误

### 2.3 库存管理接口（仪表盘统计分析）

| 接口路径                                      | 方法  | 权限  | 核心参数                                    | 响应核心字段                           | 功能说明         |
| ----------------------------------------- | --- | --- | --------------------------------------- | -------------------------------- | ------------ |
| /api/v1/inventory/statistics              | GET | 已认证 | 无                                       | total\_stats、type\_statistics    | 获取库存统计数据     |
| /api/v1/inventory/product-distribution   | GET | 已认证 | product\_type                           | top\_products\[]、others          | 获取产品分布数据     |
| /api/v1/inventory/price-distribution     | GET | 已认证 | price\_type（unit\|total）               | price\_ranges\[]、total\_distribution | 获取价格分布数据     |
| /api/v1/inventory/consumption-analysis   | GET | 已认证 | time\_range、start\_date、end\_date     | consumption\_data\[]、summary     | 获取库存消耗分析数据   |
| /api/v1/inventory                         | GET | 已认证 | page、search、quality、low\_stock\_only   | inventory\[]、pagination          | 获取库存列表（原有接口） |
| /api/v1/inventory/hierarchical           | GET | 已认证 | expand\_all、product\_types\[]           | hierarchical\_data\[]            | 获取层级式库存数据    |

### 2.4 成品制作管理接口（完整业务流程）

| 接口路径                                | 方法     | 权限  | 核心参数                                                                | 响应核心字段                      | 功能说明           |
| ----------------------------------- | ------ | --- | ------------------------------------------------------------------- | --------------------------- | -------------- |
| /api/v1/finished-products           | POST   | 已认证 | product\_name、materials\[]、labor\_cost、selling\_price             | id、product\_code、total\_cost | 创建成品（含库存扣减）    |
| /api/v1/finished-products           | GET    | 已认证 | page、search、quality、status、specification\_min、specification\_max | products\[]、pagination     | 获取成品列表         |
| /api/v1/finished-products/:id       | GET    | 已认证 | id                                                                  | product、materials\_used     | 获取单个成品详情       |
| /api/v1/finished-products/:id       | PUT    | 已认证 | product\_name、selling\_price、status                               | product                     | 更新成品信息（开发中）    |
| /api/v1/finished-products/:id/destroy | DELETE | 已认证 | id                                                                  | destroyed\_product、rollback\_info | 销毁成品（含库存回滚）    |
| /api/v1/materials/available         | GET    | 已认证 | product\_types\[]、available\_only                                 | materials\[]、remaining\_info | 获取可用原材料列表      |

#### 2.3.1 库存统计接口详细规范

**接口路径：** `GET /api/v1/inventory/statistics`

**核心功能：** 提供库存仪表盘的核心统计数据，包括总体统计和按产品类型统计

**请求参数：** 无

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "获取库存统计成功",
  "data": {
    "total_stats": {
      "total_items": 156,
      "total_quantity": 2847,
      "total_low_stock": 12,
      "total_value": 45680.50
    },
    "type_statistics": [
      {
        "product_type": "LOOSE_BEADS",
        "total_items": 89,
        "total_quantity": 1523,
        "low_stock_count": 8,
        "total_value": 28450.30
      },
      {
        "product_type": "BRACELET",
        "total_items": 45,
        "total_quantity": 892,
        "low_stock_count": 3,
        "total_value": 12680.20
      },
      {
        "product_type": "ACCESSORIES",
        "total_items": 15,
        "total_quantity": 267,
        "low_stock_count": 1,
        "total_value": 3250.00
      },
      {
        "product_type": "FINISHED",
        "total_items": 7,
        "total_quantity": 165,
        "low_stock_count": 0,
        "total_value": 1300.00
      }
    ],
    "low_stock_products": [
      {
        "product_name": "8mm紫水晶散珠",
        "product_type": "LOOSE_BEADS",
        "remaining_quantity": 15,
        "min_stock_threshold": 50,
        "supplier_name": "张三水晶"
      }
    ],
    "quality_distribution": [
      {
        "quality": "AA",
        "total_quantity": 1245,
        "percentage": 43.7
      },
      {
        "quality": "A",
        "total_quantity": 892,
        "percentage": 31.3
      },
      {
        "quality": "AB",
        "total_quantity": 456,
        "percentage": 16.0
      },
      {
        "quality": "B",
        "total_quantity": 189,
        "percentage": 6.6
      },
      {
        "quality": "C",
        "total_quantity": 65,
        "percentage": 2.3
      }
    ],
    "supplier_distribution": [
      {
        "supplier_name": "张三水晶",
        "total_quantity": 1234,
        "total_value": 18560.50,
        "percentage": 43.4
      },
      {
        "supplier_name": "李四珠宝",
        "total_quantity": 892,
        "total_value": 15420.30,
        "percentage": 31.3
      }
    ]
  }
}
```

**字段说明：**

| 字段名                    | 数据类型   | 权限控制        | 说明                |
| ---------------------- | ------ | ----------- | ----------------- |
| total\_items           | number | 全部可见        | 库存总条目数            |
| total\_quantity        | number | 全部可见        | 库存总数量             |
| total\_low\_stock      | number | 全部可见        | 低库存商品数量           |
| total\_value           | number | **仅BOSS可见** | 库存总价值（敏感字段）       |
| product\_type          | string | 全部可见        | 产品类型枚举            |
| low\_stock\_count      | number | 全部可见        | 该类型低库存商品数量        |
| quality\_distribution  | array  | 全部可见        | 品相分布统计            |
| supplier\_distribution | array  | **仅BOSS可见** | 供应商分布统计（包含价值信息）   |

#### 2.3.2 产品分布接口详细规范

**接口路径：** `GET /api/v1/inventory/product-distribution`

**核心功能：** 提供产品库存分布数据，用于饼图展示

**请求参数：**

| 参数名           | 类型     | 必填 | 说明                                                | 示例值           |
| ------------- | ------ | -- | ------------------------------------------------- | ------------- |
| product\_type | string | 否  | 产品类型筛选：LOOSE\_BEADS\|BRACELET\|ACCESSORIES\|FINISHED | LOOSE\_BEADS |

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "获取产品分布成功",
  "data": {
    "top_products": [
      {
        "product_name": "8mm紫水晶散珠",
        "product_type": "LOOSE_BEADS",
        "total_quantity": 456,
        "percentage": 28.5
      },
      {
        "product_name": "10mm白水晶散珠",
        "product_type": "LOOSE_BEADS",
        "total_quantity": 342,
        "percentage": 21.3
      },
      {
        "product_name": "6mm粉水晶手串",
        "product_type": "BRACELET",
        "total_quantity": 189,
        "percentage": 11.8
      }
    ],
    "others": {
      "total_quantity": 615,
      "percentage": 38.4
    }
  }
}
```

#### 2.3.3 价格分布接口详细规范

**接口路径：** `GET /api/v1/inventory/price-distribution`

**核心功能：** 提供价格区间分布和总价分布数据，支持单价和总价两种分析维度

**请求参数：**

| 参数名         | 类型     | 必填 | 说明                      | 示例值   |
| ----------- | ------ | -- | ----------------------- | ----- |
| price\_type | string | 否  | 价格类型：unit（单价）\|total（总价） | unit  |

**响应数据结构：**

```typescript
// 单价区间分布 (price_type=unit)
{
  "success": true,
  "message": "获取价格分布成功",
  "data": {
    "price_ranges": [
      {
        "name": "0-50元",
        "value": 89,
        "percentage": 57.1,
        "product_type": "FINISHED"
      },
      {
        "name": "50-100元",
        "value": 45,
        "percentage": 28.8,
        "product_type": "FINISHED"
      },
      {
        "name": "100-200元",
        "value": 15,
        "percentage": 9.6,
        "product_type": "FINISHED"
      },
      {
        "name": "200-500元",
        "value": 6,
        "percentage": 3.8,
        "product_type": "FINISHED"
      },
      {
        "name": "500元以上",
        "value": 1,
        "percentage": 0.6,
        "product_type": "FINISHED"
      }
    ]
  }
}
```

#### 2.4.1 成品制作接口详细规范

**接口路径：** `POST /api/v1/finished-products`

**核心功能：** 创建成品记录，自动扣减原材料库存，支持直接转化和组合制作两种模式

**请求参数：**

```typescript
{
  "product_name": "紫水晶多宝手串",
  "description": "8mm紫水晶配金珠设计款",
  "specification": "8.5",
  "materials": [
    {
      "purchase_id": "purchase_001",
      "quantity_used_beads": 20,
      "quantity_used_pieces": 0
    },
    {
      "purchase_id": "purchase_002",
      "quantity_used_beads": 0,
      "quantity_used_pieces": 3
    }
  ],
  "labor_cost": 15.00,
  "craft_cost": 8.00,
  "selling_price": 128.00,
  "photos": ["https://example.com/photo1.jpg"]
}
```

**请求参数说明：**

| 参数名                    | 类型     | 必填 | 说明                                    | 示例值                  |
| ---------------------- | ------ | -- | ------------------------------------- | -------------------- |
| product\_name          | string | 是  | 成品名称                                  | "紫水晶多宝手串"            |
| description            | string | 否  | 成品描述                                  | "8mm紫水晶配金珠设计款"       |
| specification          | string | 否  | 规格（平均直径等）                             | "8.5"                |
| materials              | array  | 是  | 原材料使用列表                               | 见下方材料结构              |
| labor\_cost            | number | 否  | 人工成本                                  | 15.00                |
| craft\_cost            | number | 否  | 工艺成本                                  | 8.00                 |
| selling\_price         | number | 是  | 销售价格                                  | 128.00               |
| photos                 | array  | 否  | 成品图片URL数组                             | ["photo1.jpg"]       |

**材料使用结构（materials数组元素）：**

| 参数名                      | 类型     | 必填 | 说明                                      | 示例值           |
| ------------------------ | ------ | -- | --------------------------------------- | ------------- |
| purchase\_id             | string | 是  | 原材料采购记录ID                              | "purchase_001" |
| quantity\_used\_beads    | number | 否  | 使用的珠子颗数（散珠、手串类型使用）                    | 20            |
| quantity\_used\_pieces   | number | 否  | 使用的片/件数（饰品配件、成品类型使用）                  | 3             |

**响应数据结构：**

```typescript
// 创建成功
{
  "success": true,
  "message": "成品创建成功",
  "data": {
    "id": "product_001",
    "product_code": "FP20240115001",
    "total_cost": 45.50  // 仅BOSS角色可见
  }
}

// 创建失败 - 库存不足
{
  "success": false,
  "message": "原材料库存不足",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "details": "原材料 8mm紫水晶散珠 库存不足，可用：15颗，需要：20颗"
  }
}
```

**业务逻辑：**

1. **库存验证：** 验证所有原材料的可用库存是否充足
2. **库存扣减：** 在MaterialUsage表中记录原材料使用情况
3. **成本计算：** 自动计算材料成本 + 人工成本 + 工艺成本
4. **成品编号：** 自动生成格式为FP+日期+3位序号的成品编号
5. **权限控制：** 成本信息仅BOSS角色可见
6. **事务处理：** 整个过程在数据库事务中执行，确保数据一致性

#### 2.4.2 成品列表接口详细规范

**接口路径：** `GET /api/v1/finished-products`

**核心功能：** 获取成品列表，支持分页、搜索、筛选等功能

**请求参数：**

| 参数名                    | 类型     | 必填 | 说明                                    | 示例值        |
| ---------------------- | ------ | -- | ------------------------------------- | ---------- |
| page                   | number | 否  | 页码，默认1                               | 1          |
| limit                  | number | 否  | 每页数量，默认20，最大100                      | 20         |
| search                 | string | 否  | 搜索关键词（产品名称）                           | "紫水晶"      |
| quality                | string | 否  | 品相筛选：AA\|A\|AB\|B\|C                  | "AA"       |
| status                 | string | 否  | 状态筛选：available\|sold\|reserved        | "available" |
| specification\_min     | number | 否  | 最小规格                                  | 6.0        |
| specification\_max     | number | 否  | 最大规格                                  | 10.0       |

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "获取成品列表成功",
  "data": {
    "products": [
      {
        "id": "product_001",
        "product_code": "FP20240115001",
        "product_name": "紫水晶多宝手串",
        "description": "8mm紫水晶配金珠设计款",
        "specification": 8.5,
        "photos": ["https://example.com/photo1.jpg"],
        "selling_price": 128.00,
        "status": "available",
        "created_at": "2024-01-15T10:30:00.000Z",
        // 以下字段仅BOSS角色可见
        "material_cost": 22.50,
        "labor_cost": 15.00,
        "craft_cost": 8.00,
        "total_cost": 45.50,
        "profit_margin": 64.5
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 89,
      "items_per_page": 20
    }
  }
}
```

#### 2.4.3 成品销毁接口详细规范

**接口路径：** `DELETE /api/v1/finished-products/:id/destroy`

**核心功能：** 销毁成品并回滚原材料库存，支持完整的库存回滚逻辑

**请求参数：**

| 参数名 | 类型     | 必填 | 说明     | 示例值           |
| --- | ------ | -- | ------ | ------------- |
| id  | string | 是  | 成品记录ID | "product_001" |

**响应数据结构：**

```typescript
// 销毁成功
{
  "success": true,
  "message": "成品销毁成功，原材料已回滚",
  "data": {
    "destroyed_product": {
      "id": "product_001",
      "product_name": "紫水晶多宝手串",
      "product_code": "FP20240115001"
    },
    "rollback_info": [
      {
        "purchase_id": "purchase_001",
        "product_name": "8mm紫水晶散珠",
        "returned_beads": 20,
        "returned_pieces": 0
      },
      {
        "purchase_id": "purchase_002",
        "product_name": "金珠配件",
        "returned_beads": 0,
        "returned_pieces": 3
      }
    ]
  }
}

// 销毁失败 - 成品不存在
{
  "success": false,
  "message": "成品记录不存在",
  "error": {
    "code": "PRODUCT_NOT_FOUND"
  }
}
```

**业务逻辑：**

1. **权限验证：** 验证用户是否有销毁权限
2. **存在性检查：** 验证成品记录是否存在
3. **库存回滚：** 根据MaterialUsage记录回滚原材料库存
4. **记录删除：** 删除成品记录和相关的MaterialUsage记录
5. **事务处理：** 整个过程在数据库事务中执行
6. **操作日志：** 记录销毁操作的审计日志

#### 2.4.4 可用原材料接口详细规范

**接口路径：** `GET /api/v1/materials/available`

**核心功能：** 获取可用于成品制作的原材料列表，包含剩余库存信息

**请求参数：**

| 参数名               | 类型    | 必填 | 说明                                                      | 示例值                                    |
| ----------------- | ----- | -- | ------------------------------------------------------- | -------------------------------------- |
| product\_types    | array | 否  | 产品类型筛选：LOOSE\_BEADS\|BRACELET\|ACCESSORIES\|FINISHED | ["LOOSE_BEADS", "BRACELET"]            |
| available\_only   | bool  | 否  | 仅显示有库存的原材料，默认true                                     | true                                   |

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "获取可用原材料成功",
  "data": {
    "materials": [
      {
        "purchase_id": "purchase_001",
        "product_name": "8mm紫水晶散珠",
        "product_type": "LOOSE_BEADS",
        "specification": 8.0,
        "quality": "AA",
        "supplier_name": "张三水晶",  // 仅BOSS可见
        "photos": ["https://example.com/photo1.jpg"],
        // 库存信息
        "total_beads": 500,
        "used_beads": 120,
        "remaining_beads": 380,
        "total_pieces": null,
        "used_pieces": null,
        "remaining_pieces": null,
        // 成本信息（仅BOSS可见）
        "unit_cost": 0.45,
        "total_cost": 225.00
      },
      {
        "purchase_id": "purchase_002",
        "product_name": "金珠配件",
        "product_type": "ACCESSORIES",
        "specification": 6.0,
        "quality": "AA",
        "supplier_name": "李四珠宝",  // 仅BOSS可见
        "photos": ["https://example.com/photo2.jpg"],
        // 库存信息
        "total_beads": null,
        "used_beads": null,
        "remaining_beads": null,
        "total_pieces": 50,
        "used_pieces": 12,
        "remaining_pieces": 38,
        // 成本信息（仅BOSS可见）
        "unit_cost": 2.50,
        "total_cost": 125.00
      }
    ],
    "remaining_info": {
      "total_available_materials": 2,
      "total_remaining_value": 350.00  // 仅BOSS可见
    }
  }
}
```

**字段说明：**

| 字段名                  | 数据类型   | 权限控制        | 说明                          |
| -------------------- | ------ | ----------- | --------------------------- |
| remaining\_beads     | number | 全部可见        | 剩余珠子颗数（散珠、手串类型）             |
| remaining\_pieces    | number | 全部可见        | 剩余片/件数（饰品配件、成品类型）           |
| supplier\_name       | string | **仅BOSS可见** | 供应商名称                       |
| unit\_cost           | number | **仅BOSS可见** | 单位成本（每颗/每片/每件）             |
| total\_cost          | number | **仅BOSS可见** | 该原材料的总成本                    |
| total\_remaining\_value | number | **仅BOSS可见** | 所有可用原材料的剩余总价值               |
        "percentage": 0.6,
        "product_type": "FINISHED"
      }
    ]
  }
}

// 总价分布 (price_type=total)
{
  "success": true,
  "message": "获取价格分布成功",
  "data": {
    "total_distribution": [
      {
        "product_name": "紫水晶多宝手串",
        "product_type": "FINISHED",
        "quality": "AA",
        "total_price": 1580.00,
        "supplier_name": "张三水晶",
        "percentage": 15.2
      },
      {
        "product_name": "白水晶项链",
        "product_type": "FINISHED",
        "quality": "A",
        "total_price": 890.00,
        "supplier_name": "李四珠宝",
        "percentage": 8.6
      }
    ]
  }
}
```

**价格区间定义（成品）：**

| 价格区间    | 范围（元）      | 说明       |
| ------- | ---------- | -------- |
| 0-50元   | [0, 50]    | 低价位成品    |
| 50-100元 | (50, 100]  | 中低价位成品   |
| 100-200元| (100, 200] | 中价位成品    |
| 200-500元| (200, 500] | 中高价位成品   |
| 500元以上  | (500, ∞)   | 高价位成品    |

#### 2.3.4 库存消耗分析接口详细规范

**接口路径：** `GET /api/v1/inventory/consumption-analysis`

**核心功能：** 提供库存消耗分析数据，支持时间范围筛选和趋势分析

**请求参数：**

| 参数名           | 类型     | 必填 | 说明                                | 示例值        |
| ------------- | ------ | -- | --------------------------------- | ---------- |
| time\_range   | string | 否  | 时间范围：7d\|30d\|90d\|custom         | 30d        |
| start\_date   | string | 否  | 开始日期（time\_range=custom时必填）      | 2024-01-01 |
| end\_date     | string | 否  | 结束日期（time\_range=custom时必填）      | 2024-01-31 |

#### 2.3.5 库存状态查询接口详细规范

**接口路径：** `GET /api/v1/inventory/status`

**核心功能：** 获取库存状态统计信息，包括库存分级统计和低库存预警

**请求参数：**

| 参数名           | 类型     | 必填 | 说明                                | 示例值        |
| ------------- | ------ | -- | --------------------------------- | ---------- |
| include\_zero | boolean | 否  | 是否包含库存为0的项目                     | false      |
| product\_types | string\[] | 否  | 产品类型筛选                           | ["LOOSE_BEADS"] |
| low\_stock\_only | boolean | 否  | 仅显示低库存项目                         | false      |

**响应数据结构（库存状态查询）：**

```typescript
{
  "success": true,
  "message": "获取库存状态成功",
  "data": {
    "status_summary": {
      "total_items": 156,
      "stock_sufficient": 89,    // 库存充足（> 200）
      "stock_medium": 45,        // 中等库存（51-200）
      "stock_low": 22,           // 低库存（1-50）
      "stock_empty": 0,          // 库存为0（仅当include_zero=true时显示）
      "low_stock_percentage": 14.1
    },
    "low_stock_items": [
      {
        "purchase_id": "purchase_001",
        "product_name": "8mm紫水晶散珠",
        "product_type": "LOOSE_BEADS",
        "specification": "8mm",
        "quality": "AA",
        "remaining_quantity": 35,
        "is_low_stock": true,
        "supplier_name": "张三水晶",
        "last_purchase_date": "2024-01-10T00:00:00.000Z",
        "days_since_last_purchase": 15,
        "suggested_reorder_quantity": 200
      }
    ],
    "stock_distribution": [
      {
        "product_type": "LOOSE_BEADS",
        "total_items": 78,
        "stock_sufficient": 45,
        "stock_medium": 25,
        "stock_low": 8,
        "stock_empty": 0
      },
      {
        "product_type": "BRACELET",
        "total_items": 45,
        "stock_sufficient": 28,
        "stock_medium": 12,
        "stock_low": 5,
        "stock_empty": 0
      }
    ]
  }
}
```

**库存消耗分析响应数据结构：**

```typescript
{
  "success": true,
  "message": "获取库存消耗分析成功",
  "data": {
    "consumption_data": [
      {
        "purchase_id": "purchase_001",
        "product_name": "8mm紫水晶散珠",
        "product_type": "LOOSE_BEADS",
        "bead_diameter": 8,
        "quality": "AA",
        "supplier_name": "张三水晶",
        "total_consumed": 156,
        "consumption_count": 8,
        "avg_consumption": 19.5,
        "last_consumption_date": "2024-01-15T10:30:00.000Z"
      }
    ],
    "summary": {
      "total_consumption_records": 45,
      "total_quantity_consumed": 1234,
      "most_consumed_product": "8mm紫水晶散珠",
      "avg_daily_consumption": 41.1,
      "consumption_trend": "increasing"
    },
    "time_series": [
      {
        "date": "2024-01-01",
        "daily_consumption": 35,
        "cumulative_consumption": 35
      },
      {
        "date": "2024-01-02",
        "daily_consumption": 42,
        "cumulative_consumption": 77
      }
    ]
  }
}
```

#### 2.3.6 库存状态更新接口详细规范

**接口路径：** `PUT /api/v1/inventory/:id/status`

**核心功能：** 手动更新库存项目的低库存标记状态

**权限要求：** 仅BOSS角色可以手动更新库存状态

**请求参数：**

```typescript
{
  "is_low_stock": true,           // 是否标记为低库存
  "low_stock_threshold": 50,      // 低库存阈值（可选）
  "notes": "手动标记为低库存，需要紧急补货"  // 备注信息（可选）
}
```

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "库存状态更新成功",
  "data": {
    "purchase_id": "purchase_001",
    "product_name": "8mm紫水晶散珠",
    "is_low_stock": true,
    "remaining_quantity": 35,
    "updated_at": "2024-01-31T10:30:00.000Z",
    "updated_by": "boss"
  }
}
```

**业务逻辑说明：**

* `total_consumed`：该采购记录的总消耗数量
* `consumption_count`：消耗次数（制作成品的次数）
* `avg_consumption`：平均每次消耗数量
* `consumption_trend`：消耗趋势（increasing/decreasing/stable）
* 时间序列数据用于绘制消耗趋势图表

### 2.6 成品制作管理接口（新增）

| 接口路径                                | 方法     | 权限  | 核心参数                                                      | 响应核心字段                        | 功能说明           |
| ----------------------------------- | ------ | --- | --------------------------------------------------------- | ----------------------------- | -------------- |
| /api/v1/finished-products           | POST   | 已认证 | product\_name、materials\[]、selling\_price、photos        | id、product\_code              | 创建销售成品记录       |
| /api/v1/finished-products/batch     | POST   | 已认证 | products\[]（批量成品信息）                                     | created\_products\[]、success\_count | 批量创建销售成品（直接转化） |
| /api/v1/finished-products           | GET    | 已认证 | page、search、status、price\_min、price\_max                | finished\_products\[]、pagination | 销售成品列表查询       |
| /api/v1/finished-products/:id       | GET    | 已认证 | id                                                        | finished\_product、materials    | 获取单个销售成品详情     |
| /api/v1/finished-products/:id       | PUT    | 已认证 | product\_name、selling\_price、status                      | finished\_product              | 更新销售成品信息       |
| /api/v1/finished-products/:id       | DELETE | 仅老板 | id                                                        | deleted\_product\_id          | 删除销售成品（回滚库存）   |
| /api/v1/finished-products/:id/sell  | POST   | 已认证 | selling\_price、buyer\_info                               | sale\_record                  | 标记成品为已售出       |
| /api/v1/finished-products/materials | GET    | 已认证 | search、product\_types\[]、available\_only                | available\_materials\[]        | 获取可用原材料列表      |
| /api/v1/finished-products/cost      | POST   | 已认证 | materials\[]、labor\_cost、craft\_cost                   | cost\_breakdown               | 计算制作成本预估       |

#### 2.6.1 创建销售成品接口详细规范

**接口路径：** `POST /api/v1/finished-products`

**业务说明：** 将库存原材料转化为销售成品，自动扣减库存并记录制作成本（组合制作模式）

#### 2.6.2 批量创建销售成品接口详细规范

**接口路径：** `POST /api/v1/finished-products/batch`

**业务说明：** 直接转化模式专用，批量将原材料成品转化为销售成品，每个原材料对应一个独立的销售成品

**请求参数：**

```typescript
{
  "products": [
    {
      "material_id": "purchase_001",
      "product_name": "紫水晶手串A",
      "description": "8mm紫水晶手串，颜色深邃",
      "specification": "手围16cm",
      "labor_cost": 30.00,
      "craft_cost": 10.00,
      "selling_price": 199.00,
      "photos": ["http://api.example.com/uploads/finished1.jpg"]
    },
    {
      "material_id": "purchase_002",
      "product_name": "紫水晶手串B",
      "description": "8mm紫水晶手串，品相优良",
      "specification": "手围17cm",
      "labor_cost": 35.00,
      "craft_cost": 15.00,
      "selling_price": 229.00,
      "photos": ["http://api.example.com/uploads/finished2.jpg"]
    }
  ]
}
```

**响应数据结构：**

```typescript
// 批量创建成功
{
  "success": true,
  "message": "批量创建销售成品成功",
  "data": {
    "success_count": 2,
    "failed_count": 0,
    "created_products": [
      {
        "id": "finished_001",
        "product_code": "FP20240131001",
        "product_name": "紫水晶手串A",
        "material_cost": 80.00,
        "total_cost": 120.00,
        "selling_price": 199.00,
        "profit_margin": 39.7,
        "status": "AVAILABLE"
      },
      {
        "id": "finished_002",
        "product_code": "FP20240131002",
        "product_name": "紫水晶手串B",
        "material_cost": 90.00,
        "total_cost": 140.00,
        "selling_price": 229.00,
        "profit_margin": 38.9,
        "status": "AVAILABLE"
      }
    ],
    "failed_products": []
  }
}

// 部分失败
{
  "success": true,
  "message": "批量创建部分成功",
  "data": {
    "success_count": 1,
    "failed_count": 1,
    "created_products": [
      {
        "id": "finished_001",
        "product_code": "FP20240131001",
        "product_name": "紫水晶手串A",
        "material_cost": 80.00,
        "total_cost": 120.00,
        "selling_price": 199.00,
        "profit_margin": 39.7,
        "status": "AVAILABLE"
      }
    ],
    "failed_products": [
      {
        "material_id": "purchase_002",
        "error": "原材料库存不足",
        "error_code": "INSUFFICIENT_STOCK"
      }
    ]
  }
}
```

**请求参数：**

```typescript
{
  "product_name": "紫水晶多宝手串",
  "description": "8mm紫水晶配南红玛瑙",
  "specification": "手围16cm",
  "materials": [
    {
      "purchase_id": "purchase_001",
      "quantity_used_beads": 20,
      "quantity_used_pieces": 0
    },
    {
      "purchase_id": "purchase_002",
      "quantity_used_beads": 0,
      "quantity_used_pieces": 2
    }
  ],
  "labor_cost": 50.00,
  "craft_cost": 20.00,
  "selling_price": 299.00,
  "profit_margin": 30.5,
  "photos": ["http://api.example.com/uploads/finished1.jpg"]
}
```

**响应数据结构：**

```typescript
// 创建成功
{
  "success": true,
  "message": "销售成品创建成功",
  "data": {
    "id": "finished_001",
    "product_code": "FP20240131001",
    "product_name": "紫水晶多宝手串",
    "material_cost": 120.00,
    "labor_cost": 50.00,
    "craft_cost": 20.00,
    "total_cost": 190.00,
    "selling_price": 299.00,
    "profit_margin": 30.5,
    "status": "AVAILABLE",
    "created_at": "2024-01-31T10:30:00.000Z"
  }
}

// 库存不足
{
  "success": false,
  "message": "原材料库存不足",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "details": {
      "purchase_id": "purchase_001",
      "required": 20,
      "available": 15
    }
  }
}
```

#### 2.6.2 获取可用原材料接口

**接口路径：** `GET /api/v1/finished-products/materials`

**请求参数：**

```typescript
{
  "search": "紫水晶",
  "product_types": ["LOOSE_BEADS", "BRACELET", "ACCESSORIES", "FINISHED"],
  "available_only": true,
  "min_quantity": 10
}
```

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "获取可用原材料成功",
  "data": {
    "materials": [
      {
        "purchase_id": "purchase_001",
        "product_name": "8mm紫水晶散珠",
        "product_type": "LOOSE_BEADS",
        "bead_diameter": 8,
        "quality": "AA",
        "available_quantity": 150,
        "unit_cost": 2.5,
        "supplier_name": "张三水晶"
      }
    ],
    "total_count": 1
  }
}
```

#### 2.6.3 制作成本预估接口

**接口路径：** `POST /api/v1/finished-products/cost`

**请求参数：**

```typescript
{
  "materials": [
    {
      "purchase_id": "purchase_001",
      "quantity_used_beads": 20
    }
  ],
  "labor_cost": 50.00,
  "craft_cost": 20.00,
  "profit_margin": 30
}
```

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "成本计算成功",
  "data": {
    "cost_breakdown": {
      "material_cost": 120.00,
      "labor_cost": 50.00,
      "craft_cost": 20.00,
      "total_cost": 190.00
    },
    "pricing_suggestion": {
      "suggested_price": 247.00,
      "profit_margin": 30,
      "profit_amount": 57.00
    },
    "material_details": [
      {
        "purchase_id": "purchase_001",
        "product_name": "8mm紫水晶散珠",
        "quantity_used": 20,
        "unit_cost": 2.5,
        "total_cost": 50.00
      }
    ]
  }
}
```

#### 2.2.1 创建采购记录接口详细规范

**接口路径：** `POST /api/v1/purchases`

**重要说明：** 后端会自动计算并存储价格相关字段，前端无需计算。

**请求参数：**

```typescript
{
  "product_name": "8mm紫水晶手串",
  "product_type": "BRACELET",
  "unit_type": "STRINGS",
  "bead_diameter": 8,
  "quantity": 2,
  "price_per_gram": 15.5,
  "total_price": 186.0,
  "weight": 12.0,
  "quality": "AA",
  "supplier_name": "张三水晶",
  "notes": "颜色较深，质地不错",
  "photos": ["http://api.example.com/uploads/image1.jpg"],
  "natural_language_input": "2串8mm紫水晶"
}
```

**后端自动计算字段：**

系统会根据产品类型和输入参数自动计算以下字段并存储到数据库：

| 计算字段 | 计算逻辑 | 适用产品类型 | 说明 |
|----------|----------|-------------|------|
| `price_per_bead` | total_price ÷ total_beads | 散珠、手串 | 每颗价格，精度4位小数 |
| `price_per_piece` | total_price ÷ piece_count | 饰品配件、成品 | 每片/件价格，精度4位小数 |
| `unit_price` | total_price ÷ quantity | 所有类型 | 单价，精度1位小数 |
| `beads_per_string` | Math.floor(160 ÷ bead_diameter) | 手串 | 每串颗数，基于160mm周长 |
| `total_beads` | quantity × beads_per_string | 手串 | 总颗数 |

**计算示例（手串类型）：**

输入：`bead_diameter: 8, quantity: 2, total_price: 186.0`

自动计算：
- `beads_per_string = Math.floor(160 ÷ 8) = 20`
- `total_beads = 2 × 20 = 40`
- `price_per_bead = 186.0 ÷ 40 = 4.6500`
- `unit_price = 186.0 ÷ 2 = 93.0`

**产品类型验证规则：**

| 产品类型         | 必填字段                                                                      | 可选字段                                        | 验证规则            |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------- | --------------- |
| LOOSE\_BEADS | product\_name, bead\_diameter, piece\_count, total\_price, supplier\_name | price\_per\_gram, weight, quality           | 散珠按颗数计量         |
| BRACELET     | product\_name, bead\_diameter, quantity, supplier\_name                   | price\_per\_gram, total\_price, weight（三选二） | 手串按条数计量，自动计算总颗数 |
| ACCESSORIES  | product\_name, specification, piece\_count, total\_price, supplier\_name  | quality                                     | 饰品配件按片数计量       |
| FINISHED     | product\_name, specification, piece\_count, total\_price, supplier\_name  | quality                                     | 成品按件数计量         |

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "采购记录创建成功",
  "data": {
    "id": "purchase_001",
    "purchase_code": "CG20240115123456",
    "product_name": "8mm紫水晶手串",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 2.2.1 采购列表查询接口详细规范

**接口路径：** `GET /api/v1/purchases`

**核心功能：** 支持多维度筛选、智能排序、跨页状态保持的采购数据查询

**请求参数详细说明：**

| 参数名              | 类型           | 必填 | 说明              | 示例值                           | 特殊处理           |
| ---------------- | ------------ | -- | --------------- | ----------------------------- | -------------- |
| **基础分页参数**       |              |    |                 |                               |                |
| page             | number       | 否  | 页码，默认1          | 1                             | 跨页筛选状态保持       |
| limit            | number       | 否  | 每页数量，默认10，最大100 | 10                            | 性能限制           |
| **排序参数**         |              |    |                 |                               |                |
| sortBy           | string       | 否  | 排序字段，支持智能排序     | specification                 | 见智能排序说明        |
| sortOrder        | string       | 否  | 排序方向：asc/desc   | desc                          | 默认desc         |
| **搜索筛选**         |              |    |                 |                               |                |
| search           | string       | 否  | 搜索关键词（产品名称、供应商） | 紫水晶                           | 300ms防抖        |
| **供应商筛选**        |              |    |                 |                               |                |
| supplier         | string/array | 否  | 供应商筛选，支持多选      | "张三水晶" 或 \["张三","李四"]         | 基于全部数据筛选       |
| **产品类型筛选**       |              |    |                 |                               |                |
| product\_types   | array        | 否  | 产品类型多选筛选        | \["LOOSE\_BEADS", "BRACELET"] | 空数组=全选状态       |
| quality          | array        | 否  | 品相多选筛选          | \["AA", "AB", "UNKNOWN"]      | UNKNOWN映射为null |
| **范围筛选参数**       |              |    |                 |                               |                |
| diameterMin      | number       | 否  | 最小珠径(mm)        | 6                             | 仅散珠/手串有效       |
| diameterMax      | number       | 否  | 最大珠径(mm)        | 12                            | 仅散珠/手串有效       |
| specificationMin | number       | 否  | 最小规格            | 7                             | 动态字段查询         |
| specificationMax | number       | 否  | 最大规格            | 11                            | 动态字段查询         |
| quantityMin      | number       | 否  | 最小数量            | 1                             | 根据产品类型动态查询     |
| quantityMax      | number       | 否  | 最大数量            | 100                           | 根据产品类型动态查询     |
| pricePerGramMin  | number       | 否  | 最小克价            | 10                            | null值视为0处理     |
| pricePerGramMax  | number       | 否  | 最大克价            | 50                            | null值视为0处理     |
| totalPriceMin    | number       | 否  | 最小总价            | 100                           | 总价范围筛选         |
| totalPriceMax    | number       | 否  | 最大总价            | 1000                          | 总价范围筛选         |
| **日期筛选**         |              |    |                 |                               |                |
| startDate        | string       | 否  | 开始日期            | 2024-01-01                    | 自动设置为00:00:00  |
| endDate          | string       | 否  | 结束日期            | 2024-12-31                    | 自动设置为23:59:59  |

**智能排序功能说明：**

| 排序字段             | 排序逻辑       | 实现方式  | 特殊处理                                   |
| ---------------- | ---------- | ----- | -------------------------------------- |
| specification    | 根据产品类型动态排序 | 原生SQL | 散珠/手串按bead\_diameter，其他按specification  |
| quantity         | 根据产品类型动态排序 | 原生SQL | 手串按quantity，其他按piece\_count            |
| price\_per\_gram | 克价排序       | 原生SQL | COALESCE(price\_per\_gram, 0)，null值视为0 |
| supplier\_name   | 供应商排序      | 关联查询  | JOIN suppliers表                        |
| created\_at      | 创建时间排序     | 标准排序  | 默认排序字段                                 |
| total\_price     | 总价排序       | 标准排序  | 数值排序                                   |

**规格筛选特殊逻辑：**

* `specificationMin/Max` 参数同时应用到 `bead_diameter` 和 `specification` 字段

* 查询逻辑：`(bead_diameter BETWEEN min AND max) OR (specification BETWEEN min AND max)`

* 确保所有产品类型都能被正确筛选

**品相筛选特殊处理：**

* 前端 `UNKNOWN` 选项映射为后端 `null` 值

* 支持多选：`quality IN ('AA', 'AB') OR quality IS NULL`

* 空数组表示不筛选品相

**供应商筛选逻辑：**

* 支持字符串（单选）和数组（多选）两种格式

* 单选时使用模糊匹配：`supplier_name LIKE '%keyword%'`

* 多选时使用精确匹配：`supplier_name IN (list)`

* 基于全部数据而非当前页数据进行筛选

**产品类型筛选规则：**

* 空数组 `[]` 表示显示所有产品类型（全选状态）

* 非空数组表示筛选指定类型：`product_type IN (types)`

* 前端UI应正确显示全选/部分选择状态

**响应数据结构：**

```typescript
{
  "success": true,
  "data": {
    "purchases": [
      {
        "id": "purchase_001",
        "purchase_code": "CG20240115123456",
        "product_name": "8mm紫水晶手串",
        "product_type": "BRACELET",
        "unit_type": "STRINGS",
        "bead_diameter": 8,
        "specification": 8,
        "quantity": 2,
        "piece_count": 108,
        "price_per_gram": 15.5,
        "unit_price": 93.0,
        "total_price": 186.0,
        "weight": 12.0,
        "quality": "AA",
        "supplier_name": "张三水晶",
        "supplier_id": "supplier_001",
        "notes": "颜色较深，质地不错",
        "photos": ["http://api.example.com/uploads/image1.jpg"],
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z",
        "created_by": "user_001",
        "user": {
          "id": "user_001",
          "username": "boss",
          "real_name": "系统管理员"
        },
        "supplier": {
          "id": "supplier_001",
          "name": "张三水晶",
          "contact_person": "张三",
          "phone": "13800138000"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 156,
      "total_pages": 16,
      "has_next_page": true,
      "has_prev_page": false
    }
  }
}
```

**字段映射和权限控制：**

| 字段名              | 数据类型        | 权限控制        | 说明             |
| ---------------- | ----------- | ----------- | -------------- |
| id               | string      | 全部可见        | 采购记录唯一标识       |
| purchase\_code   | string      | 全部可见        | 采购编号           |
| product\_name    | string      | 全部可见        | 产品名称           |
| product\_type    | enum        | 全部可见        | 产品类型枚举         |
| bead\_diameter   | number/null | 全部可见        | 珠径(mm)，散珠/手串专用 |
| specification    | number/null | 全部可见        | 规格，饰品配件/成品专用   |
| quantity         | number/null | 全部可见        | 数量（串数/件数）      |
| piece\_count     | number/null | 全部可见        | 颗数/片数          |
| price\_per\_gram | number/null | **仅BOSS可见** | 克价，敏感字段        |
| unit\_price      | number/null | **仅BOSS可见** | 单价，敏感字段        |
| total\_price     | number      | **仅BOSS可见** | 总价，敏感字段        |
| weight           | number/null | 全部可见        | 重量(g)          |
| quality          | enum/null   | 全部可见        | 品相等级           |
| supplier\_name   | string      | 全部可见        | 供应商名称          |
| supplier\_id     | string      | 全部可见        | 供应商ID          |
| notes            | string/null | 全部可见        | 备注信息           |
| photos           | array       | 全部可见        | 图片URL数组        |
| created\_at      | datetime    | 全部可见        | 创建时间           |
| updated\_at      | datetime    | 全部可见        | 更新时间           |
| created\_by      | string      | 全部可见        | 创建用户ID         |

**null值处理规范：**

* `price_per_gram` 为null时，在克价筛选中视为0处理

* `bead_diameter` 和 `specification` 根据产品类型有一个为null

* `quality` 为null时，前端显示为"未知"，筛选时对应UNKNOWN选项

* 所有null值在JSON响应中保持为null，不转换为空字符串或0

#### 2.2.2 采购记录更新接口详细规范

**接口路径：** `PUT /api/v1/purchases/:id`

**权限要求：** 仅BOSS角色可以编辑采购记录

**核心功能：** 更新采购记录信息，支持所有产品类型的字段编辑，自动记录修改历史

**请求参数：**

```typescript
{
  // 基础信息字段
  "product_name": "8mm紫水晶手串",
  "quality": "AA",
  "notes": "颜色较深，质地不错",
  "supplier_name": "张三水晶",
  
  // 价格相关字段
  "price_per_gram": 15.5,
  "total_price": 186.0,
  "weight": 12.0,
  
  // 产品类型特定字段（根据产品类型选择性包含）
  // 手串类型 (BRACELET)
  "quantity": 2,
  "bead_diameter": 8,
  "beads_per_string": 20,
  "total_beads": 40,
  
  // 散珠类型 (LOOSE_BEADS)
  "piece_count": 108,
  "bead_diameter": 8,
  
  // 饰品配件/成品类型 (ACCESSORIES/FINISHED)
  "piece_count": 1,
  "specification": 12
}
```

**字段验证规则：**

| 字段名              | 数据类型        | 验证规则                | 说明                     |
| ---------------- | ----------- | ------------------- | ---------------------- |
| product\_name    | string      | 可选，非空字符串，最大200字符    | 产品名称                   |
| quantity         | number      | 可选，正整数              | 手串数量，仅手串类型使用           |
| piece\_count     | number      | 可选，正整数              | 颗数/片数/件数，非手串类型使用       |
| bead\_diameter   | number      | 可选，正数，范围4-50mm      | 珠子直径(mm)，散珠和手串使用       |
| specification    | number      | 可选，正数，范围1-100mm     | 规格(mm)，饰品配件和成品使用       |
| quality          | enum        | 可选，AA/A/AB/B/C      | 品相等级                   |
| price\_per\_gram | number      | 可选，非负数，允许null值      | 克价                     |
| total\_price     | number      | 可选，非负数，允许null值      | 总价                     |
| weight           | number      | 可选，非负数，允许null值      | 重量(g)                  |
| beads\_per\_string | number      | 可选，正整数              | 每串颗数，手串类型使用            |
| total\_beads     | number      | 可选，正整数              | 总颗数，手串类型使用             |
| notes            | string      | 可选，字符串              | 备注信息                   |
| supplier\_name   | string      | 可选，字符串              | 供应商名称，自动创建不存在的供应商      |

**业务逻辑处理：**

1. **权限验证**：只有BOSS角色可以编辑采购记录
2. **数据验证**：使用Zod schema验证所有字段
3. **字段转换**：前端snake_case格式转换为后端camelCase格式
4. **供应商处理**：
   - 如果supplier_name不存在，自动创建新供应商
   - 如果supplier_name为空，设置supplierId为null
5. **派生字段计算**：
   - 如果更新了bead_diameter且未提供beads_per_string，自动计算
   - 如果有total_price和total_beads，自动计算price_per_bead和unit_price
6. **字段变更检测**：对比原始数据和新数据，记录所有变更字段
7. **修改历史记录**：创建详细的edit_logs记录

**total_beads字段特殊处理逻辑：**

```typescript
// 优先级处理逻辑
if (用户本次手动设置了total_beads) {
  // 最高优先级：使用用户设置的值
  updateData.total_beads = 用户设置值
} else if (数据库中有现有total_beads值) {
  // 中等优先级：保持数据库现有值（保护用户之前的手动设置）
  updateData.total_beads = 数据库现有值
} else if (有quantity和beads_per_string) {
  // 最低优先级：自动计算
  updateData.total_beads = quantity * beads_per_string
}
```

**响应数据结构：**

```typescript
// 更新成功
{
  "success": true,
  "message": "采购记录更新成功",
  "data": {
    "id": "purchase_001",
    "purchase_code": "CG20240115123456",
    "product_name": "8mm紫水晶手串",
    "product_type": "BRACELET",
    "quantity": 2,
    "bead_diameter": 8,
    "total_beads": 40,
    "price_per_gram": 15.5,
    "total_price": 186.0,
    "weight": 12.0,
    "quality": "AA",
    "supplier": {
      "id": "supplier_001",
      "name": "张三水晶"
    },
    "user": {
      "id": "user_001",
      "name": "系统管理员",
      "username": "boss"
    },
    "lastEditedBy": {
      "id": "user_001",
      "name": "系统管理员",
      "username": "boss"
    },
    "edit_logs": [
      {
        "id": "edit_log_001",
        "action": "UPDATE",
        "details": "老板 在 2025-08-30 11:45:30 将总价从 180 改为 186，重量从 11 改为 12",
        "created_at": "2025-08-30T03:45:30.000Z",
        "user": {
          "id": "user_001",
          "name": "系统管理员"
        }
      }
    ],
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T11:45:00.000Z"
  }
}

// 权限不足
{
  "success": false,
  "message": "权限不足，只有老板可以编辑采购记录",
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS"
  }
}

// 记录不存在
{
  "success": false,
  "message": "采购记录不存在",
  "error": {
    "code": "RECORD_NOT_FOUND"
  }
}

// 验证失败
{
  "success": false,
  "message": "数据验证失败",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "total_price",
      "message": "总价必须大于0"
    }
  }
}
```

**修改历史记录功能：**

每次成功更新采购记录时，系统会自动创建edit_logs记录：

```typescript
{
  "id": "edit_log_001",
  "purchaseId": "purchase_001",
  "userId": "user_001",
  "action": "UPDATE",
  "details": "老板 在 2025-08-30 11:45:30 将总价从 180 改为 186，重量从 11 改为 12",
  "changedFields": [
    {
      "field": "total_price",
      "displayName": "总价",
      "oldValue": 180,
      "newValue": 186,
      "timestamp": "2025-08-30T03:45:30.000Z"
    },
    {
      "field": "weight",
      "displayName": "重量",
      "oldValue": 11,
      "newValue": 12,
      "timestamp": "2025-08-30T03:45:30.000Z"
    }
  ],
  "createdAt": "2025-08-30T03:45:30.000Z"
}
```

### 2.2 成品管理接口（提取自《API接口规范文档》6章）

| 接口路径                          | 方法     | 权限  | 核心参数                               | 响应核心字段                                     | 来源文档           |
| ----------------------------- | ------ | --- | ---------------------------------- | ------------------------------------------ | -------------- |
| /api/v1/products              | POST   | 已认证 | product\_name、materials（必填）、photos | id、total\_cost（老板可见）                       | 《API接口规范文档》6.1 |
| /api/v1/products/:id/destroy  | DELETE | 已认证 | id（成品ID）                           | destroyed\_product\_id、restored\_materials | 《API接口规范文档》6.7 |
| /api/v1/products/batch-import | POST   | 仅老板 | file（Excel）                        | success\_count、failed\_rows                | 《API接口规范文档》6.4 |

### 2.3 库存管理接口（新增多视图库存功能）

| 接口路径                           | 方法  | 权限  | 核心参数                                       | 响应核心字段                 | 功能说明      |
| ------------------------------ | --- | --- | ------------------------------------------ | ---------------------- | --------- |
| /api/v1/inventory              | GET | 已认证 | page、limit、search、product\_types\[]        | items\[]、pagination    | 传统库存列表    |
| /api/v1/inventory/hierarchical | GET | 已认证 | product\_types\[]、quality、low\_stock\_only | hierarchical\_data\[]  | 层级式库存视图   |
| /api/v1/inventory/grouped      | GET | 已认证 | group\_by、product\_types\[]、quality        | grouped\_data\[]       | 分组库存列表    |
| /api/v1/inventory/accessories  | GET | 已认证 | page、limit、search、category               | accessories\[]、pagination | 饰品配件专用视图  |
| /api/v1/inventory/finished     | GET | 已认证 | page、limit、search、status                 | products\[]、pagination   | 成品卡片视图    |
| /api/v1/inventory/statistics   | GET | 已认证 | time\_range、product\_types\[]             | statistics             | 库存统计数据    |
| /api/v1/inventory/export       | GET | 已认证 | format（excel/csv）、product\_types\[]        | download\_url、filename | 库存数据导出    |

#### 2.3.1 分组库存列表接口详细规范

**接口路径：** `GET /api/v1/inventory/grouped`

**请求参数：**

| 参数名           | 类型       | 必填 | 说明                                    |
| ------------- | -------- | -- | ------------------------------------- |
| group_by      | string   | 否  | 分组方式：product_type、quality、supplier_name |
| product_types | string[] | 否  | 产品类型筛选                                |
| quality       | string   | 否  | 品相筛选                                  |

**响应数据结构：**

```typescript
{
  "success": true,
  "data": {
    "grouped_data": [
      {
        "group_key": "BRACELET",
        "group_name": "手串",
        "total_quantity": 150,
        "total_value": 25000,
        "items": [
          {
            "id": "inv_001",
            "product_name": "8mm紫水晶手串",
            "quantity": 50,
            "unit_price": 120,
            "total_value": 6000
          }
        ]
      }
    ]
  }
}
```

#### 2.3.2 饰品配件专用视图接口详细规范

**接口路径：** `GET /api/v1/inventory/accessories`

**请求参数：**

| 参数名      | 类型     | 必填 | 说明       |
| -------- | ------ | -- | -------- |
| page     | number | 否  | 页码，默认1   |
| limit    | number | 否  | 每页数量，默认20 |
| search   | string | 否  | 搜索关键词    |
| category | string | 否  | 配件分类     |

**响应数据结构：**

```typescript
{
  "success": true,
  "data": {
    "accessories": [
      {
        "id": "acc_001",
        "name": "925银扣头",
        "category": "扣头",
        "material": "925银",
        "quantity": 200,
        "unit_price": 15,
        "supplier_name": "银饰工厂",
        "photos": ["url1", "url2"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### 2.3.3 成品卡片视图接口详细规范

**接口路径：** `GET /api/v1/inventory/finished`

**请求参数：**

| 参数名    | 类型     | 必填 | 说明                      |
| ------ | ------ | -- | ----------------------- |
| page   | number | 否  | 页码，默认1                  |
| limit  | number | 否  | 每页数量，默认12               |
| search | string | 否  | 搜索关键词                   |
| status | string | 否  | 状态筛选：available、sold、reserved |

**响应数据结构：**

```typescript
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod_001",
        "name": "紫水晶手串套装",
        "description": "8mm紫水晶配925银扣头",
        "status": "available",
        "cost": 150,
        "selling_price": 280,
        "profit_margin": 86.67,
        "materials": [
          {
            "material_id": "mat_001",
            "material_name": "8mm紫水晶",
            "quantity_used": 1
          }
        ],
        "photos": ["url1", "url2"],
        "created_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

#### 2.3.4 库存统计数据接口详细规范

**接口路径：** `GET /api/v1/inventory/statistics`

**请求参数：**

| 参数名           | 类型       | 必填 | 说明                           |
| ------------- | -------- | -- | ---------------------------- |
| time_range    | string   | 否  | 时间范围：today、week、month、quarter |
| product_types | string[] | 否  | 产品类型筛选                       |

**响应数据结构：**

```typescript
{
  "success": true,
  "data": {
    "statistics": {
      "total_items": 1250,
      "total_value": 185000,
      "low_stock_items": 15,
      "out_of_stock_items": 3,
      "product_type_distribution": [
        {
          "type": "BRACELET",
          "name": "手串",
          "count": 450,
          "percentage": 36
        },
        {
          "type": "NECKLACE",
          "name": "项链",
          "count": 320,
          "percentage": 25.6
        }
      ],
      "quality_distribution": [
        {
          "quality": "AAA",
          "count": 200,
          "percentage": 16
        },
        {
          "quality": "AA",
          "count": 500,
          "percentage": 40
        }
      ],
      "value_distribution": {
        "under_100": 300,
        "100_500": 600,
        "500_1000": 250,
        "over_1000": 100
      },
      "recent_changes": {
        "new_items_this_week": 25,
        "sold_items_this_week": 18,
        "low_stock_alerts": 8
      }
    }
  }
}
```

### 2.4 AI智能服务接口（完整实现规范）

| 接口路径                         | 方法   | 权限  | 核心参数                                 | 响应核心字段                      | 功能说明     |
| ---------------------------- | ---- | --- | ------------------------------------ | --------------------------- | -------- |
| /api/v1/ai/parse-description | POST | 已认证 | description                          | parsed\_data、confidence     | 采购描述解析   |
| /api/v1/ai/health            | GET  | 已认证 | 无                                    | status、message、details      | AI服务健康检查 |
| /api/v1/ai/config            | GET  | 已认证 | 无                                    | model、baseUrl、hasApiKey     | AI配置信息获取 |
| /api/v1/assistant/chat       | POST | 仅老板 | message、context（可选）                  | response、suggestions\[]     | 智能助理对话   |
| /api/v1/assistant/insights   | POST | 仅老板 | query、time\_range、include\_financial | insights、recommendations\[] | 业务洞察分析   |

#### 2.4.1 采购描述解析接口详细规范

**接口路径：** `POST /api/v1/ai/parse-description`

**请求参数：**

```typescript
{
  "description": "在咯咯珠宝买的黑曜石五串，16米的，品质还不错，200块钱"
}
```

**响应数据结构：**

```typescript
{
  "success": true,
  "data": {
    "productName": "黑曜石",
    "productType": "BRACELET",
    "unitType": "STRINGS",
    "beadDiameter": 16,
    "quantity": 5,
    "totalPrice": 200,
    "quality": "AB",
    "supplierName": "咯咯珠宝",
    "confidence": 0.85
  }
}
```

**字段映射规则：**

| AI解析字段       | 前端表单字段           | 数据类型   | 说明       |
| ------------ | ---------------- | ------ | -------- |
| productName  | product\_name    | string | 产品名称     |
| productType  | product\_type    | enum   | 产品类型枚举   |
| beadDiameter | bead\_diameter   | number | 珠子直径(mm) |
| quantity     | quantity         | number | 数量（串数）   |
| pieceCount   | piece\_count     | number | 颗数/片数/件数 |
| pricePerGram | price\_per\_gram | number | 克价       |
| unitPrice    | unit\_price      | number | 单价       |
| totalPrice   | total\_price     | number | 总价       |
| weight       | weight           | number | 重量(g)    |
| quality      | quality          | enum   | 品相等级     |
| supplierName | supplier\_name   | string | 供应商名称    |

#### 2.4.2 AI服务健康检查接口

**接口路径：** `GET /api/v1/ai/health`

**响应示例：**

```typescript
// 健康状态
{
  "success": true,
  "data": {
    "status": "healthy",
    "message": "AI服务配置正常",
    "details": {
      "model": "doubao-1.5-pro-32k-250115",
      "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
}

// 异常状态
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "message": "AI服务未配置API密钥",
    "details": {
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

#### 2.4.3 智能助理对话接口

**接口路径：** `POST /api/v1/assistant/chat`

**权限要求：** 仅BOSS角色可访问

**请求参数：**

```typescript
{
  "message": "最近一个月的采购情况怎么样？",
  "context": {
    "timeRange": "last_month",
    "includeFinancial": true
  }
}
```

**响应示例：**

```typescript
{
  "success": true,
  "data": {
    "response": "根据数据分析，最近一个月共采购了50批次，总金额约15万元...",
    "suggestions": [
      "建议关注库存较低的紫水晶产品",
      "可以考虑增加热销产品的采购量"
    ]
  }
}
```

#### 2.4.4 业务洞察分析接口

**接口路径：** `POST /api/v1/assistant/insights`

**权限要求：** 仅BOSS角色可访问

**请求参数：**

```typescript
{
  "query": "分析供应商表现",
  "timeRange": "last_quarter",
  "includeFinancial": true
}
```

**响应示例：**

```typescript
{
  "success": true,
  "data": {
    "insights": "供应商分析报告：张三水晶表现最佳，交付及时率95%...",
    "recommendations": [
      "建议与张三水晶建立长期合作关系",
      "需要关注李四珠宝的质量问题"
    ],
    "metrics": {
      "topSupplier": "张三水晶",
      "totalPurchases": 120,
      "averageQuality": "A"
    }
  }
}
```

### 2.5 供应商管理接口（权限控制）

| 接口路径                               | 方法   | 权限  | 核心参数                             | 响应核心字段                                            | 功能说明         |
| ---------------------------------- | ---- | --- | -------------------------------- | ------------------------------------------------- | ------------ |
| /api/v1/suppliers                  | GET  | 仅老板 | page、limit、search                | suppliers\[]、pagination                           | 获取供应商列表      |
| /api/v1/suppliers                  | POST | 仅老板 | name、contact、phone、email、address | supplier                                          | 创建供应商        |
| /api/v1/suppliers/:id              | PUT  | 仅老板 | name、contact、phone、email、address | supplier                                          | 更新供应商信息      |
| /api/v1/suppliers/debug/count      | GET  | 仅老板 | 无                                | totalSuppliers、activeSuppliers、allActiveSuppliers | 调试端点：查询供应商统计 |
| /api/v1/suppliers/debug/duplicates | GET  | 仅老板 | 无                                | duplicates\[]                                     | 调试端点：检查重复供应商 |

#### 2.5.1 获取供应商列表

```
GET /api/v1/suppliers
```

**权限要求：** 仅老板角色

**请求参数：**

| 参数名    | 类型     | 必填 | 说明            |
| ------ | ------ | -- | ------------- |
| limit  | number | 否  | 返回数量限制，默认1000 |
| search | string | 否  | 搜索关键词         |

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "supplier_001",
      "name": "金银供应商A",
      "contact_person": "张三",
      "phone": "13800138000",
      "address": "深圳市罗湖区",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 2.5.2 创建供应商

```
POST /api/v1/suppliers
```

**权限要求：** 仅老板角色

**请求参数：**

| 参数名             | 类型     | 必填 | 说明    |
| --------------- | ------ | -- | ----- |
| name            | string | 是  | 供应商名称 |
| contact\_person | string | 否  | 联系人   |
| phone           | string | 否  | 联系电话  |
| address         | string | 否  | 地址    |

#### 2.5.3 更新供应商信息

```
PUT /api/v1/suppliers/:id
```

**权限要求：** 仅老板角色

#### 2.5.4 供应商调试端点

##### 查询供应商统计

```
GET /api/v1/suppliers/debug/count
```

**权限要求：** 仅老板角色

**响应示例：**

```json
{
  "success": true,
  "data": {
    "total_suppliers": 30,
    "active_suppliers": 28,
    "all_active_suppliers": [...]
  }
}
```

##### 检查重复供应商

```
GET /api/v1/suppliers/debug/duplicates
```

**权限要求：** 仅老板角色

**权限控制：**

* 仅BOSS角色可访问，EMPLOYEE角色返回403错误

* 前端根据用户角色动态显示/隐藏供应商功能

**数据处理：**

* 后端返回所有isActive=true的供应商

* 前端按ID去重（优先），ID为空时按名称去重

* 支持实时筛选和防抖搜索（300ms延迟）

### 2.6 图片上传接口（采购录入专用）

| 接口路径                           | 方法     | 权限  | 核心参数               | 响应核心字段         | 功能说明   |
| ------------------------------ | ------ | --- | ------------------ | -------------- | ------ |
| /api/v1/upload/purchase-images | POST   | 已认证 | FormData（images字段） | urls\[]        | 上传采购图片 |
| /api/v1/upload/purchase-images | DELETE | 已认证 | urls\[]（JSON格式）    | deleted\_count | 删除采购图片 |

#### 2.6.1 上传采购图片接口

**接口路径：** `POST /api/v1/upload/purchase-images`

**请求格式：** FormData

```javascript
const formData = new FormData()
formData.append('images', blob, 'camera_photo_timestamp.jpg')
```

**文件限制：**

* **支持格式：** JPEG, PNG, GIF, WebP

* **文件大小：** 最大10MB

* **数量限制：** 单次上传1张图片

**响应示例：**

```typescript
{
  "success": true,
  "data": {
    "urls": ["/uploads/purchases/20240115/camera_photo_1705123456789.jpg"]
  }
}
```

**图片URL处理：**

* 自动检测网络环境（公网/局域网/localhost）

* 动态构建完整URL：`${baseUrl}${relativePath}`

* 支持协议修复（HTTPS→HTTP for 本地环境）

### 2.7 用户管理接口（新增完整用户管理）

| 接口路径                  | 方法     | 权限  | 核心参数                          | 响应核心字段              | 功能说明   |
| --------------------- | ------ | --- | ----------------------------- | ------------------- | ------ |
| /api/v1/users         | GET    | 仅老板 | page、limit、role、active        | users\[]、pagination | 用户列表   |
| /api/v1/users         | POST   | 仅老板 | username、password、name、role   | user                | 创建用户   |
| /api/v1/users/:id     | PUT    | 仅老板 | username、name、role、is\_active | user                | 更新用户   |
| /api/v1/users/:id     | DELETE | 仅老板 | id                            | deleted\_user\_id   | 删除用户   |
| /api/v1/users/profile | GET    | 已认证 | 无                             | user                | 获取个人资料 |
| /api/v1/users/profile | PUT    | 已认证 | name、phone、email、avatar       | user                | 更新个人资料 |

## 三、权限控制表（统一现有角色规则）

| 角色 | 可访问接口示例                     | 敏感字段过滤（雇员不可见）                                       | 来源文档           |
| -- | --------------------------- | --------------------------------------------------- | -------------- |
| 老板 | 所有接口（含/suppliers/\*）        | 无                                                   | 《业务流程文档》1.2    |
| 雇员 | /api/v1/purchases（GET/POST） | price\_per\_gram、total\_price、weight、supplier\_info | 《数据库设计文档》1.3   |
| 雇员 | /api/v1/inventory           | price\_per\_bead、supplier\_name                     | 《API接口规范文档》5.1 |

## 四、错误码统一表（扩展新增功能错误码）

| 错误码                           | 含义       | HTTP状态码 | 场景示例          | 适用模块  |
| ----------------------------- | -------- | ------- | ------------- | ----- |
| INVALID\_DIAMETER             | 珠子直径无效   | 400     | 直径<4mm或>20mm  | 采购管理  |
| AI\_RECOGNITION\_FAILED       | AI识别失败   | 400     | 自然语言识别置信度<0.6 | 智能助理  |
| INSUFFICIENT\_PERMISSIONS     | 权限不足     | 403     | 雇员调用批量导入接口    | 权限控制  |
| INSUFFICIENT\_STOCK           | 库存不足     | 400     | 成品制作时使用颗数超过库存 | 库存管理  |
| INVALID\_PRODUCT\_TYPE        | 产品类型无效   | 400     | 不支持的产品类型      | 采购管理  |
| INVALID\_SPECIFICATION        | 无效的规格参数  | 400     | 规格参数格式错误或超出范围 | 采购管理  |
| INVENTORY\_INSUFFICIENT       | 库存不足     | 400     | 成品制作时原料库存不足   | 库存管理  |
| PRODUCT\_NOT\_FOUND           | 产品不存在    | 404     | 查询不存在的产品ID    | 产品管理  |
| PURCHASE\_NOT\_FOUND          | 采购记录不存在  | 404     | 查询不存在的采购ID    | 采购管理  |
| FINISHED\_PRODUCT\_NOT\_FOUND | 成品不存在    | 404     | 查询不存在的成品ID    | 成品管理  |
| BATCH\_IMPORT\_FAILED         | 批量导入失败   | 400     | 批量导入数据格式错误    | 数据导入  |
| AI\_SERVICE\_ERROR            | AI服务错误   | 500     | AI解析服务不可用     | 智能助理  |
| AI\_PARSE\_FAILED             | AI解析失败   | 400     | AI无法解析输入内容    | 智能助理  |
| AI\_QUOTA\_EXCEEDED           | AI配额超限   | 429     | AI服务调用次数超限    | 智能助理  |
| DUPLICATE\_SUPPLIER\_NAME     | 供应商名称已存在 | 400     | 创建重复名称的供应商    | 供应商管理 |
| SUPPLIER\_NOT\_FOUND          | 供应商不存在   | 404     | 查询不存在的供应商ID   | 供应商管理 |
| SUPPLIER\_HAS\_PURCHASES      | 供应商有关联采购 | 400     | 删除有采购记录的供应商   | 供应商管理 |
| SUPPLIER\_NAME\_INVALID       | 供应商名称无效  | 400     | 名称为空或格式不正确    | 供应商管理 |
| USERNAME\_EXISTS              | 用户名已存在   | 400     | 创建用户时用户名重复    | 用户管理  |
| EMAIL\_EXISTS                 | 邮箱已被使用   | 400     | 创建/更新用户时邮箱重复  | 用户管理  |
| USER\_NOT\_FOUND              | 用户不存在    | 404     | 查询不存在的用户ID    | 用户管理  |
| CANNOT\_DELETE\_SELF          | 不能删除自己   | 400     | 用户尝试删除自己的账户   | 用户管理  |
| USER\_HAS\_RELATED\_DATA      | 用户有关联数据  | 400     | 删除有采购记录的用户    | 用户管理  |
| CHAT\_FAILED                  | 对话失败     | 400     | AI助理对话服务异常    | 智能助理  |
| INSIGHTS\_FAILED              | 业务洞察失败   | 400     | 业务分析服务异常      | 智能助理  |
| VALIDATION\_ERROR             | 参数验证失败   | 400     | 请求参数格式错误      | 通用    |
| ASSISTANT\_ERROR              | 助理服务异常   | 500     | AI服务不可用       | 智能助理  |
| PROFILE\_ERROR                | 资料操作失败   | 500     | 获取/更新用户资料异常   | 用户管理  |

## 五、新增业务逻辑说明

### 5.1 产品类型扩展（ProductType枚举）

| 产品类型 | 英文标识         | 计量单位       | 必填字段                        | 业务说明          |
| ---- | ------------ | ---------- | --------------------------- | ------------- |
| 散珠   | LOOSE\_BEADS | 颗（PIECES）  | bead\_diameter、piece\_count | 按颗数计量，需要珠子直径  |
| 手串   | BRACELET     | 条（STRINGS） | bead\_diameter、quantity     | 按条数计量，自动计算总颗数 |
| 饰品配件 | ACCESSORIES  | 片（SLICES）  | specification、piece\_count  | 按片数计量，使用规格尺寸  |
| 成品   | FINISHED     | 件（ITEMS）   | specification、piece\_count  | 按件数计量，成品平均直径  |

### 5.2 层级库存管理

**数据结构层次：**

```
产品类型（ProductType）
├── 规格（Specification/BeadDiameter）
    ├── 品相（Quality: AA/A/AB/B/C）
        ├── 库存数量（Quantity）
        ├── 预警状态（LowStockAlert）
        └── 供应商信息（SupplierInfo）
```

**核心功能：**

* 支持按产品类型筛选（多选）

* 低库存预警显示

* 展开/收起层级视图

* 移动端适配优化

### 5.3 智能助理功能

**对话功能（/assistant/chat）：**

* 支持自然语言业务咨询

* 提供操作建议和系统指导

* 上下文理解和多轮对话

* 所有用户可用

**业务洞察（/assistant/insights）：**

* 仅老板权限可用

* 支持时间范围分析（7d/30d/90d/1y）

* 可选包含/排除财务敏感数据

* 提供具体业务建议和风险提示

### 5.4 用户管理增强

**权限分级：**

* 老板：完整用户管理权限

* 员工：仅可查看和更新个人资料

**安全机制：**

* 密码加密存储（bcrypt）

* 用户名和邮箱唯一性校验

* 关联数据检查（防止误删）

* 自我保护（不能删除自己）

**字段命名统一：**

* 所有API响应使用下划线命名（snake\_case）

* 数据库字段使用驼峰命名（camelCase）

* 通过convertToApiFormat函数自动转换

### 5.5 网络环境智能适配

**动态IP检测：**

* 自动检测当前网络环境（公网/局域网/localhost）

* 智能选择最佳API地址（公网域名/局域网IP/本地地址）

* 支持手动设置IP偏好和缓存机制

* 网络环境变化自动监控和切换

**连通性测试：**

* 自动测试API服务器可达性

* 失效IP地址自动清除和重新检测

* 支持多IP地址备选和故障转移

* 移动端网络优化（局域网IP优先）

**调试工具集成：**

```javascript
// 全局调试工具（开发环境可用）
apiDebug.showConfig()     // 显示当前API配置状态
apiDebug.testIP('192.168.1.100')  // 测试指定IP连通性
apiDebug.refresh()       // 刷新API配置，重新检测网络
apiDebug.clearCache()    // 清除所有IP缓存
apiDebug.setIP('192.168.1.100')   // 设置偏好IP地址
```

### 5.6 错误重试与容错机制

**智能重试策略：**

* 网络连接错误自动重试（最多2次）

* 失败IP地址自动切换到备选地址

* 超时请求自动降级处理

* 重试间隔递增策略（避免服务器压力）

**错误处理增强：**

* 详细的网络状态日志记录

* 用户友好的错误提示信息

* 自动错误恢复和状态重置

* 开发环境详细调试信息输出

**缓存管理：**

* localStorage智能缓存工作IP地址

* 无效缓存自动清理机制

* 网络环境变化时缓存更新

* 支持手动清除和重置缓存

## 六、字段命名统一规范

### 6.1 命名规范定义

| 场景      | 命名规范        | 示例                                               | 说明                                 |
| ------- | ----------- | ------------------------------------------------ | ---------------------------------- |
| API响应字段 | snake\_case | `product_name`, `bead_diameter`, `total_price`   | 前后端数据传输的JSON字段                     |
| 数据库字段   | camelCase   | `productName`, `beadDiameter`, `totalPrice`      | 数据库表字段和ORM模型属性                     |
| 前端代码    | camelCase   | `productName`, `handleSubmit`, `backgroundColor` | JavaScript/TypeScript变量、函数、React属性 |

### 6.2 字段转换机制

**自动转换函数：**

```typescript
// 提交API时：camelCase → snake_case
const apiData = convertToApiFormat(formData);

// 接收API时：snake_case → camelCase
const frontendData = convertFromApiFormat(response.data);
```

**标准字段映射：**

```typescript
const STANDARD_FIELD_MAPPINGS = {
  'productName': 'product_name',
  'beadDiameter': 'bead_diameter',
  'totalPrice': 'total_price',
  'supplierName': 'supplier_name',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at'
};
```

### 6.3 命名规范验证

**API响应验证：**

* 所有API响应必须使用snake\_case

* 通过`validateFieldNaming`函数自动检查

* 不符合规范的字段会在开发环境显示警告

**前端代码验证：**

* JavaScript/TypeScript变量必须使用camelCase

* React组件属性必须遵循React规范

* CSS-in-JS属性必须使用camelCase

## 七、成品制作管理接口

### 7.1 成品制作接口清单

| 接口路径                                    | 方法   | 权限  | 核心参数                                                    | 响应核心字段                        | 功能说明           |
| --------------------------------------- | ---- | --- | ------------------------------------------------------- | ----------------------------- | -------------- |
| /api/v1/finished-products              | POST | 已认证 | product_name、materials、labor_cost、craft_cost           | id、product_code、total_cost    | 创建成品（组合模式）     |
| /api/v1/finished-products/batch-create | POST | 已认证 | products[]（直接转化模式）                                     | created_products[]、total_count | 批量创建成品（直接转化模式） |
| /api/v1/finished-products              | GET  | 已认证 | page、search、quality、low_stock_only、specification_range | products[]、pagination          | 成品列表查询         |
| /api/v1/finished-products/:id          | GET  | 已认证 | id                                                      | product、material_usage[]       | 获取成品详情         |
| /api/v1/finished-products/:id          | PUT  | 已认证 | product_name、description、selling_price                | updated_product                | 更新成品信息         |
| /api/v1/finished-products/:id          | DELETE | 仅老板 | id                                                      | deleted_product_id             | 删除成品（销毁）       |
| /api/v1/finished-products/:id/sold     | PUT  | 已认证 | sold_price、sold_date、buyer_info                       | sale_record                    | 标记成品已售出        |
| /api/v1/finished-products/cost         | POST | 已认证 | materials[]、labor_cost、craft_cost                     | estimated_cost、breakdown       | 计算制作成本预估       |
| /api/v1/finished-products/materials    | GET  | 已认证 | product_type、search                                    | available_materials[]          | 获取可用原材料列表      |

### 7.2 成品创建接口详细规范

#### 7.2.1 组合模式成品创建

**接口路径：** `POST /api/v1/finished-products`

**权限要求：** 已认证用户

**请求参数：**

```typescript
{
  "product_name": "紫水晶多宝手串",
  "description": "8mm紫水晶配金珠设计款",
  "specification": "8.0",
  "materials": [
    {
      "purchase_id": "purchase_uuid_1",
      "quantity_used_beads": 20,
      "quantity_used_pieces": 0
    },
    {
      "purchase_id": "purchase_uuid_2",
      "quantity_used_beads": 0,
      "quantity_used_pieces": 3
    }
  ],
  "labor_cost": 20.00,
  "craft_cost": 15.00,
  "selling_price": 128.00,
  "photos": ["url1", "url2"]
}
```

**响应数据结构：**

```typescript
// 创建成功
{
  "success": true,
  "message": "成品创建成功",
  "data": {
    "id": "product_uuid",
    "product_code": "FP20240115001",
    "product_name": "紫水晶多宝手串",
    "material_cost": 45.00,
    "labor_cost": 20.00,
    "craft_cost": 15.00,
    "total_cost": 80.00,
    "selling_price": 128.00,
    "profit_margin": 37.50,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}

// 创建失败（库存不足）
{
  "success": false,
  "message": "原材料库存不足",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "details": {
      "purchase_id": "purchase_uuid_1",
      "available": 15,
      "required": 20,
      "product_name": "8mm紫水晶手串"
    }
  }
}
```

#### 7.2.2 批量创建成品（直接转化模式）

**接口路径：** `POST /api/v1/finished-products/batch-create`

**权限要求：** 已认证用户

**请求参数：**

```typescript
{
  "products": [
    {
      "material_id": "purchase_uuid_1",
      "product_name": "8mm紫水晶手串",
      "description": "天然紫水晶，颜色深邃",
      "specification": "8.0",
      "labor_cost": 15.00,
      "craft_cost": 10.00,
      "selling_price": 98.00,
      "photos": ["url1"]
    },
    {
      "material_id": "purchase_uuid_2",
      "product_name": "南红老型珠手串",
      "description": "传统老型珠工艺",
      "specification": "10.0",
      "labor_cost": 25.00,
      "craft_cost": 20.00,
      "selling_price": 186.00,
      "photos": ["url2"]
    }
  ]
}
```

**响应数据结构：**

```typescript
{
  "success": true,
  "message": "批量创建成功，共创建2个成品",
  "data": {
    "total_count": 2,
    "success_count": 2,
    "failed_count": 0,
    "created_products": [
      {
        "id": "product_uuid_1",
        "product_code": "FP20240115001",
        "product_name": "8mm紫水晶手串",
        "total_cost": 65.00,
        "selling_price": 98.00,
        "profit_margin": 33.67
      },
      {
        "id": "product_uuid_2",
        "product_code": "FP20240115002",
        "product_name": "南红老型珠手串",
        "total_cost": 141.00,
        "selling_price": 186.00,
        "profit_margin": 24.19
      }
    ],
    "failed_products": []
  }
}
```

