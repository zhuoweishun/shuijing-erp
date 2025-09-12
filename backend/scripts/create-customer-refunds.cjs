const mysql = require('mysql2/promise');
require('dotenv').config();

// 退货原因
const REFUND_REASONS = [
  'customer_dissatisfied', // 客户不满意
  'quality_issue',         // 产品质量问题
  'size_mismatch',         // 尺寸不合适
  'color_mismatch',        // 颜色不符
  'wrong_item',            // 发错货
  'change_of_mind',        // 客户改变主意
  'other'                  // 其他原因
];

// 退货原因中文描述
const REFUND_REASON_NAMES = {
  'customer_dissatisfied': '客户不满意',
  'quality_issue': '产品质量问题',
  'size_mismatch': '尺寸不合适',
  'color_mismatch': '颜色不符',
  'wrong_item': '发错货',
  'change_of_mind': '客户改变主意',
  'other': '其他原因'
};

// 退货备注
const REFUND_NOTES = [
  '珠子大小不均匀，影响美观',
  '颜色与图片差异较大',
  '手串太紧，佩戴不舒服',
  '收到货发现有瑕疵',
  '朋友说不适合我的肤色',
  '买错了尺寸，需要换小一号',
  '质量不如预期，要求退货',
  '家人不喜欢这个款式',
  '发现网上有更便宜的同款',
  '临时改变主意，不想要了'
];

async function createCustomerRefunds() {
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
    console.log('↩️  开始创建客户退货记录...');
    
    // 动态导入fetch
    const { default: fetch } = await import('node-fetch');
    
    // API配置
    const API_BASE_URL = 'http://localhost:3001/api/v1';
    const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWY4aDNnOHAwMDAwdHVwZ3E0Z2NyZncwIiwidXNlcm5hbWUiOiJib3NzIiwicm9sZSI6IkJPU1MiLCJpYXQiOjE3NTc0MTQxMDgsImV4cCI6MTc1ODAxODkwOH0.vGA0gH0Nfv8FacWgnBDfc9ZklcyFfRn3rnPebkDYF1o';
    
    // 获取有购买记录的客户
    console.log('\n🛒 获取有购买记录的客户...');
    const [customersWithPurchases] = await connection.execute(`
      SELECT DISTINCT
        c.id,
        c.name,
        c.phone,
        COUNT(cp.id) as purchase_count
      FROM customers c
      JOIN customer_purchases cp ON c.id = cp.customerId
      WHERE cp.status = 'ACTIVE'
      GROUP BY c.id, c.name, c.phone
      HAVING purchase_count > 0
      ORDER BY purchase_count DESC
      LIMIT 15
    `);
    
    console.log(`找到 ${customersWithPurchases.length} 个有购买记录的客户`);
    
    if (customersWithPurchases.length === 0) {
      console.log('❌ 没有找到有购买记录的客户，无法创建退货记录');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // 随机选择5-7个客户进行退货
    const refundCustomerCount = Math.floor(Math.random() * 3) + 5; // 5-7个客户
    const refundCustomers = customersWithPurchases.slice(0, refundCustomerCount);
    
    console.log(`\n↩️  选择 ${refundCustomers.length} 个客户进行退货操作`);
    
    for (let i = 0; i < refundCustomers.length; i++) {
      const customer = refundCustomers[i];
      
      try {
        console.log(`\n↩️  客户 ${customer.name} 开始退货...`);
        
        // 获取该客户的有效购买记录
        const [purchases] = await connection.execute(`
          SELECT 
            cp.id,
            cp.skuName,
            cp.quantity,
            cp.unitPrice,
            cp.totalPrice,
            cp.purchaseDate
          FROM customer_purchases cp
          WHERE cp.customerId = ? AND cp.status = 'ACTIVE'
          ORDER BY cp.purchaseDate DESC
        `, [customer.id]);
        
        if (purchases.length === 0) {
          console.log(`   ⚠️  客户 ${customer.name} 没有可退货的商品`);
          continue;
        }
        
        // 随机选择1-2个商品进行退货
        const refundCount = Math.min(purchases.length, Math.floor(Math.random() * 2) + 1);
        const selectedPurchases = [];
        
        // 随机选择要退货的商品
        const availablePurchases = [...purchases];
        for (let j = 0; j < refundCount && availablePurchases.length > 0; j++) {
          const randomIndex = Math.floor(Math.random() * availablePurchases.length);
          const selectedPurchase = availablePurchases.splice(randomIndex, 1)[0];
          selectedPurchases.push(selectedPurchase);
        }
        
        // 为每个选中的商品创建退货记录
        for (let k = 0; k < selectedPurchases.length; k++) {
          const purchase = selectedPurchases[k];
          
          try {
            // 随机选择退货原因和备注
            const refundReason = REFUND_REASONS[Math.floor(Math.random() * REFUND_REASONS.length)];
            const refundNotes = REFUND_NOTES[Math.floor(Math.random() * REFUND_NOTES.length)];
            
            // 随机生成退货时间（购买后3-15天内）
            const purchaseDate = new Date(purchase.purchaseDate);
            const daysAfterPurchase = Math.floor(Math.random() * 13) + 3; // 3-15天
            const refundDate = new Date(purchaseDate.getTime() + daysAfterPurchase * 24 * 60 * 60 * 1000);
            
            console.log(`   📦 退货商品: ${purchase.skuName}`);
            console.log(`   💰 退货金额: ¥${purchase.totalPrice}`);
            console.log(`   📅 退货时间: ${refundDate.toLocaleDateString()}`);
            console.log(`   🔍 退货原因: ${REFUND_REASON_NAMES[refundReason]}`);
            console.log(`   💬 退货说明: ${refundNotes}`);
            
            // 调用API创建退货记录
            const response = await fetch(`${API_BASE_URL}/customers/${customer.id}/purchases/${purchase.id}/refund`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
              },
              body: JSON.stringify({
                quantity: purchase.quantity, // 全部退货
                reason: refundReason,
                notes: refundNotes
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`   ✅ 退货成功`);
              successCount++;
            } else {
              const error = await response.text();
              console.log(`   ❌ 退货失败: ${error}`);
              errorCount++;
            }
            
            // 延迟一下避免请求过快
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } catch (error) {
            console.log(`   ❌ 退货 ${purchase.skuName} 时出错:`, error.message);
            errorCount++;
          }
        }
        
      } catch (error) {
        console.log(`   ❌ 客户 ${customer.name} 退货时出错:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 退货记录创建完成统计:`);
    console.log(`✅ 成功创建: ${successCount} 条退货记录`);
    console.log(`❌ 创建失败: ${errorCount} 条记录`);
    
    // 检查最新的退货记录
    console.log('\n↩️  最新退货记录:');
    const [refunds] = await connection.execute(`
      SELECT 
        cp.id,
        c.name as customer_name,
        cp.skuName,
        cp.quantity,
        cp.totalPrice,
        cp.refundReason,
        cp.refundNotes,
        cp.refundDate
      FROM customer_purchases cp
      JOIN customers c ON cp.customerId = c.id
      WHERE cp.status = 'REFUNDED'
      ORDER BY cp.refundDate DESC 
      LIMIT 15
    `);
    
    refunds.forEach((refund, index) => {
      console.log(`${index + 1}. ${refund.customer_name} 退货 ${refund.skuName}`);
      console.log(`   数量: ${refund.quantity}件 | 退款: ¥${refund.totalPrice}`);
      console.log(`   原因: ${REFUND_REASON_NAMES[refund.refundReason] || refund.refundReason}`);
      console.log(`   说明: ${refund.refundNotes}`);
      console.log(`   时间: ${refund.refundDate}`);
      console.log('');
    });
    
    // 统计退货情况
    console.log('\n📈 退货统计:');
    const [refundStats] = await connection.execute(`
      SELECT 
        c.name,
        c.phone,
        COUNT(CASE WHEN cp.status = 'ACTIVE' THEN 1 END) as active_purchases,
        COUNT(CASE WHEN cp.status = 'REFUNDED' THEN 1 END) as refunded_purchases,
        SUM(CASE WHEN cp.status = 'ACTIVE' THEN cp.totalPrice ELSE 0 END) as active_amount,
        SUM(CASE WHEN cp.status = 'REFUNDED' THEN cp.totalPrice ELSE 0 END) as refunded_amount
      FROM customers c
      LEFT JOIN customer_purchases cp ON c.id = cp.customerId
      WHERE cp.id IS NOT NULL
      GROUP BY c.id, c.name, c.phone
      HAVING refunded_purchases > 0
      ORDER BY refunded_amount DESC
    `);
    
    refundStats.forEach((stat, index) => {
      const refundRate = stat.active_purchases + stat.refunded_purchases > 0 
        ? (stat.refunded_purchases / (stat.active_purchases + stat.refunded_purchases) * 100).toFixed(1)
        : '0.0';
      
      console.log(`${index + 1}. ${stat.name} (${stat.phone})`);
      console.log(`   有效订单: ${stat.active_purchases}笔 (¥${stat.active_amount})`);
      console.log(`   退货订单: ${stat.refunded_purchases}笔 (¥${stat.refunded_amount})`);
      console.log(`   退货率: ${refundRate}%`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 创建退货记录时出错:', error);
  } finally {
    await connection.end();
  }
}

createCustomerRefunds();