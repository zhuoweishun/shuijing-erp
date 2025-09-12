// 恢复原始的采购记录数量数据
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function restoreOriginalQuantity() {
  try {
    console.log('🔄 开始恢复原始采购记录数量数据...')
    
    // 1. 查看当前数据状态
    const total_count = await prisma.purchase.count()
    console.log(`📊 采购记录总数: ${total_count}`)
    
    // 2. 查看按产品类型的统计
    const typeStats = await prisma.purchase.group_by({
      by: ['product_type'],
      Count: {
        id: true
      },
      Sum: {
        quantity: true,
        piece_count: true
      }
    })
    
    console.log('\n📈 当前按产品类型统计:')
    typeStats.for_each(stat => {
      console.log(`  ${stat.product_type}: ${stat.Count.id} 条记录`)
      console.log(`    quantity总和: ${stat.Sum.quantity || 0}`)
      console.log(`    pieceCount总和: ${stat.Sum.piece_count || 0}`)
    })
    
    // 3. 检查是否有原始测试数据的特征
    const sampleRecords = await prisma.purchase.find_many({
      take: 10,
      select: {
        id: true,
        product_name: true,
        product_type: true,
        quantity: true,
        piece_count: true,
        total_beads: true,
        bead_diameter: true,
        specification: true,
        notes: true
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    console.log('\n🔍 前10条记录样本:')
    sampleRecords.for_each(record => {
      console.log(`  ${record.product_name} (${record.product_type})`)
      console.log(`    quantity: ${record.quantity}, piece_count: ${record.piece_count}`)
      console.log(`    total_beads: ${record.total_beads}, notes: ${record.notes}`)
      console.log('')
    })
    
    // 4. 检查是否有"真实业务产品"标记的记录
    const realBusinessRecords = await prisma.purchase.count({
      where: {
        notes: {
          contains: '真实业务产品'
        }
      }
    })
    
    console.log(`\n📋 包含"真实业务产品"标记的记录数: ${realBusinessRecords}`)
    
    // 5. 如果发现数据被错误修改，提供恢复建议
    const suspiciousRecords = await prisma.purchase.find_many({
      where: {
        AND: [
          {
            OR: [
              { product_type: 'LOOSE_BEADS' },
              { product_type: 'ACCESSORIES' },
              { product_type: 'FINISHED' }
            ]
          },
          {
            OR: [
              { quantity: { not: null } },
              { 
                AND: [
                  { product_type: 'LOOSE_BEADS' },
                  { piece_count: { in: [100, 200, 500] } } // 我之前设置的默认值
                ]
              },
              {
                AND: [
                  { product_type: 'ACCESSORIES' },
                  { piece_count: 10 } // 我之前设置的默认值
                ]
              },
              {
                AND: [
                  { product_type: 'FINISHED' },
                  { piece_count: 1 } // 我之前设置的默认值
                ]
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        product_name: true,
        product_type: true,
        quantity: true,
        piece_count: true,
        total_beads: true,
        notes: true
      },
      take: 20
    })
    
    console.log(`\n⚠️  可能被错误修改的记录数: ${suspiciousRecords.length}`)
    if (suspiciousRecords.length > 0) {
      console.log('\n示例记录:')
      suspiciousRecords.slice(0, 5).for_each(record => {
        console.log(`  ${record.product_name} (${record.product_type})`)
        console.log(`    quantity: ${record.quantity}, piece_count: ${record.piece_count}`)
        console.log(`    total_beads: ${record.total_beads}`)
        console.log('')
      })
    }
    
    // 6. 检查原始测试数据是否还存在
    const originalTestData = await prisma.purchase.find_many({
      where: {
        OR: [
          { notes: { contains: '真实业务产品' } },
          { notes: { contains: '配饰产品' } }
        ]
      },
      select: {
        id: true,
        product_name: true,
        product_type: true,
        quantity: true,
        piece_count: true,
        total_beads: true,
        notes: true
      },
      take: 10
    })
    
    console.log(`\n📦 原始测试数据样本 (${originalTestData.length} 条):`)
    originalTestData.for_each(record => {
      console.log(`  ${record.product_name} (${record.product_type})`)
      console.log(`    quantity: ${record.quantity}, piece_count: ${record.piece_count}`)
      console.log(`    total_beads: ${record.total_beads}`)
      console.log('')
    })
    
    console.log('\n✅ 数据检查完成')
    console.log('\n💡 建议:')
    console.log('1. 如果发现数据被错误修改，可以删除所有采购记录重新生成测试数据')
    console.log('2. 或者手动恢复被错误修改的记录的数量字段')
    console.log('3. 检查财务流水账API是否正确使用了quantity和pieceCount字段')
    
  } catch (error) {
    console.error('❌ 检查数据时出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

restoreOriginalQuantity()