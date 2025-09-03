import { PrismaClient } from '@prisma/client';

async function checkSpecificPurchase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 检查采购记录 CG20250831106659 ===');
    
    // 查询特定的采购记录
    const purchase = await prisma.purchase.findFirst({
      where: {
        purchaseCode: 'CG20250831106659'
      },
      select: {
        id: true,
        purchaseCode: true,
        productName: true,
        photos: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!purchase) {
      console.log('❌ 未找到采购记录 CG20250831106659');
      return;
    }
    
    console.log('✅ 找到采购记录:');
    console.log(`   ID: ${purchase.id}`);
    console.log(`   采购编号: ${purchase.purchaseCode}`);
    console.log(`   产品名称: ${purchase.productName}`);
    console.log(`   创建时间: ${purchase.createdAt}`);
    console.log(`   更新时间: ${purchase.updatedAt}`);
    console.log(`   Photos字段: ${purchase.photos}`);
    
    // 分析photos字段状态
    if (!purchase.photos) {
      console.log('\n⚠️  Photos字段为空或null');
    } else {
      const photosStr = JSON.stringify(purchase.photos);
      console.log(`\n📷 Photos字段内容: ${photosStr}`);
      
      // 检查是否包含错误的URL
      if (photosStr.includes('trae-api-sg.mchost.guru') || 
          photosStr.includes('lf-cdn.trae.ai') ||
          photosStr.includes('text_to_image')) {
        console.log('❌ 包含错误的图片URL（Trae AI地址）');
      } else if (photosStr.includes('localhost') || photosStr.includes('192.168.')) {
        console.log('✅ 包含本地图片URL');
      } else {
        console.log('❓ 包含其他格式的URL');
      }
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificPurchase();