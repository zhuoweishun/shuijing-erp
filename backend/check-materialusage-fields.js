import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMaterialUsageFields() {
  console.log('🔍 检查MaterialUsage表字段...')
  
  try {
    // 查找所有MaterialUsage记录
    const usages = await prisma.material_usage.find_many({
      where: {
        purchase_id: 'cmf0mlzh6005rxwjxuxicmx0i'
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    console.log(`找到 ${usages.length} 条MaterialUsage记录:`)
    
    for (const usage of usages) {
      console.log(`\n记录ID: ${usage.id}`)
      console.log(`- quantity_used_beads: ${usage.quantity_used_beads}`)
      console.log(`- quantity_used_pieces: ${usage.quantity_used_pieces}`)
      console.log(`- unitCost: ${usage.unitCost}`)
      console.log(`- total_cost: ${usage.total_cost}`)
      console.log(`- 创建时间: ${usage.created_at.to_i_s_o_string()}`)
      
      // 显示所有字段
      console.log('- 完整记录:', JSON.stringify(usage, null, 2))
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMaterialUsageFields()