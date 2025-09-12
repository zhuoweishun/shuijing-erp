import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkProductPhotos() {
  try {
    console.log('=== 原材料图片数据检查 ===\n');
    
    const products = await prisma.product.find_many({
      select: {
        id: true,
        name: true,
        images: true
      }
    });
    
    console.log(`总共找到 ${products.length} 个原材料记录\n`);
    
    let realImageCount = 0;
    let placeholderCount = 0;
    
    products.for_each((product, index) => {
      console.log(`${index + 1}. ${product.name} (ID: ${product.id})`);
      console.log(`   Images: ${product.images}`);
      
      // 分析图片类型
      if (product.images) {
        if (product.images.includes('data:image/svg+xml') || product.images.includes('占位图')) {
          console.log('   类型: 占位图');
          placeholderCount++;
        } else if (product.images.includes('http') || product.images.includes('uploads/')) {
          console.log('   类型: 真实图片URL');
          realImageCount++;
        } else {
          console.log('   类型: 其他格式');
        }
      } else {
        console.log('   类型: 无图片');
      }
      console.log('');
    });
    
    console.log('=== 统计结果 ===');
    console.log(`真实图片: ${realImageCount} 个`);
    console.log(`占位图: ${placeholderCount} 个`);
    console.log(`无图片: ${products.length - realImageCount - placeholderCount} 个`);
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductPhotos();