const mysql = require('mysql2/promise');
require('dotenv').config();

// 真实的客户数据
const REAL_CUSTOMERS = [
  {
    name: '张美丽',
    phone: '13812345678',
    address: '北京市朝阳区三里屯街道工体北路8号三里屯SOHO A座1201室',
    city: '北京市',
    province: '北京市'
  },
  {
    name: '李雅琴',
    phone: '13923456789',
    address: '上海市浦东新区陆家嘴环路1000号恒生银行大厦28楼',
    city: '上海市',
    province: '上海市'
  },
  {
    name: '王慧敏',
    phone: '13734567890',
    address: '广州市天河区珠江新城花城大道85号高德置地广场A座3506室',
    city: '广州市',
    province: '广东省'
  },
  {
    name: '陈静怡',
    phone: '13645678901',
    address: '深圳市南山区科技园南区深南大道9988号华润置地大厦A座2201室',
    city: '深圳市',
    province: '广东省'
  },
  {
    name: '刘晓燕',
    phone: '13556789012',
    address: '杭州市西湖区文三路259号昌地火炬大厦1号楼17层',
    city: '杭州市',
    province: '浙江省'
  },
  {
    name: '赵婷婷',
    phone: '13467890123',
    address: '成都市锦江区红星路三段1号IFS国际金融中心二期7楼',
    city: '成都市',
    province: '四川省'
  },
  {
    name: '孙丽华',
    phone: '13378901234',
    address: '武汉市江汉区中山大道818号平安大厦A座1508室',
    city: '武汉市',
    province: '湖北省'
  },
  {
    name: '周雨萱',
    phone: '13289012345',
    address: '西安市雁塔区高新四路13号朗臣大厦B座2201室',
    city: '西安市',
    province: '陕西省'
  },
  {
    name: '吴梦琪',
    phone: '13190123456',
    address: '南京市建邺区江东中路359号国睿大厦1栋A座1201室',
    city: '南京市',
    province: '江苏省'
  },
  {
    name: '郑欣怡',
    phone: '13801234567',
    address: '重庆市渝北区新牌坊街道金渝大道68号新科国际广场3栋2201室',
    city: '重庆市',
    province: '重庆市'
  },
  {
    name: '马思雨',
    phone: '13712345678',
    address: '天津市和平区南京路189号津汇广场1座2801室',
    city: '天津市',
    province: '天津市'
  },
  {
    name: '冯雅芳',
    phone: '13623456789',
    address: '青岛市市南区香港中路61号远洋大厦A座1701室',
    city: '青岛市',
    province: '山东省'
  },
  {
    name: '许晓雯',
    phone: '13534567890',
    address: '大连市中山区人民路15号国际金融大厦A座2501室',
    city: '大连市',
    province: '辽宁省'
  },
  {
    name: '何美玲',
    phone: '13445678901',
    address: '厦门市思明区鹭江道8号厦门国际银行大厦26楼',
    city: '厦门市',
    province: '福建省'
  },
  {
    name: '韩雪莹',
    phone: '13356789012',
    address: '苏州市工业园区苏州大道东289号广融大厦18楼',
    city: '苏州市',
    province: '江苏省'
  },
  {
    name: '曹丽娜',
    phone: '13267890123',
    address: '长沙市开福区芙蓉中路一段478号运达国际广场1栋2201室',
    city: '长沙市',
    province: '湖南省'
  },
  {
    name: '邓雅琪',
    phone: '13178901234',
    address: '昆明市五华区东风西路182号昆明国际会展中心A座1501室',
    city: '昆明市',
    province: '云南省'
  },
  {
    name: '范思琪',
    phone: '13089012345',
    address: '济南市历下区经十路12111号中润世纪广场18楼',
    city: '济南市',
    province: '山东省'
  },
  {
    name: '彭雨涵',
    phone: '13990123456',
    address: '合肥市蜀山区潜山路190号华邦世贸城A座2801室',
    city: '合肥市',
    province: '安徽省'
  },
  {
    name: '谢晓彤',
    phone: '13801234568',
    address: '福州市鼓楼区五四路158号环球广场A座2201室',
    city: '福州市',
    province: '福建省'
  }
];

async function createRealCustomers() {
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
    console.log('👥 开始创建20个真实客户...');
    
    // 动态导入fetch
    const { default: fetch } = await import('node-fetch');
    
    // API配置
    const API_BASE_URL = 'http://localhost:3001/api/v1';
    const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWY4aDNnOHAwMDAwdHVwZ3E0Z2NyZncwIiwidXNlcm5hbWUiOiJib3NzIiwicm9sZSI6IkJPU1MiLCJpYXQiOjE3NTc0MTQxMDgsImV4cCI6MTc1ODAxODkwOH0.vGA0gH0Nfv8FacWgnBDfc9ZklcyFfRn3rnPebkDYF1o';
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < REAL_CUSTOMERS.length; i++) {
      const customer = REAL_CUSTOMERS[i];
      
      try {
        console.log(`\n👤 创建客户 ${i + 1}: ${customer.name}`);
        
        // 检查客户是否已存在
        const [existingCustomers] = await connection.execute(
          'SELECT id FROM customers WHERE phone = ?',
          [customer.phone]
        );
        
        if (existingCustomers.length > 0) {
          console.log(`   ⚠️  客户 ${customer.name} 已存在，跳过创建`);
          continue;
        }
        
        // 调用API创建客户
        const response = await fetch(`${API_BASE_URL}/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
          },
          body: JSON.stringify({
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            province: customer.province
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`   ✅ 成功创建客户: ${customer.name} (${customer.phone})`);
          console.log(`   📍 地址: ${customer.address}`);
          successCount++;
        } else {
          const error = await response.text();
          console.log(`   ❌ 创建失败: ${error}`);
          errorCount++;
        }
        
        // 延迟一下避免请求过快
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.log(`   ❌ 创建客户 ${customer.name} 时出错:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 客户创建完成统计:`);
    console.log(`✅ 成功创建: ${successCount} 个客户`);
    console.log(`❌ 创建失败: ${errorCount} 个客户`);
    
    // 检查最新的客户列表
    console.log('\n👥 最新客户列表:');
    const [customers] = await connection.execute(`
      SELECT id, name, phone, city, province, createdAt
      FROM customers 
      ORDER BY createdAt DESC 
      LIMIT 25
    `);
    
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name} (${customer.phone})`);
      console.log(`   地区: ${customer.city}, ${customer.province}`);
      console.log(`   创建时间: ${customer.createdAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 创建客户时出错:', error);
  } finally {
    await connection.end();
  }
}

createRealCustomers();