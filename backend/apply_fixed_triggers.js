import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'

async function applyFixedTriggers() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      multipleStatements: true
    })

    console.log('🔧 应用修复后的触发器...')
    
    // 读取SQL文件
    const sqlFilePath = path.join(process.cwd(), 'sql', 'fixed_material_sync_triggers.sql')
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8')
    
    // 执行SQL
    await connection.query(sqlContent)
    console.log('✅ 修复后的触发器已成功应用')
    
    // 验证触发器
    console.log('\n🔍 验证触发器安装情况...')
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev'
      ORDER BY TRIGGER_NAME
    `)
    
    console.log('已安装的触发器:')
    triggers.forEach(trigger => {
      console.log(`- ${trigger.TRIGGER_NAME}: ${trigger.ACTION_TIMING} ${trigger.EVENT_MANIPULATION} ON ${trigger.EVENT_OBJECT_TABLE}`)
    })
    
    // 检查INSERT触发器是否包含remaining_quantity
    const [insertTrigger] = await connection.query(`
      SELECT ACTION_STATEMENT 
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev' 
      AND TRIGGER_NAME = 'tr_purchase_insert_material'
    `)
    
    if (insertTrigger.length > 0) {
      const actionStatement = insertTrigger[0].ACTION_STATEMENT
      if (actionStatement.includes('remaining_quantity')) {
        console.log('\n✅ INSERT触发器包含remaining_quantity字段设置')
      } else {
        console.log('\n❌ INSERT触发器仍然缺少remaining_quantity字段设置')
      }
    }
    
    // 修复CG20250917120816记录
    console.log('\n🔧 修复CG20250917120816的remaining_quantity...')
    
    // 首先检查当前数据
    const [beforeFix] = await connection.query(
      'SELECT original_quantity, used_quantity, remaining_quantity FROM materials WHERE material_code = ?',
      ['CG20250917120816']
    )
    
    if (beforeFix.length > 0) {
      const before = beforeFix[0]
      console.log('修复前的数据:')
      console.log(`- Original: ${before.original_quantity}`)
      console.log(`- Used: ${before.used_quantity}`)
      console.log(`- Remaining: ${before.remaining_quantity}`)
      
      // 修复remaining_quantity
      await connection.query(`
        UPDATE materials 
        SET remaining_quantity = original_quantity - used_quantity
        WHERE material_code = 'CG20250917120816'
      `)
      
      // 验证修复结果
      const [afterFix] = await connection.query(
        'SELECT original_quantity, used_quantity, remaining_quantity FROM materials WHERE material_code = ?',
        ['CG20250917120816']
      )
      
      if (afterFix.length > 0) {
        const after = afterFix[0]
        console.log('\n修复后的数据:')
        console.log(`- Original: ${after.original_quantity}`)
        console.log(`- Used: ${after.used_quantity}`)
        console.log(`- Remaining: ${after.remaining_quantity}`)
        
        if (after.remaining_quantity === after.original_quantity - after.used_quantity) {
          console.log('\n✅ CG20250917120816记录已成功修复！')
        } else {
          console.log('\n❌ 修复失败，数据仍然不一致')
        }
      }
    } else {
      console.log('\n❌ 未找到CG20250917120816记录')
    }

    await connection.end()
    console.log('\n🎉 触发器修复和数据修正完成！')
    
  } catch (error) {
    console.error('❌ 应用触发器时发生错误:', error)
  }
}

applyFixedTriggers()