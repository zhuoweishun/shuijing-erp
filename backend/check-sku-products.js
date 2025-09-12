import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSkuProducts() {
  try {
    console.log('=== SKU关联产品检查 ===\n');
    
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
      console.log(`  关联产品数量: ${sku.products.length}`);
      
      if (sku.products.length > 0) {
        for (const product of sku.products) {
          console.log(`  产品: ${product.name}`);
          console.log(`    原材料使用记录数量: ${product.materialUsages.length}`);
          
          if (product.materialUsages.length > 0) {
            console.log(`    原材料使用详情:`);
            for (const usage of product.materialUsages) {
              console.log(`      - ${usage.purchase.product_name}`);
              console.log(`        珠子数量: ${usage.quantity_used_beads || 0}`);
              console.log(`        件数: ${usage.quantity_used_pieces || 0}`);
              console.log(`        单价: ${usage.purchase.unit_price || 0}`);
            }
          } else {
            console.log(`    ⚠️  没有原材料使用记录!`);
          }
        }
      } else {
        console.log(`  ⚠️  没有关联的产品!`);
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
  } catch (error) {
    console.error('检查SKU产品关联时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSkuProducts();