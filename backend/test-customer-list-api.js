import axios from 'axios'
import jwt from 'jsonwebtoken'

// 配置
const API_BASE_URL = 'http://localhost:3001/api/v1'
const jwt_secret = 'crystal_erp_jwt_secret_key_2024'

// 生成测试用的JWT token
function generateTestToken() {
  const payload = {
    userId: 'cmf0mj7oq0000489eo1vijdjq', // 使用实际的boss用户ID
    username: 'boss',
    role: 'BOSS'
  }
  return jwt.sign(payload, jwt_secret, { expiresIn: '1h' })
}

// 测试客户列表API
async function testCustomerListAPI() {
  try {
    console.log('=== 测试客户列表API ===\n')
    
    const token = generateTestToken()
    console.log('✅ 生成测试token成功')
    
    // 调用客户列表API
    const response = await axios.get(`${API_BASE_URL}/customers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        page: 1,
        limit: 20
      }
    })
    
    console.log('✅ 客户列表API调用成功')
    console.log('📊 响应状态:', response.status)
    console.log('📋 响应数据结构:')
    console.log('  - success:', response.data.success)
    console.log('  - message:', response.data.message)
    console.log('  - 客户数量:', response.data.data.customers.length)
    console.log('  - 分页信息:', response.data.data.pagination)
    
    // 查找张三的数据
    const zhangsan = response.data.data.customers.find(customer => customer.name === '张三')
    
    if (zhangsan) {
      console.log('\n🎯 找到张三的客户信息:')
      console.log('  - ID:', zhangsan.id)
      console.log('  - 姓名:', zhangsan.name)
      console.log('  - 手机号:', zhangsan.phone)
      console.log('  - 累计消费 (totalPurchases):', zhangsan.total_purchases)
      console.log('  - 累计消费 (totalPurchases):', zhangsan.total_purchases)
      console.log('  - 订单数量 (total_orders):', zhangsan.total_orders)
      console.log('  - 订单数量 (total_orders):', zhangsan.total_orders)
      console.log('  - 首次购买日期:', zhangsan.first_purchase_date || zhangsan.first_purchase_date)
      console.log('  - 最后购买日期:', zhangsan.last_purchase_date || zhangsan.last_purchase_date)
      console.log('  - 客户类型:', zhangsan.customer_type)
      console.log('  - 购买记录数量 (_count.purchases):', zhangsan._count?.purchases)
      
      // 检查数据一致性
      console.log('\n🔍 数据一致性检查:')
      const total_purchases = zhangsan.total_purchases || zhangsan.total_purchases || 0
      const total_orders = zhangsan.total_orders || zhangsan.total_orders || 0
      
      if (totalPurchases > 0) {
        console.log('  ✅ 累计消费金额正常:', `¥${ total_purchases }`)
      } else {
        console.log('  ❌ 累计消费金额为0，可能存在问题')
      }
      
      if (totalOrders > 0) {
        console.log('  ✅ 订单数量正常:', totalOrders)
      } else {
        console.log('  ❌ 订单数量为0，可能存在问题')
      }
      
    } else {
      console.log('\n❌ 未找到张三的客户信息')
      console.log('📋 当前客户列表:')
      response.data.data.customers.for_each((customer, index) => {
        console.log(`  ${index + 1}. ${customer.name} (${customer.phone})`)
      })
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    if (error.response) {
      console.error('📋 错误响应:', error.response.status, error.response.data)
    }
  }
}

// 执行测试
testCustomerListAPI()
  .then(() => {
    console.log('\n=== 客户列表API测试完成 ===')
    process.exit(0)
  })
  .catch(error => {
    console.error('测试执行失败:', error)
    process.exit(1)
  })