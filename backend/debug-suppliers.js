import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSuppliers() {
  try {
    console.log('🔍 查询数据库中的所有供应商...')
    
    const allSuppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        name: true,
        contact: true,
        phone: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`📊 总共找到 ${allSuppliers.length} 个供应商:`)
    allSuppliers.forEach((supplier, index) => {
      console.log(`${index + 1}. ID: ${supplier.id}, 名称: "${supplier.name}", 联系人: ${supplier.contact || 'N/A'}, 激活: ${supplier.isActive}, 创建时间: ${supplier.createdAt}`)
    })
    
    console.log('\n🔍 查找包含"拉拉"或"水晶"的供应商...')
    const targetSuppliers = allSuppliers.filter(s => 
      s.name.includes('拉拉') || s.name.includes('水晶')
    )
    
    if (targetSuppliers.length > 0) {
      console.log(`✅ 找到 ${targetSuppliers.length} 个匹配的供应商:`)
      targetSuppliers.forEach(supplier => {
        console.log(`- "${supplier.name}" (ID: ${supplier.id}, 激活: ${supplier.isActive})`)
      })
    } else {
      console.log('❌ 没有找到包含"拉拉"或"水晶"的供应商')
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSuppliers()