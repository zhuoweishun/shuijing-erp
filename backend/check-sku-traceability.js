import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkSkuTraceability() {
  try {
    console.log('🔍 查询最新创建的SKU溯源信息...')
    
    // 查询最新的SKU
    const latestSku = await prisma.product_sku.find_first({
      where: {
        sku_code: {
          startsWith: 'SKU20250905'
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })
    
    if (!latestSku) {
      console.log('❌ 未找到最新的SKU')
      return
    }
    
    console.log(`✅ 找到SKU: ${latestSku.sku_code}`)
    console.log(`📝 SKU名称: ${latestSku.sku_name}`)
    console.log(`📋 规格: ${latestSku.specification}`)
    
    // 查询关联的Product
    const products = await prisma.product.find_many({
      where: { sku_id: latestSku.id
      },
      include: {
        materialUsages: {
          include: {
            purchase: {
              select: {
                purchase_code: true,
                product_name: true,
                product_type: true,
                unit_price: true,
                price_per_bead: true,
                price_per_gram: true,
                pricePerPiece: true,
                specification: true
              }
            }
          }
        }
      }
    })
    
    if (products.length === 0) {
      console.log('❌ 未找到关联的Product记录')
      return
    }
    
    const materialUsages = products[0].materialUsages
    
    console.log('\n📊 溯源信息:')
    materialUsages.for_each((usage, index) => {
      console.log(`\n${index + 1}. ${usage.purchase.product_name}`)
      console.log(`   类型: ${usage.purchase.product_type}`)
      
      // 根据产品类型显示使用数量和单位
      if (usage.purchase.product_type === 'LOOSE_BEADS' || usage.purchase.product_type === 'BRACELET') {
        console.log(`   使用数量: ${usage.quantity_used_beads} 颗`)
      } else {
        console.log(`   使用数量: ${usage.quantity_used_pieces} 件`)
      }
      
      console.log(`   单位成本: ¥${usage.unit_cost || 0}`)
      console.log(`   总成本: ¥${usage.total_cost || 0}`)
      console.log(`   规格: ${usage.purchase.specification || '无'}`)
      
      // 显示原始价格信息
      console.log('   原始价格信息:')
      if (usage.purchase.unit_price) console.log(`     - 单价: ¥${usage.purchase.unit_price}`)
      if (usage.purchase.price_per_bead) console.log(`     - 每颗价格: ¥${usage.purchase.price_per_bead}`)
      if (usage.purchase.price_per_gram) console.log(`     - 每克价格: ¥${usage.purchase.price_per_gram}`)
      if (usage.purchase.pricePerPiece) console.log(`     - 每件价格: ¥${usage.purchase.pricePerPiece}`)
    })
    
  } catch (error) {
    console.error('❌ 查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSkuTraceability().catch(console.error)