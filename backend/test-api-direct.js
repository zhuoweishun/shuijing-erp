import { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// 直接测试SKU溯源逻辑
async function testSkuTraceLogic() {
  try {
    console.log('🧪 直接测试SKU溯源逻辑...');
    
    const sku = await prisma.product_sku.find_first({
      where: { sku_code: 'SKU20250906002' },
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: {
                  include: {
                    supplier: true,
                    user: true
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
    
    if (!sku) {
      console.log('❌ SKU不存在');
      return;
    }
    
    console.log('\n🔍 SKU信息:');
    console.log('  SKU编码:', sku.sku_code);
    console.log('  SKU名称:', sku.sku_name);
    console.log('  总数量:', sku.total_quantity);
    
    // 获取制作配方数据（基于第一次制作时的MaterialUsage记录）
    const recipeData = [];
    const processedPurchaseIds = new Set();
    
    console.log('\n📋 配方计算过程:');
    
    // 遍历所有关联的成品，获取制作配方
    for (const product of sku.products) {
      for (const materialUsage of product.materialUsages) {
        const purchase = materialUsage.purchase;
        
        // 避免重复处理同一个采购记录
        if (processedPurchaseIds.has(purchase.id)) {
          continue;
        }
        processedPurchaseIds.add(purchase.id);
        
        // 计算当前原材料的单个SKU消耗量（基于MaterialUsage记录）
        const materialBeads = materialUsage.quantity_used_beads || 0;
        const materialPieces = materialUsage.quantity_used_pieces || 0;
        const materialTotal = materialBeads + materialPieces;
        
        // 修复后的逻辑：直接使用MaterialUsage记录中的数量
        const singleSkuConsumption = materialTotal > 0 ? materialTotal : 1;
        
        console.log(`\n  原材料: ${purchase.product_name}`);
        console.log(`    MaterialUsage记录: 颗数=${materialBeads}, 件数=${materialPieces}, 总计=${materialTotal}`);
        console.log(`    修复前计算: Math.round(${materialTotal} / ${sku.total_quantity}) = ${Math.round(materialTotal / sku.total_quantity)}`);
        console.log(`    修复后计算: ${singleSkuConsumption}`);
        
        // 确定单位
        let unit = '件';
        if (purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'BRACELET') {
          unit = '颗';
        }
        
        recipeData.push({
          material_name: purchase.product_name,
          quantityPerSku: singleSkuConsumption,
          unit: unit,
          supplier: purchase.supplier?.name || '未知供应商'
        });
      }
    }
    
    console.log('\n✅ 修复后的配方信息:');
    recipeData.for_each((item, index) => {
      console.log(`  ${index + 1}. ${item.material_name}`);
      console.log(`     单个SKU需要: ${item.quantityPerSku}${item.unit}`);
      console.log(`     供应商: ${item.supplier}`);
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSkuTraceLogic();