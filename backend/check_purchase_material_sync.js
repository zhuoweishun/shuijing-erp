import mysql from 'mysql2/promise'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPurchaseMaterialSync() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  })

  try {
    console.log('🔍 检查CG20250917120816的purchase和material同步状态...')
    
    // 1. 查看purchase表中的当前数据
    console.log('\n📋 Purchase表中的数据:')
    const [purchases] = await connection.query(`
      SELECT purchase_code, purchase_name, piece_count, total_price, 
             purchase_type, status, updated_at
      FROM purchases 
      WHERE purchase_code = 'CG20250917120816'
    `)
    
    if (purchases.length === 0) {
      console.log('❌ 未找到CG20250917120816采购记录')
      return
    }
    
    const purchase = purchases[0]
    console.log('采购编号:', purchase.purchase_code)
    console.log('采购名称:', purchase.purchase_name)
    console.log('数量:', purchase.piece_count)
    console.log('总价:', purchase.total_price)
    console.log('类型:', purchase.purchase_type)
    console.log('状态:', purchase.status)
    console.log('更新时间:', purchase.updated_at)
    
    // 2. 查看对应的material表数据
    console.log('\n📦 Material表中的数据:')
    const [materials] = await connection.query(`
      SELECT m.id, m.material_code, m.material_name, m.original_quantity, 
             m.used_quantity, m.remaining_quantity, m.unit_cost, m.total_cost,
             m.updated_at, p.id as purchase_id
      FROM materials m
      JOIN purchases p ON m.purchase_id = p.id
      WHERE p.purchase_code = 'CG20250917120816'
    `)
    
    if (materials.length === 0) {
      console.log('❌ 未找到对应的material记录')
    } else {
      const material = materials[0]
      console.log('Material ID:', material.id)
      console.log('原材料编号:', material.material_code)
      console.log('原材料名称:', material.material_name)
      console.log('原始数量:', material.original_quantity)
      console.log('已用数量:', material.used_quantity)
      console.log('剩余数量:', material.remaining_quantity)
      console.log('单位成本:', material.unit_cost)
      console.log('总成本:', material.total_cost)
      console.log('更新时间:', material.updated_at)
      
      // 3. 比较数据是否一致
      console.log('\n🔄 数据一致性检查:')
      const expectedQuantity = purchase.piece_count
      const expectedUnitCost = purchase.total_price / purchase.piece_count
      const expectedTotalCost = purchase.total_price
      
      console.log('期望数量:', expectedQuantity, '实际数量:', material.original_quantity)
      console.log('期望单价:', expectedUnitCost.toFixed(2), '实际单价:', material.unit_cost)
      console.log('期望总价:', expectedTotalCost, '实际总价:', material.total_cost)
      
      if (material.original_quantity != expectedQuantity) {
        console.log('❌ 数量不一致！')
      } else {
        console.log('✅ 数量一致')
      }
      
      if (Math.abs(material.unit_cost - expectedUnitCost) > 0.01) {
        console.log('❌ 单价不一致！')
      } else {
        console.log('✅ 单价一致')
      }
      
      if (material.total_cost != expectedTotalCost) {
        console.log('❌ 总价不一致！')
      } else {
        console.log('✅ 总价一致')
      }
    }
    
    // 4. 检查UPDATE触发器是否存在
    console.log('\n🔧 检查UPDATE触发器状态:')
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev' 
      AND TRIGGER_NAME = 'tr_purchase_update_material'
    `)
    
    if (triggers.length === 0) {
      console.log('❌ UPDATE触发器不存在！')
    } else {
      console.log('✅ UPDATE触发器存在')
      console.log('触发器名称:', triggers[0].TRIGGER_NAME)
      console.log('触发时机:', triggers[0].ACTION_TIMING)
      console.log('触发事件:', triggers[0].EVENT_MANIPULATION)
      console.log('目标表:', triggers[0].EVENT_OBJECT_TABLE)
    }
    
    // 5. 如果数据不一致，提供修复建议
    if (materials.length > 0) {
      const material = materials[0]
      const expectedQuantity = purchase.piece_count
      const expectedUnitCost = purchase.total_price / purchase.piece_count
      const expectedTotalCost = purchase.total_price
      
      if (material.original_quantity != expectedQuantity || 
          Math.abs(material.unit_cost - expectedUnitCost) > 0.01 || 
          material.total_cost != expectedTotalCost) {
        
        console.log('\n🔧 数据修复建议:')
        console.log('需要手动更新material表数据以保持同步')
        
        // 手动修复数据
        console.log('\n🛠️ 执行数据修复...')
        await connection.query(`
          UPDATE materials m
          JOIN purchases p ON m.purchase_id = p.id
          SET 
            m.original_quantity = p.piece_count,
            m.remaining_quantity = p.piece_count - m.used_quantity,
            m.unit_cost = p.total_price / p.piece_count,
            m.total_cost = p.total_price,
            m.updated_at = CURRENT_TIMESTAMP
          WHERE p.purchase_code = 'CG20250917120816'
        `)
        
        console.log('✅ 数据修复完成')
        
        // 验证修复结果
        console.log('\n✅ 修复后验证:')
        const [updatedMaterials] = await connection.query(`
          SELECT m.original_quantity, m.used_quantity, m.remaining_quantity, 
                 m.unit_cost, m.total_cost
          FROM materials m
          JOIN purchases p ON m.purchase_id = p.id
          WHERE p.purchase_code = 'CG20250917120816'
        `)
        
        if (updatedMaterials.length > 0) {
          const updated = updatedMaterials[0]
          console.log('修复后数量:', updated.original_quantity)
          console.log('修复后剩余:', updated.remaining_quantity)
          console.log('修复后单价:', updated.unit_cost)
          console.log('修复后总价:', updated.total_cost)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error)
  } finally {
    await connection.end()
    await prisma.$disconnect()
  }
}

checkPurchaseMaterialSync()