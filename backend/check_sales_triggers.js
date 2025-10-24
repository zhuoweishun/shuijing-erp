import mysql from 'mysql2/promise';

async function checkSalesTriggers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    const [triggers] = await connection.execute('SHOW TRIGGERS');
    
    const salesTriggers = triggers.filter(t => 
      t.Trigger.includes('customer_purchase') || 
      t.Trigger.includes('sku_sale') ||
      t.Trigger.includes('financial')
    );
    
    console.log('🔍 SKU销售相关的触发器:');
    salesTriggers.forEach(trigger => {
      console.log(`✅ ${trigger.Trigger} - 作用于 ${trigger.Table} 表 (${trigger.Timing} ${trigger.Event})`);
    });
    
    // 检查是否有customer_purchase_create_financial触发器
    const hasSalesTrigger = triggers.some(t => t.Trigger === 'tr_customer_purchase_create_financial');
    console.log(`\n💰 SKU销售→收入记录触发器: ${hasSalesTrigger ? '✅ 已安装' : '❌ 缺失'}`);
    
    // 检查所有触发器名称
    console.log('\n📋 所有触发器列表:');
    triggers.forEach((trigger, index) => {
      console.log(`${index + 1}. ${trigger.Trigger}`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkSalesTriggers();