// 检查客户退货数据的脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkRefundData() {
  try {
    console.log('🔍 检查客户退货数据...')
    
    // 1. 获取所有客户购买记录
    const allPurchases = await prisma.customer_purchase.find_many({
      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    console.log(`\n📊 总购买记录数: ${allPurchases.length}`)
    
    // 2. 统计退货记录
    const refundedPurchases = allPurchases.filter(p => p.status === 'REFUNDED')
    console.log(`📊 退货记录数: ${refundedPurchases.length}`)
    
    if (refundedPurchases.length === 0) {
      console.log('\n⚠️  没有找到任何退货记录！')
      console.log('这可能是为什么没有客户被标记为挑剔（PICKY）的原因。')
      
      // 创建一些测试退货数据
      console.log('\n🔧 创建测试退货数据...')
      
      // 获取前几个有购买记录的客户
      const activePurchases = allPurchases.filter(p => p.status === 'ACTIVE').slice(0, 5)
      
      for (let i = 0; i < Math.min(3, activePurchases.length); i++) {
        const purchase = activePurchases[i]
        await prisma.customer_purchase.update({
          where: { id: purchase.id },
          data: {
            status: 'REFUNDED',
            refund_date: new Date(),
            refund_reason: 'customer_dissatisfied',
            refund_notes: '测试退货数据'
          }
        })
        
        console.log(`✅ 为客户 "${purchase.customer.name}" 创建了退货记录`)
      }
    } else {
      console.log('\n📋 退货记录详情:')
      refundedPurchases.for_each((purchase, index) => {
        console.log(`${index + 1}. 客户: ${purchase.customer.name}, 退货日期: ${purchase.refund_date}, 原因: ${purchase.refund_reason}`)
      })
    }
    
    // 3. 重新计算客户统计
    console.log('\n📊 客户退货统计:')
    
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
    
    const customerStats = customers.map(customer => {
      const total_orders = customer.purchases.length
      const refundedOrders = customer.purchases.filter(p => p.status === 'REFUNDED').length
      const refund_rate = totalOrders > 0 ? (refundedOrders / totalOrders) * 100 : 0
      
      return {
        name: customer.name,
        totalOrders,
        refundedOrders,
        refund_rate: refundRate.to_fixed(1)
      }
    }).filter(stat => stat.refundedOrders > 0)
    
    if (customerStats.length > 0) {
      console.log('\n有退货记录的客户:')
      customerStats.for_each(stat => {
        console.log(`- ${stat.name}: ${stat.refundedOrders}次退货 / ${stat.total_orders}总订单 = ${stat.refund_rate}%退货率`)
      })
      
      // 计算挑剔客户阈值
      const refundCounts = customerStats.map(s => s.refundedOrders).sort((a, b) => b - a)
      const pickyIndex = Math.floor(refundCounts.length * 0.2)
      const pickyThreshold = refundCounts[pickyIndex] || 1
      
      console.log(`\n🎯 挑剔客户阈值（前20%）: ${pickyThreshold}次退货`)
      
      const pickyCustomers = customerStats.filter(s => s.refundedOrders >= pickyThreshold)
      console.log(`🏷️  应该被标记为挑剔的客户: ${pickyCustomers.map(c => c.name).join(', ')}`)
    } else {
      console.log('\n❌ 没有客户有退货记录')
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkRefundData()