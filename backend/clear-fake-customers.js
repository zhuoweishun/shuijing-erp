import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearFakeCustomers() {
  try {
    console.log('=== 开始清除假客户数据 ===')
    
    // 1. 清除客户备注记录
    console.log('\n1. 清除客户备注记录...')
    const deletedNotes = await prisma.customer_note.delete_many({})
    console.log(`已删除 ${deletedNotes.count} 条客户备注记录`)
    
    // 2. 清除客户购买记录
    console.log('\n2. 清除客户购买记录...')
    const deletedPurchases = await prisma.customer_purchase.delete_many({})
    console.log(`已删除 ${deletedPurchases.count} 条客户购买记录`)
    
    // 3. 清除客户基本信息
    console.log('\n3. 清除客户基本信息...')
    const deletedCustomers = await prisma.customer.delete_many({})
    console.log(`已删除 ${deletedCustomers.count} 条客户记录`)
    
    // 4. 验证清除结果
    console.log('\n4. 验证清除结果...')
    const remainingCustomers = await prisma.customer.count()
    const remainingPurchases = await prisma.customer_purchase.count()
    const remainingNotes = await prisma.customer_note.count()
    
    console.log(`剩余客户数: ${remainingCustomers}`)
    console.log(`剩余购买记录数: ${remainingPurchases}`)
    console.log(`剩余备注记录数: ${remainingNotes}`)
    
    if (remainingCustomers === 0 && remainingPurchases === 0 && remainingNotes === 0) {
      console.log('\n✅ 假客户数据清除完成！')
    } else {
      console.log('\n❌ 数据清除不完整，请检查！')
    }
    
  } catch (error) {
    console.error('清除数据失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearFakeCustomers()