const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDestroyRecords() {
  try {
    console.log('\n🔍 查询SKU20250901003的销毁记录...');
    
    // 查询销毁记录
    const destroyLogs = await prisma.sku_inventory_log.find_many({
      where: {
        sku: {
          sku_code: 'SKU20250901003'
        },
        action: 'DESTROY'
      },
      include: {
        sku: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    console.log(`\n📋 SKU20250901003的销毁记录:`);
    console.log(`找到 ${destroyLogs.length} 条销毁记录\n`);
    
    if (destroyLogs.length === 0) {
      console.log('❌ 没有找到任何销毁记录');
      return;
    }
    
    destroyLogs.for_each((log, index) => {
      console.log(`${index + 1}. 销毁记录 ID: ${log.id}`);
      console.log(`   时间: ${log.created_at}`);
      console.log(`   数量变化: ${log.quantity_change}`);
      console.log(`   销毁数量: ${Math.abs(log.quantity_change)}`);
      console.log(`   备注: ${log.notes || '无'}`);
      console.log(`   操作人: ${log.user_id}`);
      console.log('');
    });
    
    // 查询相关的MaterialUsage记录
    console.log('\n🔍 查询相关的MaterialUsage记录...');
    const materialUsages = await prisma.material_usage.find_many({
      where: {
        sku: {
          sku_code: 'SKU20250901003'
        },
        quantity: {
          lt: 0  // 负数表示退回
        }
      },
      include: {
        purchase: {
          select: {
            id: true,
            product_name: true,
            cgCode: true
          }
        },
        sku: {
          select: {
            sku_code: true,
            sku_name: true
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    console.log(`\n📦 MaterialUsage退回记录 (${materialUsages.length}条):`);
    materialUsages.for_each((usage, index) => {
      console.log(`${index + 1}. MaterialUsage ID: ${usage.id}`);
      console.log(`   时间: ${usage.created_at}`);
      console.log(`   数量: ${usage.quantity} (负数表示退回)`);
      console.log(`   原材料: ${usage.purchase.product_name} (${usage.purchase.cgCode})`);
      console.log(`   采购记录ID: ${usage.purchase.id}`);
      console.log('');
    });
    
    // 分析退回记录
    console.log('\n📊 退回记录分析:');
    const totalReturned = materialUsages.reduce((sum, usage) => sum + Math.abs(usage.quantity), 0);
    console.log(`总退回数量: ${totalReturned}件`);
    console.log(`退回记录数: ${materialUsages.length}条`);
    
    if (materialUsages.length > 0) {
      console.log('\n详细退回情况:');
      materialUsages.for_each((usage, index) => {
        console.log(`  ${index + 1}. 退回${Math.abs(usage.quantity)}件 - ${usage.purchase.product_name}`);
      });
    }
    
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDe