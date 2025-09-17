import mysql from 'mysql2/promise'

async function debug_specific_purchase() {
  let connection
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔍 调试特定采购记录...')
    
    // 查找2000块的油胆记录
    const [purchases] = await connection.query(`
      SELECT * FROM purchases 
      WHERE purchase_name LIKE '%油胆%' AND total_price = 2000
      ORDER BY created_at DESC 
      LIMIT 1
    `)
    
    if (purchases.length === 0) {
      console.log('❌ 未找到2000块的油胆记录')
      return
    }
    
    const purchase = purchases[0]
    console.log('\n📋 采购记录详情：')
    console.log('ID:', purchase.id)
    console.log('编码:', purchase.purchase_code)
    console.log('名称:', purchase.purchase_name)
    console.log('类型:', purchase.purchase_type)
    console.log('状态:', purchase.status)
    console.log('总价:', purchase.total_price)
    console.log('数量 (piece_count):', purchase.piece_count)
    console.log('重量 (weight):', purchase.weight)
    console.log('珠子直径:', purchase.bead_diameter)
    console.log('创建时间:', purchase.created_at)
    console.log('更新时间:', purchase.updated_at)
    
    // 查找对应的material记录
    const [materials] = await connection.query(`
      SELECT * FROM materials WHERE purchase_id = ?
    `, [purchase.id])
    
    console.log('\n🔍 对应的material记录：')
    if (materials.length === 0) {
      console.log('❌ 未找到对应的material记录')
    } else {
      const material = materials[0]
      console.log('ID:', material.id)
      console.log('编码:', material.material_code)
      console.log('名称:', material.material_name)
      console.log('类型:', material.material_type)
      console.log('原始数量:', material.original_quantity)
      console.log('已用数量:', material.used_quantity)
      console.log('剩余数量:', material.remaining_quantity)
      console.log('单位成本:', material.unit_cost)
      console.log('总成本:', material.total_cost)
      console.log('创建时间:', material.created_at)
      console.log('更新时间:', material.updated_at)
    }
    
    // 手动修复这条记录
    console.log('\n🔧 手动修复这条记录...')
    if (materials.length > 0) {
      const materialId = materials[0].id
      const correctQuantity = purchase.piece_count || 1
      const correctUnitCost = purchase.total_price / correctQuantity
      
      await connection.query(`
        UPDATE materials 
        SET original_quantity = ?, 
            remaining_quantity = original_quantity - used_quantity,
            unit_cost = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [correctQuantity, correctUnitCost, materialId])
      
      console.log('✅ 修复完成')
      
      // 验证修复结果
      const [updatedMaterials] = await connection.query(`
        SELECT original_quantity, used_quantity, remaining_quantity, unit_cost
        FROM materials WHERE id = ?
      `, [materialId])
      
      if (updatedMaterials.length > 0) {
        const updated = updatedMaterials[0]
        console.log('修复后的数据：')
        console.log('原始数量:', updated.original_quantity)
        console.log('已用数量:', updated.used_quantity)
        console.log('剩余数量:', updated.remaining_quantity)
        console.log('单位成本:', updated.unit_cost)
      }
    }
    
    // 检查触发器是否正常工作
    console.log('\n🧪 测试触发器是否正常工作...')
    
    // 创建一个测试采购记录
    const testCode = `TEST_${Date.now()}`
    await connection.query(`
      INSERT INTO purchases (
        id, purchase_code, purchase_name, purchase_type, status,
        total_price, piece_count, user_id, created_at, updated_at
      ) VALUES (
        ?, ?, '测试油胆', 'LOOSE_BEADS', 'ACTIVE',
        100, 1, 'test_user', NOW(), NOW()
      )
    `, [`test_${Date.now()}`, testCode])
    
    console.log('✅ 创建测试采购记录:', testCode)
    
    // 等待触发器执行
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 检查是否自动创建了material记录
    const [testMaterials] = await connection.query(`
      SELECT original_quantity, remaining_quantity FROM materials 
      WHERE material_code = ?
    `, [testCode])
    
    if (testMaterials.length > 0) {
      console.log('✅ 触发器正常工作，自动创建了material记录')
      console.log('测试记录数量:', testMaterials[0].original_quantity, '剩余:', testMaterials[0].remaining_quantity)
      
      // 清理测试数据
      await connection.query('DELETE FROM materials WHERE material_code = ?', [testCode])
      await connection.query('DELETE FROM purchases WHERE purchase_code = ?', [testCode])
      console.log('✅ 清理测试数据完成')
    } else {
      console.log('❌ 触发器未正常工作，未自动创建material记录')
    }
    
  } catch (error) {
    console.error('❌ 调试过程中出错：', error)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

debug_specific_purchase()