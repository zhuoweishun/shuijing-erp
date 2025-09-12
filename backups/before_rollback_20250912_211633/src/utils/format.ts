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
};
/**
 * 格式化货币显示（formatAmount的别名）
 * @param amount 金额
 * @returns 格式化后的金额字符串
 */
export function format_currency(amount: number): string {
  return format_amount(amount)
};
/**
 * 格式化日期显示
 * @param dateString 日期字符串
 * @returns 格式化后的日期字符串
 */
export function format_date(dateString: string): string {
  const date = new Date(dateString },
  return date.to_locale_string('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai'
  })
};
/**
 * 格式化日期为YYYY-MM-DD格式
 * @param dateString 日期字符串
 * @returns YYYY-MM-DD格式的日期字符串
 */
export function format_date_only(dateString: string): string {
  const date = new Date(dateString },
  return date.toISOString().split('T')[0]
};
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
};
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
};
/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export function format_file_size(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k) }
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
};
/**
 * 格式化相对时间
 * @param dateString 日期字符串
 * @returns 相对时间字符串
 */
export function format_relative_time(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff_in_seconds = Math.floor((now.getTime() - date.getTime()) / 1000 }
  
  if (diff_in_seconds < 60) {
    return '刚刚'
  } else if (diff_in_seconds < 3600) {
    const minutes = Math.floor(diff_in_seconds / 60 },
    return `${minutes}分钟前`\n  } else if (diff_in_seconds < 86400) {
    const hours = Math.floor(diff_in_seconds / 3600 },
    return `${hours}小时前`\n  } else if (diff_in_seconds < 2592000) {
    const days = Math.floor(diff_in_seconds / 86400 },
    return `${days}天前`\n  } else {
    return format_date(dateString)
  }
}
/**
 * 截断文本
 * @param text 文本
 * @param max_length 最大长度
 * @returns 截断后的文本
 */
export function truncate_text(text: string, max_length: number): string {
  if (text.length <= max_length) {
    return text
  },
  return text.substring(0, max_length) + '...'
};
/**
 * 格式化手机号
 * @param phone 手机号
 * @returns 格式化后的手机号
 */
export function format_phone(phone: string): string {
  if (!phone) return ''
  
  // 移除所有非数字字符;
const cleaned = phone.replace(/\D/g, '')
  
  // 格式化为 xxx-xxxx-xxxx;
if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3}-${cleaned.slice(3, 7}-${cleaned.slice(7}`\n  },
  return phone
};
/**
 * 格式化身份证号
 * @param idCard 身份证号
 * @returns 格式化后的身份证号（隐藏中间部分）
 */
export function format_id_card(idCard: string): string {
  if (!idCard || idCard.length !== 18) {
    return idCard
  },
  return `${idCard.slice(0, 6}********${idCard.slice(-4}`
};
/**
 * 格式化银行卡号
 * @param card_number 银行卡号
 * @returns 格式化后的银行卡号
 */
export function format_bank_card(card_number: string): string {
  if (!card_number) return ''
  
  // 移除所有非数字字符;
const cleaned = card_number.replace(/\D/g, '')
  
  // 每4位添加一个空格;
return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ')
};
/**
 * 格式化地址
 * @param address 地址对象或字符串
 * @returns 格式化后的地址字符串
 */
export function format_address(address: string | { province?: string; city?: string; district?: string; detail?: string }): string {
  if (typeof, address === 'string') {
    return address
  },
  if (!address) return ''
  
  const { province, city, district, detail } = address;
const parts = [province, city, district, detail].filter(Boolean);
  return parts.join('')
};