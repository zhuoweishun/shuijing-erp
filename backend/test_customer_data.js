import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') })

// 数据库配置
const db_config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shuijing_erp',
  charset: 'utf8mb4'
}

async function test_customer_data() {
  let connection
  
  try {
    console.log('🔍 开始检查客户数据...')
    console.log('📊 数据库配置:', {
      host: db_config.host,
      port: db_config.port,
      database: db_config.database
    })
    
    // 创建数据库连接
    connection = await mysql.createConnection(db_config)
    console.log('✅ 数据库连接成功')
    
    // 1. 检查customers表是否存在
    console.log('\n1. 检查customers表结构...')
    const [table_info] = await connection.execute(`
      DESCRIBE customers
    `)
    console.log('📋 customers表字段:', table_info.map(field => `${field.Field} (${field.Type})`).join(', '))
    
    // 2. 查询所有客户数据
    console.log('\n2. 查询所有客户数据...')
    const [all_customers] = await connection.execute(`
      SELECT customer_id, customer_name, customer_phone, customer_code, 
             total_spent, total_orders, created_at
      FROM customers 
      ORDER BY created_at DESC
    `)
    
    console.log(`📊 客户总数: ${all_customers.length}`)
    if (all_customers.length > 0) {
      console.log('👥 客户列表:')
      all_customers.forEach((customer, index) => {
        console.log(`  ${index + 1}. ${customer.customer_name} (${customer.customer_phone}) - 编号: ${customer.customer_code} - 消费: ¥${customer.total_spent} - 订单: ${customer.total_orders}次`)
      })
    } else {
      console.log('❌ 没有找到任何客户数据')
    }
    
    // 3. 特别查找'王二'的记录
    console.log('\n3. 查找"王二"的记录...')
    const [wang_er_records] = await connection.execute(`
      SELECT * FROM customers 
      WHERE customer_name LIKE '%王二%' OR customer_name LIKE '%测试客户王二%'
    `)
    
    if (wang_er_records.length > 0) {
      console.log('✅ 找到王二的记录:')
      wang_er_records.forEach(customer => {
        console.log('  详细信息:', customer)
      })
    } else {
      console.log('❌ 没有找到王二的记录')
    }
    
    // 4. 检查customer_purchases表
    console.log('\n4. 检查客户购买记录...')
    const [purchases] = await connection.execute(`
      SELECT cp.*, c.customer_name 
      FROM customer_purchases cp
      LEFT JOIN customers c ON cp.customer_id = c.customer_id
      ORDER BY cp.created_at DESC
      LIMIT 10
    `)
    
    console.log(`📊 购买记录总数: ${purchases.length}`)
    if (purchases.length > 0) {
      console.log('🛒 最近的购买记录:')
      purchases.forEach((purchase, index) => {
        console.log(`  ${index + 1}. ${purchase.customer_name} - SKU: ${purchase.sku_id} - 数量: ${purchase.quantity} - 金额: ¥${purchase.total_amount}`)
      })
    }
    
    // 5. 测试客户管理API
    console.log('\n5. 测试客户管理API...')
    await test_customer_api()
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔚 数据库连接已关闭')
    }
  }
}

async function test_customer_api() {
  try {
    const api_base_url = 'http://localhost:3001/api/v1'
    
    // 测试获取客户列表API
    console.log('🌐 测试GET /customers API...')
    const response = await fetch(`${api_base_url}/customers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzM3NzE0NzI5LCJleHAiOjE3Mzc4MDExMjl9.Hs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8