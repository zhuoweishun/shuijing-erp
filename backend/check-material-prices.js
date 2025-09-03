import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMaterialPrices() {
  try {
    console.log('🔍 检查原材料价格数据...')
    
    // 查询所有采购记录的价格信息
    const purchases = await prisma.purchase.findMany({
      select: {
        id: true,
        purchaseCode: true,
        productType: true,
        unitPrice: true,
        totalPrice: true,
        quantity: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    console.log(`\n📊 找到 ${purchases.length} 条采购记录:`)
    
    purchases.forEach((purchase, index) => {
      console.log(`\n${index + 1}. 采购记录 ${purchase.purchaseCode}:`)
      console.log(`   产品类型: ${purchase.productType}`)
      console.log(`   单价: ¥${purchase.unitPrice || 0}`)
      console.log(`   总价: ¥${purchase.totalPrice || 0}`)
      console.log(`   数量: ${purchase.quantity || 0}`)
      console.log(`   创建时间: ${purchase.createdAt}`)
    })
    
    // 检查原材料使用记录
    console.log('\n🔍 检查原材料使用记录...')
    
    const materialUsages = await prisma.materialUsage.findMany({
      select: {
        id: true,
        productId: true,
        purchaseId: true,
        quantityUsedPieces: true,
        quantityUsedBeads: true,
        purchase: {
          select: {
            purchaseCode: true,
            productType: true,
            unitPrice: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: {
              select: {
                id: true,
                skuCode: true,
                materialCost: true,
                laborCost: true,
                craftCost: true,
                totalCost: true
              }
            }
          }
        }
      },
      orderBy: {
        id: 'desc'
      },
      take: 10
    })
    
    console.log(`\n📊 找到 ${materialUsages.length} 条原材料使用记录:`)
    
    materialUsages.forEach((usage, index) => {
      console.log(`\n${index + 1}. 原材料使用记录:`)
      console.log(`   产品: ${usage.product?.name || 'N/A'}`)
      console.log(`   SKU: ${usage.product?.sku?.skuCode || 'N/A'}`)
      console.log(`   使用件数: ${usage.quantityUsedPieces || 0}`)
      console.log(`   使用颗数: ${usage.quantityUsedBeads || 0}`)
      console.log(`   原材料采购编号: ${usage.purchase?.purchaseCode || 'N/A'}`)
      console.log(`   原材料类型: ${usage.purchase?.productType || 'N/A'}`)
      console.log(`   单价: ¥${usage.purchase?.unitPrice || 0}`)
      
      // 计算预期材料成本
      const unitPrice = Number(usage.purchase?.unitPrice || 0)
      const usedPieces = Number(usage.quantityUsedPieces || 0)
      const usedBeads = Number(usage.quantityUsedBeads || 0)
      
      // 根据使用的数量类型计算成本
      const expectedMaterialCost = usedPieces > 0 ? (usedPieces * unitPrice) : (usedBeads * unitPrice)
      console.log(`   预期材料成本: ¥${expectedMaterialCost.toFixed(2)}`)
      console.log(`   SKU实际材料成本: ¥${usage.product?.sku?.materialCost || 0}`)
      console.log(`   SKU总成本: ¥${usage.product?.sku?.totalCost || 0}`)
    })
    
  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMaterialPrices()