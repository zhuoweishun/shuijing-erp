import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkData() {
  try {
    // 检查采购记录总数
    const total_count = await prisma.purchase.count()
    console.log('采购记录总数:', total_count)
    
    // 检查样本数据
    const samples = await prisma.purchase.findMany({
      take: 5,
      select: {
        id: true,
        product_name: true,
        material_type: true,
        total_beads: true,
        bead_diameter: true
      }
    })
    console.log('样本数据:', samples)
    
    // 检查材料类型分布
    const material_types = await prisma.purchase.groupBy({
      by: ['material_type'],
      _count: {
        material_type: true
      },
      where: {
        material_type: {
          not: null
        }
      }
    })
    console.log('材料类型分布:', material_types)
    
  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()