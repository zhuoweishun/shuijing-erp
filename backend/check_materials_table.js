import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

async function checkMaterialsTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 1. 查看materials表结构
    console.log('\n📋 Materials表结构:');
    const [tableStructure] = await connection.execute('DESCRIBE materials');
    console.table(tableStructure);
    
    // 2. 查看materials表中的价格相关字段
    console.log('\n💰 价格相关字段:');
    const priceFields = tableStructure.filter(field => 
      field.Field.toLowerCase().includes('price') || 
      field.Field.toLowerCase().includes('cost') ||
      field.Field.toLowerCase().includes('unit')
    );
    console.table(priceFields);
    
    // 3. 查看油胆的materials记录
    console.log('\n🔍 油胆的materials记录:');
    const [youdan] = await connection.execute(`
      SELECT * FROM materials 
      WHERE material_name LIKE '%油胆%' 
      LIMIT 3
    `);
    console.log('找到', youdan.length, '条油胆记录');
    youdan.forEach((record, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log('material_id:', record.material_id);
      console.log('material_name:', record.material_name);
      console.log('quality:', record.quality);
      console.log('specification:', record.specification);
      console.log('original_quantity:', record.original_quantity);
      console.log('remaining_quantity:', record.remaining_quantity);
      
      // 显示所有可能的价格字段
      Object.keys(record).forEach(key => {
        if (key.toLowerCase().includes('price') || 
            key.toLowerCase().includes('cost') ||
            key.toLowerCase().includes('unit')) {
          console.log(`${key}:`, record[key]);
        }
      });
    });
    
    // 4. 统计价格字段的覆盖率
    console.log('\n📊 价格字段覆盖率统计:');
    for (const field of priceFields) {
      const fieldName = field.Field;
      const [count] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          COUNT(${fieldName}) as has_value,
          ROUND(COUNT(${fieldName}) * 100.0 / COUNT(*), 2) as coverage_rate
        FROM materials 
        WHERE material_name LIKE '%油胆%'
      `);
      console.log(`${fieldName}: ${count[0].coverage_rate}% (${count[0].has_value}/${count[0].total})`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

checkMaterialsTable();