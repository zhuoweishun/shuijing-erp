// 查询数据库中品相数据分布的脚本
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkQualityDistribution() {
  try {
    console.log('🔍 开始查询品相数据分布...')
    
    // 查询所有半成品的品相分布
    const qualityDistribution = await prisma.purchases.groupBy({
      by: ['quality'],
      where: {
        productType: {
          in: ['LOOSE_BEADS', 'BRACELET']
        }
      },
      _count: {
        quality: true
      },
      _sum: {
        pieceCount: true
      }
    })
    
    console.log('📊 半成品品相数据分布:')
    console.log('品相\t\t记录数\t\t总数量')
    console.log('================================')
    
    qualityDistribution.forEach(item => {
      const quality = item.quality || '未知(null)'
      const count = item._count.quality
      const totalQuantity = item._sum.pieceCount || 0
      console.log(`${quality}\t\t${count}\t\t${totalQuantity}`)
    })
    
    // 查询具体的品相值
    const distinctQualities = await prisma.purchases.findMany({
      where: {
        productType: {
          in: ['LOOSE_BEADS', 'BRACELET']
        }
      },
      select: {
        quality: true
      },
      distinct: ['quality']
    })
    
    console.log('\n🎯 数据库中存在的品相值:')
    distinctQualities.forEach(item => {
      console.log(`- ${item.quality || 'null(未知)'}`)
    })
    
    // 检查是否存在B级别和null值
    const hasB = distinctQualities.some(item => item.quality === 'B')
    const hasNull = distinctQualities.some(item => item.quality === null)
    
    console.log('\n✅ 检查结果:')
    console.log(`B级别数据: ${hasB ? '存在' : '不存在'}`)
    console.log(`未知(null)品相数据: ${hasNull ? '存在' : '不存在'}`)
    
    // 定义完整的品相选项
    const completeQualities = ['AA', 'A', 'AB', 'B', 'C', null]
    const missingQualities = completeQualities.filter(quality => 
      !distinctQualities.some(item => item.quality === quality)
    )
    
    if (missingQualities.length > 0) {
      console.log('\n⚠️ 缺失的品相数据:')
      missingQualities.forEach(quality => {
        console.log(`- ${quality || '未知(null)'}`)
      })
    } else {
      console.log('\n✅ 所有品相数据都存在')
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkQualityDistribution()