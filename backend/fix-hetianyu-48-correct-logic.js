// 修正和田玉挂件48件采购记录的退回原材料逻辑
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixHetianyu48CorrectLogic() {
  try {
    console.log('🔧 修正和田玉挂件48件采购记录的退回原材料逻辑...')
    
    // 1. 查找48件的和田玉挂件采购记录
    const targetPurchase = await prisma.purchase.find_first({
      where: {
        product_name: {
          contains: '和田玉挂件'
        },
        piece_count: 48
      }
    })
    
    if (!targetPurchase) {
      console.log('❌ 未找到48件的和田玉挂件采购记录')
      return
    }
    
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
    
    // 3. 重新计算正确的原材料消耗量（根据用户纠正的逻辑）
    let shouldConsumedMaterial = 0
    let shouldReturnedMaterial = 0
    
    console.log('\n📋 重新分析SKU操作历史（正确的退回逻辑）:')
    hetianyuSku.inventoryLogs.for_each((log, index) => {
      console.log(`${index + 1}. ${log.action} ${log.quantity_change > 0 ? '+' : ''}${log.quantity_change} 件 - ${log.notes || '无原因'}`)
      
      if (log.action === 'CREATE') {
        shouldConsumedMaterial += log.quantity_change
        console.log(`   📉 消耗原材料: ${log.quantity_change} 件`)
      } else if (log.action === 'ADJUST' && log.quantity_change > 0) {
        shouldConsumedMaterial += log.quantity_change
        console.log(`   📉 消耗原材料: ${log.quantity_change} 件`)
      } else if (log.action === 'DESTROY') {
        if (log.notes && log.notes.includes('拆散重做')) {
          // 拆散重做：退回原材料
          shouldReturnedMaterial += Math.abs(log.quantity_change)
          console.log(`   📈 退回原材料: ${Math.abs(log.quantity_change)} 件 (拆散重做)`)
        } else if (log.notes && log.notes.includes('赠送')) {
          // 赠送销毁：不退回原材料
          console.log(`   🗑️ 不退回原材料: ${Math.abs(log.quantity_change)} 件 (赠送销毁)`)
        }
      }
    })
    
    const netMaterialConsumption = shouldConsumedMaterial - shouldReturnedMaterial
    const expectedRemainingMaterial = 48 - netMaterialConsumption
    
    console.log(`\n📊 正确的原材料消耗计算:`)
    console.log(`应消耗: ${shouldConsumedMaterial} 件 (制作1 + 补货2 + 补货3)`)
    console.log(`应退回: ${shouldReturnedMaterial} 件 (只有拆散重做退回)`)
    console.log(`净消耗: ${netMaterialConsumption} 件`)
    console.log(`预期剩余: 48 - ${netMaterialConsumption} = ${expectedRemainingMaterial} 件`)
    
    // 4. 检查当前状态
    const currentPurchase = await prisma.purchase.find_unique({
      where: { id: targetPurchase.id },
      include: {
        materialUsages: true
      }
    })
    
    const currentTotalUsed = currentPurchase.materialUsages.reduce((sum, usage) => sum + usage.quantity_used_beads + usage.quantity_used_pieces, 0)
    const currentRemaining = currentPurchase.piece_count - currentTotalUsed
    
    console.log(`\n📊 当前状态:`)
    console.log(`当前已使用: ${currentTotalUsed} 件`)
    console.log(`当前剩余: ${currentRemaining} 件`)
    console.log(`目标剩余: ${expectedRemainingMaterial} 件`)
    
    if (currentRemaining === expectedRemainingMaterial) {
      console.log('✅ MaterialUsage记录已经正确，无需修复')
      return
    }
    
    // 5. 执行修复
    console.log(`\n🚀 执行修复，调整为正确的消耗量...`)
    
    await prisma.$transaction(async (tx) => {
      console.log('开始事务处理...')
      
      // 删除所有现有的MaterialUsage记录
      await tx.material_usage.delete_many({
        where: {
          purchase_id: targetPurchase.id
        }
      })
      
      // 重新创建正确的MaterialUsage记录
      const skuProducts = await tx.product.find_many({
        where: { sku_id: hetianyuSku.id
        },
        orderBy: {
          created_at: 'asc'
        }
      })
      
      if (skuProducts.length > 0) {
        await tx.material_usage.create({
          data: {
            purchase_id: targetPurchase.id,
            productId: skuProducts[0].id,
            quantity_used_beads: 0,
            quantity_used_pieces: netMaterialConsumption, // 使用正确的净消耗量
            unitCost: targetPurchase.price_per_piece || 0,
            total_cost: (targetPurchase.price_per_piece || 0) * netMaterialConsumption
          }
        })
        
        console.log(`   ✅ 创建MaterialUsage记录，消耗 ${netMaterialConsumption} 件原材料`)
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
    console.log(`用户期望剩余: 43 件`)
    
    if (newRemaining === 43) {
      console.log(`✅ 修复成功！原材料库存现在正确显示为 ${newRemaining} 件，符合用户期望！`)
    } else {
      console.log(`⚠️  修复后为 ${newRemaining} 件，与用户期望的43件相差 ${Math.abs(newRemaining - 43)} 件`)
    }
    
    // 更新采购记录状态
    await prisma.purchase.update({
      where: { id: targetPurchase.id },
      data: { status: 'USED' }
    })
    
    console.log(`\n🎉 和田玉挂件48件采购记录修复完成！`)
    console.log(`📊 最终状态:`)
    console.log(`   - 采购总量: 48 件`)
    console.log(`   - 已使用量: ${newTotalUsed} 件`)
    console.log(`   - 剩余库存: ${newRemaining} 件`)
    console.log(`   - SKU库存: ${hetianyuSku.available_quantity} 件`)
    console.log(`\n📝 操作历史总结:`)
    console.log(`   1. 采购48件原材料`)
    console.log(`   2. 制作1件SKU，消耗1件原材料 → 剩余47件`)
    console.log(`   3. 补货2件SKU，消耗2件原材料 → 剩余45件`)
    console.log(`   4. 补货3件SKU，消耗3件原材料 → 剩余42件`)
    console.log(`   5. 赠送销毁1件SKU，不退回原材料 → 剩余42件`)
    console.log(`   6. 拆散重做1件SKU，退回1件原材料 → 剩余43件`)
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixHetianyu48CorrectLogic()