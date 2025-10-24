import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

/**
 * 清理测试数据脚本
 * 删除所有测试相关数据，保留boss和employee账号
 */
async function clean_test_data() {
  console.log('🧹 开始清理测试数据...');
  
  try {
    // 1. 查看当前用户数据
    console.log('\n📊 当前用户数据:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        user_name: true,
        role: true,
        created_at: true
      }
    });
    console.table(users);

    // 2. 查看测试相关数据
    console.log('\n🔍 查找测试数据...');
    
    // 查找测试采购记录
    const test_purchases = await prisma.purchase.findMany({
      where: {
        OR: [
          { purchase_code: { contains: 'TEST' } },
          { purchase_code: { contains: 'test' } },
          { purchase_name: { contains: 'TEST' } },
          { purchase_name: { contains: 'test' } },
          { purchase_name: { contains: '测试' } }
        ]
      }
    });
    console.log(`发现 ${test_purchases.length} 条测试采购记录`);

    // 查找测试客户
    const test_customers = await prisma.customers.findMany({
      where: {
        OR: [
          { name: { contains: 'TEST' } },
          { name: { contains: 'test' } },
          { name: { contains: '测试' } }
        ]
      }
    });
    console.log(`发现 ${test_customers.length} 条测试客户记录`);

    // 查找测试SKU
    const test_skus = await prisma.productSku.findMany({
      where: {
        OR: [
          { sku_code: { contains: 'TEST' } },
          { sku_code: { contains: 'test' } },
          { description: { contains: 'TEST' } },
          { description: { contains: 'test' } },
          { description: { contains: '测试' } }
        ]
      }
    });
    console.log(`发现 ${test_skus.length} 条测试SKU记录`);

    // 查找测试材料
    const test_materials = await prisma.material.findMany({
      where: {
        OR: [
          { material_name: { contains: 'TEST' } },
          { material_name: { contains: 'test' } },
          { material_name: { contains: '测试' } },
          { material_code: { contains: 'TEST' } },
          { material_code: { contains: 'test' } }
        ]
      }
    });
    console.log(`发现 ${test_materials.length} 条测试材料记录`);

    // 3. 开始清理（使用事务确保数据一致性）
    console.log('\n🗑️ 开始清理测试数据...');
    
    await prisma.$transaction(async (tx) => {
      // 1. 先删除依赖记录 - 财务记录
      const deleted_financial = await tx.financialRecords.deleteMany({
        where: {
          OR: [
            { description: { contains: 'TEST' } },
            { description: { contains: 'test' } },
            { description: { contains: '测试' } }
          ]
        }
      });
      console.log(`✅ 删除 ${deleted_financial.count} 条测试财务记录`);

      // 2. 删除SKU相关的库存日志
      const deleted_inventory_logs = await tx.skuInventoryLog.deleteMany({
        where: {
          OR: [
            { notes: { contains: 'TEST' } },
            { notes: { contains: 'test' } },
            { notes: { contains: '测试' } }
          ]
        }
      });
      console.log(`✅ 删除 ${deleted_inventory_logs.count} 条测试库存日志`);

      // 3. 删除材料使用记录（依赖材料）
      const deleted_material_usage = await tx.materialUsage.deleteMany({
        where: {
          OR: [
            { notes: { contains: 'TEST' } },
            { notes: { contains: 'test' } },
            { notes: { contains: '测试' } }
          ]
        }
      });
      console.log(`✅ 删除 ${deleted_material_usage.count} 条测试材料使用记录`);

      // 4. 删除测试SKU
      if (test_skus.length > 0) {
        const deleted_skus = await tx.productSku.deleteMany({
          where: {
            id: { in: test_skus.map(sku => sku.id) }
          }
        });
        console.log(`✅ 删除 ${deleted_skus.count} 条测试SKU`);
      }

      // 5. 删除测试材料（依赖采购记录）
      if (test_materials.length > 0) {
        const deleted_materials = await tx.material.deleteMany({
          where: {
            id: { in: test_materials.map(m => m.id) }
          }
        });
        console.log(`✅ 删除 ${deleted_materials.count} 条测试材料`);
      }

      // 6. 删除测试采购记录
      if (test_purchases.length > 0) {
        const deleted_purchases = await tx.purchase.deleteMany({
          where: {
            id: { in: test_purchases.map(p => p.id) }
          }
        });
        console.log(`✅ 删除 ${deleted_purchases.count} 条测试采购记录`);
      }

      // 7. 删除测试客户
      if (test_customers.length > 0) {
        const deleted_customers = await tx.customers.deleteMany({
          where: {
            id: { in: test_customers.map(c => c.id) }
          }
        });
        console.log(`✅ 删除 ${deleted_customers.count} 条测试客户`);
      }

      // 8. 最后删除测试用户（保留boss和employee）
      const deleted_test_users = await tx.user.deleteMany({
        where: {
          AND: [
            { user_name: { not: 'boss' } },
            { user_name: { not: 'employee' } },
            {
              OR: [
                { user_name: { contains: 'TEST' } },
                { user_name: { contains: 'test' } },
                { user_name: { contains: '测试' } }
              ]
            }
          ]
        }
      });
      console.log(`✅ 删除 ${deleted_test_users.count} 个测试用户`);
    });

    // 4. 验证清理结果
    console.log('\n📊 清理后数据统计:');
    const remaining_users = await prisma.user.findMany({
      select: {
        id: true,
        user_name: true,
        role: true
      }
    });
    console.log('剩余用户:');
    console.table(remaining_users);

    const total_customers = await prisma.customers.count();
    const total_skus = await prisma.productSku.count();
    const total_purchases = await prisma.purchase.count();
    const total_materials = await prisma.material.count();

    console.log(`\n📈 数据库统计:`);
    console.log(`- 客户: ${total_customers} 条`);
    console.log(`- SKU: ${total_skus} 条`);
    console.log(`- 采购记录: ${total_purchases} 条`);
    console.log(`- 材料: ${total_materials} 条`);

    console.log('\n✅ 测试数据清理完成！');

  } catch (error) {
    console.error('❌ 清理测试数据时发生错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  clean_test_data()
    .then(() => {
      console.log('🎉 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error);
      process.exit(1);
    });
}

export { clean_test_data };