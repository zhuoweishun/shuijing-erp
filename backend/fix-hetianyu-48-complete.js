// 完整修复48件和田玉挂件采购记录的MaterialUsage问题
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixHetianyu48Complete() {
  try {
    console.log('🔧 完整修复48件和田玉挂件采购记录的MaterialUsage问题...')
    
    // 1. 查找48件的和田玉挂件采购记录
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
      console.log('❌ 未找到48件的和田玉挂件采购记录')
      return
    }
    
    console.log(`✅ 找到目标采购记录: ${targetPurchase.id}`)
    
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
      console.log('❌ 未找到和田玉挂件SKU')
      return
    }
    
    // 3. 计算正确的原材料消耗量
    let shouldConsumedMaterial = 0
    let shouldReturnedMaterial = 0
    
    console.log('\n📋 SKU操作历史分析:')
    hetianyuSku.inventoryLogs.for_each((log, index) => {
      console.log(`${index + 1}. ${log.action} ${log.quantity_change > 0 ? '+' : ''}${log.quantity_change} 件`)
      
      if (log.action === 'CREATE') {
        shouldConsumedMaterial += log.quantity_change
      } else if (log.action === 'ADJUST' && log.quantity_change > 0) {
        shouldConsumedMaterial += log.quantity_change
      } else if (log.action === 'DESTROY') {
        // 销毁操作都应该退回原材料（赠送和拆散重做）
        shouldReturnedMaterial += Math.abs(log.quantity_change)
      }
    })
    
    const netMaterialConsumption = shouldConsumedMaterial - shouldReturnedMaterial
    const expectedRemainingMaterial = 48 - netMaterialConsumption
    
    console.log(`\n📊 正确的原材料消耗计算:`)
    console.log(`应消耗: ${shouldConsumedMaterial} 件 (制作1 + 补货2 + 补货3)`)
    console.log(`应退回: ${shouldReturnedMaterial} 件 (赠送销毁1 + 拆散重做1)`)
    console.log(`净消耗: ${netMaterialConsumption} 件`)
    console.log(`预期剩余: 48 - ${netMaterialConsumption} = ${expectedRemainingMaterial} 件`)
    
    // 4. 当前状态
    const currentTotalUsed = targetPurchase.materialUsages.reduce((sum, usage) => sum + usage.quantity_used_beads + usage.quantity_used_pieces, 0)
    const currentRemaining = targetPurchase.piece_count - currentTotalUsed
    
    console.log(`\n📊 当前状态:`)
    console.log(`当前已使用: ${currentTotalUsed} 件`)
    console.log(`当前剩余: ${currentRemaining} 件`)
    console.log(`目标剩余: ${expectedRemainingMaterial} 件`)
    console.log(`需要调整: ${currentTotalUsed - netMaterialConsumption} 件`)
    
    if (currentRemaining === expectedRemainingMaterial) {
      console.log('✅ MaterialUsage记录已经正确，无需修复')
      return
    }
    
    // 5. 执行完整修复
    console.log(`\n🚀 执行完整修复...`)
    
    await prisma.$transaction(async (tx) => {
      console.log('开始事务处理...')
      
      // 删除所有现有的MaterialUsage记录
      console.log('1. 删除所有现有的MaterialUsage记录...')
      await tx.material_usage.delete_many({
        where: {
          purchase_id: targetPurchase.id
        }
      })
      
      // 重新创建正确的MaterialUsage记录
      console.log('2. 重新创建正确的MaterialUsage记录...')
      
      // 为每个应该消耗原材料的操作创建记录
      const skuProducts = await tx.product.find_many({
        where: { sku_id: hetianyuSku.id
        },
        orderBy: {
          created_at: 'asc'
        }
      })
      
      if (skuProducts.length > 0) {
        // 只为第一个成品创建MaterialUsage记录，消耗正确的数量
        await tx.material_usage.create({
          data: {
            purchase_id: targetPurchase.id,
            productId: skuProducts[0].id,
            quantity_used_beads: 0,
            quantity_used_pieces: netMaterialConsumption, // 使用净消耗量
            unitCost: targetPurchase.price_per_piece || 0,
            total_cost: (targetPurchase.price_per_piece || 0) * netMaterialConsumption
          }
        })
        
        console.log(`   ✅ 为成品 ${skuProducts[0].name} 创建MaterialUsage记录，消耗 ${netMaterialConsumption} 件原材料`)
      }
      
      console.log('事务处理完成')
    })
    
    // 6. 验证修复结果
    console.log(`\n🔍 验证修复结果:`)
    const updatedPurchase = await prisma.purchase.find_unique({
      where: { id: targetPurchase.id },
      include: {
        materialUsages: true
      }
    })
    
    const newTotalUsed = updatedPurchase.materialUsages.reduce((sum, usage) => sum + usage.quantity_used_beads + usage.quantity_used_pieces, 0)
    const newRemaining = updatedPurchase.piece_count - newTotalUsed
    
    console.log(`修复后已使用: ${newTotalUsed} 件`)
    console.log(`修复后剩余: ${newRemaining} 件`)
    console.log(`目标剩余: ${expectedRemainingMaterial} 件`)
    
    if (newRemaining === expectedRemainingMaterial) {
      console.log(`✅ 修复成功！原材料库存现在正确显示为 ${newRemaining} 件`)
      
      // 更新采购记录状态
      await prisma.purchase.update({
        where: { id: targetPurchase.id },
        data: { status: 'USED' }
      })
      
      console.log(`\n🎉 和田玉挂件48件采购记录完整修复成功！`)
      console.log(`📊 最终状态:`)
      console.log(`   - 采购总量: 48 件`)
      console.log(`   - 已使用量: ${newTotalUsed} 件`)
      console.log(`   - 剩余库存: ${newRemaining} 件`)
      console.log(`   - SKU库存: ${hetianyuSku.available_quantity} 件`)
      
    } else {
      console.log(`❌ 修复后仍有差异: 实际${newRemaining}件，期望${expectedRemainingMaterial}件`)
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixHetianyu48Complete()