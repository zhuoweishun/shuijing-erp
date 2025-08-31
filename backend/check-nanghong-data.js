import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkNanghongData() {
  try {
    console.log('🔍 查询南红隔珠的采购记录...')
    
    // 查询包含"南红"的采购记录
    const purchases = await prisma.purchase.findMany({
      where: {
        productName: {
          contains: '南红'
        }
      },
      select: {
        id: true,
        purchaseCode: true,
        productName: true,
        productType: true,
        unitType: true,
        pieceCount: true,
        totalPrice: true,
        unitPrice: true,
        pricePerGram: true,
        pricePerBead: true,
        specification: true,
        weight: true,
        quality: true,
        purchaseDate: true,
        supplier: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    })
    
    console.log(`找到 ${purchases.length} 条南红相关记录:`)
    
    purchases.forEach((purchase, index) => {
      console.log(`\n记录 ${index + 1}:`)
      console.log('  采购编号:', purchase.purchaseCode)
      console.log('  产品名称:', purchase.productName)
      console.log('  产品类型:', purchase.productType)
      console.log('  单位类型:', purchase.unitType)
      console.log('  片数/件数:', purchase.pieceCount)
      console.log('  总价:', purchase.totalPrice ? `${purchase.totalPrice}元` : 'null')
      console.log('  单价(unitPrice):', purchase.unitPrice ? `${purchase.unitPrice}元` : 'null')
      console.log('  克价:', purchase.pricePerGram ? `${purchase.pricePerGram}元/g` : 'null')
      console.log('  每颗价格:', purchase.pricePerBead ? `${purchase.pricePerBead}元` : 'null')
      console.log('  规格:', purchase.specification ? `${purchase.specification}mm` : 'null')
      console.log('  重量:', purchase.weight ? `${purchase.weight}g` : 'null')
      console.log('  品相:', purchase.quality || 'null')
      console.log('  供应商:', purchase.supplier?.name || 'null')
      console.log('  采购日期:', purchase.purchaseDate.toLocaleDateString())
      
      // 计算每片价格
      if (purchase.totalPrice && purchase.pieceCount) {
        const pricePerPiece = purchase.totalPrice / purchase.pieceCount
        console.log('  计算的每片价格:', `${pricePerPiece.toFixed(2)}元/片`)
      }
    })
    
  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkNanghongData()