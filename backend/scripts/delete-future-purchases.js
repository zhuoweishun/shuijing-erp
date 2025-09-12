import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deleteFuturePurchases() {
  console.log('🗑️ 开始删除未来日期的虚假采购记录...');
  
  try {
    const now = new Date();
    
    // 1. 查找所有未来日期的采购记录
    const futurePurchases = await prisma.purchase.find_many({
      where: {
        OR: [
          {
            created_at: {
              gt: now
            }
          },
          {
            purchase_date: {
              gt: now
            }
          }
        ]
      },
      select: {
        id: true,
        purchase_code: true,
        product_name: true,
        created_at: true,
        purchase_date: true
      }
    });
    
    console.log(`发现 ${futurePurchases.length} 条未来日期的采购记录`);
    
    if (futurePurchases.length === 0) {
      console.log('✅ 没有发现未来日期的采购记录');
      return;
    }
    
    // 显示前10条记录作为示例
    console.log('\n📋 示例记录（前10条）:');
    futurePurchases.slice(0, 10).for_each((purchase, index) => {
      console.log(`${index + 1}. ${purchase.purchase_code} - ${purchase.product_name}`);
      console.log(`   创建时间: ${purchase.created_at}`);
      console.log(`   采购日期: ${purchase.purchase_date}`);
    });
    
    if (futurePurchases.length > 10) {
      console.log(`   ... 还有 ${futurePurchases.length - 10} 条记录`);
    }
    
    const purchaseIds = futurePurchases.map(p => p.id);
    
    // 2. 删除相关的依赖记录
    console.log('\n🗑️ 开始删除相关记录...');
    
    // 删除原材料使用记录
    const deletedUsage = await prisma.material_usage.delete_many({
      where: {
        purchase_id: { in: purchaseIds }
      }
    });
    console.log(`✅ 删除了 ${deletedUsage.count} 条原材料使用记录`);
    
    // 删除原材料记录
    const deletedMaterials = await prisma.material.delete_many({
      where: {
        purchase_id: { in: purchaseIds }
      }
    });
    console.log(`✅ 删除了 ${deletedMaterials.count} 条原材料记录`);
    
    // 删除编辑日志
    const deletedLogs = await prisma.edit_log.delete_many({
      where: {
        purchase_id: { in: purchaseIds }
      }
    });
    console.log(`✅ 删除了 ${deletedLogs.count} 条编辑日志`);
    
    // 3. 删除采购记录
    const deletedPurchases = await prisma.purchase.delete_many({
      where: {
        id: { in: purchaseIds }
      }
    });
    console.log(`✅ 删除了 ${deletedPurchases.count} 条未来日期的采购记录`);
    
    // 4. 验证删除结果
    const remainingFuturePurchases = await prisma.purchase.count({
      where: {
        OR: [
          {
            created_at: {
              gt: now
            }
          },
          {
            purchase_date: {
              gt: now
            }
          }
        ]
      }
    });
    
    if (remainingFuturePurchases === 0) {
      console.log('✅ 所有未来日期的采购记录已成功删除');
    } else {
      console.log(`⚠️ 还剩余 ${remainingFuturePurchases} 条未来日期的采购记录`);
    }
    
    // 5. 最终统计
    console.log('\n📊 清理后的数据统计:');
    
    const finalStats = {
      总采购记录: await prisma.purchase.count(),
      活跃采购记录: await prisma.purchase.count({ where: { status: 'ACTIVE' } }),
      已使用采购记录: await prisma.purchase.count({ where: { status: 'USED' } }),
      原材料记录: await prisma.material.count(),
      原材料使用记录: await prisma.material_usage.count(),
      编辑日志: await prisma.edit_log.count()
    };
    
    console.table(finalStats);
    
    console.log('\n✅ 未来日期采购记录清理完成！');
    
  } catch (error) {
    console.error('❌ 删除未来日期采购记录时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 直接运行脚本
deleteFuturePurchases();

export { deleteFuturePurchases };