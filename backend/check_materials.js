import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkMaterials() {
  try {
    console.log('查询FINISHED_MATERIAL类型的数据...');
    const finishedMaterials = await prisma.purchase.findMany({
      where: { purchase_type: 'FINISHED_MATERIAL' },
      select: { 
        id: true, 
        purchase_name: true, 
        purchase_type: true,
        piece_count: true,
        total_price: true
      }
    });
    
    console.log('FINISHED_MATERIAL数据:', JSON.stringify(finishedMaterials, null, 2));
    console.log('总数量:', finishedMaterials.length);
    
    // 查询特定ID
    console.log('\n查询特定ID: cmfnj5pam000dibxtv3lkft2n');
    const specificMaterial = await prisma.purchase.findUnique({
      where: { id: 'cmfnj5pam000dibxtv3lkft2n' }
    });
    
    console.log('特定ID查询结果:', specificMaterial ? '找到' : '未找到');
    if (specificMaterial) {
      console.log('详细信息:', JSON.stringify(specificMaterial, null, 2));
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMaterials();