import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkMaterialUsageTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('📋 material_usage表结构:');
    const [columns] = await connection.query('DESCRIBE material_usage');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(可空)' : '(非空)'}`);
    });
    
    console.log('\n📊 material_usage记录统计:');
    const [stats] = await connection.query(`
      SELECT 
        action,
        COUNT(*) as count
      FROM material_usage 
      GROUP BY action
    `);
    stats.forEach(stat => {
      console.log(`- ${stat.action}: ${stat.count}条记录`);
    });
    
    console.log('\n📝 最近的material_usage记录:');
    const [records] = await connection.query(`
      SELECT 
        id,
        material_id,
        sku_id,
        quantity_used,
        unit_cost,
        total_cost,
        action,
        notes,
        created_at
      FROM material_usage 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (records.length > 0) {
      records.forEach((record, i) => {
        console.log(`记录 ${i+1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  材料ID: ${record.material_id}`);
        console.log(`  SKU ID: ${record.sku_id}`);
        console.log(`  使用数量: ${record.quantity_used}`);
        console.log(`  单价: ${record.unit_cost}`);
        console.log(`  总价: ${record.total_cost}`);
        console.log(`  操作: ${record.action}`);
        console.log(`  备注: ${record.notes || 'N/A'}`);
        console.log(`  创建时间: ${record.created_at}`);
        console.log('');
      });
    } else {
      console.log('- 暂无记录');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkMaterialUsageTable().catch(console.error);