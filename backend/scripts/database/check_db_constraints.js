import mysql from 'mysql2/promise';

async function checkDbConstraints() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      multipleStatements: true
    });
    
    console.log('🔍 检查数据库约束和默认值设置...');
    
    // 1. 检查materials表结构
    console.log('1. 检查materials表结构...');
    const [materialsColumns] = await connection.query('DESCRIBE materials');
    console.log('materials表字段:');
    materialsColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type}, NULL: ${col.Null}, Default: ${col.Default}, Key: ${col.Key}`);
    });
    
    // 2. 检查purchases表结构
    console.log('\n2. 检查purchases表结构...');
    const [purchasesColumns] = await connection.query('DESCRIBE purchases');
    console.log('purchases表字段:');
    purchasesColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type}, NULL: ${col.Null}, Default: ${col.Default}, Key: ${col.Key}`);
    });
    
    // 3. 检查material_usage表结构
    console.log('\n3. 检查material_usage表结构...');
    const [materialUsageColumns] = await connection.query('DESCRIBE material_usage');
    console.log('material_usage表字段:');
    materialUsageColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type}, NULL: ${col.Null}, Default: ${col.Default}, Key: ${col.Key}`);
    });
    
    // 4. 检查外键约束
    console.log('\n4. 检查外键约束...');
    const [foreignKeys] = await connection.query(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE REFERENCED_TABLE_SCHEMA = 'crystal_erp_dev'
        AND TABLE_NAME IN ('materials', 'material_usage', 'purchases')
    `);
    
    console.log('外键约束:');
    foreignKeys.forEach(fk => {
      console.log(`- ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    });
    
    // 5. 检查索引
    console.log('\n5. 检查索引...');
    const [materialsIndexes] = await connection.query('SHOW INDEX FROM materials');
    console.log('materials表索引:');
    materialsIndexes.forEach(idx => {
      console.log(`- ${idx.Key_name}: ${idx.Column_name} (${idx.Index_type})`);
    });
    
    // 6. 检查CG20250917120816的详细数据
    console.log('\n6. 检查CG20250917120816的详细数据...');
    
    // 检查purchase记录
    const [purchase] = await connection.query(
      'SELECT * FROM purchases WHERE purchase_code = ?',
      ['CG20250917120816']
    );
    
    if (purchase.length > 0) {
      const p = purchase[0];
      console.log('Purchase记录详情:');
      console.log(`- ID: ${p.id}`);
      console.log(`- Status: ${p.status}`);
      console.log(`- Purchase Type: ${p.purchase_type}`);
      console.log(`- Piece Count: ${p.piece_count}`);
      console.log(`- Total Price: ${p.total_price}`);
      console.log(`- Created At: ${p.created_at}`);
      
      // 检查对应的material记录
      const [material] = await connection.query(
        'SELECT * FROM materials WHERE material_code = ?',
        ['CG20250917120816']
      );
      
      if (material.length > 0) {
        const m = material[0];
        console.log('\nMaterial记录详情:');
        console.log(`- ID: ${m.id}`);
        console.log(`- Purchase ID: ${m.purchase_id}`);
        console.log(`- Original Quantity: ${m.original_quantity}`);
        console.log(`- Used Quantity: ${m.used_quantity}`);
        console.log(`- Remaining Quantity: ${m.remaining_quantity}`);
        console.log(`- Unit Cost: ${m.unit_cost}`);
        console.log(`- Created At: ${m.created_at}`);
        
        // 检查material_usage记录
        const [usages] = await connection.query(
          'SELECT * FROM material_usage WHERE material_id = ?',
          [m.id]
        );
        
        console.log(`\nMaterial Usage记录 (${usages.length}条):`);
        usages.forEach((usage, index) => {
          console.log(`  ${index + 1}. ID: ${usage.id}`);
          console.log(`     Quantity Used: ${usage.quantity_used}`);
          console.log(`     Product ID: ${usage.product_id || 'NULL'}`);
          console.log(`     Created At: ${usage.created_at}`);
        });
        
        // 验证计算
        const totalUsed = usages.reduce((sum, usage) => sum + Number(usage.quantity_used), 0);
        const expectedRemaining = Number(m.original_quantity) - totalUsed;
        
        console.log('\n计算验证:');
        console.log(`- 原始数量: ${m.original_quantity}`);
        console.log(`- 使用记录总和: ${totalUsed}`);
        console.log(`- 期望剩余: ${expectedRemaining}`);
        console.log(`- 实际剩余: ${m.remaining_quantity}`);
        console.log(`- 数据库中的used_quantity: ${m.used_quantity}`);
        
        if (Number(m.remaining_quantity) === expectedRemaining && Number(m.used_quantity) === totalUsed) {
          console.log('✅ 数据一致性检查通过');
        } else {
          console.log('❌ 数据一致性检查失败');
          console.log('可能的问题:');
          if (Number(m.used_quantity) !== totalUsed) {
            console.log(`  - used_quantity不正确: 应为${totalUsed}, 实际为${m.used_quantity}`);
          }
          if (Number(m.remaining_quantity) !== expectedRemaining) {
            console.log(`  - remaining_quantity不正确: 应为${expectedRemaining}, 实际为${m.remaining_quantity}`);
          }
        }
      } else {
        console.log('❌ 没有找到对应的material记录');
      }
    } else {
      console.log('❌ 没有找到purchase记录');
    }
    
    // 7. 检查是否有其他数据不一致的情况
    console.log('\n7. 检查其他数据不一致情况...');
    const [inconsistentMaterials] = await connection.query(`
      SELECT 
        m.id,
        m.material_code,
        m.original_quantity,
        m