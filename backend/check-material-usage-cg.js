import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkMaterialUsage() {
  try {
    // 查找采购记录
    const purchase = await prisma.purchase.find_first({
      where: { purchase_code: 'CG20250901590291' }
    })
    
    if (!purchase) {
      console.log('未找到采购记录 CG20250901590291')
      return
    }
    
    console.log('采购记录:')
    console.log(`ID: ${purchase.id}`)
    console.log(`编号: ${purchase.purchase_code}`)
    console.log(`产品类型: ${purchase.product_type}`)
    console.log(`原始数量: ${purchase.piece_count || purchase.quantity || purchase.total_beads}`)
    console.log('\n')
    
    // 查找MaterialUsage记录
    const materialUsage = await prisma.materialUsage.find_many({
      where: { purchase_id: purchase.id },
      orderBy: { created_at: 'asc' }
    })
    
    console.log('MaterialUsage记录:')
    materialUsage.for_each((usage, index) => {
      console.log(`记录 ${index + 1}:`)
      console.log(`  quantity_used_beads: ${usage.quantity_used_beads}`)
      console.log(`  quantity_used_pieces: ${usage.quantity_used_pieces}`)
      console.log(`  action: ${usage.action}`)
      console.log(`  created_at: ${usage.created_at}`)
    })
    console.log('\n')
    
    // 计算总使用量
    const totalUsage = await prisma.materialUsage.aggregate({
      where: { purchase_id: purchase.id },
      Sum: {
        quantity_used_beads: true,
        quantity_used_pieces: true
      }
    })
    
    console.log('总使用量:')
    console.log(`  总quantityUsedBeads: ${totalUsage.Sum.quantity_used_beads || 0}`)
    console.log(`  总quantityUsedPieces: ${totalUsage.Sum.quantity_used_pieces || 0}`)
    
    // 手动计算剩余量
    const netUsedBeads = totalUsage.Sum.quantity_used_beads || 0
    const netUsedPieces = totalUsage.Sum.quantity_used_pieces || 0
    
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
        originalQuantity = purchase.piece_count || 0
        remainingQuantity = originalQuantity - netUsedPieces
        break
      default:
        originalQuantity = purchase.total_beads || purchase.piece_count || purchase.quantity || 0
        const netUsed = netUsedBeads + netUsedPieces
        remaining_quantity = original_quantity - netUsed
    }
    
    console.log('\n计算结果:')
    console.log(`  原始数量: ${original_quantity}`)
    console.log(`  净使用量: ${netUsedBeads + netUsedPieces}`)
    console.log(`  剩余数量: ${Math.max(0, remaining_quantity)}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMaterialUsage()