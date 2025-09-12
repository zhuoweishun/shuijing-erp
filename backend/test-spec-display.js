// 测试财务流水账规格显示修复效果
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testSpecDisplay() {
  try {
    console.log('🧪 测试财务流水账规格显示修复效果...');
    
    // 获取不同产品类型的采购记录
    const purchases = await prisma.purchase.find_many({
      orderBy: { created_at: 'desc' },
      take: 20
    });
    
    console.log(`\n📋 测试 ${purchases.length} 条采购记录的规格显示:\n`);
    
    let specDisplayCount = 0;
    
    purchases.for_each(purchase => {
      // 模拟财务API的规格显示逻辑
      let specificationDisplay = '无';
      
      switch (purchase.product_type) {
        case 'LOOSE_BEADS':
        case 'BRACELET':
          // 散珠和手串使用beadDiameter字段
          if (purchase.bead_diameter) {
            specificationDisplay = `直径: ${purchase.bead_diameter}mm`;
          }
          break;
        case 'ACCESSORIES':
          // 配件使用specification字段
          if (purchase.specification) {
            specificationDisplay = `规格: ${purchase.specification}mm`;
          }
          break;
        case 'FINISHED':
          // 成品使用specification字段
          if (purchase.specification) {
            specificationDisplay = `尺寸: ${purchase.specification}mm`;
          }
          break;
        default:
          // 其他类型优先使用specification，其次使用beadDiameter
          if (purchase.specification) {
            specificationDisplay = `规格: ${purchase.specification}mm`;
          } else if (purchase.bead_diameter) {
            specificationDisplay = `直径: ${purchase.bead_diameter}mm`;
          }
          break;
      }
      
      if (specificationDisplay !== '无') {
        specDisplayCount++;
      }
      
      console.log(`  ${purchase.product_name} (${purchase.product_type})`);
      console.log(`    规格显示: ${specificationDisplay}`);
      console.log(`    原始数据: specification=${purchase.specification}, bead_diameter=${purchase.bead_diameter}`);
      console.log('');
    });
    
    // 统计规格显示情况
    console.log('📊 规格显示统计:');
    console.log(`  总记录数: ${purchases.length}`);
    console.log(`  有规格显示: ${specDisplayCount} 条`);
    console.log(`  规格显示率: ${((specDisplayCount / purchases.length) * 100).to_fixed(1)}%`);
    
    // 按产品类型统计
    const product_types = ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED'];
    
    console.log('\n📈 按产品类型统计规格显示:');
    
    for (const type of product_types) {
      const typeRecords = purchases.filter(p => p.product_type === type);
      let typeSpecCount = 0;
      
      typeRecords.for_each(purchase => {
        let hasSpec = false;
        switch (purchase.product_type) {
          case 'LOOSE_BEADS':
          case 'BRACELET':
            hasSpec = !!purchase.bead_diameter;
            break;
          case 'ACCESSORIES':
          case 'FINISHED':
            hasSpec = !!purchase.specification;
            break;
        }
        if (hasSpec) typeSpecCount++;
      });
      
      if (typeRecords.length > 0) {
        console.log(`  ${type}: ${typeSpecCount}/${typeRecords.length} (${((typeSpecCount / typeRecords.length) * 100).to_fixed(1)}%)`);
      }
    }
    
    console.log('\n✅ 规格显示测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSpecDisplay();