import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixMaterialUsageCalculation() {
  try {
    console.log('🔧 修复原材料库存计算逻辑...')
    
    // 1. 查找所有有MaterialUsage记录的采购记录
    const purchasesWithUsage = await prisma.purchase.find_many({
      where: {
        materialUsages: {
          some: {}
        }
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
    
    console.log(`\n📦 找到 ${purchasesWithUsage.length} 个有MaterialUsage记录的采购记录`)
    
    // 2. 分析每个采购记录的MaterialUsage情况
    for (const purchase of purchasesWithUsage) {
      console.log(`\n🔍 分析采购记录: ${purchase.purchase_code}`)
      console.log(`   产品名称: ${purchase.product_name}`)
      
      const original_quantity = purchase.total_beads || purchase.piece_count || purchase.quantity || 0
      console.log(`   原始数量: ${original_quantity}件`)
      
      // 3. 分析MaterialUsage记录
      let positiveUsage = 0
      let negativeUsage = 0
      let totalUsage = 0
      
      console.log(`   MaterialUsage记录 (${purchase.materialUsages.length}条):`)
      purchase.materialUsages.for_each((usage, index) => {
        const usedBeads = usage.quantity_used_beads || 0
        const usedPieces = usage.quantity_used_pieces || 0
        const totalUsed = usedBeads + usedPieces
        
        console.log(`      ${index + 1}. SKU: ${usage.product.sku.sku_code}`)
        console.log(`         使用颗数: ${usedBeads}`)
        console.log(`         使用片数: ${usedPieces}`)
        console.log(`         总使用量: ${totalUsed}`)
        console.log(`         创建时间: ${usage.created_at.to_i_s_o_string().split('T')[0]}`)
        
        if (totalUsed > 0) {
          positiveUsage += totalUsed
        } else if (totalUsed < 0) {
          negativeUsage += Math.abs(totalUsed)
        }
        
        totalUsage += totalUsed
      })
      
      console.log(`\n   📊 使用量汇总:`)
      console.log(`      正向使用(消耗): ${positiveUsage}件`)
      console.log(`      负向使用(退回): ${negativeUsage}件`)
      console.log(`      净使用量: ${totalUsage}件`)
      
      // 4. 计算剩余库存
      const currentCalculation = originalQuantity - (positiveUsage + negativeUsage) // 当前错误的计算方式
      const correctCalculation = originalQuantity - totalUsage // 正确的计算方式
      
      console.log(`\n   📈 库存计算:`)
      console.log(`      当前计算方式: ${original_quantity} - ${positiveUsage + negativeUsage} = ${currentCalculation}件`)
      console.log(`      正确计算方式: ${original_quantity} - ${totalUsage} = ${correctCalculation}件`)
      
      if (currentCalculation !== correctCalculation) {
        console.log(`      🚨 发现差异: ${correctCalculation - currentCalculation}件`)
      } else {
        console.log(`      ✅ 计算正确`)
      }
    }
    
    // 5. 特别检查CG20250901590291
    console.log('\n🎯 特别检查CG20250901590291:')
    const targetPurchase = await prisma.purchase.find_first({
      where: {
        purchase_code: 'CG20250901590291'
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
    
    if (targetPurchase) {const original_quantity = targetPurchase.total_beads || targetPurchase.piece_count || targetPurchase.quantity || 0
      
      let totalUsage = 0
      targetPurchase.materialUsages.for_each(usage => {
        const usedBeads = usage.quantity_used_beads || 0
        const usedPieces = usage.quantity_used_pieces || 0
        totalUsage += (usedBeads + usedPieces)
      })
      
      const correctRemaining = originalQuantity - totalUsage
      
      console.log(`   原始数量: ${original_quantity}件`)
      console.log(`   净使用量: ${totalUsage}件`)
      console.log(`   正确剩余: ${correctRemaining}件`)
      console.log(`   当前显示: 35件`)
      
      if (correctRemaining !== 35) {
        console.log(`   🚨 需要修复: 差异 ${correctRemaining - 35}件`)
        
        // 6. 提供修复建议
        console.log('\n💡 修复建议:')
        console.log('   1. 修改calculateRemainingQuantity函数，正确处理负数MaterialUsage')
        console.log('   2. 负数MaterialUsage应该被视为退回到库存，而不是额外消耗')
        console.log('   3. 正确的计算公式: 剩余库存 = 原始数量 - 净使用量')
        console.log('   4. 净使用量 = 所有MaterialUsage记录的代数和（包括负数）')
      } else {
        console.log('   ✅ 当前库存显示正确')
      }
    }
    
    // 7. 检查系统中是否还有其他类似问题
    console.log('\n🔍 检查系统中的其他潜在问题:')
    const purchasesWithNegativeUsage = await prisma.purchase.find_many({
      where: {
        materialUsages: {
          some: {
            OR: [
              { quantity_used_beads: { lt: 0 } },
              { quantity_used_pieces: { lt: 0 } }
            ]
          }
        }
      },
      include: {
        materialUsages: {
          where: {
            OR: [
              { quantity_used_beads: { lt: 0 } },
              { quantity_used_pieces: { lt: 0 } }
            ]
          }
        }
      }
    })
    
    if (purchasesWithNegativeUsage.length > 0) {
      console.log(`   发现 ${purchasesWithNegativeUsage.length} 个采购记录有负数Material_usage:`)
      purchasesWithNegativeUsage.for_each((purchase, index) => {
        console.log(`   ${index + 1}. ${purchase.purchase_code} - ${purchase.product_name}`)
        console.log(`      负数记录数: ${purchase.materialUsages.length}条`)
      })
    } else {
      console.log('   ✅ 没有发现其他负数MaterialUsage记录')
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixMaterialUsageCalculation()