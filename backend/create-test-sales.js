import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createTestSales() {
  try {
    console.log('🛒 创建测试销售记录...');
    
    // 1. 获取一些SKU用于销售
    const skus = await prisma.product_sku.find_many({
      take: 10,
      where: {
        available_quantity: { gt: 0 }
      }
    });
    
    if (skus.length === 0) {
      console.log('❌ 没有可用的SKU进行销售');
      return;
    }
    
    console.log(`找到 ${skus.length} 个可用SKU`);
    
    // 2. 创建测试客户
    const customers = [];
    for (let i = 1; i <= 5; i++) {
      const customer = await prisma.customer.upsert({
        where: { phone: `1380000000${i}` },
        update: {},
        create: {
          name: `测试客户${i}`,
          phone: `1380000000${i}`,
          address: `测试地址${i}`,
          notes: `测试客户备注${i}`
        }
      });
      customers.push(customer);
    }
    
    console.log(`创建了 ${customers.length} 个测试客户`);
    
    // 3. 创建销售记录
    const salesData = [];
    for (let i = 0; i < 20; i++) {const sku = skus[Math.floor(Math.random() * skus.length)];
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3件
      const unit_price = Number(sku.selling_price) || 100;
      const total_price = unit_price * quantity;
      
      // 创建购买日期（最近30天内）
      const purchase_date = new Date();
      purchaseDate.set_date(purchaseDate.get_date() - Math.floor(Math.random() * 30));
      
      const saleData = {
        customer_id: customer.id,
        sku_id: sku.id,
        sku_name: sku.sku_name,
        quantity: quantity,
        unit_price: unit_price,
        total_price: total_price,
        purchase_date: purchase_date,
        notes: `测试销售记录 ${i + 1}`
      };
      
      salesData.push(saleData);
    }
    
    // 4. 批量创建销售记录
    const createdSales = await prisma.customer_purchase.create_many({
      data: salesData
    });
    
    console.log(`✅ 创建了 ${createdSales.count} 条销售记录`);
    
    // 5. 更新客户统计
    for (const customer of customers) {
      const customerSales = salesData.filter(s => s.customer_id === customer.id);
      const totalAmount = customerSales.reduce((sum, s) => sum + s.total_price, 0);
      const total_orders = customerSales.length;
      
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          total_purchases: totalAmount,
          total_orders: totalOrders,
          first_purchase_date: new Date(),
          last_purchase_date: new Date()
        }
      });
    }
    
    console.log('✅ 更新了客户统计数据');
    
    // 6. 获取真实用户ID
    const user = await prisma.user.find_first();
    if (!user) {
      console.log('❌ 没有找到用户，跳过财务记录创建');
      return;
    }
    
    // 7. 创建对应的财务记录
    const financialRecords = salesData.map((sale, index) => ({
      recordType: 'INCOME',
      amount: sale.total_price,
      description: `销售收入 - ${sale.sku_name}`,
      referenceType: 'SALE',
      referenceId: `sale_${index + 1}`,
      category: '销售收入',
      transactionDate: sale.purchase_date,
      notes: `销售给客户 ${sale.quantity} 件`,
      userId: user.id
    }));
    
    const createdFinancialRecords = await prisma.financial_record.create_many({
      data: financialRecords
    });
    
    console.log(`✅ 创建了 ${createdFinancialRecords.count} 条财务记录`);
    
    // 8. 验证结果
    const totalSales = await prisma.customer_purchase.count();
    const totalFinancialRecords = await prisma.financial_record.count();
    const totalRevenue = salesData.reduce((sum, s) => sum + s.total_price, 0);
    
    console.log('\n📊 创建结果统计:');
    console.log('- 销售记录总数:', totalSales);
    console.log('- 财务记录总数:', totalFinancialRecords);
    console.log('- 总销售收入:', `¥${totalRevenue.to_fixed(2)}`);
    console.log('- 平均订单金额:', `¥${(totalRevenue / salesData.length).to_fixed(2)}`);
    
  } catch(e) {
    console.log('❌ 创建测试销售记录时出错:', e.message);
    console.log(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSales();