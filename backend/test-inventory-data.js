import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 计算采购记录的剩余库存（根据依赖树逻辑）
const calculate_remaining_quantity = async (purchase) => {
  // 获取该采购记录的总使用量（包括负数，正确处理退回情况）
  const totalUsage = await prisma.material_usage.aggregate({
    where: { purchase_id: purchase.id },
    Sum: {
      quantity_used_beads: true,
      quantity_used_pieces: true
    }
  })
  
  // 注意：这里使用代数和，负数MaterialUsage表示退回到库存
  const netUsedBeads = totalUsage.Sum.quantity_used_beads || 0
  const netUsedPieces = totalUsage.Sum.quantity_used_pieces || 0
  const netUsed = netUsedBeads + netUsedPieces
  
  // 根据产品类型获取初始数量
  const initialQuantity = purchase.total_beads || purchase.piece_count || purchase.quantity || 0
  
  // 计算剩余库存：初始数量 - 净使用量（包含退回的负数）
  return Math.max(0, initialQuantity - netUsed)
}

async function checkInventoryData() {
  try {
    console.log('🔍 查看当前库存数据（根据依赖树逻辑）...')
    
    // 查看散珠类型的产品
    console.log('\n📿 散珠类型产品:')
    const scatteredBeadsRaw = await prisma.purchase.find_many({
      where: {
        product_type: 'LOOSE_BEADS'
      },
      include: {
        materialUsages: true
      },
      take: 10
    })
    
    const scatteredBeads = []
    for (const purchase of scatteredBeadsRaw) {const remaining_quantity = await calculate_remaining_quantity(purchase)
      if (remainingQuantity > 0) {
        scatteredBeads.push({
          ...purchase,
          remaining_quantity
        })
      }
    }
    
    scatteredBeads.slice(0, 5).for_each((item, index) => {
       console.log(`  ${index + 1}. ${item.product_name} (${item.purchase_code})`);
       console.log(`     规格: ${item.specification || '未知'}mm`);
       console.log(`     剩余: ${item.remaining_quantity}/${item.total_beads} 颗`);
       console.log(`     单价: ¥${item.price_per_bead}/颗`);
       console.log('');
     })
    
    // 查看手串类型的产品
     console.log('\n📿 手串类型产品:')
     const braceletsRaw = await prisma.purchase.find_many({
      where: {
        product_type: 'BRACELET'
      },
      include: {
        materialUsages: true
      },
      take: 10
    })
    
    const bracelets = []
    for (const purchase of braceletsRaw) {const remaining_quantity = await calculate_remaining_quantity(purchase)
      if (remainingQuantity > 0) {
        bracelets.push({
          ...purchase,
          remaining_quantity
        })
      }
    }
    
    bracelets.slice(0, 3).for_each((item, index) => {
      console.log(`  ${index + 1}. ${item.product_name} (${item.purchase_code})`);
      console.log(`     规格: ${item.specification || '未知'}mm`);
      console.log(`     剩余: ${item.remaining_quantity}/${item.total_beads} 颗`);
      console.log(`     单价: ¥${item.price_per_bead}/颗`);
      console.log('');
    });
    
    // 查看配件类型的产品
     console.log('\n🔧 配件类型产品:')
     const accessoriesRaw = await prisma.purchase.find_many({
      where: {
        product_type: 'ACCESSORIES'
      },
      include: {
        materialUsages: true
      },
      take: 15
    })
    
    const accessories = []
    for (const purchase of accessoriesRaw) {const remaining_quantity = await calculate_remaining_quantity(purchase)
      if (remainingQuantity > 0) {
        accessories.push({
          ...purchase,
          remaining_quantity
        })
      }
    }
    
    accessories.slice(0, 10).for_each((item, index) => {
      console.log(`  ${index + 1}. ${item.product_name} (${item.purchase_code})`);
      console.log(`     规格: ${item.specification || '未知'}`);
      console.log(`     剩余: ${item.remaining_quantity}/${item.piece_count} 件`);
      console.log(`     单价: ¥${item.price_per_piece}/件`);
      console.log('');
    });
    
    console.log('\n✅ 库存数据查看完成');
    
    // 返回选择的原材料ID
    const selected_materials = {
      scatteredBeads: scatteredBeads.slice(0, 2).map(item => ({
        id: item.id,
        name: item.product_name,
        purchase_code: item.purchase_code,
        available: item.remaining_quantity,
        unit_price: item.price_per_bead,
        specification: item.specification
      })),
      bracelets: bracelets.slice(0, 1).map(item => ({
        id: item.id,
        name: item.product_name,
        purchase_code: item.purchase_code,
        available: item.remaining_quantity,
        unit_price: item.price_per_bead,
        specification: item.specification
      })),
      accessories: accessories.slice(0, 5).map(item => ({
        id: item.id,
        name: item.product_name,
        purchase_code: item.purchase_code,
        available: item.remaining_quantity,
        unit_price: item.price_per_piece,
        specification: item.specification
      }))
    }
    
    console.log('\n🎯 选择的原材料:')
    console.log('散珠 (需要各2颗):', selectedMaterials.scatteredBeads.map(item => `${item.name}(${item.purchase_code})`).join(', '))
    console.log('手串 (需要6颗):', selectedMaterials.bracelets.map(item => `${item.name}(${item.purchase_code})`).join(', '))
    console.log('配件 (需要各1件):', selectedMaterials.accessories.map(item => `${item.name}(${item.purchase_code})`).join(', '))
    
    return selectedMaterials
    
  } catch (error) {
    console.error('❌ 查看库存数据失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkInventoryData().catch(console.error)