import mysql from 'mysql2/promise'

async function debug_oil_gall_sync() {
  let connection
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔍 调试油胆数据同步问题...')
    
    // 1. 查找最新的油胆采购记录
    console.log('\n📋 查找最新的油胆采购记录...')
    const [purchases] = await connection.query(`
      SELECT id, purchase_code, purchase_name, total_price, piece_count, weight, 
             purchase_type, status, created_at, updated_at
      FROM purchases 
      WHERE purchase_name LIKE '%油胆%' 
      ORDER BY created_at DESC 
      LIMIT 5
    `)
    
    console.log('油胆采购记录：')
    purchases.forEach((purchase, index) => {
      console.log(`${index + 1}. ID: ${purchase.id}, 编码: ${purchase.purchase_code}, 名称: ${purchase.purchase_name}`)
      console.log(`   价格: ${purchase.total_price}, 数量: ${purchase.piece_count}, 重量: ${purchase.weight}`)
      console.log(`   类型: ${purchase.purchase_type}, 状态: ${purchase.status}`)
      console.log(`   创建时间: ${purchase.created_at}`)
      console.log('')
    })
    
    if (purchases.length === 0) {
      console.log('❌ 未找到油胆采购记录')
      return
    }
    
    // 2. 检查这些采购记录对应的materials记录
    console.log('\n🔍 检查对应的materials记录...')
    for (const purchase of purchases) {
      const [materials] = await connection.query(`
        SELECT id, material_code, material_name, original_quantity, used_quantity, 
               remaining_quantity, purchase_id, created_at
        FROM materials 
        WHERE purchase_id = ?
      `, [purchase.id])
      
      console.log(`采购记录 ${purchase.purchase_code} (${purchase.purchase_name}) 对应的materials记录：`)
      if (materials.length === 0) {
        console.log('❌ 未找到对应的materials记录！')
      } else {
        materials.forEach(material => {
          console.log(`  - ID: ${material.id}, 编码: ${material.material_code}`)
          console.log(`    原始数量: ${material.original_quantity}, 已用数量: ${material.used_quantity}, 剩余数量: ${material.remaining_quantity}`)
          console.log(`    创建时间: ${material.created_at}`)
        })
      }
      console.log('')
    }
    
    // 3. 检查触发器是否存在
    console.log('\n🔧 检查触发器状态...')
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev' 
      AND TRIGGER_NAME LIKE '%purchase%' OR TRIGGER_NAME LIKE '%material%'
    `)
    
    console.log('相关触发器：')
    triggers.forEach(trigger => {
      console.log(`- ${trigger.TRIGGER_NAME}: ${trigger.ACTION_TIMING} ${trigger.EVENT_MANIPULATION} ON ${trigger.EVENT_OBJECT_TABLE}`)
    })
    
    // 4. 手动测试触发器逻辑
    console.log('\n🧪 手动测试数据同步...')
    const latestPurchase = purchases[0]
    
    if (latestPurchase && latestPurchase.total_price >= 2000) {
      console.log(`\n正在检查价格为 ${latestPurchase.total_price} 的油胆记录...`)
      
      // 检查是否有对应的material记录
      const [existingMaterials] = await connection.query(`
        SELECT * FROM materials WHERE purchase_id = ?
      `, [latestPurchase.id])
      
      if (existingMaterials.length === 0) {
        console.log('❌ 触发器未执行！手动创建material记录...')
        
        // 手动创建material记录
        const materialCode = `MAT_${latestPurchase.purchase_code}`
        const originalQuantity = latestPurchase.piece_count || 1
        
        await connection.query(`
          INSERT INTO materials (
            material_code, material_name, material_type, quality,
            original_quantity, used_quantity, remaining_quantity,
            unit_price, total_price, purchase_id, created_at, updated_at
          ) VALUES (?, ?, 'LOOSE_BEADS', 'UNKNOWN', ?, 0, ?, ?, ?, ?, NOW(), NOW())
        `, [
          materialCode,
          latestPurchase.purchase_name,
          originalQuantity,
          originalQuantity,
          latestPurchase.total_price / originalQuantity,
          latestPurchase.total_price,
          latestPurchase.id
        ])
        
        console.log('✅ 手动创建material记录成功')
      } else {
        console.log('✅ 找到对应的material记录')
        existingMaterials.forEach(material => {
          console.log(`  剩余数量: ${material.remaining_quantity}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ 调试过程中出错：', error)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

debug_oil_gall_sync()