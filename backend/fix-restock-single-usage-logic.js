import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyzeRestockLogicIssue() {
  try {
    console.log('🔍 分析补货逻辑中的单次消耗计算问题...');
    
    // 1. 查看和田玉挂件SKU的详细信息
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
                    purchase_code: true
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

    console.log('\n=== 当前问题分析 ===');
    console.log('SKU总制作数量:', hetianyuSku.total_quantity);
    console.log('MaterialUsage记录数量:', hetianyuSku.products[0]?.materialUsages.length || 0);
    
    const materialUsage = hetianyuSku.products[0]?.materialUsages[0];
    if (materialUsage) {
      const totalUsed = (materialUsage.quantity_used_beads || 0) + (materialUsage.quantity_used_pieces || 0);
      console.log('MaterialUsage记录的总消耗:', totalUsed, '件');
      console.log('\n❌ 当前问题:');
      console.log('- 补货逻辑使用 materialUsage.quantity_used_pieces =', materialUsage.quantity_used_pieces);
      console.log('- 但这是总消耗量，不是单次消耗量');
      console.log('- 用户期望的单次消耗量应该是:', totalUsed / hetianyuSku.total_quantity, '件');
      
      console.log('\n💡 解决方案:');
      console.log('方案1: 计算单次消耗 = 总消耗 / SKU总制作数量');
      console.log('方案2: 修改数据结构，为每次制作创建单独的MaterialUsage记录');
      console.log('方案3: 在MaterialUsage中添加单次消耗量字段');
      
      // 计算正确的单次消耗量
      const singleUsage = Math.floor(totalUsed / hetianyuSku.total_quantity);
      console.log('\n🔧 建议的单次消耗量:', singleUsage, '件');
      
      console.log('\n📝 修复建议:');
      console.log('在补货逻辑中，将:');
      console.log('  quantityNeeded = materialUsage.quantity_used_beads || materialUsage.quantity_used_pieces || 0');
      console.log('修改为:');
      console.log(`  quantityNeeded = Math.floor(totalUsed / sku.total_quantity) = ${singleUsage}`);
    }
    
  } catch (error) {
    console.error('分析错误:', error.message);
    console.error('错误详情:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRestockLogicIssue();