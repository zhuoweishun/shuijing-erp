import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

async function fixMaterialBeadDiameter() {
  let connection;
  
  try {
    console.log('🔧 开始修复material表中缺失的bead_diameter字段...');
    
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 1. 先查看需要修复的记录
    console.log('\n🔍 1. 查看需要修复的记录...');
    const [needFixRecords] = await connection.execute(`
      SELECT 
        m.id as material_id,
        m.material_code,
        m.material_name,
        m.material_type,
        m.bead_diameter as current_bead_diameter,
        p.bead_diameter as purchase_bead_diameter,
        p.purchase_code
      FROM materials m
      INNER JOIN purchases p ON m.purchase_id = p.id
      WHERE m.material_type IN ('LOOSE_BEADS', 'BRACELET') 
        AND m.bead_diameter IS NULL 
        AND p.bead_diameter IS NOT NULL
      ORDER BY m.material_type, m.material_name
    `);
    
    if (needFixRecords.length === 0) {
      console.log('   ✅ 没有需要修复的记录');
      return;
    }
    
    console.log(`   📊 发现 ${needFixRecords.length} 条需要修复的记录:`);
    needFixRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.material_code} - ${record.material_name}`);
      console.log(`      类型: ${record.material_type}, 当前直径: ${record.current_bead_diameter}, 应设置为: ${record.purchase_bead_diameter}`);
    });
    
    // 2. 执行修复
    console.log('\n🔧 2. 开始执行修复...');
    let fixedCount = 0;
    
    for (const record of needFixRecords) {
      try {
        const [result] = await connection.execute(`
          UPDATE materials 
          SET bead_diameter = ?
          WHERE id = ?
        `, [record.purchase_bead_diameter, record.material_id]);
        
        if (result.affectedRows > 0) {
          console.log(`   ✅ 已修复: ${record.material_code} - 设置bead_diameter为 ${record.purchase_bead_diameter}`);
          fixedCount++;
        } else {
          console.log(`   ⚠️ 修复失败: ${record.material_code} - 没有行被更新`);
        }
      } catch (error) {
        console.error(`   ❌ 修复失败: ${record.material_code} - ${error.message}`);
      }
    }
    
    // 3. 验证修复结果
    console.log('\n🔍 3. 验证修复结果...');
    const [verifyRecords] = await connection.execute(`
      SELECT 
        m.material_code,
        m.material_name,
        m.material_type,
        m.bead_diameter as material_bead_diameter,
        p.bead_diameter as purchase_bead_diameter,
        CASE 
          WHEN m.bead_diameter = p.bead_diameter THEN 'CONSISTENT'
          WHEN m.bead_diameter IS NULL AND p.bead_diameter IS NOT NULL THEN 'STILL_MISSING'
          WHEN m.bead_diameter IS NOT NULL AND p.bead_diameter IS NULL THEN 'PURCHASE_MISSING'
          ELSE 'MISMATCH'
        END as status
      FROM materials m
      INNER JOIN purchases p ON m.purchase_id = p.id
      WHERE m.material_type IN ('LOOSE_BEADS', 'BRACELET')
      ORDER BY status DESC, m.material_type, m.material_name
    `);
    
    const statusCounts = {
      CONSISTENT: 0,
      STILL_MISSING: 0,
      PURCHASE_MISSING: 0,
      MISMATCH: 0
    };
    
    verifyRecords.forEach(record => {
      statusCounts[record.status]++;
      if (record.status !== 'CONSISTENT') {
        console.log(`   ${record.status}: ${record.material_code} - 材料直径: ${record.material_bead_diameter}, 采购直径: ${record.purchase_bead_diameter}`);
      }
    });
    
    console.log('\n📊 修复结果统计:');
    console.log(`   ✅ 数据一致: ${statusCounts.CONSISTENT} 条`);
    console.log(`   ⚠️ 仍然缺失: ${statusCounts.STILL_MISSING} 条`);
    console.log(`   ⚠️ 采购缺失: ${statusCounts.PURCHASE_MISSING} 条`);
    console.log(`   ❌ 数据不匹配: ${statusCounts.MISMATCH} 条`);
    console.log(`   🔧 本次修复: ${fixedCount} 条`);
    
    // 4. 同时修复bracelet_inner_diameter字段（如果需要）
    console.log('\n🔍 4. 检查bracelet_inner_diameter字段...');
    const [braceletDiameterRecords] = await connection.execute(`
      SELECT 
        m.id as material_id,
        m.material_code,
        m.material_name,
        m.bracelet_inner_diameter as current_inner_diameter,
        p.specification as purchase_specification
      FROM materials m
      INNER JOIN purchases p ON m.purchase_id = p.id
      WHERE m.material_type = 'BRACELET' 
        AND m.bracelet_inner_diameter IS NULL 
        AND p.specification IS NOT NULL
      ORDER BY m.material_name
    `);
    
    if (braceletDiameterRecords.length > 0) {
      console.log(`   📊 发现 ${braceletDiameterRecords.length} 条需要修复bracelet_inner_diameter的记录`);
      
      let braceletFixedCount = 0;
      for (const record of braceletDiameterRecords) {
        try {
          const [result] = await connection.execute(`
            UPDATE materials 
            SET bracelet_inner_diameter = ?
            WHERE id = ?
          `, [record.purchase_specification, record.material_id]);
          
          if (result.affectedRows > 0) {
            console.log(`   ✅ 已修复bracelet_inner_diameter: ${record.material_code} - 设置为 ${record.purchase_specification}`);
            braceletFixedCount++;
          }
        } catch (error) {
          console.error(`   ❌ 修复bracelet_inner_diameter失败: ${record.material_code} - ${error.message}`);
        }
      }
      console.log(`   🔧 bracelet_inner_diameter修复: ${braceletFixedCount} 条`);
    } else {
      console.log('   ✅ bracelet_inner_diameter字段无需修复');
    }
    
    console.log('\n✅ 修复完成!');
    console.log('\n💡 建议: 运行 node check_material_purchase_sync.js 重新检查数据一致性');
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行修复
fixMaterialBeadDiameter().catch(console.error);