// 修复"油胆"材料数据同步问题
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function fixYoudanMaterialSync() {
  try {
    console.log('🔍 开始修复"油胆"材料数据同步问题...')
    
    // 1. 查询"油胆"的purchase数据
    const youdanPurchase = await prisma.purchase.findFirst({
      where: {
        purchase_name: {
          contains: '油胆'
        }
      },
      select: {
        id: true,
        purchase_code: true,
        purchase_name: true,
        purchase_type: true,
        piece_count: true,
        total_beads: true,
        quantity: true,
        quality: true,
        bead_diameter: true,
        specification: true,
        purchase_date: true
      }
    })
    
    if (!youdanPurchase) {
      console.log('❌ 未找到"油胆"的采购记录')
      return
    }
    
    console.log('📋 找到"油胆"采购记录:', {
      id: youdanPurchase.id,
      purchase_code: youdanPurchase.purchase_code,
      purchase_name: youdanPurchase.purchase_name,
      purchase_type: youdanPurchase.purchase_type,
      piece_count: youdanPurchase.piece_count,
      total_beads: youdanPurchase.total_beads,
      quantity: youdanPurchase.quantity
    })
    
    // 2. 查询对应的material数据
    const youdanMaterial = await prisma.material.findFirst({
      where: {
        purchase_id: youdanPurchase.id
      }
    })
    
    if (!youdanMaterial) {
      console.log('❌ 未找到"油胆"的材料记录')
      return
    }
    
    console.log('📋 找到"油胆"材料记录:', {
      id: youdanMaterial.id,
      material_name: youdanMaterial.material_name,
      original_quantity: youdanMaterial.original_quantity,
      used_quantity: youdanMaterial.used_quantity,
      remaining_quantity: youdanMaterial.remaining_quantity
    })
    
    // 3. 计算正确的数量
    let correctOriginalQuantity = 0
    
    if (youdanPurchase.purchase_type === 'LOOSE_BEADS') {
      correctOriginalQuantity = youdanPurchase.piece_count || 0
    } else if (youdanPurchase.purchase_type === 'BRACELET') {
      correctOriginalQuantity = youdanPurchase.total_beads || youdanPurchase.piece_count || 0
    } else {
      correctOriginalQuantity = youdanPurchase.quantity || youdanPurchase.piece_count || 0
    }
    
    console.log(`🔧 计算得出正确的original_quantity: ${correctOriginalQuantity}`)
    
    // 4. 更新material记录
    const updatedMaterial = await prisma.material.update({
      where: {
        id: youdanMaterial.id
      },
      data: {
        original_quantity: correctOriginalQuantity,
        remaining_quantity: correctOriginalQuantity - youdanMaterial.used_quantity
      }
    })
    
    console.log('✅ 成功更新"油胆"材料记录:', {
      id: updatedMaterial.id,
      material_name: updatedMaterial.material_name,
      original_quantity: updatedMaterial.original_quantity,
      used_quantity: updatedMaterial.used_quantity,
      remaining_quantity: updatedMaterial.remaining_quantity
    })
    
    // 5. 验证修复结果
    console.log('🔍 验证修复结果...')
    
    const verifyMaterial = await prisma.material.findFirst({
      where: {
        purchase_id: youdanPurchase.id
      }
    })
    
    console.log('📊 修复后的材料数据:', {
      material_name: verifyMaterial.material_name,
      original_quantity: verifyMaterial.original_quantity,
      used_quantity: verifyMaterial.used_quantity,
      remaining_quantity: verifyMaterial.remaining_quantity
    })
    
    if (verifyMaterial.remaining_quantity > 0) {
      console.log('🎉 修复成功！"油胆"现在应该在半成品库存中显示正确的数量')
    } else {
      console.log('⚠️ 修复后remaining_quantity仍为0，可能还有其他问题')
    }
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 执行修复
fixYoudanMaterialSync()
  .then(() => {
    console.log('🏁 修复脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 修复脚本执行失败:', error)
    process.exit(1)
  })