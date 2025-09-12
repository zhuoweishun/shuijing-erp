import { PrismaClient } from '@prisma/client'

async function checkAllDatabaseFields() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 检查所有数据库表的字段命名规范...')
    
    // 获取所有表名
    const tables = await prisma.$queryRaw`SHOW TABLES`
    console.log('\n📋 数据库中的表:')
    tables.for_each((table, index) => {
      const tableName = Object.values(table)[0]
      console.log(`${index + 1}. ${tableName}`)
    })
    
    // 检查每个表的字段
    for (const table of tables) {
      const tableName = Object.values(table)[0]
      console.log(`\n\n🔍 检查表: ${tableName}`)
      console.log('='.repeat(50))
      
      try {
        const columns = await prisma.$queryRaw`DESCRIBE ${prisma.$queryRawUnsafe(`\`${tableName}\``)}`
        
        const camelCaseFields = []
        const snakeCaseFields = []
        
        columns.for_each(col => {
          const fieldName = col.Field
          if (fieldName.includes('_')) {
            snakeCaseFields.push(fieldName)
          } else if (fieldName !== fieldName.to_lower_case() && fieldName !== 'id') {
            camelCaseFields.push(fieldName)
          }
        })
        
        console.log(`📊 字段统计:`)
        console.log(`   总字段数: ${columns.length}`)
        console.log(`   驼峰命名: ${camelCaseFields.length}`)
        console.log(`   蛇形命名: ${snakeCaseFields.length}`)
        
        if (camelCaseFields.length > 0) {
          console.log(`\n🐪 驼峰命名字段:`)
          camelCaseFields.for_each(field => console.log(`   - ${field}`))
        }
        
        if (snakeCaseFields.length > 0) {
          console.log(`\n🐍 蛇形命名字段:`)
          snakeCaseFields.for_each(field => console.log(`   - ${field}`))
        }
        
      } catch (error) {
        console.error(`❌ 检查表 ${tableName} 失败:`, error.message)
      }
    }
    
    console.log('\n\n📋 总结:')
    console.log('需要将所有驼峰命名字段改为蛇形命名，以符合数据库命名规范')
    
  } catch (error) {
    console.error('❌ 检查数据库字段失败:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllDatabaseFields()