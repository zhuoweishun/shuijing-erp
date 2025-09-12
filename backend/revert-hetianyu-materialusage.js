import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function revertHetianyuMaterialUsage() {try {
    console.log('🔄 恢复和田玉挂件MaterialUsage记录到正确的5件消耗...');
    
    // 恢复到正确的5件消耗
    const originalUnitCost = 1377.9729;
    const original_quantity = 5;
    const originalTotalCost = 6889.86;
    
    const updatedMaterialUsage = await prisma.material_usage.update({
      where: {
        id: 'cmf3yblzp00027vve1vzh39cw'
      },
      data: {quantity_used_beads: 0,
        quantity_used_pieces: original_quantity,
        unitCost: originalUnitCost,
        total_cost: originalTotalCost,
        updated_at: new Date()
      }
    });

    console.log('✅ MaterialUsage记录已恢复');
    console.log('使用片数:', updatedMaterialUsage.quantity_used_pieces);
    console.log('总使用数量:', (updatedMaterialUsage.quantity_used_beads || 0) + (updatedMaterialUsage.quantity_used_pieces || 0), '件');
    console.log('单位成本:', updatedMaterialUsage.unitCost);
    console.log('总成本:', updatedMaterialUsage.total_cost);
    
    console.log('\n💡 用户说明：');
    console.log('- 总消耗5件是正确的（多次创建SKU的累计）');
    console.log('- 问题是补货计算应该基于单次消耗，而不是平均值');
    console.log('- 需要记录每次的消耗量，而不是只有总消耗');
    
  } catch (error) {
    console.error('恢复错误:', error.message);
    console.error('错误详情:', error);
  } finally {
    await prisma.$disconnect();
  }
}

revertHetianyuMaterialUsage();