import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCustomerPurchaseTime() {
  try {
    console.log('=== 检查客户购买时间准确性 ===')
    console.log('当前时间：2025年9月8日 21:10')
    console.log('业务逻辑：产品制作完成 → 客户购买 → 当前时间')
    console.log()

    // 获取所有客户购买记录
    const purchases = await prisma.customer_purchase.find_many({
      include: {
        sku: {
          select: {
            id: true,
            sku_name: true,
            created_at: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      },
      orderBy: {
        purchase_date: 'desc'
      }
    })

    console.log(`总购买记录数：${purchases.length}`)
    console.log()

    // 当前时间（2025年9月8日 21:10）
    const currentTime = new Date('2025-09-08T21:10:00+08:00')
    console.log(`当前时间基准：${currentTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })}`)
    console.log()

    let futureTimeCount = 0
    let beforeSkuCreationCount = 0
    let validTimeCount = 0
    const problemRecords = []

    for (const purchase of purchases) {
      const purchaseTime = new Date(purchase.purchase_date)
      const skuCreationTime = new Date(purchase.sku.created_at)
      
      let hasIssue = false
      let issues = []

      // 检查1：购买时间是否在未来
      if (purchaseTime > currentTime) {
        futureTimeCount++
        hasIssue = true
        issues.push('购买时间在未来')
      }

      // 检查2：购买时间是否在SKU创建之前（允许等于创建时间）
      if (purchaseTime < skuCreationTime) {
        beforeSkuCreationCount++
        hasIssue = true
        issues.push('购买时间早于产品制作时间')
      }

      if (hasIssue) {
        problemRecords.push({
          purchase_id: purchase.id,
          customer_name: purchase.customer.name,
          customer_phone: purchase.customer.phone,
          sku_name: purchase.sku.sku_name,
          purchaseTime: purchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }),
          skuCreationTime: skuCreationTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }),
          issues: issues
        })
      } else {
        validTimeCount++
      }
    }

    // 统计报告
    console.log('=== 时间检查统计 ===')
    console.log(`✅ 时间正确的记录：${validTimeCount} 条`)
    console.log(`❌ 购买时间在未来：${futureTimeCount} 条`)
    console.log(`❌ 购买时间早于产品制作：${beforeSkuCreationCount} 条`)
    console.log(`❌ 总问题记录：${problemRecords.length} 条`)
    console.log()

    if (problemRecords.length > 0) {
      console.log('=== 问题记录详情 ===')
      problemRecords.for_each((record, index) => {
        console.log(`${index + 1}. 客户：${record.customer_name} (${record.customer_phone})`)
        console.log(`   SKU：${record.sku_name}`)
        console.log(`   购买时间：${record.purchaseTime}`)
        console.log(`   制作时间：${record.skuCreationTime}`)
        console.log(`   问题：${record.issues.join(', ')}`)
        console.log()
      })

      // 修复建议
      console.log('=== 修复建议 ===')
      console.log('1. 未来时间的购买记录应调整为合理的历史时间')
      console.log('2. 早于产品制作的购买记录应调整为产品制作完成后的时间')
      console.log('3. 建议购买时间设置在产品制作完成后1-30天内')
      console.log()

      // 自动修复逻辑
      console.log('=== 开始自动修复 ===')
      let fixedCount = 0

      for (const record of problemRecords) {
        const purchase = purchases.find(p => p.id === record.purchase_id)
        if (!purchase) continue

        const skuCreationTime = new Date(purchase.sku.created_at)
        let newPurchaseTime

        // 计算合理的购买时间：SKU创建时间后30分钟到当前时间前1小时的随机时间
        const minTime = new Date(skuCreationTime.get_time() + 30 * 60 * 1000) // 创建后30分钟
        const maxTime = new Date(currentTime.get_time() - 60 * 60 * 1000) // 当前时间前1小时
        
        // 确保maxTime大于minTime
        if (maxTime.get_time() <= minTime.get_time()) {
          // 如果SKU创建时间太接近当前时间，设置为当前时间前2小时
          newPurchaseTime = new Date(currentTime.get_time() - 2 * 60 * 60 * 1000)
        } else {
          // 随机选择一个时间
          const randomTime = minTime.get_time() + Math.random() * (maxTime.get_time() - minTime.get_time())
          newPurchaseTime = new Date(randomTime)
        }
        
        // 最终检查：确保购买时间不超过当前时间
        if (newPurchaseTime.get_time() > currentTime.get_time()) {
          newPurchaseTime = new Date(currentTime.get_time() - 60 * 60 * 1000) // 当前时间前1小时
        }

        try {
          await prisma.customer_purchase.update({
            where: { id: purchase.id },
            data: { purchase_date: newPurchaseTime }
          })

          console.log(`✅ 修复记录 ${purchase.id}：`)
          console.log(`   客户：${record.customer_name}`)
          console.log(`   原购买时间：${record.purchaseTime}`)
          console.log(`   新购买时间：${newPurchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })}`)
          console.log()
          fixedCount++
        } catch (error) {
          console.error(`❌ 修复记录 ${purchase.id} 失败：`, error.message)
        }
      }

      console.log(`=== 修复完成：共修复 ${fixedCount} 条记录 ===`)
    } else {
      console.log('✅ 所有购买记录的时间都是正确的！')
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
    console.log()
    console.log('=== 最终验证 ===')
    
    // 重新检查
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
      console.log('🎉 所有客户购买时间现在都符合业务逻辑！')
    }

  } catch (error) {
    console.error('检查客户购买时间时出错：', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCustomerPurchaseTime()
  .catch(console.error)