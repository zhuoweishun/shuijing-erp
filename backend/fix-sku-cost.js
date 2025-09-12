import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function fixSkuCost() {
  try {
    console.log('=== 修复SKU成本数据 ===')
    
    // 获取所有SKU
    const allSkus = await prisma.product_sku.find_many()
    
    for (const sku of allSkus) {
      // 为每个SKU设置合理的成本数据
      // 假设成本约为售价的60%（这是一个合理的毛利率范围）
      const selling_price = Number(sku.selling_price) || Number(sku.unit_price)
      const total_cost = Math.round(selling_price * 0.6 * 100) / 100 // 保留两位小数
      
      // 分配成本：原材料50%，人工30%，工艺20%
      const material_cost = Math.round(totalCost * 0.5 * 100) / 100
      const labor_cost = Math.round(totalCost * 0.3 * 100) / 100
      const craft_cost = Math.round(totalCost * 0.2 * 100) / 100
      
      console.log(`\n更新SKU: ${sku.sku_name} (${sku.sku_code})`)
      console.log(`销售价: ${ selling_price }`)
      console.log(`设置总成本: ${ total_cost }`)
      console.log(`原材料成本: ${ material_cost }`)
      console.log(`人工成本: ${ labor_cost }`)
      console.log(`工艺成本: ${ craft_cost }`)
      
      // 更新SKU成本数据
      await prisma.product_sku.update({
        where: { id: sku.id },
        data: {
          material_cost: material_cost,
          labor_cost: labor_cost,
          craft_cost: craft_cost,
          total_cost: totalCost
        }
      })
      
      console.log(`✅ SKU ${sku.sku_name} 成本数据更新完成`)
    }
    
    console.log('\n=== 验证更新结果 ===')
    
    // 重新查询验证
    const updatedSkus = await prisma.product_sku.find_many({
      select: {
        sku_name: true,
        selling_price: true,
        material_cost: true,
        labor_cost: true,
        craft_cost: true,
        total_cost: true
      }
    })
    
    updatedSkus.for_each(sku => {
      console.log(`\nSKU: ${sku.sku_name}`)
      console.log(`销售价: ${sku.selling_price}`)
      console.log(`总成本: ${sku.total_cost}`)
      console.log(`毛利率: ${((Number(sku.selling_price) - Number(sku.total_cost)) / Number(sku.selling_price) * 100).to_fixed(2)}%`)
    })
    
    console.log('\n🎉 所有SKU成本数据修复完成！')
    
  } catch (error) {
    console.error('修复失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSkuCost()