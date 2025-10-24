// 后端统一验证工具函数
import { z } from 'zod'

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

// 珠子直径验证schema
export const diameterSchema = z.number()
  .min(DIAMETER_CONFIG.MIN, `珠子直径不能小于${DIAMETER_CONFIG.MIN}mm`)
  .max(DIAMETER_CONFIG.MAX, `珠子直径不能大于${DIAMETER_CONFIG.MAX}mm`)
  .refine((val) => {
    // 检查小数位数不超过1位
    const decimalPlaces = (val.toString().split('.')[1] || '').length
    return decimalPlaces <= 1
  }, '珠子直径最多保留1位小数')

// 规格验证schema
export const specificationSchema = z.number()
  .min(SPECIFICATION_CONFIG.MIN, `规格不能小于${SPECIFICATION_CONFIG.MIN}`)
  .max(SPECIFICATION_CONFIG.MAX, `规格不能大于${SPECIFICATION_CONFIG.MAX}`)
  .refine((val) => {
    // 检查小数位数不超过1位
    const decimalPlaces = (val.toString().split('.')[1] || '').length
    return decimalPlaces <= 1
  }, '规格最多保留1位小数')

// 数量验证schema
export const quantitySchema = z.number()
  .int('数量必须是整数')
  .positive('数量必须大于0')

// 价格验证schema
export const priceSchema = z.number()
  .positive('价格必须大于0')
  .refine((val) => {
    // 检查小数位数不超过2位
    const decimalPlaces = (val.toString().split('.')[1] || '').length
    return decimalPlaces <= 2
  }, '价格最多保留2位小数')

// 重量验证schema
export const weightSchema = z.number()
  .positive('重量必须大于0')
  .refine((val) => {
    // 检查小数位数不超过2位
    const decimalPlaces = (val.toString().split('.')[1] || '').length
    return decimalPlaces <= 2
  }, '重量最多保留2位小数')

// 产品类型枚举
export const productTypeSchema = z.enum(['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED_MATERIAL'])

// 单位类型枚举
export const unitTypeSchema = z.enum(['PIECES', 'STRINGS', 'SLICES', 'ITEMS'])

// 品相等级枚举
export const qualitySchema = z.enum(['AA', 'A', 'AB', 'B', 'C'])

// 产品名称验证schema
export const productNameSchema = z.string()
  .min(1, '产品名称不能为空')
  .max(200, '产品名称不能超过200字符')
  .refine((val) => {
    // 检查是否包含特殊字符
    const invalidChars = /[<>"'&]/
    return !invalidChars.test(val)
  }, '产品名称不能包含特殊字符')

// 供应商名称验证schema
export const supplierNameSchema = z.string()
  .min(1, '供应商名称不能为空')
  .max(100, '供应商名称不能超过100字符')
  .refine((val) => {
    // 检查是否包含特殊字符
    const invalidChars = /[<>"'&]/
    return !invalidChars.test(val)
  }, '供应商名称不能包含特殊字符')

// 备注验证schema
export const notesSchema = z.string()
  .max(1000, '备注不能超过1000字符')
  .optional()

// 自然语言输入验证schema
export const naturalLanguageInputSchema = z.string()
  .max(2000, '自然语言输入不能超过2000字符')
  .optional()

// 图片URL验证schema
export const photosSchema = z.array(
  z.string().url('图片URL格式不正确')
).min(1, '至少需要上传一张图片')

// 产品类型相关字段验证函数
export const validateProductTypeFields = (data: {
  product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL'
  bead_diameter?: number
  specification?: number
}) => {
  const errors: string[] = []
  
  // 散珠和手串需要珠子直径
  if (data.product_type === 'LOOSE_BEADS' || data.product_type === 'BRACELET') {
    if (data.bead_diameter === undefined) {
      errors.push('散珠和手串需要填写珠子直径')
    } else {
      try {
        diameterSchema.parse(data.bead_diameter)
      } catch (error: any) {
        errors.push(error.errors?.[0]?.message || '珠子直径验证失败')
      }
    }
  }
  
  // 饰品配件和成品需要规格
  if (data.product_type === 'ACCESSORIES' || data.product_type === 'FINISHED_MATERIAL') {
    if (data.specification === undefined) {
      errors.push('饰品配件和成品需要填写规格')
    } else {
      try {
        specificationSchema.parse(data.specification)
      } catch (error: any) {
        errors.push(error.errors?.[0]?.message || '规格验证失败')
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 范围验证函数
export const validateRange = (
  min: number | undefined,
  max: number | undefined,
  fieldName: string = '值'
) => {
  const errors: string[] = []
  
  if (min !== undefined && max !== undefined && min > max) {
    errors.push(`最小${fieldName}不能大于最大${fieldName}`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 计算每串珠子数量的工具函数
export const calculateBeadsPerString = (diameter: number): number => {
  if (diameter <= 0) {
    throw new Error('珠子直径必须大于0')
  }
  return Math.floor(160 / diameter)
}

// 验证珠子直径是否在合理范围内
export const isValidDiameter = (diameter: number): boolean => {
  return diameter >= DIAMETER_CONFIG.MIN && diameter <= DIAMETER_CONFIG.MAX
}

// 验证规格是否在合理范围内
export const isValidSpecification = (specification: number): boolean => {
  return specification >= SPECIFICATION_CONFIG.MIN && specification <= SPECIFICATION_CONFIG.MAX
}