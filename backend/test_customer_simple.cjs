// 简单的客户数据测试脚本
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

async function testCustomerData() {
  let connection
  
  try {
    console.log('🔌 连接数据库...')
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ 数据库连接成功')
    
    // 检查customers表结构
    console.log('\n📋 检查customers表结构...')
    const [tableInfo] = await connection.execute('DESCRIBE customers')
    console.log('customers表字段:', tableInfo.map(field => `${field.Field} (${field.Type})`).join(', '))
    
    // 查询所有客户数据
    console.log('\n👥 查询所有客户数据...')
    const [customers] = await connection.execute('SELECT id, name, phone, address, created_at FROM customers ORDER BY created_at DESC LIMIT 10')
    console.log(`找到 ${customers.length} 个客户:`)
    customers.forEach(customer => {
      console.log(`  - ID: ${customer.id}, 姓名: ${customer.name}, 电话: ${customer.phone}, 地址: ${customer.address}`)
    })
    
    // 特别查找"王二"相关记录
    console.log('\n🔍 查找"王二"相关记录...')
    const [wangErRecords] = await connection.execute(
      'SELECT id, name, phone, address, created_at FROM customers WHERE name LIKE ? ORDER BY created_at DESC',
      ['%王二%']
    )
    console.log(`找到 ${wangErRecords.length} 个"王二"相关记录:`)
    wangErRecords.forEach(record => {
      console.log(`  - ID: ${record.id}, 姓名: ${record.name}, 电话: ${record.phone}, 地址: ${record.address}, 创建时间: ${record.created_at}`)
    })
    
    // 检查customer_purchases表
    console.log('\n💰 检查customer_purchases表...')
    const [purchaseCount] = await connection.execute('SELECT COUNT(*) as count FROM customer_purchases')
    console.log(`customer_purchases表中有 ${purchaseCount[0].count} 条记录`)
    
    if (purchaseCount[0].count > 0) {
      const [samplePurchases] = await connection.execute(
        'SELECT cp.*, c.name as customer_name FROM customer_purchases cp LEFT JOIN customers c ON cp.customer_id = c.id LIMIT 5'
      )
      console.log('前5条购买记录:')
      samplePurchases.forEach(purchase => {
        console.log(`  - 客户: ${purchase.customer_name}, 金额: ${purchase.total_amount}, 时间: ${purchase.purchase_date}`)
      })
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 数据库连接已关闭')
    }
  }
}

// 运行测试
testCustomerData().then(() => {
  console.log('\n✅ 客户数据测试完成')
}).catch(error => {
  console.error('❌ 测试脚本执行失败:', error)
})