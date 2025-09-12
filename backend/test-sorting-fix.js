import fetch from 'node-fetch';

// 测试流水账排序修复效果
async function testSortingFix() {
  try {
    console.log('🔍 测试流水账排序修复效果...');
    console.log('=' .repeat(60));
    
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
    
    if (!loginResponse.ok) {
      console.error('❌ 登录请求失败:', loginResponse.status);
      return;
    }
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ 登录失败:', loginData.message);
      // 尝试其他密码
      console.log('🔄 尝试其他登录凭据...');
      const altLoginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'employee',
          password: 'employee123'
        })
      });
      
      const altLoginData = await altLoginResponse.json();
      if (!altLoginData.success) {
        console.error('❌ 所有登录尝试都失败了');
        return;
      }
      
      console.log('✅ 使用employee账户登录成功');
      var token = altLoginData.data.token;
    } else {
      console.log('✅ 使用boss账户登录成功');
      var token = loginData.data.token;
    }
    
    // 获取财务流水账数据
    const transactionsResponse = await fetch('http://localhost:3001/api/v1/financial/transactions?limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!transactionsResponse.ok) {
      console.error('❌ 获取流水账请求失败:', transactionsResponse.status);
      return;
    }
    
    const transactionsData = await transactionsResponse.json();
    if (!transactionsData.success) {
      console.error('❌ 获取流水账失败:', transactionsData.message);
      return;
    }
    
    console.log('\n📊 流水账排序测试结果:');
    console.log(`总记录数: ${transactionsData.data.pagination.total}`);
    
    if (transactionsData.data.transactions.length > 0) {
      console.log('\n📋 前10条记录（按时间降序排列）:');
      console.log('-'.repeat(80));
      
      let previousTime = null;
      let sortingCorrect = true;
      
      transactionsData.data.transactions.for_each((transaction, index) => {
        const created_at = new Date(transaction.created_at);
        const transactionDate = new Date(transaction.transactionDate);
        
        // 检查排序是否正确
        if (previousTime && created_at > previousTime) {
          sortingCorrect = false;
        }
        previousTime = createdAt;
        
        // 显示记录信息
        const typeIcon = transaction.type === 'income' ? '📈' : '📉';
        const categoryLabel = {
          'purchase': '采购支出',
          'production': '制作成本',
          'sale': '销售收入',
          'refund': '退款退回'
        }[transaction.category] || transaction.category;
        
        console.log(`${index + 1}. ${typeIcon} [${categoryLabel}] ${transaction.description}`);
        console.log(`   💰 金额: ¥${transaction.amount.to_fixed(2)}`);
        console.log(`   📅 创建时间: ${created_at.to_locale_string('zh-CN')}`);
        console.log(`   📅 交易时间: ${transactionDate.to_locale_string('zh-CN')}`);
        console.log(`   📝 详情: ${transaction.details}`);
        console.log('');
      });
      
      // 排序验证结果
      console.log('🔍 排序验证结果:');
      console.log('-'.repeat(60));
      if (sortingCorrect) {
        console.log('✅ 排序正确：记录按创建时间降序排列');
      } else {
        console.log('❌ 排序错误：发现时间顺序不正确的记录');
      }
      
      // 检查是否还有制作成本强制置顶
      const firstRecord = transactionsData.data.transactions[0];
      const hasProductionFirst = firstRecord.category === 'production';
      const allProductionFirst = transactionsData.data.transactions.slice(0, 3).every(t => t.category === 'production');
      
      console.log('\n🔧 制作成本置顶检查:');
      console.log('-'.repeat(60));
      if (allProductionFirst && transactionsData.data.transactions.length > 3) {
        console.log('⚠️  可能仍存在制作成本强制置顶问题');
      } else {
        console.log('✅ 制作成本强制置顶问题已修复');
      }
      
      // 时间显示检查
      console.log('\n⏰ 时间显示检查:');
      console.log('-'.repeat(60));
      const now = new Date();
      let hasFutureTime = false;
      
      transactionsData.data.transactions.for_each((transaction, index) => {
        const created_at = new Date(transaction.created_at);
        const transactionDate = new Date(transaction.transactionDate);
        
        if (created_at > now || transactionDate > now) {
          hasFutureTime = true;
          console.log(`⚠️  记录 ${index + 1} 存在未来时间:`);
          if (createdAt > now) {
            console.log(`   创建时间: ${created_at.to_locale_string('zh-CN')} (未来时间!)`);
          }
          if (transactionDate > now) {
            console.log(`   交易时间: ${transactionDate.to_locale_string('zh-CN')} (未来时间!)`);
          }
        }
      });
      
      if (!hasFutureTime) {
        console.log('✅ 所有时间显示正常，无未来时间');
      }
      
      console.log(`\n🕐 当前系统时间: ${now.to_locale_string('zh-CN')}`);
      
    } else {
      console.log('❌ 没有找到流水账记录');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testSortingFix();