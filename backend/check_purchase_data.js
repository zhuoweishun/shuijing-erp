import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    // 查找SKU20250922001
    const sku = await prisma.productSku.findFirst({
      where: { sku_code: 'SKU20250922001' },
      include: {
        material_usages: {
          include: {
            material: {
              include: {
                purchase: {
                  include: {
                    supplier: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    console.log('=== SKU信息 ===');
    if (!sku) {
      console.log('未找到SKU20250922001');
      return;
    }
    
    console.log('SKU代码:', sku.sku_code);
    console.log('SKU名称:', sku.sku_name);
    console.log('材料使用记录数量:', sku.material_usages.length);
    
    if (sku.material_usages.length > 0) {
      const materialUsage = sku.material_usages[0];
      const purchase = materialUsage.material.purchase;
      
      console.log('\n=== 采购记录详情 ===');
      console.log('采购ID:', purchase.id);
      console.log('采购名称:', purchase.purchase_name);
      console.log('采购类型:', purchase.purchase_type);
      console.log('总价格 (total_price):', purchase.total_price);
      console.log('件数 (piece_count):', purchase.piece_count);
      console.log('单价 (price_per_piece):', purchase.price_per_piece);
      console.log('单位价格 (unit_price):', purchase.unit_price);
      console.log('每克价格 (price_per_gram):', purchase.price_per_gram);
      console.log('每颗价格 (price_per_bead):', purchase.price_per_bead);
      
      console.log('\n=== 计算逻辑分析 ===');
      if (purchase.total_price && purchase.piece_count) {
        const calculatedPrice = parseFloat(purchase.total_price) / parseFloat(purchase.piece_count);
        console.log('计算结果 (total_price ÷ piece_count):', calculatedPrice.toFixed(2));
        console.log('为什么除以', purchase.piece_count, '？因为这是采购的总件数');
      }
      
      console.log('\n=== MaterialUsage信息 ===');
      console.log('使用数量:', materialUsage.quantity_used);
      console.log('单位成本:', materialUsage.unit_cost);
    }
    
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await prisma.$disconnect();
  }
})();