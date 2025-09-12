import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSkuSpecification() {
  try {
    console.log('🔍 查询最新创建的SKU规格字段...')
    
    const sku = await prisma.product_sku.find_first({
      where: {
        sku_code: {
          startsWith: 'SKU20250905'
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })
    
    if (sku) {
      console.log(`✅ 找到SKU: ${sku.sku_code}`)
      console.log(`📏 规格字段: ${sku.specification || '未设置'}`)
      console.log(`📝 SKU名称: ${sku.sku_name}`)
      console.log(`📊 创建时间: ${sku.created_at}`)
      
      if (sku.specification) {
        console.log('🎉 规格字段设置成功！')
      } else {
        console.log('❌ 规格字段为空')
      }
    } else {
      console.log('❌ 未找到相关SKU')
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSkuSpecification().catch(console.error)