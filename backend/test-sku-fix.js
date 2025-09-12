import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function testSkuFix() {
  try {
    console.log('🧪 测试SKU20250906002修复后的效果...');
    
    // 1. 测试溯源信息API
    console.log('\n📋 测试溯源信息API...');
    const traceResponse = await fetch('http://localhost:3001/api/v1/skus/cmf7t6eqe00452f1qhqhqhqhq/trace', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (traceResponse.ok) {
      const traceData = await traceResponse.json();
      console.log('✅ 溯源API调用成功');
      console.log('SKU信息:', traceData.data.sku_info);
      console.log('\n配方信息:');
      traceData.data.recipe.for_each((item, index) => {
        console.log(`  ${index + 1}. ${item.material_name}`);
        console.log(`     单个SKU需要: ${item.quantity_per_sku}${item.unit}`);
        console.log(`     规格: ${item.specification}`);
        console.log(`     供应商: ${item.supplier}`);
      });
    } else {
      console.log('❌ 溯源API调用失败:', await traceResponse.text());
    }
    
    // 2. 测试补货信息API
    console.log('\n🔄 测试补货信息API...');
    const restockResponse = await fetch('http://localhost:3001/api/v1/skus/cmf7t6eqe00452f1qhqhqhqhq/restock-info', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (restockResponse.ok) {
      const restockData = await restockResponse.json();
      console.log('✅ 补货API调用成功');
      console.log('SKU信息:', {
        sku_code: restockData.data.sku_code,
        sku_name: restockData.data.sku_name,
        currentQuantity: restockData.data.currentQuantity
      });
      console.log('\n补货需要的原材料:');
      restockData.data.required_materials.for_each((material, index) => {
        console.log(`  ${index + 1}. ${material.product_name}`);
        console.log(`     单个SKU需要: ${material.quantity_needed_per_sku}${material.unit}`);
        console.log(`     库存充足: ${material.is_sufficient ? '是' : '否'}`);
        console.log(`     可用库存: ${material.available_quantity}`);
      });
    } else {
      console.log('❌ 补货API调用失败:', await restockResponse.text());
    }
    
    // 3. 直接查询数据库验证
    console.log('\n🔍 直接查询数据库验证...');
    const sku = await prisma.product_sku.find_first({
      where: { sku_code: 'SKU20250906002' },
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
        }
      }
    });
    
    if (sku) {
      console.log('\n验证MaterialUsage记录:');
      const processedPurchaseIds = new Set();
      
      for (const product of sku.products) {
        for (const materialUsage of product.materialUsages) {
          const purchase = materialUsage.purchase;
          
          if (!processedPurchaseIds.has(purchase.id)) {
            processedPurchaseIds.add(purchase.id);
            
            const materialBeads = materialUsage.quantity_used_beads || 0;
            const materialPieces = materialUsage.quantity_used_pieces || 0;
            const materialTotal = materialBeads + materialPieces;
            
            console.log(`  ${purchase.product_name}:`);
            console.log(`    MaterialUsage数量: ${materialTotal}`);
            console.log(`    应该显示的配方数量: ${materialTotal}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSkuFix();