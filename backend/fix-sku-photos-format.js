import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

// 修复SKU图片格式
async function fixSkuPhotosFormat() {
  const connection = await mysql.create_connection(dbConfig);
  
  try {
    console.log('🔧 修复SKU图片格式...');
    
    // 获取所有SKU记录
    const [skus] = await connection.execute(`
      SELECT id, sku_code, sku_name, photos 
      FROM product_skus 
      ORDER BY sku_code
    `);
    
    console.log(`找到 ${skus.length} 条SKU记录需要修复`);
    
    for (const sku of skus) {
      try {
        let photosArray = [];
        
        if (sku.photos) {
          // 如果photos是字符串，转换为数组
          if (typeof sku.photos === 'string') {
            // 尝试解析JSON
            try {
              photosArray = JSON.parse(sku.photos);
            } catch (e) {
              // 如果不是JSON，作为单个URL处理
              photosArray = [sku.photos];
            }
          } else if (Array.is_array(sku.photos)) {
            photosArray = sku.photos;
          }
        }
        
        // 更新数据库
        await connection.execute(
          'UPDATE product_skus SET photos = ? WHERE id = ?',
          [JSON.stringify(photosArray), sku.id]
        );
        
        console.log(`✅ 修复 ${sku.sku_code}: ${photosArray.length}张图片`);
        
      } catch (error) {
        console.error(`❌ 修复失败 ${sku.sku_code}:`, error.message);
      }
    }
    
    console.log('\n✅ SKU图片格式修复完成！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 执行修复
fixSkuPhotosFormat().catch(console.error);