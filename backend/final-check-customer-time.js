import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function finalCheckCustomerTime() {
  try {
    console.log('=== 最终检查客户购买时间 ===')
    console.log('当前时间基准：2025年9月8日 21:10')
    console.log()

    // 获取所有客户购买记录
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
      },
      orderBy: {
        purchase_date: 'desc'
      }
    })

    console.log(`总购买记录数：${purchases.length}`)
    console.log()

    // 当前时间（2025年9月8日 21:10）
    const currentTime = new Date('2025-09-08T21:10:00+08:00')
    
    let validCount = 0
    let futureCount = 0
    let beforeSkuCount = 0
    const problemRecords = []

    for (const purchase of purchases) {
      const purchaseTime = new Date(purchase.purchase_date)
      const skuCreationTime = new Date(purchase.sku.created_at)
      
      let isValid = true
      let issues = []

      // 检查购买时间是否在未来
      if (purchaseTime > currentTime) {
        futureCount++
        isValid = false
        issues.push('购买时间在未来')
      }

      // 检查购买时间是否早于SKU创建
      if (purchaseTime < skuCreationTime) {
        beforeSkuCount++
        isValid = false
        issues.push('购买时间早于产品制作')
      }

      if (isValid) {
        validCount++
      } else {
        problemRecords.push({
          id: purchase.id,
          customer_name: purchase.customer.name,
          sku_name: purchase.sku.sku_name,
          purchaseTime: purchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }),
          skuCreationTime: skuCreationTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }),
          issues: issues
        })
      }
    }

    // 统计报告
    console.log('=== 最终检查结果 ===')
    console.log(`✅ 时间正确的记录：${validCount} 条`)
    console.log(`❌ 购买时间在未来：${futureCount} 条`)
    console.log(`❌ 购买时间早于产品制作：${beforeSkuCount} 条`)
    console.log(`❌ 总问题记录：${problemRecords.length} 条`)
    console.log()

    if (problemRecords.length > 0) {
      console.log('=== 剩余问题记录（前10条）===')
      problemRecords.slice(0, 10).for_each((record, index) => {
        console.log(`${index + 1}. 客户：${record.customer_name}`)
        console.log(`   SKU：${record.sku_name}`)
        console.log(`   购买时间：${record.purchaseTime}`)
        console.log(`   制作时间：${record.skuCreationTime}`)
        console.log(`   问题：${record.issues.join(', ')}`)
        console.log()
      })
    } else {
      console.log('🎉 所有客户购买时间现在都符合业务逻辑！')
      console.log('✅ 购买时间都在产品制作完成后')
      console.log('✅ 购买时间都在当前时间（2025年9月8日21:10）之前')
    }

    // 显示时间分布
    console.log('=== 购买时间分布分析 ===')
    const timeDistribution = {
      '2025-09-08': 0,
      '2025-09-09': 0,
      '其他': 0
    }

    purchases.for_each(purchase => {const purchase_date = new Date(purchase.purchase_date).to_i_s_o_string().split('T')[0]
      if (timeDistribution[purchase_date] !== undefined) {
        timeDistribution[purchase_date]++
      } else {
        timeDistribution['其他']++
      }
    })

    Object.entries(timeDistribution).for_each(([date, count]) => {
      console.log(`${date}：${count} 条记录`)
    })

  } catch (error) {
    console.error('检查客户购买时间时出错：', error)
  } finally {
    await prisma.$disconnect()
  }
}

finalCheckCustomerTime()
  .catch(console.error)