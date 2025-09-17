import mysql from 'mysql2/promise';
import fs from 'fs';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

async function checkMaterialPurchaseSync() {
  let connection;
  
  try {
    console.log('🔍 开始检查material表和purchase表的数据同步情况...');
    
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    const report = {
      timestamp: new Date().toISOString(),
      purchase_stats: {},
      material_stats: {},
      missing_materials: [],
      data_inconsistencies: [],
      summary: {}
    };
    
    // 1. 检查purchase表的ACTIVE记录数量
    console.log('\n📊 1. 检查purchase表ACTIVE记录...');
    const [purchaseResults] = await connection.execute(`
      SELECT 
        COUNT(*) as total_count,
        purchase_type,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_count
      FROM purchases 
      GROUP BY purchase_type
      ORDER BY purchase_type
    `);
    
    const [totalPurchase] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active
      FROM purchases
    `);
    
    report.purchase_stats = {
      total_records: totalPurchase[0].total,
      active_records: totalPurchase[0].active,
      by_type: purchaseResults
    };
    
    console.log(`   总记录数: ${totalPurchase[0].total}`);
    console.log(`   ACTIVE记录数: ${totalPurchase[0].active}`);
    purchaseResults.forEach(row => {
      console.log(`   ${row.purchase_type}: 总数${row.total_count}, ACTIVE${row.active_count}`);
    });
    
    // 2. 检查material表记录数量
    console.log('\n📊 2. 检查material表记录...');
    const [materialResults] = await connection.execute(`
      SELECT 
        COUNT(*) as total_count,
        material_type
      FROM materials 
      GROUP BY material_type
      ORDER BY material_type
    `);
    
    const [totalMaterial] = await connection.execute(`
      SELECT COUNT(*) as total FROM materials
    `);
    
    report.material_stats = {
      total_records: totalMaterial[0].total,
      by_type: materialResults
    };
    
    console.log(`   总记录数: ${totalMaterial[0].total}`);
    materialResults.forEach(row => {
      console.log(`   ${row.material_type}: ${row.total_count}`);
    });
    
    // 3. 找出purchase表中存在但material表中缺失的记录
    console.log('\n🔍 3. 检查缺失的material记录...');
    const [missingMaterials] = await connection.execute(`
      SELECT 
        p.id as purchase_id,
        p.purchase_code,
        p.purchase_name,
        p.purchase_type,
        p.status,
        p.created_at,
        p.total_price
      FROM purchases p
      LEFT JOIN materials m ON p.id = m.purchase_id
      WHERE p.status = 'ACTIVE' AND m.id IS NULL
      ORDER BY p.created_at DESC
    `);
    
    report.missing_materials = missingMaterials;
    
    if (missingMaterials.length > 0) {
      console.log(`   ⚠️ 发现 ${missingMaterials.length} 条ACTIVE采购记录没有对应的material记录:`);
      missingMaterials.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.purchase_code} - ${record.purchase_name} (${record.purchase_type})`);
        console.log(`      创建时间: ${record.created_at}, 总价: ${record.total_price}`);
      });
    } else {
      console.log('   ✅ 所有ACTIVE采购记录都有对应的material记录');
    }
    
    // 4. 检查已同步记录的数据一致性
    console.log('\n🔍 4. 检查数据一致性...');
    const [inconsistencies] = await connection.execute(`
      SELECT 
        p.id as purchase_id,
        p.purchase_code,
        p.purchase_name,
        m.material_name,
        p.purchase_type,
        m.material_type,
        p.total_price,
        m.total_cost,
        p.quality as purchase_quality,
        m.quality as material_quality,
        p.bead_diameter as purchase_bead_diameter,
        m.bead_diameter as material_bead_diameter,
        CASE 
          WHEN p.purchase_name != m.material_name THEN 'name_mismatch'
          WHEN p.purchase_type != m.material_type THEN 'type_mismatch'
          WHEN ABS(p.total_price - m.total_cost) > 0.01 THEN 'price_mismatch'
          WHEN p.quality != m.quality THEN 'quality_mismatch'
          WHEN ABS(COALESCE(p.bead_diameter, 0) - COALESCE(m.bead_diameter, 0)) > 0.01 THEN 'diameter_mismatch'
          ELSE 'consistent'
        END as consistency_status
      FROM purchases p
      INNER JOIN materials m ON p.id = m.purchase_id
      WHERE p.status = 'ACTIVE'
      HAVING consistency_status != 'consistent'
      ORDER BY p.created_at DESC
    `);
    
    report.data_inconsistencies = inconsistencies;
    
    if (inconsistencies.length > 0) {
      console.log(`   ⚠️ 发现 ${inconsistencies.length} 条数据不一致的记录:`);
      inconsistencies.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.purchase_code} - 不一致类型: ${record.consistency_status}`);
        if (record.consistency_status === 'name_mismatch') {
          console.log(`      采购名称: ${record.purchase_name} vs 材料名称: ${record.material_name}`);
        }
        if (record.consistency_status === 'type_mismatch') {
          console.log(`      采购类型: ${record.purchase_type} vs 材料类型: ${record.material_type}`);
        }
        if (record.consistency_status === 'price_mismatch') {
          console.log(`      采购价格: ${record.total_price} vs 材料成本: ${record.total_cost}`);
        }
        if (record.consistency_status === 'quality_mismatch') {
          console.log(`      采购品质: ${record.purchase_quality} vs 材料品质: ${record.material_quality}`);
        }
        if (record.consistency_status === 'diameter_mismatch') {
          console.log(`      采购直径: ${record.purchase_bead_diameter} vs 材料直径: ${record.material_bead_diameter}`);
        }
      });
    } else {
      console.log('   ✅ 所有已同步的记录数据都一致');
    }
    
    // 5. 生成汇总报告
    console.log('\n📋 5. 汇总报告...');
    const syncRate = totalPurchase[0].active > 0 ? 
      ((totalPurchase[0].active - missingMaterials.length) / totalPurchase[0].active * 100).toFixed(2) : 0;
    
    report.summary = {
      total_active_purchases: totalPurchase[0].active,
      total_materials: totalMaterial[0].total,
      missing_materials_count: missingMaterials.length,
      inconsistent_records_count: inconsistencies.length,
      sync_rate_percentage: parseFloat(syncRate),
      status: missingMaterials.length === 0 && inconsistencies.length === 0 ? 'PERFECT' : 
              missingMaterials.length > 0 ? 'MISSING_DATA' : 'DATA_INCONSISTENT'
    };
    
    console.log(`   📊 同步率: ${syncRate}% (${totalPurchase[0].active - missingMaterials.length}/${totalPurchase[0].active})`);
    console.log(`   📊 缺失材料记录: ${missingMaterials.length} 条`);
    console.log(`   📊 数据不一致记录: ${inconsistencies.length} 条`);
    console.log(`   📊 整体状态: ${report.summary.status}`);
    
    // 6. 保存详细报告到文件
    const reportFileName = `material_purchase_sync_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFileName, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n💾 详细报告已保存到: ${reportFileName}`);
    
    // 7. 如果有缺失的记录，提供修复建议
    if (missingMaterials.length > 0) {
      console.log('\n🔧 修复建议:');
      console.log('   1. 运行数据迁移脚本将缺失的purchase记录转换为material记录');
      console.log('   2. 检查触发器是否正常工作，确保新的purchase记录能自动创建material记录');
      console.log('   3. 考虑运行: node migrate_purchase_to_material.js');
    }
    
    if (inconsistencies.length > 0) {
      console.log('\n🔧 数据一致性修复建议:');
      console.log('   1. 检查数据转换逻辑是否正确');
      console.log('   2. 手动修正不一致的记录');
      console.log('   3. 更新触发器逻辑以防止未来的数据不一致');
    }
    
    console.log('\n✅ 检查完成!');
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行检查
checkMaterialPurchaseSync().catch(console.error);