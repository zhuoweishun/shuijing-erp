// 回退SKU20250924001不完整销售操作的脚本
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') })

const prisma = new PrismaClient()

async function rollback_sku_sale() {
  try {
    console.log('🔄 开始回退SKU20250924001的不完整销售操作...')
    
    // 1. 查找SKU信息
    const sku = await prisma.productSku.findFirst({
      where: { sku_code: 'SKU20250924001' }
    })
    
    if (!sku) {
      console.log('❌ 未找到SKU20250924001')
      return
    }
    
    console.log('📦 当前SKU状态:')
    console.log(`  - SKU编码: ${sku.sku_code}`)
    console.log(`  - SKU名称: ${sku.sku_name}`)
    console.log(`  - 总库存: ${sku.total_quantity}`)
    console.log(`  - 可用库存: ${sku.available_quantity}`)
    console.log(`  - 售价: ¥${sku.selling_price}`)
    
    // 2. 查找相关的库存变更日志
    const inventory_logs = await prisma.skuInventoryLog.findMany({
      where: {
        sku_id: sku.id,
        action: 'SELL'
      },
      orderBy: { created_at: 'desc' },
      take: 5
    })
    
    console.log('\n📋 最近的SELL操作记录:')
    inventory_logs.forEach((log, index) => {
      console.log(`  ${index + 1}. 时间: ${log.created_at.toLocaleString()}`)
      console.log(`     动作: ${log.action}`)
      console.log(`     数量变化: ${log.quantity_change}`)
      console.log(`     变化前: ${log.quantity_before}`)
      console.log(`     变化后: ${log.quantity_after}`)
      console.log(`     备注: ${log.notes || '无'}`)
      console.log(`     ID: ${log.id}`)
      console.log('')
    })
    
    // 3. 检查是否有销售记录
    const sales_records = await prisma.customerPurchases.findMany({
      where: { sku_id: sku.id },
      include: {
        customers: true
      },
      orderBy: { created_at: 'desc' },
      take: 5
    })
    
    console.log('🛒 相关销售记录:')
    if (sales_records.length === 0) {
      console.log('  ❌ 没有找到任何销售记录（确认是不完整的销售操作）')
    } else {
      sales_records.forEach((record, index) => {
        console.log(`  ${index + 1}. 客户: ${record.customers.name}`)
        console.log(`     数量: ${record.quantity}`)
        console.log(`     金额: ¥${record.total_price}`)
        console.log(`     时间: ${record.created_at.toLocaleString()}`)
        console.log('')
      })
    }
    
    // 4. 执行回退操作
    if (sku.available_quantity === 0 && inventory_logs.length > 0) {
      console.log('\n🔧 执行回退操作...')
      
      // 找到最近的SELL操作
      const latest_sell_log = inventory_logs[0]
      
      if (latest_sell_log && latest_sell_log.notes === '好好') {
        console.log(`📝 找到目标SELL操作记录 (ID: ${latest_sell_log.id})`)
        
        await prisma.$transaction(async (tx) => {
          // 恢复SKU库存
          await tx.productSku.update({
            where: { id: sku.id },
            data: {
              available_quantity: {
                increment: Math.abs(latest_sell_log.quantity_change)
              },
              updated_at: new Date()
            }
          })
          
          // 创建回退日志记录
          await tx.skuInventoryLog.create({
            data: {
              sku_id: sku.id,
              action: 'ADJUST',
              quantity_change: Math.abs(latest_sell_log.quantity_change),
              quantity_before: sku.available_quantity,
              quantity_after: sku.available_quantity + Math.abs(latest_sell_log.quantity_change),
              reference_type: 'MANUAL',
              reference_id: latest_sell_log.id,
              notes: `回退不完整的销售操作 (原记录ID: ${latest_sell_log.id})`,
              user_id: latest_sell_log.user_id
            }
          })
          
          // 可选：删除或标记原始的SELL记录
          await tx.skuInventoryLog.update({
            where: { id: latest_sell_log.id },
            data: {
              notes: `${latest_sell_log.notes} [已回退 - ${new Date().toLocaleString()}]`
            }
          })
        })
        
        console.log('✅ 回退操作完成！')
        
        // 5. 验证回退结果
        const updated_sku = await prisma.productSku.findFirst({
          where: { sku_code: 'SKU20250924001' }
        })
        
        console.log('\n🎯 回退后的SKU状态:')
        console.log(`  - 总库存: ${updated_sku.total_quantity}`)
        console.log(`  - 可用库存: ${updated_sku.available_quantity}`)
        console.log(`  - 状态: ${updated_sku.available_quantity > 0 ? '可销售' : '无库存'}`)
        
        console.log('\n✅ SKU20250924001已成功回退，现在可以重新进行销售测试！')
        
      } else {
        console.log('⚠️ 未找到匹配的SELL操作记录，请手动检查')
      }
    } else {
      console.log('\n⚠️ SKU库存状态正常或没有需要回退的操作')
    }
    
  } catch (error) {
    console.error('❌ 回退操作失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 执行回退操作
rollback_sku_sale().then(() => {
  console.log('\n🏁 回退脚本执行完成')
}).catch(error => {
  console.error('❌ 脚本执行失败:', error)
})