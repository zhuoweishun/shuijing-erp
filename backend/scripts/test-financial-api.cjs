const mysql = require('mysql2/promise');
require('dotenv').config();

// 测试财务API的计算结果
async function testFinancialAPI() {
  try {
    console.log('🧪 测试财务API...');
    
    // 测试API端点
    const apiUrl = 'http://localhost:3001/api/v1';
    
    // 获取token（如果需要的话，这里先跳过认证测试）
    console.log('\n📊 测试财务概览API...');
    
    try {
      const response = await fetch(`${apiUrl}/financial/overview/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
          // 暂时跳过认证测试
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API响应成功:');
        console.log(JSON.stringify(data, null, 2));
        
        // 验证数据
        if (data.success && data.data) {
          const overview = data.data;
          console.log('\n📈 财务数据验证:');
          console.log(`本月收入: ¥${overview.this_month.income}`);
          console.log(`年度收入: ¥${overview.this_year.income}`);
          console.log(`今日收入: ¥${overview.today.income}`);
          
          // 检查是否修复成功
          if (overview.this_month.income < 2000 && overview.this_month.income > 500) {
            console.log('🎉 财务数据修复成功！收入显示正常。');
          } else {
            console.log('⚠️ 财务数据可能仍有问题。');
          }
        }
      } else {
        console.log(`❌ API请求失败: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log('错误响应:', errorText);
      }
    } catch (fetchError) {
      console.log('❌ 网络请求错误:', fetchError.message);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 执行测试
testFinancialAPI().catch(console.error);