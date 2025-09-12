import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyzeHetianyuInventoryError() {
  try {
    console.log('🔍 分析和田玉挂件库存计算错误...');
    
    // 1. 查找和田玉挂件的采购记录
    console.log('\n📦 1. 查找和田玉挂件采购记录:');
    const hetianyuPurchases = await prisma.purchase.find_many({
      where: {
        product_name: {
          contains: '和田玉挂件'
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    console.log(`   找到 ${hetianyuPurchases.length} 条采购记录:`);
    let totalPurchased = 0;
    hetianyuPurchases.for_each((purchase, index) => {
      console.log(`   ${index + 1}. ${purchase.purchase_code} - ${purchase.piece_count}件 (${purchase.status})`);
      totalPurchased += purchase.piece_count;
    });
    console.log(`   📊 采购总数: ${totalPurchased} 件`);
    
    // 2. 查找和田玉挂件SKU
    console.log('\n🏷️ 2. 查找和田玉挂件SKU:');
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
                purchase: true
              },
              orderBy: {
                created_at: 'asc'
              }
            }
          }
        },
        inventoryLogs: {
          orderBy: {
            created_at: 'asc'
          }
        }
      }
    });
    
    if (!hetianyuSku) {
      console.log('   ❌ 未找到和田玉挂件SKU');
      return;
    }
    
    console.log(`   ✅ 找到SKU: ${hetianyuSku.sku_name}`);
    console.log(`   📊 当前库存: ${hetianyuSku.available_quantity} 件`);
    console.log(`   📊 总制作数量: ${hetianyuSku.total_quantity} 件`);
    
    // 3. 分析MaterialUsage记录
    console.log('\n🔧 3. 分析MaterialUsage记录:');
    const allMaterialUsages = [];
    hetianyuSku.products.for_each(product => {
      product.materialUsages.for_each(usage => {
        allMaterialUsages.push(usage);
      });
    });
    
    console.log(`   找到 ${allMaterialUsages.length} 条MaterialUsage记录:`);
    let totalMaterialUsed = 0;
    allMaterialUsages.for_each((usage, index) => {
      const usedQty = usage.quantity_used_beads + usage.quantity_used_pieces;
      totalMaterialUsed += usedQty;
      const date = usage.created_at.to_i_s_o_string().split('T')[0];
      console.log(`   ${index + 1}. ${date} - 采购${usage.purchase.purchase_code} - 消耗${usedQty}件`);
    });
    console.log(`   📊 总消耗: ${totalMaterialUsed} 件`);
    
    // 4. 分析SKU操作历史
    console.log('\n📋 4. 分析SKU操作历史:');
    console.log(`   找到 ${hetianyuSku.inventoryLogs.length} 条操作记录:`);
    let skuInventoryTrace = 0;
    hetianyuSku.inventoryLogs.for_each((log, index) => {
      skuInventoryTrace += log.quantity_change;
      const date = log.created_at.to_i_s_o_string().split('T')[0];
      const change = log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change;
      console.log(`   ${index + 1}. ${date} - ${log.action} ${change}件 - 累计${skuInventoryTrace}件 (${log.reason || 'N/A'})`);
    });
    
    // 5. 计算原材料库存
    console.log('\n📊 5. 库存计算分析:');
    
    // 找到48件的采购记录
    const targetPurchase = hetianyuPurchases.find(p => p.piece_count === 48);
    if (!targetPurchase) {
      console.log('   ❌ 未找到48件的采购记录');
      return;
    }
    
    console.log(`   🎯 目标采购记录: ${targetPurchase.purchase_code} - ${targetPurchase.piece_count}件`);
    
    // 计算该采购记录的MaterialUsage消耗
    const targetUsages = await prisma.material_usage.find_many({
      where: {
        purchase_id: targetPurchase.id
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    console.log(`   📋 该采购记录的Material_usage:`);
    let totalUsedFromTarget = 0;
    targetUsages.for_each((usage, index) => {
      const usedQty = usage.quantity_used_beads + usage.quantity_used_pieces;
      totalUsedFromTarget += usedQty;
      const date = usage.created_at.to_i_s_o_string().split('T')[0];
      console.log(`   ${index + 1}. ${date} - 消耗${usedQty}件`);
    });
    
    const currentRemaining = targetPurchase.piece_count - totalUsedFromTarget;
    console.log(`   📊 当前计算: ${targetPurchase.piece_count} - ${totalUsedFromTarget} = ${currentRemaining} 件`);
    
    // 6. 用户期望的计算过程
    console.log('\n✅ 6. 用户期望的正确计算过程:');
    console.log('   1. 初始采购: 48件原材料');
    console.log('   2. 创建1件SKU: 消耗1件原材料，剩余47件');
    console.log('   3. 补货+2件: 消耗2件原材料，剩余45件');
    console.log('   4. 补货+3件: 消耗3件原材料，剩余42件');
    console.log('   5. 赠送销毁1件: 不退回原材料，仍42件');
    console.log('   6. 拆散重做销毁1件: 退回1件原材料，变成43件');
    console.log('   7. 最后补货+1件: 消耗1件原材料，最终42件');
    
    console.log('\n🔍 7. 问题分析:');
    console.log(`   当前显示库存: ${currentRemaining} 件`);
    console.log(`   用户期望库存: 42 件`);
    console.log(`   差异: ${currentRemaining - 42} 件`);
    
    if (currentRemaining !== 42) {
      console.log('\n💡 8. 修复建议:');
      console.log('   🔧 需要调整MaterialUsage记录，确保消耗数量正确');
      console.log('   🔧 需要验证销毁操作的退回原材料逻辑');
      console.log('   🔧 需要确保每次补货只消耗1件原材料（基于首次创建时的1:1比例）');
    }
    
  } catch (error) {
    console.error('❌ 分析过程中出现错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeHetianyuInventoryError();