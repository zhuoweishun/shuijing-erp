import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugReturnRecords() {
  console.log('🔍 调试退回记录...')
  
  try {
    const purchase_id = 'cmf0mlzh6005rxwjxuxicmx0i'
    
    // 获取所有MaterialUsage记录
    const usages = await prisma.material_usage.find_many({
      where: { purchase_id },
      orderBy: { created_at: 'asc' }
    })
    
    console.log(`找到 ${usages.length} 条MaterialUsage记录:`)
    
    for (const usage of usages) {
      console.log(`\n记录ID: ${usage.id}`)
      console.log(`- quantity_used_beads: ${usage.quantity_used_beads}`)
      console.log(`- quantity_used_pieces: ${usage.quantity_used_pieces}`)
      console.log(`- 创建时间: ${usage.created_at.to_i_s_o_string()}`)
      
      // 检查哪个字段有负数
      if (usage.quantity_used_beads < 0) {
        console.log(`  🔴 quantityUsedBeads有负数: ${usage.quantity_used_beads}`)
      }
      if (usage.quantity_used_pieces < 0) {
        console.log(`  🔴 quantityUsedPieces有负数: ${usage.quantity_used_pieces}`)
      }
    }
    
    // 分别计算两个字段的总和
    const total_beads = usages.reduce((sum, u) => sum + (u.quantity_used_beads || 0), 0)
    const totalPieces = usages.reduce((sum, u) => sum + (u.quantity_used_pieces || 0), 0)
    
    console.log(`\n📊 字段总和:`)
    console.log(`- quantityUsedBeads总和: ${total_beads}`)
    console.log(`- quantityUsedPieces总和: ${totalPieces}`)
    
    // 检查calculateRemainingQuantity函数应该使用哪个字段
    console.log(`\n🤔 分析:`)
    console.log(`- 如果使用quantityUsedBeads: 剩余 = 48 - (${total_beads}) = ${48 - total_beads} 件`)
    console.log(`- 如果使用quantityUsedPieces: 剩余 = 48 - (${totalPieces}) = ${48 - totalPieces} 件`)
    
    // 前端显示35件，所以应该是48-13=35，说明退回记录没有被计算
    console.log(`\n💡 前端显示35件，说明:`)
    console.log(`- 系统可能只计算了quantityUsedPieces的正数部分: 1+5+1+2+4 = 13`)
    console.log(`- 48 - 13 = 35 件`)
    console.log(`- 退回的-1、-1记录可能在quantityUsedBeads字段中，但系统没有计算`)
    
  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugReturnRecords()