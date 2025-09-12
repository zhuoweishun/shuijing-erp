import fetch from 'node-fetch';

// 测试API响应的时间字段
async function testApiResponse() {
  try {
    // 首先登录获取token
    const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'boss',
        password: 'boss123'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('登录失败:', loginData.message);
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ 登录成功，获取到token');
    
    // 获取财务流水账数据
    const transactionsResponse = await fetch('http://localhost:3001/api/v1/financial/transactions?limit=3', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const transactionsData = await transactionsResponse.json();
    if (!transactionsData.success) {
      console.error('获取流水账失败:', transactionsData.message);
      return;
    }
    
    console.log('\n🔍 API返回的流水账数据结构:');
    console.log('总记录数:', transactionsData.data.pagination.total);
    
    if (transactionsData.data.transactions.length > 0) {
      console.log('\n📋 前3条记录的时间字段:');
      transactionsData.data.transactions.for_each((transaction, index) => {
        console.log(`\n记录 ${index + 1}: ${transaction.description}`);
        console.log(`  - transactionDate: ${transaction.transactionDate}`);
        console.log(`  - created_at: ${transaction.created_at}`);
        
        // 解析时间并显示
        const transactionDate = new Date(transaction.transactionDate);
        const created_at = new Date(transaction.created_at);
        
        console.log(`  - transactionDate 解析: ${transactionDate.to_locale_string('zh-CN')}`);
        console.log(`  - created_at 解析: ${created_at.to_locale_string('zh-CN')}`);
        
        // 检查是否为未来时间
        const now = new Date();
        if (transactionDate > now) {
          console.log(`  ⚠️ transactionDate 是未来时间!`);
        }
        if (createdAt > now) {
          console.log(`  ⚠️ created_at 是未来时间!`);
        }
      });
    } else {
      console.log('没有找到流水账记录');
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testApiResponse();