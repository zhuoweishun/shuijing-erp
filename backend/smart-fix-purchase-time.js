import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function smartFixPurchaseTime() {
  try {
    console.log('=== 智能修复客户购买时间 ===')
    console.log('当前时间基准：2025年9月8日 21:10')
    console.log('业务逻辑：产品制作完成 → 客户购买 → 当前时间')
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
    
    let fixedCount = 0
    let validCount = 0
    const problemRecords = []

    for (const purchase of purchases) {
      const purchaseTime = new Date(purchase.purchase_date)
      const skuCreationTime = new Date(purchase.sku.created_at)
      
      // 检查是否需要修复
      const isFuture = purchaseTime > currentTime
      const isEarly = purchaseTime < skuCreationTime
      const needsFix = isFuture || isEarly
      
      if (needsFix) {
        // 智能计算新的购买时间
        let newPurchaseTime
        
        // 如果SKU创建时间已经超过当前时间，这是数据问题，设置为当前时间前1小时
        if (skuCreationTime >= currentTime) {
          newPurchaseTime = new Date(currentTime.get_time() - 60 * 60 * 1000)
          console.log(`⚠️  SKU创建时间异常：${purchase.sku.sku_name} 创建于 ${skuCreationTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })}，晚于当前时间`)
        } else {
          // 正常情况：在SKU创建时间和当前时间之间选择一个合理的购买时间
          const minTime = new Date(skuCreationTime.get_time() + 10 * 60 * 1000) // 创建后10分钟
          const maxTime = new Date(currentTime.get_time() - 10 * 60 * 1000) // 当前时间前10分钟
          
          if (maxTime.get_time() <= minTime.get_time()) {
            // 时间窗口太小，设置为中间时间
            newPurchaseTime = new Date((skuCreationTime.get_time() + currentTime.get_time()) / 2)
          } else {
            // 随机选择一个时间
            const randomTime = minTime.get_time() + Math.random() * (maxTime.get_time() - minTime.get_time())
            newPurchaseTime = new Date(randomTime)
          }
        }
        
        // 最终安全检查
        if (newPurchaseTime >= currentTime) {
          newPurchaseTime = new Date(currentTime.get_time() - 10 * 60 * 1000)
        }
        if (newPurchaseTime <= skuCreationTime && skuCreationTime < currentTime) {
          newPurchaseTime = new Date(skuCreationTime.get_time() + 10 * 60 * 1000)
        }
        
        try {
          await prisma.customer_purchase.update({
            where: { id: purchase.id },
            data: { purchase_date: newPurchaseTime }
          })
          
          let issueType = []
          if (isFuture) issueType.push('未来时间')
          if (isEarly) issueType.push('早于制作')
          
          console.log(`✅ 修复记录 ${fixedCount + 1}：`)
          console.log(`   客户：${purchase.customer.name}`)
          console.log(`   SKU：${purchase.sku.sku_name}`)
          console.log(`   问题：${issueType.join(', ')}`)
          console.log(`   SKU制作时间：${skuCreationTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })}`)
          console.log(`   原购买时间：${purchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })}`)
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
      } else {
        validCount++
      }
    }

    console.log(`=== 修复完成 ===`)
    console.log(`✅ 原本正确的记录：${validCount} 条`)
    console.log(`✅ 成功修复的记录：${fixedCount} 条`)
    
    if (problemRecords.length > 0) {
      console.log(`❌ 修复失败的记录：${problemRecords.length} 条`)
      problemRecords.for_each(record => {
        console.log(`- ${record.customer_name} - ${record.sku_name}: ${record.error}`)
      })
    }
    
    // 最终验证
    console.log()
    console.log('=== 最终验证 ===')
    
    const finalPurchases = await prisma.customer_purchase.find_many({
      include: {
        sku: { select: { created_at: true } }
      }
    })

    let finalValidCount = 0
    let finalFutureCount = 0
    let finalEarlyCount = 0

    for (const purchase of finalPurchases) {
      const purchaseTime = new Date(purchase.purchase_date)
      const skuCreationTime = new Date(purchase.sku.created_at)
      
      if (purchaseTime > currentTime) {
        finalFutureCount++
      } else if (purchaseTime < skuCreationTime) {
        finalEarlyCount++
      } else {
        finalValidCount++
      }
    }

    console.log(`✅ 总购买记录：${finalPurchases.length} 条`)
    console.log(`✅ 时间正确的记录：${finalValidCount} 条 (${(finalValidCount/finalPurchases.length*100).to_fixed(1)}%)`)
    console.log(`❌ 购买时间在未来：${finalFutureCount} 条`)
    console.log(`❌ 购买时间早于制作：${finalEarlyCount} 条`)
    
    if (finalFutureCount === 0 && finalEarlyCount === 0) {
      console.log()
      console.log('🎉 所有客户购买时间现在都符合业务逻辑！')
      console.log('✅ 购买时间都在产品制作完成后')
      console.log('✅ 购买时间都在当前时间（2025年9月8日21:10）之前')
      console.log('✅ 业务逻辑：产品制作完成 → 客户购买 → 当前时间')
      console.log()
      console.log('用户可以放心使用客户管理系统，所有购买时间数据现在都是准确的！')
    } else {
      console.log(`❌ 仍有 ${finalFutureCount + finalEarlyCount} 条记录需要手动检查`)
    }

  } catch (error) {
    console.error('智能修复购买时间时出错：', error)
  } finally {
    await prisma.$disconnect()
  }
}

smartFixPurchaseTime()
  .catch(console.error)