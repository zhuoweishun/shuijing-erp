import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllBusinessData() {
  try {
    console.log('开始清理所有业务数据...');
    
    console.log('\n=== 清理业务数据表 ===');
    
    // 按依赖关系顺序清理数据
    let totalCleared = 0;
    
    // 1. 清理客户备注
    try {
      const customerNoteCount = await prisma.customer_note.count();
      await prisma.customer_note.delete_many({});
      console.log(`✓ Customer_note: 清除 ${customerNoteCount} 条记录`);
      totalCleared += customerNoteCount;
    } catch (error) {
      console.error(`✗ Customer_note: 清理失败 - ${error.message}`);
    }
    
    // 2. 清理客户购买记录
    try {
      const customerPurchaseCount = await prisma.customer_purchase.count();
      await prisma.customer_purchase.delete_many({});
      console.log(`✓ Customer_purchase: 清除 ${customerPurchaseCount} 条记录`);
      totalCleared += customerPurchaseCount;
    } catch (error) {
      console.error(`✗ Customer_purchase: 清理失败 - ${error.message}`);
    }
    
    // 3. 清理SKU库存日志
    try {
      const skuInventoryLogCount = await prisma.sku_inventory_log.count();
      await prisma.sku_inventory_log.delete_many({});
      console.log(`✓ Sku_inventory_log: 清除 ${skuInventoryLogCount} 条记录`);
      totalCleared += skuInventoryLogCount;
    } catch (error) {
      console.error(`✗ Sku_inventory_log: 清理失败 - ${error.message}`);
    }
    
    // 4. 清理原材料使用记录
    try {
      const materialUsageCount = await prisma.material_usage.count();
      await prisma.material_usage.delete_many({});
      console.log(`✓ Material_usage: 清除 ${materialUsageCount} 条记录`);
      totalCleared += materialUsageCount;
    } catch (error) {
      console.error(`✗ Material_usage: 清理失败 - ${error.message}`);
    }
    
    // 5. 清理财务记录
    try {
      const financialRecordCount = await prisma.financial_record.count();
      await prisma.financial_record.delete_many({});
      console.log(`✓ Financial_record: 清除 ${financialRecordCount} 条记录`);
      totalCleared += financialRecordCount;
    } catch (error) {
      console.error(`✗ Financial_record: 清理失败 - ${error.message}`);
    }
    
    // 6. 清理SKU记录
    try {
      const productSkuCount = await prisma.product_sku.count();
      await prisma.product_sku.delete_many({});
      console.log(`✓ Product_sku: 清除 ${productSkuCount} 条记录`);
      totalCleared += productSkuCount;
    } catch (error) {
      console.error(`✗ Product_sku: 清理失败 - ${error.message}`);
    }
    
    // 7. 清理成品记录
    try {
      const productCount = await prisma.product.count();
      await prisma.product.delete_many({});
      console.log(`✓ Product: 清除 ${productCount} 条记录`);
      totalCleared += productCount;
    } catch (error) {
      console.error(`✗ Product: 清理失败 - ${error.message}`);
    }
    
    // 8. 清理采购记录
    try {
      const purchase_count = await prisma.purchase.count();
      await prisma.purchase.delete_many({});
      console.log(`✓ Purchase: 清除 ${ purchase_count } 条记录`);
      totalCleared += purchaseCount;
    } catch (error) {
      console.error(`✗ Purchase: 清理失败 - ${error.message}`);
    }
    
    // 9. 清理客户信息
    try {
      const customerCount = await prisma.customer.count();
      await prisma.customer.delete_many({});
      console.log(`✓ Customer: 清除 ${customerCount} 条记录`);
      totalCleared += customerCount;
    } catch (error) {
      console.error(`✗ Customer: 清理失败 - ${error.message}`);
    }
    
    // 10. 清理操作日志
    try {
      const auditLogCount = await prisma.audit_log.count();
      await prisma.audit_log.delete_many({});
      console.log(`✓ Audit_log: 清除 ${auditLogCount} 条记录`);
      totalCleared += auditLogCount;
    } catch (error) {
      console.error(`✗ Audit_log: 清理失败 - ${error.message}`);
    }
    
    console.log('\n=== 验证清理结果 ===');
    
    // 验证清理结果
    const verificationResults = [];
    
    try {
      const customerNoteCount = await prisma.customer_note.count();
      verificationResults.push({ table: 'CustomerNote', count: customerNoteCount });
    } catch (error) {
      console.error(`✗ Customer_note: 验证失败 - ${error.message}`);
    }
    
    try {
      const customerPurchaseCount = await prisma.customer_purchase.count();
      verificationResults.push({ table: 'CustomerPurchase', count: customerPurchaseCount });
    } catch (error) {
      console.error(`✗ Customer_purchase: 验证失败 - ${error.message}`);
    }
    
    try {
      const skuInventoryLogCount = await prisma.sku_inventory_log.count();
      verificationResults.push({ table: 'SkuInventoryLog', count: skuInventoryLogCount });
    } catch (error) {
      console.error(`✗ Sku_inventory_log: 验证失败 - ${error.message}`);
    }
    
    try {
      const materialUsageCount = await prisma.material_usage.count();
      verificationResults.push({ table: 'MaterialUsage', count: materialUsageCount });
    } catch (error) {
      console.error(`✗ Material_usage: 验证失败 - ${error.message}`);
    }
    
    try {
      const financialRecordCount = await prisma.financial_record.count();
      verificationResults.push({ table: 'FinancialRecord', count: financialRecordCount });
    } catch (error) {
      console.error(`✗ Financial_record: 验证失败 - ${error.message}`);
    }
    
    try {
      const productSkuCount = await prisma.product_sku.count();
      verificationResults.push({ table: 'ProductSku', count: productSkuCount });
    } catch (error) {
      console.error(`✗ Product_sku: 验证失败 - ${error.message}`);
    }
    
    try {
      const productCount = await prisma.product.count();
      verificationResults.push({ table: 'Product', count: productCount });
    } catch (error) {
      console.error(`✗ Product: 验证失败 - ${error.message}`);
    }
    
    try {
      const purchase_count = await prisma.purchase.count();
      verificationResults.push({ table: 'Purchase', count: purchaseCount });
    } catch (error) {
      console.error(`✗ Purchase: 验证失败 - ${error.message}`);
    }
    
    try {
      const customerCount = await prisma.customer.count();
      verificationResults.push({ table: 'Customer', count: customerCount });
    } catch (error) {
      console.error(`✗ Customer: 验证失败 - ${error.message}`);
    }
    
    try {
      const auditLogCount = await prisma.audit_log.count();
      verificationResults.push({ table: 'AuditLog', count: auditLogCount });
    } catch (error) {
      console.error(`✗ Audit_log: 验证失败 - ${error.message}`);
    }
    
    // 显示验证结果
    let remainingRecords = 0;
    for (const result of verificationResults) {
      remainingRecords += result.count;
      if (result.count === 0) {
        console.log(`✓ ${result.table}: 0 条记录`);
      } else {
        console.log(`⚠ ${result.table}: 仍有 ${result.count} 条记录`);
      }
    }
    
    console.log('\n=== 保留的基础数据检查 ===');
    
    // 检查保留的基础数据
    try {
      const userCount = await prisma.user.count();
      console.log(`✓ User: 保留 ${userCount} 条记录`);
    } catch (error) {
      console.error(`✗ User: 检查失败 - ${error.message}`);
    }
    
    try {
      const supplierCount = await prisma.supplier.count();
      console.log(`✓ Supplier: 保留 ${supplierCount} 条记录`);
    } catch (error) {
      console.error(`✗ Supplier: 检查失败 - ${error.message}`);
    }
    
    console.log('\n=== 清理完成报告 ===');
    console.log(`总计清除业务数据记录数: ${totalCleared}`);
    console.log(`验证后剩余记录数: ${remainingRecords}`);
    console.log('基础数据（用户、供应商）已保留');
    
    if (remainingRecords === 0) {
      console.log('\n🎉 数据库清理完成！可以开始重新录入数据。');
      console.log('\n📝 注意事项：');
      console.log('- 自增ID已通过Prisma自动管理');
      console.log('- 可以开始按照依赖树流程重新录入数据');
      console.log('- 建议从采购录入开始，逐步测试各个功能模块');
    } else {
      console.log('\n⚠️  部分数据未能完全清除，请检查上述错误信息。');
    }
    
  } catch (error) {
    console.error('清理过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行清理
clearAllBusinessData()
  .then(() => {
    console.log('\n清理脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('清理脚本执行失败:', error);
    process.exit(1);
  });

export default clearAllBusinessData;