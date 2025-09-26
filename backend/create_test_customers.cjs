// 创建测试客户数据脚本
const mysql = require('mysql2/promise')

// 数据库配置
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
}

// 测试客户数据
const testCustomers = [
  {
    id: 'cust_001',
    name: '王二',
    phone: '13800138001',
    address: '北京市朝阳区建国门外大街1号',
    city: '北京',
    province: '北京',
    wechat: 'wanger_wx',
    notes: '老客户，喜欢翡翠手镯',
    birthday: '1985-06-15 00:00:00',
    total_orders: 5,
    total_all_orders: 5,
    total_purchases: 15800.00,
    average_order_value: 3160.00,
    first_purchase_date: '2024-01-15 10:30:00',
    last_purchase_date: '2024-09-20 14:20:00',
    days_since_first_purchase: 255,
    days_since_last_purchase: 6,
    refund_count: 0,
    refund_rate: 0.00,
    primary_label: 'VIP客户',
    customer_labels: JSON.stringify(['VIP客户', '翡翠爱好者', '回头客'])
  },
  {
    id: 'cust_002',
    name: '李三',
    phone: '13800138002',
    address: '上海市浦东新区陆家嘴环路1000号',
    city: '上海',
    province: '上海',
    wechat: 'lisan_wx',
    notes: '新客户，对和田玉感兴趣',
    birthday: '1990-03-22 00:00:00',
    total_orders: 2,
    total_all_orders: 2,
    total_purchases: 8500.00,
    average_order_value: 4250.00,
    first_purchase_date: '2024-08-10 16:45:00',
    last_purchase_date: '2024-09-15 11:30:00',
    days_since_first_purchase: 47,
    days_since_last_purchase: 11,
    refund_count: 0,
    refund_rate: 0.00,
    primary_label: '新客户',
    customer_labels: JSON.stringify(['新客户', '和田玉爱好者'])
  },
  {
    id: 'cust_003',
    name: '张四',
    phone: '13800138003',
    address: '广州市天河区珠江新城花城大道123号',
    city: '广州',
    province: '广东',
    wechat: 'zhangsi_wx',
    notes: '企业客户，经常批量采购',
    birthday: '1978-11-08 00:00:00',
    total_orders: 12,
    total_all_orders: 12,
    total_purchases: 45600.00,
    average_order_value: 3800.00,
    first_purchase_date: '2023-12-01 09:15:00',
    last_purchase_date: '2024-09-25 13:45:00',
    days_since_first_purchase: 300,
    days_since_last_purchase: 1,
    refund_count: 1,
    refund_rate: 8.33,
    primary_label: '企业客户',
    customer_labels: JSON.stringify(['企业客户', '批量采购', '长期合作'])
  },
  {
    id: 'cust_004',
    name: '赵五',
    phone: '13800138004',
    address: '深圳市南山区科技园南区深南大道9988号',
    city: '深圳',
    province: '广东',
    wechat: 'zhaowu_wx',
    notes: '收藏爱好者，对精品有很高要求',
    birthday: '1982-07-30 00:00:00',
    total_orders: 8,
    total_all_orders: 8,
    total_purchases: 32400.00,
    average_order_value: 4050.00,
    first_purchase_date: '2024-02-20 14:20:00',
    last_purchase_date: '2024-09-18 10:15:00',
    days_since_first_purchase: 219,
    days_since_last_purchase: 8,
    refund_count: 0,
    refund_rate: 0.00,
    primary_label: '收藏客户',
    customer_labels: JSON.stringify(['收藏客户', '精品爱好者', '高端客户'])
  },
  {
    id: 'cust_005',
    name: '钱六',
    phone: '13800138005',
    address: '杭州市西湖区文三路259号',
    city: '杭州',
    province: '浙江',
    wechat: 'qianliu_wx',
    notes: '年轻客户，喜欢时尚款式',
    birthday: '1995-12-12 00:00:00',
    total_orders: 3,
    total_all_orders: 3,
    total_purchases: 6800.00,
    average_order_value: 2266.67,
    first_purchase_date: '2024-07-05 19:30:00',
    last_purchase_date: '2024-09-10 16:45:00',
    days_since_first_purchase: 83,
    days_since_last_purchase: 16,
    refund_count: 0,
    refund_rate: 0.00,
    primary_label: '时尚客户',
    customer_labels: JSON.stringify(['时尚客户', '年轻群体', '潮流爱好者'])
  }
]

async function createTestCustomers() {
  let connection
  
  try {
    console.log('🔌 连接数据库...')
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ 数据库连接成功')
    
    // 清空现有客户数据（如果有的话）
    console.log('\n🧹 清空现有客户数据...')
    await connection.execute('DELETE FROM customer_purchases')
    await connection.execute('DELETE FROM customers')
    console.log('✅ 现有数据已清空')
    
    // 插入测试客户数据
    console.log('\n👥 创建测试客户数据...')
    const insertSql = `
      INSERT INTO customers (
        id, name, phone, address, city, province, wechat, notes, birthday,
        total_orders, total_all_orders, total_purchases, average_order_value,
        first_purchase_date, last_purchase_date, days_since_first_purchase,
        days_since_last_purchase, refund_count, refund_rate, primary_label,
        customer_labels, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, NOW(), NOW()
      )
    `
    
    for (const customer of testCustomers) {
      await connection.execute(insertSql, [
        customer.id, customer.name, customer.phone, customer.address,
        customer.city, customer.province, customer.wechat, customer.notes, customer.birthday,
        customer.total_orders, customer.total_all_orders, customer.total_purchases, customer.average_order_value,
        customer.first_purchase_date, customer.last_purchase_date, customer.days_since_first_purchase,
        customer.days_since_last_purchase, customer.refund_count, customer.refund_rate, customer.primary_label,
        customer.customer_labels
      ])
      console.log(`✅ 创建客户: ${customer.name} (${customer.phone})`)
    }
    
    // 验证数据
    console.log('\n🔍 验证创建的数据...')
    const [customers] = await connection.execute('SELECT id, name, phone, city, total_purchases FROM customers ORDER BY name')
    console.log(`总共创建了 ${customers.length} 个客户:`)
    customers.forEach(customer => {
      console.log(`  - ${customer.name} (${customer.phone}) - ${customer.city} - ¥${customer.total_purchases}`)
    })
    
    // 特别验证王二的数据
    console.log('\n👑 验证"王二"客户数据...')
    const [wangEr] = await connection.execute('SELECT * FROM customers WHERE name = ?', ['王二'])
    if (wangEr.length > 0) {
      const customer = wangEr[0]
      console.log('✅ "王二"客户数据:')
      console.log(`  - ID: ${customer.id}`)
      console.log(`  - 姓名: ${customer.name}`)
      console.log(`  - 电话: ${customer.phone}`)
      console.log(`  - 地址: ${customer.address}`)
      console.log(`  - 城市: ${customer.city}`)
      console.log(`  - 总订单数: ${customer.total_orders}`)
      console.log(`  - 总消费: ¥${customer.total_purchases}`)
      console.log(`  - 客户标签: ${customer.customer_labels}`)
    }
    
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error.message)
    console.error('错误详情:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 数据库连接已关闭')
    }
  }
}

// 运行脚本
createTestCustomers().then(() => {
  console.log('\n🎉 测试客户数据创建完成！')
  console.log('现在可以在客户管理页面查看这些数据了。')
}).catch(error => {
  console.error('❌ 脚本执行失败:', error)
})