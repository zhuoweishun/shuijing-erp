import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanFakeData() {
  console.log('🧹 开始清理虚假数据...');
  
  try {
    // 1. 检查并删除测试数据（基于特定日期范围和模式）
    console.log('\n📋 检查虚假数据...');
    
    // 检查2025年9月8日的批量测试数据
    const fakeFinancialRecords = await prisma.financial_record.find_many({
      where: {
        created_at: {
          gte: new Date('2025-09-08T00:00:00.000Z'),
          lte: new Date('2025-09-08T23:59:59.999Z')
        }
      }
    });
    
    console.log(`发现 ${fakeFinancialRecords.length} 条2025年9月8日的财务记录`);
    
    // 检查虚假客户购买记录（购买了不存在的SKU）
    const invalidPurchases = await prisma.customer_purchase.find_many({
      include: {
        sku: true,
        customer: true
      }
    });
    
    const orphanedPurchases = invalidPurchases.filter(purchase => !purchase.sku);
    console.log(`发现 ${orphanedPurchases.length} 条孤立的客户购买记录（SKU不存在）`);
    
    // 检查测试前缀的数据
    const testPurchases = await prisma.purchase.find_many({
      where: {
        OR: [
          { product_name: { startsWith: 'test_' } },
          { product_name: { startsWith: 'Test' } },
          { product_name: { startsWith: 'TEST' } },
          { product_name: { startsWith: 'demo_' } },
          { product_name: { startsWith: 'Demo' } }
        ]
      }
    });
    
    console.log(`发现 ${testPurchases.length} 条测试前缀的采购记录`);
    
    // 检查测试客户
    const testCustomers = await prisma.customer.find_many({
      where: {
        OR: [
          { name: { startsWith: 'test_' } },
          { name: { startsWith: 'Test' } },
          { name: { startsWith: 'TEST' } },
          { name: { startsWith: 'demo_' } },
          { name: { startsWith: 'Demo' } },
          { phone: { startsWith: '1111111' } },
          { phone: { startsWith: '0000000' } }
        ]
      }
    });
    
    console.log(`发现 ${testCustomers.length} 条测试客户记录`);
    
    // 2. 开始清理操作
    console.log('\n🗑️ 开始清理操作...');
    
    // 删除2025年9月8日的财务记录
    if (fakeFinancialRecords.length > 0) {
      const deletedFinancial = await prisma.financial_record.delete_many({
        where: {
          created_at: {
            gte: new Date('2025-09-08T00:00:00.000Z'),
            lte: new Date('2025-09-08T23:59:59.999Z')
          }
        }
      });
      console.log(`✅ 删除了 ${deletedFinancial.count} 条虚假财务记录`);
    }
    
    // 删除孤立的客户购买记录
    if (orphanedPurchases.length > 0) {
      const orphanedIds = orphanedPurchases.map(p => p.id);
      const deletedPurchases = await prisma.customer_purchase.delete_many({
        where: {
          id: { in: orphanedIds }
        }
      });
      console.log(`✅ 删除了 ${deletedPurchases.count} 条孤立的客户购买记录`);
    }
    
    // 删除测试采购记录
    if (testPurchases.length > 0) {
      const deletedTestPurchases = await prisma.purchase.delete_many({
        where: {
          OR: [
            { product_name: { startsWith: 'test_' } },
            { product_name: { startsWith: 'Test' } },
            { product_name: { startsWith: 'TEST' } },
            { product_name: { startsWith: 'demo_' } },
            { product_name: { startsWith: 'Demo' } }
          ]
        }
      });
      console.log(`✅ 删除了 ${deletedTestPurchases.count} 条测试采购记录`);
    }
    
    // 删除测试客户
    if (testCustomers.length > 0) {
      // 先删除相关的客户购买记录和备注
      const testCustomerIds = testCustomers.map(c => c.id);
      
      await prisma.customer_purchase.delete_many({
        where: { customer_id: { in: testCustomerIds } }
      });
      
      await prisma.customer_note.delete_many({
        where: { customer_id: { in: testCustomerIds } }
      });
      
      const deletedTestCustomers = await prisma.customer.delete_many({
        where: {
          OR: [
            { name: { startsWith: 'test_' } },
            { name: { startsWith: 'Test' } },
            { name: { startsWith: 'TEST' } },
            { name: { startsWith: 'demo_' } },
            { name: { startsWith: 'Demo' } },
            { phone: { startsWith: '1111111' } },
            { phone: { startsWith: '0000000' } }
          ]
        }
      });
      console.log(`✅ 删除了 ${deletedTestCustomers.count} 条测试客户记录`);
    }
    
    // 3. 数据完整性检查
    console.log('\n🔍 进行数据完整性检查...');
    
    // 检查客户统计数据是否准确
    const customers = await prisma.customer.find_many({
      include: {
        purchases: {
          where: { status: 'ACTIVE' }
        }
      }
    });
    
    for (const customer of customers) {
      const actualTotalPurchases = customer.purchases.reduce((sum, p) => sum + Number(p.total_price), 0);
      const actualTotalOrders = customer.purchases.length;
      
      if (Math.abs(Number(customer.total_purchases) - actualTotalPurchases) > 0.01 || 
          customer.total_orders !== actualTotalOrders) {
        console.log(`⚠️ 客户 ${customer.name} 统计数据不准确，正在修复...`);
        
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            total_purchases: actualTotalPurchases,
            total_orders: actualTotalOrders
          }
        });
      }
    }
    
    // 检查SKU库存数据
    const skus = await prisma.product_sku.find_many({
      include: {
        customerPurchases: {
          where: { status: 'ACTIVE' }
        }
      }
    });
    
    for (const sku of skus) {
      const soldQuantity = sku.customerPurchases.reduce((sum, p) => sum + p.quantity, 0);
      const expectedAvailable = sku.total_quantity - soldQuantity;
      
      if (sku.available_quantity !== expectedAvailable) {
        console.log(`⚠️ SKU ${sku.sku_code} 库存数据不准确，正在修复...`);
        
        await prisma.product_sku.update({
          where: { id: sku.id },
          data: {
            available_quantity: Math.max(0, expectedAvailable)
          }
        });
      }
    }
    
    console.log('\n✅ 数据清理完成！');
    console.log('\n📊 清理后的数据统计：');
    
    const finalStats = {
      customers: await prisma.customer.count(),
      purchases: await prisma.purchase.count(),
      skus: await prisma.product_sku.count(),
      customerPurchases: await prisma.customer_purchase.count(),
      financialRecords: await prisma.financial_record.count()
    };
    
    console.table(finalStats);
    
  } catch (error) {
    console.error('❌ 清理数据时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 直接运行脚本
cleanFakeData();

export { cleanFakeData };