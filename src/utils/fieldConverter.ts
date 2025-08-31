/**
 * 字段命名转换工具
 * 根据《API接口统一规范文档》5.4节要求实现
 * 前端API响应使用snake_case，后端数据库字段使用camelCase
 */

/**
 * 将UUID格式的purchase_id转换为用户友好的CG开头编号
 * @param purchaseId UUID格式的采购ID
 * @returns CG开头的用户友好编号
 */
export function formatPurchaseCode(purchaseId: string): string {
  if (!purchaseId) return '';
  
  // 从UUID中提取数字和字母，生成6位编号
  const cleanId = purchaseId.replace(/[^a-zA-Z0-9]/g, '');
  const hash = cleanId.slice(-6).toUpperCase();
  
  // 获取当前日期作为前缀
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  
  return `CG${year}${month}${day}${hash}`;
}

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
    // 使用标准映射表进行转换，如果没有映射则使用自动转换
    const snakeKey = STANDARD_FIELD_MAPPINGS[key as keyof typeof STANDARD_FIELD_MAPPINGS] || camelToSnake(key);
    
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
 * 与后端保持完全一致，确保前后端字段命名统一
 */
export const STANDARD_FIELD_MAPPINGS = {
  // 基础字段
  id: 'id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  isActive: 'is_active',
  isDeleted: 'is_deleted',
  
  // API响应字段
  success: 'success',
  message: 'message',
  data: 'data',
  error: 'error',
  
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
  Object.entries(STANDARD_FIELD_MAPPINGS).map(([camel, snake]) => [snake, camel])
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