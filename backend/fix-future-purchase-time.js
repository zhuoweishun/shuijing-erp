import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixFuturePurchaseTime() {
  try {
    console.log('=== 修复未来购买时间 ===')
    console.log('当前时间基准：2025年9月8日 21:10')
    console.log()

    // 当前时间（2025年9月8日 21:10）
    const currentTime = new Date('2025-09-08T21:10:00+08:00')
    
    // 获取所有购买时间在未来的记录
    const futurePurchases = await prisma.customer_purchase.find_many({
      where: {
        purchase_date: {
          gt: currentTime
        }
      },
      include: {
        sku: {
          select: {
            sku_name: true,
            created_at: true
          }
        },
        customer: {
          select: {
            name: true,
            phone: true
          }
        }
      }
    })

    console.log(`发现 ${futurePurchases.length} 条未来购买记录`)
    
    if (futurePurchases.length === 0) {
      console.log('✅ 没有未来购买记录需要修复')
      return
    }
    
    let fixedCount = 0

    for (const purchase of futurePurchases) {
      const skuCreationTime = new Date(purchase.sku.created_at)
      const originalPurchaseTime = new Date(purchase.purchase_date)
      
      // 计算新的购买时间：SKU创建时间后30分钟到当前时间前30分钟的随机时间
      const minTime = new Date(skuCreationTime.get_time() + 30 * 60 * 1000) // 创建后30分钟
      const maxTime = new Date(currentTime.get_time() - 30 * 60 * 1000) // 当前时间前30分钟
      
      let newPurchaseTime
      
      if (maxTime.get_time() <= minTime.get_time()) {
        // 如果时间范围太小，设置为当前时间前1小时
        newPurchaseTime = new Date(currentTime.get_time() - 60 * 60 * 1000)
      } else {
        // 随机选择一个时间
        const randomTime = minTime.get_time() + Math.random() * (maxTime.get_time() - minTime.get_time())
        newPurchaseTime = new Date(randomTime)
      }
      
      // 确保新时间不超过当前时间
      if (newPurchaseTime.get_time() >= currentTime.get_time()) {
        newPurchaseTime = new Date(currentTime.get_time() - 60 * 60 * 1000)
      }
      
      try {
        await prisma.customer_purchase.update({
          where: { id: purchase.id },
          data: { purchase_date: newPurchaseTime }
        })
        
        console.log(`✅ 修复记录 ${fixedCount + 1}：`)
        console.log(`   客户：${purchase.customer.name}`)
        console.log(`   SKU：${purchase.sku.sku_name}`)
        console.log(`   原购买时间：${originalPurchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })} (未来时间)`)
        console.log(`   新购买时间：${newPurchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })} (合理时间)`)
        console.log()
        
        fixedCount++
      } catch (error) {
        console.error(`❌ 修复记录失败：`, error.message)
      }
    }

    console.log(`=== 修复完成：共修复 ${fixedCount} 条未来购买记录 ===`)
    
    // 最终验证
    console.log()
    console.log('=== 最终验证 ===')
    
    const remainingFuturePurchases = await prisma.customer_purchase.count({
      where: {
        purchase_date: {
          gt: currentTime
        }
      }
    })
    
    const total_purchases = await prisma.customer_purchase.count()
    const validPurchases = totalPurchases - remainingFuturePurchases
    
    console.log(`✅ 总购买记录：${ total_purchases } 条`)
    console.log(`✅ 时间正确的记录：${validPurchases} 条`)
    console.log(`❌ 仍有未来时间记录：${remainingFuturePurchases} 条`)
    
    if (remainingFuturePurchases === 0) {
      console.log()
      console.log('🎉 所有客户购买时间现在都在当前时间（2025年9月8日21:10）之前！')
      console.log('✅ 购买时间逻辑修复完成')
    }

  } catch (error) {
    console.error('修复未来购买时间时出错：', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixFuturePurchaseTime()
  .catch(console.error)