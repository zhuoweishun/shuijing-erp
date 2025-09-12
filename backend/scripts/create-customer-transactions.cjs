const mysql = require('mysql2/promise');
const fs = require('fs');
const crypto = require('crypto');

// 生成UUID
function generateUUID() {
  return crypto.randomUUID();
}

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
};

// 真实的销售渠道
const saleChannels = [
  '线上商城',
  '微信朋友圈',
  '线下门店',
  '抖音直播',
  '朋友推荐',
  '展会销售'
];

// 退货原因
const refundReasons = [
  'quality_issue',
  'size_mismatch', 
  'color_mismatch',
  'change_of_mind',
  'customer_dissatisfied',
  'wrong_item'
];

// 客户备注类型和内容
const customerNotes = {
  PREFERENCE: [
    '喜欢紫水晶手串，偏爱8mm规格',
    '钟爱粉水晶，经常询问新品',
    '喜欢大颗粒珠子，追求质感',
    '偏爱天然原石，不喜欢人工处理',
    '喜欢搭配不同颜色的水晶'
  ],
  BEHAVIOR: [
    '经常批量采购，一次买多件',
    '喜欢在周末下单购买',
    '每月固定采购，很有规律',
    '喜欢先咨询再购买，很谨慎',
    '复购频率很高，是忠实客户'
  ],
  CONTACT: [
    '电话沟通很愉快，很好交流',
    '对新品很感兴趣，经常询问',
    '微信联系及时，回复很快',
    '提出了很多有价值的建议',
    '对产品质量要求很高'
  ],
  OTHER: [
    '朋友推荐的客户，很信任我们',
    '注重产品品质，不在乎价格',
    '是水晶收藏爱好者，很专业',
    '经营珠宝店，是批发客户',
    '送礼需求较多，包装要求高'
  ]
};

// 购买备注
const purchaseNotes = [
  '客户很满意产品质量',
  '要求精美包装，是送礼用的',
  '客户是老顾客，给了优惠价',
  '客户一次性购买多件，批发价格',
  '客户指定要这个规格的',
  '客户看中了这款的颜色',
  '朋友推荐购买的',
  '客户收藏用，要求品质最好的'
];

// 退货备注
const refundNotes = {
  'quality_issue': [
    '客户反映珠子有裂纹',
    '颜色不够纯正，有杂质',
    '手串线头有问题'
  ],
  'size_mismatch': [
    '珠子尺寸比预期小',
    '手串长度不合适',
    '规格与描述不符'
  ],
  'color_mismatch': [
    '颜色比图片深',
    '实物颜色偏暗',
    '与客户期望颜色不符'
  ],
  'change_of_mind': [
    '客户改变主意不要了',
    '买重复了，要退一个',
    '朋友不喜欢这个颜色'
  ],
  'customer_dissatisfied': [
    '客户觉得性价比不高',
    '不如预期满意',
    '朋友说不好看'
  ],
  'wrong_item': [
    '发错货了，客户要的是另一款',
    '规格搞错了',
    '客户订的是其他颜色'
  ]
};

// 生成随机日期（最近30天内）
function getRandomDate(daysBack = 30) {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  const date = new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// 生成退货日期（购买后3-15天）
function getRefundDate(purchaseDate) {
  let purchase;
  
  // 处理不同类型的日期输入
  if (!purchaseDate) {
    console.log('No purchase date provided, using current date');
    purchase = new Date();
  } else if (typeof purchaseDate === 'string') {
    purchase = new Date(purchaseDate);
  } else if (purchaseDate instanceof Date) {
    purchase = purchaseDate;
  } else {
    console.log('Invalid purchase date type:', typeof purchaseDate, purchaseDate);
    purchase = new Date();
  }
  
  // 验证日期是否有效
  if (!purchase || isNaN(purchase.getTime())) {
    console.log('Invalid purchase date, using current date:', purchaseDate);
    purchase = new Date();
  }
  
  const randomDays = 3 + Math.floor(Math.random() * 13); // 3-15天
  const refundDate = new Date(purchase.getTime() + randomDays * 24 * 60 * 60 * 1000);
  return refundDate.toISOString().slice(0, 19).replace('T', ' ');
}

// 随机选择数组元素
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// 生成随机价格（基于原价的80%-100%）
function getDiscountPrice(originalPrice) {
  const discountRate = 0.8 + Math.random() * 0.2; // 80%-100%
  return Math.round(originalPrice * discountRate * 100) / 100;
}

async function main() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. 获取所有客户
    console.log('📋 获取客户列表...');
    const [customers] = await connection.execute(
      'SELECT id, name, phone FROM customers ORDER BY createdAt DESC LIMIT 20'
    );
    
    if (customers.length === 0) {
      console.log('❌ 没有找到客户数据');
      return;
    }
    
    console.log(`✅ 找到 ${customers.length} 个客户`);
    
    // 2. 获取可售SKU
    console.log('📦 获取可售SKU列表...');
    const [skus] = await connection.execute(`
      SELECT id, skuCode, skuName, sellingPrice, availableQuantity 
      FROM product_skus 
      WHERE availableQuantity > 0 
      ORDER BY createdAt DESC
    `);
    
    if (skus.length === 0) {
      console.log('❌ 没有找到可售SKU');
      return;
    }
    
    console.log(`✅ 找到 ${skus.length} 个可售SKU`);
    
    // 3. 为每个客户创建购买记录
    console.log('\n🛒 开始创建客户购买记录...');
    const purchaseRecords = [];
    
    for (const customer of customers) {
      // 每个客户购买1-3个不同的SKU
      const purchaseCount = 1 + Math.floor(Math.random() * 3);
      const selectedSkus = [];
      
      // 随机选择不重复的SKU
      while (selectedSkus.length < purchaseCount && selectedSkus.length < skus.length) {
        const sku = randomChoice(skus);
        if (!selectedSkus.find(s => s.id === sku.id)) {
          selectedSkus.push(sku);
        }
      }
      
      for (const sku of selectedSkus) {
        const quantity = 1 + Math.floor(Math.random() * 2); // 1-2件
        
        // 检查库存是否充足
        if (sku.availableQuantity < quantity) {
          console.log(`⚠️  SKU ${sku.skuCode} 库存不足，跳过`);
          continue;
        }
        
        const unitPrice = getDiscountPrice(sku.sellingPrice);
        const totalPrice = unitPrice * quantity;
        const purchaseDate = getRandomDate();
        const saleChannel = randomChoice(saleChannels);
        const notes = Math.random() > 0.5 ? randomChoice(purchaseNotes) : null;
        
        // 插入客户购买记录
        const purchaseId = generateUUID();
        await connection.execute(`
          INSERT INTO customer_purchases (
            id, customerId, skuId, skuName, quantity, unitPrice, totalPrice, 
            originalPrice, saleChannel, notes, purchaseDate, status, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW())
        `, [
          purchaseId, customer.id, sku.id, sku.skuName, quantity, unitPrice, totalPrice,
          sku.sellingPrice, saleChannel, notes, purchaseDate
        ]);
        purchaseRecords.push({
          id: purchaseId,
          customerId: customer.id,
          customerName: customer.name,
          skuId: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.skuName,
          quantity,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
          purchaseDate: purchaseDate
        });
        
        // 减少SKU库存
        await connection.execute(
          'UPDATE product_skus SET availableQuantity = availableQuantity - ? WHERE id = ?',
          [quantity, sku.id]
        );
        
        // 获取用户ID（使用第一个用户）
        const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
        const userId = users[0]?.id || 'default-user';
        
        // 创建财务收入记录
        await connection.execute(`
          INSERT INTO financial_records (
            id, recordType, amount, description, referenceId, referenceType, transactionDate, userId, updatedAt
          ) VALUES (?, 'INCOME', ?, ?, ?, 'SALE', ?, ?, NOW())
        `, [
          generateUUID(),
          totalPrice,
          `客户购买 - ${customer.name} - ${sku.skuName}`,
          purchaseId,
          purchaseDate,
          userId
        ]);
        
        console.log(`✅ ${customer.name} 购买了 ${quantity}件 ${sku.skuName}，金额：¥${totalPrice}`);
      }
    }
    
    console.log(`\n📊 总共创建了 ${purchaseRecords.length} 条购买记录`);
    
    // 4. 随机选择4-6个客户进行退货
    console.log('\n🔄 开始处理客户退货...');
    const refundCount = 4 + Math.floor(Math.random() * 3); // 4-6个
    const refundCustomers = [];
    
    // 随机选择有购买记录的客户
    const customersWithPurchases = [...new Set(purchaseRecords.map(p => p.customerId))];
    while (refundCustomers.length < refundCount && refundCustomers.length < customersWithPurchases.length) {
      const customerId = randomChoice(customersWithPurchases);
      if (!refundCustomers.includes(customerId)) {
        refundCustomers.push(customerId);
      }
    }
    
    for (const customerId of refundCustomers) {
      // 获取该客户的购买记录
      const customerPurchases = purchaseRecords.filter(p => p.customerId === customerId);
      if (customerPurchases.length === 0) continue;
      
      // 随机选择一个购买记录进行退货
      const purchaseToRefund = randomChoice(customerPurchases);
      const refundReason = randomChoice(refundReasons);
      const refundDate = getRefundDate(purchaseToRefund.purchase_date);
      const refundNote = randomChoice(refundNotes[refundReason]);
      
      // 更新购买记录状态为已退货
      await connection.execute(
        'UPDATE customer_purchases SET status = ? WHERE id = ?',
        ['REFUNDED', purchaseToRefund.id]
      );
      
      // 恢复SKU库存
      await connection.execute(
        'UPDATE product_skus SET availableQuantity = availableQuantity + ? WHERE id = ?',
        [purchaseToRefund.quantity, purchaseToRefund.skuId]
      );
      
      // 获取用户ID（使用第一个用户）
      const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
      const userId = users[0]?.id || 'default-user';
      
      // 创建财务退款记录
      await connection.execute(`
        INSERT INTO financial_records (
          id, recordType, amount, description, referenceId, referenceType, transactionDate, userId, updatedAt
        ) VALUES (?, 'REFUND', ?, ?, ?, 'REFUND', ?, ?, NOW())
      `, [
        generateUUID(),
        purchaseToRefund.totalPrice,
        `客户退货 - ${purchaseToRefund.customerName} - ${purchaseToRefund.skuName} - ${refundNote}`,
        purchaseToRefund.id,
        refundDate,
        userId
      ]);
      
      console.log(`🔄 ${purchaseToRefund.customerName} 退货了 ${purchaseToRefund.skuName}，原因：${refundNote}`);
    }
    
    // 5. 为部分客户添加备注
    console.log('\n📝 添加客户备注...');
    const noteCustomers = customers.slice(0, 12); // 为前12个客户添加备注
    
    for (const customer of noteCustomers) {
      // 每个客户添加1-3条不同类型的备注
      const noteCount = 1 + Math.floor(Math.random() * 3);
      const noteTypes = Object.keys(customerNotes);
      const selectedTypes = [];
      
      while (selectedTypes.length < noteCount && selectedTypes.length < noteTypes.length) {
        const type = randomChoice(noteTypes);
        if (!selectedTypes.includes(type)) {
          selectedTypes.push(type);
        }
      }
      
      for (const type of selectedTypes) {
        const content = randomChoice(customerNotes[type]);
        
        // 获取用户ID
        const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
        const userId = users[0]?.id || 'default-user';
        
        await connection.execute(`
          INSERT INTO customer_notes (id, customerId, content, category, createdBy, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `, [generateUUID(), customer.id, content, type, userId]);
        
        console.log(`📝 为 ${customer.name} 添加${type}备注：${content}`);
      }
    }
    
    // 6. 验证数据完整性
    console.log('\n🔍 验证数据完整性...');
    
    // 检查客户统计数据
    const [customerStats] = await connection.execute(`
      SELECT 
        c.id,
        c.name,
        COUNT(CASE WHEN cp.status = 'ACTIVE' THEN 1 END) as active_orders,
        COUNT(cp.id) as total_orders,
        COALESCE(SUM(CASE WHEN cp.status = 'ACTIVE' THEN cp.totalPrice ELSE 0 END), 0) as total_spent,
        COUNT(CASE WHEN cp.status = 'REFUNDED' THEN 1 END) as refund_count
      FROM customers c
      LEFT JOIN customer_purchases cp ON c.id = cp.customerId
      WHERE c.id IN (${customers.map(() => '?').join(',')})
      GROUP BY c.id, c.name
      ORDER BY c.createdAt DESC
    `, customers.map(c => c.id));
    
    console.log('\n📊 客户统计数据：');
    customerStats.forEach(stat => {
      const refundRate = stat.total_orders > 0 ? (stat.refund_count / stat.total_orders * 100).toFixed(1) : 0;
      console.log(`${stat.name}: 有效订单${stat.active_orders}个, 总订单${stat.total_orders}个, 消费¥${stat.total_spent}, 退货率${refundRate}%`);
    });
    
    // 检查财务记录
    const [financialStats] = await connection.execute(`
      SELECT 
        recordType as type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM financial_records 
      WHERE referenceType IN ('SALE', 'REFUND')
      AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      GROUP BY recordType
    `);
    
    console.log('\n💰 财务记录统计：');
    financialStats.forEach(stat => {
      console.log(`${stat.type}: ${stat.count}条记录, 总金额¥${stat.total_amount}`);
    });
    
    // 检查SKU库存变化
    const [skuStats] = await connection.execute(`
      SELECT 
        skuCode,
        skuName,
        availableQuantity,
        totalQuantity
      FROM product_skus 
      WHERE id IN (${[...new Set(purchaseRecords.map(p => p.skuId))].map(() => '?').join(',')})
    `, [...new Set(purchaseRecords.map(p => p.skuId))]);
    
    console.log('\n📦 SKU库存状态：');
    skuStats.forEach(sku => {
      console.log(`${sku.skuCode}: 可售${sku.availableQuantity}件, 总量${sku.totalQuantity}件`);
    });
    
    // 生成测试报告
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        customers_count: customers.length,
        purchase_records: purchaseRecords.length,
        refund_count: refundCustomers.length,
        notes_added: noteCustomers.length
      },
      customer_types: {
        new_customers: customerStats.filter(c => c.active_orders === 1).length,
        repeat_customers: customerStats.filter(c => c.active_orders >= 2).length,
        big_customers: customerStats.filter(c => c.total_spent >= 1000).length
      },
      financial_summary: {
        total_income: financialStats.find(f => f.type === 'INCOME')?.total_amount || 0,
        total_refunds: financialStats.find(f => f.type === 'REFUND')?.total_amount || 0
      }
    };
    
    // 保存报告
    fs.writeFileSync(
      'd:\\shuijing ERP\\customer_transaction_report.json',
      JSON.stringify(report, null, 2),
      'utf8'
    );
    
    console.log('\n✅ 客户交易数据创建完成！');
    console.log('📋 详细报告已保存到 customer_transaction_report.json');
    console.log(`\n📊 总结：`);
    console.log(`- 创建了 ${customers.length} 个客户的交易数据`);
    console.log(`- 生成了 ${purchaseRecords.length} 条购买记录`);
    console.log(`- 处理了 ${refundCustomers.length} 个客户的退货`);
    console.log(`- 为 ${noteCustomers.length} 个客户添加了备注`);
    console.log(`- 收入总额：¥${report.financial_summary.total_income}`);
    console.log(`- 退款总额：¥${report.financial_summary.total_refunds}`);
    
  } catch (error) {
    console.error('❌ 执行过程中出现错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔗 数据库连接已关闭');
    }
  }
}

// 执行主函数
main().catch(console.error);