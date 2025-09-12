const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDestroyRecords() {
  try {
    console.log('\n🔍 查询SKU20250901003的销毁记录...');
    
    // 查询销毁记录
    const destroyLogs = await prisma.skuInventoryLog.findMany({
      where: {
        sku: {
          skuCode: 'SKU20250901003'
        },
        action: 'DESTROY'
      },
      include: {
        sku: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`\n📋 SKU20250901003的销毁记录:`);
    console.log(`找到 ${destroyLogs.length} 条销毁记录\n`);
    
    if (destroyLogs.length === 0) {
      console.log('❌ 没有找到任何销毁记录');
      return;
    }
    
    destroyLogs.forEach((log, index) => {
      console.log(`${index + 1}. 销毁记录 ID: ${log.id}`);
      console.log(`   时间: ${log.createdAt}`);
      console.log(`   数量变化: ${log.quantityChange}`);
      console.log(`   销毁数量: ${Math.abs(log.quantityChange)}`);
      console.log(`   备注: ${log.notes || '无'}`);
      console.log(`   操作人: ${log.userId}`);
      console.log('');
    });
    
    // 查询相关的MaterialUsage记录
    console.log('\n🔍 查询相关的MaterialUsage记录...');
    const materialUsages = await prisma.materialUsage.findMany({
      where: {
        product: {
          sku: {
            skuCode: 'SKU20250901003'
          }
        },
        OR: [
          {
            quantityUsedBeads: {
              lt: 0
            }
          },
          {
            quantityUsedPieces: {
              lt: 0
            }
          }
        ]
      },
      include: {
        purchase: {
          select: {
            id: true,
            productName: true,
            purchaseCode: true
          }
        },
        product: {
          select: {
            sku: {
              select: {
                skuCode: true,
                skuName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`\n📦 MaterialUsage退回记录 (${materialUsages.length}条):`);
    materialUsages.forEach((usage, index) => {
      console.log(`${index + 1}. MaterialUsage ID: ${usage.id}`);
      console.log(`   时间: ${usage.createdAt}`);
      const quantity = usage.quantityUsedBeads < 0 ? usage.quantityUsedBeads : usage.quantityUsedPieces;
      console.log(`   数量: ${quantity} (负数表示退回)`);
      console.log(`   原材料: ${usage.purchase.productName} (${usage.purchase.purchaseCode})`);
      console.log(`   采购记录ID: ${usage.purchase.id}`);
      console.log('');
    });
    
    // 分析退回记录
    console.log('\n📊 退回记录分析:');
    const totalReturned = materialUsages.reduce((sum, usage) => {
      const quantity = usage.quantityUsedBeads < 0 ? usage.quantityUsedBeads : usage.quantityUsedPieces;
      return sum + Math.abs(quantity);
    }, 0);
    console.log(`总退回数量: ${totalReturned}件`);
    console.log(`退回记录数: ${materialUsages.length}条`);
    
    if (materialUsages.length > 0) {
      console.log('\n详细退回情况:');
      materialUsages.forEach((usage, index) => {
        const quantity = usage.quantityUsedBeads < 0 ? usage.quantityUsedBeads : usage.quantityUsedPieces;
        console.log(`  ${index + 1}. 退回${Math.abs(quantity)}件 - ${usage.purchase.productName}`);
      });
    }
    
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDestroyRecords();