import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPriceDistributionAPI() {
  try {
    console.log('🔍 测试价格分布API查询...')
    
    // 测试单价区间分布查询
    const priceRangeQuery = `
      SELECT 
         CASE 
           WHEN calculated_price >= 0 AND calculated_price <= 3 THEN '0-3元（含）'
           WHEN calculated_price > 3 AND calculated_price <= 10 THEN '3-10元（含）'
           WHEN calculated_price > 10 AND calculated_price <= 20 THEN '10-20元（含）'
           WHEN calculated_price > 20 AND calculated_price <= 50 THEN '20-50元（含）'
           WHEN calculated_price > 50 THEN '50元以上'
           ELSE '未知'
         END as price_range,
        COUNT(*) as count
      FROM (
        SELECT 
          CASE 
            WHEN p.productType IN ('LOOSE_BEADS', 'BRACELET') THEN p.pricePerBead
            WHEN p.productType IN ('ACCESSORIES', 'FINISHED') THEN p.pricePerPiece
            ELSE p.pricePerGram
          END as calculated_price
        FROM purchases p
        WHERE p.status IN ('ACTIVE', 'PENDING') 
          AND p.totalPrice IS NOT NULL 
          AND p.totalPrice > 0
          AND (
            (p.productType IN ('LOOSE_BEADS', 'BRACELET') AND (p.totalBeads IS NOT NULL AND p.totalBeads > 0 OR p.pieceCount IS NOT NULL AND p.pieceCount > 0)) OR
            (p.productType = 'ACCESSORIES' AND p.pieceCount IS NOT NULL AND p.pieceCount > 0) OR
            (p.productType = 'FINISHED' AND p.pieceCount IS NOT NULL AND p.pieceCount > 0)
          )
          AND p.productType = 'LOOSE_BEADS'
      ) as price_data
      WHERE calculated_price IS NOT NULL
      GROUP BY price_range
      ORDER BY 
         CASE price_range
           WHEN '0-3元（含）' THEN 1
           WHEN '3-10元（含）' THEN 2
           WHEN '10-20元（含）' THEN 3
           WHEN '20-50元（含）' THEN 4
           WHEN '50元以上' THEN 5
           ELSE 6
         END
    `
    
    console.log('\n📊 执行单价区间分布查询...')
    const rangeData = await prisma.$queryRawUnsafe(priceRangeQuery)
    console.log('单价区间分布结果:', rangeData)
    
    // 测试总价分布查询
    const priceQuery = `
      SELECT 
        p.id as purchase_id,
        p.productName as product_name,
        p.productType as product_type,
        p.totalPrice as total_price,
        p.pricePerBead as price_per_bead,
        p.pricePerPiece as price_per_piece,
        p.totalPrice as calculated_price
      FROM purchases p
      WHERE p.status IN ('ACTIVE', 'PENDING') 
        AND p.totalPrice IS NOT NULL 
        AND p.totalPrice > 0
        AND (
          (p.productType IN ('LOOSE_BEADS', 'BRACELET') AND (p.totalBeads IS NOT NULL AND p.totalBeads > 0 OR p.pieceCount IS NOT NULL AND p.pieceCount > 0)) OR
          (p.productType = 'ACCESSORIES' AND p.pieceCount IS NOT NULL AND p.pieceCount > 0) OR
          (p.productType = 'FINISHED' AND p.pieceCount IS NOT NULL AND p.pieceCount > 0)
        )
        AND p.productType = 'LOOSE_BEADS'
      ORDER BY calculated_price DESC
      LIMIT 10
    `
    
    console.log('\n📊 执行总价分布查询...')
    const priceData = await prisma.$queryRawUnsafe(priceQuery)
    console.log('总价分布结果:', priceData)
    
    // 检查各产品类型的价格字段情况
    const typeCheck = await prisma.$queryRaw`
      SELECT 
        productType,
        COUNT(*) as total_count,
        COUNT(pricePerBead) as has_price_per_bead,
        COUNT(pricePerPiece) as has_price_per_piece,
        COUNT(CASE WHEN pricePerBead IS NOT NULL AND pricePerBead > 0 THEN 1 END) as valid_price_per_bead,
        COUNT(CASE WHEN pricePerPiece IS NOT NULL AND pricePerPiece > 0 THEN 1 END) as valid_price_per_piece
      FROM purchases
      WHERE status IN ('ACTIVE', 'PENDING')
      GROUP BY productType
    `
    
    console.log('\n📊 各产品类型价格字段检查:')
    typeCheck.forEach(item => {
      console.log(`${item.productType}:`)
      console.log(`  总数: ${item.total_count}`)
      console.log(`  有pricePerBead: ${item.has_price_per_bead}`)
      console.log(`  有pricePerPiece: ${item.has_price_per_piece}`)
      console.log(`  有效pricePerBead: ${item.valid_price_per_bead}`)
      console.log(`  有效pricePerPiece: ${item.valid_price_per_piece}`)
    })
    
  } catch (error) {
    console.error('❌ 测试价格分布API失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPriceDistributionAPI()