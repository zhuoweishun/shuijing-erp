/**
 * 客户标签计算脚本
 * 根据客户统计数据自动生成和更新客户标签
 * 创建时间: 2025-01-06
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 客户标签定义
 */
const CUSTOMER_LABELS = {
  VIP: 'VIP',
  HIGH_VALUE: 'HIGH_VALUE',
  REPEAT: 'REPEAT',
  NEW: 'NEW',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  HIGH_REFUND: 'HIGH_REFUND',
  LOYAL: 'LOYAL'
}

/**
 * 计算客户标签
 * @param {Object} customer 客户数据
 * @param {Object} thresholds 动态阈值
 * @returns {Array} 客户标签数组
 */
function calculateCustomerLabels(customer, thresholds) {
  const labels = []
  
  // VIP客户判断（消费金额 >= VIP阈值）
  if (customer.total_purchases >= thresholds.vipThreshold) {
    labels.push(CUSTOMER_LABELS.VIP)
  }
  
  // 高价值客户判断（消费金额 >= 高价值阈值）
  if (customer.total_purchases >= thresholds.highValueThreshold) {
    labels.push(CUSTOMER_LABELS.HIGH_VALUE)
  }
  
  // 复购客户判断（有效订单数 >= 2）
  if (customer.total_orders >= 2) {
    labels.push(CUSTOMER_LABELS.REPEAT)
  }
  
  // 新客户判断（首次购买 <= 30天）
  if (customer.daysSinceFirstPurchase <= 30) {
    labels.push(CUSTOMER_LABELS.NEW)
  }
  
  // 活跃客户判断（最近购买 <= 90天）
  if (customer.daysSinceLastPurchase <= 90) {
    labels.push(CUSTOMER_LABELS.ACTIVE)
  } else if (customer.daysSinceLastPurchase > 180) {
    // 不活跃客户判断（最近购买 > 180天）
    labels.push(CUSTOMER_LABELS.INACTIVE)
  }
  
  // 高退货率客户判断（退货率 >= 30%）
  if (customer.refund_rate >= 30) {
    labels.push(CUSTOMER_LABELS.HIGH_REFUND)
  }
  
  // 忠诚客户判断（购买时间跨度 >= 365天 且 订单数 >= 5）
  if (customer.daysSinceFirstPurchase >= 365 && customer.total_orders >= 5) {
    labels.push(CUSTOMER_LABELS.LOYAL)
  }
  
  return labels
}

/**
 * 确定主要标签
 * @param {Array} labels 标签数组
 * @returns {String} 主要标签
 */
function determinePrimaryLabel(labels) {
  // 标签优先级（从高到低）
  const priority = [
    CUSTOMER_LABELS.VIP,
    CUSTOMER_LABELS.HIGH_VALUE,
    CUSTOMER_LABELS.LOYAL,
    CUSTOMER_LABELS.REPEAT,
    CUSTOMER_LABELS.ACTIVE,
    CUSTOMER_LABELS.NEW,
    CUSTOMER_LABELS.HIGH_REFUND,
    CUSTOMER_LABELS.INACTIVE
  ]
  
  for (const label of priority) {
    if (labels.includes(label)) {
      return label
    }
  }
  
  return null
}

/**
 * 计算动态阈值
 * @returns {Object} 阈值对象
 */
async function calculateDynamicThresholds() {
  console.log('📊 计算动态阈值...')
  
  // 获取所有有购买记录的客户
  const customers = await prisma.customer.find_many({
    where: {
      total_orders: { gt: 0 }
    },
    select: {
      total_purchases: true
    },
    orderBy: {
      total_purchases: 'desc'
    }
  })
  
  if (customers.length === 0) {
    console.log('⚠️ 没有找到有购买记录的客户')
    return {
      vipThreshold: 5000,
      highValueThreshold: 2000
    }
  }
  
  const total_purchases = customers.map(c => Number(c.total_purchases))
  
  // 计算分位数
  const top20Index = Math.floor(totalPurchases.length * 0.2)
  const top40Index = Math.floor(totalPurchases.length * 0.4)
  
  const vipThreshold = totalPurchases[top20Index] || 5000
  const highValueThreshold = totalPurchases[top40Index] || 2000
  
  console.log(`📈 动态阈值计算完成:`, {
    客户总数: customers.length,
    VIP阈值: vipThreshold,
    高价值阈值: highValueThreshold
  })
  
  return {
    vipThreshold,
    highValueThreshold
  }
}

/**
 * 更新所有客户标签
 */
async function updateAllCustomerLabels() {
  try {
    console.log('🏷️ 开始更新客户标签...')
    
    // 计算动态阈值
    const thresholds = await calculateDynamicThresholds()
    
    // 获取所有客户数据
    const customers = await prisma.customer.find_many({
      select: {
        id: true,
        name: true,
        total_purchases: true,
        total_orders: true,
        total_all_orders: true,
        refund_count: true,
        refund_rate: true,
        averageOrderValue: true,
        daysSinceLastPurchase: true,
        daysSinceFirstPurchase: true
      }
    })
    
    console.log(`📋 找到 ${customers.length} 个客户，开始计算标签...`)
    
    let updatedCount = 0
    
    for (const customer of customers) {
      // 计算客户标签
      const labels = calculateCustomerLabels(customer, thresholds)
      const primaryLabel = determinePrimaryLabel(labels)
      
      // 更新客户标签
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          customerLabels: labels,
          primaryLabel: primaryLabel
        }
      })
      
      updatedCount++
      
      if (updatedCount % 50 === 0) {
        console.log(`✅ 已更新 ${updatedCount}/${customers.length} 个客户标签`)
      }
    }
    
    console.log(`🎉 客户标签更新完成！共更新 ${updatedCount} 个客户`)
    
    // 显示标签统计
    await showLabelStatistics()
    
  } catch (error) {
    console.error('❌ 更新客户标签时发生错误:', error)
  }
}

/**
 * 显示标签统计
 */
async function showLabelStatistics() {
  console.log('\n📊 客户标签统计:')
  
  // 按主要标签统计
  const labelStats = await prisma.customer.group_by({
    by: ['primaryLabel'],
    Count: {
      id: true
    },
    where: {
      primaryLabel: { not: null }
    },
    orderBy: {
      Count: {
        id: 'desc'
      }
    }
  })
  
  console.log('\n主要标签分布:')
  labelStats.for_each(stat => {
    console.log(`  ${stat.primaryLabel}: ${stat.Count.id} 人`)
  })
  
  // 显示各城市的客户分布
  const city_stats = await prisma.customer.group_by({
    by: ['city'],
    Count: {
      id: true
    },
    Sum: {
      total_purchases: true
    },
    where: {
      city: { not: null },
      total_orders: { gt: 0 }
    },
    orderBy: {
      Count: {
        id: 'desc'
      }
    },
    take: 10
  })
  
  console.log('\n城市分布 (前10名):')
  cityStats.for_each(stat => {
    console.log(`  ${stat.city}: ${stat.Count.id} 人，总消费 ¥${Number(stat.Sum.total_purchases || 0).to_fixed(2)}`)
  })
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 客户标签计算脚本启动')
  console.log('时间:', new Date().to_locale_string())
  console.log('=' .repeat(50))
  
  await updateAllCustomerLabels()
  
  console.log('\n' + '='.repeat(50))
  console.log('✨ 客户标签计算脚本执行完成')
}

// 执行脚本
main()
  .catch(error => {
    console.error('💥 脚本执行失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })