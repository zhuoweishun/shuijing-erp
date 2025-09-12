import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function clearFakeIncome() {
  try {
    console.log('🔍 开始清理虚假收入数据...')
    
    // 1. 检查当前收入记录
    const incomeRecords = await prisma.financial_record.find_many({
      where: {
        recordType: 'INCOME'
      }
    })
    
    console.log(`当前收入记录数量: ${incomeRecords.length}`)
    
    if (incomeRecords.length === 0) {
      console.log('✅ 没有收入记录需要清理')
      return
    }
    
    // 2. 显示即将删除的收入记录
    console.log('\n📋 即将删除的虚假收入记录:')
    let totalFakeIncome = 0
    incomeRecords.for_each((record, index) => {
      console.log(`${index + 1}. ${record.description} - ¥${record.amount} (${record.reference_type}:${record.reference_id})`)
      totalFakeIncome += parseFloat(record.amount)
    })
    
    console.log(`\n💰 虚假收入总额: ¥${totalFakeIncome.to_fixed(2)}`)
    
    // 3. 检查这些记录的引用类型
    const saleReferences = incomeRecords.filter(r => r.reference_type === 'SALE')
    console.log(`\n🔍 引用虚假销售记录的数量: ${saleReferences.length}`)
    
    // 4. 开始删除操作
    console.log('\n🗑️ 开始删除虚假收入记录...')
    
    const deletedRecords = await prisma.financial_record.delete_many({
      where: {
        recordType: 'INCOME'
      }
    })
    
    console.log(`✅ 已删除 ${deletedRecords.count} 条虚假收入记录`)
    
    // 5. 验证清理结果
    const remainingIncome = await prisma.financial_record.count({
      where: {
        recordType: 'INCOME'
      }
    })
    
    const totalRecords = await prisma.financial_record.count()
    
    console.log('\n📊 清理后状态:')
    console.log(`- 剩余收入记录: ${remainingIncome}`)
    console.log(`- 总财务记录数: ${totalRecords}`)
    
    if (remainingIncome === 0) {
      console.log('\n🎉 虚假收入数据清理完成！')
      console.log('\n💡 现在财务统计将正确反映真实业务状况:')
      console.log('- 收入: ¥0.00 (无销售记录，符合实际情况)')
      console.log('- 支出: 采购成本 + 制作成本')
      console.log('- 利润: 负数 (纯支出状态，符合当前业务阶段)')
      console.log('\n📝 说明:')
      console.log('- 您确实没有进行过任何销售，所以收入为0是正确的')
      console.log('- 目前只有采购和制作成本，所以是亏损状态')
      console.log('- 这反映了真实的业务状况：投入阶段，尚未开始销售')
    } else {
      console.log('⚠️ 清理可能不完整，请检查')
    }
    
  } catch (error) {
    console.error('❌ 清理过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearFakeIncome()