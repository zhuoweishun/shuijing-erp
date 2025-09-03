import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPurchaseFields() {
  try {
    console.log('🔍 检查采购记录的关键字段...')
    
    // 查询所有采购记录的关键字段
    const purchases = await prisma.purchase.findMany({
      select: {
        id: true,
        purchaseCode: true,
        productType: true,
        quantity: true,
        pieceCount: true,
        totalPrice: true,
        unitPrice: true,
        pricePerPiece: true,
        pricePerBead: true,
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
      console.log(`   数量: ${purchase.quantity || 'NULL'}`)
      console.log(`   件数: ${purchase.pieceCount || 'NULL'}`)
      console.log(`   总价: ¥${purchase.totalPrice || 'NULL'}`)
      console.log(`   单价: ¥${purchase.unitPrice || 'NULL'}`)
      console.log(`   每件价格: ¥${purchase.pricePerPiece || 'NULL'}`)
      console.log(`   每颗价格: ¥${purchase.pricePerBead || 'NULL'}`)
      
      // 分析为什么unitPrice为NULL
      if (purchase.productType === 'FINISHED') {
        if (!purchase.pieceCount) {
          console.log(`   ❌ 问题: FINISHED类型缺少pieceCount字段`)
        } else if (!purchase.totalPrice) {
          console.log(`   ❌ 问题: FINISHED类型缺少totalPrice字段`)
        } else {
          const expectedUnitPrice = purchase.totalPrice / purchase.pieceCount
          console.log(`   ✅ 预期单价: ¥${expectedUnitPrice.toFixed(2)}`)
          if (!purchase.unitPrice) {
            console.log(`   ❌ 问题: 应该有单价但实际为NULL`)
          }
        }
      } else if (purchase.productType === 'BRACELET') {
        if (!purchase.quantity) {
          console.log(`   ❌ 问题: BRACELET类型缺少quantity字段`)
        } else if (!purchase.totalPrice) {
          console.log(`   ❌ 问题: BRACELET类型缺少totalPrice字段`)
        } else {
          const expectedUnitPrice = purchase.totalPrice / purchase.quantity
          console.log(`   ✅ 预期单价: ¥${expectedUnitPrice.toFixed(2)}`)
          if (!purchase.unitPrice) {
            console.log(`   ❌ 问题: 应该有单价但实际为NULL`)
          }
        }
      } else if (purchase.productType === 'ACCESSORIES') {
        if (!purchase.pieceCount) {
          console.log(`   ❌ 问题: ACCESSORIES类型缺少pieceCount字段`)
        } else if (!purchase.totalPrice) {
          console.log(`   ❌ 问题: ACCESSORIES类型缺少totalPrice字段`)
        } else {
          const expectedUnitPrice = purchase.totalPrice / purchase.pieceCount
          console.log(`   ✅ 预期单价: ¥${expectedUnitPrice.toFixed(2)}`)
          if (!purchase.unitPrice) {
            console.log(`   ❌ 问题: 应该有单价但实际为NULL`)
          }
        }
      }
    })
    
    // 统计各种问题
    console.log('\n📈 问题统计:')
    const finishedWithoutPieceCount = purchases.filter(p => p.productType === 'FINISHED' && !p.pieceCount).length
    const finishedWithoutTotalPrice = purchases.filter(p => p.productType === 'FINISHED' && !p.totalPrice).length
    const finishedWithoutUnitPrice = purchases.filter(p => p.productType === 'FINISHED' && !p.unitPrice).length
    
    console.log(`   FINISHED类型缺少pieceCount: ${finishedWithoutPieceCount} 条`)
    console.log(`   FINISHED类型缺少totalPrice: ${finishedWithoutTotalPrice} 条`)
    console.log(`   FINISHED类型缺少unitPrice: ${finishedWithoutUnitPrice} 条`)
    
  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPurchaseFields()