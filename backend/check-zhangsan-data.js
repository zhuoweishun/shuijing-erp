import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkZhangsanData() {
  try {
    console.log('=== 开始检查张三的客户消费信息 ===')
    
    // 1. 查询名为"张三"的客户记录
    console.log('\n1. 查询张三的客户基本信息...')
    const customers = await prisma.customer.find_many({
      where: {
        name: {
          contains: '张三'
        }
      },
      include: {
        Count: {
          select: {
            purchases: true
          }
        }
      }
    })
    
    if (customers.length === 0) {
      console.log('❌ 未找到名为"张三"的客户记录')
      return
    }
    
    console.log(`✅ 找到 ${customers.length} 个匹配的客户记录:`)
    customers.for_each((customer, index) => {
      console.log(`\n客户 ${index + 1}:`)
      console.log(`  ID: ${customer.id}`)
      console.log(`  姓名: ${customer.name}`)
      console.log(`  手机号: ${customer.phone}`)
      console.log(`  地址: ${customer.address || '未填写'}`)
      console.log(`  累计消费: ¥${customer.total_purchases || 0}`)
      console.log(`  订单数量: ${customer.total_orders || 0}`)
      console.log(`  首次购买: ${customer.first_purchase_date || '无'}`)
      console.log(`  最后购买: ${customer.last_purchase_date || '无'}`)
      console.log(`  创建时间: ${customer.created_at}`)
      console.log(`  购买记录数量: ${customer.Count.purchases}`)
    })
    
    // 2. 检查每个张三客户的购买历史
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i]
      console.log(`\n\n2. 检查客户 "${customer.name}" (ID: ${customer.id}) 的购买历史...`)
      
      const purchases = await prisma.customer_purchase.find_many({
        where: {
          customer_id: customer.id
        },
        include: {
          sku: {
            select: {
              id: true,
              sku_code: true,
              sku_name: true,
              specification: true,
              selling_price: true
            }
          }
        },
        orderBy: {
          purchase_date: 'desc'
        }
      })
      
      if (purchases.length === 0) {
        console.log('❌ 该客户没有购买记录')
        continue
      }
      
      console.log(`✅ 找到 ${purchases.length} 条购买记录:`)
      
      let totalAmount = 0
      purchases.for_each((purchase, index) => {
        console.log(`\n  购买记录 ${index + 1}:`)
        console.log(`    购买ID: ${purchase.id}`)
        console.log(`    SKU编码: ${purchase.sku?.sku_code || '未知'}`)
        console.log(`    SKU名称: ${purchase.sku?.sku_name || '未知'}`)
        console.log(`    规格: ${purchase.sku?.specification || '未知'}`)
        console.log(`    购买数量: ${purchase.quantity}`)
        console.log(`    单价: ¥${purchase.unit_price}`)
        console.log(`    总价: ¥${purchase.total_price}`)
        console.log(`    购买日期: ${purchase.purchase_date}`)
        console.log(`    创建时间: ${purchase.created_at}`)
        
        totalAmount += purchase.total_price
      })
      
      console.log(`\n  📊 购买记录统计:`)
      console.log(`    总购买次数: ${purchases.length}`)
      console.log(`    计算总金额: ¥${totalAmount}`)
      console.log(`    客户记录中的累计消费: ¥${customer.total_purchases || 0}`)
      console.log(`    客户记录中的订单数量: ${customer.total_orders || 0}`)
      
      // 3. 检查数据一致性
      console.log(`\n  🔍 数据一致性检查:`)
      const amountMatch = Math.abs(totalAmount - (customer.total_purchases || 0)) < 0.01
      const orderCountMatch = purchases.length === (customer.total_orders || 0)
      
      console.log(`    累计金额是否一致: ${amountMatch ? '✅' : '❌'}`)
      console.log(`    订单数量是否一致: ${orderCountMatch ? '✅' : '❌'}`)
      
      if (!amountMatch) {
        console.log(`    ⚠️  金额差异: ${totalAmount - (customer.total_purchases || 0)}`)
      }
      
      if (!orderCountMatch) {
        console.log(`    ⚠️  订单数量差异: 实际${purchases.length}, 记录${customer.total_orders || 0}`)
      }
      
      // 4. 检查最新和最早购买日期
      if (purchases.length > 0) {
        const latestPurchase = purchases[0] // 已按日期降序排列
        const earliestPurchase = purchases[purchases.length - 1]
        
        console.log(`\n  📅 购买日期检查:`)
        console.log(`    最早购买: ${earliestPurchase.purchase_date}`)
        console.log(`    最新购买: ${latestPurchase.purchase_date}`)
        console.log(`    客户记录中的首次购买: ${customer.first_purchase_date || '无'}`)
        console.log(`    客户记录中的最后购买: ${customer.last_purchase_date || '无'}`)
        
        const firstDateMatch = customer.first_purchase_date && 
          new Date(customer.first_purchase_date).to_i_s_o_string().split('T')[0] === 
          new Date(earliestPurchase.purchase_date).to_i_s_o_string().split('T')[0]
          
        const lastDateMatch = customer.last_purchase_date && 
          new Date(customer.last_purchase_date).to_i_s_o_string().split('T')[0] === 
          new Date(latestPurchase.purchase_date).to_i_s_o_string().split('T')[0]
        
        console.log(`    首次购买日期是否一致: ${firstDateMatch ? '✅' : '❌'}`)
        console.log(`    最后购买日期是否一致: ${lastDateMatch ? '✅' : '❌'}`)
      }
    }
    
    // 5. 检查是否有孤立的购买记录
    console.log('\n\n3. 检查是否有孤立的购买记录...')
    const orphanPurchases = await prisma.customer_purchase.find_many({
      where: {
        customer_id: {
          not: {
            in: customers.map(c => c.id)
          }
        }
      }
    })
    
    if (orphanPurchases.length > 0) {
      console.log(`❌ 发现 ${orphanPurchases.length} 条孤立的购买记录（没有关联客户）`)
      orphanPurchases.for_each((purchase, index) => {
        console.log(`  孤立记录 ${index + 1}: ID=${purchase.id}, 客户ID=${purchase.customer_id}`)
      })
    } else {
      console.log('✅ 没有发现孤立的购买记录')
    }
    
    // 6. 检查客户类型计算
    console.log('\n\n4. 检查客户类型计算...')
    for (const customer of customers) {
      const purchase_count = customer.Count.purchases
      const totalAmount = customer.total_purchases || 0
      const last_purchase_date = customer.last_purchase_date
      
      console.log(`\n客户 "${customer.name}" 的类型分析:`)
      console.log(`  购买次数: ${ purchase_count }`)
      console.log(`  累计金额: ¥${totalAmount}`)
      console.log(`  最后购买: ${lastPurchaseDate || '无'}`)
      
      // 根据文档中的客户分类标准
      let customer_type = 'NORMAL'
      if (purchaseCount >= 3) {
        customerType = 'REPEAT' // 复购客户
      }
      if (totalAmount >= 5000) {
        customerType = 'VIP' // 大客户
      }
      if (last_purchase_date) {
        const daysSinceLastPurchase = Math.floor((new Date() - new Date(last_purchase_date)) / (1000 * 60 * 60 * 24))
        if (daysSinceLastPurchase <= 30) {
          customerType = 'NEW' // 新客户
        } else if (daysSinceLastPurchase <= 90) {
          customerType = 'ACTIVE' // 活跃客户
        } else if (daysSinceLastPurchase > 180) {
          customerType = 'INACTIVE' // 流失客户
        }
      }
      
      console.log(`  计算得出的客户类型: ${ customer_type }`)
      console.log(`  数据库中的客户类型: ${customer.customer_type || '未设置'}`)
      
      const typeMatch = customer.customer_type === customerType
      console.log(`  客户类型是否一致: ${typeMatch ? '✅' : '❌'}`)
    }
    
    console.log('\n=== 张三客户消费信息检查完成 ===')
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 执行检查
checkZhangsanData()
  .then(() => {
    console.log('\n✅ 检查脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })