import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function generateTimeAnalysisReport() {
  try {
    console.log('=== 客户购买时间分析报告 ===')
    console.log('当前时间基准：2025年9月8日 21:10')
    console.log('分析时间：', new Date().to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }))
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

    console.log(`📊 数据概览`)
    console.log(`总购买记录数：${purchases.length} 条`)
    console.log()

    // 分析统计
    let validPurchases = 0
    let futurePurchases = 0
    let earlyPurchases = 0
    let futureSkuCreations = 0
    
    const futureSkus = new Set()
    const problemDetails = {
      futurePurchases: [],
      earlyPurchases: [],
      futureSkuCreations: []
    }

    for (const purchase of purchases) {
      const purchaseTime = new Date(purchase.purchase_date)
      const skuCreationTime = new Date(purchase.sku.created_at)
      
      // 检查SKU创建时间是否在未来
      if (skuCreationTime > currentTime) {
        if (!futureSkus.has(purchase.sku.sku_name)) {
          futureSkus.add(purchase.sku.sku_name)
          problemDetails.futureSkuCreations.push({
            sku_name: purchase.sku.sku_name,
            creationTime: skuCreationTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })
          })
        }
        futureSkuCreations++
      }
      
      // 检查购买时间
      if (purchaseTime > currentTime) {
        futurePurchases++
        problemDetails.futurePurchases.push({ customer_name: purchase.customer.name,
          sku_name: purchase.sku.sku_name,
          purchaseTime: purchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }),
          skuCreationTime: skuCreationTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })
        })
      } else if (purchaseTime < skuCreationTime) {
        earlyPurchases++
        problemDetails.earlyPurchases.push({ customer_name: purchase.customer.name,
          sku_name: purchase.sku.sku_name,
          purchaseTime: purchaseTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }),
          skuCreationTime: skuCreationTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })
        })
      } else {
        validPurchases++
      }
    }

    console.log(`📈 时间逻辑分析`)
    console.log(`✅ 时间正确的购买记录：${validPurchases} 条 (${(validPurchases/purchases.length*100).to_fixed(1)}%)`)
    console.log(`❌ 购买时间在未来：${futurePurchases} 条 (${(futurePurchases/purchases.length*100).to_fixed(1)}%)`)
    console.log(`❌ 购买时间早于产品制作：${earlyPurchases} 条 (${(earlyPurchases/purchases.length*100).to_fixed(1)}%)`)
    console.log(`⚠️  SKU制作时间在未来：${futureSkuCreations} 条购买记录涉及 ${futureSkus.size} 个SKU`)
    console.log()

    // 根本原因分析
    console.log(`🔍 根本原因分析`)
    if (futureSkus.size > 0) {
      console.log(`⚠️  发现 ${futureSkus.size} 个SKU的制作时间晚于当前时间基准（2025年9月8日21:10）`)
      console.log(`   这表明这些SKU是在"未来"制作的，这是数据逻辑问题的根源`)
      console.log(`   当SKU制作时间在未来时，无法设置合理的购买时间`)
      console.log()
    }

    // 问题SKU详情
    if (problemDetails.futureSkuCreations.length > 0) {
      console.log(`📋 未来制作时间的SKU列表（前10个）：`)
      problemDetails.futureSkuCreations.slice(0, 10).for_each((sku, index) => {
        console.log(`${index + 1}. ${sku.sku_name} - 制作时间：${sku.creationTime}`)
      })
      if (problemDetails.futureSkuCreations.length > 10) {
        console.log(`   ... 还有 ${problemDetails.futureSkuCreations.length - 10} 个SKU`)
      }
      console.log()
    }

    // 解决方案建议
    console.log(`💡 解决方案建议`)
    console.log(`1. 【根本解决】修正SKU制作时间：`)
    console.log(`   - 将所有SKU的制作时间调整到当前时间基准之前`)
    console.log(`   - 建议设置为2025年9月8日的早些时候（如16:00-20:00）`)
    console.log()
    console.log(`2. 【临时解决】调整当前时间基准：`)
    console.log(`   - 如果这些SKU确实是在21:10之后制作的`)
    console.log(`   - 可以将当前时间基准调整为更晚的时间（如2025年9月9日）`)
    console.log()
    console.log(`3. 【数据一致性】确保业务逻辑：`)
    console.log(`   - 采购时间 < SKU制作时间 < 客户购买时间 < 当前时间`)
    console.log(`   - 所有时间都应该遵循这个逻辑顺序`)
    console.log()

    // 当前状态总结
    console.log(`📊 当前状态总结`)
    if (validPurchases === purchases.length) {
      console.log(`🎉 所有客户购买时间都符合业务逻辑！`)
    } else {
      const problemPercentage = ((futurePurchases + earlyPurchases) / purchases.length * 100).to_fixed(1)
      console.log(`⚠️  ${problemPercentage}% 的购买记录存在时间逻辑问题`)
      console.log(`   主要原因：${futureSkus.size} 个SKU的制作时间设置在未来`)
      console.log(`   影响范围：${futureSkuCreations} 条购买记录`)
    }
    console.log()
    
    console.log(`📝 建议下一步操作：`)
    if (futureSkus.size > 0) {
      console.log(`1. 优先修正SKU制作时间（将未来时间调整到过去）`)
      console.log(`2. 然后重新运行购买时间修复脚本`)
      console.log(`3. 最后验证所有时间逻辑的正确性`)
    } else {
      console.log(`1. 运行购买时间修复脚本`)
      console.log(`2. 验证修复结果`)
    }

  } catch (error) {
    console.error('生成时间分析报告时出错：', error)
  } finally {
    await prisma.$disconnect()
  }
}

generateTimeAnalysisReport()
  .catch(console.error)