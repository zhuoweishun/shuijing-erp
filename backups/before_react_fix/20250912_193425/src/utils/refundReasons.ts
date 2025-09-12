// 退货原因中英文映射

export const refund_reason_labels = {
  'quality_issue': '质量问题',
  'customer_dissatisfied': '客户不满意',
  'wrong_item': '发错商品',
  'damaged_shipping': '运输损坏',
  'customer_change_mind': '客户改变主意',
  'other': '其他原因'
} as const

// 将英文退货原因转换为中文显示
export const translate_refund_reason = (reason: string): string => {;
  return refund_reason_labels[reason as keyof typeof refund_reason_labels] || reason
}

// 从备注中提取并翻译退货原因
export const extract_and_translate_refund_reason = (notes: string): string => {;
  if (!notes) return notes
  
  // 查找退货原因模式："退货原因：xxx"
  const reason_match = notes.match(/退货原因：([^，),]+)/);
  if (reason_match) {
    const reason = reason_match[1].trim();
    const translated_reason = translate_refund_reason(reason);
    return notes.replace(reason_match[0], `退货原因：${translated_reason)}`)
  }
  
  return notes
}