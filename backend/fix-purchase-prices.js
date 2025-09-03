import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 计算每串珠子数量的函数
function calculateBeadsPerString(diameter) {
  return Math.floor(160 / diameter)
}

async function fixPurchasePrices() {
  try {
    console.log('🔧 开始修复采购记录的价格字段...')
    
    // 获取所有需要修复的采购记录
    const purchases = await prisma.purchase.findMany({
      where: {
        OR: [
          { unitPrice: null },
          { pricePerPiece: null },
          { pricePerBead: null }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n📊 找到 ${purchases.length} 条需要修复的采购记录`)
    
    let fixedCount = 0
    
    for (const purchase of purchases) {
      const updateData = {}
      let needsUpdate = false
      
      console.log(`\n🔧 处理采购记录 ${purchase.purchaseCode} (${purchase.productType})`)
      console.log(`   原始数据: 总价=¥${purchase.totalPrice}, 数量=${purchase.quantity}, 件数=${purchase.pieceCount}`)
      
      if (purchase.productType === 'FINISHED') {
        // 成品：按件计算
        if (purchase.pieceCount && purchase.totalPrice) {
          if (!purchase.pricePerPiece) {
            updateData.pricePerPiece = purchase.totalPrice / purchase.pieceCount
            needsUpdate = true
            console.log(`   ✅ 计算每件价格: ¥${updateData.pricePerPiece.toFixed(2)}`)
          }
          
          if (!purchase.unitPrice) {
            updateData.unitPrice = purchase.totalPrice / purchase.pieceCount
            needsUpdate = true
            console.log(`   ✅ 计算单价: ¥${updateData.unitPrice.toFixed(2)}`)
          }
        } else {
          console.log(`   ❌ 跳过: 缺少必要字段 (pieceCount=${purchase.pieceCount}, totalPrice=${purchase.totalPrice})`)
        }
      } else if (purchase.productType === 'ACCESSORIES') {
        // 饰品配件：按片计算
        if (purchase.pieceCount && purchase.totalPrice) {
          if (!purchase.pricePerPiece) {
            updateData.pricePerPiece = purchase.totalPrice / purchase.pieceCount
            needsUpdate = true
            console.log(`   ✅ 计算每片价格: ¥${updateData.pricePerPiece.toFixed(2)}`)
          }
          
          if (!purchase.unitPrice) {
            updateData.unitPrice = purchase.totalPrice / purchase.pieceCount
            needsUpdate = true
            console.log(`   ✅ 计算单价: ¥${updateData.unitPrice.toFixed(2)}`)
          }
        } else {
          console.log(`   ❌ 跳过: 缺少必要字段 (pieceCount=${purchase.pieceCount}, totalPrice=${purchase.totalPrice})`)
        }
      } else if (purchase.productType === 'BRACELET') {
        // 手串：按串计算
        if (purchase.quantity && purchase.totalPrice) {
          if (!purchase.unitPrice) {
            updateData.unitPrice = purchase.totalPrice / purchase.quantity
            needsUpdate = true
            console.log(`   ✅ 计算每串价格: ¥${updateData.unitPrice.toFixed(2)}`)
          }
          
          // 计算或更新beadsPerString
          if (purchase.beadDiameter && !purchase.beadsPerString) {
            updateData.beadsPerString = calculateBeadsPerString(Number(purchase.beadDiameter))
            needsUpdate = true
            console.log(`   ✅ 计算每串颗数: ${updateData.beadsPerString}`)
          }
          
          // 计算totalBeads
          const beadsPerString = updateData.beadsPerString || purchase.beadsPerString
          if (beadsPerString && !purchase.totalBeads) {
            updateData.totalBeads = purchase.quantity * beadsPerString
            needsUpdate = true
            console.log(`   ✅ 计算总颗数: ${updateData.totalBeads}`)
          }
          
          // 计算pricePerBead
          const totalBeads = updateData.totalBeads || purchase.totalBeads
          if (totalBeads && !purchase.pricePerBead) {
            updateData.pricePerBead = purchase.totalPrice / totalBeads
            needsUpdate = true
            console.log(`   ✅ 计算每颗价格: ¥${updateData.pricePerBead.toFixed(4)}`)
          }
        } else {
          console.log(`   ❌ 跳过: 缺少必要字段 (quantity=${purchase.quantity}, totalPrice=${purchase.totalPrice})`)
        }
      } else if (purchase.productType === 'LOOSE_BEADS') {
        // 散珠：按颗计算
        if (purchase.totalBeads && purchase.totalPrice) {
          if (!purchase.pricePerBead) {
            updateData.pricePerBead = purchase.totalPrice / purchase.totalBeads
            needsUpdate = true
            console.log(`   ✅ 计算每颗价格: ¥${updateData.pricePerBead.toFixed(4)}`)
          }
          
          if (!purchase.unitPrice) {
            updateData.unitPrice = purchase.totalPrice / purchase.totalBeads
            needsUpdate = true
            console.log(`   ✅ 计算单价: ¥${updateData.unitPrice.toFixed(4)}`)
          }
        } else {
          console.log(`   ❌ 跳过: 缺少必要字段 (totalBeads=${purchase.totalBeads}, totalPrice=${purchase.totalPrice})`)
        }
      }
      
      // 执行更新
      if (needsUpdate) {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: updateData
        })
        
        fixedCount++
        console.log(`   ✅ 已更新采购记录 ${purchase.purchaseCode}`)
      } else {
        console.log(`   ⏭️  无需更新采购记录 ${purchase.purchaseCode}`)
      }
    }
    
    console.log(`\n🎉 修复完成！共修复了 ${fixedCount} 条采购记录`)
    
  } catch (error) {
    console.error('❌ 修复失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPurchasePrices()