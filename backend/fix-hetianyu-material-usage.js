import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixHetianYuMaterialUsage() {
  try {
    console.log('🔧 开始修复和田玉挂件MaterialUsage记录...');
    
    // 1. 首先查看所有和田玉挂件的采购记录，找到正确的CG编号
    const allPurchases = await prisma.purchase.find_many({
      where: {
        product_name: {
          contains: '和田玉挂件'
        }
      },
      select: {
        id: true,
        purchase_code: true,
        product_name: true,
        piece_count: true,
        status: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    console.log('📦 所有和田玉挂件采购记录:');
    allPurchases.for_each((purchase, index) => {
      console.log(`${index + 1}. CG编号: ${purchase.purchase_code}`);
      console.log(`   名称: ${purchase.product_name}`);
      console.log(`   数量: ${purchase.piece_count}件`);
      console.log(`   状态: ${purchase.status}`);
      console.log('---');
    });
    
    // 找到状态为USED的采购记录
    const targetPurchase = allPurchases.find(p => p.status === 'USED');
    
    if (!targetPurchase) {
      console.log('❌ 找不到状态为USED的和田玉挂件采购记录');
      return;
    }
    
    console.log(`\n📦 找到目标采购记录:`);
    console.log(`   CG编号: ${targetPurchase.purchase_code}`);
    console.log(`   ID: ${targetPurchase.id}`);
    console.log(`   名称: ${targetPurchase.product_name}`);
    console.log(`   数量: ${targetPurchase.piece_count}件`);
    console.log(`   状态: ${targetPurchase.status}`);
    
    // 2. 查询这个采购记录的MaterialUsage
    const materialUsage = await prisma.materialUsage.find_first({
      where: {
        purchase_id: targetPurchase.id
      },
      include: {
        product: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (!materialUsage) {
      console.log('❌ 找不到对应的MaterialUsage记录');
      return;
    }
    
    console.log(`\n🔧 当前MaterialUsage记录:`);
    console.log(`   使用数量: ${materialUsage.quantity_used_pieces}件`);
    console.log(`   关联成品: ${materialUsage.product?.name || 'N/A'}`);
    
    // 3. 查询和田玉挂件SKU的操作历史
    const skuLogs = await prisma.sku_inventory_log.find_many({
      where: {
        sku: {
          sku_name: {
            contains: '和田玉挂件'
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    console.log(`\n📝 SKU操作历史:`);
    let totalCreated = 0;
    let totalDestroyed = 0;
    let destroyedForRemaking = 0;
    
    skuLogs.for_each((log, index) => {
      console.log(`${index + 1}. ${log.action}: ${log.quantity_change}, 备注: ${log.notes || 'N/A'}`);
      
      if (log.action === 'CREATE' || log.action === 'ADJUST') {
        if (log.quantity_change > 0) {
          totalCreated += log.quantity_change;
        }
      } else if (log.action === 'DESTROY') {
        totalDestroyed += Math.abs(log.quantity_change);
        if (log.notes && log.notes.includes('拆散重做')) {
          destroyedForRemaking += Math.abs(log.quantity_change);
        }
      }
    });
    
    console.log(`\n📊 统计结果:`);
    console.log(`总制作数量: ${totalCreated}件`);
    console.log(`总销毁数量: ${totalDestroyed}件`);
    console.log(`拆散重做数量: ${destroyedForRemaking}件`);
    
    // 4. 计算正确的使用量
    // 制作SKU消耗原材料，拆散重做退回原材料
    const correctUsage = totalCreated - destroyedForRemaking;
    const expectedRemaining = targetPurchase.piece_count - correctUsage;
    
    console.log(`\n🧮 正确计算:`);
    console.log(`采购数量: ${targetPurchase.piece_count}件`);
    console.log(`制作消耗: ${totalCreated}件`);
    console.log(`拆散退回: ${destroyedForRemaking}件`);
    console.log(`净消耗: ${correctUsage}件`);
    console.log(`应剩余: ${expectedRemaining}件`);
    
    // 根据用户描述，48件采购记录应该剩余43件，即使用了5件
    const userExpectedUsage = 5;
    console.log(`用户期望使用: ${userExpectedUsage}件`);
    console.log(`计算是否正确: ${correctUsage === userExpectedUsage ? '✅ 正确' : '❌ 不正确'}`);
    
    if (correctUsage !== userExpectedUsage) {
      console.log('\n❌ 计算结果不符合用户期望');
      console.log('可能的问题:');
      console.log('1. SKU操作历史记录有误');
      console.log('2. 拆散重做的退回逻辑有问题');
      console.log('3. 存在其他未记录的操作');
      return;
    }
    
    // 5. 检查是否需要修复
    if (materialUsage.quantity_used_pieces === correctUsage) {
      console.log('\n✅ MaterialUsage记录已经正确，无需修复');
      return;
    }
    
    // 6. 执行修复
    console.log(`\n🔧 修复MaterialUsage记录...`);
    console.log(`从 ${materialUsage.quantity_used_pieces}件 调整为 ${correctUsage}件`);
    
    await prisma.materialUsage.update({
      where: {
        id: materialUsage.id
      },
      data: {
        quantity_used_pieces: correctUsage
      }
    });
    
    console.log('✅ MaterialUsage记录已更新');
    
    // 7. 验证修复结果
    const updatedUsage = await prisma.materialUsage.find_first({
      where: {
        id: materialUsage.id
      }
    });
    
    console.log(`\n🔍 验证结果:`);
    console.log(`修复后使用量: ${updatedUsage.quantity_used_pieces}件`);
    console.log(`预期剩余: ${targetPurchase.piece_count - updatedUsage.quantity_used_pieces}件`);
    console.log(`用户期望剩余: 43件`);
    console.log(`修复是否成功: ${(targetPurchase.piece_count - updatedUsage.quantity_used_pieces) === 43 ? '✅ 成功' : '❌ 失败'}`);
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHetianYuMaterialUsage();