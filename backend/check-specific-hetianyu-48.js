// 检查特定的48件和田玉挂件采购记录的库存问题
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSpecificHetianyu48() {
  try {
    console.log('🔍 检查特定的48件和田玉挂件采购记录的库存问题...')
    
    // 1. 查找48件的和田玉挂件采购记录
    console.log('\n📦 1. 查找48件的和田玉挂件采购记录:')
    const targetPurchase = await prisma.purchase.find_first({
      where: {
        product_name: {
          contains: '和田玉挂件'
        },
        piece_count: 48
      },
      include: {
        materialUsages: {
          include: {
            product: {
              include: {
                sku: true
              }
            }
          }
        }
      }
    })
    
    if (!targetPurchase) {
      console.log('   ❌ 未找到48件的和田玉挂件采购记录')
      return
    }
    
    console.log(`   ✅ 找到目标采购记录:`)
    console.log(`      ID: ${targetPurchase.id}`)
    console.log(`      产品名称: ${targetPurchase.product_name}`)
    console.log(`      数量: ${targetPurchase.piece_count} 件`)
    console.log(`      规格: ${targetPurchase.specification}`)
    console.log(`      状态: ${targetPurchase.status}`)
    console.log(`      创建时间: ${targetPurchase.created_at.to_locale_string()}`)
    
    // 2. 检查这条采购记录的使用情况
    console.log('\n🔍 2. 检查采购记录的使用情况:')
    let totalUsedFromThisPurchase = 0
    
    if (targetPurchase.materialUsages.length > 0) {
      console.log(`   已用于制作 ${targetPurchase.materialUsages.length} 个成品:`)
      targetPurchase.materialUsages.for_each((usage, index) => {
        const usedQty = usage.quantity_used_beads + usage.quantity_used_pieces
        totalUsedFromThisPurchase += usedQty
        console.log(`   ${index + 1}. 成品: ${usage.product.name}`)
        console.log(`      SKU: ${usage.product.sku ? usage.product.sku.sku_name : '无SKU'}`)
        console.log(`      使用数量: ${usedQty} 件`)
      })
    } else {
      console.log('   ⚠️  该采购记录未用于制作任何成品')
    }
    
    const remainingFromThisPurchase = targetPurchase.piece_count - totalUsedFromThisPurchase
    console.log(`\n   📊 该采购记录库存状况:`)
    console.log(`      采购总数: ${targetPurchase.piece_count} 件`)
    console.log(`      已使用: ${totalUsedFromThisPurchase} 件`)
    console.log(`      剩余: ${remainingFromThisPurchase} 件`)
    
    // 3. 查找和田玉挂件SKU的操作历史
    console.log('\n🏷️ 3. 查找和田玉挂件SKU的操作历史:')
    const hetianyuSku = await prisma.product_sku.find_first({
      where: {
        sku_name: {
          contains: '和田玉挂件'
        }
      }
    })
    
    if (!hetianyuSku) {
      console.log('   ❌ 未找到和田玉挂件SKU')
      return
    }
    
    const inventoryLogs = await prisma.sku_inventory_log.find_many({
      where: { sku_id: hetianyuSku.id
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    console.log(`   ✅ 找到SKU: ${hetianyuSku.sku_name}`)
    console.log(`   📊 当前SKU库存: ${hetianyuSku.available_quantity} 件`)
    console.log(`   📋 SKU操作历史 (${inventoryLogs.length} 条记录):`)
    
    // 4. 模拟用户描述的操作对原材料库存的影响
    console.log('\n👤 4. 根据用户描述模拟原材料库存变化:')
    let materialInventory = 48 // 初始采购48件
    console.log(`   初始状态: 采购 ${materialInventory} 件原材料`)
    
    inventoryLogs.for_each((log, index) => {
      console.log(`\n   操作 ${index + 1}: ${log.action} ${log.quantity_change > 0 ? '+' : ''}${log.quantity_change} 件SKU`)
      console.log(`      时间: ${log.created_at.to_locale_string()}`)
      console.log(`      原因: ${log.notes || '无'}`)
      
      if (log.action === 'CREATE') {
        // 制作SKU消耗原材料
        materialInventory -= log.quantity_change
        console.log(`      📉 消耗原材料: ${log.quantity_change} 件`)
      } else if (log.action === 'ADJUST' && log.quantity_change > 0) {
        // 补货消耗原材料
        materialInventory -= log.quantity_change
        console.log(`      📉 补货消耗原材料: ${log.quantity_change} 件`)
      } else if (log.action === 'DESTROY') {
        // 检查是否退回原材料
        if (log.notes && (log.notes.includes('赠送') || log.notes.includes('退回原材料'))) {
          materialInventory += Math.abs(log.quantity_change)
          console.log(`      📈 退回原材料: ${Math.abs(log.quantity_change)} 件 (${log.notes.includes('赠送') ? '赠送销毁' : '拆散重做'})`)
        } else {
          console.log(`      🗑️ 销毁，未退回原材料`)
        }
      }
      
      console.log(`      📊 原材料库存: ${materialInventory} 件`)
    })
    
    // 5. 对比分析
    console.log('\n📊 5. 对比分析:')
    console.log('\n   用户期望的操作流程:')
    console.log('   1. 采购48件原材料 → 原材料库存: 48件')
    console.log('   2. 制作1件SKU → 原材料库存: 47件')
    console.log('   3. 补货5件SKU → 原材料库存: 42件')
    console.log('   4. 销毁赠送1件SKU(退回原材料) → 原材料库存: 43件')
    console.log('   5. 拆散重做1件SKU → 原材料库存: 43件')
    console.log('   6. 预期最终原材料库存: 43件')
    
    console.log('\n   实际情况:')
    console.log(`   - 该采购记录实际剩余: ${remainingFromThisPurchase} 件`)
    console.log(`   - 根据SKU操作计算的原材料库存: ${materialInventory} 件`)
    console.log(`   - SKU当前库存: ${hetianyuSku.available_quantity} 件`)
    
    // 6. 问题诊断
    console.log('\n🔍 6. 问题诊断:')
    
    if (remainingFromThisPurchase !== 43) {
      console.log(`   ❌ 采购记录剩余数量不匹配: 期望43件，实际${remainingFromThisPurchase}件`)
      
      if (totalUsedFromThisPurchase === 0) {
        console.log('   🚨 关键问题: 该采购记录没有任何MaterialUsage记录！')
        console.log('   💡 这意味着制作和补货SKU时没有正确关联和消耗这条采购记录')
      } else {
        console.log(`   📝 该采购记录已被使用 ${totalUsedFromThisPurchase} 件，但数量不符合预期`)
      }
    }
    
    if (materialInventory !== 43) {
      console.log(`   ❌ 根据SKU操作计算的原材料库存不匹配: 期望43件，计算得${materialInventory}件`)
    }
    
    // 7. 修复建议
    console.log('\n💡 7. 修复建议:')
    
    if (totalUsedFromThisPurchase === 0) {
      console.log('   🔧 需要创建MaterialUsage记录，将SKU制作和补货操作关联到这条采购记录')
      console.log('   📝 具体步骤:')
      console.log('      1. 为制作的1件SKU创建MaterialUsage记录，消耗1件原材料')
      console.log('      2. 为补货的5件SKU创建MaterialUsage记录，消耗5件原材料')
      console.log('      3. 更新采购记录状态为USED')
      console.log('      4. 验证最终原材料库存为43件')
    } else {
      console.log('   🔧 需要调整现有的MaterialUsage记录，确保消耗数量正确')
    }
    
    console.log('\n   ⚠️  注意: 销毁操作的退回原材料逻辑需要特别检查')
    console.log('   - 赠送销毁: 应该退回原材料到库存')
    console.log('   - 拆散重做: 应该先退回原材料，再消耗原材料制作新SKU')
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSpecificHetianyu48()