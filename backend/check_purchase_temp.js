import mysql from 'mysql2/promise';

async function checkPurchase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });
  
  try {
    console.log('🔍 检查采购记录是否存在...');
    const [purchase] = await connection.execute(
      'SELECT id, purchase_code, purchase_name, status FROM purchases WHERE id = ?',
      ['cmfnmiw6z000513utzdf2hjon']
    );
    console.log('采购记录:', purchase);
    
    console.log('\n🔍 检查material_usage表结构...');
    const [structure] = await connection.execute('DESCRIBE material_usage');
    console.log('material_usage表结构:');
    structure.forEach(col => console.log(`- ${col.Field}: ${col.Type}`));
    
    console.log('\n🔍 查看所有material_usage记录...');
    const [allUsages] = await connection.execute('SELECT COUNT(*) as total FROM material_usage');
    console.log('material_usage总记录数:', allUsages[0].total);
    
    console.log('\n🔍 查看该采购记录的所有关联数据...');
    
    // 检查materials表
    const [materials] = await connection.execute(
      'SELECT id, material_code, material_name FROM materials WHERE purchase_id = ?',
      ['cmfnmiw6z000513utzdf2hjon']
    );
    console.log('\n关联的materials记录:', materials.length);
    materials.forEach((m, i) => {
      console.log(`  ${i+1}. ${m.material_code} - ${m.material_name}`);
    });
    
    // 如果有materials，检查这些materials的usage
    if (materials.length > 0) {
      const materialIds = materials.map(m => m.id);
      const placeholders = materialIds.map(() => '?').join(',');
      const [materialUsages] = await connection.execute(
        `SELECT mu.*, ps.sku_name FROM material_usage mu LEFT JOIN product_skus ps ON mu.sku_id = ps.id WHERE mu.material_id IN (${placeholders})`,
        materialIds
      );
      console.log('\n通过material_id找到的usage记录:', materialUsages.length);
      materialUsages.forEach((usage, i) => {
        console.log(`  ${i+1}. material_id: ${usage.material_id}, sku: ${usage.sku_name}, quantity: ${usage.quantity_used}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkPurchase();