import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkLooseBeads() {
  try {
    // 查询散珠记录
    const looseBeads = await prisma.purchase.findMany({
      where: {
        purchase_type: 'LOOSE_BEADS'
      },
      select: {
        id: true,
        purchase_name: true,
        purchase_type: true,
        total_beads: true,
        total_price: true,
        price_per_bead: true,
        status: true
      },
      take: 10
    });
    
    console.log('散珠记录数量:', looseBeads.length);
    console.log('散珠记录:', JSON.stringify(looseBeads, null, 2));
    
    // 查询所有产品类型的统计
    const typeStats = await prisma.purchase.groupBy({
      by: ['purchase_type'],
      _count: {
        id: true
      }
    });
    
    console.log('\n所有产品类型统计:');
    typeStats.forEach(stat => {
      console.log(`${stat.purchase_type}: ${stat._count.id} 条记录`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('查询失败:', error);
    await prisma.$disconnect();
  }
}

checkLooseBeads();