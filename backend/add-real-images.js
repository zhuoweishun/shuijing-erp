import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 一些真实的珠宝原材料图片URL（示例）
const realImageUrls = [
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400', // 珍珠
  'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=400', // 水晶
  'https://images.unsplash.com/photo-1544376664-80b17f09d399?w=400', // 宝石
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', // 金属配件
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400', // 珠子
  'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=400', // 水晶珠
  'https://images.unsplash.com/photo-1544376664-80b17f09d399?w=400', // 彩色宝石
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', // 金属线
];

async function addRealImages() {
  try {
    console.log('=== 为原材料添加真实图片 ===\n');
    
    // 获取前8个原材料
    const products = await prisma.product.find_many({
      take: 8,
      select: {
        id: true,
        name: true,
        images: true
      }
    });
    
    console.log(`找到 ${products.length} 个原材料，准备添加真实图片\n`);
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const image_url = realImageUrls[i];
      
      console.log(`${i + 1}. 更新 ${product.name}`);
      console.log(`   原图片: ${product.images}`);
      console.log(`   新图片: ["${image_url}"]`);
      
      await prisma.product.update({
        where: { id: product.id },
        data: {
          images: JSON.stringify([image_url])
        }
      });
      
      console.log('   ✅ 更新成功\n');
    }
    
    console.log('=== 真实图片添加完成 ===');
    console.log(`成功为 ${products.length} 个原材料添加了真实图片`);
    
  } catch (error) {
    console.error('添加真实图片失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRealImages();