// 清理虚拟客户数据脚本
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
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
}

// 测试客户名单（需要删除的虚拟客户）
const test_customer_names = [
  '王二',
  '李三', 
  '张四',
  '赵五',
  '钱六',
  '测试客户',
  'test',
  'Test',
  'TEST'
]

// 测试客户ID（需要删除的虚拟客户ID）
const test_customer_ids = [
  'cust_001',
  'cust_002',
  'cust_003',
  'cust_004',
  'cust_005'
]

// 测试电话号码前缀（虚拟号码）
const test_phone_prefixes = [
  '13800138',  // 测试号码段
  '12345678',  // 假号码
  '11111111',  // 假号码
  '99999999'   // 假号码
]

async function clear_test_customers() {
  let connection
  
  try {
    console.log('🔍 开始清理虚拟客户数据...')
    console.log('📊 数据库配置:', {
      host: db_config.host,
      port: db_config.port,
      database: db_config.database
    })
    
    // 创建数据库连接
    connection = await mysql.createConnection(db_config)
    console.log('✅ 数据库连接成功')
    
    // 1. 查询现有客户数据
    console.log('\n1. 查询现有客户数据...')
    const [all_customers] = await connection.execute(`
      SELECT id, name, phone, address, created_at
      FROM customers 
      ORDER BY created_at DESC
    `)
    
    console.log(`📊 当前客户总数: ${all_customers.length}`)
    if (all_customers.length > 0) {
      console.log('👥 现有客户列表:')
      all_customers.forEach((customer, index) => {
        console.log(`  ${index + 1}. ${customer.name} (${customer.phone}) - ID: ${customer.id}`)
      })
    }
    
    // 2. 识别需要删除的测试客户
    console.log('\n2. 识别测试客户...')
    const customers_to_delete = []
    
    for (const customer of all_customers) {
      let is_test_customer = false
      let reason = ''
      
      // 检查客户名称
      for (const test_name of test_customer_names) {
        if (customer.name && customer.name.includes(test_name)) {
          is_test_customer = true
          reason = `姓名包含测试关键词: ${test_name}`
          break
        }
      }
      
      // 检查客户ID
      if (!is_test_customer && test_customer_ids.includes(customer.id)) {
        is_test_customer = true
        reason = `ID为测试ID: ${customer.id}`
      }
      
      // 检查电话号码
      if (!is_test_customer && customer.phone) {
        for (const prefix of test_phone_prefixes) {
          if (customer.phone.startsWith(prefix)) {
            is_test_customer = true
            reason = `电话号码为测试号码: ${customer.phone}`
            break
          }
        }
      }
      
      if (is_test_customer) {
        customers_to_delete.push({
          ...customer,
          delete_reason: reason
        })
      }
    }
    
    console.log(`🎯 识别到 ${customers_to_delete.length} 个测试客户需要删除:`)
    customers_to_delete.forEach((customer, index) => {
      console.log(`  ${index + 1}. ${customer.name} (${customer.phone}) - ${customer.delete_reason}`)
    })
    
    if (customers_to_delete.length === 0) {
      console.log('✅ 没有发现测试客户，数据库已经是干净的')
      return
    }
    
    // 3. 删除测试客户的购买记录
    console.log('\n3. 删除测试客户的购买记录...')
    let total_purchases_deleted = 0
    
    for (const customer of customers_to_delete) {
      // 查询该客户的购买记录数量
      const [purchase_count] = await connection.execute(
        'SELECT COUNT(*) as count FROM customer_purchases WHERE customer_id = ?',
        [customer.id]
      )
      
      const count = purchase_count[0].count
      if (count > 0) {
        // 删除购买记录
        await connection.execute(
          'DELETE FROM customer_purchases WHERE customer_id = ?',
          [customer.id]
        )
        console.log(`  ✅ 删除客户 ${customer.name} 的 ${count} 条购买记录`)
        total_purchases_deleted += count
      }
    }
    
    console.log(`📊 总共删除了 ${total_purchases_deleted} 条购买记录`)
    
    // 4. 删除测试客户
    console.log('\n4. 删除测试客户...')
    let customers_deleted = 0
    
    for (const customer of customers_to_delete) {
      await connection.execute(
        'DELETE FROM customers WHERE id = ?',
        [customer.id]
      )
      console.log(`  ✅ 删除客户: ${customer.name} (${customer.phone})`)
      customers_deleted++
    }
    
    console.log(`📊 总共删除了 ${customers_deleted} 个测试客户`)
    
    // 5. 验证清理结果
    console.log('\n5. 验证清理结果...')
    const [remaining_customers] = await connection.execute(`
      SELECT id, name, phone, address, created_at
      FROM customers 
      ORDER BY created_at DESC
    `)
    
    console.log(`📊 清理后客户总数: ${remaining_customers.length}`)
    if (remaining_customers.length > 0) {
      console.log('👥 剩余客户列表:')
      remaining_customers.forEach((customer, index) => {
        console.log(`  ${index + 1}. ${customer.name} (${customer.phone}) - ID: ${customer.id}`)
      })
    } else {
      console.log('📝 数据库中没有剩余客户数据')
    }
    
    // 6. 检查购买记录
    const [remaining_purchases] = await connection.execute(
      'SELECT COUNT(*) as count FROM customer_purchases'
    )
    console.log(`📊 剩余购买记录数: ${remaining_purchases[0].count}`)
    
    console.log('\n🎉 虚拟客户数据清理完成！')
    console.log('📋 清理总结:')
    console.log(`  - 删除测试客户: ${customers_deleted} 个`)
    console.log(`  - 删除购买记录: ${total_purchases_deleted} 条`)
    console.log(`  - 剩余真实客户: ${remaining_customers.length} 个`)
    console.log(`  - 剩余购买记录: ${remaining_purchases[0].count} 条`)
    
  } catch (error) {
    console.error('❌ 清理过程中出现错误:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔚 数据库连接已关闭')
    }
  }
}

// 运行清理脚本
clear_test_customers().then(() => {
  console.log('\n✅ 清理脚本执行完成')
}).catch(error => {
  console.error('❌ 清理脚本执行失败:', error)
})