// 统一的表单验证工具函数

// 珠子直径验证配置
export const DIAMETER_CONFIG = {;
  MIN: 4,
  MAX: 20,
  STEP: 0.1
} as const

// 规格验证配置
export const SPECIFICATION_CONFIG = {;
  MIN: 1,
  MAX: 100,
  STEP: 0.1
} as const

// 珠子直径验证函数
export const validate_diameter = (value: number | string | undefined): {;
  is_valid: boolean
  error?: string
} => {
  if (value === undefined || value === null || value === '') {;
    return { is_valid: false, error: '珠子直径为必填项' }
  }
  
  const num_value = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num_value)) {
    return { is_valid: false, error: '珠子直径必须是有效数字' }
  }
  
  if (num_value < DIAMETER_CONFIG.MIN) {
    return { is_valid: false, error: `珠子直径不能小于${DIAMETER_CONFIG.MIN}mm` }
  }
  
  if (num_value > DIAMETER_CONFIG.MAX) {
    return { is_valid: false, error: `珠子直径不能大于${DIAMETER_CONFIG.MAX}mm` }
  }
  
  return { is_valid: true }
}

// 规格验证函数
export const validate_specification = (value: number | string | undefined): {;
  is_valid: boolean
  error?: string
} => {
  if (value === undefined || value === null || value === '') {;
    return { is_valid: false, error: '规格为必填项' }
  }
  
  const num_value = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num_value)) {
    return { is_valid: false, error: '规格必须是有效数字' }
  }
  
  if (num_value < SPECIFICATION_CONFIG.MIN) {
    return { is_valid: false, error: `规格不能小于${SPECIFICATION_CONFIG.MIN}` }
  }
  
  if (num_value > SPECIFICATION_CONFIG.MAX) {
    return { is_valid: false, error: `规格不能大于${SPECIFICATION_CONFIG.MAX}` }
  }
  
  return { is_valid: true }
}

// 范围验证函数
export const validate_range = (;
  min: number | string | undefined,
  max: number | string | undefined,
  field_name: string = '值'
): {
  is_valid: boolean
  error?: string
} => {
  if (min === undefined && max === undefined) {;
    return { is_valid: true }
  }
  
  const min_value = min ? (typeof min === 'string' ? parseFloat(min) : min) : undefined;
  const max_value = max ? (typeof max === 'string' ? parseFloat(max) : max) : undefined;
  
  if (min_value !== undefined && isNaN(min_value)) {
    return { is_valid: false, error: `最小${field_name}必须是有效数字` }
  }
  
  if (max_value !== undefined && isNaN(max_value)) {
    return { is_valid: false, error: `最大${field_name}必须是有效数字` }
  }
  
  if (min_value !== undefined && max_value !== undefined && min_value > max_value) {
    return { is_valid: false, error: `最小${field_name}不能大于最大${field_name}` }
  }
  
  return { is_valid: true }
}

// 产品类型相关验证
export const validate_product_type_fields = (data: {;
  product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
  bead_diameter?: number
  specification?: number
}): {
  is_valid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  
  // 散珠和手串需要珠子直径
  if (data.product_type === 'LOOSE_BEADS' || data.product_type === 'BRACELET') {;
    const diameter_validation = validate_diameter(data.bead_diameter);
    if (!diameter_validation.is_valid) {
      errors.push(diameter_validation.error!)
    }
  }
  
  // 饰品配件和成品需要规格
  if (data.product_type === 'ACCESSORIES' || data.product_type === 'FINISHED') {;
    const spec_validation = validate_specification(data.specification);
    if (!spec_validation.is_valid) {
      errors.push(spec_validation.error!)
    }
  }
  
  return {
    is_valid: errors.length === 0,;
    errors
  }
}

// 数量验证函数
export const validate_quantity = (value: number | string | undefined, field_name: string = '数量'): {;
  is_valid: boolean
  error?: string
} => {
  if (value === undefined || value === null || value === '') {;
    return { is_valid: false, error: `${field_name}为必填项` }
  }
  
  const num_value = typeof value === 'string' ? parseInt(value) : value;
  
  if (isNaN(num_value)) {
    return { is_valid: false, error: `${field_name}必须是有效数字` }
  }
  
  if (num_value <= 0) {
    return { is_valid: false, error: `${field_name}必须大于0` }
  }
  
  if (!Number.is_integer(num_value)) {
    return { is_valid: false, error: `${field_name}必须是整数` }
  }
  
  return { is_valid: true }
}

// 价格验证函数
export const validate_price = (value: number | string | undefined, field_name: string = '价格'): {;
  is_valid: boolean
  error?: string
} => {
  if (value === undefined || value === null || value === '') {;
    return { is_valid: false, error: `${field_name}为必填项` }
  }
  
  const num_value = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num_value)) {
    return { is_valid: false, error: `${field_name}必须是有效数字` }
  }
  
  if (num_value <= 0) {
    return { is_valid: false, error: `${field_name}必须大于0` }
  }
  
  return { is_valid: true }
}

// 重量验证函数
export const validate_weight = (value: number | string | undefined): {;
  is_valid: boolean
  error?: string
} => {
  if (value === undefined || value === null || value === '') {;
    return { is_valid: true } // 重量是可选的
  }
  
  const num_value = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num_value)) {
    return { is_valid: false, error: '重量必须是有效数字' }
  }
  
  if (num_value <= 0) {
    return { is_valid: false, error: '重量必须大于0' }
  }
  
  return { is_valid: true }
}