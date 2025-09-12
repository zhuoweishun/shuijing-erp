import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkHetianYuCurrentStatus() {
  try {
    console.log('🔍 检查和田玉挂件当前数据状态...');
    
    // 1. 查询特定的和田玉挂件采购记录（CG20250901590291）
    const targetPurchase = await prisma.purchase.find_first({
      where: {
        purchase_code: 'CG20250901590291'
      },
      select: {
        id: true,
        purchase_code: true,
        product_name: true,
        quantity: true,
        status: true,
        product_type: true,
        piece_count: true
      }
    });
    
    if (!targetPurchase) {
      console.log('❌ 找不到CG编号为CG20250901590291的采购记录');
      return;
    }
    
    console.log('\n📦 目标采购记录:');
    console.log(`   CG编号: ${targetPurchase.purchase_code}`);
    console.log(`   名称: ${targetPurchase.product_name}`);
    console.log(`   数量: ${targetPurchase.quantity || 'N/A'}`);
    console.log(`   件数: ${targetPurchase.piece_count}`);
    console.log(`   状态: ${targetPurchase.status}`);
    console.log(`   类型: ${targetPurchase.product_type}`);
    
    // 2. 查询这个采购记录的MaterialUsage
    const materialUsage = await prisma.materialUsage.find_first({
      where: {
        purchase_id: targetPurchase.id
      },
      include: {
        purchase: {
          select: {
            purchase_code: true,
            product_name: true
          }
        },
        product: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log('\n🔧 MaterialUsage记录:');
    if (materialUsage) {
      console.log(`   采购CG编号: ${materialUsage.purchase.purchase_code}`);
      console.log(`   采购名称: ${materialUsage.purchase.product_name}`);
      console.log(`   成品: ${materialUsage.product?.name || 'N/A'}`);
      console.log(`   使用数量(件): ${materialUsage.quantity_used_pieces || 0}`);
      console.log(`   使用数量(颗): ${materialUsage.quantity_used_beads || 0}`);
      console.log(`   创建时间: ${materialUsage.created_at}`);
    } else {
      console.log('   ❌ 未找到MaterialUsage记录');
    }
    
    // 3. 查询和田玉挂件SKU的操作历史
    const skuLogs = await prisma.sku_inventory_log.find_many({
      where: {
        sku: {
          sku_name: {
            contains: '和田玉挂件'
          }
        }
      },
      include: {
        sku: {
          select: {
            sku_name: true,
            available_quantity: true
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    console.log('\n📝 SKU库存变更记录:');
    skuLogs.for_each((log, index) => {
      console.log(`${index + 1}. SKU: ${log.sku.sku_name}`);
      console.log(`   操作: ${log.action}`);
      console.log(`   引用类型: ${log.reference_type}`);
      console.log(`   数量变化: ${log.quantity_change}`);
      console.log(`   操作后库存: ${log.quantity_after}`);
      console.log(`   时间: ${log.created_at}`);
      console.log(`   备注: ${log.notes || 'N/A'}`);
      console.log('---');
    });
    
    // 4. 查询当前SKU状态
    const skus = await prisma.product_sku.find_many({
      where: {
        sku_name: {
          contains: '和田玉挂件'
        }
      },
      select: {
        id: true,
        sku_name: true,
        available_quantity: true,
        status: true
      }
    });
    
    console.log('\n🎯 当前SKU状态:');
    skus.for_each((sku, index) => {
      console.log(`${index + 1}. ID: ${sku.id}`);
      console.log(`   名称: ${sku.sku_name}`);
      console.log(`   当前库存: ${sku.available_quantity}`);
      console.log(`   状态: ${sku.status}`);
      console.log('---');
    });
    
    // 5. 计算库存验证（只针对这个特定的采购记录）
    if (materialUsage) {const used_quantity = materialUsage.quantity_used_pieces || 0;
      const expectedRemaining = targetPurchase.piece_count - used_quantity;
      
      console.log('\n🧮 库存计算验证（针对CG20250901590291）:');
      console.log(`采购数量: ${targetPurchase.piece_count}件`);
      console.log(`使用数量: ${used_quantity}件`);
      console.log(`预期剩余: ${expectedRemaining}件`);
      console.log(`用户期望剩余: 43件`);
      
      const isCorrect = expectedRemaining === 43;
      console.log(`\n✅ 数据一致性: ${isCorrect ? '正确' : '❌ 不正确'}`);
      
      if (!isCorrect) {
        console.log('\n🔧 需要修复的问题:');
        console.log('- MaterialUsage记录中的使用量与用户期望不符');
        console.log(`- 当前计算: ${targetPurchase.piece_count} - ${used_quantity} = ${expectedRemaining}`);
        console.log(`- 用户期望: ${targetPurchase.piece_count} - ? = 43`);
        console.log(`- 应该使用: ${targetPurchase.piece_count - 43} = ${targetPurchase.piece_count - 43}件`);
      } else {
        console.log('\n🎉 恭喜！数据已经完全正确！');
        console.log('- MaterialUsage记录正确');
        console.log('- 库存计算正确');
        console.log('- 符合用户期望');
      }
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHetianYuCurrentStatus();