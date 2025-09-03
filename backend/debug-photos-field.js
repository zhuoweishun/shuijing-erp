import mysql from 'mysql2/promise';

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

// 需要检查的采购记录ID列表
const purchaseIds = [
  'CG20250831531810',
  'CG20250831955817', 
  'CG20250831949918'
];

async function debugPhotosField() {
  let connection;
  
  try {
    console.log('开始调试photos字段...');
    
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 查询采购记录
    const placeholders = purchaseIds.map(() => '?').join(',');
    const [records] = await connection.execute(
      `SELECT id, purchaseCode, productName, photos FROM purchases WHERE purchaseCode IN (${placeholders})`,
      purchaseIds
    );
    
    console.log(`找到 ${records.length} 条采购记录`);
    
    for (const record of records) {
      console.log(`\n=== ${record.purchaseCode} - ${record.productName} ===`);
      console.log('photos字段类型:', typeof record.photos);
      console.log('photos字段值:', record.photos);
      console.log('photos字段长度:', record.photos ? record.photos.length : 'null');
      
      if (record.photos) {
        console.log('前50个字符:', record.photos.substring(0, 50));
        
        // 尝试不同的解析方式
        try {
          const parsed = JSON.parse(record.photos);
          console.log('JSON解析成功:', parsed);
          console.log('解析结果类型:', typeof parsed);
          console.log('是否为数组:', Array.isArray(parsed));
        } catch (error) {
          console.log('JSON解析失败:', error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('调试过程中出错:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行调试
debugPhotosField();