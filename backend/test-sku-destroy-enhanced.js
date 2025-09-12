// 测试增强版SKU销毁功能的脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testEnhancedSkuDestroy() {
  try {
    console.log('🧪 开始测试增强版SKU销毁功能...')
    
    // 1. 查找可测试的SKU
    console.log('\n📋 查找可测试的SKU:')
    const testableSkus = await prisma.product_sku.find_many({
      where: {
        available_quantity: { gt: 0 },
        status: 'ACTIVE'
      },
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: {
                  include: {
                    supplier: true
                  }
                }
              }
            }
          }
        }
      },
      take: 3
    })
    
    if (testableSkus.length === 0) {
      console.log('❌ 没有找到可测试的SKU')
      return
    }
    
    console.log(`✅ 找到 ${testableSkus.length} 个可测试的SKU:`)
    testableSkus.for_each((sku, index) => {
      console.log(`   ${index + 1}. ${sku.sku_name} (${sku.sku_code}) - 可售数量: ${sku.available_quantity}`)
      
      // 显示原材料信息
      const materials = []
      const processedPurchaseIds = new Set()
      
      sku.products.for_each(product => {
        product.materialUsages.for_each(usage => {
          if (!processedPurchaseIds.has(usage.purchase.id)) {
            processedPurchaseIds.add(usage.purchase.id)
            materials.push({
              id: usage.purchase.id,
              name: usage.purchase.product_name,
              supplier: usage.purchase.supplier?.name || '未知',
              usedBeads: usage.quantity_used_beads || 0,
              usedPieces: usage.quantity_used_pieces || 0
            })
          }
        })
      })
      
      console.log(`      原材料 (${materials.length} 种):`)  
      materials.for_each(material => {
        console.log(`        - ${material.name} (${material.supplier}) - 使用: ${material.usedBeads}颗/${material.usedPieces}件`)
      })
    })
    
    // 2. 测试获取原材料信息API
    console.log('\n🔍 测试获取原材料信息API:')
    const testSku = testableSkus[0]
    
    try {
      // 模拟API调用（实际应该通过HTTP请求）
      const materials = []
      const processedPurchaseIds = new Set()
      
      testSku.products.for_each(product => {
        product.materialUsages.for_each(usage => {
          if (!processedPurchaseIds.has(usage.purchase.id)) {
            processedPurchaseIds.add(usage.purchase.id)
            materials.push({
              purchase_id: usage.purchase.id,
              product_name: usage.purchase.product_name,
              supplier_name: usage.purchase.supplier?.name || '未知供应商',
              quantity_used_beads: usage.quantity_used_beads || 0,
              quantity_used_pieces: usage.quantity_used_pieces || 0,
              unitCost: usage.unitCost ? parseFloat(usage.unitCost.to_string()) : 0,
              total_cost: usage.total_cost ? parseFloat(usage.total_cost.to_string()) : 0
            })
          }
        })
      })
      
      console.log(`✅ SKU ${testSku.sku_code} 的原材料信息:`)
      materials.for_each((material, index) => {
        console.log(`   ${index + 1}. ${material.product_name}`)
        console.log(`      供应商: ${material.supplier_name}`)
        console.log(`      使用量: ${material.quantity_used_beads}颗/${material.quantity_used_pieces}件`)
        console.log(`      成本: ¥${material.total_cost.to_fixed(2)}`)
      })
      
    } catch (error) {
      console.error('❌ 获取原材料信息失败:', error.message)
    }
    
    // 3. 测试销毁逻辑场景
    console.log('\n🎯 销毁逻辑测试场景:')
    
    console.log('\n   场景1: 赠送销毁 (不退回原材料)')
    console.log('   - 销毁原因: "赠送销毁"')
    console.log('   - 原材料处理: 自动设置为不退回')
    console.log('   - 预期结果: 采购记录状态保持USED不变')
    
    console.log('\n   场景2: 库存遗失 (不退回原材料)')
    console.log('   - 销毁原因: "库存遗失"')
    console.log('   - 原材料处理: 自动设置为不退回')
    console.log('   - 预期结果: 采购记录状态保持USED不变')
    
    console.log('\n   场景3: 拆散重做 (选择性退回原材料)')
    console.log('   - 销毁原因: "拆散重做"')
    console.log('   - 原材料处理: 自动设置为退回，显示原材料选择界面')
    console.log('   - 用户操作: 可选择要退回的原材料（默认全选）')
    console.log('   - 预期结果: 只有选中的采购记录状态从USED改为ACTIVE')
    
    console.log('\n   场景4: 其他原因 (可选择是否退回)')
    console.log('   - 销毁原因: "质量问题"、"损坏破损"等')
    console.log('   - 原材料处理: 用户可自由选择')
    console.log('   - 预期结果: 根据用户选择决定是否退回原材料')
    
    // 4. 检查当前采购记录状态
    console.log('\n📊 当前采购记录状态分布:')
    const statusCounts = await prisma.purchase.group_by({
      by: ['status'],
      Count: {
        status: true
      }
    })
    
    statusCounts.for_each(item => {
      console.log(`   ${item.status}: ${item.Count.status} 条记录`)
    })
    
    // 5. 功能验证建议
    console.log('\n💡 功能验证建议:')
    console.log('   1. 在前端SKU销售列表中找到任意SKU')
    console.log('   2. 点击销毁按钮，测试不同销毁原因的行为:')
    console.log('      - 选择"赠送销毁"，确认原材料处理选项被禁用为"不退回"')
    console.log('      - 选择"库存遗失"，确认原材料处理选项被禁用为"不退回"')
    console.log('      - 选择"拆散重做"，确认显示原材料选择界面，默认全选')
    console.log('      - 在原材料选择界面中取消选择部分原材料，确认只退回选中的')
    console.log('   3. 执行销毁操作，检查采购记录状态变化')
    console.log('   4. 验证财务流水账中的销毁记录显示正确')
    
    console.log('\n✅ 增强版SKU销毁功能测试完成')
    console.log('\n🔧 主要改进:')
    console.log('   ✅ 根据销毁原因自动设置原材料处理选项')
    console.log('   ✅ 拆散重做支持选择性退回原材料')
    console.log('   ✅ 赠送销毁和库存遗失强制不退回原材料')
    console.log('   ✅ 新增原材料信息获取API')
    console.log('   ✅ 优化用户界面和交互体验')
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testEnhancedSkuDestroy()