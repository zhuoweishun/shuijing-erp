import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixSkuCreationTime() {
  try {
    console.log('=== 修复SKU制作时间 ===')
    console.log('问题：发现多个SKU的制作时间晚于当前时间基准（2025年9月8日21:10）')
    console.log('解决：将这些SKU的制作时间调整到当前时间之前')
    console.log()

    // 当前时间基准（2025年9月8日 21:10）
    const currentTime = new Date('2025-09-08T21:10:00+08:00')
    
    // 查找所有制作时间在未来的SKU
    const futureSkus = await prisma.product_sku.find_many({
      where: {
        created_at: {
          gt: currentTime
        }
      },
      select: {
        id: true,
        sku_name: true,
        created_at: true,
        customerPurchases: {
          select: {
            id: true,
            purchase_date: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    console.log(`发现 ${futureSkus.length} 个SKU的制作时间在未来`)
    
    if (futureSkus.length === 0) {
      console.log('✅ 没有需要修复的SKU制作时间')
      return
    }
    
    let fixedCount = 0
    const fixedSkus = []

    for (const sku of futureSkus) {
      const originalCreationTime = new Date(sku.created_at)
      
      // 计算新的制作时间：在当前时间前的合理时间范围内
      // 设置为2025年9月8日的16:00-20:00之间的随机时间
      const minTime = new Date('2025-09-08T16:00:00+08:00')
      const maxTime = new Date('2025-09-08T20:00:00+08:00')
      
      const randomTime = minTime.get_time() + Math.random() * (maxTime.get_time() - minTime.get_time())
      const newCreationTime = new Date(randomTime)
      
      try {
        // 更新SKU的制作时间
        await prisma.product_sku.update({
          where: { id: sku.id },
          data: { created_at: newCreationTime }
        })
        
        console.log(`✅ 修复SKU ${fixedCount + 1}：`)
        console.log(`   SKU名称：${sku.sku_name}`)
        console.log(`   原制作时间：${originalCreationTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })} (未来时间)`)
        console.log(`   新制作时间：${newCreationTime.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })} (合理时间)`)
        console.log(`   影响的购买记录：${sku.customerPurchases.length} 条`)
        
        if (sku.customerPurchases.length > 0) {
          console.log(`   涉及客户：${sku.customerPurchases.map(p => p.customer.name).join(', ')}`)
        }
        console.log()
        
        fixedSkus.push({
          sku_name: sku.sku_name,
          originalTime: originalCreationTime,
          newTime: newCreationTime,
          affectedPurchases: sku.customerPurchases.length
        })
        
        fixedCount++
      } catch (error) {
        console.error(`❌ 修复SKU ${sku.sku_name} 失败：`, error.message)
      }
    }

    console.log(`=== SKU制作时间修复完成 ===`)
    console.log(`✅ 成功修复：${fixedCount} 个SKU`)
    console.log(`✅ 影响的购买记录：${fixedSkus.reduce((sum, sku) => sum + sku.affectedPurchases, 0)} 条`)
    console.log()
    
    // 验证修复结果
    console.log('=== 验证修复结果 ===')
    
    const remainingFutureSkus = await prisma.product_sku.count({
      where: {
        created_at: {
          gt: currentTime
        }
      }
    })
    
    const totalSkus = await prisma.product_sku.count()
    
    console.log(`✅ 总SKU数量：${totalSkus} 个`)
    console.log(`✅ 制作时间正确的SKU：${totalSkus - remainingFutureSkus} 个`)
    console.log(`❌ 仍有未来制作时间的SKU：${remainingFutureSkus} 个`)
    
    if (remainingFutureSkus === 0) {
      console.log()
      console.log('🎉 所有SKU的制作时间现在都在当前时间基准之前！')
      console.log('✅ SKU制作时间逻辑修复完成')
      console.log()
      console.log('📝 下一步建议：')
      console.log('1. 运行客户购买时间修复脚本')
      console.log('2. 验证所有时间逻辑的正确性')
      console.log('3. 确保业务逻辑：采购时间 < SKU制作时间 < 客户购买时间 < 当前时间')
    } else {
      console.log(`❌ 仍需要手动检查 ${remainingFutureSkus} 个SKU`)
    }

  } catch (error) {
    console.error('修复SKU制作时间时出错：', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSkuCreationTime()
  .catch(console.error)