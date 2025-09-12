import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findActualPurchase() {
  console.log('🔍 查找实际的采购记录...')
  
  try {
    // 首先查找SKU20250901003
    const sku = await prisma.product_sku.find_first({
      where: {
        sku_code: 'SKU20250901003'
      },
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: true
              }
            }
          }
        }
      }
    })
    
    if (!sku) {
      console.log('❌ 未找到SKU20250901003')
      return
    }
    
    console.log(`📦 SKU信息:`)
    console.log(`- SKU编码: ${sku.sku_code}`)
    console.log(`- 当前库存: ${sku.available_quantity} 件`)
    console.log(`- 总数量: ${sku.total_quantity} 件`)
    
    // 收集所有相关的采购记录
    const purchaseIds = new Set()
    const materialUsages = []
    
    for (const product of sku.products) {
      for (const usage of product.materialUsages) {
        materialUsages.push(usage)
        purchaseIds.add(usage.purchase_id)
      }
    }
    
    console.log(`\n📊 相关采购记录 (${purchaseIds.size}个):`)
    
    for (const purchase_id of purchaseIds) {
      const purchase = await prisma.purchase.find_unique({
        where: { id: purchase_id }
      })
      
      if (purchase) {
        console.log(`\n- 采购ID: ${purchase.id}`)
        console.log(`  产品名称: ${purchase.product_name}`)
        console.log(`  原始数量: ${purchase.quantity_beads || purchase.quantity_pieces || 0} 件`)
        console.log(`  供应商: ${purchase.supplier_id || 'N/A'}`)
        console.log(`  采购日期: ${purchase.purchase_date.to_i_s_o_string().split('T')[0]}`)
        
        // 计算该采购记录的使用情况
        const usagesForThisPurchase = materialUsages.filter(u => u.purchase_id === purchaseId)
        
        console.log(`  相关MaterialUsage记录 (${usagesForThisPurchase.length}条):`)
        
        let totalUsed = 0
        for (const usage of usagesForThisPurchase) {
          const quantity = usage.quantity_used_beads || usage.quantity_used_pieces || 0
          totalUsed += quantity
          
          console.log(`    - 数量: ${quantity} 件 ${quantity < 0 ? '(退回)' : '(消耗)'}`)
          console.log(`      创建时间: ${usage.created_at.to_i_s_o_string()}`)
        }
        
        const original_quantity = purchase.quantity_beads || purchase.quantity_pieces || 0
        const remaining = originalQuantity - totalUsed
        
        console.log(`  总使用量: ${totalUsed} 件`)
        console.log(`  剩余库存: ${remaining} 件`)
        
        // 如果这个采购记录的剩余量是35件，那就是我们要找的
        if (remaining === 35) {
          console.log(`  🎯 这就是显示35件的采购记录！`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 查找过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findActualPurchase()