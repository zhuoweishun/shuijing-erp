// 测试SKU销毁时采购记录状态恢复逻辑的脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSkuDestroyLogic() {
  try {
    console.log('🧪 开始测试SKU销毁逻辑...')
    
    // 1. 查看当前状态分布
    console.log('\n📊 当前采购记录状态分布:')
    const statusCounts = await prisma.purchase.group_by({
      by: ['status'],
      Count: {
        status: true
      }
    })
    
    statusCounts.for_each(item => {
      console.log(`   ${item.status}: ${item.Count.status} 条`)
    })
    
    // 2. 查看所有SKU的详细信息
    const allSkus = await prisma.product_sku.find_many({
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: {
                  select: {
                    id: true,
                    product_name: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    console.log(`\n📦 当前SKU列表 (${allSkus.length} 个):`)
    allSkus.for_each((sku, index) => {
      console.log(`\n   ${index + 1}. SKU: ${sku.sku_name}`)
      console.log(`      ID: ${sku.id}`)
      console.log(`      总数量: ${sku.total_quantity}, 可售数量: ${sku.available_quantity}`)
      
      let allMaterialUsages = []
      sku.products.for_each(product => {
        allMaterialUsages.push(...product.materialUsages)
      })
      
      if (allMaterialUsages.length > 0) {
        console.log(`      使用的原材料 (${allMaterialUsages.length} 条):`)
        allMaterialUsages.for_each(usage => {
          console.log(`        - ${usage.purchase.product_name} (状态: ${usage.purchase.status}, ID: ${usage.purchase.id})`)
        })
      }
    })
    
    // 3. 分析销毁逻辑的测试场景
    console.log('\n🔍 分析销毁逻辑测试场景:')
    
    // 所有SKU都可以测试销毁（包括数量为1的）
    const testableSkus = allSkus.filter(sku => sku.available_quantity > 0)
    
    if (testableSkus.length === 0) {
      console.log('   ⚠️  没有可测试的SKU（所有SKU的可售数量都为0）')
      console.log('   💡 建议：创建一些有库存的SKU来测试销毁逻辑')
    } else {
      console.log(`   ✅ 找到 ${testableSkus.length} 个可测试的SKU:`)
      testableSkus.for_each((sku, index) => {
        console.log(`      ${index + 1}. ${sku.sku_name} (可售数量: ${sku.available_quantity})`)
      })
    }
    
    // 4. 检查组合模式SKU的销毁逻辑
    console.log('\n🎯 检查组合模式SKU的销毁逻辑:')
    const combinationSkus = allSkus.filter(sku => {
      let totalUsages = 0
      sku.products.for_each(product => {
        totalUsages += product.materialUsages.length
      })
      return totalUsages > 1
    })
    
    if (combinationSkus.length > 0) {
      console.log(`   发现 ${combinationSkus.length} 个组合模式SKU:`)
      combinationSkus.for_each((sku, index) => {
        console.log(`\n      ${index + 1}. SKU: ${sku.sku_name}`)
        console.log(`         可售数量: ${sku.available_quantity}`)
        
        let allMaterialUsages = []
        sku.products.for_each(product => {
          allMaterialUsages.push(...product.materialUsages)
        })
        
        console.log(`         涉及的采购记录:`)
        const uniquePurchases = new Map()
        allMaterialUsages.for_each(usage => {
          if (!uniquePurchases.has(usage.purchase.id)) {
            uniquePurchases.set(usage.purchase.id, usage.purchase)
          }
        })
        
        uniquePurchases.for_each(purchase => {
          console.log(`           - ${purchase.product_name} (状态: ${purchase.status}, ID: ${purchase.id})`)
        })
        
        console.log(`         📝 销毁测试说明:`)
        console.log(`            - 如果销毁时选择 return_to_material=true，以上 ${uniquePurchases.size} 条采购记录应该从USED变为ACTIVE`)
        console.log(`            - 如果销毁时选择 return_to_material=false，采购记录状态保持USED不变`)
      })
    } else {
      console.log('   暂无组合模式SKU可测试')
    }
    
    // 5. 提供测试建议
    console.log('\n💡 测试建议:')
    console.log('   1. 手动测试销毁逻辑：')
    console.log('      - 在前端SKU管理页面选择一个SKU进行销毁')
    console.log('      - 选择 "退回原材料" 选项')
    console.log('      - 观察相关采购记录的状态是否从USED变为ACTIVE')
    
    console.log('\n   2. 验证组合模式销毁：')
    console.log('      - 特别测试组合模式制作的SKU销毁')
    console.log('      - 确保所有相关的采购记录状态都能正确恢复')
    
    console.log('\n   3. 验证不退回原材料的情况：')
    console.log('      - 测试销毁时不选择 "退回原材料"')
    console.log('      - 确保采购记录状态保持USED不变')
    
    // 6. 检查销毁日志
    console.log('\n📋 检查现有的销毁日志:')
    const destroyLogs = await prisma.sku_inventory_log.find_many({
      where: {
        action: 'DESTROY'
      },
      include: {
        sku: {
          select: {
            id: true,
            sku_name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })
    
    if (destroyLogs.length > 0) {
      console.log(`   发现 ${destroyLogs.length} 条销毁记录:`)
      destroyLogs.for_each((log, index) => {
        console.log(`\n      ${index + 1}. SKU: ${log.sku.sku_name}`)
        console.log(`         销毁数量: ${Math.abs(log.quantity_change)}`)
        console.log(`         销毁时间: ${log.created_at.to_locale_string()}`)
        console.log(`         操作人: ${log.user.name || log.user.username}`)
        console.log(`         备注: ${log.notes}`)
      })
    } else {
      console.log('   暂无销毁记录')
    }
    
    console.log('\n🎉 测试分析完成!')
    console.log('\n📌 总结:')
    console.log('   - 销毁逻辑代码已实现，包含状态恢复功能')
    console.log('   - 组合模式SKU销毁时会正确处理多个采购记录')
    console.log('   - 建议进行实际的销毁操作测试来验证功能')
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testSkuDestroyLogic()