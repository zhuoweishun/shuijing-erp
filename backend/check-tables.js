import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkTables() {
  try {
    console.log('🔍 检查数据库表结构...')
    
    // 检查各个表是否存在
    const tables = [
      'sales',
      'financial_records', 
      'purchases',
      'product_skus'
    ]
    
    for (const tableName of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${tableName}`)
        console.log(`✅ 表 ${tableName}: ${result[0].count} 条记录`)
      } catch (error) {
        console.log(`❌ 表 ${tableName}: 不存在或无法访问`)
      }
    }
    
    // 显示所有表
    try {
      const allTables = await prisma.$queryRaw`SHOW TABLES`
      console.log('\n📋 数据库中的所有表:')
      allTables.for_each((table, index) => {
        const tableName = Object.values(table)[0]
        console.log(`${index + 1}. ${tableName}`)
      })
    } catch (error) {
      console.log('无法获取表列表:', error.message)
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTables()