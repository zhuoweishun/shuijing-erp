// 迁移采购记录状态的脚本 - 手动执行SQL
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migratePurchaseStatus() {
  try {
    console.log('🔄 开始迁移采购记录状态...')
    
    // 1. 查询当前状态分布
    console.log('\n查询当前状态分布...')
    const statusCounts = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM purchases 
      GROUP BY status
    `
    
    console.log('\n当前状态分布:')
    console.log('==============================')
    statusCounts.for_each(item => {
      console.log(`${item.status}: ${item.count}条`)
    })
    
    // 2. 修改枚举类型，添加新的状态值
    console.log('\n🔄 步骤1: 修改枚举类型，添加新状态值...')
    await prisma.$executeRaw`
      ALTER TABLE purchases MODIFY COLUMN status 
      ENUM('PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED', 'ACTIVE', 'USED')
    `
    console.log('✅ 枚举类型已更新')
    
    // 3. 将所有现有状态更新为ACTIVE
    console.log('\n🔄 步骤2: 将所有记录状态更新为ACTIVE...')
    const updateResult = await prisma.$executeRaw`
      UPDATE purchases 
      SET status = 'ACTIVE' 
      WHERE status IN ('PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED')
    `
    console.log(`✅ 已更新 ${updateResult} 条记录为ACTIVE状态`)
    
    // 4. 修改枚举类型，只保留新的状态值
    console.log('\n🔄 步骤3: 修改枚举类型，只保留新状态值...')
    await prisma.$executeRaw`
      ALTER TABLE purchases MODIFY COLUMN status 
      ENUM('ACTIVE', 'USED') DEFAULT 'ACTIVE'
    `
    console.log('✅ 枚举类型已简化')
    
    // 5. 验证迁移结果
    console.log('\n🔍 验证迁移结果...')
    const finalStatusCounts = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM purchases 
      GROUP BY status
    `
    
    console.log('\n迁移后状态分布:')
    console.log('==============================')
    finalStatusCounts.for_each(item => {
      console.log(`${item.status}: ${item.count}条`)
    })
    
    const totalResult = await prisma.$queryRaw`SELECT COUNT(*) as total FROM purchases`
    const total_count = totalResult[0].total
    console.log(`\n✅ 迁移完成！总计 ${total_count} 条采购记录，全部为ACTIVE状态`)
    
  } catch (error) {
    console.error('❌ 迁移失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 执行迁移
migratePurchaseStatus()