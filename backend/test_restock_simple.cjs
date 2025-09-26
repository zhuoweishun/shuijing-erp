const https = require('https');
const http = require('http');

// 测试配置
const testConfig = {
  baseUrl: 'http://192.168.50.160:3001',
  skuId: 'cmfxnpvr40002dddaim03a4c3',
  authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWZ1cnI1ZDkwMDAxdHVvZTJ0bnZlOWFpIiwicm9sZSI6IkJPU1MiLCJpYXQiOjE3Mzc3OTQ4NzIsImV4cCI6MTczODM5OTY3Mn0.valid_signature_here'
};

// HTTP请求函数
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.hostname === 'localhost' || options.hostname.startsWith('192.168') ? http : https;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// 获取有效的认证token
async function getAuthToken() {
  console.log('正在获取认证token...');
  
  const loginOptions = {
    hostname: '192.168.50.160',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const loginData = JSON.stringify({
    user_name: 'boss',
    password: '123456'
  });
  
  const loginResult = await makeRequest(loginOptions, loginData);
  
  if (loginResult.statusCode === 200 && loginResult.data.success) {
    console.log('✅ 登录成功，获取到token');
    return loginResult.data.data.token;
  } else {
    throw new Error('登录失败: ' + (loginResult.data.message || '未知错误'));
  }
}

// 测试补货功能
async function testRestock() {
  console.log('开始测试SKU补货功能...');
  console.log('SKU ID:', testConfig.skuId);
  
  try {
    // 获取有效的token
    const authToken = await getAuthToken();
    testConfig.authToken = authToken;
    // 1. 测试补货信息接口
    console.log('\n1. 获取补货信息...');
    const restockInfoOptions = {
      hostname: '192.168.50.160',
      port: 3001,
      path: `/api/v1/skus/${testConfig.skuId}/restock-info`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testConfig.authToken}`
      }
    };
    
    const restockInfoResult = await makeRequest(restockInfoOptions);
    console.log('补货信息响应状态:', restockInfoResult.statusCode);
    console.log('补货信息响应数据:', JSON.stringify(restockInfoResult.data, null, 2));
    
    if (restockInfoResult.statusCode === 200 && restockInfoResult.data.success) {
      const restockInfo = restockInfoResult.data.data;
      
      if (restockInfo.can_restock) {
        // 2. 测试补货操作
        console.log('\n2. 执行补货操作...');
        const restockOptions = {
          hostname: '192.168.50.160',
          port: 3001,
          path: `/api/v1/skus/${testConfig.skuId}/restock`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testConfig.authToken}`
          }
        };
        
        const restockData = JSON.stringify({ quantity: 1 });
        const restockResult = await makeRequest(restockOptions, restockData);
        
        console.log('补货操作响应状态:', restockResult.statusCode);
        console.log('补货操作响应数据:', JSON.stringify(restockResult.data, null, 2));
        
        if (restockResult.statusCode === 200 && restockResult.data.success) {
          console.log('\n✅ 补货测试成功！');
        } else {
          console.log('\n❌ 补货操作失败:', restockResult.data.message || '未知错误');
        }
      } else {
        console.log('\n⚠️ 当前无法补货，原因:');
        if (restockInfo.insufficient_materials) {
          restockInfo.insufficient_materials.forEach(material => {
            console.log(`- ${material.material_name}: 需要${material.required}，库存${material.available}`);
          });
        }
      }
    } else {
      console.log('\n❌ 获取补货信息失败:', restockInfoResult.data.message || '未知错误');
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testRestock();