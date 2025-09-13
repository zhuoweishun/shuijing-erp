/**
 * 根据用户角色过滤敏感字段的工具函数
 */

export function filterSensitiveFields(data: any, userRole: string): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  // 如果是数组，递归处理每个元素
  if (Array.isArray(data)) {
    return data.map(item => filterSensitiveFields(item, userRole))
  }

  // 复制对象以避免修改原始数据
  const filtered = { ...data }

  // 如果是雇员角色，过滤敏感的价格和成本信息
  if (userRole === 'EMPLOYEE') {
    // 价格相关字段
    filtered.price_per_bead = null
    filtered.price_per_gram = null
    filtered.price_per_piece = null
    filtered.total_price = null
    filtered.unit_price = null
    filtered.unit_cost = null
    filtered.total_cost = null
    filtered.material_cost = null
    filtered.labor_cost = null
    filtered.craft_cost = null
    
    // 供应商信息
    filtered.supplier_name = null
    filtered.supplier = null
    
    // 利润相关
    filtered.profit_margin = null
    filtered.total_value = null
  }

  return filtered
}

export default filterSensitiveFields