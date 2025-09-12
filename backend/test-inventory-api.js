import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testInventoryAPI() {try {
    console.log('🔍 测试库存API...');
    
    // 1. 测试层级式库存查询API的SQL
    console.log('\n1. 测试层级式库存查询SQL...');
    
    const inventoryQuery = `
      SELECT 
        p.id as purchase_id,
        p.purchase_code as purchase_code,
        p.product_name as product_name,
        p.product_type as product_type,
        p.unit_type as unit_type,
        p.bead_diameter as bead_diameter,
        p.specification,
        p.quality,
        p.photos,
        CASE 
          WHEN p.product_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
          WHEN p.product_type = 'BRACELET' THEN COALESCE(p.total_beads, p.piece_count, 0)
          WHEN p.product_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
          WHEN p.product_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
          ELSE COALESCE(p.quantity, 0)
        END as original_quantity,
        COALESCE(mu.used_quantity, 0) as used_quantity,
        (CASE 
          WHEN p.product_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
          WHEN p.product_type = 'BRACELET' THEN COALESCE(p.total_beads, p.piece_count, 0)
          WHEN p.product_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
          WHEN p.product_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
          ELSE COALESCE(p.quantity, 0)
        END - COALESCE(mu.used_quantity, 0)) as remaining_quantity,
        CASE WHEN p.min_stock_alert IS NOT NULL AND 
                 (CASE 
                   WHEN p.product_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
                   WHEN p.product_type = 'BRACELET' THEN COALESCE(p.total_beads, p.piece_count, 0)
                   WHEN p.product_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
                   WHEN p.product_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
                   ELSE COALESCE(p.quantity, 0)
                 END - COALESCE(mu.used_quantity, 0)) <= p.min_stock_alert 
            THEN 1 ELSE 0 END as is_low_stock,
        CASE 
          WHEN p.product_type = 'LOOSE_BEADS' THEN p.price_per_bead
          WHEN p.product_type = 'BRACELET' THEN 
            CASE 
              WHEN p.price_per_bead IS NOT NULL THEN p.price_per_bead
              WHEN p.total_price IS NOT NULL AND p.total_beads IS NOT NULL AND p.total_beads > 0 
                THEN p.total_price / p.total_beads
              ELSE NULL
            END
          WHEN p.product_type = 'ACCESSORIES' THEN 
            CASE 
              WHEN p.unit_price IS NOT NULL THEN p.unit_price
              WHEN p.total_price IS NOT NULL AND p.piece_count IS NOT NULL AND p.piece_count > 0 
                THEN p.total_price / p.piece_count
              ELSE NULL
            END
          WHEN p.product_type = 'FINISHED' THEN 
            CASE 
              WHEN p.unit_price IS NOT NULL THEN p.unit_price
              WHEN p.total_price IS NOT NULL AND p.piece_count IS NOT NULL AND p.piece_count > 0 
                THEN p.total_price / p.piece_count
              ELSE NULL
            END
          ELSE p.price_per_bead
        END as price_per_unit,
        p.price_per_gram as price_per_gram,
        p.purchase_date as purchase_date,
        s.name as supplier_name
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(quantity_used) as used_quantity
        FROM material_usage
        GROUP BY purchase_id
      ) mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
      ORDER BY p.product_type, p.product_name, 
               COALESCE(p.bead_diameter, p.specification), p.quality, p.purchase_date
    `;
    
    const allInventory = await prisma.$queryRawUnsafe(inventoryQuery);
    
    console.log('✅ 全部库存查询结果:');
    console.log('- 总记录数:', allInventory.length);
    
    // 按产品类型分组统计
    const typeStats = {};
    allInventory.for_each(item => {
      const type = item.product_type;
      if (!typeStats[type]) {
        typeStats[type] = { count: 0, total_quantity: 0 };
      }
      typeStats[type].count++;
      typeStats[type].total_quantity += Number(item.remaining_quantity);
    });
    
    console.log('- 按产品类型统计:');
    Object.entries(typeStats).for_each(([type, stats]) => {
      console.log(`  ${type}: ${stats.count}条记录, 总库存: ${stats.total_quantity}`);
    });
    
    // 2. 测试半成品筛选
    console.log('\n2. 测试半成品筛选...');
    
    const semiFinishedTypes = ['LOOSE_BEADS', 'BRACELET'];
    const semiFinishedInventory = allInventory.filter(item => 
      semiFinishedTypes.includes(item.product_type)
    );
    
    console.log('✅ 半成品库存查询结果:');
    console.log('- 半成品记录数:', semiFinishedInventory.length);
    
    semiFinishedInventory.for_each(item => {
      console.log(`- ${item.purchase_code}: ${item.product_name} (${item.product_type}) - ${item.remaining_quantity}颗`);
    });
    
    // 3. 查找CG20250910578226
    console.log('\n3. 查找CG20250910578226...');
    
    const targetItem = allInventory.find(item => item.purchase_code === 'CG20250910578226');
    
    if (targetItem) {
      console.log('✅ 找到目标采购单:');
      console.log('- 采购编号:', targetItem.purchase_code);
      console.log('- 产品名称:', targetItem.product_name);
      console.log('- 产品类型:', targetItem.product_type);
      console.log('- 原始数量:', targetItem.original_quantity);
      console.log('- 剩余数量:', targetItem.remaining_quantity);
      console.log('- 珠子直径:', targetItem.bead_diameter);
      console.log('- 规格:', targetItem.specification);
      console.log('- 品相:', targetItem.quality);
      
      // 检查是否在半成品筛选中
      const isInSemiFinished = semiFinishedTypes.includes(targetItem.product_type);
      console.log('- 是否属于半成品:', isInSemiFinished ? '是' : '否');
      
    } else {
      console.log('❌ 未找到目标采购单');
    }
    
    // 4. 模拟层级式数据结构构建
    console.log('\n4. 模拟层级式数据结构构建...');
    
    const hierarchicalData = new Map();
    
    semiFinishedInventory.for_each(item => {
      const product_type = item.product_type;
      const diameter = item.bead_diameter ? Number(item.bead_diameter) : null;
      const specification = item.specification ? Number(item.specification) : null;
      const quality = item.quality || '未分级';
      
      // 构建层级键
      const specValue = diameter || specification || 0;
      const level1Key = product_type;
      const level2Key = `${product_type}|${specValue}mm`;
      const level3Key = `${product_type}|${specValue}mm|${quality}`;
      
      // 初始化层级结构
      if (!hierarchicalData.has(level1Key)) {
        hierarchicalData.set(level1Key, {
          product_type: product_type,
          total_quantity: 0,
          specifications: new Map()
        });
      }
      
      const level1 = hierarchicalData.get(level1Key);
      
      if (!level1.specifications.has(level2Key)) {
        level1.specifications.set(level2Key, {
          specificationValue: specValue,
          total_quantity: 0,
          qualities: new Map()
        });
      }
      
      const level2 = level1.specifications.get(level2Key);
      
      if (!level2.qualities.has(level3Key)) {
        level2.qualities.set(level3Key, {
          quality: quality,
          remaining_quantity: 0,
          batches: []
        });
      }
      
      const level3 = level2.qualities.get(level3Key);
      
      // 累加数据
      const remaining_quantity = Number(item.remaining_quantity);
      level1.total_quantity += remainingQuantity;
      level2.total_quantity += remainingQuantity;
      level3.remaining_quantity += remainingQuantity;
      level3.batches.push(item);
    });
    
    console.log('✅ 层级式数据结构:');
    console.log('- 产品类型数量:', hierarchicalData.size);
    
    hierarchicalData.for_each((type_data, typeKey) => {
      console.log(`- ${type_key}: 总库存 ${typeData.total_quantity}`);
      typeData.specifications.for_each((spec_data, specKey) => {
        console.log(`  - ${spec_key}: ${specData.total_quantity}`);
        specData.qualities.for_each((quality_data, qualityKey) => {
          console.log(`    - ${quality_key}: ${qualityData.remaining_quantity} (${qualityData.batches.length}批次)`);
        });
      });
    });
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testInventoryAPI();