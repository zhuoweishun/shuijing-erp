import { PrismaClient } from '@prisma/client';

async function checkPhotos() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 检查采购记录的photos字段 ===');
    
    const purchases = await prisma.purchase.findMany({
      select: {
        id: true,
        productName: true,
        photos: true
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`找到 ${purchases.length} 条采购记录:`);
    
    purchases.forEach((item, index) => {
      console.log(`\n${index + 1}. ID: ${item.id}`);
      console.log(`   产品: ${item.productName}`);
      console.log(`   Photos: ${item.photos}`);
      
      // 检查photos字段是否包含Trae AI的CDN地址
      if (item.photos && item.photos.includes('lf-cdn.trae.ai')) {
        console.log('   ⚠️  发现Trae AI CDN地址!');
      } else if (item.photos && item.photos.includes('localhost')) {
        console.log('   ✅ 本地地址');
      } else if (item.photos && item.photos.includes('192.168.')) {
        console.log('   ✅ 局域网地址');
      } else if (item.photos) {
        console.log('   ❓ 其他地址格式');
      } else {
        console.log('   📷 无图片');
      }
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhotos();