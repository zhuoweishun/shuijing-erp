import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test_customer_analytics_fix() {
  try {
    console.log('🔍 测试客户分析API修复效果...');
    
    // 获取正常销售记录（用于毛利率计算，排除已退货记录）
    const active_purchases = await prisma.customerPurchases.findMany({
      where: {
        status: 'ACTIVE' // 只包含正常销售记录
      },
      include: {
        product_skus: {
          select: {
            total_cost: true,
            sku_name: true,
            sku_code: true
          }
        }
      }
    });
    
    console.log(`\n📊 找到 ${active_purchases.length} 条有效销售记录`);
    
    // 计算正常销售记录的总成本和总售价
    let total_cost_amount = 0;
    let total_active_sales_amount = 0;
    let valid_cost_records = 0;
    let invalid_cost_records = 0;
    
    active_purchases.forEach((purchase, index) => {
      const sale_price = Number(purchase.total_price);
      total_active_sales_amount += sale_price;
      
      console.log(`\n记录 ${index + 1}:`);
      console.log(`  - ID: ${purchase.id}`);
      console.log(`  - SKU: ${purchase.product_skus?.sku_code || '未知'}`);
      console.log(`  - 商品名: ${purchase.product_skus?.sku_name || '未知'}`);
      console.log(`  - 数量: ${purchase.quantity}`);
      console.log(`  - 售价: ¥${sale_price}`);
      
      if (purchase.product_skus && purchase.product_skus.total_cost) {
        const unit_cost = Number(purchase.product_skus.total_cost);
        const cost_for_this_purchase = unit_cost * purchase.quantity;
        total_cost_amount += cost_for_this_purchase;
        valid_cost_records++;
        
        console.log(`  - 单位成本: ¥${unit_cost}`);
        console.log(`  - 总成本: ¥${cost_for_this_purchase}`);
        console.log(`  - 毛利: ¥${sale_price - cost_for_this_purchase}`);
        console.log(`  - 毛利率: ${sale_price > 0 ? ((sale_price - cost_for_this_purchase) / sale_price * 100).toFixed(2) : 0}%`);
      } else {
        invalid_cost_records++;
        console.log(`  - ⚠️ 缺少成本数据`);
      }
    });
    
    console.log(`\n📊 计算结果汇总:`);
    console.log(`  - 有效成本记录: ${valid_cost_records}`);
    console.log(`  - 无效成本记录: ${invalid_cost_records}`);
    console.log(`  - 总销售额: ¥${total_active_sales_amount}`);
    console.log(`  - 总成本: