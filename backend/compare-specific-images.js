import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function compareSpecificImages() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('比较特定采购记录的图片差异...');
    
    // 要比较的采购编号
    const targetCodes = [
      'CG20250831498682', // 黑曜石圆珠
      'CG20250831043270', // 月光石手串
      'CG20250831962612'  // 紫水晶散珠
    ];
    
    console.log(`检查 ${targetCodes.length} 个采购记录的图片...\n`);
    
    // 查询这些记录的详细信息
    const placeholders = targetCodes.map(() => '?').join(',');
    const [rows] = await connection.execute(
      `SELECT purchaseCode, productName, photos, JSON_EXTRACT(photos, '$[0]') as first_photo FROM purchases WHERE purchaseCode IN (${placeholders}) ORDER BY purchaseCode`,
      targetCodes
    );
    
    console.log('=== 数据库记录对比 ===');
    const imageUrls = new Map();
    
    for (const row of rows) {
      console.log(`\n${row.purchaseCode} - ${row.productName}`);
      console.log(`Photos JSON: ${JSON.stringify(row.photos)}`);
      console.log(`第一张图片URL: ${row.first_photo}`);
      
      if (row.first_photo) {
        // 提取文件名
        const filename = row.first_photo.split('/').pop();
        console.log(`图片文件名: ${filename}`);
        imageUrls.set(row.purchaseCode, {
          productName: row.productName,
          url: row.first_photo,
          filename: filename
        });
      }
    }
    
    // 分析图片文件差异
    console.log('\n=== 图片文件差异分析 ===');
    const filenames = Array.from(imageUrls.values()).map(item => item.filename);
    const uniqueFilenames = [...new Set(filenames)];
    
    console.log(`总共使用了 ${uniqueFilenames.length} 个不同的图片文件:`);
    uniqueFilenames.forEach(filename => {
      console.log(`  - ${filename}`);
    });
    
    if (uniqueFilenames.length === 1) {
      console.log('\n⚠️  警告: 所有记录都使用同一个图片文件！');
      console.log('这解释了为什么用户看到的图片都一样。');
    } else {
      console.log('\n✅ 这些记录使用了不同的图片文件，应该显示不同的图片。');
    }
    
    // 检查图片文件的实际存在性和大小
    console.log('\n=== 图片文件详细信息 ===');
    const uploadsDir = path.join(__dirname, 'uploads', 'purchases');
    
    for (const [code, info] of imageUrls) {
      console.log(`\n${code} - ${info.productName}`);
      console.log(`文件名: ${info.filename}`);
      
      const filePath = path.join(uploadsDir, info.filename);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ 文件存在`);
        console.log(`文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`修改时间: ${stats.mtime.toLocaleString()}`);
        
        // 检查文件是否异常
        if (stats.size === 0) {
          console.log('❌ 警告: 文件大小为0字节');
        } else if (stats.size < 1024) {
          console.log('⚠️  警告: 文件异常小 (< 1KB)');
        }
      } else {
        console.log(`❌ 文件不存在: ${filePath}`);
      }
    }
    
    // 提供解决方案建议
    console.log('\n=== 解决方案建议 ===');
    
    if (uniqueFilenames.length === 1) {
      console.log('问题: 多个不同产品使用同一张图片');
      console.log('建议: 为每个产品分配不同的图片文件');
      console.log('\n可以执行以下操作:');
      console.log('1. 从uploads目录中选择不同的图片文件');
      console.log('2. 为每个采购记录分配不同的图片URL');
      console.log('3. 更新数据库中的photos字段');
    } else {
      console.log('图片文件分配正确，每个产品都有不同的图片。');
      console.log('如果前端显示相同，可能是:');
      console.log('1. 浏览器缓存问题');
      console.log('2. 图片加载失败，显示默认图片');
      console.log('3. 前端图片处理逻辑问题');
    }
    
  } catch (error) {
    console.error('比较过程中出错:', error);
  } finally {
    await connection.end();
  }
}

compareSpecificImages();