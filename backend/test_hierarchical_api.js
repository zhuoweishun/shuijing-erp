import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

async function testHierarchicalAPI() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 模拟API查询：查询materials表中的油胆数据
    console.log('\n🔍 测试层级式库存API查询:');
    const inventoryQuery = `
      SELECT 
        m.id as material_id,
        m.material_code as material_code,
        m.material_name as material_name,
        m.material_type as material_type,
        m.inventory_unit as inventory_unit,
        m.bead_diameter as bead_diameter,
        m.bracelet_inner_diameter,
        m.bracelet_bead_count,
        m.accessory_specification,
        m.finished_material_specification,
        m.quality,
        m.photos,
        m.original_quantity,
        m.used_quantity,
        COALESCE(m.remaining_quantity, m.original_quantity - m.used_quantity) as remaining_quantity,
        CASE WHEN m.min_stock_alert IS NOT NULL AND 
                 COALESCE(m.remaining_quantity, m.original_quantity - m.used_quantity) <= m.min_stock_alert 
            THEN 1 ELSE 0 END as is_low_stock,
        m.unit_cost as price_per_unit,
        NULL as price_per_gram,
        m.material_date as material_date,
        s.name as supplier_name,
        COALESCE(m.stock_status, 'SUFFICIENT') as stock_status
      FROM materials m
      LEFT JOIN suppliers s ON m.supplier_id = s.id
      WHERE m.material_name LIKE '%油胆%'
      ORDER BY m.material_type, m.material_name, 
               COALESCE(m.bead_diameter, m.bracelet_inner_diameter), m.quality, m.material_date
    `;
    
    const [results] = await connection.execute(inventoryQuery);
    
    console.log('📊 查询结果:');
    console.log(`找到 ${results.length} 条油胆记录`);
    
    results.forEach((item, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log('material_id:', item.material_id);
      console.log('material_name:', item.material_name);
      console.log('material_type:', item.material_type);
      console.log('quality:', item.quality);
      console.log('bead_diameter:', item.bead_diameter);
      console.log('original_quantity:', item.original_quantity);
      console.log('remaining_quantity:', item.remaining_quantity);
      console.log('price_per_unit (unit_cost):', item.price_per_unit);
      console.log('supplier_name:', item.supplier_name);
    });
    
    // 模拟前端数据处理：构建层级结构
    console.log('\n🏗️ 构建层级结构:');
    const hierarchicalData = new Map();
    
    results.forEach((item) => {
      const material_type = item.material_type;
      const specValue = item.bead_diameter ? Number(item.bead_diameter) : 0;
      const quality = item.quality || '未知';
      
      const level1Key = material_type;
      const level2Key = `${material_type}|${specValue}mm`;
      const level3Key = `${material_type}|${specValue}mm|${quality}`;
      
      // 初始化层级结构
      if (!hierarchicalData.has(level1Key)) {
        hierarchicalData.set(level1Key, {
          material_type: material_type,
          total_quantity: 0,
          specifications: new Map()
        });
      }
      
      const level1 = hierarchicalData.get(level1Key);
      
      if (!level1.specifications.has(level2Key)) {
        level1.specifications.set(level2Key, {
          specification_value: specValue,
          specification_unit: 'mm',
          total_quantity: 0,
          qualities: new Map()
        });
      }
      
      const level2 = level1.specifications.get(level2Key);
      
      if (!level2.qualities.has(level3Key)) {
        level2.qualities.set(level3Key, {
          quality: quality,
          remaining_quantity: 0,
          price_per_unit: 0,
          batches: []
        });
      }
      
      const level3 = level2.qualities.get(level3Key);
      
      // 添加批次数据
      const remainingQty = Number(item.remaining_quantity) || 0;
      const pricePerUnit = Number(item.price_per_unit) || 0;
      
      level3.remaining_quantity += remainingQty;
      level3.price_per_unit = pricePerUnit; // 直接使用单价
      level3.batches.push({
        material_id: item.material_id,
        material_name: item.material_name,
        material_type: item.material_type,
        quality: item.quality,
        bead_diameter: item.bead_diameter,
        original_quantity: item.original_quantity,
        remaining_quantity: remainingQty,
        price_per_unit: pricePerUnit, // 这是前端需要的字段
        supplier_name: item.supplier_name,
        material_date: item.material_date
      });
      
      // 更新上级统计
      level2.total_quantity += remainingQty;
      level1.total_quantity += remainingQty;
    });
    
    // 转换为数组格式（模拟API返回）
    const hierarchy = [];
    for (const [, level1] of hierarchicalData) {
      const specifications = [];
      for (const [, level2] of level1.specifications) {
        const qualities = [];
        for (const [, level3] of level2.qualities) {
          qualities.push(level3);
        }
        level2.qualities = qualities;
        specifications.push(level2);
      }
      level1.specifications = specifications;
      hierarchy.push(level1);
    }
    
    console.log('\n📋 层级结构构建完成:');
    console.log('层级数据:', JSON.stringify(hierarchy, null, 2));
    
    // 验证价格数据
    console.log('\n💰 价格数据验证:');
    hierarchy.forEach(level1 => {
      console.log(`\n${level1.material_type}:`);
      level1.specifications.forEach(level2 => {
        console.log(`  ${level2.specification_value}mm:`);
        level2.qualities.forEach(level3 => {
          console.log(`    ${level3.quality}: ${level3.remaining_quantity}颗, 单价¥${level3.price_per_unit}`);
          level3.batches.forEach(batch => {
            console.log(`      批次: ${batch.material_id}, 单价¥${batch.price_per_unit}`);
          });
        });
      });
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

testHierarchicalAPI();