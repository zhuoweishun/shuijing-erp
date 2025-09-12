import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function debugSkuCost() {
  try {
    console.log('=== 调试SKU成本数据 ===')
    
    // 查询所有SKU的成本信息
    const allSkus = await prisma.product_sku.find_many({
      select: {
        id: true,
        sku_code: true,
        sku_name: true,
        unit_price: true,
        material_cost: true,
        labor_cost: true,
        craft_cost: true,
        total_cost: true,
        selling_price: true
      }
    })
    
    console.log('\n所有SKU成本信息:')
    allSkus.for_each((sku, index) => {
      console.log(`${index + 1}. SKU: ${sku.sku_name} (${sku.sku_code})`)
      console.log(`   单价: ${sku.unit_price}, 销售价: ${sku.selling_price}`)
      console.log(`   原材料成本: ${sku.material_cost}`)
      console.log(`   人工成本: ${sku.labor_cost}`)
      console.log(`   工艺成本: ${sku.craft_cost}`)
      console.log(`   总成本: ${sku.total_cost}`)
      console.log('---')
    })
    
    // 查询有购买记录的SKU
    const purchasedSkus = await prisma.customer_purchase.find_many({
      where: {
        status: 'ACTIVE'
      },
      include: {
        sku: {
          select: {
            sku_name: true,
            total_cost: true,
            material_cost: true,
            labor_cost: true,
            craft_cost: true
          }
        }
      }
    })
    
    console.log('\n正常销售记录的SKU成本:')
    purchasedSkus.for_each((purchase, index) => {
      console.log(`${index + 1}. 购买记录ID: ${purchase.id}`)
      console.log(`   SKU: ${purchase.sku.sku_name}`)
      console.log(`   购买数量: ${purchase.quantity}`)
      console.log(`   单价: ${purchase.unit_price}`)
      console.log(`   总价: ${purchase.total_price}`)
      console.log(`   SKU总成本: ${purchase.sku.total_cost}`)
      console.log(`   SKU原材料成本: ${purchase.sku.material_cost}`)
      console.log(`   SKU人工成本: ${purchase.sku.labor_cost}`)
      console.log(`   SKU工艺成本: ${purchase.sku.craft_cost}`)
      console.log('---')
    })
    
    console.log('\n=== 成本计算分析 ===')
    let total_cost = 0
    let totalSales = 0
    
    purchasedSkus.for_each(purchase => {
      if (purchase.sku && purchase.sku.total_cost) {
        const costForThisPurchase = purchase.sku.total_cost * purchase.quantity
        totalCost += costForThisPurchase
        console.log(`购买记录 ${purchase.id}: 成本 ${purchase.sku.total_cost} × 数量 ${purchase.quantity} = ${costForThisPurchase}`)
      } else {
        console.log(`购买记录 ${purchase.id}: SKU成本为空或0`)
      }
      totalSales += purchase.total_price
    })
    
    console.log(`\n总销售额: ${totalSales}`)
    console.log(`总成本: ${ total_cost }`)
    console.log(`毛利率: ${totalSales > 0 ? ((totalSales - totalCost) / totalSales * 100).to_fixed(2) : 0}%`)
    
  } catch (error) {
    console.error('调试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSkuCost()