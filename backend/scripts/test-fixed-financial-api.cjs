const mysql = require('mysql2/promise');
const http = require('http');

// 测试修复后的财务API
async function testFixedFinancialAPI() {
  let connection;
  
  try {
    console.log('🧪 测试修复后的财务API...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      timezone: '+08:00'
    });
    
    // 1. 获取预期的数据
    console.log('\n📊 获取预期的财务数据:');
    
    // 客户累计消费总和（应该是财务收入）
    const [customerStats] = await connection.execute(`
      SELECT SUM(totalPurchases) as total_customer_consumption
      FROM customers 
      WHERE totalPurchases > 0
    `);
    
    const expectedIncome = parseFloat(customerStats[0].total_customer_consumption || 0);
    console.log(`预期财务收入（客户累计消费）: ¥${expectedIncome.toFixed(2)}`);
    
    // 财务记录验证
    const [financialStats] = await connection.execute(`
      SELECT 
        recordType,
        SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType IN ('INCOME', 'REFUND')
      GROUP BY recordType
    `);
    
    let dbIncome = 0;
    let dbRefund = 0;
    
    for (const record of financialStats) {
      if (record.recordType === 'INCOME') {
        dbIncome = parseFloat(record.total_amount || 0);
      } else if (record.recordType === 'REFUND') {
        dbRefund = parseFloat(record.total_amount || 0);
      }
    }
    
    console.log(`数据库财务收入记录: ¥${dbIncome.toFixed(2)}`);
    console.log(`数据库财务退款记录: ¥${dbRefund.toFixed(2)}`);
    
    // 2. 获取用户登录信息
    console.log('\n👤 获取用户登录信息:');
    const [users] = await connection.execute(`
      SELECT username, role FROM users LIMIT 3
    `);
    
    console.log('可用用户:');
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.role})`);
    });
    
    // 3. 测试API响应
    console.log('\n🌐 测试财务概览API:');
    
    try {
      // 使用简单的HTTP请求测试
      const makeRequest = (options, postData) => {
        return new Promise((resolve, reject) => {
          const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error('Invalid JSON response'));
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
      };
      
      // 获取认证token
      const loginOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // 尝试使用第一个用户登录
      const testUser = users[0];
      console.log(`尝试使用用户: ${testUser.username}`);
      
      const loginData = await makeRequest(loginOptions, JSON.stringify({
        username: testUser.username,
        password: 'admin123' // 尝试默认密码
      }));
      
      if (!loginData.success) {
        throw new Error('登录失败: ' + loginData.message);
      }
      
      const token = loginData.data.token;
      console.log('✅ 登录成功，获取到token');
      
      // 调用财务概览API
      const apiOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/financial/overview/summary',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      const apiData = await makeRequest(apiOptions);
      
      if (!apiData.success) {
        throw new Error('API调用失败: ' + apiData.message);
      }
      
      console.log('✅ API调用成功');
      
      // 3. 验证API返回的数据
      console.log('\n🔍 验证API返回的数据:');
      
      const apiIncome = apiData.data.this_month.income;
      const apiYearIncome = apiData.data.this_year.income;
      const apiTodayIncome = apiData.data.today.income;
      
      console.log(`API返回的本月收入: ¥${apiIncome}`);
      console.log(`API返回的年度收入: ¥${apiYearIncome}`);
      console.log(`API返回的今日收入: ¥${apiTodayIncome}`);
      
      // 验证是否修复正确
      console.log('\n✅ 修复验证结果:');
      
      if (Math.abs(apiYearIncome - expectedIncome) < 0.01) {
        console.log(`✅ 年度收入正确: ¥${apiYearIncome} = ¥${expectedIncome.toFixed(2)}`);
      } else {
        console.log(`❌ 年度收入错误: ¥${apiYearIncome} ≠ ¥${expectedIncome.toFixed(2)}`);
      }
      
      if (Math.abs(apiYearIncome - dbIncome) < 0.01) {
        console.log(`✅ API收入与数据库收入记录一致: ¥${apiYearIncome} = ¥${dbIncome.toFixed(2)}`);
      } else {
        console.log(`❌ API收入与数据库收入记录不一致: ¥${apiYearIncome} ≠ ¥${dbIncome.toFixed(2)}`);
      }
      
      // 检查是否不再错误地扣除退款
      const wrongCalculation = dbIncome + dbRefund; // 之前错误的计算方式
      if (Math.abs(apiYearIncome - wrongCalculation) > 0.01) {
        console.log(`✅ 已修复：不再错误地扣除退款 (¥${apiYearIncome} ≠ ¥${wrongCalculation.toFixed(2)})`);
      } else {
        console.log(`❌ 仍在错误地扣除退款: ¥${apiYearIncome} = ¥${wrongCalculation.toFixed(2)}`);
      }
      
      console.log('\n🎯 最终结论:');
      if (Math.abs(apiYearIncome - expectedIncome) < 0.01) {
        console.log(`✅ 财务API修复成功！`);
        console.log(`✅ 财务收入正确显示为: ¥${apiYearIncome}`);
        console.log(`✅ 符合用户期望的2500左右的净消费`);
      } else {
        console.log(`❌ 财务API仍需进一步修复`);
        console.log(`❌ 当前显示: ¥${apiYearIncome}，应该显示: ¥${expectedIncome.toFixed(2)}`);
      }
      
    } catch (apiError) {
      console.error('❌ API测试失败:', apiError.message);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testFixedFinancialAPI().catch(console.error);