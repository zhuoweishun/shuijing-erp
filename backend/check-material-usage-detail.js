import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkMaterialUsageDetail() {
  try {
    console.log('🔍 检查MaterialUsage记录详情...')
    
    const sku = await prisma.product_sku.find_first({
      where: { sku_code: 'SKU20250905929' },
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: true
              },
              orderBy: {
                created_at: 'asc'
              }
            }
          }
        }
      }
    })
    
    if (!sku) {
      console.log('❌ 未找到SKU')
      return
    }
    
    console.log(`\n🏷️  SKU信息:`)
    console.log(`   SKU编码: ${sku.sku_code}`)
    console.log(`   制作数量: ${sku.total_quantity}`)
    console.log(`   记录的materialCost: ¥${sku.material_cost}`)
    
    console.log(`\n🔍 MaterialUsage记录详情:`)
    let total_cost = 0
    let recordCount = 0
    
    sku.products.for_each((product, pIndex) => {
      console.log(`\n产品 ${pIndex + 1}:`)
      product.materialUsages.for_each((usage, uIndex) => {
        recordCount++
        const beads = usage.quantity_used_beads || 0
        const pieces = usage.quantity_used_pieces || 0
        const cost = parseFloat(usage.total_cost?.to_string() || '0')
        totalCost += cost
        
        console.log(`   ${recordCount}. ${usage.purchase.product_name}`)
        console.log(`      使用量: ${beads}颗 + ${pieces}件`)
        console.log(`      单价: ¥${parseFloat(usage.unit_cost?.to_string() || '0').to_fixed(4)}`)
        console.log(`      总成本: ¥${cost.to_fixed(2)}`)
        console.log(`      创建时间: ${usage.created_at}`)
      })
    })
    
    console.log(`\n💰 成本分析:`)
    console.log(`   MaterialUsage总成本: ¥${totalCost.to_fixed(2)}`)
    console.log(`   SKU记录materialCost: ¥${sku.material_cost}`)
    console.log(`   制作数量: ${sku.total_quantity}`)
    console.log(`   单个SKU成本应该是: ¥${(totalCost / sku.total_quantity).to_fixed(2)}`)
    
    const expectedSingleCost = totalCost / sku.total_quantity
    const recordedCost = parseFloat(sku.material_cost.to_string())
    
    console.log(`\n🔍 问题分析:`)
    if (Math.abs(expectedSingleCost - recordedCost) < 0.01) {
      console.log('✅ SKU记录的materialCost正确')
    } else {
      console.log('❌ SKU记录的materialCost与计算结果不符')
      console.log(`   差异: ¥${Math.abs(expectedSingleCost - recordedCost).to_fixed(2)}`)
    }
    
    // 检查第一条MaterialUsage记录
    const firstUsage = sku.products[0]?.materialUsages[0]
    if (firstUsage) {
      const firstBeads = firstUsage.quantity_used_beads || 0
      const firstPieces = firstUsage.quantity_used_pieces || 0
      const firstTotal = firstBeads + firstPieces
      
      console.log(`\n🔍 第一条MaterialUsage记录分析:`)
      console.log(`   原材料: ${firstUsage.purchase.product_name}`)
      console.log(`   使用量: ${firstBeads}颗 + ${firstPieces}件 = ${firstTotal}`)
      console.log(`   这个数量在溯源API中被用作单个SKU消耗量`)
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkMaterialUsageDetail()