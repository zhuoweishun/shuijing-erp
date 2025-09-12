// 检查采购记录状态分布和USED状态逻辑的脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPurchaseStatusDistribution() {
  try {
    console.log('🔍 开始检查采购记录状态分布...')
    
    // 1. 检查总记录数
    const total_count = await prisma.purchase.count()
    console.log(`📊 采购记录总数: ${total_count}`)
    
    // 2. 检查状态分布
    const statusCounts = await prisma.purchase.group_by({
      by: ['status'],
      Count: {
        status: true
      }
    })
    
    console.log('\n📈 状态分布:')
    statusCounts.for_each(item => {
      console.log(`   ${item.status}: ${item.Count.status} 条`)
    })
    
    // 3. 检查USED状态的采购记录详情
    const usedPurchases = await prisma.purchase.find_many({
      where: {
        status: 'USED'
      },
      include: {
        materialUsages: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                quantity: true,
                created_at: true
              }
            }
          }
        }
      }
    })
    
    console.log(`\n🔍 USED状态的采购记录详情 (${usedPurchases.length} 条):`)
    usedPurchases.for_each((purchase, index) => {
      console.log(`\n   ${index + 1}. 采购记录 ID: ${purchase.id}`)
      console.log(`      产品名称: ${purchase.product_name}`)
      console.log(`      采购日期: ${purchase.purchase_date.to_locale_date_string()}`)
      console.log(`      总价: ¥${purchase.total_price}`)
      
      if (purchase.materialUsages.length > 0) {
        console.log(`      关联的成品:`)
        purchase.materialUsages.for_each(usage => {
          if (usage.product) {
            console.log(`        - 成品: ${usage.product.name} (数量: ${usage.product.quantity})`)
            console.log(`        - 创建时间: ${usage.product.created_at.to_locale_string()}`)
            console.log(`        - 使用颗数: ${usage.quantity_used_beads}, 使用片数: ${usage.quantity_used_pieces}`)
          }
        })
      } else {
        console.log(`      ⚠️  警告: 该采购记录标记为USED但没有关联的MaterialUsage记录`)
      }
    })
    
    // 4. 检查SKU和MaterialUsage的关联关系
    console.log('\n🔗 检查SKU和MaterialUsage关联关系...')
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
    
    console.log(`\n📦 所有SKU的原材料使用情况 (${allSkus.length} 个SKU):`)
    allSkus.for_each((sku, index) => {
      console.log(`\n   ${index + 1}. SKU: ${sku.sku_name}`)
      console.log(`      数量: ${sku.total_quantity}`)
      console.log(`      创建时间: ${sku.created_at.to_locale_string()}`)
      
      let allMaterialUsages = []
      sku.products.for_each(product => {
        allMaterialUsages.push(...product.materialUsages)
      })
      
      if (allMaterialUsages.length > 0) {
        console.log(`      使用的原材料 (${allMaterialUsages.length} 条):`)
        allMaterialUsages.for_each(usage => {
          console.log(`        - 采购记录: ${usage.purchase.product_name} (状态: ${usage.purchase.status})`)
          console.log(`        - 使用颗数: ${usage.quantity_used_beads || 0}, 使用片数: ${usage.quantity_used_pieces || 0}`)
        })
      } else {
        console.log(`      ⚠️  警告: 该SKU没有MaterialUsage记录`)
      }
    })
    
    // 5. 检查组合模式逻辑
    console.log('\n🔧 检查组合模式制作逻辑...')
    const combinationSkus = allSkus.filter(sku => {
      let totalUsages = 0
      sku.products.for_each(product => {
        totalUsages += product.materialUsages.length
      })
      return totalUsages > 1
    })
    
    if (combinationSkus.length > 0) {
      console.log(`\n🎯 组合模式制作的SKU (${combinationSkus.length} 个):`)
      combinationSkus.for_each((sku, index) => {
        console.log(`\n   ${index + 1}. SKU: ${sku.sku_name}`)
        
        let allMaterialUsages = []
        sku.products.for_each(product => {
          allMaterialUsages.push(...product.materialUsages)
        })
        
        console.log(`      使用了 ${allMaterialUsages.length} 种原材料:`)
        
        let allUsed = true
        allMaterialUsages.for_each(usage => {
          const status = usage.purchase.status
          console.log(`        - ${usage.purchase.product_name}: ${status}`)
          if (status !== 'USED') {
            allUsed = false
          }
        })
        
        if (allUsed) {
          console.log(`      ✅ 所有相关采购记录都已标记为USED`)
        } else {
          console.log(`      ❌ 存在未标记为USED的采购记录`)
        }
      })
    } else {
      console.log(`   暂无组合模式制作的SKU`)
    }
    
    // 6. 验证预期结果
    console.log('\n📋 验证预期结果...')
    const activeCount = statusCounts.find(item => item.status === 'ACTIVE')?.Count.status || 0
    const usedCount = statusCounts.find(item => item.status === 'USED')?.Count.status || 0
    
    console.log(`\n预期: 97个ACTIVE + 3个USED = 100个总记录`)
    console.log(`实际: ${activeCount}个ACTIVE + ${usedCount}个USED = ${total_count}个总记录`)
    
    if (activeCount === 97 && usedCount === 3 && total_count=== 100) {
      console.log(`✅ 状态分布符合预期`)
    } else {
      console.log(`❌ 状态分布不符合预期`)
      
      if (totalCount !== 100) {
        console.log(`   - 总记录数不对: 预期100，实际${total_count}`)
      }
      if (activeCount !== 97) {
        console.log(`   - ACTIVE记录数不对: 预期97，实际${activeCount}`)
      }
      if (usedCount !== 3) {
        console.log(`   - USED记录数不对: 预期3，实际${usedCount}`)
      }
    }
    
    // 7. 检查潜在问题
    console.log('\n🔍 检查潜在问题...')
    
    // 检查是否有USED状态但没有MaterialUsage的记录
    const usedWithoutUsage = usedPurchases.filter(p => p.materialUsages.length === 0)
    if (usedWithoutUsage.length > 0) {
      console.log(`❌ 发现 ${usedWithoutUsage.length} 条USED状态但没有MaterialUsage的采购记录`)
    }
    
    // 检查是否有MaterialUsage但采购记录不是USED状态的情况
    const usagesWithActiveStatus = await prisma.material_usage.find_many({
      include: {
        purchase: {
          select: {
            id: true,
            product_name: true,
            status: true
          }
        }
      },
      where: {
        purchase: {
          status: 'ACTIVE'
        }
      }
    })
    
    if (usagesWithActiveStatus.length > 0) {
      console.log(`❌ 发现 ${usagesWithActiveStatus.length} 条MaterialUsage记录对应的采购记录仍为ACTIVE状态`)
      usagesWithActiveStatus.for_each(usage => {
        console.log(`   - 采购记录: ${usage.purchase.product_name} (ID: ${usage.purchase.id})`)
      })
    }
    
    if (usedWithoutUsage.length === 0 && usagesWithActiveStatus.length === 0) {
      console.log(`✅ 未发现数据一致性问题`)
    }
    
    console.log('\n🎉 检查完成!')
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行检查
checkPurchaseStatusDistribution()