import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCurrentInventory() {
  console.log('🔍 检查当前库存状态...')
  
  try {
    // 查找原材料CG20250901590291
    const purchase = await prisma.purchase.find_first({
      where: {
        id: 'CG20250901590291'
      }
    })
    
    if (!purchase) {
      console.log('❌ 未找到采购记录 CG20250901590291')
      return
    }
    
    console.log(`📦 采购记录信息:`)
    console.log(`- ID: ${purchase.id}`)
    console.log(`- 原始数量: ${purchase.quantity_beads} 件`)
    console.log(`- 产品名称: ${purchase.product_name}`)
    
    // 查找所有相关的MaterialUsage记录
    const allUsages = await prisma.material_usage.find_many({
      where: {
        purchase_id: purchase.id
      },
      include: {
        product: {
          include: {
            sku: true
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    console.log(`\n📊 所有MaterialUsage记录 (${allUsages.length}条):`)
    
    let totalUsed = 0
    for (const usage of allUsages) {
      const quantity = usage.quantity_used_beads || 0
      totalUsed += quantity
      
      console.log(`- ID: ${usage.id}`)
      console.log(`  数量: ${quantity} 件 ${quantity < 0 ? '(退回)' : '(消耗)'}`)
      console.log(`  SKU: ${usage.product.sku?.sku_code || 'N/A'}`)
      console.log(`  产品: ${usage.product.name}`)
      console.log(`  创建时间: ${usage.created_at.to_i_s_o_string()}`)
      console.log('')
    }
    
    console.log(`📈 使用量统计:`)
    console.log(`- 总使用量: ${totalUsed} 件`)
    console.log(`- 剩余库存: ${purchase.quantity_beads - totalUsed} 件`)
    
    // 分别统计正数和负数记录
    const positiveUsages = allUsages.filter(u => (u.quantity_used_beads || 0) > 0)
    const negativeUsages = allUsages.filter(u => (u.quantity_used_beads || 0) < 0)
    
    const totalConsumed = positiveUsages.reduce((sum, u) => sum + (u.quantity_used_beads || 0), 0)
    const totalReturned = Math.abs(negativeUsages.reduce((sum, u) => sum + (u.quantity_used_beads || 0), 0))
    
    console.log(`\n🔢 详细统计:`)
    console.log(`- 消耗记录数: ${positiveUsages.length} 条`)
    console.log(`- 总消耗量: ${totalConsumed} 件`)
    console.log(`- 退回记录数: ${negativeUsages.length} 条`)
    console.log(`- 总退回量: ${totalReturned} 件`)
    console.log(`- 净消耗量: ${totalConsumed - totalReturned} 件`)
    console.log(`- 最终剩余: ${purchase.quantity_beads - (totalConsumed - totalReturned)} 件`)
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCurrentInventory()