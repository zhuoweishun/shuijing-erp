// 更新采购记录状态的脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updatePurchaseStatus() {
  try {
    console.log('🔄 开始更新采购记录状态...')
    
    // 获取前50条PENDING状态的记录
    const pendingRecords = await prisma.purchase.find_many({
      where: {
        status: 'PENDING'
      },
      take: 50,
      orderBy: {
        purchase_date: 'desc'
      }
    })
    
    console.log(`📋 找到 ${pendingRecords.length} 条PENDING记录`)
    
    if (pendingRecords.length === 0) {
      console.log('❌ 没有找到PENDING状态的记录')
      return
    }
    
    // 将前30条更新为CONFIRMED
    const confirmedIds = pendingRecords.slice(0, 30).map(record => record.id)
    const confirmedResult = await prisma.purchase.update_many({
      where: {
        id: { in: confirmedIds }
      },
      data: {
        status: 'CONFIRMED'
      }
    })
    
    console.log(`✅ 已将 ${confirmedResult.count} 条记录更新为CONFIRMED状态`)
    
    // 将后20条更新为DELIVERED
    const deliveredIds = pendingRecords.slice(30, 50).map(record => record.id)
    const deliveredResult = await prisma.purchase.update_many({
      where: {
        id: { in: deliveredIds }
      },
      data: {
        status: 'DELIVERED'
      }
    })
    
    console.log(`🚚 已将 ${deliveredResult.count} 条记录更新为DELIVERED状态`)
    
    // 验证更新结果
    const statusStats = await prisma.purchase.group_by({
      by: ['status'],
      Count: {
        id: true
      }
    })
    
    console.log('\n📊 更新后的状态分布:')
    statusStats.for_each(stat => {
      console.log(`  ${stat.status}: ${stat.Count.id} 条记录`)
    })
    
    // 计算有效记录的总价格
    const validRecordsSum = await prisma.purchase.aggregate({
      where: {
        status: { in: ['CONFIRMED', 'DELIVERED'] }
      },
      Sum: {
        total_price: true
      },
      Count: {
        id: true
      }
    })
    
    console.log('\n💰 有效记录统计:')
    console.log(`  记录数: ${validRecordsSum.Count.id}`)
    console.log(`  总价格: ¥${validRecordsSum.Sum.total_price || 0}`)
    
    console.log('\n🎉 状态更新完成！现在财务统计应该能显示数据了。')
    
  } catch (error) {
    console.error('❌ 更新状态时出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updatePurchaseStatus()