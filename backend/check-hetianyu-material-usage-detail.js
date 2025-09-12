import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHetianyuMaterialUsageDetail() {
  try {
    console.log('🔍 检查和田玉挂件MaterialUsage记录详情...');
    
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
                    piece_count: true
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

    console.log('\n=== 和田玉挂件SKU信息 ===');
    console.log('SKU ID:', hetianyuSku.id);
    console.log('SKU名称:', hetianyuSku.sku_name);
    console.log('总制作数量:', hetianyuSku.total_quantity);
    console.log('可用数量:', hetianyuSku.available_quantity);

    // 2. 分析MaterialUsage记录
    console.log('\n=== MaterialUsage记录详情 ===');
    let totalMaterialUsages = 0;
    
    hetianyuSku.products.for_each((product, productIndex) => {
      console.log(`\n成品 ${productIndex + 1}: ${product.name}`);
      console.log(`成品ID: ${product.id}`);
      console.log(`成品数量: ${product.quantity}`);
      
      if (product.materialUsages.length > 0) {
        console.log(`MaterialUsage记录数量: ${product.materialUsages.length}`);
        
        product.materialUsages.for_each((usage, usageIndex) => {totalMaterialUsages++;
          const used_quantity = usage.quantity_used_beads + usage.quantity_used_pieces;
          console.log(`\n  记录 ${usageIndex + 1}:`);
          console.log(`    MaterialUsage ID: ${usage.id}`);
          console.log(`    采购记录: ${usage.purchase.product_name} (${usage.purchase.purchase_code})`);
          console.log(`    采购ID: ${usage.purchase.id}`);
          console.log(`    采购总数: ${usage.purchase.piece_count}件`);
          console.log(`    使用颗数: ${usage.quantity_used_beads}`);
          console.log(`    使用片数: ${usage.quantity_used_pieces}`);
          console.log(`    总使用量: ${used_quantity}件`);
          console.log(`    单位成本: ${usage.unit_cost}`);
          console.log(`    总成本: ${usage.total_cost}`);
          console.log(`    创建时间: ${usage.created_at.to_i_s_o_string()}`);
        });
      } else {
        console.log('  ⚠️  无MaterialUsage记录');
      }
    });

    // 3. 计算总消耗
    let totalUsedBeads = 0;
    let totalUsedPieces = 0;
    let totalUsed = 0;
    
    hetianyuSku.products.for_each(product => {
      product.materialUsages.for_each(usage => {
        totalUsedBeads += usage.quantity_used_beads;
        totalUsedPieces += usage.quantity_used_pieces;
        totalUsed += usage.quantity_used_beads + usage.quantity_used_pieces;
      });
    });

    console.log('\n=== 消耗统计 ===');
    console.log('MaterialUsage记录总数:', totalMaterialUsages);
    console.log('总使用颗数:', totalUsedBeads);
    console.log('总使用片数:', totalUsedPieces);
    console.log('总使用量:', totalUsed, '件');
    console.log('SKU总制作数量:', hetianyuSku.total_quantity);
    
    // 4. 分析第一次制作的消耗量
    if (totalMaterialUsages > 0) {
      const firstUsage = hetianyuSku.products[0]?.materialUsages[0];
      if (firstUsage) {
        const firstUsageQuantity = firstUsage.quantity_used_beads + firstUsage.quantity_used_pieces;
        console.log('\n=== 第一次制作分析 ===');
        console.log('第一条MaterialUsage记录:');
        console.log('  使用颗数:', firstUsage.quantity_used_beads);
        console.log('  使用片数:', firstUsage.quantity_used_pieces);
        console.log('  总使用量:', firstUsageQuantity, '件');
        console.log('  创建时间:', firstUsage.created_at.to_i_s_o_string());
        
        // 计算单个SKU消耗量
        const singleSkuConsumption = hetianyuSku.total_quantity > 0 ? 
          Math.floor(firstUsageQuantity / hetianyuSku.total_quantity) : 0;
        console.log('\n=== 单个SKU消耗量计算 ===');
        console.log(`计算公式: ${firstUsageQuantity} ÷ ${hetianyuSku.total_quantity} = ${singleSkuConsumption}`);
        console.log('单个SKU消耗量:', singleSkuConsumption, '件');
        
        if (singleSkuConsumption === 0) {
          console.log('\n⚠️  警告: 单个SKU消耗量为0，这可能是计算错误！');
          console.log('用户期望: 每个SKU消耗1件原材料');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHetianyuMaterialUsageDetail();