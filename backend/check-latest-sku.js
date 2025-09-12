import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkLatestSku() {
  try {
    console.log('🔍 查看最新SKU信息...')
    
    // 获取最新的SKU
    const sku = await prisma.product_sku.find_first({
      orderBy: { created_at: 'desc' },
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: true
              }
            }
          }
        }
      }
    })
    
    if (!sku) {
      console.log('❌ 未找到SKU记录')
      return
    }
    
    console.log(`\n📦 SKU信息:`)
    console.log(`   SKU编号: ${sku.sku_code}`)
    console.log(`   SKU名称: ${sku.sku_name}`)
    console.log(`   材料成本: ¥${sku.material_cost}`)
    console.log(`   总成本: ¥${sku.total_cost}`)
    console.log(`   销售价格: ¥${sku.selling_price}`)
    
    console.log(`\n🧮 MaterialUsage记录分析:`)
    let totalCalculatedCost = 0
    let positiveRecords = []
    let negativeRecords = []
    
    // 分析所有MaterialUsage记录
    for (const product of sku.products) {
      for (const usage of product.materialUsages) {
        const isPositive = usage.quantity_used_beads > 0 || usage.quantity_used_pieces > 0
        const record = {
          name: usage.purchase.product_name,
          type: usage.purchase.product_type,
          beads: usage.quantity_used_beads,
          pieces: usage.quantity_used_pieces,
          unitCost: usage.unitCost,
          total_cost: usage.total_cost,
          price_per_bead: usage.purchase.price_per_bead,
          pricePerPiece: usage.purchase.pricePerPiece
        }
        
        if (isPositive) {
          positiveRecords.push(record)
          totalCalculatedCost += Number(usage.total_cost || 0)
        } else {
          negativeRecords.push(record)
        }
      }
    }
    
    console.log(`\n✅ 正数记录（制作时消耗）:`)
    positiveRecords.for_each((record, index) => {
      console.log(`   ${index + 1}. ${record.name} (${record.type})`)
      console.log(`      使用: ${record.beads}颗 + ${record.pieces}件`)
      console.log(`      单价: ¥${record.price_per_bead || record.pricePerPiece || 0}`)
      console.log(`      总成本: ¥${record.total_cost}`)
    })
    
    console.log(`\n❌ 负数记录（销毁时退回）:`)
    negativeRecords.for_each((record, index) => {
      console.log(`   ${index + 1}. ${record.name} (${record.type})`)
      console.log(`      退回: ${Math.abs(record.beads)}颗 + ${Math.abs(record.pieces)}件`)
    })
    
    console.log(`\n💰 成本对比:`)
    console.log(`   SKU记录的materialCost: ¥${sku.material_cost}`)
    console.log(`   MaterialUsage计算总和: ¥${totalCalculatedCost.to_fixed(2)}`)
    console.log(`   差异: ¥${Math.abs(Number(sku.material_cost) - totalCalculatedCost).to_fixed(2)}`)
    
    // 手动计算用户提到的公式
    console.log(`\n🧮 用户公式验证:`)
    console.log(`   公式: 50.23*2+0.26*2+1.28*2+0.8*2+1.56*2+0.08*2+1.25*2+1.98*2`)
    const userCalculation = 50.23*2 + 0.26*2 + 1.28*2 + 0.8*2 + 1.56*2 + 0.08*2 + 1.25*2 + 1.98*2
    console.log(`   计算结果: ¥${userCalculation.to_fixed(2)}`)
    
  } catch (error) {
    console.error('❌ 查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLatestSku().catch(console.error)