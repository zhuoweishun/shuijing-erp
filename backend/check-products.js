import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkProducts() {
  try {
    // 检查成品记录总数
    const total_count = await prisma.product.count()
    console.log('成品记录总数:', total_count)
    
    // 检查样本数据
    const samples = await prisma.product.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        total_value: true,
        created_at: true
      }
    })
    console.log('成品样本数据:', samples)
    
  } catch (error) {
    console.error('查询失败:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkProducts()