import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixHetianyuMaterialUsageQuantity() {
  try {
    console.log('🔧 修复和田玉挂件MaterialUsage记录的消耗数量...');
    
    // 1. 查找需要修复的MaterialUsage记录
    const targetMaterialUsage = await prisma.material_usage.find_unique({
      where: {
        id: 'cmf3yblzp00027vve1vzh39cw'
      },
      include: {
        purchase: {
          select: {
            product_name: true,
            purchase_code: true,
            unit_price: true
          }
        },
        product: {
          select: {
            name: true
          }
        }
      }
    });

    if (!targetMaterialUsage) {
      console.log('❌ 未找到目标MaterialUsage记录');
      return;
    }

    console.log('\n=== 当前MaterialUsage记录 ===');
    console.log('MaterialUsage ID:', targetMaterialUsage.id);
    console.log('采购记录:', targetMaterialUsage.purchase.product_name, `(${targetMaterialUsage.purchase.purchase_code})`);
    console.log('成品:', targetMaterialUsage.product.name);
    console.log('当前使用颗数:', targetMaterialUsage.quantity_used_beads);
    console.log('当前使用片数:', targetMaterialUsage.quantity_used_pieces);
    console.log('当前总使用数量:', (targetMaterialUsage.quantity_used_beads || 0) + (targetMaterialUsage.quantity_used_pieces || 0), '件');
    console.log('当前单位成本:', targetMaterialUsage.unitCost);
    console.log('当前总成本:', targetMaterialUsage.total_cost);

    // 2. 计算正确的数值
    const correctQuantity = 1; // 用户确认的正确消耗量
    const unit_price = parseFloat(targetMaterialUsage.purchase.unit_price?.to_string() || '0');
    const correctTotalCost = unit_price * correctQuantity;

    console.log('\n=== 修复计划 ===');
    console.log('正确的消耗数量:', correctQuantity, '件');
    console.log('单价:', unit_price);
    console.log('正确的总成本:', correctTotalCost);

    // 3. 执行修复
    console.log('\n🔧 执行修复...');
    
    const updatedMaterialUsage = await prisma.material_usage.update({
      where: {
        id: 'cmf3yblzp00027vve1vzh39cw'
      },
      data: {
        quantity_used_beads: 0,
        quantity_used_pieces: correctQuantity,
        unitCost: unit_price,
        total_cost: correctTotalCost,
        updated_at: new Date()
      }
    });

    console.log('✅ MaterialUsage记录修复完成');
    
    // 4. 验证修复结果
    console.log('\n=== 修复后的记录 ===');
    console.log('使用颗数:', updatedMaterialUsage.quantity_used_beads);
    console.log('使用片数:', updatedMaterialUsage.quantity_used_pieces);
    console.log('总使用数量:', (updatedMaterialUsage.quantity_used_beads || 0) + (updatedMaterialUsage.quantity_used_pieces || 0), '件');
    console.log('单位成本:', updatedMaterialUsage.unitCost);
    console.log('总成本:', updatedMaterialUsage.total_cost);
    
    // 5. 检查对补货计算的影响
    console.log('\n=== 对补货计算的影响 ===');
    console.log('修复前补货显示: 5件原材料');
    console.log('修复后补货应显示: 1件原材料');
    console.log('\n💡 建议用户刷新补货页面查看修复效果');
    
  } catch (error) {
    console.error('修复错误:', error.message);
    console.error('错误详情:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHetianyuMaterialUsageQuantity();