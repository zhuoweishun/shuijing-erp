const mysql = require('mysql2/promise');
require('dotenv').config();

// 销售渠道
const SALE_CHANNELS = ['线上商城', '微信小程序', '抖音直播', '线下门店', '朋友推荐', '微信群'];

// 购买备注
const PURCHASE_NOTES = [
  '很喜欢这个款式，质量很好',
  '朋友推荐购买的，期待效果',
  '送给女朋友的生日礼物',
  '自己佩戴，希望带来好运',
  '收藏级别的精品，值得购买',
  '颜色很正，做工精细',
  '第二次购买了，品质信得过',
  '包装很精美，送礼很合适',
  '性价比很高，推荐给朋友',
  '款式独特，很有个性'
];

async function createCustomerPurchases() {
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
    console.log('🛒 开始创建客户购买记录...');
    
    // 动态导入fetch
    const { default: fetch } = await import('node-fetch');
    
    // API配置
    const API_BASE_URL = 'http://localhost:3001/api/v1';
    const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWY4aDNnOHAwMDAwdHVwZ3E0Z2NyZncwIiwidXNlcm5hbWUiOiJib3NzIiwicm9sZSI6IkJPU1MiLCJpYXQiOjE3NTc0MTQxMDgsImV4cCI6MTc1ODAxODkwOH0.vGA0gH0Nfv8FacWgnBDfc9ZklcyFfRn3rnPebkDYF1o';
    
    // 获取可用的客户
    console.log('\n👥 获取客户列表...');
    const [customers] = await connection.execute(`
      SELECT id, name, phone
      FROM customers 
      ORDER BY createdAt DESC 
      LIMIT 20
    `);
    
    console.log(`找到 ${customers.length} 个客户`);
    
    // 获取可售的SKU
    console.log('\n🎯 获取可售SKU列表...');
    const [skus] = await connection.execute(`
      SELECT id, skuCode, skuName, availableQuantity, sellingPrice
      FROM product_skus 
      WHERE status = 'ACTIVE' AND availableQuantity > 0
      ORDER BY createdAt DESC
    `);
    
    console.log(`找到 ${skus.length} 个可售SKU`);
    skus.forEach((sku, index) => {
      console.log(`${index + 1}. ${sku.skuName} (${sku.skuCode}) - 库存: ${sku.availableQuantity}, 售价: ¥${sku.sellingPrice}`);
    });
    
    if (skus.length === 0) {
      console.log('❌ 没有可售的SKU，无法创建购买记录');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // 随机选择15-18个客户进行购买
    const purchasingCustomers = customers.slice(0, Math.floor(Math.random() * 4) + 15); // 15-18个客户
    
    for (let i = 0; i < purchasingCustomers.length; i++) {
      const customer = purchasingCustomers[i];
      
      try {
        console.log(`\n🛒 客户 ${customer.name} 开始购买...`);
        
        // 每个客户购买1-3个不同的SKU
        const purchaseCount = Math.floor(Math.random() * 3) + 1;
        const selectedSkus = [];
        
        // 随机选择不同的SKU
        const availableSkus = [...skus];
        for (let j = 0; j < purchaseCount && availableSkus.length > 0; j++) {
          const randomIndex = Math.floor(Math.random() * availableSkus.length);
          const selectedSku = availableSkus.splice(randomIndex, 1)[0];
          selectedSkus.push(selectedSku);
        }
        
        // 为每个选中的SKU创建购买记录
        for (let k = 0; k < selectedSkus.length; k++) {
          const sku = selectedSkus[k];
          
          try {
            // 购买数量（1-2件）
            const quantity = Math.floor(Math.random() * 2) + 1;
            
            // 检查库存是否充足
            if (sku.availableQuantity < quantity) {
              console.log(`   ⚠️  SKU ${sku.skuName} 库存不足，跳过`);
              continue;
            }
            
            // 价格策略（原价或优惠价）
            const originalPrice = parseFloat(sku.sellingPrice);
            const hasDiscount = Math.random() < 0.3; // 30%概率有优惠
            const unitPrice = hasDiscount ? originalPrice * (0.8 + Math.random() * 0.15) : originalPrice; // 80%-95%折扣
            const totalPrice = unitPrice * quantity;
            
            // 随机选择销售渠道和备注
            const saleChannel = SALE_CHANNELS[Math.floor(Math.random() * SALE_CHANNELS.length)];
            const notes = Math.random() < 0.7 ? PURCHASE_NOTES[Math.floor(Math.random() * PURCHASE_NOTES.length)] : null;
            
            // 随机生成购买时间（最近30天内）
            const now = new Date();
            const daysAgo = Math.floor(Math.random() * 30);
            const purchaseDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            
            console.log(`   🛍️  购买 ${sku.skuName} x${quantity} - ¥${unitPrice.toFixed(2)}/件 (${hasDiscount ? '优惠价' : '原价'})`);
            console.log(`   📅  购买时间: ${purchaseDate.toLocaleDateString()}`);
            console.log(`   🏪  销售渠道: ${saleChannel}`);
            
            // 调用API创建购买记录
            const response = await fetch(`${API_BASE_URL}/customers/${customer.id}/purchases`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
              },
              body: JSON.stringify({
                sku_id: sku.id,
                quantity: quantity,
                unit_price: unitPrice,
                total_price: totalPrice,
                sale_channel: saleChannel,
                notes: notes
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`   ✅ 购买成功 - 总价: ¥${totalPrice.toFixed(2)}`);
              if (notes) {
                console.log(`   💬 备注: ${notes}`);
              }
              successCount++;
              
              // 更新本地SKU库存记录
              sku.availableQuantity -= quantity;
            } else {
              const error = await response.text();
              console.log(`   ❌ 购买失败: ${error}`);
              errorCount++;
            }
            
            // 延迟一下避免请求过快
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (error) {
            console.log(`   ❌ 购买 ${sku.skuName} 时出错:`, error.message);
            errorCount++;
          }
        }
        
      } catch (error) {
        console.log(`   ❌ 客户 ${customer.name} 购买时出错:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 购买记录创建完成统计:`);
    console.log(`✅ 成功创建: ${successCount} 条购买记录`);
    console.log(`❌ 创建失败: ${errorCount} 条记录`);
    
    // 检查最新的购买记录
    console.log('\n🛒 最新购买记录:');
    const [purchases] = await connection.execute(`
      SELECT 
        cp.id,
        c.name as customer_name,
        cp.skuName,
        cp.quantity,
        cp.unitPrice,
        cp.totalPrice,
        cp.saleChannel,
        cp.purchaseDate
      FROM customer_purchases cp
      JOIN customers c ON cp.customerId = c.id
      ORDER BY cp.createdAt DESC 
      LIMIT 20
    `);
    
    purchases.forEach((purchase, index) => {
      console.log(`${index + 1}. ${purchase.customer_name} 购买 ${purchase.skuName}`);
      console.log(`   数量: ${purchase.quantity}件 | 单价: ¥${purchase.unitPrice} | 总价: ¥${purchase.totalPrice}`);
      console.log(`   渠道: ${purchase.saleChannel} | 时间: ${purchase.purchaseDate}`);
      console.log('');
    });
    
    // 统计客户购买情况
    console.log('\n📈 客户购买统计:');
    const [customerStats] = await connection.execute(`
      SELECT 
        c.name,
        c.phone,
        COUNT(cp.id) as purchase_count,
        SUM(cp.totalPrice) as total_spent
      FROM customers c
      LEFT JOIN customer_purchases cp ON c.id = cp.customerId
      WHERE cp.id IS NOT NULL
      GROUP BY c.id, c.name, c.phone
      ORDER BY total_spent DESC
      LIMIT 10
    `);
    
    customerStats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.name} (${stat.phone})`);
      console.log(`   购买次数: ${stat.purchase_count}次 | 累计消费: ¥${stat.total_spent}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 创建购买记录时出错:', error);
  } finally {
    await connection.end();
  }
}

createCustomerPurchases();