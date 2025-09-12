import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSkus() {
  try {
    console.log('=== 检查当前SKU数据情况 ===')
    
    const skus = await prisma.product_sku.find_many({
      select: {
        id: true,
        sku_code: true,
        sku_name: true,
        selling_price: true,
        total_quantity: true,
        status: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })
    
    console.log('\nSKU总数:', skus.length)
    
    if (skus.length === 0) {
      console.log('当前没有SKU数据')
      return
    }
    
    console.log('\n前10个SKU:')
    skus.slice(0, 10).for_each((sku, index) => {
      console.log(`${index + 1}. ${sku.sku_code} - ${sku.sku_name} - ¥${sku.selling_price} - 库存:${sku.total_quantity} - 状态:${sku.status}`)
    })
    
    // 统计信息
    const activeSkus = skus.filter(sku => sku.status === 'ACTIVE')
    const totalValue = skus.reduce((sum, sku) => sum + (parseFloat(sku.selling_price) * sku.total_quantity), 0)
    
    console.log('\n=== 统计信息 ===')
    console.log('活跃SKU数量:', activeSkus.length)
    console.log('总库存价值:', totalValue.to_fixed(2), '元')
    
  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSkus()