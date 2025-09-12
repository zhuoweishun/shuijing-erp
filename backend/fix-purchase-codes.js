import mysql from 'mysql2/promise';

async function fixPurchaseCodes() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔧 修复采购编号格式（PUR -> CG）...');
    
    // 查找所有使用PUR格式的记录
    const [rows] = await connection.execute(`
      SELECT id, purchase_code, product_name 
      FROM purchases 
      WHERE purchase_code LIKE 'PUR%'
      ORDER BY purchase_code
    `);
    
    console.log(`📊 找到 ${rows.length} 条使用PUR格式的记录`);
    
    if (rows.length === 0) {
      console.log('✅ 没有需要修复的记录');
      return;
    }
    
    let fixedCount = 0;
    
    for (const row of rows) {
      console.log(`\n🔍 处理记录: ${row.purchase_code} - ${row.product_name}`);
      
      // 将PUR格式转换为CG格式
      // PUR20250809004 -> CG20250809004
      const newCode = row.purchase_code.replace('PUR', 'CG');
      
      // 检查新编号是否已存在
      const [existingRows] = await connection.execute(
        'SELECT id FROM purchases WHERE purchase_code = ? AND id != ?',
        [newCode, row.id]
      );
      
      if (existingRows.length > 0) {
        console.log(`   ⚠️  编号 ${newCode} 已存在，生成新的唯一编号`);
        
        // 生成新的唯一CG编号
        const timestamp = Date.now().to_string().slice(-6);
        const random = Math.random().to_string(36).substring(2, 6).to_upper_case();
        const uniqueCode = `CG${timestamp}${random}`;
        
        await connection.execute(
          'UPDATE purchases SET purchase_code = ? WHERE id = ?',
          [uniqueCode, row.id]
        );
        
        console.log(`   ✅ 已更新为: ${uniqueCode}`);
      } else {
        // 直接替换PUR为CG
        await connection.execute(
          'UPDATE purchases SET purchase_code = ? WHERE id = ?',
          [newCode, row.id]
        );
        
        console.log(`   ✅ 已更新为: ${newCode}`);
      }
      
      fixedCount++;
    }
    
    console.log(`\n🎉 修复完成！共修复了 ${fixedCount} 条记录`);
    
    // 验证修复结果
    console.log('\n🔍 验证修复结果...');
    const [verifyRows] = await connection.execute(`
      SELECT 
        CASE 
          WHEN purchase_code LIKE 'CG%' THEN 'CG编号'
          WHEN purchase_code LIKE 'PUR%' THEN 'PUR编号'
          ELSE '其他格式'
        END as code_type,
        COUNT(*) as count
      FROM purchases 
      WHERE purchase_code IS NOT NULL
      GROUP BY code_type
      ORDER BY count DESC
    `);
    
    console.log('\n📊 修复后编号格式统计:');
    verifyRows.for_each(row => {
      const status = row.code_type === 'CG编号' ? '✅' : (row.code_type === 'PUR编号' ? '❌' : '❓');
      console.log(`  ${status} ${row.code_type}: ${row.count} 条记录`);
    });
    
    // 显示修复后的示例
    console.log('\n📋 修复后的编号示例:');
    const [sampleRows] = await connection.execute(`
      SELECT purchase_code, product_name 
      FROM purchases 
      ORDER BY purchase_code 
      LIMIT 5
    `);
    
    sampleRows.for_each((row, index) => {
      console.log(`${index + 1}. ${row.purchase_code} - ${row.product_name}`);
    });
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

// 执行修复
fixPurchaseCodes().catch(console.error);