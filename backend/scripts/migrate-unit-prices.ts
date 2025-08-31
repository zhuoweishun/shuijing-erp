import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 计算每串珠子数量的函数
function calculateBeadsPerString(diameter: number): number {
  return Math.floor(160 / diameter)
}

// 批量更新采购记录的单价字段
async function migrateUnitPrices() {
  console.log('开始迁移单价数据...')
  
  try {
    // 获取所有采购记录
    const purchases = await prisma.purchase.findMany({
      select: {
        id: true,
        productType: true,
        totalPrice: true,
        quantity: true,
        pieceCount: true,
        beadDiameter: true,
        beadsPerString: true,
        totalBeads: true,
        pricePerBead: true,
        pricePerPiece: true,
        unitPrice: true
      }
    })
    
    console.log(`找到 ${purchases.length} 条采购记录`)
    
    let updatedCount = 0
    
    for (const purchase of purchases) {
      const updateData: any = {}
      let needsUpdate = false
      
      if (purchase.totalPrice) {
        const totalPrice = Number(purchase.totalPrice)
        
        if (purchase.productType === 'LOOSE_BEADS') {
          // 散珠：按颗计算
          if (purchase.pieceCount && !purchase.pricePerBead) {
            updateData.pricePerBead = totalPrice / purchase.pieceCount
            needsUpdate = true
            console.log(`散珠 ${purchase.id}: 计算每颗价格 ${updateData.pricePerBead}`)
          }
        } else if (purchase.productType === 'BRACELET') {
          // 手串：按串和颗计算
          if (purchase.quantity) {
            // 计算unitPrice（每串价格）
            if (!purchase.unitPrice) {
              updateData.unitPrice = totalPrice / purchase.quantity
              needsUpdate = true
              console.log(`手串 ${purchase.id}: 计算每串价格 ${updateData.unitPrice}`)
            }
            
            // 计算或更新beadsPerString
            if (purchase.beadDiameter && !purchase.beadsPerString) {
              updateData.beadsPerString = calculateBeadsPerString(Number(purchase.beadDiameter))
              needsUpdate = true
              console.log(`手串 ${purchase.id}: 计算每串颗数 ${updateData.beadsPerString}`)
            }
            
            // 计算totalBeads
            const beadsPerString = updateData.beadsPerString || purchase.beadsPerString
            if (beadsPerString && !purchase.totalBeads) {
              updateData.totalBeads = purchase.quantity * beadsPerString
              needsUpdate = true
              console.log(`手串 ${purchase.id}: 计算总颗数 ${updateData.totalBeads}`)
            }
            
            // 计算pricePerBead（每颗价格）
            const totalBeads = updateData.totalBeads || purchase.totalBeads
            if (totalBeads && !purchase.pricePerBead) {
              updateData.pricePerBead = totalPrice / totalBeads
              needsUpdate = true
              console.log(`手串 ${purchase.id}: 计算每颗价格 ${updateData.pricePerBead}`)
            }
          }
        } else if (purchase.productType === 'ACCESSORIES' || purchase.productType === 'FINISHED') {
          // 饰品配件和成品：按片/件计算
          if (purchase.pieceCount) {
            if (!purchase.pricePerPiece) {
              updateData.pricePerPiece = totalPrice / purchase.pieceCount
              needsUpdate = true
              console.log(`${purchase.productType} ${purchase.id}: 计算每片/件价格 ${updateData.pricePerPiece}`)
            }
            
            if (!purchase.unitPrice) {
              updateData.unitPrice = totalPrice / purchase.pieceCount
              needsUpdate = true
              console.log(`${purchase.productType} ${purchase.id}: 计算单价 ${updateData.unitPrice}`)
            }
          }
        }
      }
      
      // 如果有需要更新的字段，执行更新
      if (needsUpdate) {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: updateData
        })
        updatedCount++
      }
    }
    
    console.log(`迁移完成！共更新了 ${updatedCount} 条记录`)
    
  } catch (error) {
    console.error('迁移过程中发生错误:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 执行迁移
migrateUnitPrices()
  .then(() => {
    console.log('单价数据迁移成功完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('单价数据迁移失败:', error)
    process.exit(1)
  })

export { migrateUnitPrices }