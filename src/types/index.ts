// 用户相关类型
export interface User {
  id: number
  user_name: string
  real_name: string
  name: string // 添加name属性作为real_name的别名
  role: 'BOSS' | 'EMPLOYEE'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface login_request {
  user_name: string
  password: string
}

export interface login_response {
  user: User
  token: string
  message: string
}

// 供应商相关类型
export interface Supplier {
  id: number
  supplier_code: string
  supplier_name: string
  name: string // 添加name属性作为supplier_name的别名
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  status: 'active' | 'inactive'
  notes?: string
  created_at: string
  updated_at: string
}

// 供应商调试统计响应类型
export interface SupplierDebugStats {
  total_suppliers: number
  active_suppliers: number
  inactive_suppliers: number
  all_active_suppliers: Supplier[]
}

// 供应商列表API响应类型
export interface SupplierListResponse {
  suppliers: Supplier[]
}

// 修改日志相关类型
export interface AuditLog {
  id: string
  user_id?: string
  action: string
  resource: string
  resource_id?: string
  details?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

// 编辑日志字段变更类型
export interface EditLogFieldChange {
  field: string
  displayName: string
  old_value: any
  new_value: any
  timestamp: string
}

// 编辑日志类型
export interface EditLog {
  id: string
  purchase_id: string
  user_id: string
  action: string
  details?: string
  changed_fields?: EditLogFieldChange[]
  created_at: string
  user: {
    id: string
    name: string
    user_name: string
  }
}

// 采购相关类型
export interface Purchase {
  id: string // 修改为string类型以匹配数据库
  purchase_code: string
  purchase_name: string // 采购名称
  purchase_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL' // 采购类型
  unit_type: 'PIECES' | 'STRINGS' | 'SLICES' | 'ITEMS' // 计量单位
  supplier_id: number
  supplier?: Supplier
  quantity?: number // 串数（手串专用）
  piece_count?: number // 散珠颗数/饰品片数/成品件数
  price_per_gram?: number
  unit_price?: number
  total_price?: number
  weight?: number
  bead_diameter?: number // 散珠和手串使用
  specification?: number // 饰品配件和成品使用
  beads_per_string?: number
  total_beads?: number
  price_per_bead?: number
  min_stock_alert?: number
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  purchase_date: string
  photos?: string[]
  notes?: string
  natural_language_input?: string // 自然语言录入信息
  ai_recognition_result?: any
  created_by: number
  creator?: User
  user?: User // 录入人信息
  created_at: string
  updated_at: string
  last_edited_by?: User // 最后编辑人
  last_edited_at?: string // 最后编辑时间
  edit_logs?: EditLog[] // 编辑日志
}

export interface PurchaseCreateRequest {
  purchase_name: string // 采购名称
  purchase_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL' // 采购类型
  unit_type: 'PIECES' | 'STRINGS' | 'SLICES' | 'ITEMS'
  bead_diameter?: number // 散珠和手串必填
  specification?: number // 饰品配件和成品必填
  supplier_id?: number
  supplier_name?: string // 如果supplier_id不存在，则创建新供应商
  quantity?: number // 手串数量
  piece_count?: number // 散珠颗数/饰品片数/成品件数
  price_per_gram?: number
  unit_price?: number
  total_price?: number
  weight?: number
  beads_per_string?: number
  total_beads?: number
  price_per_bead?: number
  min_stock_alert?: number
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  purchase_date?: string // 后端会自动设置当前时间
  photos: string[] // 修改为必需字段
  notes?: string
  natural_language_input?: string // 添加自然语言录入字段
  ai_recognition_result?: any
}

// 成品原材料相关类型（已废弃，使用FinishedProduct代替）
export interface Material {
  id: number
  material_code?: string
  purchase_name: string
  materials: MaterialUsage[] // 原材料列表
  total_cost: number
  selling_price?: number
  profit?: number
  profit_margin?: number
  photos?: string[]
  status: 'in_stock' | 'sold' | 'destroyed'
  created_date?: string
  sold_date?: string
  created_by?: number
  creator?: User
  created_at: string
  updated_at: string
}

export interface MaterialCreateRequest {
  material_name: string
  materials: {
    purchase_id: number
    quantity_used_beads: number
  }[]
  selling_price?: number
  photos?: string[]
  created_date?: string
}

// 原材料使用记录类型
export interface MaterialUsage {
  id: number
  product_id: number
  purchase_id: number
  purchase?: Purchase
  quantity_used_beads: number
  price_per_bead: number
  total_cost: number
  created_at: string
}

// 库存相关类型
export interface InventoryItem {
  purchase_id: string
  purchase_name: string // 采购名称
  purchase_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL' // 采购类型
  unit_type: 'PIECES' | 'STRINGS' | 'SLICES' | 'ITEMS' // 计量单位
  bead_diameter?: number // 散珠和手串使用
  specification?: number // 饰品配件和成品使用
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  min_stock_alert?: number
  original_quantity: number // 原始数量（根据产品类型：颗数/串数/片数/件数）
  used_quantity: number // 已使用数量
  remaining_quantity: number // 剩余数量
  is_low_stock: number // 0=正常，1=低库存
  price_per_unit?: number // 单价（雇员不可见）
  price_per_gram?: number // 克价（雇员不可见）
  supplier_name?: string // 雇员不可见
  purchase_date: string
  photos?: string[]
  notes?: string
  created_at: string
  updated_at: string
}

export interface InventoryQueryParams {page?: number
  limit?: number
  search?: string
  purchase_types?: string[] // 采购类型筛选（多选）
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  low_stock_only?: boolean
  diameter_min?: string // 珠子直径范围
  diameter_max?: string
  specification_min?: string // 规格范围
  specification_max?: string
  quantity_min?: string // 数量范围
  quantity_max?: string
  sort?: 'asc' | 'desc'
  sort_by?: 'purchase_date' | 'created_at' | 'remaining_quantity' | 'purchase_name' | 'purchase_type'
}

// 分组库存相关类型
export interface InventoryVariant {
  purchase_id: number
  purchase_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL' // 采购类型
  bead_diameter?: number // 散珠和手串使用
  specification?: number // 饰品配件和成品使用
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  remaining_quantity: number // 剩余数量
  is_low_stock: number // 0=正常，1=低库存
  price_per_unit?: number // 单价（雇员不可见）
  price_per_gram?: number // 克价（雇员不可见）
  batch_count?: number // 批次数量
  batches?: InventoryBatch[] // 批次详情
}

// 库存批次类型
export interface InventoryBatch {
  purchase_id: number
  supplier_name?: string
  purchase_date: string
  remaining_quantity: number // 剩余数量
  original_quantity: number // 原始数量
  used_quantity: number // 已使用数量
  price_per_unit?: number // 单价
}

export interface InventoryGroup {
  purchase_name: string // 采购名称
  purchase_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL' // 采购类型
  variant_count: number
  total_remaining_quantity: number // 总剩余数量
  has_low_stock: boolean
  variants: InventoryVariant[]
}

export interface GroupedInventoryQueryParams {
  page?: number
  limit?: number
  search?: string
  purchase_types?: string[] // 采购类型筛选（多选）
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  low_stock_only?: boolean
  sort?: 'asc' | 'desc'
  sort_by?: 'purchase_name' | 'total_remaining_quantity' | 'purchase_type'
}

export interface InventoryListResponse {
  success: boolean
  message: string
  data: {
    items: InventoryItem[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

export interface InventorySearchResponse {
  success: boolean
  message: string
  data: {
    items: InventoryItem[]
    total: number
  }
}

export interface InventoryDetailResponse {
  success: boolean
  message: string
  data: InventoryItem
}

export interface InventoryExportResponse {
  success: boolean
  message: string
  data: {
    items: any[]
    total: number
    filename: string
  }
}

// AI识别相关类型
export interface AIParseRequest {
  description: string
}

export interface AIParseResponse {
  purchase_name?: string // 采购名称
  quantity?: number
  price_per_gram?: number
  weight?: number
  bead_diameter?: number
  quality?: 'excellent' | 'good' | 'average' | 'poor'
  supplier_name?: string
  confidence: number
  rawResult: any
}

// 智能助理相关类型
export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface AssistantRequest {
  message: string
  context?: any
}

export interface AssistantResponse {
  message: string
  data?: any
  suggestions?: string[]
}

// 文件上传相关类型
export interface UploadResponse {
  url: string
  filename: string
  originalName: string
  size: number
  mimeType: string
}

// API响应通用类型（符合文档规范）
export interface ApiResponse<T = any> {
  success: boolean          // 请求状态
  message: string           // 提示信息
  data?: T                  // 业务数据
  error?: {                 // 错误信息（失败时返回）
    code: string            // 错误码（如INVALID_DIAMETER）
    details?: any           // 错误详情（如字段验证失败）
  }
  offline?: boolean         // 离线模式标识
  timestamp?: number        // 时间戳
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// 查询参数类型
export interface QueryParams {
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  start_date?: string
  end_date?: string
  status?: string
  quality?: string
  supplier_id?: number
  created_by?: number
}

// 旧的统计数据类型定义已移动到文件末尾，使用新的snake_case命名规范

// 网络配置类型
export interface networkConfig {
  local_ip: string
  public_ip: string
  apiDomain: string
  isDevelopment: boolean
  isProduction: boolean
}

// 成品原材料制作相关类型（成品原材料也是原材料，只有SKU才是真正的产品）
export interface FinishedProduct {
  id: string
  material_code: string // 成品原材料编号，格式：FP+日期+3位序号
  purchase_name: string // 采购名称
  description?: string
  specification?: string
  photos?: string[]
  
  // 成本信息（雇员不可见）
  materialCost?: number // 原材料成本
  labor_cost?: number // 人工成本
  craft_cost?: number // 工艺成本
  total_cost?: number // 总制作成本
  
  // 销售信息
  selling_price: number // 销售价格
  profit_margin?: number // 利润率
  status: 'MAKING' | 'AVAILABLE' | 'SOLD' | 'OFFLINE'
  
  // 制作信息
  created_by: string // 制作人员ID
  creator?: User // 制作人员信息
  created_at: string
  updated_at: string
  
  // 原材料使用记录
  material_usages?: FinishedProductMaterialUsage[]
}

// SKU成品制作中的原材料使用记录
export interface FinishedProductMaterialUsage {
  id: string
  finishedProductId: string
  purchase_id: string
  purchase?: Purchase // 原材料采购记录
  quantity_used_beads: number // 使用的珠子数量
  quantity_used_pieces: number // 使用的片/件数量
  unitCost?: number // 单位成本
  total_cost?: number // 总成本
  created_at: string
}

// 原材料使用请求
export interface MaterialUsageRequest {
  purchase_id: string
  quantity_used_beads?: number
  quantity_used_pieces?: number
}

// 成本计算请求
export interface CostCalculationRequest {
  materials: MaterialUsageRequest[]
  labor_cost?: number
  craft_cost?: number
  profit_margin?: number
}

// 成本计算响应
export interface CostCalculationResponse {
  // 直接字段（用于前端直接访问）
  materialCost: number
  labor_cost: number
  craft_cost: number
  total_cost: number
  suggestedPrice?: number
  profit_margin?: number
  profitAmount?: number
  
  // 嵌套结构（保持向后兼容）
  cost_breakdown?: {
    materialCost: number
    labor_cost: number
    craft_cost: number
    total_cost: number
  }
  pricing_suggestion?: {
    suggestedPrice: number
    profit_margin: number
    profitAmount: number
  }
  material_details?: {
    purchase_id: string
    purchase_name: string // 采购名称
    quantity_used: number
    unitCost: number
    total_cost: number
  }[]
}

// 可用原材料
export interface AvailableMaterial {
  purchase_id: string
  purchase_code?: string
  purchase_name: string // 采购名称
  purchase_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL' // 采购类型
  bead_diameter?: number
  specification?: number
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  
  // 核心数量字段
  available_quantity: number // 可用数量（颗数/串数/片数/件数）
  
  // 手串相关字段（用户强调的重要逻辑）
  quantity?: number // 串数（手串类型）
  beads_per_string?: number // 每串颗数（手串类型）
  total_beads?: number // 总颗数（散珠、手串类型）
  piece_count?: number // 片数/件数（饰品配件、成品类型）
  
  // 使用情况字段
  used_beads?: number // 已用颗数
  used_pieces?: number // 已用片数/件数
  remaining_beads?: number // 剩余颗数（散珠、手串）
  remaining_pieces?: number // 剩余片数/件数（饰品配件、成品）
  
  // 成本和供应商信息
  unitCost?: number // 单位成本（雇员不可见）
  supplier_name?: string // 供应商名称（雇员不可见）
  photos?: string[]
}

// 成品原材料制作请求
export interface FinishedProductCreateRequest {
  sku_name: string // 成品SKU名称
  description?: string
  specification?: string
  materials: MaterialUsageRequest[]
  labor_cost?: number
  craft_cost?: number
  selling_price: number
  profit_margin?: number
  photos?: string[]
}

// SKU成品制作模式
export type ProductionMode = 'DIRECT_TRANSFORM' | 'COMBINATION_CRAFT'

// 成品原材料制作表单数据
export interface ProductionFormData {
  mode: ProductionMode
  purchase_name: string // 采购名称
  description: string
  specification: string
  selected_materials: {
    material: AvailableMaterial
    quantity_used_beads: number
    quantity_used_pieces: number
  }[]
  labor_cost: number
  craft_cost: number
  selling_price: number
  profit_margin: number
  photos: string[]
  production_quantity: number // 制作数量（组合制作模式专用）
}

// 批量创建的单个成品原材料信息
export interface BatchProductInfo {
  material_id: string                           // 对应的原材料ID
  purchase_name: string                        // 采购名称
  description: string                          // 成品描述
  specification: string | number               // 规格
  labor_cost: number                          // 人工成本
  craft_cost: number                          // 工艺成本
  selling_price: number                       // 销售价格
  photos: string[]                            // 成品图片
  materialCost: number                       // 原材料成本（自动计算）
  total_cost: number                          // 总成本（自动计算）
  profit_margin: number                       // 利润率（自动计算）
}

// 批量创建成品原材料请求
export interface BatchProductCreateRequest {
  products: {
    material_id: string
    purchase_name: string // 成品原材料名称
    description?: string
    specification?: string | number
    labor_cost: number
    craft_cost: number
    selling_price: number
    photos?: string[]
  }[]
}

// 批量创建成品原材料响应
export interface BatchProductCreateResponse {
  success_count: number
  failed_count: number
  created_products: {
    id: string
    material_code: string // 成品原材料编码
    sku_name: string // 成品SKU名称
    materialCost: number
    total_cost: number
    selling_price: number
    profit_margin: number
    status: string
  }[]
  failed_products: {
    material_id: string
    error: string
    error_code: string
  }[]
}

// SKU系统相关类型（SKU才是实际销售的产品，是我们真正意义上的成品）
export interface SkuItem {
  id: string
  sku_code: string
  sku_name: string
  material_signature_hash: string
  total_quantity: number
  available_quantity: number
  photos?: string[]
  specification?: string
  materialCost?: number
  labor_cost?: number
  craft_cost?: number
  total_cost?: number
  selling_price: number
  unit_price?: number
  total_value?: number
  profit_margin?: number
  created_at: string
  last_sale_date?: string
  created_by: string
  updated_at?: string
  status?: 'ACTIVE' | 'INACTIVE'
  description?: string
  material_traces?: MaterialTrace[]
  // 兼容字段（用于向后兼容）
  sku_id?: string
  sku_number?: string
}

// SKU原材料溯源信息
export interface MaterialTrace {
  material_id: string
  material_name: string
  quantity_used: number
  unit: string
  costPerUnit: number
  supplier: string
  batchNumber: string
}

// SKU溯源节点信息
export interface TraceNode {
  id: string
  type: 'material'
  name: string
  description: string
  timestamp: string
  operator: string
  location: string
  status: 'completed' | 'in_progress' | 'pending'
  details: {
    supplier: string
    batchNumber: string
    quantity: string
    qualityGrade: string
    diameter: string
    purchasePrice: string
  }
  materials: MaterialTrace[]
}

// SKU溯源响应数据
export interface SkuTraceResponse {
  success: boolean
  message: string
  data: {
    sku_info: {
      id: string
      sku_code: string
      sku_name: string
      specification?: string
    }
    traces: TraceNode[]
  }
}

// SKU库存变更日志
export interface SkuInventoryLog {
  log_id: string
  sku_id: string
  operationType: 'create' | 'sell' | 'destroy' | 'adjust_increase' | 'adjust_decrease'
  quantity_change: number
  quantity_before: number
  quantity_after: number
  unit_price: number
  total_amount: number
  operator_id: string
  operator_name: string
  reason: string
  notes?: string
  created_at: string
}

// SKU列表查询参数
export interface SkuListParams {
  page?: number
  limit?: number
  search?: string
  status?: 'ACTIVE' | 'INACTIVE'
  price_min?: number
  price_max?: number
  profit_margin_min?: number
  profit_margin_max?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// SKU销售确认数据
export interface SellData {
  quantity: number
  customer_name: string
  customer_phone: string
  customerAddress?: string
  sale_channel?: string
  sale_source?: 'SKU_PAGE' | 'CUSTOMER_PAGE' // 销售来源：SKU页面 或 客户管理页面
  notes?: string
  actual_total_price?: number // 实际销售总价（支持特殊优惠价格）
}

// SKU销毁操作数据
export interface DestroyData {
  quantity: number
  reason: string
  return_to_material: boolean
  selected_materials?: string[] // 选择退回的原材料ID列表（仅当reason为"拆散重做"时使用）
  custom_return_quantities?: { [purchase_id: string]: number } // 自定义退回数量（仅当reason为"拆散重做"时使用）
}

// SKU原材料信息（用于销毁时选择退回的原材料）
export interface SkuMaterialInfo {
  purchase_id: string
  purchase_name: string // 原材料名称
  supplier_name?: string
  quantity_used_beads: number
  quantity_used_pieces: number
  unitCost?: number
  total_cost?: number
}

// SKU库存调整数据
export interface AdjustData {
  type: 'increase' | 'decrease'
  quantity: number
  reason: string
  costAdjustment?: number
}

// SKU补货操作数据
export interface RestockData {
  quantity: number // 补货数量
}

// SKU补货信息（用于补货前检查）
export interface RestockInfo { sku_id: string
  sku_code: string
  sku_name: string
  current_quantity: number
  labor_cost: number
  craft_cost: number
  required_materials: RestockMaterial[]
  can_restock: boolean
  insufficient_materials?: string[] // 库存不足的原材料列表
}

// 补货所需原材料信息（用于SKU补货的原材料）
export interface RestockMaterial {
  purchase_id: string
  purchase_name: string // 原材料名称
  purchase_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL' // 原材料类型（半成品material和成品material）
  supplier_name: string
  purchase_code: string // 批次号
  bead_diameter?: number
  specification?: number
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  quantityNeededPerSku: number // 每个SKU需要的数量
  available_quantity: number // 当前库存数量
  unitCost: number
  unit: string // 单位（颗/串/片/件）
  isSufficient: boolean // 库存是否充足
}

// SKU补货API响应类型
export interface RestockInfoResponse {
  success: boolean
  message: string
  data: RestockInfo
}

export interface RestockResponse {
  success: boolean
  message: string
  data: { sku_id: string
    sku_code: string
    restocked_quantity: number
    new_total_quantity: number
    new_available_quantity: number
    consumed_materials: {
      purchase_id: string
      purchase_name: string // 改为materialName保持一致性
      consumed_quantity: number
      remaining_quantity: number
    }[]
    total_cost: number
  }
}

// SKU操作历史查询参数
export interface HistoryParams {
  page?: number
  limit?: number
  action?: string
}

// SKU权限控制
export interface SkuPermissions { can_view_price: boolean
  can_sell: boolean
  can_destroy: boolean
  can_adjust: boolean
  can_refund: boolean
  canViewTrace: boolean
}

// SKU API响应类型
export interface SkuListResponse {
  success: boolean
  message: string
  data: {
    skus: SkuItem[]
    pagination: {
      page: number
      limit: number
      total: number
      total_pages: number
    }
  }
}

export interface SkuDetailResponse {
  success: boolean
  message: string
  data: {
    sku: SkuItem
    material_traces: MaterialTrace[]
    purchaseList: {
      id: string
      purchase_name: string // 改为materialName保持一致性
      supplier: string
      purchase_date: string
      total_price: number
      remaining_quantity: number
    }[]
  }
}

export interface SkuHistoryResponse {
  success: boolean
  message: string
  data: {
    logs: SkuInventoryLog[]
    pagination: {
      page: number
      limit: number
      total: number
      total_pages: number
    }
  }
}

// 客户管理相关类型
export interface Customer {
  id: string
  customer_code: string // 客户编码，格式：CUS + YYYYMMDD + 001
  name: string // 客户姓名
  phone: string // 手机号（唯一标识）
  address?: string // 客户地址
  wechat?: string // 微信号
  birthday?: string // 出生年月日
  notes: CustomerNote[] // 备注记录列表
  total_purchases: number // 累计购买金额
  total_orders: number // 有效订单数量（不包含退货）
  total_all_orders: number // 总订单量（包含退货订单）
  refund_count?: number // 退货次数
  refund_rate: number // 退货率（百分比）
  first_purchase_date?: string // 首次购买日期
  last_purchase_date?: string // 最后购买日期
  customer_type: 'NEW' | 'REPEAT' | 'VIP' | 'ACTIVE' | 'INACTIVE' | 'FANATIC' | 'HIGH_VALUE' | 'LOW_VALUE' | 'DECLINING' | 'COOLING' | 'SILENT' | 'LOST' | 'PICKY' | 'ASSASSIN' // 客户类型
  created_at: string
  updated_at: string
}

// 客户备注类型
export interface CustomerNote {
  id: string
  customer_id: string
  content: string
  item_category: 'PREFERENCE' | 'BEHAVIOR' | 'CONTACT' | 'OTHER'
  created_at: string
  created_by: string
  creator?: User
}

// 客户购买记录类型
export interface CustomerPurchase {
  id: string
  customer_id: string
  sku_id: string
  sku_name: string // SKU名称（冗余字段）
  sku_code: string // SKU编码
  quantity: number // 购买数量
  unit_price: number // 单价
  total_price: number // 总价
  original_price?: number // 原价（用于显示优惠信息）
  status: 'ACTIVE' | 'REFUNDED' // 购买状态
  refund_date?: string // 退货日期
  refund_reason?: string // 退货原因
  refund_notes?: string // 退货备注
  sale_channel: string // 销售渠道
  sale_source: 'SKU_PAGE' | 'CUSTOMER_PAGE' // 销售来源：SKU页面 或 客户管理页面
  notes?: string // 购买备注
  purchase_date: string // 购买日期
  created_at: string
  sku?: {
    id: string
    sku_code: string
    sku_name: string
    specification?: string
    photos?: string[]
  }

}

// 客户创建请求
export interface CustomerCreateRequest {
  name: string
  phone: string
  address?: string
  wechat?: string
  birthday?: string
  notes?: string
}

// 客户列表查询参数
export interface CustomerListParams {
  page?: number
  limit?: number
  search?: string // 搜索客户姓名或手机号
  customer_type: 'NEW' | 'REPEAT' | 'VIP' | 'ACTIVE' | 'INACTIVE'
  sort?: 'asc' | 'desc'
  sort_by?: 'name' | 'customer_code' | 'phone' | 'total_purchases' | 'total_orders' | 'total_all_orders' | 'last_purchase_date' | 'created_at'
}

// 客户列表响应
export interface CustomerListResponse {
  success: boolean
  message: string
  data: {
    customers: Customer[]
    pagination: {
      page: number
      limit: number
      total: number
      total_pages: number
    }
  }
}

// 客户统计分析
export interface CustomerAnalytics {
  total_customers: number // 总客户数
  new_customers: number // 30天内新客户
  repeat_customers: number // 复购客户（订单数≥3）
  vip_customers: number // 大客户（累计购买≥5000元）
  active_customers: number // 活跃客户（90天内购买）
  inactive_customers: number // 流失客户（180天以上未购买）
  average_order_value: number // 平均订单价值
  repeat_purchase_rate: number // 复购率（复购客户/总客户）
  refund_rate: number // 总退货率（累计退货次数/累计订单数）
  average_profit_margin: number // 平均毛利率（基于实际成交价格计算）
  time_period?: 'week' | 'month' | 'half_year' | 'year' | 'all' // 时间筛选周期
}

// 客户分析查询参数
export interface CustomerAnalyticsParams {
  time_period?: 'week' | 'month' | 'half_year' | 'year' | 'all'
}

// 主页仪表板相关类型
export interface DashboardStats {
  total_purchases: number // 总采购数量
  total_products: number // 总成品数量
  total_inventory_value: number // 总库存价值
  low_stock_items: number // 低库存商品数量
  recent_purchases: RecentPurchase[] // 最近采购记录
  recent_products: RecentProduct[] // 最近成品记录
  supplier_stats: SupplierStat[] // 供应商统计
}

// 最近采购记录类型
export interface RecentPurchase {
  id: number
  product_name: string // 产品名称
  purchase_date: string // 采购日期
  total_price: number // 总价格
}

// 最近成品记录类型
export interface RecentProduct {
  id: number
  product_name: string // 成品名称
  created_date: string // 创建时间
  total_cost: number // 总成本
  status: 'in_stock' | 'sold' // 状态
}

// 保持向后兼容的别名
export interface RecentMaterial extends RecentProduct {
  material_name: string // 成品名称（别名）
  created_at: string // 创建时间（别名）
  specification: string // 规格
  quantity: number // 数量
}

// 供应商统计类型
export interface SupplierStat {
  supplier_id: number // 供应商ID
  supplier_name: string // 供应商名称
  total_spent: number // 总花费
  purchase_count: number // 采购次数
}

// 仪表板API响应类型
export interface DashboardResponse {
  success: boolean
  message: string
  data: DashboardStats
}

// 全局窗口类型扩展
declare global {
  interface Window {
    __LOCAL_IP__?: string
    __PUBLIC_IP__?: string
    __API_DOMAIN__?: string
    NETWORK_CONFIG?: networkConfig
    temp_filter_position?: {
      column: string
      top: number
      left: number
    }
  }
}