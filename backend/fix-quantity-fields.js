// 修复采购记录中缺失的数量字段
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixQuantityFields() {
  try {
    console.log('🔧 开始修复采购记录的数量字段...')
    
    // 1. 查找数量字段为空的记录
    const emptyQuantityRecords = await prisma.purchase.find_many({
      where: {
        OR: [
          { quantity: null },
          { quantity: 0 }
        ]
      },
      select: {
        id: true,
        product_name: true,
        product_type: true,
        quantity: true,
        specification: true
      }
    })
    
    console.log(`📊 找到 ${emptyQuantityRecords.length} 条需要修复的记录`)
    
    if (emptyQuantityRecords.length === 0) {
      console.log('✅ 所有记录的数量字段都已填充，无需修复')
      return
    }
    
    // 2. 按产品类型分组修复
    const updatePromises = []
    
    for (const record of emptyQuantityRecords) {
      let defaultQuantity = 1 // 默认数量
      
      // 根据产品类型设置合理的默认数量
      switch (record.product_type) {
        case 'LOOSE_BEADS': // 散珠
          // 根据规格推算合理数量，如果没有规格则默认100颗
          const spec = record.specification ? parseFloat(record.specification) : 0
          if (spec > 0) {
            // 根据直径大小推算数量：直径越小数量越多
            if (spec <= 6) {
              defaultQuantity = 500 // 小珠子
            } else if (spec <= 10) {
              defaultQuantity = 200 // 中等珠子
            } else {
              defaultQuantity = 100 // 大珠子
            }
          } else {
            defaultQuantity = 200 // 无规格时的默认值
          }
          break
          
        case 'BRACELET': // 手串
          defaultQuantity = 1 // 手串通常是1串
          break
          
        case 'ACCESSORIES': // 隔片/配件
          // 隔片通常是多个
          defaultQuantity = 10
          break
          
        case 'FINISHED': // 成品
          defaultQuantity = 1 // 成品通常是1件
          break
          
        default:
          defaultQuantity = 1
          break
      }
      
      // 添加更新操作到批量处理数组
      updatePromises.push(
        prisma.purchase.update({
          where: { id: record.id },
          data: { quantity: defaultQuantity }
        })
      )
      
      console.log(`  📝 ${record.product_name} (${record.product_type}) - 设置数量: ${defaultQuantity}`)
    }
    
    // 3. 批量执行更新
    console.log('\n🔄 执行批量更新...')
    await Promise.all(updatePromises)
    
    console.log(`✅ 成功修复 ${emptyQuantityRecords.length} 条记录的数量字段`)
    
    // 4. 验证修复结果
    const remainingEmptyCount = await prisma.purchase.count({
      where: {
        OR: [
          { quantity: null },
          { quantity: 0 }
        ]
      }
    })
    
    console.log(`\n📊 修复后统计:`)
    console.log(`  剩余空数量记录: ${remainingEmptyCount}`)
    
    // 5. 显示修复后的统计
    const typeStats = await prisma.purchase.group_by({
      by: ['product_type'],
      Count: {
        id: true
      },
      Sum: {
        quantity: true
      }
    })
    
    console.log('\n📈 修复后按产品类型统计:')
    typeStats.for_each(stat => {
      console.log(`  ${stat.product_type}: ${stat.Count.id} 条记录, 总数量: ${stat.Sum.quantity || 0}`)
    })
    
  } catch (error) {
    console.error('❌ 修复数量字段时出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixQuantityFields()