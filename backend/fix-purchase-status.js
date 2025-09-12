// 修复采购记录状态的脚本
// 将有MaterialUsage记录但状态仍为ACTIVE的采购记录更新为USED状态
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixPurchaseStatus() {
  try {
    console.log('🔧 开始修复采购记录状态...')
    
    // 1. 查找所有有MaterialUsage记录但状态仍为ACTIVE的采购记录
    const purchasesToFix = await prisma.purchase.find_many({
      where: {
        status: 'ACTIVE',
        materialUsages: {
          some: {} // 存在MaterialUsage记录
        }
      },
      include: {
        materialUsages: {
          include: {
            product: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })
    
    console.log(`\n📋 发现 ${purchasesToFix.length} 条需要修复的采购记录:`)
    
    if (purchasesToFix.length === 0) {
      console.log('✅ 没有需要修复的记录')
      return
    }
    
    // 2. 显示需要修复的记录详情
    purchasesToFix.for_each((purchase, index) => {
      console.log(`\n   ${index + 1}. 采购记录: ${purchase.product_name} (ID: ${purchase.id})`)
      console.log(`      当前状态: ${purchase.status}`)
      console.log(`      关联的成品:`)
      purchase.materialUsages.for_each(usage => {
        console.log(`        - ${usage.product.name} (使用颗数: ${usage.quantity_used_beads}, 使用片数: ${usage.quantity_used_pieces})`)
      })
    })
    
    // 3. 确认是否执行修复
    console.log(`\n❓ 是否要将这 ${purchasesToFix.length} 条采购记录的状态更新为 USED？`)
    console.log('   这些记录已经被用于制作成品，应该标记为已使用状态。')
    
    // 在实际环境中，这里可以添加用户确认逻辑
    // 为了自动化，我们直接执行修复
    console.log('\n🔄 开始执行修复...')
    
    // 4. 批量更新状态
    const updateResult = await prisma.purchase.update_many({
      where: {
        id: {
          in: purchasesToFix.map(p => p.id)
        }
      },
      data: {
        status: 'USED'
      }
    })
    
    console.log(`\n✅ 修复完成！成功更新了 ${updateResult.count} 条采购记录的状态`)
    
    // 5. 验证修复结果
    console.log('\n🔍 验证修复结果...')
    const statusCounts = await prisma.purchase.group_by({
      by: ['status'],
      Count: {
        status: true
      }
    })
    
    console.log('\n📈 修复后的状态分布:')
    statusCounts.for_each(item => {
      console.log(`   ${item.status}: ${item.Count.status} 条`)
    })
    
    const activeCount = statusCounts.find(item => item.status === 'ACTIVE')?.Count.status || 0
    const usedCount = statusCounts.find(item => item.status === 'USED')?.Count.status || 0
    const total_count = await prisma.purchase.count()
    
    console.log(`\n📊 验证结果:`)
    console.log(`   预期: 97个ACTIVE + 3个USED = 100个总记录`)
    console.log(`   实际: ${activeCount}个ACTIVE + ${usedCount}个USED = ${total_count}个总记录`)
    
    if (activeCount === 97 && usedCount === 3 && total_count=== 100) {
      console.log(`   ✅ 状态分布现在符合预期！`)
    } else {
      console.log(`   ⚠️  状态分布仍不符合预期，可能需要进一步检查`)
    }
    
    // 6. 检查是否还有数据一致性问题
    const remainingIssues = await prisma.material_usage.find_many({
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
    
    if (remainingIssues.length > 0) {
      console.log(`\n❌ 仍有 ${remainingIssues.length} 条MaterialUsage记录对应的采购记录为ACTIVE状态`)
    } else {
      console.log(`\n✅ 数据一致性检查通过，所有MaterialUsage记录对应的采购记录都是USED状态`)
    }
    
    console.log('\n🎉 修复完成!')
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行修复
fixPurchaseStatus()