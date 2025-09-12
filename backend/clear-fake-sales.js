import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function clearFakeSales() {
  try {
    console.log('🔍 开始清理虚假销售数据...')
    
    // 1. 检查当前销售记录
    const salesCount = await prisma.sales.count()
    console.log(`当前销售记录数量: ${salesCount}`)
    
    if (salesCount === 0) {
      console.log('✅ 没有销售记录需要清理')
      return
    }
    
    // 2. 显示即将删除的销售记录
    const salesRecords = await prisma.sales.find_many({
      select: {
        id: true,
        saleDate: true,
        totalAmount: true,
        customer_name: true,
        sku_code: true
      }
    })
    
    console.log('\n📋 即将删除的销售记录:')
    salesRecords.for_each((sale, index) => {
      console.log(`${index + 1}. ID: ${sale.id}, 客户: ${sale.customer_name}, SKU: ${sale.sku_code}, 金额: ¥${sale.totalAmount}, 日期: ${sale.saleDate}`)
    })
    
    // 3. 检查相关的财务记录
    const financialRecords = await prisma.financialRecords.find_many({
      where: {
        referenceType: 'SALE'
      }
    })
    
    console.log(`\n💰 相关财务记录数量: ${financialRecords.length}`)
    
    // 4. 开始清理操作
    console.log('\n🗑️ 开始删除操作...')
    
    // 先删除相关的财务记录
    if (financialRecords.length > 0) {
      const deletedFinancial = await prisma.financialRecords.delete_many({
        where: {
          referenceType: 'SALE'
        }
      })
      console.log(`✅ 已删除 ${deletedFinancial.count} 条销售相关的财务记录`)
    }
    
    // 再删除销售记录
    const deletedSales = await prisma.sales.delete_many({})
    console.log(`✅ 已删除 ${deletedSales.count} 条销售记录`)
    
    // 5. 验证清理结果
    const remainingSales = await prisma.sales.count()
    const remainingFinancial = await prisma.financialRecords.count({
      where: {
        referenceType: 'SALE'
      }
    })
    
    console.log('\n📊 清理后状态:')
    console.log(`- 剩余销售记录: ${remainingSales}`)
    console.log(`- 剩余销售财务记录: ${remainingFinancial}`)
    
    if (remainingSales === 0 && remainingFinancial === 0) {
      console.log('\n🎉 虚假销售数据清理完成！')
      console.log('现在财务统计将只反映真实的业务状况：')
      console.log('- 收入: ¥0.00 (无销售记录)')
      console.log('- 支出: 采购成本 + 制作成本')
      console.log('- 利润: 负数 (纯支出状态)')
    } else {
      console.log('⚠️ 清理可能不完整，请检查')
    }
    
  } catch (error) {
    console.error('❌ 清理过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearFakeSales()