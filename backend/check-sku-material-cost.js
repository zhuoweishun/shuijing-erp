/**
 * 检查SKU记录的materialCost字段值
 * 用于调试材料成本显示问题
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSkuMaterialCost() {
  try {
    console.log('🔍 检查SKU记录的materialCost字段值...');
    
    // 获取所有SKU记录
    const skus = await prisma.productSku.findMany({
      select: {
        id: true,
        skuCode: true,
        skuName: true,
        materialCost: true,
        laborCost: true,
        craftCost: true,
        totalCost: true,
        sellingPrice: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\n📊 找到 ${skus.length} 个SKU记录：`);
    console.log('=' .repeat(120));
    console.log('SKU编号\t\t\tSKU名称\t\t\t材料成本\t人工成本\t工艺成本\t总成本\t\t销售价格\t创建时间');
    console.log('=' .repeat(120));
    
    let nullMaterialCostCount = 0;
    let zeroMaterialCostCount = 0;
    let validMaterialCostCount = 0;
    
    skus.forEach(sku => {
      const materialCost = sku.materialCost;
      const laborCost = sku.laborCost || 0;
      const craftCost = sku.craftCost || 0;
      const totalCost = sku.totalCost || 0;
      const sellingPrice = sku.sellingPrice || 0;
      
      // 统计材料成本状态
      if (materialCost === null || materialCost === undefined) {
        nullMaterialCostCount++;
      } else if (materialCost === 0) {
        zeroMaterialCostCount++;
      } else {
        validMaterialCostCount++;
      }
      
      const materialCostStr = materialCost === null ? 'NULL' : `¥${materialCost.toFixed(2)}`;
      const laborCostStr = `¥${laborCost.toFixed(2)}`;
      const craftCostStr = `¥${craftCost.toFixed(2)}`;
      const totalCostStr = `¥${totalCost.toFixed(2)}`;
      const sellingPriceStr = `¥${sellingPrice.toFixed(2)}`;
      const createdAtStr = sku.createdAt.toISOString().slice(0, 10);
      
      console.log(`${sku.skuCode}\t${sku.skuName.padEnd(20)}\t${materialCostStr}\t\t${laborCostStr}\t\t${craftCostStr}\t\t${totalCostStr}\t\t${sellingPriceStr}\t\t${createdAtStr}`);
    });
    
    console.log('=' .repeat(120));
    console.log('\n📈 统计结果：');
    console.log(`- 材料成本为NULL的SKU: ${nullMaterialCostCount} 个`);
    console.log(`- 材料成本为0的SKU: ${zeroMaterialCostCount} 个`);
    console.log(`- 材料成本有效值的SKU: ${validMaterialCostCount} 个`);
    
    // 检查最近创建的SKU（可能是用户刚录入的）
    if (skus.length > 0) {
      console.log('\n🔍 最近创建的3个SKU详细信息：');
      const recentSkus = skus.slice(0, 3);
      
      for (const sku of recentSkus) {
        console.log(`\n📦 SKU: ${sku.skuCode} - ${sku.skuName}`);
        console.log(`   材料成本: ${sku.materialCost === null ? 'NULL' : `¥${sku.materialCost}`}`);
        console.log(`   人工成本: ¥${sku.laborCost || 0}`);
        console.log(`   工艺成本: ¥${sku.craftCost || 0}`);
        console.log(`   总成本: ¥${sku.totalCost || 0}`);
        console.log(`   销售价格: ¥${sku.sellingPrice}`);
        console.log(`   创建时间: ${sku.createdAt.toISOString()}`);
        
        // 查找关联的成品和原材料使用记录
        const products = await prisma.product.findMany({
          where: { skuId: sku.id },
          include: {
            materialUsages: {
              include: {
                purchase: {
                  select: {
                    id: true,
                    productName: true,
                    productType: true,
                    pricePerBead: true,
                    pricePerPiece: true,
                    totalPrice: true
                  }
                }
              }
            }
          }
        });
        
        console.log(`   关联成品数量: ${products.length}`);
        
        if (products.length > 0) {
          const product = products[0];
          console.log(`   原材料使用记录: ${product.materialUsages.length} 条`);
          
          product.materialUsages.forEach((usage, index) => {
            const purchase = usage.purchase;
            console.log(`     ${index + 1}. 原材料: ${purchase.productName} (${purchase.productType})`);
            console.log(`        使用颗数: ${usage.quantityUsedBeads || 0}`);
            console.log(`        使用件数: ${usage.quantityUsedPieces || 0}`);
            console.log(`        每颗价格: ¥${purchase.pricePerBead || 0}`);
            console.log(`        每件价格: ¥${purchase.pricePerPiece || 0}`);
            console.log(`        总价: ¥${purchase.totalPrice || 0}`);
            
            // 计算应该的材料成本
            let expectedMaterialCost = 0;
            if (usage.quantityUsedBeads > 0 && purchase.pricePerBead) {
              expectedMaterialCost += usage.quantityUsedBeads * purchase.pricePerBead;
            }
            if (usage.quantityUsedPieces > 0 && purchase.pricePerPiece) {
              expectedMaterialCost += usage.quantityUsedPieces * purchase.pricePerPiece;
            }
            console.log(`        计算的材料成本: ¥${expectedMaterialCost.toFixed(2)}`);
          });
        }
      }
    }
    
    console.log('\n✅ SKU materialCost字段检查完成');
    
  } catch (error) {
    console.error('❌ 检查SKU materialCost字段时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSkuMaterialCost();