// 测试所有客户标签的动态计算
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAllCustomerLabels() {
  try {
    console.log('🧪 测试所有客户标签的动态计算...')
    
    // 获取所有客户数据
    const customers = await prisma.customer.find_many({
      include: {
        purchases: {
          select: {
            id: true,
            status: true
          }
        }
      }
    })
    
    console.log(`\n📊 总客户数: ${customers.length}`)
    
    // 计算客户统计数据
    const customersWithStats = customers.map(customer => {
      const total_all_orders = customer.purchases.length
      const totalActiveOrders = customer.purchases.filter(p => p.status === 'ACTIVE').length
      const totalRefundedOrders = customer.purchases.filter(p => p.status === 'REFUNDED').length
      const refund_rate = totalAllOrders > 0 ? (totalRefundedOrders / totalAllOrders) * 100 : 0
      
      return {
        ...customer,
        total_purchases: Number(customer.total_purchases) || 0,
        total_orders: totalActiveOrders,
        total_all_orders: totalAllOrders,
        refund_count: totalRefundedOrders,
        refund_rate: refundRate,
        last_purchase_date: customer.last_purchase_date?.to_i_s_o_string(),
        first_purchase_date: customer.first_purchase_date?.to_i_s_o_string()
      }
    })
    
    // 客户标签计算函数（与前端保持一致）
    function getCustomerLabels(customer, allCustomers = []) {
      const labels = []
      
      // 购买行为维度判断（基于动态阈值）
      const calculateBehaviorThresholds = () => {
        if (allCustomers.length === 0) {
          return { newThreshold: 1, repeatThreshold: 2 }
        }
        
        const newThreshold = 1
        const repeatThreshold = 2
        
        return { newThreshold, repeatThreshold }
      }
      
      const behaviorThresholds = calculateBehaviorThresholds()
      
      if (customer.total_orders === behaviorThresholds.newThreshold) {
        labels.push('NEW')
      } else if (customer.total_orders >= behaviorThresholds.repeatThreshold) {
        labels.push('REPEAT')
      }
      
      // 计算动态阈值（基于所有客户数据）
      const calculateThresholds = () => {
        if (allCustomers.length === 0) {
          return {
            vipThreshold: 5000,
            fanaticThreshold: 10,
            highValueThreshold: 1000,
            lowValueThreshold: 200
          }
        }
        
        // VIP阈值
        const total_purchases = allCustomers.map(c => c.total_purchases).sort((a, b) => b - a)
        const vipIndex = Math.floor(totalPurchases.length * 0.2)
        const vipThreshold = totalPurchases[vipIndex] || 5000
        
        // 狂热客户阈值
        const total_orders = allCustomers.map(c => c.total_orders).sort((a, b) => b - a)
        const fanaticIndex = Math.floor(totalOrders.length * 0.2)
        const fanaticThreshold = totalOrders[fanaticIndex] || 10
        
        // 客单价阈值
        const avgOrderValues = allCustomers
          .filter(c => c.total_orders > 0)
          .map(c => c.total_purchases / c.total_orders)
          .sort((a, b) => b - a)
        
        const highValueIndex = Math.floor(avgOrderValues.length * 0.2)
        const lowValueIndex = Math.floor(avgOrderValues.length * 0.8)
        const highValueThreshold = avgOrderValues[highValueIndex] || 1000
        const lowValueThreshold = avgOrderValues[lowValueIndex] || 200
        
        return {
          vipThreshold,
          fanaticThreshold,
          highValueThreshold,
          lowValueThreshold
        }
      }
      
      const thresholds = calculateThresholds()
      
      // VIP判断
      if (customer.total_purchases >= thresholds.vipThreshold) {
        labels.push('VIP')
      }
      
      // 狂热客户判断
      if (customer.total_orders >= thresholds.fanaticThreshold) {
        labels.push('FANATIC')
      }
      
      // 消费偏好判断
      if (customer.total_orders > 0) {
        const avgOrderValue = customer.total_purchases / customer.total_orders
        if (avgOrderValue >= thresholds.highValueThreshold) {
          labels.push('HIGH_VALUE')
        } else if (avgOrderValue <= thresholds.lowValueThreshold) {
          labels.push('LOW_VALUE')
        }
      }
      
      // 活跃度维度判断（基于动态阈值）
      const calculateActivityThresholds = () => {
        if (allCustomers.length === 0) {
          return {
            decliningThreshold: 31,
            coolingThreshold: 91,
            silentThreshold: 181,
            lostThreshold: 366
          }
        }
        
        const now = new Date()
        const daysSinceLastPurchases = allCustomers
          .filter(c => c.last_purchase_date)
          .map(c => {
            const lastPurchase = new Date(c.last_purchase_date)
            return Math.floor((now.get_time() - lastPurchase.get_time()) / (1000 * 60 * 60 * 24))
          })
          .sort((a, b) => a - b)
        
        if (daysSinceLastPurchases.length === 0) {
          return {
            decliningThreshold: 31,
            coolingThreshold: 91,
            silentThreshold: 181,
            lostThreshold: 366
          }
        }
        
        const q1Index = Math.floor(daysSinceLastPurchases.length * 0.25)
        const q2Index = Math.floor(daysSinceLastPurchases.length * 0.5)
        const q3Index = Math.floor(daysSinceLastPurchases.length * 0.75)
        
        const decliningThreshold = daysSinceLastPurchases[q1Index] || 31
        const coolingThreshold = daysSinceLastPurchases[q2Index] || 91
        const silentThreshold = daysSinceLastPurchases[q3Index] || 181
        const lostThreshold = Math.max(silentThreshold + 30, 366)
        
        return {
          decliningThreshold,
          coolingThreshold,
          silentThreshold,
          lostThreshold
        }
      }
      
      if (customer.last_purchase_date) {
        const lastPurchase = new Date(customer.last_purchase_date)
        const now = new Date()
        const daysSinceLastPurchase = Math.floor((now.get_time() - lastPurchase.get_time()) / (1000 * 60 * 60 * 24))
        
        const activityThresholds = calculateActivityThresholds()
        
        if (daysSinceLastPurchase >= activityThresholds.decliningThreshold && daysSinceLastPurchase < activityThresholds.coolingThreshold) {
          labels.push('DECLINING')
        } else if (daysSinceLastPurchase >= activityThresholds.coolingThreshold && daysSinceLastPurchase < activityThresholds.silentThreshold) {
          labels.push('COOLING')
        } else if (daysSinceLastPurchase >= activityThresholds.silentThreshold && daysSinceLastPurchase < activityThresholds.lostThreshold) {
          labels.push('SILENT')
        } else if (daysSinceLastPurchase >= activityThresholds.lostThreshold) {
          labels.push('LOST')
        }
      }
      
      // 退货行为判断
      const calculateRefundThresholds = () => {
        if (allCustomers.length === 0) {
          return { pickyThreshold: 5, assassinThreshold: 30 }
        }
        
        const refundCounts = allCustomers
          .map(c => c.refund_count || 0)
          .sort((a, b) => b - a)
        const pickyIndex = Math.floor(refundCounts.length * 0.2)
        const pickyThreshold = refundCounts[pickyIndex] || 1
        
        const refundRates = allCustomers
          .filter(c => (c.refund_rate || 0) > 0)
          .map(c => c.refund_rate || 0)
          .sort((a, b) => b - a)
        const assassinIndex = Math.floor(refundRates.length * 0.2)
        const assassinThreshold = refundRates[assassinIndex] || 20
        
        return { pickyThreshold, assassinThreshold }
      }
      
      const refundThresholds = calculateRefundThresholds()
      
      if (customer.refund_count && customer.refund_count >= refundThresholds.pickyThreshold) {
        labels.push('PICKY')
      }
      if (customer.refund_rate && customer.refund_rate >= refundThresholds.assassinThreshold) {
        labels.push('ASSASSIN')
      }
      
      return labels
    }
    
    // 计算所有阈值
    console.log('\n🎯 动态阈值计算结果:')
    
    // VIP阈值
    const total_purchases = customersWithStats.map(c => c.total_purchases).sort((a, b) => b - a)
    const vipIndex = Math.floor(totalPurchases.length * 0.2)
    const vipThreshold = totalPurchases[vipIndex] || 5000
    console.log(`VIP阈值（累计消费前20%）: ¥${vipThreshold}`)
    
    // 狂热客户阈值
    const total_orders = customersWithStats.map(c => c.total_orders).sort((a, b) => b - a)
    const fanaticIndex = Math.floor(totalOrders.length * 0.2)
    const fanaticThreshold = totalOrders[fanaticIndex] || 10
    console.log(`狂热客户阈值（购买次数前20%）: ${fanaticThreshold}次`)
    
    // 客单价阈值
    const avgOrderValues = customersWithStats
      .filter(c => c.total_orders > 0)
      .map(c => c.total_purchases / c.total_orders)
      .sort((a, b) => b - a)
    
    const highValueIndex = Math.floor(avgOrderValues.length * 0.2)
    const lowValueIndex = Math.floor(avgOrderValues.length * 0.8)
    const highValueThreshold = avgOrderValues[highValueIndex] || 1000
    const lowValueThreshold = avgOrderValues[lowValueIndex] || 200
    console.log(`高客阈值（客单价前20%）: ¥${highValueThreshold.to_fixed(2)}`)
    console.log(`低客阈值（客单价后20%）: ¥${lowValueThreshold.to_fixed(2)}`)
    
    // 退货阈值
    const refundCounts = customersWithStats.map(c => c.refund_count || 0).sort((a, b) => b - a)
    const pickyIndex = Math.floor(refundCounts.length * 0.2)
    const pickyThreshold = refundCounts[pickyIndex] || 1
    console.log(`挑剔客户阈值（退货次数前20%）: ${pickyThreshold}次`)
    
    // 活跃度阈值
    const now = new Date()
    const daysSinceLastPurchases = customersWithStats
      .filter(c => c.last_purchase_date)
      .map(c => {
        const lastPurchase = new Date(c.last_purchase_date)
        return Math.floor((now.get_time() - lastPurchase.get_time()) / (1000 * 60 * 60 * 24))
      })
      .sort((a, b) => a - b)
    
    if (daysSinceLastPurchases.length > 0) {
      const q1Index = Math.floor(daysSinceLastPurchases.length * 0.25)
      const q2Index = Math.floor(daysSinceLastPurchases.length * 0.5)
      const q3Index = Math.floor(daysSinceLastPurchases.length * 0.75)
      
      const decliningThreshold = daysSinceLastPurchases[q1Index] || 31
      const coolingThreshold = daysSinceLastPurchases[q2Index] || 91
      const silentThreshold = daysSinceLastPurchases[q3Index] || 181
      
      console.log(`活跃度阈值: 渐退${decliningThreshold}天, 冷静${coolingThreshold}天, 沉默${silentThreshold}天`)
    }
    
    // 统计各类标签的客户数量
    console.log('\n📊 标签分布统计:')
    const labelCounts = {}
    
    customersWithStats.for_each(customer => {
      const labels = getCustomerLabels(customer, customersWithStats)
      labels.for_each(label => {
        labelCounts[label] = (labelCounts[label] || 0) + 1
      })
    })
    
    Object.entries(labelCounts).for_each(([label, count]) => {
      const percentage = ((count / customersWithStats.length) * 100).to_fixed(1)
      console.log(`${label}: ${count}个客户 (${percentage}%)`)
    })
    
    // 显示有挑剔标签的客户
    console.log('\n🔍 挑剔客户详情:')
    const pickyCustomers = customersWithStats.filter(customer => {
      const labels = getCustomerLabels(customer, customersWithStats)
      return labels.includes('PICKY')
    })
    
    if (pickyCustomers.length > 0) {
      pickyCustomers.for_each(customer => {
        console.log(`- ${customer.name}: ${customer.refund_count}次退货 / ${customer.total_all_orders}总订单 = ${customer.refund_rate.to_fixed(1)}%退货率`)
      })
    } else {
      console.log('没有客户被标记为挑剔')
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAllCustomerLabels()