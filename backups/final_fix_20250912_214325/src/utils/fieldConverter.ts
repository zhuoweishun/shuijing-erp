/**
 * 字段命名转换工具
 * 根据《API接口统一规范文档》5.4节要求实现
 * 前端API响应使用snake_case，后端数据库字段使用camelCase
 */

/**
 * 将purchaseId转换为用户友好的CG开头编号
 * @param purchase_id 采购ID（可以是string或number类型）
 * @returns CG开头的用户友好编号
 */
export function format_purchase_code(code: string | number): string {
  if (!code) return '';
  
  const id_str = code.toString();
  
  // 如果是UUID字符串，生成6位数字编号
  if (id_str.length > 10 && id_str.includes('cmf')) {
    // 从UUID字符串生成哈希值，然后转换为6位数字
    let hash = 0;
    for (let i = 0; i < id_str.length; i++) {
      const char = id_str.char_code_at(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    // 取绝对值并限制为6位数字
    const numeric_code = Math.abs(hash) % 1000000;
    const padded_code = numeric_code.toString().padStart(6, '0');
    return `CG${padded_code}`;
  }
  
  // 如果是数字ID，按原逻辑处理
  const numeric_id = parseInt(id_str, 10);
  if (!isNaN(numeric_id)) {
    const padded_id = numeric_id.toString().padStart(6, '0');
    return `CG${padded_id}`;
  }
  
  // 如果都不是，返回空字符串
  return '';
}

/**
 * 将camelCase转换为snake_case
 * @param str camelCase字符串
 * @returns snake_case字符串
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.to_lower_case()}`);
}

/**
 * 将snake_case转换为camelCase
 * @param str snake_case字符串
 * @returns camelCase字符串
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.to_upper_case());
}

/**
 * 将对象的所有键从camelCase转换为snake_case
 * 使用标准映射表确保转换的一致性
 * @param obj 输入对象
 * @returns 转换后的对象
 */
export function convertToApiFormat<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToApiFormat(item));
  }

  if (typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  const converted: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    // 使用完整映射表进行转换，如果没有映射则使用自动转换
    const snakeKey = COMPLETE_FIELD_MAPPINGS[key as keyof typeof COMPLETE_FIELD_MAPPINGS] || camelToSnake(key);
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      converted[snakeKey] = convertToApiFormat(value);
    } else if (Array.isArray(value)) {
      converted[snakeKey] = value.map(item => 
        (item && typeof item === 'object' && !(item instanceof Date)) ? convertToApiFormat(item) : item
      );
    } else {
      converted[snakeKey] = value;
    }
  });

  return converted;
}

/**
 * 将对象的所有键从snake_case转换为camelCase
 * 使用反向映射表确保转换的一致性
 * @param obj 输入对象
 * @returns 转换后的对象
 */
export function convertFromApiFormat<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertFromApiFormat(item));
  }

  if (typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  const converted: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    // 使用反向映射表进行转换，如果没有映射则使用自动转换
    const camelKey = REVERSE_FIELD_MAPPINGS[key] || snakeToCamel(key);
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      converted[camelKey] = convertFromApiFormat(value);
    } else if (Array.isArray(value)) {
      converted[camelKey] = value.map(item => 
        (item && typeof item === 'object' && !(item instanceof Date)) ? convertFromApiFormat(item) : item
      );
    } else {
      converted[camelKey] = value;
    }
  });

  return converted;
}

/**
 * 完整的字段映射表
 * 覆盖所有业务字段，确保前后端字段命名一致性
 */
export const COMPLETE_FIELD_MAPPINGS = {// 基础字段
  id: 'id',
  created_at: 'created_at',
  updated_at: 'updated_at',
  is_active: 'is_active',
  is_deleted: 'isDeleted',
  
  // API响应字段
  success: 'success',
  message: 'message',
  data: 'data',
  error: 'error',
  
  // 用户相关
  user_id: 'user_id',
  user_name: 'user_name',
  email: 'email',
  name: 'name',
  phone: 'phone',
  role: 'role',
  avatar: 'avatar',
  last_login_at: 'lastLoginAt',
  real_name: 'realName',
  
  // 原材料相关（仓库查询功能中的所有货物统一称为原材料material，包括散珠、手串、饰品配件、成品原材料）
  material_id: 'material_id', // 原材料ID
  material_name: 'material_name', // 原材料名称
  material_type: 'material_type', // 原材料类型（散珠material、手串material、饰品配件material、成品material）
  material_code: 'material_code', // 原材料编码
  
  // Material模型相关字段
  // available_quantity: 'available_quantity', // 可用数量（已在库存相关中定义）
  // used_quantity: 'used_quantity', // 已使用数量（稍后定义）
  unit_cost: 'unitCost', // 单位成本
  material_status: 'materialStatus', // 原材料状态
  material_usages: 'material_usages', // 原材料使用记录
  material_action: 'materialAction', // 原材料操作类型
  quantity_used: 'quantity_used', // 使用数量
  returned_materials: 'returnedMaterials', // 退回的原材料
  material_signature: 'material_signature', // 原材料标识
  
  // 产品相关（仅用于SKU，SKU才是真正意义上的成品/产品）
  product_id: 'product_id', // 已弃用，建议使用skuId
  product_name: 'material_name', // 修改：统一映射到materialName（概念统一）
  product_code: 'productCode', // 已弃用，建议使用skuCode
  
  // 向后兼容性映射（旧字段自动映射到新字段）
  // 这些映射确保现有代码不会因为字段名变更而出错
  product_types: 'material_types', // 兼容：product_types -> material_types
  product_distribution: 'material_distribution', // 兼容：productDistribution -> material_distribution
  unit_type: 'unit_type',
  bead_diameter: 'bead_diameter',
  specification: 'specification',
  quantity: 'quantity',
  piece_count: 'piece_count',
  min_stock_alert: 'min_stock_alert',
  quality: 'quality',
  photos: 'photos',
  notes: 'notes',
  materials: 'materials',
  
  // 价格相关
  price_per_gram: 'price_per_gram',
  price_per_bead: 'price_per_bead',
  unit_price: 'unit_price',
  total_price: 'total_price',
  total_cost: 'total_cost',
  total_value: 'total_value',
  weight: 'weight',
  profit: 'profit',
  profit_margin: 'profit_margin',
  
  // 采购相关
  purchase_id: 'purchase_id',
  purchase_code: 'purchase_code',
  purchase_date: 'purchase_date',
  price_per_piece: 'pricePerPiece',
  total_quantity: 'total_quantity',
  remaining_beads: 'remainingBeads',
  beads_per_string: 'beads_per_string',
  total_beads: 'total_beads',
  last_edited_by: 'last_edited_by',
  last_edited_by_id: 'lastEditedById',
  
  // 供应商相关
  supplier_id: 'supplier_id',
  supplier_name: 'supplier_name',
  supplier_code: 'supplierCode',
  supplier_info: 'supplierInfo',
  contact_person: 'contactPerson',
  address: 'address',
  description: 'description',
  
  // 库存相关
  inventory_id: 'inventoryId',
  stock_quantity: 'stockQuantity',
  available_quantity: 'available_quantity',
  used_quantity: 'used_quantity', // 已使用数量
  reserved_quantity: 'reservedQuantity',
  is_low_stock: 'is_low_stock',
  has_low_stock: 'hasLowStock',
  low_stock_threshold: 'lowStockThreshold',
  total_variants: 'total_variants',
  
  // SKU相关
  sku_id: 'sku_id',
  sku_code: 'sku_code',
  sku_name: 'sku_name',
  sku_number: 'skuNumber',
  material_signature_hash: 'material_signature_hash',
  material_cost: 'material_cost',
  labor_cost: 'labor_cost',
  craft_cost: 'craft_cost',
  selling_price: 'selling_price',
  last_sale_date: 'last_sale_date',
  created_by: 'created_by',
  material_traces: 'material_traces',
  
  // SKU操作相关
  sale_channel: 'sale_channel',
  sale_source: 'sale_source',
  
  // 客户相关
  customer_id: 'customer_id',
  customer_name: 'customer_name',
  customer_phone: 'customer_phone',
  customer_address: 'customerAddress',
  customer_code: 'customer_code',
  total_purchases: 'total_purchases',
  total_orders: 'total_orders',
  total_all_orders: 'total_all_orders',
  refund_count: 'refund_count',
  refund_rate: 'refund_rate',
  average_order_value: 'average_order_value',
  days_since_last_purchase: 'days_since_last_purchase',
  days_since_first_purchase: 'daysSinceFirstPurchase',
  customer_labels: 'customer_labels',
  primary_label: 'primaryLabel',
  first_purchase_date: 'first_purchase_date',
  last_purchase_date: 'last_purchase_date',
  actual_total_price: 'actual_total_price',
  return_to_material: 'returnToMaterial',
  selected_materials: 'selected_materials',
  custom_return_quantities: 'customReturnQuantities',
  cost_adjustment: 'costAdjustment',
  
  // SKU响应字段
  new_quantity: 'newQuantity',
  sold_quantity: 'soldQuantity',
  remaining_quantity: 'remaining_quantity',
  destroyed_quantity: 'destroyedQuantity',
  restocked_quantity: 'restockedQuantity',
  refunded_quantity: 'refundedQuantity',
  new_total_quantity: 'new_total_quantity',
  new_available_quantity: 'newAvailableQuantity',
  // returned_materials: 'returnedMaterials', // 已在Material模型相关字段中定义
  returned_materials_count: 'returned_materials_count',
  consumed_materials: 'consumedMaterials',
  sale_info: 'saleInfo',
  sku_info: 'skuInfo',
  sku_unit_price: 'skuUnitPrice',
  actual_unit_price: 'actualUnitPrice',
  discount_amount: 'discount_amount',
  total_materials: 'total_materials',
  total_cost_per_sku: 'total_cost_per_sku',
  current_quantity: 'current_quantity',
  can_restock: 'canRestock',
  insufficient_materials: 'insufficientMaterials',
  required_materials: 'required_materials',
  refund_amount: 'refund_amount',
  
  // SKU库存日志相关
  log_id: 'logId',
  operation_type: 'operation_type',
  quantity_change: 'quantity_change',
  quantity_before: 'quantity_before',
  quantity_after: 'quantity_after',
  operator_id: 'operatorId',
  operator_name: 'operatorName',
  
  // SKU查询参数
  price_min: 'price_min',
  price_max: 'price_max',
  profit_margin_min: 'profit_margin_min',
  profit_margin_max: 'profit_margin_max',
  
  // 查询相关
  sort_by: 'sort_by',
  sort_order: 'sort_order',
  order_by: 'order_by',
  page_size: 'page_size',
  page_number: 'page_number',
  search_term: 'search_term',
  
  // 半成品矩阵相关
  specification_value: 'specificationValue',
  specification_unit: 'specificationUnit',
  // remaining_quantity: 'remaining_quantity', // 已在SKU响应字段中定义
  original_quantity: 'original_quantity',
  // used_quantity: 'used_quantity', // 已在库存相关中定义
  batch_count: 'batch_count',
  
  // 价格范围相关
  total_price_min: 'total_price_min',
  total_price_max: 'total_price_max',
  price_per_gram_min: 'price_per_gram_min',
  price_per_gram_max: 'price_per_gram_max',
  
  // AI相关
  natural_language_input: 'natural_language_input',
  ai_recognition_result: 'ai_recognition_result',
  confidence: 'confidence',
  max_tokens: 'maxTokens',
  
  // 成品相关
  // material_usages: 'material_usages', // 已在Material模型相关字段中定义
  // used_quantity: 'used_quantity', // 已在库存相关中定义
  destroyed_at: 'destroyedAt',
  restored_materials: 'restoredMaterials',
  
  // 分页相关
  total_count: 'total_count',
  total_pages: 'total_pages',
  current_page: 'current_page',
  has_next_page: 'has_next_page',
  has_prev_page: 'has_prev_page',
  
  // 测试相关字段
  // supplier_name: 'supplier_name', // 已在供应商相关中定义
  // bead_diameter: 'bead_diameter', // 已在向后兼容性映射中定义
  // unit_price: 'unit_price', // 已在价格相关中定义
  total_amount: 'total_amount',
  // created_by: 'created_by', // 已在SKU相关中定义
  // created_at: 'created_at', // 已在基础字段中定义
  // updated_at: 'updated_at', // 已在基础字段中定义
  
  // 客户统计相关
  total_customers: 'total_customers',
  new_customers: 'newCustomers',
  repeat_customers: 'repeatCustomers',
  vip_customers: 'vipCustomers',
  active_customers: 'activeCustomers',
  inactive_customers: 'inactiveCustomers',
  repeat_purchase_rate: 'repeat_purchase_rate',
  
  // Financial模块相关
  // total_cost: 'total_cost', // 已在价格相关中定义
  stale_cost: 'stale_cost',
  stale_count: 'stale_count',
  stale_ratio: 'stale_ratio',
  sku_inventory: 'sku_inventory',
  total_inventory: 'total_inventory',
  material_inventory: 'material_inventory',
  // total_cost_per_sku: 'total_cost_per_sku', // 已在SKU响应字段中定义
  record_type: 'record_type',
  reference_type: 'reference_type',
  reference_id: 'reference_id',
  transaction_date: 'transaction_date'
  // real_name: 'realName' // 已在用户相关中定义
} as const;

/**
 * 反向映射表（snake_case到camelCase）
 */
export const REVERSE_FIELD_MAPPINGS = Object.fromEntries(
  Object.entries(COMPLETE_FIELD_MAPPINGS).map(([camel, snake]) => [snake, camel])
);

/**
 * 验证字段命名是否符合规范
 * @param obj 要验证的对象
 * @param expectedFormat 期望的格式 'camelCase' | 'snake_case'
 * @returns 验证结果
 */
export function validateFieldNaming(
  obj: Record<string, any>, 
  expectedFormat: 'camelCase' | 'snake_case'
): {
  is_valid: boolean;
  invalidFields: string[];
  suggestions: Record<string, string>;
} {
  const invalidFields: string[] = [];
  const suggestions: Record<string, string> = {};
  
  Object.keys(obj).forEach(key => {
    const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(key);
    const isSnakeCase = /^[a-z][a-z0-9_]*$/.test(key);
    
    if (expectedFormat === 'camelCase' && !isCamelCase) {
      invalidFields.push(key);
      if (isSnakeCase) {
        suggestions[key] = snakeToCamel(key);
      }
    } else if (expectedFormat === 'snake_case' && !isSnakeCase) {
      invalidFields.push(key);
      if (isCamelCase) {
        suggestions[key] = camelToSnake(key);
      }
    }
  });
  
  return {
    is_valid: invalidFields.length === 0,
    invalidFields,
    suggestions
  };
}

/**
 * 批量转换字段名
 * @param data 数据数组或单个对象
 * @param format 目标格式
 * @returns 转换后的数据
 */
export function batchConvertFields<T>(
  data: T | T[], 
  format: 'camelCase' | 'snake_case'
): T | T[] {
  const converter = format === 'snake_case' ? convertToApiFormat : convertFromApiFormat;
  
  if (Array.isArray(data)) {
    return data.map(item => converter(item as any)) as T[];
  }
  
  return converter(data as any) as T;
}