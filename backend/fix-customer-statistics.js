// 修复客户统计数据的脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixCustomerStatistics() {
  try {
    console.log('🔧 开始修复客户统计数据...')
    
    // 获取所有客户数据
    const customers = await prisma.customer.find_many({
      include: {
        purchases: true
      }
    })
    
    console.log(`📊 找到 ${customers.length} 个客户，开始重新计算统计数据...`)
    
    let fixedCount = 0
    let errorCount = 0
    
    for (const customer of customers) {
      try {
        // 重新计算统计数据
        const activePurchases = customer.purchases.filter(p => p.status === 'ACTIVE')
        const allPurchases = customer.purchases
        const refundedPurchases = customer.purchases.filter(p => p.status === 'REFUNDED')
        
        // 基础统计
        const newTotalPurchases = activePurchases.reduce((sum, p) => sum + Number(p.total_price), 0)
        const newTotalOrders = activePurchases.length
        const newTotalAllOrders = allPurchases.length
        
        // 退货统计
        const newRefundCount = refundedPurchases.length
        const newRefundRate = newTotalAllOrders > 0 ? (newRefundCount / newTotalAllOrders * 100) : 0
        
        // 客户价值分析
        const newAverageOrderValue = newTotalOrders > 0 ? (newTotalPurchases / newTotalOrders) : 0
        
        // 计算首次和最后购买日期
        const purchaseDates = activePurchases.map(p => new Date(p.purchase_date)).sort((a, b) => a - b)
        const newFirstPurchaseDate = purchaseDates.length > 0 ? purchaseDates[0] : null
        const newLastPurchaseDate = purchaseDates.length > 0 ? purchaseDates[purchaseDates.length - 1] : null
        
        // 计算天数差
        const now = new Date()
        const newDaysSinceLastPurchase = newLastPurchaseDate ? Math.floor((now - newLastPurchaseDate) / (1000 * 60 * 60 * 24)) : null
        const newDaysSinceFirstPurchase = newFirstPurchaseDate ? Math.floor((now - newFirstPurchaseDate) / (1000 * 60 * 60 * 24)) : null
        
        // 检查是否需要更新
        const needsUpdate = 
          Math.abs(Number(customer.total_purchases) - newTotalPurchases) > 0.01 ||
          customer.total_orders !== newTotalOrders ||
          (customer.total_all_orders || 0) !== newTotalAllOrders ||
          (customer.refund_count || 0) !== newRefundCount ||
          Math.abs(Number(customer.refund_rate || 0) - newRefundRate) > 0.01 ||
          Math.abs(Number(customer.averageOrderValue || 0) - newAverageOrderValue) > 0.01 ||
          (customer.daysSinceLastPurchase !== newDaysSinceLastPurchase) ||
          (customer.daysSinceFirstPurchase !== newDaysSinceFirstPurchase) ||
          (customer.first_purchase_date?.get_time() !== newFirstPurchaseDate?.get_time()) ||
          (customer.last_purchase_date?.get_time() !== newLastPurchaseDate?.get_time())
        
        if (needsUpdate) {
          console.log(`🔄 修复客户 ${customer.name}:`)
          console.log(`   金额: ¥${Number(customer.total_purchases).to_fixed(2)} → ¥${newTotalPurchases.to_fixed(2)}`)
          console.log(`   有效订单: ${customer.total_orders} → ${newTotalOrders}`)
          console.log(`   总订单: ${customer.total_all_orders || 0} → ${newTotalAllOrders}`)
          console.log(`   退货次数: ${customer.refund_count || 0} → ${newRefundCount}`)
          console.log(`   退货率: ${Number(customer.refund_rate || 0).to_fixed(2)}% → ${newRefundRate.to_fixed(2)}%`)
          console.log(`   客单价: ¥${Number(customer.averageOrderValue || 0).to_fixed(2)} → ¥${newAverageOrderValue.to_fixed(2)}`)
          
          // 更新客户统计数据
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              total_purchases: newTotalPurchases,
              total_orders: newTotalOrders,
              total_all_orders: newTotalAllOrders,
              refund_count: newRefundCount,
              refund_rate: newRefundRate,
              averageOrderValue: newAverageOrderValue,
              daysSinceLastPurchase: newDaysSinceLastPurchase,
              daysSinceFirstPurchase: newDaysSinceFirstPurchase,
              first_purchase_date: newFirstPurchaseDate,
              last_purchase_date: newLastPurchaseDate
            }
          })
          
          fixedCount++
        }
        
      } catch (error) {
        console.error(`❌ 修复客户 ${customer.name} 时出错:`, error.message)
        errorCount++
      }
    }
    
    console.log('\n=== 修复完成 ===')
    console.log(`✅ 成功修复: ${fixedCount} 个客户`)
    console.log(`❌ 修复失败: ${errorCount} 个客户`)
    console.log(`📊 无需修复: ${customers.length - fixedCount - errorCount} 个客户`)
    
    // 验证修复结果
    console.log('\n🔍 验证修复结果...')
    await verifyFixedData()
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 验证修复后的数据
async function verifyFixedData() {
  try {
    const customers = await prisma.customer.find_many({
      include: {
        purchases: true
      }
    })
    
    let consistencyErrors = 0
    
    for (const customer of customers) {
      // 验证累计金额
      const calculatedAmount = customer.purchases
        .filter(p => p.status === 'ACTIVE')
        .reduce((sum, p) => sum + parseFloat(p.total_price), 0)
      const storedAmount = parseFloat(customer.total_purchases)
      
      if (Math.abs(calculatedAmount - storedAmount) > 0.01) {
        console.log(`❌ ${customer.name} 金额仍不一致：计算值¥${calculatedAmount.to_fixed(2)} vs 存储值¥${storedAmount.to_fixed(2)}`)
        consistencyErrors++
      }
      
      // 验证订单数量
      const calculatedOrders = customer.purchases.filter(p => p.status === 'ACTIVE').length
      const storedOrders = customer.total_orders
      
      if (calculatedOrders !== storedOrders) {
        console.log(`❌ ${customer.name} 订单数仍不一致：计算值${calculatedOrders} vs 存储值${storedOrders}`)
        consistencyErrors++
      }
    }
    
    if (consistencyErrors === 0) {
      console.log('✅ 数据一致性验证通过，修复成功！')
    } else {
      console.log(`❌ 仍有 ${consistencyErrors} 个数据一致性错误`)
    }
    
  } catch (error) {
    console.error('❌ 验证过程中出错:', error)
  }
}

fixCustomerStatistics()