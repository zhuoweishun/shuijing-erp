import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSkuData() {
  try {
    console.log('🔍 查询SKU20250906002的数据...');
    
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
    
    if (!sku) {
      console.log('❌ SKU20250906002 不存在');
      return;
    }
    
    console.log('\n🔍 SKU信息:');
    console.log('  SKU ID:', sku.id);
    console.log('  SKU编码:', sku.sku_code);
    console.log('  SKU名称:', sku.sku_name);
    console.log('  总数量:', sku.total_quantity);
    console.log('  可售数量:', sku.available_quantity);
    
    console.log('\n📦 关联产品数量:', sku.products.length);
    
    sku.products.for_each((product, index) => {
      console.log(`\n产品 ${index + 1}:`);
      console.log('  产品ID:', product.id);
      console.log('  MaterialUsage记录数量:', product.materialUsages.length);
      
      product.materialUsages.for_each((usage, usageIndex) => {
        console.log(`\n  MaterialUsage ${usageIndex + 1}:`);
        console.log('    ID:', usage.id);
        console.log('    采购ID:', usage.purchase_id);
        console.log('    使用颗数:', usage.quantity_used_beads || 0);
        console.log('    使用件数:', usage.quantity_used_pieces || 0);
        console.log('    总使用量:', (usage.quantity_used_beads || 0) + (usage.quantity_used_pieces || 0));
        console.log('    创建时间:', usage.created_at);
        console.log('    采购记录:', usage.purchase ? usage.purchase.product_name : '无');
      });
    });
    
    // 计算配方数量
    console.log('\n🧮 配方数量计算分析:');
    const processedPurchaseIds = new Set();
    
    for (const product of sku.products) {
      for (const materialUsage of product.materialUsages) {
        const purchase = materialUsage.purchase;
        
        if (!processedPurchaseIds.has(purchase.id)) {
          processedPurchaseIds.add(purchase.id);
          
          const materialBeads = materialUsage.quantity_used_beads || 0;
          const materialPieces = materialUsage.quantity_used_pieces || 0;
          const materialTotal = materialBeads + materialPieces;
          
          const singleSkuConsumption = materialTotal > 0 ? Math.round(materialTotal / sku.total_quantity) : 1;
          
          console.log(`\n  原材料: ${purchase.product_name}`);
          console.log('    materialTotal:', materialTotal);
          console.log('    sku.total_quantity:', sku.total_quantity);
          console.log('    计算结果:', materialTotal, '/', sku.total_quantity, '=', materialTotal / sku.total_quantity);
          console.log('    Math.round结果:', singleSkuConsumption);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSkuData();