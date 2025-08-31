import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPriceData() {
  try {
    console.log('📊 检查采购记录价格字段数据...')
    
    // 检查总记录数
    const totalCount = await prisma.purchase.count()
    console.log(`总采购记录数: ${totalCount}`)
    
    // 检查价格相关字段的数据情况
    const priceFieldsCheck = await prisma.purchase.findMany({
      take: 10,
      select: {
        id: true,
        productName: true,
        productType: true,
        totalPrice: true,
        pricePerBead: true,
        pricePerPiece: true,
        pricePerGram: true,
        unitPrice: true,
        pieceCount: true,
        totalBeads: true,
        weight: true,
        status: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('\n📋 最新10条记录的价格字段:')
    priceFieldsCheck.forEach((record, index) => {
      console.log(`\n记录 ${index + 1}:`)
      console.log(`  ID: ${record.id}`)
      console.log(`  产品名称: ${record.productName}`)
      console.log(`  产品类型: ${record.productType}`)
      console.log(`  总价: ${record.totalPrice}`)
      console.log(`  每颗价格: ${record.pricePerBead}`)
      console.log(`  每片价格: ${record.pricePerPiece}`)
      console.log(`  克价: ${record.pricePerGram}`)
      console.log(`  单价: ${record.unitPrice}`)
      console.log(`  数量: ${record.pieceCount}`)
      console.log(`  总珠数: ${record.totalBeads}`)
      console.log(`  重量: ${record.weight}`)
      console.log(`  状态: ${record.status}`)
    })
    
    // 统计各价格字段的非空数量
    const priceStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_records,
        COUNT(totalPrice) as has_total_price,
        COUNT(pricePerBead) as has_price_per_bead,
        COUNT(pricePerPiece) as has_price_per_piece,
        COUNT(pricePerGram) as has_price_per_gram,
        COUNT(unitPrice) as has_unit_price,
        SUM(CASE WHEN totalPrice > 0 THEN 1 ELSE 0 END) as positive_total_price,
        SUM(CASE WHEN pricePerBead > 0 THEN 1 ELSE 0 END) as positive_price_per_bead,
        SUM(CASE WHEN pricePerPiece > 0 THEN 1 ELSE 0 END) as positive_price_per_piece
      FROM purchases
      WHERE status IN ('ACTIVE', 'PENDING')
    `
    
    console.log('\n📊 价格字段统计:')
    console.log(priceStats[0])
    
    // 按产品类型检查价格字段
    const priceByType = await prisma.$queryRaw`
      SELECT 
        productType,
        COUNT(*) as count,
        COUNT(totalPrice) as has_total_price,
        COUNT(pricePerBead) as has_price_per_bead,
        COUNT(pricePerPiece) as has_price_per_piece,
        AVG(CASE WHEN totalPrice > 0 THEN totalPrice ELSE NULL END) as avg_total_price
      FROM purchases
      WHERE status IN ('ACTIVE', 'PENDING')
      GROUP BY productType
    `
    
    console.log('\n📊 按产品类型的价格字段统计:')
    priceByType.forEach(stat => {
      console.log(`\n${stat.productType}:`)
      console.log(`  记录数: ${stat.count}`)
      console.log(`  有总价: ${stat.has_total_price}`)
      console.log(`  有每颗价格: ${stat.has_price_per_bead}`)
      console.log(`  有每片价格: ${stat.has_price_per_piece}`)
      console.log(`  平均总价: ${stat.avg_total_price}`)
    })
    
  } catch (error) {
    console.error('❌ 检查价格数据失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPriceData()