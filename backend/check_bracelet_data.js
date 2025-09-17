import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check_bracelet_data() {
  try {
    console.log('🔍 检查BRACELET类型的purchase数据结构:')
    
    const bracelet = await prisma.purchase.findFirst({
      where: {
        purchase_type: 'BRACELET'
      }
    })
    
    if (bracelet) {
      console.log('BRACELET purchase数据:')
      console.log('- purchase_name:', bracelet.purchase_name)
      console.log('- piece_count:', bracelet.piece_count)
      console.log('- total_beads:', bracelet.total_beads)
      console.log('- specification:', bracelet.specification)
      console.log('- total_price:', bracelet.total_price)
      console.log('')
      
      // 检查对应的material记录
      const material = await prisma.material.findFirst({
        where: {
          purchase_id: bracelet.id
        }
      })
      
      if (material) {
        console.log('对应的material记录:')
        console.log('- material_name:', material.material_name)
        console.log('- original_quantity:', material.original_quantity)
        console.log('- inventory_unit:', material.inventory_unit)
        console.log('- unit_cost:', material.unit_cost)
        console.log('')
        
        console.log('💡 分析:')
        console.log(`Purchase中total_beads=${bracelet.total_beads}，但Material中original_quantity=${material.original_quantity}`)
        
        if (bracelet.total_beads && material.original_quantity === 1) {
          console.log('❌ 问题确认：BRACELET类型应该使用total_beads作为数量，而不是默认值1')
          console.log(`正确的数量应该是: ${bracelet.total_beads}`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

check_bracelet_data()