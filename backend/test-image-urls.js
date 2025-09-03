import { fileURLToPath } from 'url';
import path from 'path';

async function testImageUrls() {
  console.log('测试图片URL访问性...');
  
  const imageUrls = [
    {
      code: 'CG20250831043270',
      name: '月光石手串',
      url: 'http://localhost:3001/uploads/purchases/1756362774331_272.jpeg'
    },
    {
      code: 'CG20250831498682', 
      name: '黑曜石圆珠',
      url: 'http://localhost:3001/uploads/purchases/1756102840000_47.jpg'
    },
    {
      code: 'CG20250831962612',
      name: '紫水晶散珠', 
      url: 'http://localhost:3001/uploads/purchases/1756227752158_158.png'
    }
  ];
  
  console.log('\n=== URL访问性测试 ===');
  
  for (const item of imageUrls) {
    console.log(`\n${item.code} - ${item.name}`);
    console.log(`测试URL: ${item.url}`);
    
    try {
      const response = await fetch(item.url, { method: 'HEAD' });
      console.log(`状态码: ${response.status}`);
      
      if (response.status === 200) {
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        console.log(`✅ URL可正常访问`);
        console.log(`Content-Type: ${contentType}`);
        console.log(`Content-Length: ${contentLength} bytes`);
      } else {
        console.log(`❌ URL访问异常 - 状态码: ${response.status}`);
      }
    } catch (e) {
      console.log(`❌ URL测试失败: ${e.message}`);
    }
  }
  
  console.log('\n=== 前端显示建议 ===');
  console.log('如果图片URL都能正常访问，但前端显示相同，可能的原因:');
  console.log('1. 浏览器缓存 - 建议强制刷新页面 (Ctrl+F5)');
  console.log('2. 前端图片组件缓存 - 检查React组件的key属性');
  console.log('3. 图片懒加载问题 - 检查图片加载逻辑');
  console.log('4. CSS样式覆盖 - 检查图片显示样式');
  
  console.log('\n建议测试步骤:');
  console.log('1. 在浏览器中直接访问这些图片URL');
  console.log('2. 检查浏览器开发者工具的Network面板');
  console.log('3. 清除浏览器缓存后重新加载页面');
}

testImageUrls();