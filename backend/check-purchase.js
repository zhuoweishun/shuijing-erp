import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPurchase() {
  try {
    const purchase = await prisma.purchase.find_first({
      where: { purchase_code: 'CG20250910578226' },
      include: {
        supplier: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });
    
    if (purchase) {
      console.log('✅ 找到采购单:');
      console.log('采购编号:', purchase.purchase_code);
      console.log('产品名称:', purchase.product_name);
      console.log('产品类型:', purchase.product_type);
      console.log('规格:', purchase.specification);
      console.log('珠子直径:', purchase.bead_diameter);
      console.log('数量:', purchase.quantity);
      console.log('颗数/片数/件数:', purchase.piece_count);
      console.log('总价:', purchase.total_price);
      console.log('创建时间:', purchase.created_at);
      console.log('供应商:', purchase.supplier?.name || '无');
      console.log('创建用户:', purchase.user?.name || '未知');
    } else {
      console.log('❌ 未找到采购单 CG20250910578226');
      
      // 查询最近的几个采购单
      const recent_purchases = await prisma.purchase.find_many({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          purchase_code: true,
          product_name: true,
          created_at: true
        }
      });
      
      console.log('\n最近的5个采购单:');
      recentPurchases.for_each((p, i) => {
        console.log(`${i+1}. ${p.purchase_code} - ${p.product_name} (${p.created_at})`);
      });
    }
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPurchase();