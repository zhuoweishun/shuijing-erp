const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateProductStatus() {
  try {
    console.log('开始更新产品状态...')
    
    // 查看当前状态分布
    const currentStatus = await prisma.product.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })
    
    console.log('当前状态分布:', currentStatus)
    
    // 更新状态映射
    const updates = [
      { from: 'IN_STOCK', to: 'AVAILABLE' },
      { from: 'LOW_STOCK', to: 'AVAILABLE' },
      { from: 'OUT_OF_STOCK', to: 'OFFLINE' },
      { from: 'DISCONTINUED', to: 'OFFLINE' }
    ]
    
    for (const update of updates) {
      const result = await prisma.product.updateMany({
        where: { status: update.from },
        data: { status: update.to }
      })
      console.log(`更新 ${update.from} -> ${update.to}: ${result.count} 条记录`)
    }
    
    // 查看更新后的状态分布
    const newStatus = await prisma.product.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })
    
    console.log('更新后状态分布:', newStatus)
    console.log('状态更新完成！')
    
  } catch (error) {
    console.error('更新失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateProductStatus()