const http = require('http');

// 测试SKU补货信息HTTP API
async function testRestockInfoHTTP() {
  try {
    console.log('🔍 [HTTP测试] 开始测试SKU补货信息HTTP API...');
    
    // 测试用的SKU ID（从之前的测试中获得）
    const testSkuId = 'cmfurr5d90002tuoe2tnve9ai';
    const apiUrl = `http://192.168.50.160:3001/api/v1/skus/${testSkuId}/restock-info`;
    
    console.log(`🌐 请求URL: ${apiUrl}`);
    
    // 模拟认证token（实际使用中需要真实的token）
    const authToken = 'test-token'; // 这里需要替换为真实的token
    
    const options = {
      hostname: '192.168.50.160',
      port: 3001,
      path: `/api/v1/skus/${testSkuId}/restock-info`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    };
    
    const req = http.request(options, (res) => {
      console.log(`📊 响应状态码: ${res.statusCode}`);
      console.log(`📋 响应头:`, res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('\n✅ [响应数据]:');
          console.log(JSON.stringify(response, null, 2));
          
          if (response.success) {
            console.log('\n🎯 [解析结果]:');
            const restockInfo = response.data;
            console.log(`   SKU编码: ${restockInfo.sku_code}`);
            console.log(`   SKU名称: ${restockInfo.sku_name}`);
            console.log(`   当前库存: ${restockInfo.current_quantity}`);
            console.log(`   可以补货: ${restockInfo.can_restock ? '✅ 是' : '❌ 否'}`);
            console.log(`   所需原材料数量: ${restockInfo.required_materials.length}`);
            
            if (restockInfo.required_materials.length > 0) {
              console.log('\n📦 [所需原材料]:');
              restockInfo.required_materials.forEach((material, index) => {
                console.log(`   ${index + 1}. ${material.material_name}`);
                console.log(`      - 类型: ${material.material_type}`);
                console.log(`      - 供应商: ${material.supplier_name}`);
                console.log(`      - 需要数量: ${material.quantity_needed_per_sku} ${material.unit}`);
                console.log(`      - 可用库存: ${material.available_quantity} ${material.unit}`);
                console.log(`      - 库存状态: ${material.is_sufficient ? '✅ 充足' : '❌ 不足'}`);
                console.log(`      - 单价: ¥${material.unit_cost}`);
              });
            }
            
            if (restockInfo.insufficient_materials && restockInfo.insufficient_materials.length > 0) {
              console.log(`\n⚠️  [库存不足的原材料]: ${restockInfo.insufficient_materials.join(', ')}`);
            }
          } else {
            console.log(`❌ [API错误]: ${response.message}`);
          }
          
        } catch (parseError) {
          console.error('❌ [解析错误]:', parseError.message);
          console.log('原始响应:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ [请求错误]:', error.message);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ [测试失败]:', error.message);
  }
}

// 运行HTTP测试
testRestockInfoHTTP();

// 等待5秒后退出
setTimeout(() => {
  console.log('\n✅ [完成] HTTP API测试完成!');
  process.exit(0);
}, 5000);