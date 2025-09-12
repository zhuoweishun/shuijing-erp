// 用户相关类型
export interface User {
  id: number, username: string, real_name: string, name: string // 添加name属性作为real_name的别名, role: 'BOSS' | 'EMPLOYEE'
  status: 'active' | 'inactive'
  created_at: string, updated_at: string
}

export interface LoginRequest {
  username: string, password: string
}

export interface LoginResponse {
  user: User, token: string, message: string
}

// 供应商相关类型
export interface Supplier {
  id: number, supplier_code: string, supplier_name: string, name: string // 添加name属性作为supplier_name的别名
  contact_person?: string
  phone?: string
  email?: string
  address?: string, status: 'active' | 'inactive'
  notes?: string, created_at: string, updated_at: string
}

// 供应商调试统计响应类型
export interface SupplierDebugStats {
  total_suppliers: number, active_suppliers: number, inactive_suppliers: number, all_active_suppliers: Supplier[]
}

// 供应商列表API响应类型
export interface SupplierListResponse {
  suppliers: Supplier[]
}

// 修改日志相关类型
export interface AuditLog {
  id: string
  user_id?: string, action: string, resource: string
  resource_id?: string
  details?: string
  ip_address?: string
  user_agent?: string, created_at: string
}

// 编辑日志类型
export interface EditLog {
  id: string
  purchase_id: string
  user_id: string
  action: string
  details?: string
  changed_fields?: any
  created_at: string
  user: {
    id: string, name: string, username: string
  }
}

// 采购相关类型
export interface Purchase {
  id: string // 修改为string类型以匹配数据库, purchase_code: string, product_name: string, product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED' // 产品类型, unit_type: 'PIECES' | 'STRINGS' | 'SLICES' | 'ITEMS' // 计量单位, supplier_id: number
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
  ai_recognition_result?: any, created_by: number
  creator?: User
  user?: User // 录入人信息, created_at: string, updated_at: string
  last_edited_by?: User // 最后编辑人
  last_edited_at?: string // 最后编辑时间
  edit_logs?: EditLog[] // 编辑日志
}

export interface PurchaseCreateRequest {
  product_name: string, product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
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
  purchase_date?: string // 后端会自动设置当前时间, photos: string[] // 修改为必需字段
  notes?: string
  natural_language_input?: string // 添加自然语言录入字段
  ai_recognition_result?: any
}

// 成品相关类型
export interface Product {
  id: number
  product_code?: string, product_name: string, materials: MaterialUsage[] // 原材料列表, total_cost: number
  selling_price?: number
  profit?: number
  profit_margin?: number
  photos?: string[]
  status: 'in_stock' | 'sold' | 'destroyed'
  created_date?: string
  sold_date?: string
  created_by?: number
  creator?: User, created_at: string, updated_at: string
}

export interface ProductCreateRequest {
  product_name: string
  materials: {
    purchase_id: number, quantity_used_beads: number
  }[]
  selling_price?: number
  photos?: string[]
  created_date?: string
}

// 原材料使用记录类型
export interface MaterialUsage {
  id: number, product_id: number, purchase_id: number
  purchase?: Purchase, quantity_used_beads: number, price_per_bead: number, total_cost: number, created_at: string
}

// 库存相关类型
export interface InventoryItem {
  purchase_id: string, product_name: string, product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED' // 产品类型, unit_type: 'PIECES' | 'STRINGS' | 'SLICES' | 'ITEMS' // 计量单位
  bead_diameter?: number // 散珠和手串使用
  specification?: number // 饰品配件和成品使用
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  min_stock_alert?: number, original_quantity: number // 原始数量（根据产品类型：颗数/串数/片数/件数）
  used_quantity: number // 已使用数量, remaining_quantity: number // 剩余数量, is_low_stock: number // 0=正常，1=低库存
  price_per_unit?: number // 单价（雇员不可见）
  price_per_gram?: number // 克价（雇员不可见）
  supplier_name?: string // 雇员不可见, purchase_date: string
  photos?: string[]
  notes?: string, created_at: string, updated_at: string
}

export interface InventoryQueryParams {
  page?: number
  limit?: number
  search?: string
  product_types?: string[] // 产品类型筛选（多选）
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  low_stock_only?: boolean
  diameter_min?: string // 珠子直径范围
  diameter_max?: string
  specification_min?: string // 规格范围
  specification_max?: string
  quantity_min?: string // 数量范围
  quantity_max?: string
  sort?: 'asc' | 'desc'
  sort_by?: 'purchase_date' | 'created_at' | 'remaining_quantity' | 'product_name' | 'product_type'
}

// 分组库存相关类型
export interface InventoryVariant {
  purchase_id: number, product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
  bead_diameter?: number // 散珠和手串使用
  specification?: number // 饰品配件和成品使用
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  remaining_quantity: number // 剩余数量, is_low_stock: number // 0=正常，1=低库存
  price_per_unit?: number // 单价（雇员不可见）
  price_per_gram?: number // 克价（雇员不可见）
  batch_count?: number // 批次数量
  batches?: InventoryBatch[] // 批次详情
}

// 库存批次类型
export interface InventoryBatch {
  purchase_id: number
  supplier_name?: string, purchase_date: string, remaining_quantity: number // 剩余数量, original_quantity: number // 原始数量, used_quantity: number // 已使用数量
  price_per_unit?: number // 单价
}

export interface InventoryGroup {
  product_name: string, product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
  variant_count: number, total_remaining_quantity: number // 总剩余数量, has_low_stock: boolean, variants: InventoryVariant[]
}

export interface GroupedInventoryQueryParams {
  page?: number
  limit?: number
  search?: string
  product_types?: string[] // 产品类型筛选（多选）
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  low_stock_only?: boolean
  sort?: 'asc' | 'desc'
  sort_by?: 'product_name' | 'total_remaining_quantity' | 'product_type'
}

export interface InventoryListResponse {
  success: boolean
  message: string
  data: {
    items: InventoryItem[]
    pagination: {
      page: number, limit: number, total: number, pages: number
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
  success: boolean, message: string, data: InventoryItem
}

export interface InventoryExportResponse {
  success: boolean
  message: string
  data: {
    items: any[]
    total: number, filename: string
  }
}

// AI识别相关类型
export interface AIParseRequest {
  description: string
}

export interface AIParseResponse {
  product_name?: string
  quantity?: number
  price_per_gram?: number
  weight?: number
  bead_diameter?: number
  quality?: 'excellent' | 'good' | 'average' | 'poor'
  supplier_name?: string, confidence: number, raw_result: any
}

// 智能助理相关类型
export interface AssistantMessage {
  id: string, role: 'user' | 'assistant'
  content: string, timestamp: string
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
  url: string, filename: string, original_name: string, size: number, mime_type: string
}

// API响应通用类型（符合文档规范）
export interface ApiResponse<T = any> {
  success: boolean          // 请求状态
  message: string           // 提示信息
  data?: T                  // 业务数据
  error?: {                 // 错误信息（失败时返回）
    code: string            // 错误码（如INVALID_DIAMETER）
    details?: any           // 错误详情（如字段验证失败）
  },
  offline?: boolean         // 离线模式标识
  timestamp?: number        // 时间戳
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number, page: number, limit: number, total_pages: number
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

// 统计数据类型
export interface DashboardStats {
  total_purchases: number
  total_products: number
  total_inventory_value: number
  low_stock_items: number
  recent_purchases: Purchase[]
  recent_products: Product[]
  supplier_stats: {
    supplier_id: number, supplier_name: string, total_spent: number, purchase_count: number
  }[]
}

// 网络配置类型
export interface NetworkConfig {
  local_i_p: string, public_i_p: string, api_domain: string, isDevelopment: boolean, isProduction: boolean
}

// 成品制作相关类型
export interface FinishedProduct {
  id: string, product_code: string // 成品编号，格式：FP+日期+3位序号, product_name: string
  description?: string
  specification?: string
  photos?: string[]
  
  // 成本信息（雇员不可见）
  material_cost?: number // 原材料成本
  labor_cost?: number // 人工成本
  craft_cost?: number // 工艺成本
  total_cost?: number // 总制作成本
  
  // 销售信息, selling_price: number // 销售价格
  profit_margin?: number // 利润率, status: 'MAKING' | 'AVAILABLE' | 'SOLD' | 'OFFLINE'
  
  // 制作信息, created_by: string // 制作人员ID
  creator?: User // 制作人员信息, created_at: string, updated_at: string
  
  // 原材料使用记录
  material_usages?: FinishedProductMaterialUsage[]
}

// 成品制作中的原材料使用记录
export interface FinishedProductMaterialUsage {
  id: string, finished_product_id: string, purchase_id: string
  purchase?: Purchase // 原材料采购记录, quantity_used_beads: number // 使用的珠子数量, quantity_used_pieces: number // 使用的片/件数量
  unit_cost?: number // 单位成本
  total_cost?: number // 总成本, created_at: string
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
  material_cost: number
  labor_cost: number
  craft_cost: number
  total_cost: number
  suggested_price?: number
  profit_margin?: number
  profit_amount?: number
  
  // 嵌套结构（保持向后兼容）
  cost_breakdown?: {
    material_cost: number, labor_cost: number, craft_cost: number, total_cost: number
  },
  pricing_suggestion?: {
    suggested_price: number, profit_margin: number, profit_amount: number
  },
  material_details?: {
    purchase_id: string, product_name: string, quantity_used: number, unit_cost: number, total_cost: number
  }[]
}

// 可用原材料
export interface AvailableMaterial {
  purchase_id: string
  purchase_code?: string, product_name: string, product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
  bead_diameter?: number
  specification?: number
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  
  // 核心数量字段, available_quantity: number // 可用数量（颗数/串数/片数/件数）
  
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
  unit_cost?: number // 单位成本（雇员不可见）
  supplier_name?: string // 供应商名称（雇员不可见）
  photos?: string[]
}

// 成品制作请求
export interface FinishedProductCreateRequest {
  product_name: string
  description?: string
  specification?: string, materials: MaterialUsageRequest[]
  labor_cost?: number
  craft_cost?: number, selling_price: number
  profit_margin?: number
  photos?: string[]
}

// 成品制作模式
export type ProductionMode = 'DIRECT_TRANSFORM' | 'COMBINATION_CRAFT'

// 成品制作表单数据
export interface ProductionFormData {
  mode: ProductionMode
  product_name: string
  description: string
  specification: string
  selected_materials: {
    material: AvailableMaterial, quantity_used_beads: number, quantity_used_pieces: number
  }[]
  labor_cost: number
  craft_cost: number
  selling_price: number
  profit_margin: number
  photos: string[]
  production_quantity: number // 制作数量（组合制作模式专用）
}

// 批量创建的单个成品信息
export interface BatchProductInfo {
  material_id: string                           // 对应的原材料ID, product_name: string                         // 成品名称, description: string                          // 成品描述, specification: string | number               // 规格, labor_cost: number                          // 人工成本, craft_cost: number                          // 工艺成本, selling_price: number                       // 销售价格, photos: string[]                            // 成品图片, material_cost: number                       // 原材料成本（自动计算）
  total_cost: number                          // 总成本（自动计算）
  profit_margin: number                       // 利润率（自动计算）
}

// 批量创建成品请求
export interface BatchProductCreateRequest {
  products: {
    material_id: string, product_name: string
    description?: string
    specification?: string | number, labor_cost: number, craft_cost: number, selling_price: number
    photos?: string[]
  }[]
}

// 批量创建成品响应
export interface BatchProductCreateResponse {
  success_count: number
  failed_count: number
  created_products: {
    id: string, product_code: string, product_name: string, material_cost: number, total_cost: number, selling_price: number, profit_margin: number, status: string
  }[]
  failed_products: {
    material_id: string, error: string, error_code: string
  }[]
}

// SKU系统相关类型（按照文档规范定义）
export interface SkuItem {
  id: string, sku_code: string, sku_name: string, material_signature_hash: string, total_quantity: number, available_quantity: number
  photos?: string[]
  specification?: string
  material_cost?: number
  labor_cost?: number
  craft_cost?: number
  total_cost?: number, selling_price: number
  unit_price?: number
  total_value?: number
  profit_margin?: number, created_at: string
  last_sale_date?: string, created_by: string
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
  material_id: string, material_name: string, quantity_used: number, unit: string, cost_per_unit: number, supplier: string, batch_number: string
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
    supplier: string, batch_number: string, quantity: string, quality_grade: string, diameter: string, purchase_price: string
  },
  materials: MaterialTrace[]
}

// SKU溯源响应数据
export interface SkuTraceResponse {
  success: boolean
  message: string
  data: {
    sku_info: {
      id: string, sku_code: string, sku_name: string
      specification?: string
    },
    traces: TraceNode[]
  }
}

// SKU库存变更日志
export interface SkuInventoryLog {
  log_id: string, sku_id: string, operation_type: 'create' | 'sell' | 'destroy' | 'adjust_increase' | 'adjust_decrease'
  quantity_change: number, quantity_before: number, quantity_after: number, unit_price: number, total_amount: number, operator_id: string, operator_name: string, reason: string
  notes?: string, created_at: string
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
  buyer_info?: string
  sale_channel?: string
  notes?: string
}

// SKU销毁操作数据
export interface DestroyData {
  quantity: number, reason: string, return_to_material: boolean
}

// SKU库存调整数据
export interface AdjustData {
  type: 'increase' | 'decrease'
  quantity: number, reason: string
  cost_adjustment?: number
}

// SKU操作历史查询参数
export interface HistoryParams {
  page?: number
  limit?: number
  action?: string
}

// SKU权限控制
export interface SkuPermissions {
  canViewPrice: boolean, canSell: boolean, canDestroy: boolean, canAdjust: boolean, canViewTrace: boolean
}

// SKU API响应类型
export interface SkuListResponse {
  success: boolean
  message: string
  data: {
    skus: SkuItem[]
    pagination: {
      page: number, limit: number, total: number, totalPages: number
    }
  }
}

export interface SkuDetailResponse {
  success: boolean
  message: string
  data: {
    sku: SkuItem
    material_traces: MaterialTrace[]
    purchase_list: {
      id: string, product_name: string, supplier: string, purchase_date: string, total_price: number, remaining_quantity: number
    }[]
  }
}

export interface SkuHistoryResponse {
  success: boolean
  message: string
  data: {
    logs: SkuInventoryLog[]
    pagination: {
      page: number, limit: number, total: number, total_pages: number
    }
  }
}

// 全局窗口类型扩展
declare global {
  interface Window {
    __LOCAL_IP__?: string
    __PUBLIC_IP__?: string
    __API_DOMAIN__?: string
    NETWORK_CONFIG?: NetworkConfig
    tempFilterPosition?: {
      column: string, top: number, left: number
    }
  }
}