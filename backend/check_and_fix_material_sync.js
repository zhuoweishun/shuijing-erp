// 检查和修复所有材料数据同步问题
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkAndFixMaterialSync() {
  try {
    console.log('🔍 开始检查所有材料数据同步问题...')
    
    // 1. 查询所有materials记录，找出original_quantity为0但对应purchase有数量的记录
    const problematicMaterials = await prisma.material.findMany({
      where: {
        original_quantity: 0
      },
      include: {
        purchase: {
          select: {
            id: true,
            purchase_code: true,
            purchase_name: true,
            purchase_type: true,
            quantity: true,
            piece_count: true,
            total_beads: true,
            quality: true,
            bead_diameter: true,
            specification: true
          }
        }
      }
    })
    
    console.log(`📊 找到 ${problematicMaterials.length} 个original_quantity为0的材料记录`)
    
    let fixedCount = 0
    let skippedCount = 0
    
    for (const material of problematicMaterials) {
      const purchase = material.purchase
      
      if (!purchase) {
        console.log(`⚠️ 材料 ${material.material_name} (${material.id}) 没有对应的采购记录，跳过`)
        skippedCount++
        continue
      }
      
      // 计算正确的数量
      let correctOriginalQuantity = 0
      
      if (purchase.purchase_type === 'LOOSE_BEADS') {
        correctOriginalQuantity = purchase.piece_count || 0
      } else if (purchase.purchase_type === 'BRACELET') {
        correctOriginalQuantity = purchase.total_beads || purchase.piece_count || 0
      } else if (purchase.purchase_type === 'ACCESSORIES') {
        correctOriginalQuantity = purchase.piece_count || 0
      } else if (purchase.purchase_type === 'FINISHED_MATERIAL') {
        correctOriginalQuantity = purchase.piece_count || 0
      } else {
        correctOriginalQuantity = purchase.quantity || purchase.piece_count || 0
      }
      
      if (correctOriginalQuantity > 0) {
        console.log(`🔧 修复材料: ${material.material_name} (${purchase.purchase_code})`)
        console.log(`   - 类型: ${purchase.purchase_type}`)
        console.log(`   - 原始数量: ${material.original_quantity} -> ${correctOriginalQuantity}`)
        console.log(`   - 剩余数量: ${material.remaining_quantity} -> ${correctOriginalQuantity - material.used_quantity}`)
        
        // 更新材料记录
        await prisma.material.update({
          where: {
            id: material.id
          },
          data: {
            original_quantity: correctOriginalQuantity,
            remaining_quantity: correctOriginalQuantity - material.used_quantity
          }
        })
        
        fixedCount++
      } else {
        console.log(`⚠️ 材料 ${material.material_name} (${purchase.purchase_code}) 的采购记录中也没有有效数量，跳过`)
        skippedCount++
      }
    }
    
    console.log(`\n📈 修复统计:`)
    console.log(`   - 总检查记录: ${problematicMaterials.length}`)
    console.log(`   - 成功修复: ${fixedCount}`)
    console.log(`   - 跳过记录: ${skippedCount}`)
    
    // 2. 验证修复结果
    console.log('\n🔍 验证修复结果...')
    
    const remainingProblems = await prisma.material.count({
      where: {
        AND: [
          { original_quantity: 0 },
          {
            purchase: {
              OR: [
                { piece_count: { gt: 0 } },
                { total_beads: { gt: 0 } },
                { quantity: { gt: 0 } }
              ]
            }
          }
        ]
      }
    })
    
    if (remainingProblems === 0) {
      console.log('✅ 所有数据同步问题已修复！')
    } else {
      console.log(`⚠️ 仍有 ${remainingProblems} 个记录存在同步问题，可能需要手动检查`)
    }
    
    // 3. 显示修复后的库存统计
    console.log('\n📊 修复后的库存统计:')
    
    const inventoryStats = await prisma.material.groupBy({
      by: ['material_type'],
      _count: {
        id: true
      },
      _sum: {
        remaining_quantity: true
      },
      where: {
        remaining_quantity: {
          gt: 0
        }
      }
    })
    
    inventoryStats.forEach(stat => {
      console.log(`   - ${stat.material_type}: ${stat._count.id} 种材料，总剩余 ${stat._sum.remaining_quantity} 个`)
    })
    
  } catch (error) {
    console.error('❌ 检查修复过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 执行检查修复
checkAndFixMaterialSync()
  .then(() => {
    console.log('\n🏁 检查修复脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 检查修复脚本执行失败:', error)
    process.exit(1)
  })