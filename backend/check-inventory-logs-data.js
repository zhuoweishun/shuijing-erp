// 检查库存变更日志数据问题的脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkInventoryLogsData() {
  try {
    console.log('🔍 检查库存变更日志数据问题...')
    
    // 1. 查找和田玉挂件SKU
    const hetianyuSku = await prisma.product_sku.find_first({
      where: {
        sku_name: {
          contains: '和田玉挂件'
        }
      }
    })
    
    if (!hetianyuSku) {
      console.log('❌ 未找到和田玉挂件SKU')
      return
    }
    
    console.log(`✅ 找到SKU: ${hetianyuSku.sku_name} (ID: ${hetianyuSku.id})`)
    
    // 2. 查看原始库存变更日志数据
    console.log('\n📋 原始库存变更日志数据:')
    const logs = await prisma.sku_inventory_log.find_many({
      where: { sku_id: hetianyuSku.id
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    console.log(`找到 ${logs.length} 条记录:`)
    logs.for_each((log, index) => {
      console.log(`\n${index + 1}. 记录详情:`)
      console.log(`   ID: ${log.id}`)
      console.log(`   SKU ID: ${log.sku_id}`)
      console.log(`   操作: ${log.action}`)
      console.log(`   变更类型: ${log.change_type}`)
      console.log(`   数量变更: ${log.quantityChange} (类型: ${typeof log.quantityChange})`)
      console.log(`   引用类型: ${log.referenceType}`)
      console.log(`   引用ID: ${log.reference_id}`)
      console.log(`   原因: ${log.reason || '无'}`)
      console.log(`   创建时间: ${log.created_at.to_locale_string()}`)
    })
    
    // 3. 检查数据库表结构
    console.log('\n🏗️ 检查表结构:')
    const tableInfo = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'sku_inventory_logs' 
      AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `
    
    console.log('sku_inventory_logs 表结构:')
    tableInfo.for_each(column => {
      console.log(`   ${column.COLUMN_NAME}: ${column.DATA_TYPE} (可空: ${column.IS_NULLABLE}, 默认值: ${column.COLUMN_DEFAULT})`)
    })
    
    // 4. 检查是否有其他SKU的正常数据
    console.log('\n🔍 检查其他SKU的库存日志数据:')
    const otherLogs = await prisma.sku_inventory_log.find_many({
      where: { sku_id: {
          not: hetianyuSku.id
        }
      },
      take: 5,
      orderBy: {
        created_at: 'desc'
      }
    })
    
    console.log(`其他SKU的最近5条记录:`)
    otherLogs.for_each((log, index) => {
      console.log(`   ${index + 1}. 操作: ${log.action}, 数量: ${log.quantityChange}, 引用类型: ${log.referenceType}`)
    })
    
    // 5. 检查和田玉挂件的具体数据问题
    console.log('\n🔍 和田玉挂件库存日志详细分析:')
    if (logs.length > 0) {
      console.log('发现问题：和田玉挂件的库存日志数据异常')
      console.log('所有quantityChange字段都显示为undefined，这表明数据库中的值可能有问题')
      
      // 直接查询数据库
      console.log('\n📊 直接查询数据库中的原始数据:')
      const rawData = await prisma.$queryRaw`
        SELECT id, action, quantityChange, quantityBefore, quantityAfter, referenceType, created_at
        FROM sku_inventory_logs 
        WHERE skuId = ${hetianyuSku.id}
        ORDER BY createdAt ASC
      `
      
      console.log('原始数据库记录:')
      rawData.for_each((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id}`)
        console.log(`      action: ${row.action}`)
        console.log(`      quantityChange: ${row.quantityChange} (类型: ${typeof row.quantityChange})`)
        console.log(`      quantityBefore: ${row.quantityBefore}`)
        console.log(`      quantityAfter: ${row.quantityAfter}`)
        console.log(`      referenceType: ${row.referenceType}`)
        console.log(`      created_at: ${row.created_at}`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkInventoryLogsData()