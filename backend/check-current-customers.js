import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCurrentCustomers() {
  try {
    console.log('=== 检查当前客户数据情况 ===')
    
    // 检查客户表
    const customers = await prisma.customer.find_many({
      include: {
        purchases: true,
        customerNotes: true
      }
    })
    
    console.log('\n客户总数:', customers.length)
    
    if (customers.length === 0) {
      console.log('当前没有客户数据')
      return
    }
    
    customers.for_each((customer, index) => {
      console.log(`\n--- 客户 ${index + 1} ---`)
      console.log('ID:', customer.id)
      console.log('姓名:', customer.name)
      console.log('手机号:', customer.phone)
      console.log('地址:', customer.address || '无')
      console.log('累计购买金额:', customer.total_purchases)
      console.log('累计订单数:', customer.total_orders)
      console.log('首次购买日期:', customer.first_purchase_date)
      console.log('最后购买日期:', customer.last_purchase_date)
      console.log('购买记录数:', customer.purchases.length)
      console.log('备注记录数:', customer.customerNotes.length)
      
      // 显示购买记录详情
      if (customer.purchases.length > 0) {
        console.log('购买记录:')
        customer.purchases.for_each((purchase, pIndex) => {
          console.log(`  ${pIndex + 1}. SKU: ${purchase.sku_name}, 数量: ${purchase.quantity}, 总价: ${purchase.total_price}, 状态: ${purchase.status}`)
        })
      }
      
      // 显示备注记录详情
      if (customer.customerNotes.length > 0) {
        console.log('备注记录:')
        customer.customerNotes.for_each((note, nIndex) => {
          console.log(`  ${nIndex + 1}. 分类: ${note.category}, 内容: ${note.content}`)
        })
      }
    })
    
    // 统计信息
    const total_purchases = customers.reduce((sum, customer) => sum + customer.purchases.length, 0)
    const totalNotes = customers.reduce((sum, customer) => sum + customer.customerNotes.length, 0)
    const totalAmount = customers.reduce((sum, customer) => sum + parseFloat(customer.total_purchases || 0), 0)
    
    console.log('\n=== 统计信息 ===')
    console.log('总购买记录数:', totalPurchases)
    console.log('总备注记录数:', totalNotes)
    console.log('总购买金额:', totalAmount.to_fixed(2))
    
  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCurrentCustomers()