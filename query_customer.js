import mysql from 'mysql2/promise';

(async () => {
  try {
    console.log('🔍 查询客户CUS202509264VO的详细信息...');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    // 1. 首先查找客户编码为CUS202509264VO的客户
    console.log('\n📊 查找客户编码CUS202509264VO...');
    
    // 由于客户编码是动态生成的，我们需要查找所有客户并生成编码进行匹配
    const [allCustomers] = await connection.execute(`
      SELECT id, name, phone, first_purchase_date, last_purchase_date, 
             total_purchases, total_orders, created_at, updated_at
      FROM customers 
      ORDER BY created_at DESC
    `);
    
    // 生成客户编码的函数（与后端保持一致）
    function generateCustomerCode(createdAt, customerId) {
      const date = new Date(createdAt);
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      // 使用客户ID的后3位作为序号
      const sequence = customerId.slice(-3);
      return `CUS${dateStr}${sequence.toUpperCase()}`;
    }
    
    console.log('\n🔍 调试客户编码生成:');
    if (allCustomers.length > 0) {
      const firstCustomer = allCustomers[0];
      console.log(`  - 客户ID: ${firstCustomer.id}`);
      console.log(`  - 创建时间: ${firstCustomer.created_at}`);
      console.log(`  - 生成的编码: ${generateCustomerCode(firstCustomer.created_at, firstCustomer.id)}`);
      console.log(`  - ID前8位: ${firstCustomer.id.substring(0, 8).toUpperCase()}`);
    }
    
    // 查找匹配的客户
    let targetCustomer = null;
    for (const customer of allCustomers) {
      const customerCode = generateCustomerCode(customer.created_at, customer.id);
      if (customerCode === 'CUS202509264VO') {
        targetCustomer = customer;
        break;
      }
    }
    
    if (!targetCustomer) {
      console.log('❌ 未找到客户编码为CUS202509264VO的客户');
      
      // 显示所有客户的编码供参考
      console.log('\n📋 当前系统中的客户编码:');
      allCustomers.forEach((customer, index) => {
        const customerCode = generateCustomerCode(customer.created_at, customer.id);
        console.log(`  ${index + 1}. ${customerCode} - ${customer.name} (${customer.phone})`);
      });
      
      // 查找包含类似编码的客户
      console.log('\n🔍 查找包含"4VO"的客户编码:');
      const similarCustomers = allCustomers.filter(customer => {
        const customerCode = generateCustomerCode(customer.created_at, customer.id);
        return customerCode.includes('4VO') || customerCode.includes('CUS202509');
      });
      
      if (similarCustomers.length > 0) {
        similarCustomers.forEach((customer, index) => {
          const customerCode = generateCustomerCode(customer.created_at, customer.id);
          console.log(`  ${index + 1}. ${customerCode} - ${customer.name} (${customer.phone})`);
        });
      } else {
        console.log('  未找到包含类似编码的客户');
      }
      
      await connection.end();
      return;
    }
    
    console.log('✅ 找到目标客户!');
    console.log('客户基本信息:');
    console.log(`  - 客户编码: CUS202509264VO`);
    console.log(`  - 客户ID: ${targetCustomer.id}`);
    console.log(`  - 姓名: ${targetCustomer.name}`);
    console.log(`  - 电话: ${targetCustomer.phone}`);
    console.log(`  - 首次购买: ${targetCustomer.first_purchase_date || '暂无'}`);
    console.log(`  - 最后购买: ${targetCustomer.last_purchase_date || '暂无'}`);
    console.log(`  - 总消费: ¥${targetCustomer.total_purchases || 0}`);
    console.log(`  - 总订单: ${targetCustomer.total_orders || 0}`);
    console.log(`  - 创建时间: ${targetCustomer.created_at}`);
    
    // 2. 查询该客户的购买记录
    console.log('\n🛒 查询购买记录...');
    const [purchases] = await connection.execute(`
      SELECT cp.*, ps.sku_code, ps.sku_name
      FROM customer_purchases cp
      LEFT JOIN product_skus ps ON cp.sku_id = ps.id
      WHERE cp.customer_id = ?
      ORDER BY cp.purchase_date DESC
    `, [targetCustomer.id]);
    
    if (purchases.length > 0) {
      console.log(`购买记录总数: ${purchases.length}`);
      purchases.forEach((purchase, index) => {
        console.log(`  ${index + 1}. ${purchase.sku_name || 'N/A'} (${purchase.sku_code || 'N/A'})`);
        console.log(`     - 数量: ${purchase.quantity}`);
        console.log(`     - 单价: ¥${purchase.unit_price}`);
        console.log(`     - 总价: ¥${purchase.total_price}`);
        console.log(`     - 状态: ${purchase.status}`);
        console.log(`     - 购买时间: ${purchase.purchase_date}`);
        console.log('');
      });
    } else {
      console.log('  暂无购买记录');
    }
    
    // 3. 计算距离最后购买的天数
    if (targetCustomer.last_purchase_date) {
      const lastPurchaseDate = new Date(targetCustomer.last_purchase_date);
      const now = new Date();
      const daysSinceLastPurchase = Math.floor((now - lastPurchaseDate) / (1000 * 60 * 60 * 24));
      
      console.log(`\n📅 活跃度分析:`);
      console.log(`  - 距离最后购买: ${daysSinceLastPurchase} 天`);
      
      // 4. 查询所有客户的最后购买天数，计算活跃度阈值
      console.log('\n📊 计算系统活跃度阈值...');
      const [allCustomersWithPurchases] = await connection.execute(`
        SELECT last_purchase_date
        FROM customers 
        WHERE last_purchase_date IS NOT NULL
      `);
      
      const daysSinceLastPurchaseList = allCustomersWithPurchases.map(customer => {
        const lastDate = new Date(customer.last_purchase_date);
        return Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      }).sort((a, b) => a - b);
      
      if (daysSinceLastPurchaseList.length > 0) {
        const q1Index = Math.floor(daysSinceLastPurchaseList.length * 0.25);
        const q2Index = Math.floor(daysSinceLastPurchaseList.length * 0.5);
        const q3Index = Math.floor(daysSinceLastPurchaseList.length * 0.75);
        
        const decliningThreshold = daysSinceLastPurchaseList[q1Index];
        const coolingThreshold = daysSinceLastPurchaseList[q2Index];
        const silentThreshold = daysSinceLastPurchaseList[q3Index];
        const lostThreshold = Math.max(silentThreshold * 1.5, 365);
        
        console.log(`  - 衰退阈值 (25%): ${decliningThreshold} 天`);
        console.log(`  - 冷却阈值 (50%): ${coolingThreshold} 天`);
        console.log(`  - 沉默阈值 (75%): ${silentThreshold} 天`);
        console.log(`  - 流失阈值: ${lostThreshold} 天`);
        
        // 判断客户类型
        let customerType = 'ACTIVE';
        if (daysSinceLastPurchase >= lostThreshold) {
          customerType = 'LOST';
        } else if (daysSinceLastPurchase >= silentThreshold) {
          customerType = 'SILENT';
        } else if (daysSinceLastPurchase >= coolingThreshold) {
          customerType = 'COOLING';
        } else if (daysSinceLastPurchase >= decliningThreshold) {
          customerType = 'DECLINING';
        }
        
        console.log(`\n🏷️ 客户标签分析:`);
        console.log(`  - 当前标签: ${customerType}`);
        console.log(`  - 标签原因: 距离最后购买${daysSinceLastPurchase}天，超过沉默阈值${silentThreshold}天`);
        
        if (customerType === 'SILENT') {
          console.log(`\n💡 沉默客户标签原因:`);
          console.log(`  该客户被标记为沉默客户是因为:`);
          console.log(`  1. 距离最后购买时间已经${daysSinceLastPurchase}天`);
          console.log(`  2. 超过了系统计算的沉默阈值${silentThreshold}天`);
          console.log(`  3. 沉默阈值是基于所有客户最后购买天数的75%分位数计算得出`);
          console.log(`  4. 这意味着该客户的活跃度处于系统中较低的25%范围内`);
        }
      }
    } else {
      console.log(`\n📅 活跃度分析: 该客户暂无购买记录，无法计算活跃度`);
    }
    
    await connection.end();
    console.log('\n🔚 查询完成');
    
  } catch (error) {
    console.error('❌ 查询过程中出现错误:', error);
  }
})();