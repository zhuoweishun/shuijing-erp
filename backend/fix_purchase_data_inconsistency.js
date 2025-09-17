import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fix_purchase_data_inconsistency() {
  console.log('🔧 修复purchase表数据不一致问题...')
  
  try {
    // 1. 分析CG20250917120816的数据问题
    console.log('\n📊 1. 分析CG20250917120816的数据问题:')
    const purchase_120816 = await prisma.purchase.findFirst({
      where: {
        purchase_code: 'CG20250917120816'
      }
    })
    
    if (purchase_120816) {
      console.log('当前Purchase表数据:')
      console.log(`- total_beads: ${purchase_120816.total_beads} (应该是15)`)
      console.log(`- piece_count: ${purchase_120816.piece_count} (正确值15)`)
      console.log(`- total_price: ${purchase_120816.total_price} (正确值1500)`)
      console.log(`- purchase_type: ${purchase_120816.purchase_type}`)
      
      // 对于散珠类型，total_beads应该等于piece_count
      if (purchase_120816.purchase_type === 'LOOSE_BEADS') {
        console.log('\n🔧 修复散珠类型的total_beads字段...')
        
        const updated_purchase = await prisma.purchase.update({
          where: {
            id: purchase_120816.id
          },
          data: {
            total_beads: purchase_120816.piece_count || 15
          }
        })
        
        console.log('✅ 已修复purchase表的total_beads字段:')
        console.log(`- 修复前: ${purchase_120816.total_beads}`)
        console.log(`- 修复后: ${updated_purchase.total_beads}`)
      }
    }
    
    // 2. 检查其他散珠记录是否也有类似问题
    console.log('\n📊 2. 检查其他散珠记录的数据一致性:')
    const all_loose_beads = await prisma.purchase.findMany({
      where: {
        purchase_type: 'LOOSE_BEADS',
        status: { in: ['ACTIVE', 'USED'] }
      }
    })
    
    for (const purchase of all_loose_beads) {
      console.log(`\n检查 ${purchase.purchase_code}:`)
      console.log(`- total_beads: ${purchase.total_beads}`)
      console.log(`- piece_count: ${purchase.piece_count}`)
      
      // 对于散珠，如果piece_count存在且与total_beads不一致，则修复
      if (purchase.piece_count && purchase.total_beads !== purchase.piece_count) {
        console.log(`⚠️  发现不一致：total_beads(${purchase.total_beads}) != piece_count(${purchase.piece_count})`)
        
        const updated = await prisma.purchase.update({
          where: {
            id: purchase.id
          },
          data: {
            total_beads: purchase.piece_count
          }
        })
        
        console.log(`✅ 已修复 ${purchase.purchase_code} 的total_beads: ${purchase.total_beads} -> ${updated.total_beads}`)
      } else {
        console.log('✅ 数据一致')
      }
    }
    
    // 3. 验证修复结果
    console.log('\n📊 3. 验证修复结果:')
    const fixed_purchase = await prisma.purchase.findFirst({
      where: {
        purchase_code: 'CG20250917120816'
      }
    })
    
    const material = await prisma.material.findFirst({
      where: {
        material_code: 'CG20250917120816'
      }
    })
    
    if (fixed_purchase && material) {
      console.log('修复后的数据对比:')
      console.log(`- Purchase total_beads: ${fixed_purchase.total_beads}`)
      console.log(`- Materials original_quantity: ${material.original_quantity}`)
      console.log(`- Purchase total_price: ${fixed_purchase.total_price}`)
      console.log(`- Materials total_cost: ${material.total_cost}`)
      
      if (fixed_purchase.total_beads === material.original_quantity) {
        console.log('✅ 数量数据已一致')
      } else {
        console.log('❌ 数量数据仍不一致')
      }
      
      if (fixed_purchase.total_price === material.total_cost) {
        console.log('✅ 价格数据已一致')
      } else {
        console.log('❌ 价格数据仍不一致')
      }
    }
    
    // 4. 重新测试单价区间分布计算
    console.log('\n📊 4. 重新测试单价区间分布计算:')
    const updated_loose_beads = await prisma.purchase.findMany({
      where: {
        purchase_type: 'LOOSE_BEADS',
        status: { in: ['ACTIVE', 'USED'] },
        total_price: { not: null, gt: 0 },
        total_beads: { not: null, gt: 0 }
      },
      include: {
        material_usages: true
      }
    })
    
    console.log('修复后的散珠数据:')
    let total_remaining = 0
    updated_loose_beads.forEach(purchase => {
      const used_quantity = purchase.material_usages.reduce((sum, usage) => sum + (usage.quantity_used || 0), 0)
      const remaining_beads = (purchase.total_beads || 0) - used_quantity
      const unit_price = purchase.total_beads > 0 ? (purchase.total_price || 0) / purchase.total_beads : 0
      
      console.log(`- ${purchase.purchase_code}: ${purchase.purchase_name}`)
      console.log(`  总颗数: ${purchase.total_beads}, 已用: ${used_quantity}, 剩余: ${remaining_beads}`)
      console.log(`  总价: ${purchase.total_price}, 单价: ${unit_price.toFixed(4)}元/颗`)
      
      total_remaining += remaining_beads
    })
    
    console.log(`\n散珠总剩余数量: ${total_remaining} 颗`)
    
    console.log('\n✅ 修复完成!')
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fix_purchase_data_inconsistency()