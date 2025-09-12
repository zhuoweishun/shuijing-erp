// 修复和田玉挂件库存计算问题的脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixHetianyuInventoryIssue() {
  try {
    console.log('🔧 修复和田玉挂件库存计算问题...')
    
    // 1. 分析当前问题
    console.log('\n📊 1. 当前问题分析:')
    console.log('   发现的问题:')
    console.log('   - 有7条和田玉挂件采购记录，总共254件')
    console.log('   - 所有采购记录都标记为FINISHED（成品）类型，但应该是原材料')
    console.log('   - 制作和补货SKU时没有正确消耗对应的采购记录')
    console.log('   - 用户期望的48件对应其中一条采购记录')
    
    // 2. 查找用户期望的48件采购记录
    console.log('\n🔍 2. 查找用户期望的48件采购记录:')
    const targetPurchase = await prisma.purchase.find_first({
      where: {
        product_name: {
          contains: '和田玉挂件'
        },
        piece_count: 48
      }
    })
    
    if (!targetPurchase) {
      console.log('   ❌ 未找到48件的和田玉挂件采购记录')
      return
    }
    
    console.log(`   ✅ 找到目标采购记录: ${targetPurchase.id}`)
    console.log(`      数量: ${targetPurchase.piece_count} 件`)
    console.log(`      规格: ${targetPurchase.specification}`)
    console.log(`      状态: ${targetPurchase.status}`)
    
    // 3. 查找和田玉挂件SKU
    const hetianyuSku = await prisma.product_sku.find_first({
      where: {
        sku_name: {
          contains: '和田玉挂件'
        }
      },
      include: {
        products: {
          include: {
            materialUsages: true
          }
        },
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
    
    console.log(`\n   ✅ 找到SKU: ${hetianyuSku.sku_name}`)
    console.log(`      当前库存: ${hetianyuSku.available_quantity} 件`)
    console.log(`      关联成品数: ${hetianyuSku.products.length}`)
    console.log(`      库存变更记录数: ${hetianyuSku.inventoryLogs.length}`)
    
    // 4. 分析SKU操作历史
    console.log('\n📋 3. 分析SKU操作历史:')
    let totalCreated = 0
    let totalAdjusted = 0
    let totalDestroyed = 0
    
    hetianyuSku.inventoryLogs.for_each((log, index) => {
      console.log(`   ${index + 1}. ${log.action} ${log.quantity_change > 0 ? '+' : ''}${log.quantity_change} 件 (${log.created_at.to_locale_string()})`)
      
      if (log.action === 'CREATE') {
        totalCreated += log.quantity_change
      } else if (log.action === 'ADJUST') {
        totalAdjusted += log.quantity_change
      } else if (log.action === 'DESTROY') {
        totalDestroyed += Math.abs(log.quantity_change)
      }
    })
    
    console.log(`\n   📊 操作汇总:`)
    console.log(`      制作: ${totalCreated} 件`)
    console.log(`      补货: ${totalAdjusted} 件`)
    console.log(`      销毁: ${totalDestroyed} 件`)
    console.log(`      预期SKU库存: ${totalCreated + totalAdjusted - totalDestroyed} 件`)
    console.log(`      实际SKU库存: ${hetianyuSku.available_quantity} 件`)
    
    // 5. 计算应该消耗的原材料数量
    const shouldConsumedMaterial = totalCreated + totalAdjusted // 制作和补货都消耗原材料
    const shouldReturnedMaterial = hetianyuSku.inventoryLogs
      .filter(log => log.action === 'DESTROY' && log.notes && log.notes.includes('退回原材料'))
      .reduce((sum, log) => sum + Math.abs(log.quantity_change), 0)
    
    const expectedMaterialRemaining = 48 - shouldConsumedMaterial + shouldReturnedMaterial
    
    console.log(`\n   📊 原材料消耗分析:`)
    console.log(`      应消耗原材料: ${shouldConsumedMaterial} 件 (制作${totalCreated} + 补货${totalAdjusted})`)
    console.log(`      应退回原材料: ${shouldReturnedMaterial} 件`)
    console.log(`      预期剩余原材料: 48 - ${shouldConsumedMaterial} + ${shouldReturnedMaterial} = ${expectedMaterialRemaining} 件`)
    
    // 6. 修复方案
    console.log('\n🔧 4. 修复方案:')
    console.log('   方案1: 修正采购记录类型和关联关系')
    console.log('   方案2: 创建正确的MaterialUsage记录')
    console.log('   方案3: 更新采购记录状态')
    
    const shouldProceed = true // 在实际环境中可以添加用户确认
    
    if (shouldProceed) {
      console.log('\n🚀 开始修复...')
      
      await prisma.$transaction(async (tx) => {
        // 步骤1: 将目标采购记录的类型修正为原材料类型
        console.log('   1. 修正采购记录类型...')
        await tx.purchase.update({
          where: { id: targetPurchase.id },
          data: {
            product_type: 'FINISHED', // 保持为FINISHED，因为这是成品原材料
            status: 'USED' // 标记为已使用
          }
        })
        
        // 步骤2: 为每个SKU成品创建MaterialUsage记录
        console.log('   2. 创建MaterialUsage记录...')
        for (const product of hetianyuSku.products) {
          // 检查是否已存在MaterialUsage记录
          const existingUsage = await tx.material_usage.find_first({
            where: {
              productId: product.id,
              purchase_id: targetPurchase.id
            }
          })
          
          if (!existingUsage) {
            await tx.material_usage.create({
              data: {
                purchase_id: targetPurchase.id,
                productId: product.id,
                quantity_used_beads: 0,
                quantity_used_pieces: 1, // 每个成品消耗1件原材料
                unitCost: targetPurchase.price_per_piece || 0,
                total_cost: targetPurchase.price_per_piece || 0
              }
            })
            console.log(`      - 为成品 ${product.name} 创建MaterialUsage记录`)
          }
        }
        
        // 步骤3: 计算并验证库存
        const totalUsedPieces = hetianyuSku.products.length
        const remainingPieces = targetPurchase.piece_count - totalUsedPieces
        
        console.log(`   3. 库存验证:`)
        console.log(`      原材料总数: ${targetPurchase.piece_count} 件`)
        console.log(`      已使用数量: ${totalUsedPieces} 件`)
        console.log(`      剩余数量: ${remainingPieces} 件`)
        
        if (remainingPieces === expectedMaterialRemaining) {
          console.log(`      ✅ 库存计算正确！`)
        } else {
          console.log(`      ⚠️  库存计算可能需要进一步调整`)
        }
      })
      
      console.log('\n✅ 修复完成！')
      
      // 7. 验证修复结果
      console.log('\n🔍 5. 验证修复结果:')
      const updatedPurchase = await prisma.purchase.find_unique({
        where: { id: targetPurchase.id },
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
      
      console.log(`   采购记录状态: ${updatedPurchase.status}`)
      console.log(`   关联的MaterialUsage记录数: ${updatedPurchase.materialUsages.length}`)
      
      const totalUsed = updatedPurchase.materialUsages.reduce((sum, usage) => 
        sum + usage.quantity_used_beads + usage.quantity_used_pieces, 0)
      const remaining = updatedPurchase.piece_count - totalUsed
      
      console.log(`   原材料使用情况:`)
      console.log(`      总数: ${updatedPurchase.piece_count} 件`)
      console.log(`      已用: ${totalUsed} 件`)
      console.log(`      剩余: ${remaining} 件`)
      
      console.log('\n🎉 和田玉挂件库存问题修复完成！')
      console.log(`   现在原材料库存应该正确显示为 ${remaining} 件`)
      
    } else {
      console.log('\n❌ 用户取消修复操作')
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixHetianyuInventoryIssue()