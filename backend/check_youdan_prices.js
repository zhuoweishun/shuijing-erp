import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

async function checkYoudanPrices() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 1. 检查materials表结构，特别是价格相关字段
    console.log('\n🔍 [材料表结构检查] 查看materials表的价格相关字段...');
    const [tableStructure] = await connection.execute(`
      DESCRIBE materials
    `);
    
    console.log('Materials表字段结构:');
    tableStructure.forEach(field => {
      if (field.Field.includes('price') || field.Field.includes('cost') || field.Field.includes('unit')) {
        console.log(`  - ${field.Field}: ${field.Type} (默认值: ${field.Default})`);
      }
    });
    
    // 2. 先查看materials表的完整结构
    console.log('\n🔍 [完整表结构] 查看materials表的所有字段...');
    const [fullStructure] = await connection.execute(`
      DESCRIBE materials
    `);
    
    console.log('\nMaterials表完整字段:');
    fullStructure.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type}`);
    });
    
    // 3. 查询油胆的所有批次数据，检查价格字段
    console.log('\n🔍 [油胆价格数据检查] 查询所有油胆批次的价格信息...');
    const [youdanData] = await connection.execute(`
      SELECT 
        id,
        material_name,
        quality,
        bead_diameter,
        original_quantity,
        remaining_quantity,
        unit_cost,
        total_cost,
        purchase_id,
        material_date
      FROM materials 
      WHERE material_name LIKE '%油胆%'
      ORDER BY quality, material_date DESC
    `);
    
    console.log(`找到 ${youdanData.length} 条油胆记录:`);
    youdanData.forEach((record, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log(`  - ID: ${record.id}`);
      console.log(`  - 品相: ${record.quality}`);
      console.log(`  - 规格: ${record.bead_diameter}mm`);
      console.log(`  - 数量: ${record.remaining_quantity}/${record.original_quantity}`);
      console.log(`  - unit_cost: ${record.unit_cost}`);
      console.log(`  - total_cost: ${record.total_cost}`);
      console.log(`  - 采购ID: ${record.purchase_id}`);
    });
    
    // 4. 按品相统计价格字段的数据情况
    console.log('\n📊 [价格字段统计] 按品相统计价格数据完整性...');
    const [priceStats] = await connection.execute(`
      SELECT 
        quality,
        COUNT(*) as total_count,
        COUNT(unit_cost) as unit_cost_count,
        COUNT(total_cost) as total_cost_count,
        AVG(CASE WHEN unit_cost > 0 THEN unit_cost END) as avg_unit_cost,
        AVG(CASE WHEN total_cost > 0 THEN total_cost END) as avg_total_cost
      FROM materials 
      WHERE material_name LIKE '%油胆%'
      GROUP BY quality
      ORDER BY 
        CASE quality 
          WHEN 'AA级' THEN 1
          WHEN 'A级' THEN 2
          WHEN 'AB级' THEN 3
          WHEN 'B级' THEN 4
          WHEN 'C级' THEN 5
          ELSE 6
        END
    `);
    
    console.log('\n品相价格统计:');
    priceStats.forEach(stat => {
      console.log(`\n${stat.quality}:`);
      console.log(`  - 总记录数: ${stat.total_count}`);
      console.log(`  - unit_cost有值: ${stat.unit_cost_count} (平均: ¥${stat.avg_unit_cost || 0})`);
      console.log(`  - total_cost有值: ${stat.total_cost_count} (平均: ¥${stat.avg_total_cost || 0})`);
    });
    
    // 5. 检查哪个价格字段有最多的有效数据
    console.log('\n🎯 [推荐字段] 分析最适合的价格字段...');
    const [fieldAnalysis] = await connection.execute(`
      SELECT 
        'unit_cost' as field_name,
        COUNT(CASE WHEN unit_cost > 0 THEN 1 END) as valid_count,
        COUNT(*) as total_count,
        ROUND(COUNT(CASE WHEN unit_cost > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as coverage_percent
      FROM materials WHERE material_name LIKE '%油胆%'
      
      UNION ALL
      
      SELECT 
        'total_cost' as field_name,
        COUNT(CASE WHEN total_cost > 0 THEN 1 END) as valid_count,
        COUNT(*) as total_count,
        ROUND(COUNT(CASE WHEN total_cost > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as coverage_percent
      FROM materials WHERE material_name LIKE '%油胆%'
      
      ORDER BY coverage_percent DESC
    `);
    
    console.log('\n价格字段覆盖率分析:');
    fieldAnalysis.forEach(analysis => {
      console.log(`  - ${analysis.field_name}: ${analysis.valid_count}/${analysis.total_count} (${analysis.coverage_percent}%)`);
    });
    
    const bestField = fieldAnalysis[0];
    console.log(`\n🏆 推荐使用字段: ${bestField.field_name} (覆盖率: ${bestField.coverage_percent}%)`);
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ 数据库连接已关闭');
    }
  }
}

checkYoudanPrices();