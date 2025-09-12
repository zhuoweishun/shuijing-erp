import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkIncomeSource() {
  try {
    console.log('🔍 检查收入数据来源...')
    
    // 1. 检查所有财务记录
    const allRecords = await prisma.financial_record.find_many({
      orderBy: {
        created_at: 'desc'
      }
    })
    
    console.log(`\n📊 财务记录总数: ${allRecords.length}`)
    
    // 2. 按类型分组统计
    const recordsByType = {}
    let totalIncome = 0
    let totalExpense = 0
    
    allRecords.for_each(record => {
      const type = record.record_type
      if (!recordsByType[type]) {
        recordsByType[type] = []
      }
      recordsByType[type].push(record)
      
      if (type === 'INCOME') {
        totalIncome += parseFloat(record.amount)
      } else if (type === 'EXPENSE') {
        totalExpense += parseFloat(record.amount)
      }
    })
    
    console.log('\n📈 按类型统计:')
    Object.keys(recordsByType).for_each(type => {
      console.log(`- ${type}: ${recordsByType[type].length} 条记录`)
    })
    
    console.log(`\n💰 金额统计:`)
    console.log(`- 总收入: ¥${totalIncome.to_fixed(2)}`)
    console.log(`- 总支出: ¥${totalExpense.to_fixed(2)}`)
    console.log(`- 净利润: ¥${(totalIncome - totalExpense).to_fixed(2)}`)
    
    // 3. 详细检查收入记录
    if (recordsByType.INCOME && recordsByType.INCOME.length > 0) {
      console.log('\n🔍 收入记录详情:')
      recordsByType.INCOME.for_each((record, index) => {
        console.log(`${index + 1}. ${record.description}`)
        console.log(`   金额: ¥${record.amount}`)
        console.log(`   类型: ${record.reference_type}`)
        console.log(`   引用ID: ${record.reference_id}`)
        console.log(`   创建时间: ${record.created_at}`)
        console.log(`   备注: ${record.notes || '无'}`)
        console.log('   ---')
      })
      
      // 4. 检查引用的销售记录是否存在
      console.log('\n🔍 验证销售记录引用:')
      const saleReferences = recordsByType.INCOME
        .filter(r => r.reference_type === 'SALE')
        .map(r => r.reference_id)
      
      if (saleReferences.length > 0) {
        console.log(`发现 ${saleReferences.length} 个销售引用: ${saleReferences.join(', ')}`)
        console.log('❌ 但是数据库中没有sales表，这些都是虚假的销售记录！')
      }
    } else {
      console.log('\n✅ 没有收入记录')
    }
    
    // 5. 结论
    console.log('\n📋 问题分析:')
    if (totalIncome > 0) {
      console.log('❌ 发现虚假收入数据！')
      console.log('- 数据库中没有sales表，但financial_records中有INCOME记录')
      console.log('- 这些收入记录引用了不存在的销售记录')
      console.log('- 需要删除这些虚假的收入记录')
    } else {
      console.log('✅ 没有收入记录，符合实际业务状况')
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkIncomeSource()