import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkHetianyuMaterialUsage() {
  try {
    console.log('🔍 检查和田玉挂件SKU的MaterialUsage记录...');
    
    // 1. 查找和田玉挂件SKU
    const hetianyuSku = await prisma.product_sku.find_first({
      where: {
        sku_name: {
          contains: '和田玉挂件'
        }
      },
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: {
                  select: {
                    id: true,
                    product_name: true,
                    purchase_code: true,
                    piece_count: true,
                    status: true
                  }
                }
              },
              orderBy: {
                created_at: 'asc'
              }
            }
          }
        }
      }
    });

    if (!hetianyuSku) {
      console.log('❌ 未找到和田玉挂件SKU');
      return;
    }

    console.log('\n=== 和田玉挂件SKU基本信息 ===');
    console.log('SKU ID:', hetianyuSku.id);
    console.log('SKU名称:', hetianyuSku.sku_name);
    console.log('当前库存:', hetianyuSku.available_quantity);
    console.log('总制作数量:', hetianyuSku.total_quantity);
    console.log('关联成品数量:', hetianyuSku.products.length);

    console.log('\n=== MaterialUsage记录详情 ===');
    let totalMaterialUsed = 0;
    let materialUsageCount = 0;

    hetianyuSku.products.for_each((product, productIndex) => {
      console.log(`\n📦 成品 ${productIndex + 1}: ${product.name}`);
      console.log(`   成品ID: ${product.id}`);
      console.log(`   成品数量: ${product.quantity}`);
      
      if (product.materialUsages.length > 0) {
        product.materialUsages.for_each((usage, usageIndex) => {
          materialUsageCount++;
          const usedBeads = usage.quantity_used_beads || 0;
          const usedPieces = usage.quantity_used_pieces || 0;
          const totalUsed = usedBeads + usedPieces;
          totalMaterialUsed += totalUsed;
          
          console.log(`\n   📋 MaterialUsage ${usageIndex + 1}:`);
          console.log(`      MaterialUsage ID: ${usage.id}`);
          console.log(`      采购记录: ${usage.purchase.product_name} (${usage.purchase.purchase_code})`);
          console.log(`      采购ID: ${usage.purchase.id}`);
          console.log(`      使用颗数: ${usedBeads}`);
          console.log(`      使用片数: ${usedPieces}`);
          console.log(`      总使用数量: ${totalUsed} 件`);
          console.log(`      单位成本: ${usage.unit_cost}`);
          console.log(`      总成本: ${usage.total_cost}`);
          console.log(`      创建时间: ${usage.created_at.to_i_s_o_string().split('T')[0]}`);
        });
      } else {
        console.log('   ⚠️  该成品没有MaterialUsage记录');
      }
    });

    console.log('\n=== 统计汇总 ===');
    console.log('MaterialUsage记录总数:', materialUsageCount);
    console.log('原材料总消耗量:', totalMaterialUsed, '件');
    console.log('SKU总制作数量:', hetianyuSku.total_quantity);
    
    if (hetianyuSku.total_quantity > 0) {
      const avgPerSku = totalMaterialUsed / hetianyuSku.total_quantity;
      console.log('平均每个SKU消耗:', avgPerSku.to_fixed(2), '件');
      console.log('向上取整后:', Math.ceil(avgPerSku), '件');
    }

    // 检查单个MaterialUsage记录的数量
    if (materialUsageCount > 0) {
      const firstUsage = hetianyuSku.products[0]?.materialUsages[0];
      if (firstUsage) {
        const singleUsage = (firstUsage.quantity_used_beads || 0) + (firstUsage.quantity_used_pieces || 0);
        console.log('\n=== 单次MaterialUsage分析 ===');
        console.log('第一个MaterialUsage记录消耗:', singleUsage, '件');
        console.log('用户期望的补货数量:', singleUsage, '件');
      }
    }

    console.log('\n=== 问题分析 ===');
    console.log('当前补货界面显示: 5件');
    console.log('用户期望显示: 1件');
    console.log('实际MaterialUsage记录显示的单次消耗:', materialUsageCount > 0 ? '需要查看上面的详细记录' : '无记录');
    
  } catch (error) {
    console.error('查询错误:', error.message);
    console.error('错误详情:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHetianyuMaterialUsage();