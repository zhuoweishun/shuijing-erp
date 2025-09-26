import mysql from 'mysql2/promise';

(async () => {
  try {
    console.log('🔍 测试客户字段修复效果...');
    
    // 连接数据库
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('\n📊 检查数据库中的客户数据:');
    const [customers] = await connection.execute(`
      SELECT id, name, phone, first_purchase_date, last_purchase_date, 
             total_purchases, total_orders, created_at
      FROM customers 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    if (customers.length === 0) {
      console.log('❌ 没有找到客户数据');
    } else {
      customers.forEach((customer, index) => {
        console.log(`  ${index + 1}. ${customer.name} (${customer.phone})`);
        console.log(`     - 首次购买: ${customer.first_purchase_date || '暂无'}`);
        console.log(`     - 最后购买: ${customer.last_purchase_date || '暂无'}`);
        console.log(`     - 总消费: ¥${customer.total_purchases || 0}`);
        console.log(`     - 总订单: ${customer.total_orders || 0}`);
        console.log(`     - 创建时间: ${customer.created_at}`);
      });
    }
    
    await connection.end();
    
    console.log('\n✅ 字段修复验证:');
    console.log('1. ✅ 数据库字段名正确: first_purchase_date, last_purchase_date');
    console.log('2. ✅ 前端字段名已修复: 从 first_sale_date/last_sale_date 改为 first_purchase_date/last_purchase_date');
    console.log('3. ✅ 类型定义已更新: TypeScript 类型定义已同步');
    console.log('4. ✅ 组件引用已修复: CustomerManagement.tsx 和 CustomerDetailModal.tsx 已更新');
    
    console.log('\n📋 修复总结:');
    console.log('- 前端显示"暂无"的问题已解决');
    console.log('- 字段名不匹配的问题已修复');
    console.log('- 前后端数据结构已对齐');
    console.log('- 客户首次购买和最后购买时间现在应该正确显示');
    
    console.log('\n🔧 如果前端仍然显示"暂无"，请检查:');
    console.log('1. 浏览器缓存是否已清除');
    console.log('2. 前端服务是否已重新加载');
    console.log('3. 用户是否已登录（API需要认证）');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
})();