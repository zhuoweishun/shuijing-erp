import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixBraceletPieceCount() {
  try {
    console.log('🔧 修复手串类型采购记录的pieceCount字段...');
    
    // 1. 查找所有手串类型且pieceCount为null但totalBeads有值的记录
    const braceletPurchases = await prisma.purchase.find_many({
      where: {
        product_type: 'BRACELET',
        piece_count: null,
        total_beads: {
          not: null
        }
      },
      select: {
        id: true,
        purchase_code: true,
        product_name: true,
        total_beads: true,
        piece_count: true,
        quantity: true
      }
    });
    
    console.log(`找到 ${braceletPurchases.length} 个需要修复的手串采购记录:`);
    
    for (const purchase of braceletPurchases) {
      console.log(`- ${purchase.purchase_code}: ${purchase.product_name}, total_beads: ${purchase.total_beads}`);
    }
    
    // 2. 修复CG20250910578226
    const targetPurchase = braceletPurchases.find(p => p.purchase_code === 'CG20250910578226');
    
    if (targetPurchase) {
      console.log('\n🎯 修复目标采购单 CG20250910578226...');
      
      const updatedPurchase = await prisma.purchase.update({
        where: { id: targetPurchase.id },
        data: {
          piece_count: targetPurchase.total_beads // 将totalBeads的值赋给pieceCount
        }
      });
      
      console.log('✅ 修复完成:');
      console.log('- 采购编号:', updatedPurchase.purchase_code);
      console.log('- 产品名称:', updatedPurchase.product_name);
      console.log('- 总颗数:', updatedPurchase.total_beads);
      console.log('- 颗数/片数/件数:', updatedPurchase.piece_count);
      
      // 3. 验证库存查询
      console.log('\n🔍 验证修复后的库存查询...');
      
      const inventoryQuery = `
        SELECT 
          p.purchase_code,
          p.product_name,
          p.product_type,
          p.total_beads,
          p.piece_count,
          CASE 
            WHEN p.product_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
            WHEN p.product_type = 'BRACELET' THEN COALESCE(p.total_beads, p.piece_count, 0)
            WHEN p.product_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
            WHEN p.product_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
            ELSE COALESCE(p.quantity, 0)
          END as calculated_quantity
        FROM purchases p
        WHERE p.purchase_code = ?
      `;
      
      const result = await prisma.$queryRawUnsafe(inventoryQuery, 'CG20250910578226');
      console.log('✅ 库存查询结果:', result);
      
    } else {
      console.log('❌ 未找到目标采购单 CG20250910578226');
    }
    
    // 4. 批量修复所有手串记录（可选）
    console.log('\n🔧 是否需要批量修复所有手串记录？');
    console.log('发现的其他需要修复的记录:');
    
    const otherPurchases = braceletPurchases.filter(p => p.purchase_code !== 'CG20250910578226');
    for (const purchase of otherPurchases) {
      console.log(`- ${purchase.purchase_code}: ${purchase.product_name}`);
    }
    
    if (otherPurchases.length > 0) {
      console.log('\n批量修复其他手串记录...');
      
      for (const purchase of otherPurchases) {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            piece_count: purchase.total_beads
          }
        });
        console.log(`✅ 已修复: ${purchase.purchase_code}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBraceletPieceCount();