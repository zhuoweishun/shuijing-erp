// 检查采购记录的规格字段数据
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSpecFields() {
  try {
    console.log('🔍 检查采购记录的规格字段数据...');
    
    // 获取所有采购记录
    const purchases = await prisma.purchase.find_many({
      orderBy: { created_at: 'desc' },
      take: 20
    });
    
    console.log(`\n📋 找到 ${purchases.length} 条采购记录:\n`);
    
    purchases.for_each(purchase => {
      console.log(`  ${purchase.id}: ${purchase.product_name} (${purchase.product_type})`);
      console.log(`    specification: ${purchase.specification}`);
      console.log(`    bead_diameter: ${purchase.bead_diameter}`);
      console.log(`    quantity: ${purchase.quantity}`);
      console.log(`    piece_count: ${purchase.piece_count}`);
      console.log(`    weight: ${purchase.weight}`);
      console.log(`    status: ${purchase.status}`);
      console.log('');
    });
    
    // 按产品类型统计规格字段使用情况
    console.log('📊 按产品类型统计规格字段使用情况:');
    
    const product_types = ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED'];
    
    for (const type of product_types) {
      const records = purchases.filter(p => p.product_type === type);
      const withSpec = records.filter(p => p.specification !== null);
      const withBeadDiameter = records.filter(p => p.bead_diameter !== null);
      const withQuantity = records.filter(p => p.quantity !== null);
      const withPieceCount = records.filter(p => p.piece_count !== null);
      
      console.log(`\n  ${type}: ${records.length} 条记录`);
      console.log(`    有specification: ${withSpec.length} 条`);
      console.log(`    有beadDiameter: ${withBeadDiameter.length} 条`);
      console.log(`    有quantity: ${withQuantity.length} 条`);
      console.log(`    有pieceCount: ${withPieceCount.length} 条`);
      
      if (withSpec.length > 0) {
        console.log(`    specification示例: ${withSpec[0].specification}`);
      }
      if (withBeadDiameter.length > 0) {
        console.log(`    beadDiameter示例: ${withBeadDiameter[0].bead_diameter}`);
      }
    }
    
    // 检查规格字段的完整性
    console.log('\n⚠️  规格字段问题分析:');
    
    const looseBeads = purchases.filter(p => p.product_type === 'LOOSE_BEADS');
    const bracelets = purchases.filter(p => p.product_type === 'BRACELET');
    const accessories = purchases.filter(p => p.product_type === 'ACCESSORIES');
    const finished = purchases.filter(p => p.product_type === 'FINISHED');
    
    console.log(`\n  散珠(LOOSE_BEADS): ${looseBeads.length} 条记录`);
    const looseBeadsNoSpec = looseBeads.filter(p => !p.specification && !p.bead_diameter);
    console.log(`    无规格信息: ${looseBeadsNoSpec.length} 条`);
    
    console.log(`\n  手串(BRACELET): ${bracelets.length} 条记录`);
    const braceletsNoSpec = bracelets.filter(p => !p.specification && !p.bead_diameter);
    console.log(`    无规格信息: ${braceletsNoSpec.length} 条`);
    
    console.log(`\n  配件(ACCESSORIES): ${accessories.length} 条记录`);
    const accessoriesNoSpec = accessories.filter(p => !p.specification);
    console.log(`    无规格信息: ${accessoriesNoSpec.length} 条`);
    
    console.log(`\n  成品(FINISHED): ${finished.length} 条记录`);
    const finishedNoSpec = finished.filter(p => !p.specification);
    console.log(`    无规格信息: ${finishedNoSpec.length} 条`);
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecFields();