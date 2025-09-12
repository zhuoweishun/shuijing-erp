import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixRealSkuCosts() {
  try {
    console.log('=== 修复SKU真实成本数据 ===\n');
    
    // 检查当前问题
    console.log('🔍 问题分析:');
    console.log('1. 当前SKU成本数据是假数据（售价的60%）');
    console.log('2. 没有对应的产品制作记录（Product表为空）');
    console.log('3. 没有真实的原材料使用记录（MaterialUsage表为空）');
    console.log('4. 客户分析API使用的是这些假成本数据\n');
    
    const skus = await prisma.product_sku.find_many({
      include: {
        customerPurchases: {
          where: {
            status: 'ACTIVE' // 只统计正常销售
          }
        }
      }
    });
    
    console.log('📊 当前SKU成本数据分析:');
    for (const sku of skus) {
      const selling_price = parseFloat(sku.selling_price);
      const currentTotalCost = parseFloat(sku.total_cost || 0);
      const expectedFakeCost = sellingPrice * 0.6;
      const isFakeData = Math.abs(currentTotalCost - expectedFakeCost) < 0.01;
      
      console.log(`\nSKU: ${sku.sku_code} - ${sku.sku_name}`);
      console.log(`  销售价格: ${ selling_price }`);
      console.log(`  当前总成本: ${currentTotalCost}`);
      console.log(`  预期假成本(60%): ${expectedFakeCost.to_fixed(2)}`);
      console.log(`  是否为假数据: ${isFakeData ? '✅ 是' : '❌ 否'}`);
      console.log(`  销售记录数: ${sku.customerPurchases.length}`);
      
      if (isFakeData) {
        console.log(`  ⚠️  警告: 该SKU使用假成本数据，影响利润率计算准确性`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔧 解决方案建议:');
    console.log('\n方案1: 重新录入真实制作数据');
    console.log('  - 为每个SKU重新录入真实的制作记录');
    console.log('  - 包括实际使用的原材料、人工成本、工艺成本');
    console.log('  - 系统会自动计算真实的成本数据');
    
    console.log('\n方案2: 手动设置真实成本');
    console.log('  - 直接在数据库中更新SKU的真实成本数据');
    console.log('  - 需要您提供每个SKU的真实原材料、人工、工艺成本');
    
    console.log('\n方案3: 基于历史数据估算');
    console.log('  - 如果有其他渠道的成本数据，可以导入更新');
    console.log('  - 或者基于行业经验设置合理的成本比例');
    
    console.log('\n❗ 重要提醒:');
    console.log('  当前客户分析API显示的毛利率99.88%是错误的');
    console.log('  实际毛利率应该基于真实成本计算');
    console.log('  建议优先采用方案1，确保数据的真实性和可追溯性');
    
  } catch (error) {
    console.error('修复SKU成本数据时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRealSkuCosts();