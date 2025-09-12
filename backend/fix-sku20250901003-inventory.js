import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixSKU20250901003Inventory() {
  try {
    console.log('🔧 修复SKU20250901003的库存数据...')
    
    // 1. 查找SKU20250901003
    const sku = await prisma.product_sku.find_first({
      where: {
        sku_code: 'SKU20250901003'
      }
    })
    
    if (!sku) {
      console.log('❌ 未找到SKU20250901003')
      return
    }
    
    console.log(`\n✅ 找到SKU: ${sku.sku_name}`)
    console.log(`📊 当前库存: 总量=${sku.total_quantity}, 可售=${sku.available_quantity}`)
    
    // 2. 查找原材料CG20250901590291的采购记录
    const materialPurchase = await prisma.purchase.find_first({
      where: {
        purchase_code: 'CG20250901590291'
      }
    })
    
    if (!materialPurchase) {
      console.log('❌ 未找到原材料CG20250901590291的采购记录')
      return
    }
    
    console.log(`\n📦 原材料采购记录:`)
    const totalPurchased = materialPurchase.total_beads || materialPurchase.piece_count || materialPurchase.quantity || 0
    console.log(`   采购数量: ${totalPurchased}件`)
    
    // 3. 计算正确的MaterialUsage消耗
    const totalUsage = await prisma.material_usage.aggregate({
      where: { purchase_id: materialPurchase.id },
      Sum: {
        quantity_used_beads: true,
        quantity_used_pieces: true
      }
    })
    
    const totalUsed = (totalUsage.Sum.quantity_used_beads || 0) + (totalUsage.Sum.quantity_used_pieces || 0)
    console.log(`   已使用数量: ${totalUsed}件`)
    
    // 4. 计算正确的剩余库存
    const correctRemaining = totalPurchased - totalUsed
    console.log(`   正确剩余库存: ${correctRemaining}件`)
    console.log(`   当前系统显示: 35件`)
    
    if (correctRemaining === 35) {
      console.log('\n✅ 库存数据正确，无需修复')
      return
    }
    
    console.log(`\n🔧 需要修复库存数据，差异: ${correctRemaining - 35}件`)
    
    // 5. 分析MaterialUsage记录的详细情况
    console.log('\n🔍 分析MaterialUsage记录详情:')
    const materialUsages = await prisma.material_usage.find_many({
      where: { purchase_id: materialPurchase.id },
      include: {
        product: {
          include: {
            sku: true
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    let positiveUsage = 0
    let negativeUsage = 0
    
    materialUsages.for_each((usage, index) => {const used_quantity = usage.quantity_used_beads || usage.quantity_used_pieces || 0
      console.log(`   ${index + 1}. SKU: ${usage.product.sku.sku_code}`)
      console.log(`      使用数量: ${used_quantity}件`)
      console.log(`      创建时间: ${usage.created_at.to_i_s_o_string().split('T')[0]}`)
      
      if (usedQuantity > 0) {positiveUsage += used_quantity
      } else {negativeUsage += Math.abs(used_quantity)
      }
    })
    
    console.log(`\n📊 MaterialUsage汇总:`)
    console.log(`   正向使用(消耗): ${positiveUsage}件`)
    console.log(`   负向使用(退回): ${negativeUsage}件`)
    console.log(`   净消耗: ${positiveUsage - negativeUsage}件`)
    
    // 6. 检查是否有异常的MaterialUsage记录
    console.log('\n🚨 检查异常记录:')
    const negativeUsages = materialUsages.filter(usage => {const used_quantity = usage.quantity_used_beads || usage.quantity_used_pieces || 0
      return used_quantity < 0
    })
    
    if (negativeUsages.length > 0) {
      console.log(`   发现 ${negativeUsages.length} 条负数使用记录:`)
      negativeUsages.for_each((usage, index) => {const used_quantity = usage.quantity_used_beads || usage.quantity_used_pieces || 0
        console.log(`   ${index + 1}. ID: ${usage.id}, 数量: ${used_quantity}件, SKU: ${usage.product.sku.sku_code}`)
      })
      
      console.log('\n💡 建议修复方案:')
      console.log('   1. 负数MaterialUsage记录可能是由于拆散重做操作产生的')
      console.log('   2. 这些记录应该代表退回到原材料库存的数量')
      console.log('   3. 当前计算逻辑可能没有正确处理这种情况')
    }
    
    // 7. 提供修复建议
    console.log('\n🎯 修复建议:')
    console.log(`   1. 原材料总采购: ${totalPurchased}件`)
    console.log(`   2. 实际净消耗: ${positiveUsage - negativeUsage}件`)
    console.log(`   3. 应该剩余: ${totalPurchased - (positiveUsage - negativeUsage)}件`)
    console.log(`   4. 当前显示: 35件`)
    
    const shouldRemain = totalPurchased - (positiveUsage - negativeUsage)
    if (shouldRemain !== 35) {
      console.log(`\n❌ 库存数据不正确，需要调整 ${shouldRemain - 35} 件`)
      console.log('\n🔧 可能的原因:')
      console.log('   1. 拆散重做操作的MaterialUsage记录处理不当')
      console.log('   2. 销毁操作没有正确退回原材料')
      console.log('   3. 补货操作的MaterialUsage记录有误')
    } else {
      console.log('\n✅ 基于净消耗计算，当前库存35件是正确的')
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSKU20250901003Inventory()