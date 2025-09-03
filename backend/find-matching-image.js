import fs from 'fs';
import path from 'path';

async function findMatchingImage() {
  try {
    console.log('=== 查找草莓晶手串对应的图片文件 ===');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'purchases');
    const files = fs.readdirSync(uploadsDir);
    
    console.log(`\n找到 ${files.length} 个图片文件:`);
    
    // 草莓晶手串记录的更新时间: 2025-08-31 17:32:01
    // 对应的时间戳大约是: 1756362721000 (17:32:01)
    const targetTime = new Date('2025-08-31T17:32:01+08:00').getTime();
    console.log(`\n目标时间戳: ${targetTime} (${new Date(targetTime).toLocaleString()})`);
    
    // 分析每个文件的时间戳
    const fileAnalysis = files.map(filename => {
      const timestampMatch = filename.match(/^(\d+)_/);
      if (timestampMatch) {
        const timestamp = parseInt(timestampMatch[1]);
        const fileTime = new Date(timestamp);
        const timeDiff = Math.abs(timestamp - targetTime);
        
        return {
          filename,
          timestamp,
          fileTime: fileTime.toLocaleString(),
          timeDiff,
          timeDiffMinutes: Math.round(timeDiff / 60000)
        };
      }
      return null;
    }).filter(Boolean);
    
    // 按时间差排序
    fileAnalysis.sort((a, b) => a.timeDiff - b.timeDiff);
    
    console.log('\n按时间接近程度排序的文件:');
    fileAnalysis.slice(0, 10).forEach((file, index) => {
      console.log(`${index + 1}. ${file.filename}`);
      console.log(`   时间: ${file.fileTime}`);
      console.log(`   时间差: ${file.timeDiffMinutes} 分钟`);
      console.log('');
    });
    
    // 找到最接近的文件（时间差在30分钟内）
    const closestFiles = fileAnalysis.filter(file => file.timeDiffMinutes <= 30);
    
    if (closestFiles.length > 0) {
      console.log('🎯 可能匹配的文件:');
      closestFiles.forEach(file => {
        console.log(`   ${file.filename} (时间差: ${file.timeDiffMinutes} 分钟)`);
      });
    } else {
      console.log('❌ 没有找到时间接近的文件');
    }
    
  } catch (error) {
    console.error('查找失败:', error);
  }
}

findMatchingImage();