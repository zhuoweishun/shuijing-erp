const fetch = require('node-fetch');

async function testPriceDistributionAPI() {
  try {
    console.log('=== 测试价格分布API ===');
    
    const response = await fetch('http://localhost:3000/api/inventory/price-distribution', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API返回数据:', JSON.stringify(data, null, 2));
    
    // 检查散珠数量
    const scatterBeadData = data.find(item => item.product_type === 'LOOSE_BEADS');
    if (scatterBeadData) {
      console.log(`\n散珠总数量: ${scatterBeadData.count}`);
      console.log('期望数量: 16');
      console.log(`数量是否正确: ${scatterBeadData.count === 16 ? '✓' : '✗'}`);
    } else {
      console.log('未找到散珠数据');
    }
    
  } catch (error) {
    console.error('测试价格分布API时出错:', error);
  }
}

testPriceDistributionAPI();