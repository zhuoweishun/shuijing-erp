/**
 * 后端字段命名转换工具
 * 根据《API接口统一规范文档》6.2节要求实现
 * 统一前后端字段转换逻辑，确保数据一致性
 * 
 * 更新日期: 2025-01-10
 * 新增: 相似命名规范支持，明确区分Product vs Purchase、Customer vs Client、SKU vs Product等概念
 */

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
 * 完整的字段映射表
 * 覆盖所有业务字段，确保前后端字段命名一致性
 */
export const COMPLETE_FIELD_MAPPINGS = {// 基础字段
  id: 'id',
  created_at: 'created_at',
  updated_at: 'updated_at',
  is_active: 'isActive',
  is_deleted: 'isDeleted',
  
  // 成品表特殊字段映射（数据库字段 -> API字段）
  // name: 'product_name', // 注释掉这个通用映射，避免影响supplier.name
  // unit_price: 'selling_price', // 注释掉重复的映射
  // total_value: 'total_value', // 注释掉重复的映射
  images: 'photos',
  
  // 用户相关
  user_id: 'user_id',
  user_name: 'user_name',
  email: 'email',
  phone: 'phone',
  role: 'role',
  avatar: 'avatar',
  last_login_at: 'lastLoginAt',
  real_name: 'realName',
  
  // 原材料相关（仓库中的所有货物统一称为原材料material）
  // 包括：散珠material、手串material、饰品配件material、成品material
  material_id: 'material_id',
  material_name: 'material_name', // 原材料名称（数据库字段productName的业务概念）
  material_type: 'material_type', // 原材料类型（数据库字段materialType的业务概念）
  material_code: 'material_code', // 原材料编码
  
  // 产品相关（已废弃，统一使用material概念）
  product_id: 'materialId', // 已弃用，统一使用materialId
  product_name: 'material_name', // 已弃用，统一使用materialName
  product_type: 'material_type', // 已弃用，统一使用material_type
  product_code: 'productCode', // 成品编码
  
  // 成品原材料相关（注意：这些仍然是原材料material，不是最终产品）
  finishedProductId: 'finishedProductId', // 成品原材料ID
  finishedProductName: 'finishedProductName', // 成品原材料名称
  finishedProductCode: 'finishedProductCode', // 成品原材料编码
  unit_type: 'unit_type',
  bead_diameter: 'bead_diameter',
  specification: 'specification',
  quantity: 'quantity',
  piece_count: 'piece_count',
  // min_stock_alert: 'min_stock_alert', // 注释掉重复的映射
  quality: 'quality',
  photos: 'photos',
  notes: 'notes',
  materials: 'materials',
  
  // 价格相关
  price_per_gram: 'price_per_gram',
  price_per_bead: 'price_per_bead',
  price_per_piece: 'pricePerPiece',
  total_price: 'total_price',
  total_cost: 'total_cost',
  total_value: 'total_value',
  weight: 'weight',
  profit: 'profit',
  profit_margin: 'profit_margin',
  
  // 采购相关（采购记录/采购订单）
  purchase_id: 'purchase_id',
  purchase_code: 'purchase_code',
  purchase_date: 'purchase_date',
  purchaseRecord: 'purchaseRecord',
  purchaseOrder: 'purchaseOrder',
  purchaseEntry: 'purchaseEntry',
  purchaseList: 'purchaseList',
  total_quantity: 'total_quantity',
  remaining_beads: 'remainingBeads',
  beads_per_string: 'beads_per_string',
  total_beads: 'total_beads',
  
  // 供应商相关
  supplier_id: 'supplier_id',
  supplier_name: 'supplier_name',
  supplier_code: 'supplierCode',
  supplier_info: 'supplierInfo',
  contact_person: 'contactPerson',
  address: 'address',
  description: 'description',
  
  // 库存管理相关（Inventory）
  inventory_id: 'inventoryId',
  inventoryList: 'inventoryList',
  inventoryManagement: 'inventoryManagement',
  inventoryRecord: 'inventoryRecord',
  inventoryOperation: 'inventoryOperation',
  inventoryLog: 'inventoryLog',
  
  // 库存状态相关（Stock）
  stock_quantity: 'stockQuantity',
  stockStatus: 'stockStatus',
  stockAlert: 'stockAlert',
  stockCheck: 'stockCheck',
  available_quantity: 'available_quantity',
  reserved_quantity: 'reservedQuantity',
  is_low_stock: 'is_low_stock',
  has_low_stock: 'hasLowStock',
  lowStock: 'lowStock',
  low_stock_threshold: 'lowStockThreshold',
  min_stock_alert: 'min_stock_alert',
  total_variants: 'total_variants',
  
  // 查询相关
  sort_by: 'sort_by',
  sort_order: 'sort_order',
  order_by: 'order_by',
  page_size: 'page_size',
  page_number: 'page_number',
  search_term: 'search_term',
  
  // AI相关
  natural_language_input: 'natural_language_input',
  ai_recognition_result: 'ai_recognition_result',
  confidence: 'confidence',
  max_tokens: 'maxTokens',
  
  // 成品相关
  material_usages: 'material_usages',
  used_quantity: 'used_quantity',
  destroyed_at: 'destroyedAt',
  restored_materials: 'restoredMaterials',
  
  // SKU相关（库存管理单位）
  sku_id: 'sku_id',
  sku_code: 'sku_code',
  sku_name: 'sku_name',
  skuQuantity: 'skuQuantity',
  sku_inventory: 'sku_inventory',
  skuManagement: 'skuManagement',
  skuDetails: 'skuDetails',
  material_signature_hash: 'material_signature_hash',
  material_signature: 'material_signature',
  // unit_price: 'unit_price', // 注释掉重复的映射
  material_cost: 'material_cost',
  labor_cost: 'labor_cost',
  craft_cost: 'craft_cost',
  
  // 分页相关
  total_count: 'total_count',
  total_pages: 'total_pages',
  current_page: 'current_page',
  has_next_page: 'has_next_page',
  has_prev_page: 'has_prev_page',
  
  // 客户相关（业务客户）
  customer_id: 'customer_id',
  customer_name: 'customer_name',
  customer_code: 'customer_code',
  customer_type: 'customer_type',
  customer_phone: 'customer_phone',
  customer_address: 'customerAddress',
  customerManagement: 'customerManagement',
  customerDetail: 'customerDetail',
  
  // 客户端相关（技术客户端）
  apiClient: 'apiClient',
  clientConfig: 'clientConfig',
  clientRequest: 'clientRequest',
  clientResponse: 'clientResponse',
  wechatId: 'wechatId',
  birthday: 'birthday',
  first_purchase_date: 'first_purchase_date',
  last_purchase_date: 'last_purchase_date',
  
  // 客户统计字段
  total_orders: 'total_orders',
  total_all_orders: 'total_all_orders',
  total_purchases: 'total_purchases',
  refund_count: 'refund_count',
  refund_rate: 'refund_rate',
  average_order_value: 'average_order_value',
  days_since_last_purchase: 'daysSinceLastPurchase',
  days_since_first_purchase: 'daysSinceFirstPurchase',
  
  // 客户标签字段
  customer_labels: 'customerLabels',
  primary_label: 'primaryLabel',
  
  // 地理位置字段
  city: 'city',
  province: 'province'
} as const;

/**
 * 反向映射表（snake_case到camelCase）
 */
export const REVERSE_FIELD_MAPPINGS = Object.fromEntries(
  Object.entries(COMPLETE_FIELD_MAPPINGS).map(([camel, snake]) => [snake, camel])
);

/**
 * 数值字段列表 - 需要转换为数字类型的字段
 */
const NUMERIC_FIELDS = [
  'price_per_gram', 'price_per_gram',
  'total_price', 'total_price',
  'unit_price', 'unit_price', 'selling_price',
  'price_per_bead', 'price_per_bead',
  'pricePerPiece', 'pricePerPiece',
  'weight',
  'bead_diameter', 'bead_diameter',
  'specification',
  'quantity',
  'piece_count', 'piece_count',
  'beads_per_string', 'beads_per_string',
  'total_beads', 'total_beads',
  'min_stock_alert', 'min_stock_alert',
  'total_cost', 'total_cost',
  'total_value', 'total_value',
  'profit',
  'profit_margin', 'profit_margin',
  
  // 客户统计数值字段
  'total_orders', 'total_orders',
  'total_all_orders', 'total_all_orders',
  'total_purchases', 'total_purchases',
  'refund_count', 'refund_count',
  'refund_rate', 'refund_rate',
  'average_order_value', 'average_order_value',
  'daysSinceLastPurchase', 'daysSinceLastPurchase',
  'daysSinceFirstPurchase', 'daysSinceFirstPurchase'
];

/**
 * 检查是否为Prisma Decimal类型
 * @param value 值
 * @returns 是否为Decimal类型
 */
function isPrismaDecimal(value: any): boolean {
  return value && typeof value === 'object' && 
         typeof value.s === 'number' && 
         typeof value.e === 'number' && 
         Array.isArray(value.d);
}

/**
 * 转换Prisma Decimal为数字
 * @param decimal Prisma Decimal对象
 * @returns 数字值
 */
function convertPrismaDecimal(decimal: any): number {
  try {
    // 首先尝试使用toString方法，这是最可靠的方式
    if (typeof decimal.toString === 'function') {
      const result = parseFloat(decimal.toString());
      return result;
    }
    
    // 如果toString不可用，则手动解析Prisma Decimal格式
    const { s, e, d } = decimal;
    
    // 将digits数组转换为字符串
    let numStr = '';
    for (let i = 0; i < d.length; i++) {
      numStr += d[i].toString();
    }
    
    // 根据指数调整小数点位置
    // e表示小数点的位置（从右边数）
    if (e < 0) {
      // 负指数：小数
      const decimal_places = Math.abs(e);
      if (decimal_places >= numStr.length) {
        numStr = '0.' + '0'.repeat(decimal_places - numStr.length) + numStr;
      } else {
        const insertPos = numStr.length - decimal_places;
        numStr = numStr.slice(0, insertPos) + '.' + numStr.slice(insertPos);
      }
    } else if (e > 0) {
      // 正指数：在末尾补零
      numStr += '0'.repeat(e);
    }
    
    // 处理符号
    if (s === -1) {
      numStr = '-' + numStr;
    }
    
    const result = parseFloat(numStr);
    return result;
  } catch (error) {
    console.error('Decimal转换失败:', error, decimal);
    return 0;
  }
}

/**
 * 转换数值字段
 * @param key 字段名
 * @param value 字段值
 * @returns 转换后的值
 */
function convertNumericField(key: string, value: any): any {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // 首先检查是否为Prisma Decimal类型，无论字段名如何
  if (isPrismaDecimal(value)) {
    console.log(`🔧 [字段转换] 发现Prisma Decimal字段: ${key}, 值:`, value);
    return convertPrismaDecimal(value);
  }
  
  // 检查原始字段名和转换后的字段名
  const snakeKey = COMPLETE_FIELD_MAPPINGS[key as keyof typeof COMPLETE_FIELD_MAPPINGS] || camelToSnake(key);
  
  if (NUMERIC_FIELDS.includes(key) || NUMERIC_FIELDS.includes(snakeKey)) {
    // 处理字符串和普通数字
    const num_value = typeof value === 'string' ? parseFloat(value) : value;
    const result = isNaN(num_value) ? null : num_value;
    return result;
  }
  
  return value;
}

/**
 * 统一的字段转换函数：将数据库camelCase字段转换为API snake_case格式
 * @param obj 输入对象或数组
 * @returns 转换后的对象或数组
 */
export function convertToApiFormat<T = any>(obj: T): any {
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
  
  Object.entries(obj as Record<string, any>).forEach(([key, value]) => {
    // 使用映射表进行转换，如果没有映射则使用自动转换
    const snakeKey = COMPLETE_FIELD_MAPPINGS[key as keyof typeof COMPLETE_FIELD_MAPPINGS] || camelToSnake(key);
    
    // 首先检查是否为Prisma Decimal类型
    if (isPrismaDecimal(value)) {
      converted[snakeKey] = convertPrismaDecimal(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      converted[snakeKey] = convertToApiFormat(value);
    } else if (Array.isArray(value)) {
      converted[snakeKey] = value.map(item => 
        (item && typeof item === 'object' && !(item instanceof Date)) ? convertToApiFormat(item) : item
      );
    } else {
      // 对数值字段进行类型转换
      converted[snakeKey] = convertNumericField(key, value);
    }
  });

  // 成品数据特殊处理：添加缺失的字段
  if (converted.id && (converted.material_name || converted.name)) {
    // 确保materialCode字段存在
    if (!converted.material_code && converted.material_code) {
      converted.material_code = converted.material_code;
    }
    
    // 添加缺失的specification字段（优先从materialUsages中计算平均规格）
    if (!converted.specification) {
      // 如果有material_usages数据，从中计算平均规格
      if (converted.material_usages && Array.isArray(converted.material_usages) && converted.material_usages.length > 0) {
        const specifications = converted.material_usages
          .map((usage: any) => {
            // 优先使用purchase中的bead_diameter，然后是specification
            const purchase = usage.purchase;
            if (purchase) {
              return purchase.bead_diameter || purchase.specification;
            }
            return null;
          })
          .filter((spec: any) => spec !== null && spec !== undefined);
        
        if (specifications.length > 0) {
          // 计算平均规格
          const avgSpec = specifications.reduce((sum: number, spec: any) => sum + Number(spec), 0) / specifications.length;
          converted.specification = `${avgSpec.to_fixed(1)}mm`;
        } else {
          // 如果没有规格数据，使用unit作为备选
          converted.specification = converted.unit || converted.description || converted.category || null;
        }
      } else {
        // 如果没有material_usages数据，使用unit作为备选
        converted.specification = converted.unit || converted.description || converted.category || null;
      }
    }
    
    // 计算利润率（如果有销售价格和总成本）
    if (!converted.profit_margin && converted.selling_price && converted.total_value) {
      const selling_price = Number(converted.selling_price) || 0;
      const total_cost = Number(converted.total_value) || 0;
      if (selling_price > 0 && total_cost > 0) {
        converted.profit_margin = ((selling_price - total_cost) / selling_price * 100);
      }
    }
    
    // 处理图片字段 - 修复双重嵌套JSON数组问题
    if (converted.images && !converted.photos) {
      try {
        let parsedImages = typeof converted.images === 'string' ? JSON.parse(converted.images) : converted.images;
        
        // 处理双重嵌套数组：[["url"]] -> ["url"]
        if (Array.isArray(parsedImages) && parsedImages.length > 0 && Array.isArray(parsedImages[0])) {
          parsedImages = parsedImages[0];
        }
        
        // 确保结果是数组
        if (!Array.isArray(parsedImages)) {
          parsedImages = [parsedImages];
        }
        
        // 过滤掉无效的URL
         converted.photos = parsedImages.filter((url: any) => url && typeof url === 'string' && url.trim());
       } catch (e) {
        converted.photos = [];
      }
    }
  }

  return converted;
}

/**
 * 统一的字段转换函数：将API snake_case字段转换为数据库camelCase格式
 * @param obj 输入对象或数组
 * @returns 转换后的对象或数组
 */
export function convertFromApiFormat<T = any>(obj: T): any {
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
  
  Object.entries(obj as Record<string, any>).forEach(([key, value]) => {
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

/**
 * 权限敏感字段过滤器
 * 根据用户角色过滤敏感字段
 */
export function filterSensitiveFields(data: any, userRole: string): any {
  if (userRole === 'BOSS') {
    return data; // 老板可以看到所有字段
  }
  
  // 雇员需要过滤的敏感字段
  const sensitiveFields = [
    'price_per_gram',
    'total_price', 
    'weight',
    'supplierInfo',
    'supplier_name',
    'price_per_bead',
    'total_cost',
    'profit',
    'profit_margin',
    'materials'
  ];
  
  if (Array.isArray(data)) {
    return data.map(item => filterSensitiveFields(item, userRole));
  }
  
  if (data && typeof data === 'object') {
    const filtered = { ...data };
    sensitiveFields.forEach(field => {
      if (filtered.hasOwnProperty(field)) {
        filtered[field] = null; // 保留字段但设为null
      }
    });
    return filtered;
  }
  
  return data;
}