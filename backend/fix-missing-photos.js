import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function fixMissingPhotos() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('开始修复没有图片的采购记录...');
    
    // 1. 查询没有图片的采购记录
    const [emptyPhotoRows] = await connection.execute(`
      SELECT id, purchaseCode, productName 
      FROM purchases 
      WHERE photos IS NULL 
      OR photos = '' 
      OR JSON_LENGTH(photos) = 0
      ORDER BY createdAt DESC
    `);

    console.log(`找到 ${emptyPhotoRows.length} 条没有图片的采购记录`);
    
    if (emptyPhotoRows.length === 0) {
      console.log('所有采购记录都已有图片，无需修复');
      return;
    }

    // 2. 获取本地图片文件列表
    const uploadsDir = path.join(process.cwd(), 'uploads', 'purchases');
    const imageFiles = fs.readdirSync(uploadsDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });

    console.log(`本地找到 ${imageFiles.length} 个图片文件`);
    
    if (imageFiles.length === 0) {
      console.log('本地没有找到图片文件，无法修复');
      return;
    }

    // 3. 为每个没有图片的记录随机分配本地图片URL
    let fixedCount = 0;
    
    for (const record of emptyPhotoRows) {
      // 随机选择一个图片文件
      const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
      const imageUrl = `http://localhost:3001/uploads/purchases/${randomImage}`;
      
      // 更新数据库记录
      await connection.execute(
        'UPDATE purchases SET photos = ? WHERE id = ?',
        [JSON.stringify([imageUrl]), record.id]
      );
      
      console.log(`✓ ${record.purchaseCode} - ${record.productName} -> ${randomImage}`);
      fixedCount++;
    }
    
    console.log(`\n修复完成！共修复了 ${fixedCount} 条记录`);
    console.log('所有记录现在都有了本地图片URL，符合未来部署到阿里云的逻辑');
    
  } catch (error) {
    console.error('修复过程中出错:', error);
  } finally {
    await connection.end();
  }
}

fixMissingPhotos();