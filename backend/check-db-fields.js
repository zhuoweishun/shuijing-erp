import { PrismaClient } from '@prisma/client'

async function checkDatabaseFields() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 检查purchases表的字段名...')
    const result = await prisma.$queryRaw`DESCRIBE purchases`
    
    console.log('\npurchases表字段:')
    result.for_each(field => {
      console.log(`- ${field.Field}: ${field.Type}`)
    })
    
    // 特别检查materialType相关字段
    const materialTypeField = result.find(field => 
      field.Field === 'material_type' || field.Field === 'material_type' || field.Field === 'product_type' || field.Field === 'product_type'
    )
    
    if (materialTypeField) {
      console.log(`\n✅ 找到材料类型字段: ${materialTypeField.Field}`)
    } else {
      console.log('\n❌ 未找到材料类型字段')
    }
    
  } catch (error) {
    console.error('❌ 检查数据库字段失败:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabaseFields()