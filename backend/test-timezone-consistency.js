import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'

const prisma = new PrismaClient()

async function testTimezoneConsistency() {
  try {
    console.log('=== 时区一致性测试 ===')
    console.log('测试时间:', new Date().to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }))
    console.log()
    
    // 1. 测试数据库时区
    console.log('1. 数据库时区测试:')
    await prisma.$executeRaw`SET timeZone = '+08:00'`
    const dbTimezone = await prisma.$queryRaw`SELECT @@session.timeZone as timezone`
    console.log('数据库会话时区:', dbTimezone[0].timezone)
    
    const dbTime = await prisma.$queryRaw`SELECT NOW() as now_time`
    console.log('数据库当前时间:', dbTime[0].now_time)
    console.log()
    
    // 2. 测试采购记录的时间
    console.log('2. 采购记录时间测试:')
    const latestPurchase = await prisma.purchase.find_first({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        purchase_code: true,
        purchase_date: true,
        created_at: true
      }
    })
    
    if (latestPurchase) {
      console.log('最新采购记录:')
      console.log('- ID:', latestPurchase.id)
      console.log('- 编码:', latestPurchase.purchase_code)
      console.log('- 采购日期:', latestPurchase.purchase_date)
      console.log('- 创建时间:', latestPurchase.created_at)
      console.log('- 采购日期(上海时区):', latestPurchase.purchase_date.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }))
      console.log('- 创建时间(上海时区):', latestPurchase.created_at.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }))
    } else {
      console.log('没有找到采购记录')
    }
    console.log()
    
    // 3. 测试财务记录的时间
    console.log('3. 财务记录时间测试:')
    const latestFinancial = await prisma.financial_record.find_first({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        description: true,
        transactionDate: true,
        created_at: true
      }
    })
    
    if (latestFinancial) {
      console.log('最新财务记录:')
      console.log('- ID:', latestFinancial.id)
      console.log('- 描述:', latestFinancial.description)
      console.log('- 交易日期:', latestFinancial.transactionDate)
      console.log('- 创建时间:', latestFinancial.created_at)
      console.log('- 交易日期(上海时区):', latestFinancial.transactionDate.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }))
      console.log('- 创建时间(上海时区):', latestFinancial.created_at.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }))
    } else {
      console.log('没有找到财务记录')
    }
    console.log()
    
    // 4. 测试API返回的时间格式
    console.log('4. API时间格式测试:')
    try {
      const response = await fetch('http://localhost:3001/api/v1/financial/transactions?limit=1')
      const data = await response.json()
      
      if (data.success && data.data.transactions.length > 0) {
        const transaction = data.data.transactions[0]
        console.log('API返回的最新交易记录:')
        console.log('- ID:', transaction.id)
        console.log('- 描述:', transaction.description)
        console.log('- 交易日期:', transaction.transactionDate)
        console.log('- 创建时间:', transaction.created_at)
        
        // 验证时间格式
        const createdAtDate = new Date(transaction.created_at)
        console.log('- 创建时间(解析后上海时区):', createdAtDate.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }))
      } else {
        console.log('API没有返回交易记录')
      }
    } catch (error) {
      console.log('API测试失败:', error.message)
    }
    console.log()
    
    // 5. 时区一致性验证
    console.log('5. 时区一致性验证:')
    const now = new Date()
    console.log('Node.js当前时间(系统):', now.to_string())
    console.log('Node.js当前时间(上海时区):', now.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' }))
    console.log('Node.js当前时间(ISO):', now.to_i_s_o_string())
    
    // 检查时区设置是否生效
    const envTZ = process.env.TZ
    console.log('环境变量TZ:', envTZ)
    console.log('系统时区偏移(分钟):', now.get_timezone_offset())
    
    console.log()
    console.log('=== 测试完成 ===')
    
  } catch (error) {
    console.error('时区一致性测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testTimezoneConsistency()