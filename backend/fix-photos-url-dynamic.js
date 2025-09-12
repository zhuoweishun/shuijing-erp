import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPhotosUrlDynamic() {
  try {
    console.log('=== 修复采购记录的photos字段URL为动态格式 ===');
    
    // 查询所有采购记录
    const purchases = await prisma.purchase.find_many({
      select: {
        id: true,
        product_name: true,
        photos: true
      }
    });
    
    console.log(`找到 ${purchases.length} 条采购记录需要检查`);
    
    let fixedCount = 0;
    
    for (const purchase of purchases) {
      if (purchase.photos) {
        try {
          const photosArray = JSON.parse(purchase.photos);
          let needsUpdate = false;
          
          const updatedPhotos = photosArray.map(url => {
            // 如果URL包含具体的IP地址或域名，替换为相对路径
            if (url.includes('139.224.189.1:3001') || 
                url.includes('localhost:3001') || 
                url.includes('api.dorblecapital.com')) {
              
              // 提取文件路径部分
              const pathMatch = url.match(/\/uploads\/purchases\/.+$/);
              if (pathMatch) {
                needsUpdate = true;
                // 返回相对路径，让前端根据当前环境动态构建完整URL
                return pathMatch[0]; // 例如: /uploads/purchases/1756102840000_47.jpg
              }
            }
            return url;
          });
          
          if (needsUpdate) {
            const photosJson = JSON.stringify(updatedPhotos);
            
            await prisma.purchase.update({
              where: { id: purchase.id },
              data: { photos: photosJson }
            });
            
            console.log(`✅ 修复记录 ${purchase.id} (${purchase.product_name})`);
            console.log(`   原photos: ${purchase.photos}`);
            console.log(`   新photos: ${photosJson}`);
            fixedCount++;
          }
          
        } catch (e) {
          console.log(`❌ 解析JSON失败 ${purchase.id}: ${e.message}`);
        }
      }
    }
    
    console.log(`\n=== 修复完成 ===`);
    console.log(`总共修复了 ${fixedCount} 条记录`);
    console.log('现在photos字段使用相对路径，前端会根据当前环境动态构建完整URL');
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPhotosUrlDynamic();