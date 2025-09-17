import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'

const prisma = new PrismaClient()

async function fix_bracelet_quantities() {
  let connection
  
  try {
    // 创建直接数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔧 修复BRACELET类型的数量问题')
    console.log('=' * 50)

    // 1. 查找需要修复的BRACELET记录
    console.log('\n🔍 查找需要修复的BRACELET记录:')
    
    const [bracelet_issues] = await connection.query(`
      SELECT 
        m.id as material_id,
        m.material_name,
        m.original_quantity as current_quantity,
        m.used_quantity,
        m.remaining_quantity,
        m.unit_cost as current_unit_cost,
        m.total_cost,
        p.total_beads as correct_quantity,
        p.total_price
      FROM materials m
      JOIN purchases p ON m.purchase_id = p.id
      WHERE m.material_type = 'BRACELET'
        AND p.total_beads IS NOT NULL
        AND p.total_beads > 0
        AND m.original_quantity != p.total_beads
      ORDER BY m.material_name
    `)
    
    console.log(`找到 ${bracelet_issues.length} 条需要修复的BRACELET记录`)
    
    if (bracelet_issues.length === 0) {
      console.log('✅ 所有BRACELET记录的数量都正确，无需修复')
      return
    }

    // 2. 显示修复详情
    console.log('\n📋 修复详情:')
    bracelet_issues.forEach((item, index) => {
      const new_unit_cost = item.total_price / item.correct_quantity
      const new_remaining = item.correct_quantity - item.used_quantity
      
      console.log(`${index + 1}. ${item.material_name}:`)
      console.log(`   - 当前数量: ${item.current_quantity} → 正确数量: ${item.correct_quantity}`)
      console.log(`   - 当前单价: ${item.current_unit_cost} → 正确单价: ${new_unit_cost.toFixed(4)}`)
      console.log(`   - 剩余数量: ${item.remaining_quantity} → 正确剩余: ${new_remaining}`)
      console.log('')
    })

    // 3. 执行修复
    console.log('\n🔄 开始修复数量...')
    let fixed_count = 0
    
    for (const item of bracelet_issues) {
      try {
        const new_unit_cost = item.total_price / item.correct_quantity
        const new_remaining = item.correct_quantity - item.used_quantity
        
        await connection.query(`
          UPDATE materials 
          SET 
            original_quantity = ?,
            remaining_quantity = ?,
            unit_cost = ?,
            inventory_unit = 'PIECES',
            updated_at = NOW()
          WHERE id = ?
        `, [item.correct_quantity, new_remaining, new_unit_cost, item.material_id])
        
        fixed_count++
        console.log(`✅ 已修复: ${item.material_name}`)
        
      } catch (error) {
        console.error(`❌ 修复失败 ${item.material_name}: ${error.message}`)
      }
    }

    // 4. 验证修复结果
    console.log('\n🔍 验证修复结果...')
    
    const [verification] = await connection.query(`
      SELECT 
        m.material_name,
        m.original_quantity,
        m.used_quantity,
        m.remaining_quantity,
        m.unit_cost,
        m.inventory_unit,
        p.total_beads,
        (m.original_quantity = p.total_beads) as quantity_correct,
        (m.remaining_quantity = (m.original_quantity - m.used_quantity)) as remaining_correct
      FROM materials m
      JOIN purchases p ON m.purchase_id = p.id
      WHERE m.material_type = 'BRACELET'
      ORDER BY m.material_name
    `)
    
    console.log('\n📊 修复后的BRACELET记录:')
    verification.forEach((item, index) => {
      console.log(`${index + 1}. ${item.material_name}:`)
      console.log(`   - 数量: ${item.original_quantity} (期望: ${item.total_beads}) ${item.quantity_correct ? '✅' : '❌'}`)
      console.log(`   - 剩余: ${item.remaining_quantity} (计算: ${item.original_quantity - item.used_quantity}) ${item.remaining_correct ? '✅' : '❌'}`)
      console.log(`   - 单价: ${item.unit_cost}`)
      console.log(`   - 单位: ${item.inventory_unit}`)
      console.log('')
    })

    // 5. 统计修复结果
    const all_correct = verification.every(item => item.quantity_correct && item.remaining_correct)
    
    console.log('\n📋 修复总结:')
    console.log(`✅ 成功修复: ${fixed_count} 条记录`)
    console.log(`📊 验证结果: ${all_correct ? '所有记录都正确' : '仍有记录需要检查'}`)
    
    if (all_correct) {
      console.log('🎉 BRACELET数量修复完成！现在所有半成品的数量都正确了')
    }
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
    await prisma.$disconnect()
  }
}

// 运行修复
fix_bracelet_quantities().catch(error => {
  console.error('修复失败:', error)
  process.exit(1)
})