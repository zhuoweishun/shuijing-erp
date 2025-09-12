// 检查和田玉挂件原材料库存计算问题的脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkHetianyuMaterialInventory() {
  try {
    console.log('🔍 检查和田玉挂件原材料库存计算问题...')
    
    // 1. 查找和田玉挂件的采购记录（原材料）
    console.log('\n📦 1. 查找和田玉挂件采购记录（原材料）:')
    const hetianyuPurchases = await prisma.purchase.find_many({
      where: {
        product_name: {
          contains: '和田玉挂件'
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
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    console.log(`   找到 ${hetianyuPurchases.length} 条采购记录`)
    let totalPurchased = 0
    let totalUsed = 0
    
    hetianyuPurchases.for_each((purchase, index) => {
      console.log(`\n   ${index + 1}. 采购记录详情:`)
      console.log(`      ID: ${purchase.id}`)
      console.log(`      产品名称: ${purchase.product_name}`)
      console.log(`      数量: ${purchase.quantity || purchase.piece_count || '未知'} 件`)
      console.log(`      状态: ${purchase.status}`)
      console.log(`      创建时间: ${purchase.created_at.to_locale_string()}`)
      
      // 计算采购总数
      const purchaseQty = purchase.quantity || purchase.piece_count || 0
      totalPurchased += purchaseQty
      
      // 计算已使用数量
      let usedInThisPurchase = 0
      if (purchase.materialUsages.length > 0) {
        console.log(`      已用于制作:`)
        purchase.materialUsages.for_each(usage => {
          const usedQty = usage.quantity_used_beads + usage.quantity_used_pieces
          usedInThisPurchase += usedQty
          console.log(`        - 成品: ${usage.product.name}`)
          console.log(`        - SKU: ${usage.product.sku ? usage.product.sku.sku_name : '无SKU'}`)
          console.log(`        - 使用数量: ${usedQty} 件 (颗数:${usage.quantity_used_beads}, 片数:${usage.quantity_used_pieces})`)
        })
      } else {
        console.log(`      ⚠️  未用于制作任何成品`)
      }
      
      totalUsed += usedInThisPurchase
      const remaining = purchaseQty - usedInThisPurchase
      console.log(`      📊 该采购记录: 采购${purchaseQty}件, 已用${usedInThisPurchase}件, 剩余${remaining}件`)
    })
    
    console.log(`\n   📊 原材料库存汇总:`)
    console.log(`      总采购数量: ${totalPurchased} 件`)
    console.log(`      总使用数量: ${totalUsed} 件`)
    console.log(`      剩余库存: ${totalPurchased - totalUsed} 件`)
    
    // 2. 查找和田玉挂件SKU的操作历史
    console.log('\n🏷️ 2. 查找和田玉挂件SKU操作历史:')
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
    console.log(`   📊 SKU操作历史 (${inventoryLogs.length} 条记录):`)
    
    let expectedMaterialInventory = totalPurchased
    inventoryLogs.for_each((log, index) => {
      console.log(`\n   ${index + 1}. ${log.action} ${log.quantity_change > 0 ? '+' : ''}${log.quantity_change} 件`)
      console.log(`      时间: ${log.created_at.to_locale_string()}`)
      console.log(`      原因: ${log.notes || '无'}`)
      console.log(`      引用类型: ${log.reference_type}`)
      
      // 根据操作类型计算对原材料库存的影响
      if (log.action === 'CREATE') {
        // 制作SKU消耗原材料
        expectedMaterialInventory -= log.quantity_change
        console.log(`      📉 消耗原材料: ${log.quantity_change} 件`)
      } else if (log.action === 'ADJUST' && log.quantity_change > 0) {
        // 补货消耗原材料
        expectedMaterialInventory -= log.quantity_change
        console.log(`      📉 补货消耗原材料: ${log.quantity_change} 件`)
      } else if (log.action === 'DESTROY') {
        // 销毁可能退回原材料（需要检查是否选择了退回原材料）
        if (log.notes && log.notes.includes('退回原材料')) {
          expectedMaterialInventory += Math.abs(log.quantity_change)
          console.log(`      📈 退回原材料: ${Math.abs(log.quantity_change)} 件`)
        } else {
          console.log(`      🗑️ 销毁，未退回原材料`)
        }
      }
      
      console.log(`      📊 预期原材料库存: ${expectedMaterialInventory} 件`)
    })
    
    // 3. 对比用户期望的操作历史
    console.log('\n👤 3. 用户期望的操作历史对比:')
    console.log('   用户描述的操作:')
    console.log('   1. 采购: 48件原材料')
    console.log('   2. 制作1件SKU: 原材料库存 48-1=47件')
    console.log('   3. 补货5件SKU: 原材料库存 47-5=42件')
    console.log('   4. 销毁赠送1件SKU(退回原材料): 原材料库存 42+1=43件')
    console.log('   5. 拆散重做1件SKU: 原材料库存 43-1+1=43件')
    console.log('   6. 预期最终原材料库存: 43件')
    
    console.log('\n   实际情况:')
    console.log(`   1. 实际采购: ${totalPurchased} 件原材料`)
    console.log(`   2. 实际使用: ${totalUsed} 件原材料`)
    console.log(`   3. 实际剩余: ${totalPurchased - totalUsed} 件原材料`)
    console.log(`   4. 根据SKU操作计算的预期原材料库存: ${expectedMaterialInventory} 件`)
    
    // 4. 问题分析
    console.log('\n🔍 4. 问题分析:')
    
    if (totalPurchased !== 48) {
      console.log(`   ❌ 采购数量不匹配: 期望48件，实际${totalPurchased}件`)
    }
    
    if (totalPurchased - totalUsed !== 43) {
      console.log(`   ❌ 最终原材料库存不匹配: 期望43件，实际${totalPurchased - totalUsed}件`)
    }
    
    if (expectedMaterialInventory !== 43) {
      console.log(`   ❌ 根据SKU操作计算的原材料库存不匹配: 期望43件，计算得${expectedMaterialInventory}件`)
    }
    
    console.log('\n   💡 可能的问题:')
    console.log('   1. 采购记录的数量字段可能不正确')
    console.log('   2. 制作SKU时可能没有正确记录原材料消耗')
    console.log('   3. 补货操作可能没有正确消耗原材料')
    console.log('   4. 销毁操作的退回原材料逻辑可能有问题')
    console.log('   5. 拆散重做操作可能没有正确处理原材料的消耗和退回')
    
    // 5. 检查采购记录的详细信息
    console.log('\n📋 5. 采购记录详细信息:')
    for (const purchase of hetianyuPurchases) {
      console.log(`\n   采购记录 ${purchase.id}:`)
      console.log(`      产品名称: ${purchase.product_name}`)
      console.log(`      数量字段: quantity=${purchase.quantity}, piece_count=${purchase.piece_count}`)
      console.log(`      产品类型: ${purchase.product_type}`)
      console.log(`      计量单位: ${purchase.unit_type}`)
      console.log(`      规格: ${purchase.specification}`)
      console.log(`      状态: ${purchase.status}`)
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkHetianyuMaterialInventory()