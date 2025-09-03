import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function recalculateSkuMaterialCost() {
  try {
    console.log('🔧 开始重新计算SKU的材料成本...')
    
    // 获取所有SKU及其关联的产品和原材料使用记录
    const skus = await prisma.productSku.findMany({
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: {
                  select: {
                    id: true,
                    purchaseCode: true,
                    productType: true,
                    unitPrice: true,
                    pricePerPiece: true,
                    pricePerBead: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n📊 找到 ${skus.length} 个SKU需要重新计算材料成本`)
    
    let updatedCount = 0
    
    for (const sku of skus) {
      console.log(`\n🔧 处理SKU ${sku.skuCode}`)
      console.log(`   当前材料成本: ¥${sku.materialCost || 0}`)
      
      let totalMaterialCost = 0
      let hasValidMaterialUsage = false
      
      // 遍历SKU下的所有产品
      for (const product of sku.products) {
        console.log(`   产品: ${product.name}`)
        
        // 遍历产品的原材料使用记录
        for (const usage of product.materialUsages) {
          const purchase = usage.purchase
          if (!purchase) {
            console.log(`     ❌ 原材料使用记录缺少采购信息`)
            continue
          }
          
          console.log(`     原材料: ${purchase.purchaseCode} (${purchase.productType})`)
          console.log(`     使用件数: ${usage.quantityUsedPieces || 0}`)
          console.log(`     使用颗数: ${usage.quantityUsedBeads || 0}`)
          
          let materialCost = 0
          
          // 根据产品类型和使用数量计算成本
          if (purchase.productType === 'FINISHED' || purchase.productType === 'ACCESSORIES') {
            // 成品和饰品配件按件计算
            const usedPieces = Number(usage.quantityUsedPieces || 0)
            const pricePerPiece = Number(purchase.pricePerPiece || purchase.unitPrice || 0)
            materialCost = usedPieces * pricePerPiece
            console.log(`     计算: ${usedPieces} 件 × ¥${pricePerPiece} = ¥${materialCost.toFixed(2)}`)
          } else if (purchase.productType === 'BRACELET' || purchase.productType === 'LOOSE_BEADS') {
            // 手串和散珠按颗计算
            const usedBeads = Number(usage.quantityUsedBeads || 0)
            const pricePerBead = Number(purchase.pricePerBead || 0)
            materialCost = usedBeads * pricePerBead
            console.log(`     计算: ${usedBeads} 颗 × ¥${pricePerBead} = ¥${materialCost.toFixed(2)}`)
          }
          
          if (materialCost > 0) {
            totalMaterialCost += materialCost
            hasValidMaterialUsage = true
            console.log(`     ✅ 材料成本: ¥${materialCost.toFixed(2)}`)
          } else {
            console.log(`     ❌ 无法计算材料成本 (价格为0或缺少使用数量)`)
          }
        }
      }
      
      console.log(`   总材料成本: ¥${totalMaterialCost.toFixed(2)}`)
      
      // 更新SKU的材料成本
      if (hasValidMaterialUsage && totalMaterialCost !== sku.materialCost) {
        // 重新计算总成本
        const laborCost = Number(sku.laborCost || 0)
        const craftCost = Number(sku.craftCost || 0)
        const newTotalCost = totalMaterialCost + laborCost + craftCost
        
        await prisma.productSku.update({
          where: { id: sku.id },
          data: {
            materialCost: totalMaterialCost,
            totalCost: newTotalCost
          }
        })
        
        updatedCount++
        console.log(`   ✅ 已更新SKU ${sku.skuCode}:`)
        console.log(`      材料成本: ¥${sku.materialCost || 0} → ¥${totalMaterialCost.toFixed(2)}`)
        console.log(`      总成本: ¥${sku.totalCost || 0} → ¥${newTotalCost.toFixed(2)}`)
      } else if (!hasValidMaterialUsage) {
        console.log(`   ⏭️  跳过SKU ${sku.skuCode}: 没有有效的原材料使用记录`)
      } else {
        console.log(`   ⏭️  跳过SKU ${sku.skuCode}: 材料成本无变化`)
      }
    }
    
    console.log(`\n🎉 重新计算完成！共更新了 ${updatedCount} 个SKU的材料成本`)
    
    // 验证结果
    console.log('\n🔍 验证更新结果...')
    const updatedSkus = await prisma.productSku.findMany({
      select: {
        skuCode: true,
        materialCost: true,
        laborCost: true,
        craftCost: true,
        totalCost: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })
    
    updatedSkus.forEach((sku, index) => {
      console.log(`${index + 1}. SKU ${sku.skuCode}:`)
      console.log(`   材料成本: ¥${sku.materialCost || 0}`)
      console.log(`   人工成本: ¥${sku.laborCost || 0}`)
      console.log(`   工艺成本: ¥${sku.craftCost || 0}`)
      console.log(`   总成本: ¥${sku.totalCost || 0}`)
    })
    
  } catch (error) {
    console.error('❌ 重新计算失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

recalculateSkuMaterialCost()