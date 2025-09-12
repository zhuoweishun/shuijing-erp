import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSales() {
  try {
    console.log('🔍 检查销售记录...');
    
    // 检查客户购买记录数量（相当于销售记录）
    const salesCount = await prisma.customer_purchase.count();
    console.log('客户购买记录数量:', salesCount);
    
    if (salesCount > 0) {
      const sales = await prisma.customer_purchase.find_many({ 
        take: 5,
        include: {
          customer: true,
          sku: true
        }
      });
      console.log('客户购买记录样本:', JSON.stringify(sales, null, 2));
    }
    
    // 检查财务记录
    const financialCount = await prisma.financial_record.count();
    console.log('财务记录数量:', financialCount);
    
    if (financialCount > 0) {
      const financialRecords = await prisma.financial_record.find_many({ 
        take: 5,
        orderBy: { created_at: 'desc' }
      });
      console.log('财务记录样本:', JSON.stringify(financialRecords, null, 2));
    }
    
    // 检查采购记录
    const purchase_count = await prisma.purchase.count();
    console.log('采购记录数量:', purchaseCount);
    
    // 检查SKU记录
    const skuCount = await prisma.product_sku.count();
    console.log('SKU记录数量:', skuCount);
    
    console.log('\n📊 数据库状态总结:');
    console.log('- 销售记录:', salesCount, '条');
    console.log('- 财务记录:', financialCount, '条');
    console.log('- 采购记录:', purchaseCount, '条');
    console.log('- SKU记录:', skuCount, '条');
    
  } catch(e) {
    console.log('检查时出错:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSales();