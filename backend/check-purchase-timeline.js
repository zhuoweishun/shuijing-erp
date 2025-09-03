import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

async function checkPurchaseTimeline() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 检查草莓晶手串的时间线 ===');
    
    // 查询草莓晶手串记录
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
      console.log('❌ 未找到记录');
      return;
    }
    
    console.log('📋 记录信息:');
    console.log(`   采购编号: ${purchase.purchaseCode}`);
    console.log(`   产品名称: ${purchase.productName}`);
    console.log(`   创建时间: ${purchase.createdAt}`);
    console.log(`   更新时间: ${purchase.updatedAt}`);
    console.log(`   创建时间戳: ${purchase.createdAt.getTime()}`);
    console.log(`   更新时间戳: ${purchase.updatedAt.getTime()}`);
    
    // 查看最近的几个图片文件
    const uploadsDir = path.join(process.cwd(), 'uploads', 'purchases');
    const files = fs.readdirSync(uploadsDir);
    
    console.log('\n📷 最新的几个图片文件:');
    const fileAnalysis = files.map(filename => {
      const timestampMatch = filename.match(/^(\d+)_/);
      if (timestampMatch) {
        const timestamp = parseInt(timestampMatch[1]);
        return {
          filename,
          timestamp,
          fileTime: new Date(timestamp)
        };
      }
      return null;
    }).filter(Boolean);
    
    // 按时间排序，显示最新的5个
    fileAnalysis.sort((a, b) => b.timestamp - a.timestamp);
    
    fileAnalysis.slice(0, 5).forEach((file, index) => {
      console.log(`${index + 1}. ${file.filename}`);
      console.log(`   时间: ${file.fileTime.toLocaleString()}`);
      console.log(`   时间戳: ${file.timestamp}`);
      console.log('');
    });
    
    // 查看是否有其他草莓晶相关的记录
    console.log('\n🔍 查找其他草莓晶相关记录:');
    const relatedPurchases = await prisma.purchase.findMany({
      where: {
        productName: {
          contains: '草莓晶'
        }
      },
      select: {
        id: true,
        purchaseCode: true,
        productName: true,
        photos: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    relatedPurchases.forEach((p, index) => {
      console.log(`${index + 1}. ${p.purchaseCode} - ${p.productName}`);
      console.log(`   创建: ${p.createdAt.toLocaleString()}`);
      console.log(`   更新: ${p.updatedAt.toLocaleString()}`);
      console.log(`   Photos: ${p.photos ? '有图片' : '无图片'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPurchaseTimeline();