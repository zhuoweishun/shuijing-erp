const mysql = require('mysql2/promise');
const axios = require('axios');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Flameaway3.', 
  database: 'shuijing_erp',
  charset: 'utf8mb4'
};

// API配置
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

async function testMaterialDistributionFix() {
  let connection;
  
  try {
    console.log('🔍 开始测试原材料分布API修复...');
    
    // 1. 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 2. 检查materials表中的散珠数据
    console.log('\n📊 检查materials表中的散珠数据:');
    const [materialRows] = await connection.execute(`
      SELECT 
        m.id,
        m.material_name,
        m.product_type,
        m.remaining_quantity,
        p.purchase_code,
        p.purchase_name
      FROM materials m
      INNER JOIN purchases p ON m.purchase_id = p.id
      WHERE m.product_type = '散珠' AND m.remaining_quantity > 0
      ORDER BY m.id
    `);
    
    console.log(`找到 ${materialRows.length} 条散珠材料记录:`);
    materialRows.forEach(row => {
      console.log(`  - ${row.material_name} (${row.purchase_code}): ${row.remaining_quantity}颗`);
    });
    
    const totalBeads = materialRows.reduce((sum, row) => sum + Number(row.remaining_quantity), 0);
    console.log(`📈 散珠总数: ${totalBeads}颗`);
    
    // 3. 登录获取token
    console.log('\n🔐 登录获取访问令牌...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功');
    
    // 4. 测试原材料分布API
    console.log('\n🧪 测试原材料分布API...');
    const apiResponse = await axios.get(`${API_BASE_URL}/inventory/material-distribution`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 API响应数据:');
    console.log(JSON.stringify(apiResponse.data, null, 2));
    
    // 5. 验证数据一致性
    console.log('\n🔍 验证数据一致性...');
    const apiData = apiResponse.data.data;
    const apiTotalQuantity = apiData.total_remaining_quantity;
    
    console.log(`数据库散珠总数: ${totalBeads}颗`);
    console.log(`API返回总数量: ${apiTotalQuantity}`);
    
    if (apiTotalQuantity === totalBeads) {
      console.log('✅ 数据一致性验证通过！原材料分布API现在正确读取materials表数据');
    } else {
      console.log('❌ 数据不一致！需要进一步检查');
    }
    
    // 6. 检查散珠项目
    const scatteredBeadItems = apiData.items.filter(item => 
      materialRows.some(row => row.material_name === item.name)
    );
    
    console.log(`\n📋 API返回的散珠项目 (${scatteredBeadItems.length}个):`);
    scatteredBeadItems.forEach(item => {
      console.log(`  - ${item.name}: ${item.value}颗 (${item.percentage}%)`);
    });
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('API错误响应:', error.response.data);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
testMaterialDistributionFix();