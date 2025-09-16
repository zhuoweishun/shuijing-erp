// 格式化工具函数

/**
 * 格式化金额显示
 * @param amount 金额
 * @returns 格式化后的金额字符串
 */
export function format_amount(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * 格式化货币显示（formatAmount的别名）
 * @param amount 金额
 * @returns 格式化后的金额字符串
 */
export function format_currency(amount: number): string {
  return format_amount(amount)
}

/**
 * 格式化日期显示
 * @param dateString 日期字符串
 * @returns 格式化后的日期字符串
 */
export function format_date(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai'
  })
}

/**
 * 格式化日期为YYYY-MM-DD格式
 * @param dateString 日期字符串
 * @returns YYYY-MM-DD格式的日期字符串
 */
export function format_date_only(dateString: string): string {
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

/**
 * 格式化数字
 * @param num 数字
 * @param decimals 小数位数
 * @returns 格式化后的数字字符串
 */
export function format_number(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

/**
 * 格式化百分比
 * @param value 数值
 * @param decimals 小数位数
 * @returns 格式化后的百分比字符串
 */
export function format_percentage(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100)
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export function format_file_size(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化相对时间
 * @param dateString 日期字符串
 * @returns 相对时间字符串
 */
export function format_relative_time(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff_in_seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diff_in_seconds < 60) {
    return '刚刚'
  } else if (diff_in_seconds < 3600) {
    const minutes = Math.floor(diff_in_seconds / 60)
    return `${minutes}分钟前`
  } else if (diff_in_seconds < 86400) {
    const hours = Math.floor(diff_in_seconds / 3600)
    return `${hours}小时前`
  } else if (diff_in_seconds < 2592000) {
    const days = Math.floor(diff_in_seconds / 86400)
    return `${days}天前`
  } else {
    return format_date(dateString)
  }
}

/**
 * 截断文本
 * @param text 文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncate_text(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
}

/**
 * 格式化手机号
 * @param phone 手机号
 * @returns 格式化后的手机号
 */
export function format_phone(phone: string): string {
  if (!phone) return ''
  
  // 移除所有非数字字符
  const cleaned = phone.replace(/\D/g, '')
  
  // 格式化为 xxx-xxxx-xxxx
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }
  
  return phone
}

/**
 * 格式化身份证号
 * @param idCard 身份证号
 * @returns 格式化后的身份证号（隐藏中间部分）
 */
export function format_id_card(idCard: string): string {
  if (!idCard || idCard.length !== 18) {
    return idCard
  }
  
  return `${idCard.slice(0, 6)}********${idCard.slice(-4)}`
}

/**
 * 格式化银行卡号
 * @param card_number 银行卡号
 * @returns 格式化后的银行卡号
 */
export function format_bank_card(card_number: string): string {
  if (!card_number) return ''
  
  // 移除所有非数字字符
  const cleaned = card_number.replace(/\D/g, '')
  
  // 每4位添加一个空格
  return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ')
}

/**
 * 格式化地址
 * @param address 地址对象或字符串
 * @returns 格式化后的地址字符串
 */
export function format_address(address: string | { province?: string; city?: string; district?: string; detail?: string }): string {
  if (typeof address === 'string') {
    return address
  }
  
  if (!address) return ''
  
  const { province, city, district, detail } = address
  const parts = [province, city, district, detail].filter(Boolean)
  return parts.join('')
}

/**
 * 格式化采购编号
 * @param code 采购编号或ID
 * @returns 格式化后的采购编号
 */
export function format_purchase_code(code: string | number): string {
  if (!code) return ''
  
  // 如果已经是格式化的编号，直接返回
  if (typeof code === 'string' && code.startsWith('P')) {
    return code
  }
  
  // 否则格式化为 P + 6位数字
  const numericCode = typeof code === 'string' ? parseInt(code) : code
  return `P${String(numericCode).padStart(6, '0')}`
}

// 格式化价格
export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined || isNaN(price)) {
    return '暂无价格'
  }
  return `¥${price.toFixed(2)}`
}

// 格式化采购日期显示（统一处理字段映射）
export const formatPurchaseDate = (item: any): string => {
  console.log('🔍 [采购日期格式化] 传入的item:', item, '类型:', typeof item)
  
  // 检查item是否为有效对象
  if (!item || typeof item !== 'object') {
    console.log('🔍 [采购日期格式化] item不是有效对象')
    return '暂无日期'
  }
  
  const dateValue = item.material_date || item.purchase_date
  console.log('🔍 [采购日期格式化] 原始值:', dateValue, '类型:', typeof dateValue)
  
  if (!dateValue || dateValue === 'null' || dateValue === 'undefined' || dateValue === null || dateValue === undefined) {
    console.log('🔍 [采购日期格式化] 日期为空或无效')
    return '暂无日期'
  }
  
  try {
    let date: Date
    
    // 处理不同的日期格式
    if (typeof dateValue === 'string') {
      // 如果是字符串，尝试多种格式
      if (dateValue.includes('T')) {
        // ISO格式：2024-01-01T00:00:00.000Z
        date = new Date(dateValue)
      } else if (dateValue.includes('-')) {
        // YYYY-MM-DD格式
        date = new Date(dateValue + 'T00:00:00.000Z')
      } else if (dateValue.includes('/')) {
        // MM/DD/YYYY或DD/MM/YYYY格式
        date = new Date(dateValue)
      } else {
        // 其他格式，直接尝试解析
        date = new Date(dateValue)
      }
    } else if (typeof dateValue === 'number') {
      // 时间戳
      date = new Date(dateValue)
    } else {
      // 其他类型，直接尝试转换
      date = new Date(dateValue)
    }
    
    console.log('🔍 [采购日期格式化] Date对象:', date, '是否有效:', !isNaN(date.getTime()))
    
    if (isNaN(date.getTime())) {
      console.warn('🔍 [采购日期格式化] 无法解析的日期格式:', dateValue)
      return '日期格式错误'
    }
    
    return date.toLocaleDateString('zh-CN')
  } catch (error) {
    console.error('🔍 [采购日期格式化] 日期解析错误:', error)
    return '日期解析失败'
  }
}