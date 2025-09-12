import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    // 查找和田玉挂件SKU
    const sku = await prisma.product_sku.find_first({
      where: {
        sku_name: {
          contains: '和田玉挂件'
        }
      }
    });

    if (!sku) {
      console.log('未找到SKU');
      return;
    }

    console.log('=== SKU信息 ===');
    console.log('ID:', sku.id);
    console.log('名称:', sku.sku_name);
    console.log('总数量:', sku.total_quantity);
    console.log('可用数量:', sku.available_quantity);

    // 查询第一条MaterialUsage记录（制作时的记录）
    const firstMaterialUsage = await prisma.material_usage.find_first({
      where: {
        product: { sku_id: sku.id
        }
      },
      include: {
        purchase: {
          select: {
            product_name: true,
            purchase_code: true
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    console.log('\n=== 第一条MaterialUsage记录（制作时）===');
    if (firstMaterialUsage) {
      const firstUsageBeads = firstMaterialUsage.quantity_used_beads || 0;
      const firstUsagePieces = firstMaterialUsage.quantity_used_pieces || 0;
      const firstUsageTotal = firstUsageBeads + firstUsagePieces;
      
      console.log('采购:', firstMaterialUsage.purchase.product_name, `(${firstMaterialUsage.purchase.purchase_code})`);
      console.log('使用颗数:', firstUsageBeads);
      console.log('使用片数:', firstUsagePieces);
      console.log('总使用:', firstUsageTotal);
      console.log('创建时间:', firstMaterialUsage.created_at.to_i_s_o_string().split('T')[0]);
      
      // 计算单个SKU消耗量
      const singleSkuConsumption = sku.total_quantity > 0 ? Math.floor(firstUsageTotal / sku.total_quantity) : 1;
      
      console.log('\n=== 修复后的计算 ===');
      console.log('第一次制作消耗量:', firstUsageTotal);
      console.log('SKU总数量:', sku.total_quantity);
      console.log('单个SKU消耗量:', `${firstUsageTotal} / ${sku.total_quantity} = ${singleSkuConsumption}`);
      console.log('用户期望结果: 1');
      
      if (singleSkuConsumption === 1) {
        console.log('✅ 修复成功！计算结果符合用户期望');
      } else {
        console.log('❌ 仍需调整计算逻辑');
      }
    } else {
      console.log('未找到MaterialUsage记录');
    }

    // 查询所有MaterialUsage记录对比
    const allMaterialUsages = await prisma.material_usage.find_many({
      where: {
        product: { sku_id: sku.id
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    console.log('\n=== 所有MaterialUsage记录对比 ===');
    console.log('总记录数:', allMaterialUsages.length);
    let totalUsed = 0;
    allMaterialUsages.for_each((usage, i) => {
      const usedTotal = (usage.quantity_used_beads || 0) + (usage.quantity_used_pieces || 0);
      totalUsed += usedTotal;
      console.log(`${i + 1}. 消耗: ${usedTotal}件 (${usage.created_at.to_i_s_o_string().split('T')[0]})`);
    });
    console.log('总消耗量:', totalUsed);
    console.log('旧计算方式:', `${totalUsed} / ${sku.total_quantity} = ${Math.floor(totalUsed / sku.total_quantity)}`);

  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();