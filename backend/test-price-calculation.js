import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPriceCalculation() {
  try {
    console.log('🔍 测试价格计算逻辑...')
    
    // 直接执行修复后的SQL查询
    const result = await prisma.$queryRaw`
      SELECT 
        p.id as purchase_id,
        p.productName as product_name,
        p.productType as product_type,
        p.pieceCount as piece_count,
        p.totalPrice as total_price,
        p.unitPrice as unit_price,
        p.pricePerGram as price_per_gram,
        CASE 
          WHEN p.productType = 'ACCESSORIES' THEN 
            CASE 
              WHEN p.unitPrice IS NOT NULL THEN p.unitPrice
              WHEN p.totalPrice IS NOT NULL AND p.pieceCount IS NOT NULL AND p.pieceCount > 0 
                THEN p.totalPrice / p.pieceCount
              ELSE NULL
            END
          ELSE p.unitPrice
        END as calculated_price_per_unit
      FROM purchases p
      WHERE p.productName LIKE '%南红隔珠%'
      ORDER BY p.purchaseDate DESC
    `
    
    console.log(`找到 ${result.length} 条南红隔珠记录:`)
    
    result.forEach((item, index) => {
      console.log(`\n记录 ${index + 1}:`)
      console.log('  产品名称:', item.product_name)
      console.log('  产品类型:', item.product_type)
      console.log('  片数:', item.piece_count)
      console.log('  总价:', item.total_price ? `${item.total_price}元` : 'null')
      console.log('  原unitPrice:', item.unit_price ? `${item.unit_price}元` : 'null')
      console.log('  克价:', item.price_per_gram ? `${item.price_per_gram}元/g` : 'null')
      console.log('  计算后的每片价格:', item.calculated_price_per_unit ? `${item.calculated_price_per_unit}元/片` : 'null')
      
      // 手动验证计算
      if (item.total_price && item.piece_count) {
        const manualCalc = Number(item.total_price) / Number(item.piece_count)
        console.log('  手动计算验证:', `${manualCalc.toFixed(2)}元/片`)
        
        if (Math.abs(Number(item.calculated_price_per_unit) - manualCalc) < 0.01) {
          console.log('  ✅ 计算正确')
        } else {
          console.log('  ❌ 计算错误')
        }
      }
    })
    
  } catch (error) {
    console.error('测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPriceCalculation()