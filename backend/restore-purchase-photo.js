import { PrismaClient } from '@prisma/client';

async function restorePurchasePhoto() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 恢复草莓晶手串的图片 ===');
    
    // 使用最新的图片文件
    const imageFilename = '1756362996625_444.jpeg';
    const imageUrl = `http://localhost:3001/uploads/purchases/${imageFilename}`;
    
    console.log(`选择图片文件: ${imageFilename}`);
    console.log(`图片URL: ${imageUrl}`);
    
    // 更新采购记录的photos字段
    const updatedPurchase = await prisma.purchase.update({
      where: {
        purchaseCode: 'CG20250831106659'
      },
      data: {
        photos: imageUrl
      },
      select: {
        id: true,
        purchaseCode: true,
        productName: true,
        photos: true
      }
    });
    
    console.log('\n✅ 图片恢复成功!');
    console.log(`   采购编号: ${updatedPurchase.purchaseCode}`);
    console.log(`   产品名称: ${updatedPurchase.productName}`);
    console.log(`   Photos字段: ${updatedPurchase.photos}`);
    
    console.log('\n🎯 建议测试:');
    console.log('1. 刷新前端页面，查看图片是否显示');
    console.log('2. 检查图片URL是否可以正常访问');
    console.log(`3. 测试URL: ${imageUrl}`);
    
  } catch (error) {
    console.error('恢复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restorePurchasePhoto();