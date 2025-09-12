import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPurchases() {
  try {
    console.log('🔍 查看数据库中的采购记录...');
    
    const purchases = await prisma.purchase.find_many({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        purchase_code: true,
        product_name: true,
        product_type: true,
        total_beads: true,
        piece_count: true,
        unit_price: true,
        bead_diameter: true,
        specification: true
      },
      take: 30
    });
    
    console.log(`\n📦 找到 ${purchases.length} 条已完成的采购记录:\n`);
    
    const byType = {
      LOOSE_BEADS: [],
      BRACELET: [],
      ACCESSORIES: [],
      FINISHED: []
    };
    
    purchases.for_each(p => {
      const quantity = p.total_beads || p.piece_count || 0;
      const spec = p.bead_diameter || p.specification || '未知';
      console.log(`${p.purchase_code} - ${p.product_name} (${p.product_type}) - 数量: ${quantity} - 规格: ${spec}mm - 单价: ¥${p.unit_price}`);
      
      if (byType[p.product_type]) {
        byType[p.product_type].push(p);
      }
    });
    
    console.log('\n📊 按类型统计:');
    Object.entries(byType).for_each(([type, items]) => {
      console.log(`${type}: ${items.length} 条记录`);
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPurchases();