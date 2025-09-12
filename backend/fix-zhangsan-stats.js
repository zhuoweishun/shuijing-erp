import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixZhangsanStats() {
  try {
    console.log('=== 开始修复张三的客户统计数据 ===')
    
    // 1. 查询张三的客户信息
    const customer = await prisma.customer.find_first({
      where: {
        name: {
          contains: '张三'
        }
      }
    })
    
    if (!customer) {
      console.log('❌ 未找到张三的客户记录')
      return
    }
    
    console.log(`\n找到客户: ${customer.name} (ID: ${customer.id})`)
    console.log(`当前统计数据:`)
    console.log(`  累计消费: ¥${customer.total_purchases || 0}`)
    console.log(`  订单数量: ${customer.total_orders || 0}`)
    console.log(`  首次购买: ${customer.first_purchase_date || '无'}`)
    console.log(`  最后购买: ${customer.last_purchase_date || '无'}`)
    
    // 2. 查询该客户的所有购买记录
    const purchases = await prisma.customer_purchase.find_many({
      where: {
        customer_id: customer.id
      },
      orderBy: {
        purchase_date: 'asc'
      }
    })
    
    console.log(`\n找到 ${purchases.length} 条购买记录`)
    
    if (purchases.length === 0) {
      console.log('该客户没有购买记录，无需更新统计数据')
      return
    }
    
    // 3. 计算正确的统计数据
    const totalAmount = purchases.reduce((sum, purchase) => sum + purchase.total_price, 0)
    const total_orders = purchases.length
    const first_purchase_date = purchases[0].purchaseDate
    const last_purchase_date = purchases[purchases.length - 1].purchaseDate
    
    console.log(`\n计算得出的正确统计数据:`)
    console.log(`  累计消费: ¥${totalAmount}`)
    console.log(`  订单数量: ${ total_orders }`)
    console.log(`  首次购买: ${ first_purchase_date }`)
    console.log(`  最后购买: ${ last_purchase_date }`)
    
    // 4. 检查数据库触发器是否存在
    console.log('\n检查数据库触发器状态...')
    try {
      const triggers = await prisma.$queryRaw`
        SHOW TRIGGERS FROM \`shuijing_erp\` 
        WHERE \`Table\` = 'customerPurchases'
      `
      
      console.log(`找到 ${triggers.length} 个相关触发器:`)
      triggers.for_each((trigger, index) => {
        console.log(`  ${index + 1}. ${trigger.Trigger} - ${trigger.Event} ${trigger.Timing}`)
      })
      
      if (triggers.length === 0) {
        console.log('⚠️  没有找到客户统计更新触发器，这可能是数据不同步的原因')
      }
    } catch (error) {
      console.log('⚠️  无法查询触发器状态:', error.message)
    }
    
    // 5. 手动更新客户统计数据
    console.log('\n开始手动更新客户统计数据...')
    
    const updatedCustomer = await prisma.customer.update({
      where: {
        id: customer.id
      },
      data: {
        total_purchases: totalAmount,
        total_orders: totalOrders,
        first_purchase_date: firstPurchaseDate,
        last_purchase_date: lastPurchaseDate,
        updated_at: new Date()
      }
    })
    
    console.log('✅ 客户统计数据更新成功!')
    console.log(`\n更新后的数据:`)
    console.log(`  累计消费: ¥${updatedCustomer.total_purchases}`)
    console.log(`  订单数量: ${updatedCustomer.total_orders}`)
    console.log(`  首次购买: ${updatedCustomer.first_purchase_date}`)
    console.log(`  最后购买: ${updatedCustomer.last_purchase_date}`)
    
    // 6. 验证更新结果
    console.log('\n验证更新结果...')
    const verifyCustomer = await prisma.customer.find_unique({
      where: { id: customer.id }
    })
    
    const amountMatch = Math.abs(verifyCustomer.total_purchases - totalAmount) < 0.01
    const orderMatch = verifyCustomer.total_orders === totalOrders
    
    console.log(`累计金额验证: ${amountMatch ? '✅' : '❌'}`)
    console.log(`订单数量验证: ${orderMatch ? '✅' : '❌'}`)
    
    if (amountMatch && orderMatch) {
      console.log('\n🎉 张三的客户统计数据修复完成!')
    } else {
      console.log('\n❌ 数据更新可能存在问题，请检查')
    }
    
    // 7. 检查客户类型
    console.log('\n检查客户类型...')
    let customer_type = 'NORMAL'
    
    if (totalOrders >= 3) {
      customerType = 'REPEAT' // 复购客户
    }
    if (totalAmount >= 5000) {
      customerType = 'VIP' // 大客户
    }
    
    const daysSinceLastPurchase = Math.floor((new Date() - new Date(last_purchase_date)) / (1000 * 60 * 60 * 24))
    if (daysSinceLastPurchase <= 30) {
      customerType = 'NEW' // 新客户
    } else if (daysSinceLastPurchase <= 90) {
      customerType = 'ACTIVE' // 活跃客户
    } else if (daysSinceLastPurchase > 180) {
      customerType = 'INACTIVE' // 流失客户
    }
    
    console.log(`建议的客户类型: ${ customer_type }`)
    
    // 如果客户表有customerType字段，更新它
    try {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { customer_type: customerType }
      })
      console.log(`✅ 客户类型已更新为: ${ customer_type }`)
    } catch (error) {
      console.log(`⚠️  客户类型字段可能不存在: ${error.message}`)
    }
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 执行修复
fixZhangsanStats()
  .then(() => {
    console.log('\n✅ 修复脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })