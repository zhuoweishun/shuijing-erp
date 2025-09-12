// 修复48件和田玉挂件采购记录的MaterialUsage问题
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixHetianyu48MaterialUsage() {
  try {
    console.log('🔧 修复48件和田玉挂件采购记录的MaterialUsage问题...')
    
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
    
    console.log(`   ✅ 找到目标采购记录: ${targetPurchase.id}`)
    console.log(`   📊 当前状态: 采购${targetPurchase.piece_count}件，已使用${targetPurchase.materialUsages.reduce((sum, usage) => sum + usage.quantity_used_beads + usage.quantity_used_pieces, 0)}件`)
    
    // 2. 查找和田玉挂件SKU
    const hetianyuSku = await prisma.product_sku.find_first({
      where: {
        sku_name: {
          contains: '和田玉挂件'
        }
      },
      include: {
        inventoryLogs: {
          orderBy: {
            created_at: 'asc'
          }
        }
      }
    })
    
    if (!hetianyuSku) {
      console.log('   ❌ 未找到和田玉挂件SKU')
      return
    }
    
    console.log(`\n🏷️ 2. SKU操作历史分析:`)
    console.log(`   SKU: ${hetianyuSku.sku_name}`)
    console.log(`   当前库存: ${hetianyuSku.available_quantity} 件`)
    
    // 3. 分析应该消耗的原材料数量
    let shouldConsumedMaterial = 0
    let shouldReturnedMaterial = 0
    
    console.log(`\n📋 3. 分析应该消耗的原材料数量:`)
    hetianyuSku.inventoryLogs.for_each((log, index) => {
      console.log(`   ${index + 1}. ${log.action} ${log.quantity_change > 0 ? '+' : ''}${log.quantity_change} 件 (${log.created_at.to_locale_string()})`)
      
      if (log.action === 'CREATE') {
        shouldConsumedMaterial += log.quantity_change
        console.log(`      应消耗原材料: ${log.quantity_change} 件`)
      } else if (log.action === 'ADJUST' && log.quantity_change > 0) {
        shouldConsumedMaterial += log.quantity_change
        console.log(`      应消耗原材料: ${log.quantity_change} 件`)
      } else if (log.action === 'DESTROY') {
        if (log.notes && log.notes.includes('赠送')) {
          shouldReturnedMaterial += Math.abs(log.quantity_change)
          console.log(`      应退回原材料: ${Math.abs(log.quantity_change)} 件 (赠送销毁)`)
        } else if (log.notes && log.notes.includes('拆散重做')) {
          shouldReturnedMaterial += Math.abs(log.quantity_change)
          console.log(`      应退回原材料: ${Math.abs(log.quantity_change)} 件 (拆散重做)`)
        }
      }
    })
    
    const netMaterialConsumption = shouldConsumedMaterial - shouldReturnedMaterial
    const expectedRemainingMaterial = 48 - netMaterialConsumption
    
    console.log(`\n   📊 原材料消耗汇总:`)
    console.log(`      应消耗总量: ${shouldConsumedMaterial} 件`)
    console.log(`      应退回总量: ${shouldReturnedMaterial} 件`)
    console.log(`      净消耗量: ${netMaterialConsumption} 件`)
    console.log(`      预期剩余: 48 - ${netMaterialConsumption} = ${expectedRemainingMaterial} 件`)
    
    // 4. 当前MaterialUsage记录分析
    console.log(`\n🔍 4. 当前MaterialUsage记录分析:`)
    const currentTotalUsed = targetPurchase.materialUsages.reduce((sum, usage) => sum + usage.quantity_used_beads + usage.quantity_used_pieces, 0)
    const currentRemaining = targetPurchase.piece_count - currentTotalUsed
    
    console.log(`   当前已使用: ${currentTotalUsed} 件`)
    console.log(`   当前剩余: ${currentRemaining} 件`)
    console.log(`   需要调整: ${currentTotalUsed - netMaterialConsumption} 件`)
    
    if (currentRemaining === expectedRemainingMaterial) {
      console.log(`   ✅ MaterialUsage记录正确，无需修复`)
      return
    }
    
    // 5. 执行修复
    console.log(`\n🚀 5. 执行修复操作:`)
    console.log(`   目标: 将已使用量从 ${currentTotalUsed} 件调整为 ${netMaterialConsumption} 件`)
    
    const shouldProceed = true // 在实际环境中可以添加用户确认
    
    if (shouldProceed) {
      await prisma.$transaction(async (tx) => {
        console.log('   开始事务处理...')
        
        // 方案：删除多余的MaterialUsage记录或调整数量
        const excessUsage = currentTotalUsed - netMaterialConsumption
        
        if (excessUsage > 0) {
          console.log(`   需要减少 ${excessUsage} 件的使用量`)
          
          // 找到最后创建的MaterialUsage记录进行调整
          const lastUsage = targetPurchase.materialUsages[targetPurchase.materialUsages.length - 1]
          
          if (lastUsage) {
            const currentUsageQty = lastUsage.quantity_used_beads + lastUsage.quantity_used_pieces
            
            if (currentUsageQty >= excessUsage) {
              // 调整最后一个记录的数量
              const newQty = currentUsageQty - excessUsage
              
              if (newQty > 0) {
                await tx.material_usage.update({
                  where: { id: lastUsage.id },
                  data: {
                    quantity_used_pieces: newQty,
                    quantity_used_beads: 0
                  }
                })
                console.log(`   ✅ 调整MaterialUsage记录 ${lastUsage.id}: ${currentUsageQty} → ${newQty} 件`)
              } else {
                await tx.material_usage.delete({
                  where: { id: lastUsage.id }
                })
                console.log(`   ✅ 删除MaterialUsage记录 ${lastUsage.id}`)
              }
            } else {
              console.log(`   ⚠️  需要调整多个MaterialUsage记录，当前只处理最后一个`)
            }
          }
        }
        
        console.log('   事务处理完成')
      })
      
      // 6. 验证修复结果
      console.log(`\n🔍 6. 验证修复结果:`)
      const updatedPurchase = await prisma.purchase.find_unique({
        where: { id: targetPurchase.id },
        include: {
          materialUsages: true
        }
      })
      
      const newTotalUsed = updatedPurchase.materialUsages.reduce((sum, usage) => sum + usage.quantity_used_beads + usage.quantity_used_pieces, 0)
      const newRemaining = updatedPurchase.piece_count - newTotalUsed
      
      console.log(`   修复后已使用: ${newTotalUsed} 件`)
      console.log(`   修复后剩余: ${newRemaining} 件`)
      
      if (newRemaining === expectedRemainingMaterial) {
        console.log(`   ✅ 修复成功！原材料库存现在正确显示为 ${newRemaining} 件`)
      } else {
        console.log(`   ⚠️  修复后仍有差异，可能需要进一步调整`)
      }
      
      // 7. 更新采购记录状态
      if (newTotalUsed > 0) {
        await prisma.purchase.update({
          where: { id: targetPurchase.id },
          data: { status: 'USED' }
        })
        console.log(`   ✅ 更新采购记录状态为 USED`)
      }
      
      console.log(`\n🎉 和田玉挂件48件采购记录修复完成！`)
      
    } else {
      console.log(`\n❌ 用户取消修复操作`)
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixHetianyu48MaterialUsage()