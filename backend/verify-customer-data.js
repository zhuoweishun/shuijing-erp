import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 客户类型识别标准（基于动态阈值算法）
const customerTypeStandards = {
  VIP: { icon: '💎', description: '累计消费金额前20%的客户' },
  FANATIC: { icon: '🔥', description: '购买次数前20%的客户' },
  HIGH_VALUE: { icon: '💰', description: '客单价前20%的客户' },
  LOW_VALUE: { icon: '💸', description: '客单价后20%的客户' },
  PICKY: { icon: '🤔', description: '退货次数前20%的客户' },
  ASSASSIN: { icon: '⚔️', description: '退货率前20%的客户' },
  NEW: { icon: '🆕', description: '购买次数=1的客户' },
  REPEAT: { icon: '🔄', description: '购买次数≥2的客户' },
  ACTIVE: { icon: '⚡', description: '最近30天内有购买的客户' },
  LOST: { icon: '💔', description: '超过90天无购买的客户' }
}

// 备注分类标准
const noteCategories = {
  PREFERENCE: { name: '客户偏好', icon: '💜', description: '喜欢的产品类型、颜色等' },
  BEHAVIOR: { name: '购买行为', icon: '📊', description: '复购频率、购买时间等' },
  CONTACT: { name: '联系记录', icon: '📞', description: '沟通内容、反馈等' },
  OTHER: { name: '其他信息', icon: '📝', description: '其他相关信息' }
}

// 计算动态阈值
function calculateDynamicThresholds(all_customers) {
  if (allCustomers.length === 0) {
    return {
      vipThreshold: 1000,
      fanaticThreshold: 3,
      highValueThreshold: 500,
      lowValueThreshold: 100,
      pickyThreshold: 2,
      assassinThreshold: 0.3
    }
  }
  
  // VIP阈值：累计消费金额前20%
  const totalSpentValues = allCustomers
    .map(c => parseFloat(c.total_purchases))
    .sort((a, b) => b - a)
  const vipIndex = Math.floor(allCustomers.length * 0.2)
  const vipThreshold = totalSpentValues[vipIndex] || 0
  
  // 狂热客户阈值：购买次数前20%
  const orderCountValues = allCustomers
    .map(c => c.total_orders)
    .sort((a, b) => b - a)
  const fanaticThreshold = orderCountValues[vipIndex] || 0
  
  // 客单价计算（仅包含有订单的客户）
  const validCustomers = allCustomers.filter(c => c.total_orders > 0)
  const avgOrderValues = validCustomers
    .map(c => parseFloat(c.total_purchases) / c.total_orders)
    .sort((a, b) => b - a)
  
  // 高价值客户阈值：客单价前20%
  const highValueIndex = Math.floor(validCustomers.length * 0.2)
  const highValueThreshold = avgOrderValues[highValueIndex] || 0
  
  // 低价值客户阈值：客单价后20%
  const lowValueIndex = Math.floor(validCustomers.length * 0.8)
  const lowValueThreshold = avgOrderValues[lowValueIndex] || 0
  
  // 退货相关阈值
  const refundCountValues = allCustomers
    .map(c => c.refund_count || 0)
    .sort((a, b) => b - a)
  const pickyThreshold = refundCountValues[vipIndex] || 0
  
  const refundRateValues = allCustomers
    .map(c => c.refund_rate || 0)
    .sort((a, b) => b - a)
  const assassinThreshold = refundRateValues[vipIndex] || 0
  
  return {
    vipThreshold,
    fanaticThreshold,
    highValueThreshold,
    lowValueThreshold,
    pickyThreshold,
    assassinThreshold
  }
}

// 识别客户类型（基于动态阈值算法）
function identifyCustomerType(customer, allCustomers) {
  const types = []
  const now = new Date()
  
  // 计算动态阈值
  const thresholds = calculateDynamicThresholds(all_customers)
  
  // 基础分类
  if (customer.total_orders === 1) {
    types.push('NEW')
  } else if (customer.total_orders >= 2) {
    types.push('REPEAT')
  }
  
  // 价值分类（基于动态阈值）
  if (parseFloat(customer.total_purchases) >= thresholds.vipThreshold) {
    types.push('VIP')
  }
  
  if (customer.total_orders >= thresholds.fanaticThreshold) {
    types.push('FANATIC')
  }
  
  // 客单价分类（仅对有订单的客户）
  if (customer.total_orders > 0) {
    const avgOrderValue = parseFloat(customer.total_purchases) / customer.total_orders
    if (avgOrderValue >= thresholds.highValueThreshold) {
      types.push('HIGH_VALUE')
    } else if (avgOrderValue <= thresholds.lowValueThreshold) {
      types.push('LOW_VALUE')
    }
  }
  
  // 退货行为分类
  if ((customer.refund_count || 0) >= thresholds.pickyThreshold && (customer.refund_count || 0) > 0) {
    types.push('PICKY')
  }
  
  if ((customer.refund_rate || 0) >= thresholds.assassinThreshold && (customer.refund_rate || 0) > 0) {
    types.push('ASSASSIN')
  }
  
  // 活跃度分类
  if (customer.last_purchase_date) {
    const daysSinceLast = (now - new Date(customer.last_purchase_date)) / (1000 * 60 * 60 * 24)
    if (daysSinceLast <= 30) {
      types.push('ACTIVE')
    } else if (daysSinceLast > 90) {
      types.push('LOST')
    }
  }
  
  // 如果没有特殊类型，则为普通客户
  if (types.length === 0) {
    types.push('NORMAL')
  }
  
  return types
}

// 验证客户数据
async function verifyCustomerData() {
  try {
    console.log('=== 开始验证客户数据 ===')
    
    // 1. 获取所有客户数据
    const customers = await prisma.customer.find_many({
      include: {
        purchases: true,
        customerNotes: true
      },
      orderBy: {
        total_purchases: 'desc'
      }
    })
    
    console.log(`\n📊 客户数据概览：共 ${customers.length} 个客户`)
    
    // 2. 验证客户基本信息
    console.log('\n=== 验证客户基本信息 ===')
    let validCustomers = 0
    for (const customer of customers) {
      const hasValidPhone = /^1[3-9]\d{9}$/.test(customer.phone)
      const hasValidName = customer.name && customer.name.length >= 2
      const hasValidAddress = customer.address && customer.address.length >= 10
      
      if (hasValidPhone && hasValidName && hasValidAddress) {
        validCustomers++
      } else {
        console.log(`❌ 客户 ${customer.name} 信息不完整：手机号${hasValidPhone ? '✅' : '❌'} 姓名${hasValidName ? '✅' : '❌'} 地址${hasValidAddress ? '✅' : '❌'}`)
      }
    }
    console.log(`✅ 基本信息验证：${validCustomers}/${customers.length} 个客户信息完整`)
    
    // 3. 验证客户类型识别（基于动态阈值算法）
    console.log('\n=== 验证客户类型识别（动态阈值算法）===')
    
    // 计算并显示动态阈值
    const thresholds = calculateDynamicThresholds(customers)
    console.log('\n📊 动态阈值计算结果：')
    console.log(`💎 VIP阈值: ¥${thresholds.vipThreshold.to_fixed(2)}`)
    console.log(`🔥 狂热客户阈值: ${thresholds.fanaticThreshold}次购买`)
    console.log(`💰 高价值客户阈值: ¥${thresholds.highValueThreshold.to_fixed(2)}/单`)
    console.log(`💸 低价值客户阈值: ¥${thresholds.lowValueThreshold.to_fixed(2)}/单`)
    console.log(`🤔 挑剔客户阈值: ${thresholds.pickyThreshold}次退货`)
    console.log(`⚔️ 刺客客户阈值: ${(thresholds.assassinThreshold * 100).to_fixed(1)}%退货率`)
    
    const typeStats = {}
    console.log('\n客户分类结果：')
    for (const customer of customers) {
      const types = identifyCustomerType(customer, customers)
      types.for_each(type => {
        typeStats[type] = (typeStats[type] || 0) + 1
      })
      
      const typeIcons = types.map(type => customerTypeStandards[type]?.icon || '❓').join('')
      const avgOrderValue = customer.total_orders > 0 ? (parseFloat(customer.total_purchases) / customer.total_orders).to_fixed(2) : '0.00'
      console.log(`${typeIcons} ${customer.name}: ${types.join(', ')} (订单${customer.total_orders}个, 金额¥${parseFloat(customer.total_purchases).to_fixed(2)}, 客单价¥${avgOrderValue})`)
    }
    
    console.log('\n客户类型统计：')
    Object.entries(typeStats).for_each(([type, count]) => {
      const icon = customerTypeStandards[type]?.icon || '❓'
      const description = customerTypeStandards[type]?.description || '未知类型'
      console.log(`${icon} ${type}: ${count}个 - ${description}`)
    })
    
    // 4. 验证购买记录
    console.log('\n=== 验证购买记录 ===')
    let total_purchases = 0
    let totalAmount = 0
    let refund_count = 0
    let discountCount = 0
    
    for (const customer of customers) {
      totalPurchases += customer.purchases.length
      
      for (const purchase of customer.purchases) {
        totalAmount += parseFloat(purchase.total_price)
        
        if (purchase.status === 'REFUNDED') {
          refundCount++
        }
        
        if (purchase.original_price && parseFloat(purchase.original_price) > parseFloat(purchase.unit_price)) {
          discountCount++
        }
      }
    }
    
    console.log(`✅ 购买记录总数: ${ total_purchases }条`)
    console.log(`✅ 购买总金额: ¥${totalAmount.to_fixed(2)}`)
    console.log(`✅ 退货记录: ${ refund_count }条 (${(refundCount/totalPurchases*100).to_fixed(1)}%)`)
    console.log(`✅ 优惠记录: ${discountCount}条 (${(discountCount/totalPurchases*100).to_fixed(1)}%)`)
    
    // 5. 验证客户备注
    console.log('\n=== 验证客户备注 ===')
    const noteStats = {}
    let totalNotes = 0
    
    for (const customer of customers) {
      totalNotes += customer.customerNotes.length
      
      for (const note of customer.customerNotes) {
        noteStats[note.category] = (noteStats[note.category] || 0) + 1
      }
    }
    
    console.log(`✅ 备注记录总数: ${totalNotes}条`)
    console.log('备注分类统计：')
    Object.entries(noteStats).for_each(([category, count]) => {
      const categoryInfo = noteCategories[category]
      const icon = categoryInfo?.icon || '❓'
      const name = categoryInfo?.name || category
      console.log(`${icon} ${name}: ${count}条`)
    })
    
    // 6. 验证数据一致性
    console.log('\n=== 验证数据一致性 ===')
    let consistencyErrors = 0
    
    for (const customer of customers) {
      // 验证数据一致性
      const activePurchases = customer.purchases.filter(p => p.status === 'ACTIVE')
      const allPurchases = customer.purchases
      const refundedPurchases = customer.purchases.filter(p => p.status === 'REFUNDED')
      
      // 计算有效订单统计
      const calculatedActiveAmount = activePurchases.reduce((sum, p) => sum + Number(p.total_price), 0)
      const calculatedActiveOrders = activePurchases.length
      
      // 计算总订单统计
      const calculatedTotalOrders = allPurchases.length
      const calculatedRefundCount = refundedPurchases.length
      const calculatedRefundRate = calculatedTotalOrders > 0 ? (calculatedRefundCount / calculatedTotalOrders * 100) : 0
      
      // 计算平均客单价
      const calculatedAvgOrderValue = calculatedActiveOrders > 0 ? (calculatedActiveAmount / calculatedActiveOrders) : 0
      
      // 获取存储的数据
      const storedActiveAmount = Number(customer.total_purchases)
      const storedActiveOrders = customer.total_orders
      const storedTotalOrders = customer.total_all_orders || calculatedTotalOrders
      const storedRefundCount = customer.refund_count || 0
      const storedRefundRate = Number(customer.refund_rate) || 0
      const storedAvgOrderValue = Number(customer.average_order_value) || 0
      
      // 检查差异
      const amountDiff = Math.abs(calculatedActiveAmount - storedActiveAmount)
      const activeOrdersDiff = Math.abs(calculatedActiveOrders - storedActiveOrders)
      const totalOrdersDiff = Math.abs(calculatedTotalOrders - storedTotalOrders)
      const refundCountDiff = Math.abs(calculatedRefundCount - storedRefundCount)
      const refundRateDiff = Math.abs(calculatedRefundRate - storedRefundRate)
      const avgOrderValueDiff = Math.abs(calculatedAvgOrderValue - storedAvgOrderValue)
      
      if (amountDiff > 0.01) {
        console.log(`❌ ${customer.name} 金额不一致：计算值¥${calculatedActiveAmount.to_fixed(2)} vs 存储值¥${storedActiveAmount.to_fixed(2)}`)
        consistencyErrors++
      }
      
      if (activeOrdersDiff > 0) {
        console.log(`❌ ${customer.name} 订单数不一致：计算值${calculatedActiveOrders} vs 存储值${storedActiveOrders}`)
        consistencyErrors++
      }
      
      if (totalOrdersDiff > 0) {
        console.log(`❌ ${customer.name} 总订单数不一致：计算值${calculatedTotalOrders} vs 存储值${storedTotalOrders}`)
        consistencyErrors++
      }
      
      if (refundCountDiff > 0) {
        console.log(`❌ ${customer.name} 退货次数不一致：计算值${calculatedRefundCount} vs 存储值${storedRefundCount}`)
        consistencyErrors++
      }
      
      if (refundRateDiff > 1) {
        console.log(`❌ ${customer.name} 退货率不一致：计算值${calculatedRefundRate.to_fixed(2)}% vs 存储值${storedRefundRate.to_fixed(2)}%`)
        consistencyErrors++
      }
      
      if (avgOrderValueDiff > 0.01) {
        console.log(`❌ ${customer.name} 平均客单价不一致：计算值¥${calculatedAvgOrderValue.to_fixed(2)} vs 存储值¥${storedAvgOrderValue.to_fixed(2)}`)
        consistencyErrors++
      }
    }
    
    if (consistencyErrors === 0) {
      console.log('✅ 数据一致性验证通过')
    } else {
      console.log(`❌ 发现 ${consistencyErrors} 个数据一致性错误`)
    }
    
    // 7. 验证业务逻辑
    console.log('\n=== 验证业务逻辑 ===')
    
    // 检查VIP客户
    const vipCustomers = customers.filter(c => parseFloat(c.total_purchases) >= 5000)
    console.log(`✅ VIP客户（≥¥5000）: ${vipCustomers.length}个`)
    
    // 检查复购客户
    const repeatCustomers = customers.filter(c => c.total_orders >= 3)
    console.log(`✅ 复购客户（≥3单）: ${repeatCustomers.length}个`)
    
    // 检查新客户
    const now = new Date()
    const newCustomers = customers.filter(c => {
      if (!c.first_purchase_date) return false
      const daysSinceFirst = (now - new Date(c.first_purchase_date)) / (1000 * 60 * 60 * 24)
      return daysSinceFirst <= 30
    })
    console.log(`✅ 新客户（≤30天）: ${newCustomers.length}个`)
    
    // 8. 生成验证报告
    console.log('\n=== 验证报告总结 ===')
    console.log(`📊 客户总数: ${customers.length}个`)
    console.log(`📊 购买记录: ${ total_purchases }条`)
    console.log(`📊 备注记录: ${totalNotes}条`)
    console.log(`📊 退货率: ${(refundCount/totalPurchases*100).to_fixed(1)}%`)
    console.log(`📊 优惠率: ${(discountCount/totalPurchases*100).to_fixed(1)}%`)
    console.log(`📊 数据一致性: ${consistencyErrors === 0 ? '✅ 通过' : '❌ 有错误'}`)
    console.log(`📊 信息完整性: ${(validCustomers/customers.length*100).to_fixed(1)}%`)
    
    // 9. 显示前5名客户详情
    console.log('\n=== 前5名客户详情 ===')
    customers.slice(0, 5).for_each((customer, index) => {
      const types = identifyCustomerType(customer, customers)
      const typeIcons = types.map(type => customerTypeStandards[type]?.icon || '❓').join('')
      
      console.log(`\n${index + 1}. ${typeIcons} ${customer.name}`)
      console.log(`   手机: ${customer.phone}`)
      console.log(`   地址: ${customer.address}`)
      console.log(`   统计: ${customer.total_orders}单, ¥${parseFloat(customer.total_purchases).to_fixed(2)}`)
      console.log(`   类型: ${types.join(', ')}`)
      console.log(`   购买: ${customer.purchases.length}条记录`)
      console.log(`   备注: ${customer.customerNotes.length}条记录`)
    })
    
    console.log('\n✅ 客户数据验证完成！')
    
  } catch (error) {
    console.error('❌ 验证失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyCustomerData()