import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function finalInventoryCalculation() {
  console.log('🎯 最终库存计算（使用正确字段）...')
  
  try {
    const purchase_id = 'cmf0mlzh6005rxwjxuxicmx0i'
    
    // 获取采购记录
    const purchase = await prisma.purchase.find_unique({
      where: { id: purchase_id }
    })
    
    console.log('📦 采购记录:')
    console.log(`- 产品名称: ${purchase.product_name}`)
    console.log(`- 原始数量: ${purchase.total_beads} 件`)
    
    // 获取所有MaterialUsage记录
    const usages = await prisma.material_usage.find_many({
      where: { purchase_id },
      orderBy: { created_at: 'asc' }
    })
    
    console.log(`\n📊 MaterialUsage记录分析 (${usages.length}条):`)
    
    let totalUsedPieces = 0
    const consumptionRecords = []
    const returnRecords = []
    
    for (const usage of usages) {
      const pieces = usage.quantity_used_pieces || 0
      totalUsedPieces += pieces
      
      if (pieces > 0) {
        consumptionRecords.push({
          quantity: pieces,
          date: usage.created_at.to_i_s_o_string().split('T')[0]
        })
      } else if (pieces < 0) {
        returnRecords.push({
          quantity: Math.abs(pieces),
          date: usage.created_at.to_i_s_o_string().split('T')[0]
        })
      }
      
      console.log(`- ${pieces} 件 ${pieces < 0 ? '(退回)' : '(消耗)'} - ${usage.created_at.to_i_s_o_string().split('T')[0]}`)
    }
    
    console.log(`\n🔢 统计结果:`)
    console.log(`- 原始采购: ${purchase.total_beads} 件`)
    console.log(`- 消耗记录: ${consumptionRecords.length} 条`)
    console.log(`- 总消耗量: ${consumptionRecords.reduce((sum, r) => sum + r.quantity, 0)} 件`)
    console.log(`- 退回记录: ${returnRecords.length} 条`)
    console.log(`- 总退回量: ${returnRecords.reduce((sum, r) => sum + r.quantity, 0)} 件`)
    console.log(`- 净使用量: ${totalUsedPieces} 件`)
    console.log(`- 剩余库存: ${purchase.total_beads - totalUsedPieces} 件`)
    
    const finalInventory = purchase.total_beads - totalUsedPieces
    
    console.log(`\n✅ 最终结果:`)
    console.log(`🎯 原材料剩余库存: ${finalInventory} 件`)
    
    // 验证用户的操作
    console.log(`\n🔍 验证用户操作:`)
    console.log(`- 用户说每次销毁2件SKU，选择退回1件原材料`)
    console.log(`- 操作了2次，应该退回2件原材料`)
    console.log(`- 实际退回记录: ${returnRecords.map(r => r.quantity).join(' + ')} = ${returnRecords.reduce((sum, r) => sum + r.quantity, 0)} 件`)
    
    if (returnRecords.reduce((sum, r) => sum + r.quantity, 0) === 2) {
      console.log(`✅ 退回数量正确！`)
    } else {
      console.log(`❌ 退回数量不正确！`)
    }
    
    // 检查前端显示是否正确
    if (finalInventory === 37) {
      console.log(`\n🎉 库存计算正确！前端应该显示37件，而不是35件`)
      console.log(`📝 需要刷新前端页面或重启后端服务以更新显示`)
    } else if (finalInventory === 35) {
      console.log(`\n⚠️  前端显示35件是正确的，但采购数据可能还有问题`)
    } else {
      console.log(`\n❓ 计算结果${finalInventory}件，需要进一步检查`)
    }
    
  } catch (error) {
    console.error('❌ 计算过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

finalInventoryCalculation()