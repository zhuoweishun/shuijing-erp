/**
 * 后端字段命名转换工具
 * 根据《API接口统一规范文档》6.2节要求实现
 * 统一前后端字段转换逻辑，确保数据一致性
 */

/**
 * 将camelCase转换为snake_case
 * @param str camelCase字符串
 * @returns snake_case字符串
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * 将snake_case转换为camelCase
 * @param str snake_case字符串
 * @returns camelCase字符串
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 完整的字段映射表
 * 覆盖所有业务字段，确保前后端字段命名一致性
 */
export const COMPLETE_FIELD_MAPPINGS = {
  // 基础字段
  id: 'id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  isActive: 'is_active',
  isDeleted: 'is_deleted',
  
  // 用户相关
  userId: 'user_id',
  username: 'username',
  email: 'email',
  name: 'name',
  phone: 'phone',
  role: 'role',
  avatar: 'avatar',
  lastLoginAt: 'last_login_at',
  realName: 'real_name',
  
  // 产品相关
  productId: 'product_id',
  productName: 'product_name',
  productType: 'product_type',
  productCode: 'product_code',
  unitType: 'unit_type',
  beadDiameter: 'bead_diameter',
  specification: 'specification',
  quantity: 'quantity',
  pieceCount: 'piece_count',
  minStockAlert: 'min_stock_alert',
  quality: 'quality',
  photos: 'photos',
  notes: 'notes',
  materials: 'materials',
  
  // 价格相关
  pricePerGram: 'price_per_gram',
  pricePerBead: 'price_per_bead',
  pricePerPiece: 'price_per_piece',
  unitPrice: 'unit_price',
  totalPrice: 'total_price',
  totalCost: 'total_cost',
  totalValue: 'total_value',
  weight: 'weight',
  profit: 'profit',
  profitMargin: 'profit_margin',
  
  // 采购相关
  purchaseId: 'purchase_id',
  purchaseCode: 'purchase_code',
  purchaseDate: 'purchase_date',
  totalQuantity: 'total_quantity',
  remainingBeads: 'remaining_beads',
  beadsPerString: 'beads_per_string',
  totalBeads: 'total_beads',
  
  // 供应商相关
  supplierId: 'supplier_id',
  supplierName: 'supplier_name',
  supplierCode: 'supplier_code',
  supplierInfo: 'supplier_info',
  contactPerson: 'contact_person',
  address: 'address',
  description: 'description',
  
  // 库存相关
  inventoryId: 'inventory_id',
  stockQuantity: 'stock_quantity',
  availableQuantity: 'available_quantity',
  reservedQuantity: 'reserved_quantity',
  isLowStock: 'is_low_stock',
  hasLowStock: 'has_low_stock',
  lowStockThreshold: 'low_stock_threshold',
  totalVariants: 'total_variants',
  
  // 查询相关
  sortBy: 'sort_by',
  sortOrder: 'sort_order',
  orderBy: 'order_by',
  pageSize: 'page_size',
  pageNumber: 'page_number',
  searchTerm: 'search_term',
  
  // AI相关
  naturalLanguageInput: 'natural_language_input',
  aiRecognitionResult: 'ai_recognition_result',
  confidence: 'confidence',
  maxTokens: 'max_tokens',
  
  // 成品相关
  materialUsages: 'material_usages',
  usedQuantity: 'used_quantity',
  destroyedAt: 'destroyed_at',
  restoredMaterials: 'restored_materials',
  
  // 分页相关
  totalCount: 'total_count',
  totalPages: 'total_pages',
  currentPage: 'current_page',
  hasNextPage: 'has_next_page',
  hasPrevPage: 'has_prev_page'
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
  'pricePerGram', 'price_per_gram',
  'totalPrice', 'total_price',
  'unitPrice', 'unit_price',
  'pricePerBead', 'price_per_bead',
  'pricePerPiece', 'price_per_piece',
  'weight',
  'beadDiameter', 'bead_diameter',
  'specification',
  'quantity',
  'pieceCount', 'piece_count',
  'beadsPerString', 'beads_per_string',
  'totalBeads', 'total_beads',
  'minStockAlert', 'min_stock_alert',
  'totalCost', 'total_cost',
  'profit',
  'profitMargin', 'profit_margin'
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
      const decimalPlaces = Math.abs(e);
      if (decimalPlaces >= numStr.length) {
        numStr = '0.' + '0'.repeat(decimalPlaces - numStr.length) + numStr;
      } else {
        const insertPos = numStr.length - decimalPlaces;
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
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    const result = isNaN(numValue) ? null : numValue;
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
  isValid: boolean;
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
    isValid: invalidFields.length === 0,
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
    'supplier_info',
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