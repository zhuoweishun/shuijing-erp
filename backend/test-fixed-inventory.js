import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 复制修复后的calculateRemainingQuantity函数
const calculate_remaining_quantity = async (purchase, tx) => {
  // 获取该采购记录的总使用量（包括负数，正确处理退回情况）
  const totalUsage = await tx.material_usage.aggregate({
    where: { purchase_id: purchase.id },
    Sum: {
      quantity_used_beads: true,
      quantity_used_pieces: true
    }
  })
  
  // 注意：这里使用代数和，负数MaterialUsage表示退回到库存
  const netUsedBeads = totalUsage.Sum.quantity_used_beads || 0
  const netUsedPieces = totalUsage.Sum.quantity_used_pieces || 0
  
  // 根据产品类型计算原始库存和剩余库存
  let original_quantity = 0
  let remaining_quantity = 0
  
  switch (purchase.product_type) {case 'LOOSE_BEADS':
      originalQuantity = purchase.piece_count || 0
      remainingQuantity = originalQuantity - netUsedBeads
      break
    case 'BRACELET':
      originalQuantity = purchase.quantity || 0
      remainingQuantity = originalQuantity - netUsedBeads
      break
    case 'ACCESSORIES':
    case 'FINISHED':
      originalQuantity = purchase.piece_count || purchase.total_beads || 0
      // FINISHED类型需要同时计算两个字段，因为退回记录可能存储在quantityUsedBeads中
      const netUsedTotal = netUsedBeads + netUsedPieces
      remainingQuantity = originalQuantity - netUsedTotal
      break
    default:
      // 对于其他类型，使用总颗数或片数，优先使用totalBeads
      originalQuantity = purchase.total_beads || purchase.piece_count || purchase.quantity || 0
      // 计算净使用量（正数表示消耗，负数表示退回）
      const netUsed = netUsedBeads + netUsedPieces
      remaining_quantity = original_quantity - netUsed
  }
  
  return Math.max(0, remainingQuantity)
}

async function testFixedInventory() {
  console.log('🧪 测试修复后的库存计算...')
  
  try {
    const purchase_id = 'cmf0mlzh6005rxwjxuxicmx0i'
    
    await prisma.$transaction(async (tx) => {
      // 获取采购记录
      const purchase = await tx.purchase.find_unique({
        where: { id: purchase_id }
      })
      
      console.log('📦 采购记录:')
      console.log(`- 产品名称: ${purchase.product_name}`)
      console.log(`- 产品类型: ${purchase.product_type}`)
      console.log(`- 原始数量: ${purchase.total_beads || purchase.piece_count} 件`)
      
      // 获取MaterialUsage记录
      const usages = await tx.material_usage.find_many({
        where: { purchase_id },
        orderBy: { created_at: 'asc' }
      })
      
      console.log(`\n📊 MaterialUsage记录 (${usages.length}条):`)
      
      let total_beads = 0
      let totalPieces = 0
      
      for (const usage of usages) {
        const beads = usage.quantity_used_beads || 0
        const pieces = usage.quantity_used_pieces || 0
        total_beads += beads
        totalPieces += pieces
        
        console.log(`- Beads: ${beads}, Pieces: ${pieces} - ${usage.created_at.to_i_s_o_string().split('T')[0]}`)
      }
      
      console.log(`\n🔢 字段总和:`)
      console.log(`- quantityUsedBeads总和: ${total_beads}`)
      console.log(`- quantityUsedPieces总和: ${totalPieces}`)
      console.log(`- 两字段总和: ${total_beads + totalPieces}`)
      
      // 使用修复后的函数计算库存
      const remaining_quantity = await calculate_remaining_quantity(purchase, tx)
      
      console.log(`\n✅ 修复后的计算结果:`)
      console.log(`🎯 剩余库存: ${remaining_quantity} 件`)
      
      // 验证计算逻辑
      const original_quantity = purchase.total_beads || purchase.piece_count || 0
      const netUsed = total_beads + totalPieces
      const expectedRemaining = originalQuantity - netUsed
      
      console.log(`\n🧮 计算验证:`)
      console.log(`- 原始数量: ${original_quantity}`)
      console.log(`- 净使用量: ${netUsed} (${totalPieces}消耗 + ${total_beads}退回)`)
      console.log(`- 预期剩余: ${expectedRemaining}`)
      console.log(`- 实际剩余: ${remaining_quantity}`)
      
      if (remainingQuantity === expectedRemaining) {
        console.log(`✅ 计算正确！`)
      } else {
        console.log(`❌ 计算错误！`)
      }
      
      // 用户期望的结果
      console.log(`\n👤 用户操作验证:`)
      console.log(`- 原始采购: 48件`)
      console.log(`- 制作消耗: 13件 (1+5+1+2+4)`)
      console.log(`- 销毁退回: 2件 (用户选择的1+1)`)
      console.log(`- 净消耗: 11件 (13-2)`)
      console.log(`- 应该剩余: 37件 (48-11)`)
      
      if (remainingQuantity === 37) {
        console.log(`🎉 完美！库存计算符合用户预期`)
      } else {console.log(`⚠️  库存计算结果${remaining_quantity}件，与用户预期37件不符`)
      }
    })
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFixedInventory()