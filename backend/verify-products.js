import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyProducts() {
  try {
    console.log('=== 成品数据验证报告 ===\n');
    
    // 1. 查询所有成品记录
    const products = await prisma.product.findMany({
      include: {
        materialUsages: {
          include: {
            purchase: {
              include: {
                supplier: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 成品总数: ${products.length}`);
    
    if (products.length === 0) {
      console.log('❌ 数据库中没有找到任何成品记录');
      return;
    }
    
    // 2. 验证成品信息
    console.log('\n=== 成品列表 ===');
    products.forEach((product, index) => {
      console.log(`${index + 1}. 成品编号: ${product.productCode || '未设置'}`);
      console.log(`   名称: ${product.name}`);
      console.log(`   规格: ${product.specification}`);
      console.log(`   数量: ${product.quantity}`);
      console.log(`   创建时间: ${product.createdAt.toLocaleString('zh-CN')}`);
      console.log(`   溯源记录数: ${product.materialUsages.length}`);
      console.log('---');
    });
    
    // 3. 验证溯源记录完整性
    console.log('\n=== 溯源记录验证 ===');
    let totalUsageRecords = 0;
    let productsWithTraceability = 0;
    let productsWithoutTraceability = 0;
    
    products.forEach((product, index) => {
      const usageCount = product.materialUsages.length;
      totalUsageRecords += usageCount;
      
      if (usageCount > 0) {
        productsWithTraceability++;
        console.log(`✅ 成品 ${index + 1} (${product.productCode || product.name}): ${usageCount} 条溯源记录`);
        
        // 显示详细溯源信息
        product.materialUsages.forEach((usage, usageIndex) => {
          console.log(`   溯源 ${usageIndex + 1}: 采购ID ${usage.purchaseId}`);
          console.log(`   使用珠子: ${usage.quantityUsedBeads || 0}`);
          console.log(`   使用片数: ${usage.quantityUsedPieces || 0}`);
          if (usage.purchase) {
            console.log(`   原材料: ${usage.purchase.materialName}`);
            console.log(`   供应商: ${usage.purchase.supplier?.name || '未知'}`);
          }
          console.log('   ---');
        });
      } else {
        productsWithoutTraceability++;
        console.log(`❌ 成品 ${index + 1} (${product.productCode || product.name}): 无溯源记录`);
      }
    });
    
    // 4. 统计分析
    console.log('\n=== 统计分析 ===');
    console.log(`📈 成品总数: ${products.length}`);
    console.log(`✅ 有溯源记录的成品: ${productsWithTraceability}`);
    console.log(`❌ 无溯源记录的成品: ${productsWithoutTraceability}`);
    console.log(`📋 溯源记录总数: ${totalUsageRecords}`);
    console.log(`📊 平均每个成品溯源记录数: ${(totalUsageRecords / products.length).toFixed(2)}`);
    
    // 5. 数据完整性检查
    console.log('\n=== 数据完整性检查 ===');
    
    // 检查成品编号
    const productsWithoutCode = products.filter(p => !p.productCode);
    if (productsWithoutCode.length > 0) {
      console.log(`⚠️  ${productsWithoutCode.length} 个成品缺少产品编号`);
    } else {
      console.log('✅ 所有成品都有产品编号');
    }
    
    // 检查重复编号
    const productCodes = products.map(p => p.productCode).filter(Boolean);
    const uniqueCodes = new Set(productCodes);
    if (productCodes.length !== uniqueCodes.size) {
      console.log('⚠️  存在重复的产品编号');
    } else {
      console.log('✅ 产品编号唯一性检查通过');
    }
    
    // 6. 验证用户期望的17个成品
    console.log('\n=== 用户期望验证 ===');
    if (products.length >= 17) {
      console.log(`✅ 数据库中有 ${products.length} 个成品，满足用户期望的17个成品`);
    } else {
      console.log(`❌ 数据库中只有 ${products.length} 个成品，少于用户期望的17个`);
    }
    
    // 7. 最近创建的成品
    console.log('\n=== 最近创建的成品 ===');
    const recentProducts = products.slice(0, Math.min(5, products.length));
    recentProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.productCode || product.name} - ${product.createdAt.toLocaleString('zh-CN')}`);
    });
    
    console.log('\n=== 验证完成 ===');
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行验证
verifyProducts();