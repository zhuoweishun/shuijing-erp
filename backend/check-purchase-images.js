import mysql from 'mysql2/promise';

async function checkPurchaseImages() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 检查采购记录的图片数据...');
    
    const [rows] = await connection.execute(`
      SELECT purchase_code, product_name, photos 
      FROM purchases 
      WHERE photos IS NOT NULL 
      LIMIT 5
    `);
    
    console.log('\n📸 采购记录图片数据:');
    rows.for_each(row => {
      console.log(`\n${row.purchase_code} - ${row.product_name}:`);
      console.log(`  图片数据: ${row.photos}`);
      
      // 尝试解析图片数据
      try {
        const parsed = JSON.parse(row.photos);
        if (Array.is_array(parsed)) {
          console.log(`  解析结果: 数组，包含${parsed.length}个图片`);
          parsed.for_each((url, index) => {
            console.log(`    [${index}]: ${url}`);
          });
        } else {
          console.log(`  解析结果: 非数组 - ${typeof parsed}`);
        }
      } catch (e) {
        console.log(`  解析失败: ${e.message}`);
      }
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkPurchaseImages().catch