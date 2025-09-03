import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

async function fixPhotosUrl() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 修复采购记录的photos字段 ===');
    
    // 查找所有有photos的记录
    const purchases = await prisma.purchase.findMany({
      where: {
        photos: {
          not: null
        }
      },
      select: {
        id: true,
        productName: true,
        photos: true
      },
      take: 20
    });
    
    // 过滤出包含错误URL的记录
    const problematicPurchases = purchases.filter(p => {
      const photosStr = JSON.stringify(p.photos);
      return photosStr.includes('trae-api-sg.mchost.guru') || 
             photosStr.includes('lf-cdn.trae.ai') ||
             photosStr.includes('text_to_image');
    });
    
    console.log(`总共找到 ${purchases.length} 条有图片的记录`);
    console.log(`其中 ${problematicPurchases.length} 条需要修复`);
    
    if (problematicPurchases.length === 0) {
      console.log('没有需要修复的记录');
      return;
    }
    
    // 检查uploads目录是否存在
    const uploadsDir = path.join(process.cwd(), 'uploads', 'purchases');
    if (!fs.existsSync(uploadsDir)) {
      console.log('创建uploads目录...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    let fixedCount = 0;
    
    for (const purchase of problematicPurchases) {
      console.log(`\n处理记录: ${purchase.id} - ${purchase.productName}`);
      console.log(`原始photos: ${purchase.photos}`);
      
      // 将错误的URL设置为null，表示没有图片
      try {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { photos: null }
        });
        
        console.log('✅ 已清除错误的图片URL');
        fixedCount++;
      } catch (error) {
        console.error(`❌ 修复失败: ${error.message}`);
      }
    }
    
    console.log(`\n=== 修复完成 ===`);
    console.log(`总共修复了 ${fixedCount} 条记录`);
    console.log('\n建议：');
    console.log('1. 重新上传这些产品的图片');
    console.log('2. 确保使用正确的图片上传功能');
    console.log('3. 检查前端图片上传逻辑是否正确');
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPhotosUrl();