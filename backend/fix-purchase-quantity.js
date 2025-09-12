import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixPurchaseQuantity() {
  console.log('🔧 修正采购记录数量...')
  
  try {
    // 查找采购记录
    const purchase = await prisma.purchase.find_unique({
      where: {
        id: 'cmf0mlzh6005rxwjxuxicmx0i'
      }
    })
    
    if (!purchase) {
      console.log('❌ 未找到采购记录')
      return
    }
    
    console.log('📦 当前采购记录信息:')
    console.log(`- ID: ${purchase.id}`)
    console.log(`- 产品名称: ${purchase.product_name}`)
    console.log(`- quantityBeads: ${purchase.quantityBeads}`)
    console.log(`- quantityPieces: ${purchase.quantityPieces}`)
    console.log(`- total_beads: ${purchase.total_beads}`)
    console.log(`- 采购日期: ${purchase.purchase_date}`)
    
    // 根据用户之前的描述，这个采购记录应该是48件
    console.log('\n🔧 修正数量为48件...')
    
    const updatedPurchase = await prisma.purchase.update({
      where: {
        id: 'cmf0mlzh6005rxwjxuxicmx0i'
      },
      data: {
        total_beads: 48
      }
    })
    
    console.log('✅ 采购记录已修正:')
    console.log(`- quantityBeads: ${updatedPurchase.quantityBeads}`)
    console.log(`- total_beads: ${updatedPurchase.total_beads}`)
    
    // 重新计算库存
    console.log('\n📊 重新计算库存...')
    
    const materialUsages = await prisma.material_usage.find_many({
      where: {
        purchase_id: 'cmf0mlzh6005rxwjxuxicmx0i'
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    console.log(`MaterialUsage记录 (${materialUsages.length}条):`)
    
    let totalUsed = 0
    for (const usage of materialUsages) {
      const quantity = usage.quantity_used_beads || 0
      totalUsed += quantity
      
      console.log(`- 数量: ${quantity} 件 ${quantity < 0 ? '(退回)' : '(消耗)'}`)
      console.log(`  创建时间: ${usage.created_at.to_i_s_o_string()}`)
    }
    
    const remaining = 48 - totalUsed
    
    console.log(`\n📈 库存计算结果:`)
    console.log(`- 原始采购: 48 件`)
    console.log(`- 总使用量: ${totalUsed} 件`)
    console.log(`- 剩余库存: ${remaining} 件`)
    
    // 分别统计正数和负数
    const positiveUsages = materialUsages.filter(u => (u.quantity_used_beads || 0) > 0)
    const negativeUsages = materialUsages.filter(u => (u.quantity_used_beads || 0) < 0)
    
    const totalConsumed = positiveUsages.reduce((sum, u) => sum + (u.quantity_used_beads || 0), 0)
    const totalReturned = Math.abs(negativeUsages.reduce((sum, u) => sum + (u.quantity_used_beads || 0), 0))
    
    console.log(`\n🔢 详细统计:`)
    console.log(`- 总消耗: ${totalConsumed} 件`)
    console.log(`- 总退回: ${totalReturned} 件`)
    console.log(`- 净消耗: ${totalConsumed - totalReturned} 件`)
    console.log(`- 最终剩余: ${48 - (totalConsumed - totalReturned)} 件`)
    
    // 现在应该显示正确的库存数量了
    if (totalReturned === 2) {
      console.log('\n✅ 退回数量正确：2件（用户选择的1+1）')
      console.log(`✅ 最终库存应该是: ${48 - (totalConsumed - totalReturned)} 件`)
    } else {
      console.log(`\n⚠️  退回数量不正确：${totalReturned}件，应该是2件`)
    }
    
  } catch (error) {
    console.error('❌ 修正过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPurchaseQuantity()