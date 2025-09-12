import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

// 检查SKU表结构
async function checkSkuTable() {
  const connection = await mysql.create_connection(dbConfig);
  
  try {
    console.log('🔍 检查product_skus表结构...');
    
    // 查看表结构
    const [columns] = await connection.execute('DESCRIBE product_skus');
    
    console.log('\n📊 product_skus表字段:');
    columns.for_each(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(可空)' : '(非空)'} ${col.Key ? `[${col.Key}]` : ''}`);
    });
    
    // 查看几条示例数据
    const [samples] = await connection.execute(`
      SELECT * FROM product_skus 
      ORDER BY createdAt DESC 
      LIMIT 3
    `);
    
    console.log('\n📊 示例数据:');
    samples.for_each((row, index) => {
      console.log(`\n第${index + 1}条:`);
      Object.keys(row).for_each(key => {
        let value = row[key];
        if (typeof value === 'string' && value.length > 100) {
          value = value.substring(0, 100) + '...';
        }
        console.log(`  ${key}: ${value}`);
      });
    });
    
  } catch (error) {
    console.error('❌ 检查表结构时发生错误:', error);
  } finally {
    await connection.end();
  }
}

// 执行检查
checkSkuTable().catch(console.error);