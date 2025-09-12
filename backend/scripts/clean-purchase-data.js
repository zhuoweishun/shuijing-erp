import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanPurchaseData() {
  console.log('🧹 开始清理采购记录中的虚假数据...');
  
  try {
    // 1. 检查所有采购记录
    console.log('\n📋 检查采购记录...');
    
    const allPurchases = await prisma.purchase.find_many({
      include: {
        supplier: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    console.log(`总共有 ${allPurchases.length} 条采购记录`);
    
    // 2. 识别虚假数据模式
    const fakePatterns = [
      // 测试前缀
      { pattern: /^test_/i, description: 'test_前缀' },
      { pattern: /^Test/, description: 'Test前缀' },
      { pattern: /^TEST/, description: 'TEST前缀' },
      { pattern: /^demo_/i, description: 'demo_前缀' },
      { pattern: /^Demo/, description: 'Demo前缀' },
      
      // 明显的测试数据
      { pattern: /测试/, description: '包含"测试"' },
      { pattern: /test/i, description: '包含"test"' },
      { pattern: /demo/i, description: '包含"demo"' },
      { pattern: /假数据/i, description: '包含"假数据"' },
      { pattern: /虚假/i, description: '包含"虚假"' },
      
      // 重复或异常的产品名称
      { pattern: /^产品\d+$/, description: '通用产品名称' },
      { pattern: /^商品\d+$/, description: '通用商品名称' },
      { pattern: /^item\d+$/i, description: '通用item名称' },
      { pattern: /^product\d+$/i, description: '通用product名称' },
      
      // 异常的价格模式（如整数价格，可能是测试数据）
      { pattern: /^\d+\.0+$/, description: '整数价格（可能是测试）' }
    ];
    
    const suspiciousPurchases = [];
    
    for (const purchase of allPurchases) {
      const reasons = [];
      
      // 检查产品名称
      for (const { pattern, description } of fakePatterns) {
        if (pattern.test(purchase.product_name)) {
          reasons.push(`产品名称${description}`);
        }
      }
      
      // 检查异常的数量（如过大的数量可能是测试）
      if (purchase.quantity && purchase.quantity > 10000) {
        reasons.push('数量异常过大');
      }
      
      // 检查异常的价格（如过高或过低的价格）
      if (purchase.total_price) {
        const price = Number(purchase.total_price);
        if (price > 1000000) {
          reasons.push('价格异常过高');
        }
        if (price === 0) {
          reasons.push('价格为零');
        }
      }
      
      // 检查创建时间（如批量创建的可能是测试数据）
      const createdDate = new Date(purchase.created_at);
      const now = new Date();
      const daysDiff = (now.get_time() - createdDate.get_time()) / (1000 * 60 * 60 * 24);
      
      // 检查是否是未来日期（明显错误）
      if (createdDate > now) {
        reasons.push('创建时间在未来');
      }
      
      // 检查采购日期是否异常
      if (purchase.purchase_date) {const purchase_date = new Date(purchase.purchase_date);
        if (purchase_date > now) {
          reasons.push('采购日期在未来');
        }
        
        // 检查是否是明显的测试日期（如2025年9月8日）
        if (purchaseDate.get_full_year() === 2025 && 
            purchaseDate.get_month() === 8 && 
            purchaseDate.get_date() === 8) {
          reasons.push('疑似测试日期(2025-09-08)');
        }
      }
      
      if (reasons.length > 0) {
        suspiciousPurchases.push({
          id: purchase.id,
          purchase_code: purchase.purchase_code,
          product_name: purchase.product_name,
          quantity: purchase.quantity,
          total_price: purchase.total_price,
          created_at: purchase.created_at,
          purchase_date: purchase.purchase_date,
          supplier: purchase.supplier?.name || '无供应商',
          reasons
        });
      }
    }
    
    console.log(`\n🔍 发现 ${suspiciousPurchases.length} 条可疑的采购记录:`);
    
    // 显示可疑记录
    suspiciousPurchases.for_each((purchase, index) => {
      console.log(`\n${index + 1}. ${purchase.purchase_code} - ${purchase.product_name}`);
      console.log(`   供应商: ${purchase.supplier}`);
      console.log(`   数量: ${purchase.quantity}, 总价: ${purchase.total_price}`);
      console.log(`   创建时间: ${purchase.created_at}`);
      console.log(`   可疑原因: ${purchase.reasons.join(', ')}`);
    });
    
    // 3. 自动删除明显的测试数据
    console.log('\n🗑️ 开始自动清理明显的测试数据...');
    
    const autoDeletePatterns = [
      /^test_/i,
      /^Test/,
      /^TEST/,
      /^demo_/i,
      /^Demo/,
      /测试/,
      /假数据/i,
      /虚假/i
    ];
    
    const autoDeleteIds = suspiciousPurchases
      .filter(purchase => 
        autoDeletePatterns.some(pattern => pattern.test(purchase.product_name))
      )
      .map(purchase => purchase.id);
    
    if (autoDeleteIds.length > 0) {
      console.log(`准备自动删除 ${autoDeleteIds.length} 条明显的测试数据...`);
      
      // 先删除相关的material_usage记录
      const deletedUsage = await prisma.material_usage.delete_many({
        where: {
          purchase_id: { in: autoDeleteIds }
        }
      });
      console.log(`✅ 删除了 ${deletedUsage.count} 条相关的原材料使用记录`);
      
      // 删除相关的materials记录
      const deletedMaterials = await prisma.material.delete_many({
        where: {
          purchase_id: { in: autoDeleteIds }
        }
      });
      console.log(`✅ 删除了 ${deletedMaterials.count} 条相关的原材料记录`);
      
      // 删除相关的edit_logs记录
      const deletedLogs = await prisma.edit_log.delete_many({
        where: {
          purchase_id: { in: autoDeleteIds }
        }
      });
      console.log(`✅ 删除了 ${deletedLogs.count} 条相关的编辑日志`);
      
      // 最后删除采购记录
      const deletedPurchases = await prisma.purchase.delete_many({
        where: {
          id: { in: autoDeleteIds }
        }
      });
      console.log(`✅ 删除了 ${deletedPurchases.count} 条测试采购记录`);
    }
    
    // 4. 检查重复的采购记录
    console.log('\n🔍 检查重复的采购记录...');
    
    const duplicateQuery = `
      SELECT product_name, bead_diameter, quality, supplierId, COUNT(*) as count
      FROM purchases 
      WHERE product_name IS NOT NULL
      GROUP BY product_name, bead_diameter, quality, supplierId
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;
    
    const duplicates = await prisma.$queryRawUnsafe(duplicateQuery); // any[]
    
    if (duplicates.length > 0) {
      console.log(`发现 ${duplicates.length} 组重复的采购记录:`);
      duplicates.for_each((dup, index) => {
        console.log(`${index + 1}. ${dup.product_name} (${dup.bead_diameter}mm, ${dup.quality}级) - ${dup.count} 条记录`);
      });
    } else {
      console.log('✅ 没有发现重复的采购记录');
    }
    
    // 5. 最终统计
    console.log('\n📊 清理后的数据统计:');
    
    const finalStats = {
      总采购记录: await prisma.purchase.count(),
      活跃采购记录: await prisma.purchase.count({ where: { status: 'ACTIVE' } }),
      已使用采购记录: await prisma.purchase.count({ where: { status: 'USED' } }),
      原材料记录: await prisma.material.count(),
      原材料使用记录: await prisma.material_usage.count(),
      编辑日志: await prisma.edit_log.count()
    };
    
    console.table(finalStats);
    
    console.log('\n✅ 采购数据清理完成！');
    
    // 6. 建议手动检查的记录
    const manualCheckIds = suspiciousPurchases
      .filter(purchase => 
        !autoDeletePatterns.some(pattern => pattern.test(purchase.product_name))
      )
      .map(purchase => purchase.id);
    
    if (manualCheckIds.length > 0) {
      console.log(`\n⚠️ 建议手动检查以下 ${manualCheckIds.length} 条记录:`);
      const manualCheckRecords = suspiciousPurchases.filter(p => manualCheckIds.includes(p.id));
      manualCheckRecords.for_each((purchase, index) => {
        console.log(`${index + 1}. ID: ${purchase.id} - ${purchase.product_name} (${purchase.reasons.join(', ')})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 清理采购数据时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 直接运行脚本
cleanPurchaseData();

export { cleanPurchaseData };