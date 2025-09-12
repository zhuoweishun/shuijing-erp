import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkRealSkuCosts() {
  try {
    console.log('=== 检查SKU真实成本数据 ===\n');
    
    const skus = await prisma.product_sku.find_many({
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: true
              }
            }
          }
        }
      }
    });
    
    for (const sku of skus) {
      console.log(`SKU: ${sku.sku_code} - ${sku.sku_name}`);
      console.log(`  当前数据库中的成本数据:`);
      console.log(`    material_cost: ${sku.material_cost}`);
      console.log(`    labor_cost: ${sku.labor_cost}`);
      console.log(`    craft_cost: ${sku.craft_cost}`);
      console.log(`    total_cost: ${sku.total_cost}`);
      console.log(`    selling_price: ${sku.selling_price}`);
      
      if (sku.products.length > 0) {
        const product = sku.products[0];
        console.log(`  关联产品: ${product.name}`);
        
        if (product.materialUsages.length > 0) {
          console.log(`  实际原材料使用记录:`);
          let realMaterialCost = 0;
          
          for (const usage of product.materialUsages) {
            const beadsCost = (usage.quantity_used_beads || 0) * (usage.purchase.unit_price || 0);
            const piecesCost = (usage.quantity_used_pieces || 0) * (usage.purchase.unit_price || 0);
            const totalUsageCost = beadsCost + piecesCost;
            realMaterialCost += totalUsageCost;
            
            console.log(`    - ${usage.purchase.product_name}:`);
            console.log(`      珠子数量: ${usage.quantity_used_beads || 0}, 件数: ${usage.quantity_used_pieces || 0}`);
            console.log(`      单价: ${usage.purchase.unit_price || 0}`);
            console.log(`      使用成本: ${totalUsageCost}`);
          }
          
          console.log(`  ✅ 实际原材料成本总计: ${realMaterialCost}`);
          
          // 检查成本数据是否为假数据（售价的60%）
          const currentTotalCost = parseFloat(sku.total_cost || 0);
          const selling_price = parseFloat(sku.selling_price || 0);
          const expectedFakeCost = sellingPrice * 0.6;
          
          if (Math.abs(currentTotalCost - expectedFakeCost) < 0.01) {
            console.log(`  ⚠️  警告: 当前totalCost (${currentTotalCost}) 疑似为假数据 (售价60%: ${expectedFakeCost})`);
          }
        }
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
  } catch (error) {
    console.error('检查SKU成本数据时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealSkuCosts();