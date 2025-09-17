import mysql from 'mysql2/promise';

async function checkConstraints() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });
  
  try {
    console.log('🔍 检查外键约束...');
    
    const [constraints] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME, 
        TABLE_NAME, 
        COLUMN_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE REFERENCED_TABLE_NAME = 'purchases' 
        AND TABLE_SCHEMA = 'crystal_erp_dev'
    `);
    
    console.log('引用purchases表的外键约束:');
    constraints.forEach(c => {
      console.log(`- ${c.TABLE_NAME}.${c.COLUMN_NAME} -> ${c.REFERENCED_TABLE_NAME}.${c.REFERENCED_COLUMN_NAME}`);
    });
    
    console.log('\n🔍 检查materials表的外键约束行为...');
    const [materialConstraints] = await connection.execute(`
      SELECT * 
      FROM information_schema.REFERENTIAL_CONSTRAINTS 
      WHERE CONSTRAINT_SCHEMA = 'crystal_erp_dev' 
        AND REFERENCED_TABLE_NAME = 'purchases'
    `);
    
    console.log('materials表外键约束详情:');
    materialConstraints.forEach(c => {
      console.log(`- 约束名: ${c.CONSTRAINT_NAME}`);
      console.log(`- 删除规则: ${c.DELETE_RULE}`);
      console.log(`- 更新规则: ${c.UPDATE_RULE}`);
    });
    
    console.log('\n🔍 尝试模拟删除操作...');
    
    // 检查是否可以删除
    try {
      await connection.beginTransaction();
      
      // 尝试删除（但回滚）
      await connection.execute('DELETE FROM purchases WHERE id = ?', ['cmfnmiw6z000513utzdf2hjon']);
      
      console.log('✅ 删除操作可以执行（已回滚）');
      
      await connection.rollback();
      
    } catch (deleteError) {
      console.log('❌ 删除操作失败:', deleteError.message);
      console.log('错误代码:', deleteError.code);
      
      await connection.rollback();
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkConstraints();