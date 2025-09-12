import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkZhangsanCreatedTime() {
  try {
    console.log('=== 检查张三的注册时间信息 ===')
    
    // 1. 查询名为"张三"的客户记录
    console.log('\n1. 查询张三的客户基本信息...')
    const customers = await prisma.customer.find_many({
      where: {
        name: {
          contains: '张三'
        }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        notes: true,
        total_purchases: true,
        total_orders: true,
        first_purchase_date: true,
        last_purchase_date: true,
        created_at: true,
        updated_at: true
      }
    })
    
    if (customers.length === 0) {
      console.log('❌ 未找到名为"张三"的客户记录')
      return
    }
    
    console.log(`✅ 找到 ${customers.length} 个张三的客户记录:`)
    
    customers.for_each((customer, index) => {
      console.log(`\n--- 客户记录 ${index + 1} ---`)
      console.log(`ID: ${customer.id}`)
      console.log(`姓名: ${customer.name}`)
      console.log(`手机号: ${customer.phone}`)
      console.log(`地址: ${customer.address || '未填写'}`)
      console.log(`备注: ${customer.notes || '无'}`)
      console.log(`累计购买金额: ${customer.total_purchases}`)
      console.log(`累计订单数量: ${customer.total_orders}`)
      console.log(`首次购买日期: ${customer.first_purchase_date || '暂无'}`)
      console.log(`最后购买日期: ${customer.last_purchase_date || '暂无'}`)
      console.log(`创建时间 (createdAt): ${customer.created_at}`)
      console.log(`更新时间 (updatedAt): ${customer.updated_at}`)
      
      // 检查createdAt字段
      if (!customer.created_at) {
        console.log('⚠️  警告: createdAt字段为空!')
      } else {
        console.log(`✅ createdAt字段正常: ${customer.created_at.to_i_s_o_string()}`)
        console.log(`   格式化显示: ${customer.created_at.to_locale_string('zh-CN')}`)
      }
      
      // 检查updatedAt字段
      if (!customer.updated_at) {
        console.log('⚠️  警告: updatedAt字段为空!')
      } else {
        console.log(`✅ updatedAt字段正常: ${customer.updated_at.to_i_s_o_string()}`)
        console.log(`   格式化显示: ${customer.updated_at.to_locale_string('zh-CN')}`)
      }
    })
    
    // 2. 检查数据库schema中的默认值设置
    console.log('\n2. 检查数据库表结构...')
    const tableInfo = await prisma.$queryRaw`
      DESCRIBE customers
    `
    
    console.log('\n客户表字段信息:')
    console.table(tableInfo)
    
    // 3. 如果发现createdAt为空，尝试修复
    const customersWithNullCreatedAt = customers.filter(c => !c.created_at)
    
    if (customersWithNullCreatedAt.length > 0) {
      console.log(`\n3. 发现 ${customersWithNullCreatedAt.length} 个客户的createdAt字段为空，尝试修复...`)
      
      for (const customer of customersWithNullCreatedAt) {
        console.log(`\n修复客户: ${customer.name} (${customer.phone})`)
        
        // 使用firstPurchaseDate作为createdAt，如果没有则使用当前时间
        const createdAtValue = customer.first_purchase_date || new Date()
        
        const updatedCustomer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            created_at: createdAtValue
          }
        })
        
        console.log(`✅ 已修复客户 ${customer.name} 的createdAt字段: ${createdAtValue.to_i_s_o_string()}`)
      }
    } else {
      console.log('\n3. 所有客户的createdAt字段都正常')
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行检查
checkZhangsanCreatedTime()
  .then(() => {
    console.log('\n=== 检查完成 ===')
  })
  .catch((error) => {
    console.error('脚本执行失败:', error)
    process.exit(1)
  })