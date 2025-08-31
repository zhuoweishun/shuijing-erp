// 统一的表单验证工具函数

// 珠子直径验证配置
export const DIAMETER_CONFIG = {
  MIN: 4,
  MAX: 20,
  STEP: 0.1
} as const

// 规格验证配置
export const SPECIFICATION_CONFIG = {
  MIN: 1,
  MAX: 100,
  STEP: 0.1
} as const

// 珠子直径验证函数
export const validateDiameter = (value: number | string | undefined): {
  isValid: boolean
  error?: string
} => {
  if (value === undefined || value === null || value === '') {
    return { isValid: false, error: '珠子直径为必填项' }
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return { isValid: false, error: '珠子直径必须是有效数字' }
  }
  
  if (numValue < DIAMETER_CONFIG.MIN) {
    return { isValid: false, error: `珠子直径不能小于${DIAMETER_CONFIG.MIN}mm` }
  }
  
  if (numValue > DIAMETER_CONFIG.MAX) {
    return { isValid: false, error: `珠子直径不能大于${DIAMETER_CONFIG.MAX}mm` }
  }
  
  return { isValid: true }
}

// 规格验证函数
export const validateSpecification = (value: number | string | undefined): {
  isValid: boolean
  error?: string
} => {
  if (value === undefined || value === null || value === '') {
    return { isValid: false, error: '规格为必填项' }
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return { isValid: false, error: '规格必须是有效数字' }
  }
  
  if (numValue < SPECIFICATION_CONFIG.MIN) {
    return { isValid: false, error: `规格不能小于${SPECIFICATION_CONFIG.MIN}` }
  }
  
  if (numValue > SPECIFICATION_CONFIG.MAX) {
    return { isValid: false, error: `规格不能大于${SPECIFICATION_CONFIG.MAX}` }
  }
  
  return { isValid: true }
}

// 范围验证函数
export const validateRange = (
  min: number | string | undefined,
  max: number | string | undefined,
  fieldName: string = '值'
): {
  isValid: boolean
  error?: string
} => {
  if (min === undefined && max === undefined) {
    return { isValid: true }
  }
  
  const minValue = min ? (typeof min === 'string' ? parseFloat(min) : min) : undefined
  const maxValue = max ? (typeof max === 'string' ? parseFloat(max) : max) : undefined
  
  if (minValue !== undefined && isNaN(minValue)) {
    return { isValid: false, error: `最小${fieldName}必须是有效数字` }
  }
  
  if (maxValue !== undefined && isNaN(maxValue)) {
    return { isValid: false, error: `最大${fieldName}必须是有效数字` }
  }
  
  if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
    return { isValid: false, error: `最小${fieldName}不能大于最大${fieldName}` }
  }
  
  return { isValid: true }
}

// 产品类型相关验证
export const validateProductTypeFields = (data: {
  product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
  bead_diameter?: number
  specification?: number
}): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  
  // 散珠和手串需要珠子直径
  if (data.product_type === 'LOOSE_BEADS' || data.product_type === 'BRACELET') {
    const diameterValidation = validateDiameter(data.bead_diameter)
    if (!diameterValidation.isValid) {
      errors.push(diameterValidation.error!)
    }
  }
  
  // 饰品配件和成品需要规格
  if (data.product_type === 'ACCESSORIES' || data.product_type === 'FINISHED') {
    const specValidation = validateSpecification(data.specification)
    if (!specValidation.isValid) {
      errors.push(specValidation.error!)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 数量验证函数
export const validateQuantity = (value: number | string | undefined, fieldName: string = '数量'): {
  isValid: boolean
  error?: string
} => {
  if (value === undefined || value === null || value === '') {
    return { isValid: false, error: `${fieldName}为必填项` }
  }
  
  const numValue = typeof value === 'string' ? parseInt(value) : value
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName}必须是有效数字` }
  }
  
  if (numValue <= 0) {
    return { isValid: false, error: `${fieldName}必须大于0` }
  }
  
  if (!Number.isInteger(numValue)) {
    return { isValid: false, error: `${fieldName}必须是整数` }
  }
  
  return { isValid: true }
}

// 价格验证函数
export const validatePrice = (value: number | string | undefined, fieldName: string = '价格'): {
  isValid: boolean
  error?: string
} => {
  if (value === undefined || value === null || value === '') {
    return { isValid: false, error: `${fieldName}为必填项` }
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName}必须是有效数字` }
  }
  
  if (numValue <= 0) {
    return { isValid: false, error: `${fieldName}必须大于0` }
  }
  
  return { isValid: true }
}

// 重量验证函数
export const validateWeight = (value: number | string | undefined): {
  isValid: boolean
  error?: string
} => {
  if (value === undefined || value === null || value === '') {
    return { isValid: true } // 重量是可选的
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return { isValid: false, error: '重量必须是有效数字' }
  }
  
  if (numValue <= 0) {
    return { isValid: false, error: '重量必须大于0' }
  }
  
  return { isValid: true }
}