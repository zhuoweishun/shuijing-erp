// 修复被错误设置的数量字段
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixIncorrectQuantity() {
  try {
    console.log('🔧 开始修复被错误设置的数量字段...')
    
    // 1. 修复散珠类型：quantity应该为null，只有pieceCount有值
    const looseBeadsUpdates = await prisma.purchase.update_many({
      where: {
        product_type: 'LOOSE_BEADS',
        quantity: { not: null } // 找到quantity不为null的散珠记录
      },
      data: {
        quantity: null // 将quantity设置为null
      }
    })
    
    console.log(`✅ 修复散珠类型quantity字段: ${looseBeadsUpdates.count} 条记录`)
    
    // 2. 修复配件类型：quantity应该为null，只有pieceCount有值
    const accessoriesUpdates = await prisma.purchase.update_many({
      where: {
        product_type: 'ACCESSORIES',
        quantity: { not: null } // 找到quantity不为null的配件记录
      },
      data: {
        quantity: null // 将quantity设置为null
      }
    })
    
    console.log(`✅ 修复配件类型quantity字段: ${accessoriesUpdates.count} 条记录`)
    
    // 3. 修复成品类型：quantity应该为null，只有pieceCount有值
    const finishedUpdates = await prisma.purchase.update_many({
      where: {
        product_type: 'FINISHED',
        quantity: { not: null } // 找到quantity不为null的成品记录
      },
      data: {
        quantity: null // 将quantity设置为null
      }
    })
    
    console.log(`✅ 修复成品类型quantity字段: ${finishedUpdates.count} 条记录`)
    
    // 4. 检查手串类型是否正确（手串应该有quantity字段）
    const braceletWithoutQuantity = await prisma.purchase.count({
      where: {
        product_type: 'BRACELET',
        quantity: null
      }
    })
    
    if (braceletWithoutQuantity > 0) {
      console.log(`⚠️  发现 ${braceletWithoutQuantity} 条手串记录没有quantity字段`)
      
      // 为没有quantity的手串记录计算并设置quantity
      const braceletsToFix = await prisma.purchase.find_many({
        where: {
          product_type: 'BRACELET',
          quantity: null
        },
        select: {
          id: true,
          bead_diameter: true,
          total_beads: true,
          piece_count: true
        }
      })
      
      for (const bracelet of braceletsToFix) {
        let quantity = 1 // 默认1串
        
        if (bracelet.bead_diameter && bracelet.total_beads) {
          const beads_per_string = Math.floor(160 / bracelet.bead_diameter)
          quantity = Math.ceil(bracelet.total_beads / beads_per_string)
        } else if (bracelet.piece_count) {
          // 如果没有beadDiameter但有pieceCount，假设每串20颗
          quantity = Math.ceil(bracelet.piece_count / 20)
        }
        
        await prisma.purchase.update({
          where: { id: bracelet.id },
          data: { quantity }
        })
      }
      
      console.log(`✅ 修复手串类型quantity字段: ${braceletsToFix.length} 条记录`)
    }
    
    // 5. 验证修复结果
    console.log('\n📊 修复后统计:')
    
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
    
    typeStats.for_each(stat => {
      console.log(`  ${stat.product_type}: ${stat.Count.id} 条记录`)
      console.log(`    quantity总和: ${stat.Sum.quantity || 0} (${stat.product_type === 'BRACELET' ? '应该有值' : '应该为null'})`)
      console.log(`    pieceCount总和: ${stat.Sum.piece_count || 0} (应该有值)`)
      console.log('')
    })
    
    // 6. 检查是否还有错误的数据
    const incorrectLooseBeads = await prisma.purchase.count({
      where: {
        product_type: 'LOOSE_BEADS',
        quantity: { not: null }
      }
    })
    
    const incorrectAccessories = await prisma.purchase.count({
      where: {
        product_type: 'ACCESSORIES',
        quantity: { not: null }
      }
    })
    
    const incorrectFinished = await prisma.purchase.count({
      where: {
        product_type: 'FINISHED',
        quantity: { not: null }
      }
    })
    
    const incorrectBracelet = await prisma.purchase.count({
      where: {
        product_type: 'BRACELET',
        quantity: null
      }
    })
    
    console.log('\n🔍 数据完整性检查:')
    console.log(`  散珠类型错误quantity记录: ${incorrectLooseBeads} (应该为0)`)
    console.log(`  配件类型错误quantity记录: ${incorrectAccessories} (应该为0)`)
    console.log(`  成品类型错误quantity记录: ${incorrectFinished} (应该为0)`)
    console.log(`  手串类型缺失quantity记录: ${incorrectBracelet} (应该为0)`)
    
    if (incorrectLooseBeads === 0 && incorrectAccessories === 0 && incorrectFinished === 0 && incorrectBracelet === 0) {
      console.log('\n✅ 所有数量字段已正确设置！')
    } else {
      console.log('\n⚠️  仍有数据需要修复')
    }
    
  } catch (error) {
    console.error('❌ 修复数量字段时出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixIncorrectQuantity()