// 检查和田玉挂件库存计算问题的脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkHetianyuInventory() {
  try {
    console.log('🔍 检查和田玉挂件库存计算问题...')
    
    // 1. 查找和田玉挂件的采购记录
    console.log('\n📦 1. 查找和田玉挂件采购记录:')
    const hetianyuPurchases = await prisma.purchase.find_many({
      where: {
        product_name: {
          contains: '和田玉挂件'
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    console.log(`   找到 ${hetianyuPurchases.length} 条采购记录`)
    let totalPurchased = 0
    hetianyuPurchases.for_each((purchase, index) => {
      console.log(`   ${index + 1}. ID: ${purchase.id}, 数量: ${purchase.quantity}, 状态: ${purchase.status}, 创建时间: ${purchase.created_at.to_locale_string()}`)
      totalPurchased += purchase.quantity
    })
    console.log(`   📊 采购总数量: ${totalPurchased} 件`)
    
    // 2. 查找和田玉挂件SKU
    console.log('\n🏷️ 2. 查找和田玉挂件SKU:')
    const hetianyuSku = await prisma.product_sku.find_first({
      where: {
        sku_name: {
          contains: '和田玉挂件'
        }
      },
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: true
              }
            }
          }
        }
      }
    })
    
    if (!hetianyuSku) {
      console.log('   ❌ 未找到和田玉挂件SKU')
      return
    }
    
    console.log(`   ✅ 找到SKU: ${hetianyuSku.sku_name}`)
    console.log(`   📊 当前库存: 总量=${hetianyuSku.total_quantity}, 可售=${hetianyuSku.available_quantity}`)
    
    // 3. 查找所有库存变更日志
    console.log('\n📋 3. 查找库存变更日志:')
    const inventoryLogs = await prisma.sku_inventory_log.find_many({
      where: { sku_id: hetianyuSku.id
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    console.log(`   找到 ${inventoryLogs.length} 条库存变更记录:`)
    let calculatedQuantity = 0
    inventoryLogs.for_each((log, index) => {
      const change = log.quantity_change > 0 ? `+${log.quantity_change}` : `${log.quantity_change}`
      
      calculatedQuantity = log.quantity_after // 直接使用变更后的数量
      
      console.log(`   ${index + 1}. ${log.action} ${change} (${log.reference_type}) - 原因: ${log.notes || '无'} - 时间: ${log.created_at.to_locale_string()}`)
      console.log(`      变更前: ${log.quantity_before}, 变更后: ${log.quantity_after}`)
    })
    
    // 4. 分析操作历史
    console.log('\n🔍 4. 操作历史分析:')
    const createLogs = inventoryLogs.filter(log => log.action === 'CREATE')
    const adjustLogs = inventoryLogs.filter(log => log.action === 'ADJUST')
    const sellLogs = inventoryLogs.filter(log => log.action === 'SELL')
    const destroyLogs = inventoryLogs.filter(log => log.action === 'DESTROY')
    
    console.log(`   📝 制作(CREATE): ${createLogs.length} 次`)
    createLogs.for_each(log => {
      console.log(`      - ${log.quantity_change} 件 (${log.created_at.to_locale_string()})`)
    })
    
    console.log(`   🔄 补货(ADJUST): ${adjustLogs.length} 次`)
    adjustLogs.for_each(log => {
      const change = log.quantity_change > 0 ? `+${log.quantity_change}` : `${log.quantity_change}`
      console.log(`      - ${change} 件 (${log.created_at.to_locale_string()}) - 原因: ${log.notes || '无'}`)
    })
    
    console.log(`   💰 销售(SELL): ${sellLogs.length} 次`)
    sellLogs.for_each(log => {
      console.log(`      - ${log.quantity_change} 件 (${log.created_at.to_locale_string()})`)
    })
    
    console.log(`   🗑️ 销毁(DESTROY): ${destroyLogs.length} 次`)
    destroyLogs.for_each(log => {
      console.log(`      - ${log.quantity_change} 件 (${log.created_at.to_locale_string()}) - 原因: ${log.notes || '无'}`)
    })
    
    // 5. 计算预期库存
    console.log('\n📊 5. 库存计算验证:')
    const totalCreated = createLogs.reduce((sum, log) => sum + log.quantity_change, 0)
    const totalAdjustIncrease = adjustLogs.filter(log => log.quantity_change > 0).reduce((sum, log) => sum + log.quantity_change, 0)
    const totalAdjustDecrease = adjustLogs.filter(log => log.quantity_change < 0).reduce((sum, log) => sum + Math.abs(log.quantity_change), 0)
    const totalSold = sellLogs.reduce((sum, log) => sum + Math.abs(log.quantity_change), 0)
    const totalDestroyed = destroyLogs.reduce((sum, log) => sum + Math.abs(log.quantity_change), 0)
    
    console.log(`   制作总量: ${totalCreated} 件`)
    console.log(`   补货增加: ${totalAdjustIncrease} 件`)
    console.log(`   补货减少: ${totalAdjustDecrease} 件`)
    console.log(`   销售总量: ${totalSold} 件`)
    console.log(`   销毁总量: ${totalDestroyed} 件`)
    
    const expectedQuantity = totalCreated + totalAdjustIncrease - totalAdjustDecrease - totalSold - totalDestroyed
    console.log(`   \n   📈 预期库存: ${expectedQuantity} 件`)
    console.log(`   📊 实际库存: ${hetianyuSku.available_quantity} 件`)
    console.log(`   ${expectedQuantity === hetianyuSku.available_quantity ? '✅' : '❌'} 库存${expectedQuantity === hetianyuSku.available_quantity ? '正确' : '不匹配'}`)
    
    // 6. 根据用户描述验证
    console.log('\n👤 6. 根据用户描述验证:')
    console.log('   用户描述的操作:')
    console.log('   - 采购: 48件')
    console.log('   - 制作: -1件 (47件)')
    console.log('   - 补货: +5件 (42件)')
    console.log('   - 销毁赠送: -1件 (42件，因为退回原材料)')
    console.log('   - 拆散重做: +1件 (43件)')
    console.log('   - 预期最终库存: 43件')
    console.log(`   - 实际库存: ${hetianyuSku.available_quantity}件`)
    
    if (hetianyuSku.available_quantity !== 43) {
      console.log('\n🔧 需要修复的问题:')
      console.log('   1. 检查库存变更日志是否完整记录了所有操作')
      console.log('   2. 检查销毁操作是否正确处理了退回原材料的情况')
      console.log('   3. 检查补货操作的计算逻辑')
      console.log('   4. 检查拆散重做操作是否正确记录')
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkHetianyuInventory()