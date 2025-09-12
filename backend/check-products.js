import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    console.log('=== 产品制作记录检查 ===\n');
    
    const products = await prisma.product.find_many({
      include: {
        materialUsages: {
          include: {
            purchase: true
          }
        },
        sku: true
      }
    });
    
    console.log(`产品总数: ${products.length}\n`);
    
    for (const product of products) {
      console.log(`产品: ${product.name}`);
      console.log(`  SKU关联: ${product.sku ? product.sku.sku_code : '无'}`);
      console.log(`  原材料使用记录数量: ${product.materialUsages.length}`);
      
      if (product.materialUsages.length > 0) {
        let totalMaterialCost = 0;
        console.log(`  原材料使用详情:`);
        
        for (const usage of product.materialUsages) {
          const beadsCost = (usage.quantity_used_beads || 0) * (usage.purchase.unit_price || 0);
          const piecesCost = (usage.quantity_used_pieces || 0) * (usage.purchase.unit_price || 0);
          const usageCost = beadsCost + piecesCost;
          totalMaterialCost += usageCost;
          
          console.log(`    - ${usage.purchase.product_name}`);
          console.log(`      珠子: ${usage.quantity_used_beads || 0}, 件数: ${usage.quantity_used_pieces || 0}`);
          console.log(`      单价: ${usage.purchase.unit_price || 0}, 成本: ${usageCost}`);
        }
        
        console.log(`  ✅ 总原材料成本: ${totalMaterialCost}`);
        
        if (product.sku) {
          console.log(`  SKU中的成本数据:`);
          console.log(`    material_cost: ${product.sku.material_cost}`);
          console.log(`    labor_cost: ${product.sku.labor_cost}`);
          console.log(`    craft_cost: ${product.sku.craft_cost}`);
          console.log(`    total_cost: ${product.sku.total_cost}`);
          
          // 检查是否匹配
          const skuMaterialCost = parseFloat(product.sku.material_cost || 0);
          if (Math.abs(skuMaterialCost - totalMaterialCost) > 0.01) {
            console.log(`  ⚠️  原材料成本不匹配! 实际: ${totalMaterialCost}, SKU中: ${skuMaterialCost}`);
          } else {
            console.log(`  ✅ 原材料成本匹配`);
          }
        }
      } else {
        console.log(`  ⚠️  没有原材料使用记录`);
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
  } catch (error) {
    console.error('检查产品记录时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();