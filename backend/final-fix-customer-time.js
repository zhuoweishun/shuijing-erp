import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function finalFixCustomerTime() {
  try {
    console.log('=== 最终修复客户购买时间 ===')
    console.log('当前时间基准：2025年9月8日 21:10')
    console.log()

    // 当前时间（2025年9月8日 21:10）
    const currentTime = new Date('2025-09-08T21:10:00+08:00')
    
    // 获取所有有问题的购买记录
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
    
    let fixedCount = 0
    const problemRecords = []

    for (const purchase of purchases) {
      const purchaseTime = new Date(purchase.purchase_date)
      const skuCreationTime = new Date(purchase.sku.created_at)
      
      // 检查是否需要修复
      const needsFix = purchaseTime < skuCreationTime || purchaseTime > currentTime
      
      if (needsFix) {
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
        
        // 最终检查：确保新时间在合理范围内
        if (newPurchaseTime.get_time() > currentTime.get_time()) {
          newPurchaseTime = new Date(currentTime.get_time() - 30 * 60 * 1000)
        }
        if (newPurchaseTime.get_time() < skuCreationTime.get_time()) {
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
          console.log(`   原购买时间：${purchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })}`)
          console.log(`   SKU制作时间：${skuCreationTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })}`)
          console.log(`   新购买时间：${newPurchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })}`)
          console.log()
          
          fixedCount++
        } catch (error) {
          console.error(`❌ 修复记录失败：`, error.message)
          problemRecords.push({
            id: purchase.id,
            customer_name: purchase.customer.name,
            sku_name: purchase.sku.sku_name,
            error: error.message
          })
        }
      }
    }

    console.log(`=== 修复完成：共修复 ${fixedCount} 条记录 ===`)
    
    if (problemRecords.length > 0) {
      console.log(`❌ 修复失败：${problemRecords.length} 条记录`)
      problemRecords.for_each(record => {
        console.log(`- ${record.customer_name} - ${record.sku_name}: ${record.error}`)
      })
    }
    
    // 更新客户统计信息
    console.log()
    console.log('=== 更新客户统计信息 ===')
    const customers = await prisma.customer.find_many()
    
    for (const customer of customers) {
      const customerPurchases = await prisma.customer_purchase.find_many({
        where: { customer_id: customer.id },
        orderBy: { purchase_date: 'asc' }
      })

      if (customerPurchases.length > 0) {
        const firstPurchase = customerPurchases[0]
        const lastPurchase = customerPurchases[customerPurchases.length - 1]
        const totalAmount = customerPurchases.reduce((sum, p) => sum + parseFloat(p.total_price), 0)

        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            total_purchases: totalAmount,
            total_orders: customerPurchases.length,
            first_purchase_date: firstPurchase.purchase_date,
            last_purchase_date: lastPurchase.purchase_date
          }
        })
      }
    }
    
    console.log('✅ 客户统计信息更新完成')
    
    // 最终验证
    console.log()
    console.log('=== 最终验证 ===')
    
    const finalPurchases = await prisma.customer_purchase.find_many({
      include: {
        sku: { select: { created_at: true } }
      }
    })

    let finalValidCount = 0
    let finalIssueCount = 0

    for (const purchase of finalPurchases) {
      const purchaseTime = new Date(purchase.purchase_date)
      const skuCreationTime = new Date(purchase.sku.created_at)
      
      if (purchaseTime <= currentTime && purchaseTime >= skuCreationTime) {
        finalValidCount++
      } else {
        finalIssueCount++
      }
    }

    console.log(`✅ 最终正确记录：${finalValidCount} 条`)
    console.log(`❌ 最终问题记录：${finalIssueCount} 条`)
    
    if (finalIssueCount === 0) {
      console.log()
      console.log('🎉 所有客户购买时间现在都符合业务逻辑！')
      console.log('✅ 购买时间都在产品制作完成后')
      console.log('✅ 购买时间都在当前时间（2025年9月8日21:10）之前')
      console.log('✅ 业务逻辑：产品制作完成 → 客户购买 → 当前时间')
    } else {
      console.log(`❌ 仍有 ${finalIssueCount} 条记录需要手动检查`)
    }

  } catch (error) {
    console.error('修复客户购买时间时出错：', error)
  } finally {
    await prisma.$disconnect()
  }
}

finalFixCustomerTime()
  .catch(console.error)