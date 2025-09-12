import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixDestroyMaterialUsage() {
  console.log('🔧 开始修正销毁操作的MaterialUsage记录...')
  
  try {
    // 查找SKU20250901003相关的负数MaterialUsage记录（销毁退回记录）
    const negativeUsages = await prisma.material_usage.find_many({
      where: {
        quantity_used_beads: {
          lt: 0 // 负数记录
        },
        product: { sku_id: {
            in: await prisma.product_sku.find_many({
              where: {
                sku_code: 'SKU20250901003'
              },
              select: { id: true }
            }).then(skus => skus.map(sku => sku.id))
          }
        }
      },
      include: {
        product: {
          include: {
            sku: true
          }
        },
        purchase: true
      }
    })
    
    console.log(`找到 ${negativeUsages.length} 条负数MaterialUsage记录`)
    
    // 显示当前记录
    for (const usage of negativeUsages) {
      console.log(`记录ID: ${usage.id}, SKU: ${usage.product.sku?.sku_code}, 采购ID: ${usage.purchase_id}, 当前退回数量: ${usage.quantity_used_beads}`)
    }
    
    // 确认是否有-2的记录需要修正为-1
    const recordsToFix = negativeUsages.filter(usage => usage.quantity_used_beads === -2)
    
    if (recordsToFix.length === 0) {
      console.log('❌ 没有找到需要修正的-2记录')
      return
    }
    
    console.log(`\n🔍 找到 ${recordsToFix.length} 条需要修正的记录（从-2改为-1）：`)
    
    for (const record of recordsToFix) {
      console.log(`- 记录ID: ${record.id}, 采购ID: ${record.purchase_id}, 当前值: ${record.quantity_used_beads}`)
    }
    
    // 执行修正
    console.log('\n🔧 开始修正记录...')
    
    for (const record of recordsToFix) {
      await prisma.material_usage.update({
        where: { id: record.id },
        data: {
          quantity_used_beads: -1 // 修正为-1
        }
      })
      
      console.log(`✅ 已修正记录 ${record.id}: ${record.quantity_used_beads} → -1`)
    }
    
    console.log('\n🎉 MaterialUsage记录修正完成！')
    
    // 验证修正结果
    console.log('\n🔍 验证修正结果...')
    
    const updatedUsages = await prisma.material_usage.find_many({
      where: {
        quantity_used_beads: {
          lt: 0
        },
        product: { sku_id: {
            in: await prisma.product_sku.find_many({
              where: {
                sku_code: 'SKU20250901003'
              },
              select: { id: true }
            }).then(skus => skus.map(sku => sku.id))
          }
        }
      },
      include: {
        product: {
          include: {
            sku: true
          }
        }
      }
    })
    
    console.log('修正后的负数记录：')
    for (const usage of updatedUsages) {
      console.log(`- 记录ID: ${usage.id}, 退回数量: ${usage.quantity_used_beads}`)
    }
    
    // 重新计算库存
    console.log('\n📊 重新计算原材料库存...')
    
    // 查找原材料CG20250901590291的库存
    const purchase = await prisma.purchase.find_first({
      where: {
        id: 'CG20250901590291'
      }
    })
    
    if (purchase) {
      // 计算该采购记录的总使用量
      const totalUsage = await prisma.material_usage.aggregate({
        where: {
          purchase_id: purchase.id
        },
        Sum: {
          quantity_used_beads: true
        }
      })
      
      const totalUsed = totalUsage.Sum.quantity_used_beads || 0
      const remaining = purchase.quantity_beads - totalUsed
      
      console.log(`原材料 ${purchase.code}:`)
      console.log(`- 原始采购数量: ${purchase.quantity_beads} 件`)
      console.log(`- 总使用量: ${totalUsed} 件`)
      console.log(`- 剩余库存: ${remaining} 件`)
    }
    
  } catch (error) {
    console.error('❌ 修正过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDestroyMaterialUsage()