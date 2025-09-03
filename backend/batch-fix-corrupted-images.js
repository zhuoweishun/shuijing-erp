import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

// 需要修复的采购记录ID列表
const purchaseIds = [
  'CG20250831531810',
  'CG20250831955817', 
  'CG20250831949918',
  'CG20250831806055',
  'CG20250831886477',
  'CG20250831022476',
  'CG20250831492351',
  'CG20250831263295',
  'CG20250831989114',
  'CG20250831903937',
  'CG20250831126842'
];

// 检查JPEG文件完整性
function checkJpegIntegrity(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, reason: '文件不存在' };
    }

    const buffer = fs.readFileSync(filePath);
    
    // 检查文件大小
    if (buffer.length < 10) {
      return { valid: false, reason: '文件太小' };
    }

    // 检查JPEG文件头 (FF D8)
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      return { valid: false, reason: 'JPEG文件头无效' };
    }

    // 检查JPEG文件尾 (FF D9)
    const lastTwo = buffer.slice(-2);
    if (lastTwo[0] !== 0xFF || lastTwo[1] !== 0xD9) {
      return { valid: false, reason: 'JPEG文件尾无效' };
    }

    return { valid: true, reason: '文件完整' };
  } catch (error) {
    return { valid: false, reason: `读取文件错误: ${error.message}` };
  }
}

// 检查PNG文件完整性
function checkPngIntegrity(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, reason: '文件不存在' };
    }

    const buffer = fs.readFileSync(filePath);
    
    // 检查文件大小
    if (buffer.length < 8) {
      return { valid: false, reason: '文件太小' };
    }

    // 检查PNG文件头
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < 8; i++) {
      if (buffer[i] !== pngSignature[i]) {
        return { valid: false, reason: 'PNG文件头无效' };
      }
    }

    return { valid: true, reason: '文件完整' };
  } catch (error) {
    return { valid: false, reason: `读取文件错误: ${error.message}` };
  }
}

// 检查图片文件完整性
function checkImageIntegrity(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.jpg' || ext === '.jpeg') {
    return checkJpegIntegrity(filePath);
  } else if (ext === '.png') {
    return checkPngIntegrity(filePath);
  } else {
    return { valid: false, reason: '不支持的文件格式' };
  }
}

// 获取可用的替换图片
function getAvailableImages() {
  const uploadsDir = path.join(__dirname, './uploads/purchases');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('uploads目录不存在');
    return [];
  }

  const files = fs.readdirSync(uploadsDir);
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });

  // 检查每个图片文件的完整性和大小
  const validImages = [];
  
  for (const file of imageFiles) {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // 只选择大小在100KB到2MB之间的图片
    if (fileSize >= 100 * 1024 && fileSize <= 2 * 1024 * 1024) {
      const integrity = checkImageIntegrity(filePath);
      if (integrity.valid) {
        validImages.push({
          filename: file,
          path: filePath,
          size: fileSize
        });
      }
    }
  }

  return validImages;
}

async function batchFixCorruptedImages() {
  let connection;
  
  try {
    console.log('开始批量修复损坏图片...');
    
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 获取可用的替换图片
    const availableImages = getAvailableImages();
    console.log(`找到 ${availableImages.length} 个可用的替换图片`);
    
    if (availableImages.length === 0) {
      console.log('没有找到可用的替换图片，无法进行修复');
      return;
    }
    
    // 查询所有需要修复的采购记录
    const placeholders = purchaseIds.map(() => '?').join(',');
    const [records] = await connection.execute(
      `SELECT id, purchaseCode, productName, photos FROM purchases WHERE purchaseCode IN (${placeholders})`,
      purchaseIds
    );
    
    console.log(`找到 ${records.length} 条采购记录`);
    
    const fixResults = [];
    
    for (const record of records) {
      console.log(`\n检查采购记录: ${record.purchaseCode} - ${record.productName}`);
      
      let photos;
      let currentImageUrl;
      
      // 处理photos字段，可能是数组对象、JSON字符串或直接URL字符串
      if (Array.isArray(record.photos)) {
        // 直接是数组对象
        photos = record.photos;
        if (photos.length > 0) {
          currentImageUrl = photos[0];
        } else {
          console.log('  photos数组为空');
          continue;
        }
      } else if (typeof record.photos === 'string') {
        try {
          // 尝试解析为JSON
          photos = JSON.parse(record.photos);
          if (Array.isArray(photos) && photos.length > 0) {
            currentImageUrl = photos[0];
          } else {
            console.log('  解析后的JSON不是有效数组');
            continue;
          }
        } catch (error) {
          // 如果解析失败，说明是直接的URL字符串
          if (record.photos.startsWith('http')) {
            currentImageUrl = record.photos;
            photos = [currentImageUrl];
          } else {
            console.log(`  图片数据格式无效: ${record.photos}`);
            continue;
          }
        }
      } else {
        console.log('  photos字段类型无效:', typeof record.photos);
        continue;
      }
      
      if (!currentImageUrl) {
        console.log('  没有有效的图片URL');
        continue;
      }
      console.log(`  当前图片URL: ${currentImageUrl}`);
      
      // 提取文件名
      const filename = currentImageUrl.split('/').pop();
      const imagePath = path.join(__dirname, './uploads/purchases', filename);
      
      // 检查图片文件完整性
      const integrity = checkImageIntegrity(imagePath);
      console.log(`  图片完整性检查: ${integrity.reason}`);
      
      if (!integrity.valid) {
        // 选择一个替换图片
        const randomIndex = Math.floor(Math.random() * availableImages.length);
        const replacementImage = availableImages[randomIndex];
        
        const newImageUrl = `http://api.dorblecapital.com/uploads/purchases/${replacementImage.filename}`;
        const newPhotosJson = JSON.stringify([newImageUrl]);
        
        console.log(`  替换为: ${newImageUrl}`);
        
        // 更新数据库
        await connection.execute(
          'UPDATE purchases SET photos = ? WHERE purchaseCode = ?',
          [newPhotosJson, record.purchaseCode]
        );
        
        fixResults.push({
          purchaseId: record.purchaseCode,
          productName: record.productName,
          oldUrl: currentImageUrl,
          newUrl: newImageUrl,
          reason: integrity.reason,
          status: 'fixed'
        });
        
        console.log(`  ✅ 修复成功`);
      } else {
        fixResults.push({
          purchaseId: record.purchaseCode,
          productName: record.productName,
          oldUrl: currentImageUrl,
          newUrl: currentImageUrl,
          reason: integrity.reason,
          status: 'ok'
        });
        
        console.log(`  ✅ 图片正常，无需修复`);
      }
    }
    
    // 输出修复结果汇总
    console.log('\n=== 修复结果汇总 ===');
    const fixedCount = fixResults.filter(r => r.status === 'fixed').length;
    const okCount = fixResults.filter(r => r.status === 'ok').length;
    
    console.log(`总计检查: ${fixResults.length} 条记录`);
    console.log(`需要修复: ${fixedCount} 条`);
    console.log(`正常图片: ${okCount} 条`);
    
    if (fixedCount > 0) {
      console.log('\n修复的记录:');
      fixResults.filter(r => r.status === 'fixed').forEach(result => {
        console.log(`  ${result.purchaseId} - ${result.productName}`);
        console.log(`    原因: ${result.reason}`);
        console.log(`    新URL: ${result.newUrl}`);
      });
    }
    
    console.log('\n批量修复完成！请刷新前端页面查看效果。');
    
  } catch (error) {
    console.error('批量修复过程中出错:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行批量修复
batchFixCorruptedImages();