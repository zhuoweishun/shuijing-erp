const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  port: 3306
};

// 生成客户消费统计报告
async function generateCustomerConsumptionReport() {
  let connection;
  
  try {
    console.log('🔍 开始生成客户消费统计报告...');
    
    connection = await mysql.createConnection(dbConfig);
    
    // 1. 查询所有客户的购买记录（总消费）
    console.log('\n📊 统计客户总消费金额...');
    const [purchaseData] = await connection.execute(`
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        COUNT(cp.id) as total_orders,
        SUM(cp.totalPrice) as total_consumption
      FROM customers c
      LEFT JOIN customer_purchases cp ON c.id = cp.customerId AND cp.status = 'ACTIVE'
      GROUP BY c.id, c.name, c.phone
      ORDER BY total_consumption DESC
    `);
    
    console.log(`找到 ${purchaseData.length} 个客户的购买记录`);
    
    // 2. 查询所有客户的退货记录（退款金额）
    console.log('\n💰 统计客户退款金额...');
    const [refundData] = await connection.execute(`
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        COUNT(cp.id) as refund_count,
        SUM(cp.totalPrice) as total_refund
      FROM customers c
      LEFT JOIN customer_purchases cp ON c.id = cp.customerId AND cp.status = 'REFUNDED'
      GROUP BY c.id, c.name
      ORDER BY total_refund DESC
    `);
    
    console.log(`找到 ${refundData.length} 个客户的退货记录`);
    
    // 3. 合并数据并计算有效消费
    console.log('\n🧮 计算客户有效消费...');
    const customerStats = [];
    let totalConsumption = 0;
    let totalRefund = 0;
    let totalEffectiveConsumption = 0;
    
    for (const purchase of purchaseData) {
      const refund = refundData.find(r => r.customer_id === purchase.customer_id) || {
        refund_count: 0,
        total_refund: 0
      };
      
      const consumption = parseFloat(purchase.total_consumption || 0);
      const refundAmount = parseFloat(refund.total_refund || 0);
      const effectiveConsumption = consumption - refundAmount;
      
      totalConsumption += consumption;
      totalRefund += refundAmount;
      totalEffectiveConsumption += effectiveConsumption;
      
      customerStats.push({
        customer_id: purchase.customer_id,
        customer_name: purchase.customer_name,
        customer_phone: purchase.customer_phone,
        total_orders: purchase.total_orders || 0,
        total_consumption: consumption,
        refund_count: refund.refund_count || 0,
        total_refund: refundAmount,
        effective_consumption: effectiveConsumption,
        refund_rate: consumption > 0 ? ((refundAmount / consumption) * 100).toFixed(2) : '0.00'
      });
    }
    
    // 按有效消费排序
    customerStats.sort((a, b) => b.effective_consumption - a.effective_consumption);
    
    // 4. 验证财务流水账数据
    console.log('\n🔍 验证财务流水账数据...');
    const [financialData] = await connection.execute(`
      SELECT 
        recordType,
        COUNT(*) as record_count,
        SUM(amount) as total_amount
      FROM financial_records 
      WHERE recordType IN ('INCOME', 'REFUND')
      GROUP BY recordType
    `);
    
    console.log('财务流水账统计:');
    financialData.forEach(record => {
      console.log(`  ${record.recordType}: ${record.record_count}条记录, 总金额: ¥${record.total_amount}`);
    });
    
    // 5. 生成详细报告
    console.log('\n📋 客户消费统计报告');
    console.log('=' .repeat(120));
    console.log('客户姓名\t\t手机号\t\t订单数\t总消费\t\t退货数\t退款金额\t\t有效消费\t\t退货率');
    console.log('-'.repeat(120));
    
    customerStats.forEach((customer, index) => {
      if (customer.total_consumption > 0 || customer.total_refund > 0) {
        console.log(
          `${customer.customer_name}\t\t` +
          `${customer.customer_phone}\t` +
          `${customer.total_orders}\t` +
          `¥${customer.total_consumption.toFixed(2)}\t\t` +
          `${customer.refund_count}\t` +
          `¥${customer.total_refund.toFixed(2)}\t\t` +
          `¥${customer.effective_consumption.toFixed(2)}\t\t` +
          `${customer.refund_rate}%`
        );
      }
    });
    
    console.log('-'.repeat(120));
    console.log(
      `总计\t\t\t\t\t` +
      `${customerStats.reduce((sum, c) => sum + c.total_orders, 0)}\t` +
      `¥${totalConsumption.toFixed(2)}\t\t` +
      `${customerStats.reduce((sum, c) => sum + c.refund_count, 0)}\t` +
      `¥${totalRefund.toFixed(2)}\t\t` +
      `¥${totalEffectiveConsumption.toFixed(2)}\t\t` +
      `${totalConsumption > 0 ? ((totalRefund / totalConsumption) * 100).toFixed(2) : '0.00'}%`
    );
    
    // 6. 汇总统计
    console.log('\n📊 汇总统计:');
    console.log(`🛒 客户总消费: ¥${totalConsumption.toFixed(2)}`);
    console.log(`↩️  客户退款: ¥${totalRefund.toFixed(2)}`);
    console.log(`💰 客户有效消费（累计消费）: ¥${totalEffectiveConsumption.toFixed(2)}`);
    console.log(`📈 整体退货率: ${totalConsumption > 0 ? ((totalRefund / totalConsumption) * 100).toFixed(2) : '0.00'}%`);
    
    // 7. 数据一致性检查
    console.log('\n🔍 数据一致性检查:');
    const incomeRecord = financialData.find(r => r.recordType === 'INCOME');
    const refundRecord = financialData.find(r => r.recordType === 'REFUND');
    
    const financialIncome = parseFloat(incomeRecord?.total_amount || 0);
    const financialRefund = Math.abs(parseFloat(refundRecord?.total_amount || 0)); // 取绝对值，因为退款是负数
    
    console.log(`客户购买总额: ¥${totalConsumption.toFixed(2)} vs 财务收入记录: ¥${financialIncome.toFixed(2)} ${Math.abs(totalConsumption - financialIncome) < 0.01 ? '✅' : '❌'}`);
    console.log(`客户退款总额: ¥${totalRefund.toFixed(2)} vs 财务退款记录: ¥${Math.abs(financialRefund).toFixed(2)} ${Math.abs(totalRefund - Math.abs(financialRefund)) < 0.01 ? '✅' : '❌'}`);
    
    // 8. 显示前10名消费客户
    console.log('\n🏆 前10名有效消费客户:');
    customerStats
      .filter(c => c.effective_consumption > 0)
      .slice(0, 10)
      .forEach((customer, index) => {
        console.log(`${index + 1}. ${customer.customer_name} - ¥${customer.effective_consumption.toFixed(2)}`);
      });
    
    // 9. 显示退货客户详情
    console.log('\n↩️  退货客户详情:');
    const [refundDetails] = await connection.execute(`
      SELECT 
        c.name as customer_name,
        cp.skuName,
        cp.quantity,
        cp.totalPrice,
        cp.refundReason,
        cp.refundDate
      FROM customers c
      JOIN customer_purchases cp ON c.id = cp.customerId
      WHERE cp.status = 'REFUNDED'
      ORDER BY cp.refundDate DESC
    `);
    
    refundDetails.forEach(refund => {
      console.log(`${refund.customer_name}: ${refund.skuName} x${refund.quantity} ¥${refund.totalPrice} (${refund.refundReason})`);
    });
    
    
    console.log('\n✅ 客户消费统计报告生成完成！');
    console.log('\n📋 回答用户问题:');
    console.log(`❓ 客户总消费: ¥${totalConsumption.toFixed(2)}`);
    console.log(`❓ 客户退款: ¥${totalRefund.toFixed(2)}`);
    console.log(`❓ 客户有效消费（累计消费）: ¥${totalEffectiveConsumption.toFixed(2)}`);
    console.log('\n这就是您要的准确数字！');
    
  } catch (error) {
    console.error('❌ 生成报告时发生错误:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行报告生成
generateCustomerConsumptionReport().catch(console.error);