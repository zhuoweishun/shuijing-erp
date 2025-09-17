import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'

const prisma = new PrismaClient()

async function check_inventory_quantities() {
  let connection
  
  try {
    // 创建直接数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('📊 检查库存数量问题')
    console.log('=' * 40)

    // 1. 检查material表的库存数量
    console.log('\n📋 Material表库存数量检查:')
    
    const materials = await prisma.material.findMany({
      select: {
        material_name: true,
        material_type: true,
        original_quantity: true,
        used_quantity: true,
        remaining_quantity: true
      },
      orderBy: {
        material_type: 'asc'
      }
    })
    
    materials.forEach((material, index) => {
      console.log(`${index + 1}. ${material.material_name} (${material.material_type}):`)
      console.log(`   - 原始数量: ${material.original_quantity}`)
      console.log(`   - 已用数量: ${material.used_quantity}`)
      console.log(`   - 剩余数量: ${material.remaining_quantity}`)
      console.log('')
    })

    // 2. 检查purchase表的数量数据
    console.log('\n📋 Purchase表数量数据检查:')
    
    const [purchases] = await connection.query(`
      SELECT 
        purchase_name,
        purchase_type,
        piece_count,
        total_beads,
        status
      FROM purchases 
      WHERE status IN ('ACTIVE', 'USED')
      ORDER BY purchase_type, purchase_name
    `)
    
    purchases.forEach((purchase, index) => {
      console.log(`${index + 1}. ${purchase.purchase_name} (${purchase.purchase_type}):`)
      console.log(`   - piece_count: ${purchase.piece_count}`)
      console.log(`   - total_beads: ${purchase.total_beads}`)
      console.log(`   - status: ${purchase.status}`)
      console.log('')
    })

    // 3. 检查数据迁移时的数量映射逻辑
    console.log('\n🔍 检查数量映射逻辑:')
    
    const [mapping_check] = await connection.query(`
      SELECT 
        m.material_name,
        m.material_type,
        m.original_quantity as material_original,
        m.used_quantity as material_used,
        m.remaining_quantity as material_remaining,
        p.piece_count as purchase_piece_count,
        p.total_beads as purchase_total_beads,
        p.purchase_type
      FROM materials m
      JOIN purchases p ON m.purchase_id = p.id
      WHERE p.status IN ('ACTIVE', 'USED')
      ORDER BY m.material_type, m.material_name
    `)
    
    mapping_check.forEach((item, index) => {
      console.log(`${index + 1}. ${item.material_name} (${item.material_type}):`)
      console.log(`   Purchase数据: piece_count=${item.purchase_piece_count}, total_beads=${item.purchase_total_beads}`)
      console.log(`   Material数据: original=${item.material_original}, used=${item.material_used}, remaining=${item.material_remaining}`)
      
      // 检查映射逻辑是否正确
      let expected_original = item.purchase_piece_count || 1
      if (item.purchase_type === 'LOOSE_BEADS') {
        expected_original = item.purchase_total_beads || item.purchase_piece_count || 1
      } else if (item.purchase_type === 'BRACELET') {
        // 手串类型：如果有total_beads就用total_beads，否则用piece_count或默认1
        expected_original = item.purchase_total_beads || item.purchase_piece_count || 1
      }
      
      const mapping_correct = item.material_original === expected_original
      console.log(`   映射检查: 期望原始数量=${expected_original}, 实际=${item.material_original} ${mapping_correct ? '✅' : '❌'}`)
      console.log('')
    })

    // 4. 统计库存状况
    console.log('\n📊 库存状况统计:')
    
    const inventory_stats = materials.reduce((stats, material) => {
      const type = material.material_type
      if (!stats[type]) {
        stats[type] = {
          total_items: 0,
          total_original: 0,
          total_used: 0,
          total_remaining: 0,
          zero_remaining: 0
        }
      }
      
      stats[type].total_items++
      stats[type].total_original += material.original_quantity
      stats[type].total_used += material.used_quantity
      stats[type].total_remaining += material.remaining_quantity || 0
      
      if ((material.remaining_quantity || 0) === 0) {
        stats[type].zero_remaining++
      }
      
      return stats
    }, {})
    
    Object.entries(inventory_stats).forEach(([type, stats]) => {
      console.log(`${type}:`)
      console.log(`  - 总项目数: ${stats.total_items}`)
      console.log(`  - 总原始数量: ${stats.total_original}`)
      console.log(`  - 总已用数量: ${stats.total_used}`)
      console.log(`  - 总剩余数量: ${stats.total_remaining}`)
      console.log(`  - 零库存项目: ${stats.zero_remaining}/${stats.total_items}`)
      console.log('')
    })

    // 5. 检查remaining_quantity计算逻辑
    console.log('\n🔧 检查remaining_quantity计算逻辑:')
    
    const calculation_issues = materials.filter(material => {
      const calculated_remaining = material.original_quantity - material.used_quantity
      const stored_remaining = material.remaining_quantity || 0
      return calculated_remaining !== stored_remaining
    })
    
    if (calculation_issues.length > 0) {
      console.log(`❌ 发现 ${calculation_issues.length} 条记录的remaining_quantity计算不正确:`)
      calculation_issues.forEach(material => {
        const calculated = material.original_quantity - material.used_quantity
        console.log(`  ${material.material_name}: 计算值=${calculated}, 存储值=${material.remaining_quantity}`)
      })
    } else {
      console.log('✅ 所有记录的remaining_quantity计算正确')
    }

    console.log('\n💡 问题诊断:')
    const total_zero_remaining = materials.filter(m => (m.remaining_quantity || 0) === 0).length
    const total_materials = materials.length
    
    if (total_zero_remaining === total_materials) {
      console.log('❌ 所有material记录的剩余数量都是0，这是数据问题')
      console.log('   可能原因：')
      console.log('   1. 数据迁移时remaining_quantity字段没有正确设置')
      console.log('   2. 原始数据中的数量字段为0或null')
      console.log('   3. used_quantity被错误地设置为等于original_quantity')
    } else if (total_zero_remaining > total_materials * 0.5) {
      console.log('⚠️  超过一半的material记录剩余数量为0，可能存在数据问题')
    } else {
      console.log('✅ 库存数量分布正常')
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
    await prisma.$disconnect()
  }
}

// 运行检查
check_inventory_quantities().catch(error => {
  console.error('检查失败:', error)
  process.exit(1)
})