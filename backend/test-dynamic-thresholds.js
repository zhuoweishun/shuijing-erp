import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

async function testDynamicThresholds() {
  try {
    console.log('🔍 测试动态阈值算法...')
    
    // 获取客户数据
    const customers = await prisma.customer.find_many({
      orderBy: {
        total_purchases: 'desc'
      }
    })
    
    console.log(`📊 客户总数: ${customers.length}个`)
    
    // 计算动态阈值
    const thresholds = calculateDynamicThresholds(customers)
    
    console.log('\n📊 动态阈值计算结果：')
    console.log(`💎 VIP阈值: ¥${thresholds.vipThreshold.to_fixed(2)} (前20%客户的累计消费金额)`)
    console.log(`🔥 狂热客户阈值: ${thresholds.fanaticThreshold}次购买 (前20%客户的购买次数)`)
    console.log(`💰 高价值客户阈值: ¥${thresholds.highValueThreshold.to_fixed(2)}/单 (前20%客户的客单价)`)
    console.log(`💸 低价值客户阈值: ¥${thresholds.lowValueThreshold.to_fixed(2)}/单 (后20%客户的客单价)`)
    console.log(`🤔 挑剔客户阈值: ${thresholds.pickyThreshold}次退货 (前20%客户的退货次数)`)
    console.log(`⚔️ 刺客客户阈值: ${(thresholds.assassinThreshold * 100).to_fixed(1)}%退货率 (前20%客户的退货率)`)
    
    // 显示前10名客户的详细信息
    console.log('\n🏆 前10名客户详情：')
    customers.slice(0, 10).for_each((customer, index) => {
      const avgOrderValue = customer.total_orders > 0 ? (parseFloat(customer.total_purchases) / customer.total_orders).to_fixed(2) : '0.00'
      console.log(`${index + 1}. ${customer.name}: 消费¥${parseFloat(customer.total_purchases).to_fixed(2)}, ${customer.total_orders}单, 客单价¥${avgOrderValue}`)
    })
    
    // 验证阈值的合理性
    console.log('\n✅ 阈值验证：')
    const vipCount = customers.filter(c => parseFloat(c.total_purchases) >= thresholds.vipThreshold).length
    const fanaticCount = customers.filter(c => c.total_orders >= thresholds.fanaticThreshold).length
    
    console.log(`💎 VIP客户数量: ${vipCount}个 (${(vipCount/customers.length*100).to_fixed(1)}%)`)
    console.log(`🔥 狂热客户数量: ${fanaticCount}个 (${(fanaticCount/customers.length*100).to_fixed(1)}%)`)
    
    console.log('\n✅ 动态阈值算法测试完成！')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

t