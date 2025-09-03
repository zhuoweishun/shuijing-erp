import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function diagnoseImageIssues() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('开始诊断图片问题...');
    
    // 问题采购编号列表
    const problemCodes = [
      // 完全没显示的
      'CG20250831498682', 'CG20250831126842', 'CG20250831903937', 
      'CG20250831989114', 'CG20250831492351', 'CG20250831531810', 
      'CG20250831263295', 'CG20250831955817', 'CG20250831949918',
      // 只显示一半的
      'CG20250831806055', 'CG20250831886477', 'CG20250831022476'
    ];
    
    console.log(`检查 ${problemCodes.length} 个问题记录...\n`);
    
    // 1. 查询数据库中这些记录的photos字段
    const placeholders = problemCodes.map(() => '?').join(',');
    const [rows] = await connection.execute(
      `SELECT purchaseCode, productName, photos FROM purchases WHERE purchaseCode IN (${placeholders})`,
      problemCodes
    );
    
    console.log('=== 数据库记录检查 ===');
    const imageFiles = new Set();
    
    for (const row of rows) {
      console.log(`\n${row.purchaseCode} - ${row.productName}`);
      console.log(`Photos字段: ${row.photos}`);
      
      try {
        const photos = JSON.parse(row.photos);
        if (Array.isArray(photos) && photos.length > 0) {
          const imageUrl = photos[0];
          console.log(`图片URL: ${imageUrl}`);
          
          // 提取文件名
          if (imageUrl && imageUrl.includes('/uploads/purchases/')) {
            const filename = imageUrl.split('/uploads/purchases/')[1];
            if (filename) {
              imageFiles.add(filename);
              console.log(`提取的文件名: ${filename}`);
            }
          }
        } else {
          console.log('❌ photos数组为空或无效');
        }
      } catch (e) {
        console.log(`❌ JSON解析失败: ${e.message}`);
      }
    }
    
    // 2. 检查图片文件是否存在
    console.log('\n=== 图片文件存在性检查 ===');
    const uploadsDir = path.join(__dirname, 'uploads', 'purchases');
    
    for (const filename of imageFiles) {
      const filePath = path.join(uploadsDir, filename);
      const exists = fs.existsSync(filePath);
      
      console.log(`\n文件: ${filename}`);
      console.log(`路径: ${filePath}`);
      console.log(`存在: ${exists ? '✅' : '❌'}`);
      
      if (exists) {
        try {
          const stats = fs.statSync(filePath);
          console.log(`大小: ${(stats.size / 1024).toFixed(2)} KB`);
          console.log(`修改时间: ${stats.mtime.toLocaleString()}`);
          
          // 检查文件是否为0字节或异常小
          if (stats.size === 0) {
            console.log('⚠️  警告: 文件大小为0字节');
          } else if (stats.size < 1024) {
            console.log('⚠️  警告: 文件异常小 (< 1KB)');
          }
        } catch (e) {
          console.log(`❌ 读取文件信息失败: ${e.message}`);
        }
      }
    }
    
    // 3. 测试URL访问性
    console.log('\n=== URL访问性测试 ===');
    
    for (const filename of imageFiles) {
      const testUrl = `http://localhost:3001/uploads/purchases/${filename}`;
      console.log(`\n测试URL: ${testUrl}`);
      
      try {
        // 使用fetch测试URL（需要在Node.js 18+中可用）
        const response = await fetch(testUrl, { method: 'HEAD' });
        console.log(`状态码: ${response.status}`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);
        console.log(`Content-Length: ${response.headers.get('content-length')}`);
        
        if (response.status === 200) {
          console.log('✅ URL可正常访问');
        } else {
          console.log('❌ URL访问异常');
        }
      } catch (e) {
        console.log(`❌ URL测试失败: ${e.message}`);
      }
    }
    
    // 4. 总结分析
    console.log('\n=== 问题总结 ===');
    console.log(`检查的采购记录数: ${rows.length}`);
    console.log(`涉及的图片文件数: ${imageFiles.size}`);
    
    // 检查是否有记录在数据库中但文件不存在
    const missingFiles = [];
    const corruptedFiles = [];
    
    for (const filename of imageFiles) {
      const filePath = path.join(uploadsDir, filename);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(filename);
      } else {
        const stats = fs.statSync(filePath);
        if (stats.size === 0 || stats.size < 1024) {
          corruptedFiles.push(filename);
        }
      }
    }
    
    if (missingFiles.length > 0) {
      console.log(`\n❌ 缺失的图片文件 (${missingFiles.length}个):`);
      missingFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    if (corruptedFiles.length > 0) {
      console.log(`\n⚠️  可能损坏的图片文件 (${corruptedFiles.length}个):`);
      corruptedFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    if (missingFiles.length === 0 && corruptedFiles.length === 0) {
      console.log('\n✅ 所有图片文件都存在且看起来正常');
      console.log('问题可能出现在前端显示逻辑或CSS样式上');
    }
    
  } catch (error) {
    console.error('诊断过程中出错:', error);
  } finally {
    await connection.end();
  }
}

diagnoseImageIssues();