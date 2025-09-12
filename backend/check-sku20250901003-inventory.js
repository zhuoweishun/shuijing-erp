import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSKU20250901003Inventory() {
  try {
    console.log('🔍 分析SKU20250901003的库存情况...')
    
    // 1. 查找SKU20250901003
    const sku = await prisma.product_sku.find_first({
      where: {
        sku_code: 'SKU20250901003'
      },
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: {
                  include: {
                    supplier: true
                  }
                }
              }
            }
          }
        },
        // inventoryLogs will be queried separately
      }
    })
    
    if (!sku) {
      console.log('❌ 未找到SKU20250901003')
      return
    }
    
    console.log(`\n✅ 找到SKU: ${sku.sku_name}`)
    console.log(`📊 当前库存: 总量=${sku.total_quantity}, 可售=${sku.available_quantity}`)
    
    // 单独查询库存日志
    const inventoryLogs = await prisma.sku_inventory_log.find_many({
      where: { sku_id: sku.id
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    // 2. 查找原材料CG20250901590291的采购记录
    console.log('\n🔍 查找原材料CG20250901590291的采购记录...')
    const materialPurchases = await prisma.purchase.find_many({
      where: {
        purchase_code: 'CG20250901590291'
      },
      include: {
        supplier: true,
        materialUsages: {
          include: {
            product: {
              include: {
                sku: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    console.log(`\n📦 原材料CG20250901590291采购记录 (${materialPurchases.length}条):`)
    let totalPurchased = 0
    materialPurchases.for_each((purchase, index) => {
      const quantity = purchase.total_beads || purchase.piece_count || purchase.quantity || 0
      totalPurchased += quantity
      console.log(`   ${index + 1}. 采购时间: ${purchase.created_at.to_i_s_o_string().split('T')[0]}`)
      console.log(`      数量: ${quantity} ${purchase.unit}`)
      console.log(`      供应商: ${purchase.supplier?.name || '未知'}`)
      console.log(`      使用记录: ${purchase.materialUsages.length}条`)
    })
    console.log(`\n📊 原材料总采购量: ${totalPurchased}件`)
    
    // 3. 分析SKU的所有操作历史
    console.log('\n📋 SKU操作历史分析:')
    let materialConsumed = 0
    let materialReturned = 0
    
    inventoryLogs.for_each((log, index) => {
      console.log(`\n   ${index + 1}. ${log.action} - ${log.created_at.to_i_s_o_string().split('T')[0]}`)
      console.log(`      数量变化: ${log.quantity_change}`)
      console.log(`      原因: ${log.reason || '无'}`)
      console.log(`      备注: ${log.notes || '无'}`)
      
      // 根据操作类型分析原材料消耗
      if (log.action === 'CREATE' || log.action === 'RESTOCK') {
        // 制作或补货消耗原材料
        const consumedForThisAction = Math.abs(log.quantity_change) * 1 // 假设每个SKU消耗1个原材料
        materialConsumed += consumedForThisAction
        console.log(`      → 消耗原材料: ${consumedForThisAction}件`)
      } else if (log.action === 'DESTROY') {
        // 销毁可能退回原材料
        const destroyedQuantity = Math.abs(log.quantity_change)
        console.log(`      → 销毁数量: ${destroyedQuantity}件`)
        
        // 检查是否有退回原材料的记录
        if (log.notes && log.notes.includes('退回')) {
          // 从备注中提取退回数量
          const returnMatch = log.notes.match(/退回(\d+)/)
          if (returnMatch) {
            const returnedQuantity = parseInt(returnMatch[1])
            materialReturned += returnedQuantity
            console.log(`      → 退回原材料: ${returnedQuantity}件`)
          }
        } else if (log.notes && (log.notes.includes('赠送') || log.notes.includes('不退回'))) {
          console.log(`      → 不退回原材料 (赠送销毁)`)
        } else {
          // 默认情况，需要检查具体的销毁记录
          console.log(`      → 销毁方式未明确，需要进一步确认`)
        }
      }
    })
    
    // 4. 分析MaterialUsage记录
    console.log('\n🔧 MaterialUsage记录分析:')
    let totalMaterialUsageRecorded = 0
    sku.products.for_each((product, productIndex) => {
      console.log(`\n   成品 ${productIndex + 1}:`)
      product.materialUsages.for_each((usage, usageIndex) => {const used_quantity = usage.quantity_used_beads || usage.quantity_used_pieces || 0
        totalMaterialUsageRecorded += used_quantity
        console.log(`      MaterialUsage ${usageIndex + 1}:`)
        console.log(`         采购记录: ${usage.purchase.purchase_code}`)
        console.log(`         使用数量: ${used_quantity}件`)
        console.log(`         创建时间: ${usage.created_at.to_i_s_o_string().split('T')[0]}`)
      })
    })
    
    // 5. 计算理论剩余库存
    console.log('\n📊 库存计算分析:')
    console.log(`   原材料总采购: ${totalPurchased}件`)
    console.log(`   MaterialUsage记录的消耗: ${totalMaterialUsageRecorded}件`)
    console.log(`   操作历史推算的消耗: ${materialConsumed}件`)
    console.log(`   销毁退回的原材料: ${materialReturned}件`)
    
    const theoreticalRemaining1 = totalPurchased - totalMaterialUsageRecorded + materialReturned
    const theoreticalRemaining2 = totalPurchased - materialConsumed + materialReturned
    
    console.log(`\n   理论剩余库存 (基于MaterialUsage): ${theoreticalRemaining1}件`)
    console.log(`   理论剩余库存 (基于操作历史): ${theoreticalRemaining2}件`)
    console.log(`   当前系统显示剩余: 35件`)
    
    // 6. 检查当前原材料库存
    console.log('\n🔍 检查当前原材料库存状态:')
    for (const purchase of materialPurchases) {
      const totalUsage = await prisma.material_usage.aggregate({
        where: { purchase_id: purchase.id },
        Sum: {
          quantity_used_beads: true,
          quantity_used_pieces: true
        }
      })
      
      const used = (totalUsage.Sum.quantity_used_beads || 0) + (totalUsage.Sum.quantity_used_pieces || 0)
      const purchased = purchase.total_beads || purchase.piece_count || purchase.quantity || 0
      const remaining = purchased - used
      
      console.log(`   采购记录 ${purchase.purchase_code}:`)
      console.log(`      采购数量: ${purchased}件`)
      console.log(`      已使用: ${used}件`)
      console.log(`      剩余: ${remaining}件`)
    }
    
    // 7. 结论
    console.log('\n🎯 分析结论:')
    if (theoreticalRemaining1 === 35) {
      console.log('   ✅ 基于MaterialUsage记录的计算，当前库存35件是正确的')
    } else {
      console.log(`   ❌ 基于MaterialUsage记录的计算，应该剩余${theoreticalRemaining1}件，但系统显示35件`)
    }
    
    if (theoreticalRemaining2 === 35) {
      console.log('   ✅ 基于操作历史的计算，当前库存35件是正确的')
    } else {
      console.log(`   ❌ 基于操作历史的计算，应该剩余${theoreticalRemaining2}件，但系统显示35件`)
    }
    
  } catch (error) {
    console.error('❌ 分析过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSKU20250901003Inventory()