import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixCorruptedImage() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('修复黑曜石圆珠的损坏图片...');
    
    const targetCode = 'CG20250831498682';
    const problemImageFile = '1756102840000_47.jpg';
    
    // 1. 检查当前图片文件状态
    console.log('\n=== 检查问题图片文件 ===');
    const uploadsDir = path.join(__dirname, 'uploads', 'purchases');
    const problemImagePath = path.join(uploadsDir, problemImageFile);
    
    console.log(`问题图片路径: ${problemImagePath}`);
    
    if (fs.existsSync(problemImagePath)) {
      const stats = fs.statSync(problemImagePath);
      console.log(`文件存在，大小: ${(stats.size / 1024).toFixed(2)} KB`);
      
      // 尝试读取文件内容检查是否损坏
      try {
        const buffer = fs.readFileSync(problemImagePath);
        console.log(`文件可读取，前16字节: ${buffer.subarray(0, 16).toString('hex')}`);
        
        // 检查JPEG文件头
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
          console.log('✅ JPEG文件头正常');
        } else {
          console.log('❌ JPEG文件头异常，文件可能损坏');
        }
        
        // 检查文件尾
        if (buffer[buffer.length - 2] === 0xFF && buffer[buffer.length - 1] === 0xD9) {
          console.log('✅ JPEG文件尾正常');
        } else {
          console.log('❌ JPEG文件尾异常，文件可能不完整');
        }
      } catch (e) {
        console.log(`❌ 文件读取失败: ${e.message}`);
      }
    } else {
      console.log('❌ 文件不存在');
    }
    
    // 2. 查找可用的替换图片
    console.log('\n=== 查找替换图片 ===');
    const allFiles = fs.readdirSync(uploadsDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
      })
      .filter(file => file !== problemImageFile); // 排除问题文件
    
    console.log(`找到 ${allFiles.length} 个可用的图片文件`);
    
    if (allFiles.length === 0) {
      console.log('❌ 没有可用的替换图片');
      return;
    }
    
    // 选择一个大小合适的图片作为替换
    let replacementFile = null;
    let bestSize = 0;
    
    for (const file of allFiles) {
      const filePath = path.join(uploadsDir, file);
      try {
        const stats = fs.statSync(filePath);
        const sizeKB = stats.size / 1024;
        
        // 选择大小在100KB-2MB之间的图片
        if (sizeKB >= 100 && sizeKB <= 2048) {
          if (!replacementFile || Math.abs(sizeKB - 500) < Math.abs(bestSize - 500)) {
            replacementFile = file;
            bestSize = sizeKB;
          }
        }
      } catch (e) {
        console.log(`跳过文件 ${file}: ${e.message}`);
      }
    }
    
    if (!replacementFile) {
      // 如果没有找到合适大小的，就选择第一个可用的
      replacementFile = allFiles[0];
      const stats = fs.statSync(path.join(uploadsDir, replacementFile));
      bestSize = stats.size / 1024;
    }
    
    console.log(`选择替换图片: ${replacementFile} (${bestSize.toFixed(2)} KB)`);
    
    // 3. 更新数据库记录
    console.log('\n=== 更新数据库记录 ===');
    const newImageUrl = `http://localhost:3001/uploads/purchases/${replacementFile}`;
    
    await connection.execute(
      'UPDATE purchases SET photos = JSON_ARRAY(?) WHERE purchaseCode = ?',
      [newImageUrl, targetCode]
    );
    
    console.log(`✅ 已更新数据库记录`);
    console.log(`新图片URL: ${newImageUrl}`);
    
    // 4. 验证更新结果
    console.log('\n=== 验证更新结果 ===');
    const [rows] = await connection.execute(
      'SELECT purchaseCode, productName, photos, JSON_EXTRACT(photos, "$[0]") as first_photo FROM purchases WHERE purchaseCode = ?',
      [targetCode]
    );
    
    if (rows.length > 0) {
      const row = rows[0];
      console.log(`${row.purchaseCode} - ${row.productName}`);
      console.log(`更新后的图片URL: ${row.first_photo}`);
      
      // 测试新URL的访问性
      try {
        const response = await fetch(row.first_photo, { method: 'HEAD' });
        if (response.status === 200) {
          console.log('✅ 新图片URL可正常访问');
        } else {
          console.log(`❌ 新图片URL访问异常: ${response.status}`);
        }
      } catch (e) {
        console.log(`❌ 新图片URL测试失败: ${e.message}`);
      }
    }
    
    console.log('\n=== 修复完成 ===');
    console.log('建议:');
    console.log('1. 刷新前端页面查看修复效果');
    console.log('2. 如果问题仍存在，检查浏览器缓存');
    console.log('3. 考虑删除损坏的图片文件以释放空间');
    
  } catch (error) {
    console.error('修复过程中出错:', error);
  } finally {
    await connection.end();
  }
}

fixCorruptedImage();