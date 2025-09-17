import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testDatabase() {
  try {
    console.log('🔍 检查数据库连接...')
    
    // 检查Purchase表中的数据
    const totalPurchases = await prisma.purchase.count()
    console.log('📊 总采购记录数:', totalPurchases)
    
    if (totalPurchases > 0) {
      // 按类型统计
      const purchasesByType = await prisma.purchase.groupBy({
        by: ['purchase_type'],
        _count: {
          id: true
        },
        where: {
          status: {
            in: ['ACTIVE', 'USED']
          }
        }
      })
      
      console.log('📊 按类型统计的有效采购记录:')
      purchasesByType.forEach(item => {
        console.log(`  ${item.purchase_type}: ${item._count.id}条`)
      })
      
      // 检查价格数据
      const purchasesWithPrice = await prisma.purchase.count({
        where: {
          status: {
            in: ['ACTIVE', 'USED']
          },
          total_price: {
            not: null,
            gt: 0
          }
        }
      })
      
      console.log('📊 有价格数据的采购记录数:', purchasesWithPrice)
      
      // 查看一些示例数据
      const samplePurchases = await prisma.purchase.findMany({
        take: 3,
        where: {
          status: {
            in: ['ACTIVE', 'USED']
          },
          total_price: {
            not: null,
            gt: 0
          }
        },
        select: {
          id: true,
          purchase_name: true,
          purchase_type: true,
          total_price: true,
          total_beads: true,
          piece_count: true,
          status: true
        }
      })
      
      console.log('📊 示例采购记录:')
      samplePurchases.forEach(item => {
        console.log('  ', item)
      })
    }
    
  } catch (error) {
    console.error('❌ 数据库查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()