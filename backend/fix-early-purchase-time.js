import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixEarlyPurchaseTime() {
  try {
    console.log('=== 修复早于产品制作的购买时间 ===')
    console.log('当前时间基准：2025年9月8日 21:10')
    console.log()

    // 当前时间（2025年9月8日 21:10）
    const currentTime = new Date('2025-09-08T21:10:00+08:00')
    
    // 获取所有购买记录
    const purchases = await prisma.customer_purchase.find_many({
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

    console.log(`总购买记录数：${purchases.length}`)
    
    // 找出购买时间早于产品制作时间的记录
    const earlyPurchases = purchases.filter(purchase => {
      const purchaseTime = new Date(purchase.purchase_date)
      const skuCreationTime = new Date(purchase.sku.created_at)
      return purchaseTime < skuCreationTime
    })
    
    console.log(`发现 ${earlyPurchases.length} 条购买时间早于产品制作的记录`)
    
    if (earlyPurchases.length === 0) {
      console.log('✅ 没有早期购买记录需要修复')
      return
    }
    
    let fixedCount = 0

    for (const purchase of earlyPurchases) {
      const skuCreationTime = new Date(purchase.sku.created_at)
      const originalPurchaseTime = new Date(purchase.purchase_date)
      
      // 计算新的购买时间：SKU创建时间后30分钟到当前时间前30分钟的随机时间
      const minTime = new Date(skuCreationTime.get_time() + 30 * 60 * 1000) // 创建后30分钟
      const maxTime = new Date(currentTime.get_time() - 30 * 60 * 1000) // 当前时间前30分钟
      
      let newPurchaseTime
      
      if (maxTime.get_time() <= minTime.get_time()) {
        // 如果时间范围太小，设置为创建后30分钟
        newPurchaseTime = minTime
      } else {
        // 随机选择一个时间
        const randomTime = minTime.get_time() + Math.random() * (maxTime.get_time() - minTime.get_time())
        newPurchaseTime = new Date(randomTime)
      }
      
      // 确保新时间在合理范围内
      if (newPurchaseTime.get_time() >= currentTime.get_time()) {
        newPurchaseTime = new Date(currentTime.get_time() - 30 * 60 * 1000)
      }
      if (newPurchaseTime.get_time() <= skuCreationTime.get_time()) {
        newPurchaseTime = new Date(skuCreationTime.get_time() + 30 * 60 * 1000)
      }
      
      try {
        await prisma.customer_purchase.update({
          where: { id: purchase.id },
          data: { purchase_date: newPurchaseTime }
        })
        
        console.log(`✅ 修复记录 ${fixedCount + 1}：`)
        console.log(`   客户：${purchase.customer.name}`)
        console.log(`   SKU：${purchase.sku.sku_name}`)
        console.log(`   SKU制作时间：${skuCreationTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })}`)
        console.log(`   原购买时间：${originalPurchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })} (早于制作)`)
        console.log(`   新购买时间：${newPurchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })} (制作后)`)
        console.log()
        
        fixedCount++
      } catch (error) {
        console.error(`❌ 修复记录失败：`, error.message)
      }
    }

    console.log(`=== 修复完成：共修复 ${fixedCount} 条早期购买记录 ===`)
    
    // 最终验证
    console.log()
    console.log('=== 最终验证 ===')
    
    const finalPurchases = await prisma.customer_purchase.find_many({
      include: {
        sku: { select: { created_at: true } }
      }
    })

    let validCount = 0
    let futureCount = 0
    let earlyCount = 0

    for (const purchase of finalPurchases) {
      const purchaseTime = new Date(purchase.purchase_date)
      const skuCreationTime = new Date(purchase.sku.created_at)
      
      if (purchaseTime > currentTime) {
        futureCount++
      } else if (purchaseTime < skuCreationTime) {
        earlyCount++
      } else {
        validCount++
      }
    }

    console.log(`✅ 总购买记录：${finalPurchases.length} 条`)
    console.log(`✅ 时间正确的记录：${validCount} 条`)
    console.log(`❌ 购买时间在未来：${futureCount} 条`)
    console.log(`❌ 购买时间早于制作：${earlyCount} 条`)
    
    if (futureCount === 0 && earlyCount === 0) {
      console.log()
      console.log('🎉 所有客户购买时间现在都符合业务逻辑！')
      console.log('✅ 购买时间都在产品制作完成后')
      console.log('✅ 购买时间都在当前时间（2025年9月8日21:10）之前')
      console.log('✅ 业务逻辑：产品制作完成 → 客户购买 → 当前时间')
    } else {
      console.log(`❌ 仍有 ${futureCount + earlyCount} 条记录需要检查`)
    }

  } catch (error) {
    console.error('修复早期购买时间时出错：', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixEarlyPurchaseTime()
  .catch(console.error)