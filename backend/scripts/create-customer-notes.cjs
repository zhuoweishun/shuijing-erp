const mysql = require('mysql2/promise');
require('dotenv').config();

// 备注分类
const NOTE_CATEGORIES = ['PREFERENCE', 'BEHAVIOR', 'CONTACT', 'OTHER'];

// 不同类型的备注内容
const NOTE_CONTENTS = {
  PREFERENCE: [
    '喜欢紫水晶手串，偏爱8mm规格',
    '偏爱天然水晶，不喜欢人工合成',
    '喜欢简约款式，不喜欢太复杂的设计',
    '偏爱暖色调的宝石，如粉水晶、玛瑙',
    '喜欢大颗粒的珠子，觉得更有质感',
    '偏爱冷色调，特别喜欢青金石',
    '喜欢有特殊寓意的水晶，如招财、辟邪',
    '偏爱手工制作的饰品，不喜欢机器加工',
    '喜欢搭配不同颜色的水晶',
    '偏爱传统款式，不追求时尚潮流'
  ],
  BEHAVIOR: [
    '每月固定采购，通常在月初下单',
    '喜欢周末下单，工作日很少购买',
    '经常批量购买，一次买多件',
    '喜欢在促销活动时购买',
    '购买前会详细咨询产品信息',
    '喜欢先看实物再决定是否购买',
    '经常为朋友代购水晶饰品',
    '购买决策比较谨慎，会反复比较',
    '喜欢在节假日购买作为礼品',
    '购买后会主动分享使用体验'
  ],
  CONTACT: [
    '电话沟通很愉快，态度很好',
    '微信咨询很多，回复及时',
    '对新品很感兴趣，经常询问',
    '沟通过程中很专业，懂水晶知识',
    '提出了很多有价值的建议',
    '反馈产品使用效果很好',
    '推荐了几个朋友过来购买',
    '对售后服务很满意',
    '希望能定制个性化的饰品',
    '询问过批发价格和合作事宜'
  ],
  OTHER: [
    '朋友推荐的客户，注重品质',
    '是水晶收藏爱好者，很专业',
    '开水晶店的同行，偶尔进货',
    '对价格比较敏感，喜欢优惠',
    '住址比较远，主要靠快递',
    '是老客户介绍的新客户',
    '从事珠宝行业，有专业眼光',
    '年轻客户，追求时尚个性',
    '中年客户，注重寓意和功效',
    '送礼需求较多，包装要求高'
  ]
};

async function createCustomerNotes() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  try {
    console.log('📝 开始为客户添加备注信息...');
    
    // 动态导入fetch
    const { default: fetch } = await import('node-fetch');
    
    // API配置
    const API_BASE_URL = 'http://localhost:3001/api/v1';
    const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWY4aDNnOHAwMDAwdHVwZ3E0Z2NyZncwIiwidXNlcm5hbWUiOiJib3NzIiwicm9sZSI6IkJPU1MiLCJpYXQiOjE3NTc0MTQxMDgsImV4cCI6MTc1ODAxODkwOH0.vGA0gH0Nfv8FacWgnBDfc9ZklcyFfRn3rnPebkDYF1o';
    
    // 获取客户列表
    console.log('\n👥 获取客户列表...');
    const [customers] = await connection.execute(`
      SELECT id, name, phone
      FROM customers 
      ORDER BY createdAt DESC 
      LIMIT 20
    `);
    
    console.log(`找到 ${customers.length} 个客户`);
    
    if (customers.length === 0) {
      console.log('❌ 没有找到客户，无法添加备注');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // 随机选择10-12个客户添加备注
    const noteCustomerCount = Math.floor(Math.random() * 3) + 10; // 10-12个客户
    const noteCustomers = customers.slice(0, noteCustomerCount);
    
    console.log(`\n📝 为 ${noteCustomers.length} 个客户添加备注`);
    
    for (let i = 0; i < noteCustomers.length; i++) {
      const customer = noteCustomers[i];
      
      try {
        console.log(`\n📝 为客户 ${customer.name} 添加备注...`);
        
        // 每个客户添加1-3条不同类型的备注
        const noteCount = Math.floor(Math.random() * 3) + 1;
        const usedCategories = new Set();
        
        for (let j = 0; j < noteCount; j++) {
          try {
            // 随机选择一个未使用的备注分类
            let category;
            let attempts = 0;
            do {
              category = NOTE_CATEGORIES[Math.floor(Math.random() * NOTE_CATEGORIES.length)];
              attempts++;
            } while (usedCategories.has(category) && attempts < 10);
            
            if (usedCategories.has(category)) {
              // 如果所有分类都用过了，跳过
              continue;
            }
            
            usedCategories.add(category);
            
            // 随机选择该分类下的备注内容
            const contents = NOTE_CONTENTS[category];
            const content = contents[Math.floor(Math.random() * contents.length)];
            
            console.log(`   📋 添加${category}备注: ${content}`);
            
            // 调用API添加备注
            const response = await fetch(`${API_BASE_URL}/customers/${customer.id}/notes`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
              },
              body: JSON.stringify({
                category: category,
                content: content
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`   ✅ 备注添加成功`);
              successCount++;
            } else {
              const error = await response.text();
              console.log(`   ❌ 备注添加失败: ${error}`);
              errorCount++;
            }
            
            // 延迟一下避免请求过快
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (error) {
            console.log(`   ❌ 添加备注时出错:`, error.message);
            errorCount++;
          }
        }
        
      } catch (error) {
        console.log(`   ❌ 客户 ${customer.name} 备注添加时出错:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 备注添加完成统计:`);
    console.log(`✅ 成功添加: ${successCount} 条备注`);
    console.log(`❌ 添加失败: ${errorCount} 条备注`);
    
    // 检查最新的客户备注
    console.log('\n📝 最新客户备注:');
    const [notes] = await connection.execute(`
      SELECT 
        cn.id,
        c.name as customer_name,
        cn.category,
        cn.content,
        cn.createdAt
      FROM customer_notes cn
      JOIN customers c ON cn.customerId = c.id
      ORDER BY cn.createdAt DESC 
      LIMIT 20
    `);
    
    // 备注分类中文名称
    const categoryNames = {
      'PREFERENCE': '客户偏好',
      'BEHAVIOR': '购买行为',
      'CONTACT': '联系记录',
      'OTHER': '其他信息'
    };
    
    notes.forEach((note, index) => {
      console.log(`${index + 1}. ${note.customer_name} - ${categoryNames[note.category] || note.category}`);
      console.log(`   内容: ${note.content}`);
      console.log(`   时间: ${note.createdAt}`);
      console.log('');
    });
    
    // 统计各客户的备注数量
    console.log('\n📈 客户备注统计:');
    const [noteStats] = await connection.execute(`
      SELECT 
        c.name,
        c.phone,
        COUNT(cn.id) as note_count,
        GROUP_CONCAT(DISTINCT cn.category) as categories
      FROM customers c
      LEFT JOIN customer_notes cn ON c.id = cn.customerId
      WHERE cn.id IS NOT NULL
      GROUP BY c.id, c.name, c.phone
      ORDER BY note_count DESC
      LIMIT 15
    `);
    
    noteStats.forEach((stat, index) => {
      const categories = stat.categories ? stat.categories.split(',').map(cat => categoryNames[cat] || cat).join(', ') : '';
      console.log(`${index + 1}. ${stat.name} (${stat.phone})`);
      console.log(`   备注数量: ${stat.note_count}条`);
      console.log(`   备注类型: ${categories}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 添加客户备注时出错:', error);
  } finally {
    await connection.end();
  }
}

createCustomerNotes();