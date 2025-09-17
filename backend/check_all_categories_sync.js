// 检查所有四个类别的数据同步问题
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkAllCategoriesSync() {
  try {
    console.log('🔍 开始检查所有四个类别的数据同步问题...')
    
    // 定义四个类别
    const categories = ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED_MATERIAL']
    
    for (const category of categories) {
      console.log(`\n📊 检查类别: ${category}`)
      console.log('=' .repeat(50))
      
      // 1. 查询该类别的采购记录
      const purchases = await prisma.purchase.findMany({
        where: {
          purchase_type: category
        },
        select: {
          id: true,
          purchase_code: true,
          purchase_name: true,
          purchase_type: true,
          quantity: true,
          piece_count: true,
          total_beads: true,
          weight: true,
          bead_diameter: true,
          specification: true,
          total_price: true,
          created_at: true
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 5 // 只检查最近5条记录
      })
      
      console.log(`📋 找到 ${purchases.length} 条 ${category} 采购记录（最近5条）`)
      
      // 2. 检查每条采购记录的必填字段
      for (const purchase of purchases) {
        console.log(`\n🔍 检查采购记录: ${purchase.purchase_name} (${purchase.purchase_code})`)
        
        // 根据类别检查必填字段
        const issues = []
        
        if (category === 'LOOSE_BEADS') {
          // 散珠必填：purchase_name, bead_diameter, piece_count, total_price
          if (!purchase.bead_diameter) issues.push('缺少bead_diameter')
          if (!purchase.piece_count) issues.push('缺少piece_count')
          if (!purchase.total_price) issues.push('缺少total_price')
        } else if (category === 'BRACELET') {
          // 手串必填：purchase_name, bead_diameter, quantity, 价格相关字段
          if (!purchase.bead_diameter) issues.push('缺少bead_diameter')
          if (!purchase.quantity) issues.push('缺少quantity')
          if (!purchase.total_price && !purchase.weight) issues.push('缺少total_price或weight')
        } else if (category === 'ACCESSORIES') {
          // 饰品配件必填：purchase_name, specification, piece_count, total_price
          if (!purchase.specification) issues.push('缺少specification')
          if (!purchase.piece_count) issues.push('缺少piece_count')
          if (!purchase.total_price) issues.push('缺少total_price')
        } else if (category === 'FINISHED_MATERIAL') {
          // 成品必填：purchase_name, specification, piece_count, total_price
          if (!purchase.specification) issues.push('缺少specification')
          if (!purchase.piece_count) issues.push('缺少piece_count')
          if (!purchase.total_price) issues.push('缺少total_price')
        }
        
        if (issues.length > 0) {
          console.log(`   ❌ 必填字段问题: ${issues.join(', ')}`)
        } else {
          console.log(`   ✅ 必填字段完整`)
        }
        
        // 3. 检查对应的materials记录
        const material = await prisma.material.findFirst({
          where: {
            purchase_id: purchase.id
          }
        })
        
        if (!material) {
          console.log(`   ❌ 未找到对应的materials记录`)
          continue
        }
        
        // 4. 计算期望的original_quantity
        let expectedQuantity = 0
        
        if (category === 'LOOSE_BEADS') {
          expectedQuantity = purchase.piece_count || 0
          if (expectedQuantity === 0 && purchase.weight && purchase.bead_diameter) {
            // 使用weight计算
            const multiplier = {
              4: 25, 6: 11, 8: 6, 10: 4, 12: 3
            }[purchase.bead_diameter] || 5
            expectedQuantity = Math.floor(purchase.weight * multiplier)
          }
        } else if (category === 'BRACELET') {
          expectedQuantity = purchase.total_beads || purchase.piece_count || 0
          if (expectedQuantity === 0 && purchase.weight && purchase.bead_diameter) {
            // 使用weight计算
            const multiplier = {
              4: 25, 6: 11, 8: 6, 10: 4, 12: 3
            }[purchase.bead_diameter] || 5
            expectedQuantity = Math.floor(purchase.weight * multiplier)
          }
        } else if (category === 'ACCESSORIES' || category === 'FINISHED_MATERIAL') {
          expectedQuantity = purchase.piece_count || 1
        }
        
        // 5. 比较实际和期望的数量
        console.log(`   📊 数量对比:`)
        console.log(`      - 期望original_quantity: ${expectedQuantity}`)
        console.log(`      - 实际original_quantity: ${material.original_quantity}`)
        console.log(`      - 实际remaining_quantity: ${material.remaining_quantity}`)
        
        if (material.original_quantity !== expectedQuantity) {
          console.log(`   ❌ 数量不匹配！期望 ${expectedQuantity}，实际 ${material.original_quantity}`)
        } else {
          console.log(`   ✅ 数量匹配`)
        }
        
        // 6. 检查库存计算
        const expectedRemaining = material.original_quantity - material.used_quantity
        if (material.remaining_quantity !== expectedRemaining) {
          console.log(`   ❌ 剩余数量计算错误！期望 ${expectedRemaining}，实际 ${material.remaining_quantity}`)
        } else {
          console.log(`   ✅ 剩余数量计算正确`)
        }
      }
      
      // 7. 统计该类别的问题数量
      const problematicMaterials = await prisma.material.count({
        where: {
          material_type: category,
          original_quantity: 0,
          purchase: {
            OR: [
              { piece_count: { gt: 0 } },
              { total_beads: { gt: 0 } },
              { quantity: { gt: 0 } },
              { weight: { gt: 0 } }
            ]
          }
        }
      })
      
      console.log(`\n📈 ${category} 类别统计:`)
      console.log(`   - 总采购记录: ${purchases.length}`)
      console.log(`   - 有同步问题的材料记录: ${problematicMaterials}`)
    }
    
    // 8. 总体统计
    console.log('\n🎯 总体统计:')
    console.log('=' .repeat(50))
    
    const totalProblems = await prisma.material.count({
      where: {
        original_quantity: 0,
        purchase: {
          OR: [
            { piece_count: { gt: 0 } },
            { total_beads: { gt: 0 } },
            { quantity: { gt: 0 } },
            { weight: { gt: 0 } }
          ]
        }
      }
    })
    
    const totalMaterials = await prisma.material.count()
    
    console.log(`📊 总材料记录: ${totalMaterials}`)
    console.log(`❌ 有同步问题的记录: ${totalProblems}`)
    console.log(`✅ 正常记录: ${totalMaterials - totalProblems}`)
    console.log(`📈 问题比例: ${((totalProblems / totalMaterials) * 100).toFixed(2)}%`)
    
    if (totalProblems > 0) {
      console.log('\n🔧 建议修复措施:')
      console.log('1. 修复触发器逻辑，优先使用piece_count字段')
      console.log('2. 运行数据修复脚本，更新existing材料记录')
      console.log('3. 验证前后端必填字段一致性')
    } else {
      console.log('\n🎉 所有数据同步正常！')
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 执行检查
checkAllCategoriesSync()
  .then(() => {
    console.log('\n🏁 检查脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 检查脚本执行失败:', error)
    process.exit(1)
  })