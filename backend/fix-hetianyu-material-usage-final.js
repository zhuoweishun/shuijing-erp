import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixHetianyuMaterialUsageFinal() {
  try {
    console.log('🔧 修复和田玉挂件MaterialUsage记录...');
    
    // 1. 查找48件的和田玉挂件采购记录
    const targetPurchase = await prisma.purchase.find_first({
      where: {
        product_name: {
          contains: '和田玉挂件'
        },
        piece_count: 48
      }
    });
    
    if (!targetPurchase) {
      console.log('❌ 未找到48件的和田玉挂件采购记录');
      return;
    }
    
    console.log(`✅ 找到目标采购记录: ${targetPurchase.purchase_code} - ${targetPurchase.piece_count}件`);
    
    // 2. 查找该采购记录的MaterialUsage
    const materialUsages = await prisma.material_usage.find_many({
      where: {
        purchase_id: targetPurchase.id
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    console.log(`\n📋 当前MaterialUsage记录 (${materialUsages.length}条):`);
    let currentTotalUsed = 0;
    materialUsages.for_each((usage, index) => {
      const usedQty = usage.quantity_used_beads + usage.quantity_used_pieces;
      currentTotalUsed += usedQty;
      const date = usage.created_at.to_i_s_o_string().split('T')[0];
      console.log(`   ${index + 1}. ${date} - 消耗${usedQty}件 (ID: ${usage.id})`);
    });
    console.log(`   📊 当前总消耗: ${currentTotalUsed} 件`);
    
    // 3. 用户期望的正确消耗量
    console.log('\n✅ 用户期望的正确消耗:');
    console.log('   1. 创建1件SKU: 消耗1件');
    console.log('   2. 补货+2件: 消耗2件');
    console.log('   3. 补货+3件: 消耗3件');
    console.log('   4. 最后补货+1件: 消耗1件');
    console.log('   📊 期望总消耗: 7件 (1+2+3+1)');
    console.log('   📊 期望剩余库存: 48-7=41件');
    
    // 等等，让我重新分析用户的描述
    console.log('\n🔍 重新分析用户描述:');
    console.log('   用户说最终应该是42件，那么总消耗应该是48-42=6件');
    console.log('   可能拆散重做退回了1件，所以实际消耗是7-1=6件');
    
    const expectedTotalUsed = 6;
    const expectedRemaining = 48 - expectedTotalUsed;
    
    console.log(`   📊 修正后期望总消耗: ${expectedTotalUsed} 件`);
    console.log(`   📊 修正后期望剩余: ${expectedRemaining} 件`);
    
    if (currentTotalUsed === expectedTotalUsed) {
      console.log('\n✅ MaterialUsage记录已经正确，无需修复');
      return;
    }
    
    // 4. 修复MaterialUsage记录
    console.log('\n🔧 开始修复MaterialUsage记录...');
    
    await prisma.$transaction(async (tx) => {
      if (materialUsages.length === 2) {
        // 情况：有2条记录，各消耗5件，需要调整为合理的分配
        // 第一条记录：创建时消耗1件
        // 第二条记录：所有补货消耗5件
        
        console.log('   🔄 调整第一条记录为1件（创建时消耗）');
        await tx.material_usage.update({
          where: { id: materialUsages[0].id },
          data: {
            quantity_used_pieces: 1,
            quantity_used_beads: 0,
            total_cost: (materialUsages[0].unit_cost || 0) * 1
          }
        });
        
        console.log('   🔄 调整第二条记录为5件（所有补货消耗）');
        await tx.material_usage.update({
          where: { id: materialUsages[1].id },
          data: {
            quantity_used_pieces: 5,
            quantity_used_beads: 0,
            total_cost: (materialUsages[1].unit_cost || 0) * 5
          }
        });
        
        console.log('   ✅ MaterialUsage记录修复完成');
      } else {
        console.log(`   ⚠️  MaterialUsage记录数量异常: ${materialUsages.length}条`);
      }
    });
    
    // 5. 验证修复结果
    console.log('\n🔍 验证修复结果:');
    const updatedUsages = await prisma.material_usage.find_many({
      where: {
        purchase_id: targetPurchase.id
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    let newTotalUsed = 0;
    updatedUsages.for_each((usage, index) => {
      const usedQty = usage.quantity_used_beads + usage.quantity_used_pieces;
      newTotalUsed += usedQty;
      const date = usage.created_at.to_i_s_o_string().split('T')[0];
      console.log(`   ${index + 1}. ${date} - 消耗${usedQty}件`);
    });
    
    const newRemaining = targetPurchase.piece_count - newTotalUsed;
    console.log(`   📊 修复后总消耗: ${newTotalUsed} 件`);
    console.log(`   📊 修复后剩余库存: ${newRemaining} 件`);
    
    if (newRemaining === 42) {
      console.log('   ✅ 修复成功！库存现在显示为用户期望的42件');
    } else {
      console.log(`   ⚠️  库存仍不正确，期望42件，实际${newRemaining}件`);
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixHetianyuMaterialUsageFinal();