import mysql from 'mysql2/promise'

async function checkTriggersStatus() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  })

  try {
    console.log('🔍 检查所有触发器状态...')
    
    // 1. 查看所有触发器
    console.log('\n📋 数据库中的所有触发器:')
    const [allTriggers] = await connection.query(`
      SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, TRIGGER_SCHEMA
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev'
      ORDER BY TRIGGER_NAME
    `)
    
    if (allTriggers.length === 0) {
      console.log('❌ 数据库中没有任何触发器')
    } else {
      console.log(`✅ 找到 ${allTriggers.length} 个触发器:`)
      allTriggers.forEach(trigger => {
        console.log(`- ${trigger.TRIGGER_NAME}: ${trigger.ACTION_TIMING} ${trigger.EVENT_MANIPULATION} ON ${trigger.EVENT_OBJECT_TABLE}`)
      })
    }
    
    // 2. 专门检查UPDATE触发器
    console.log('\n🔧 专门检查UPDATE触发器:')
    const [updateTriggers] = await connection.query(`
      SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, DEFINER
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev' 
      AND TRIGGER_NAME = 'tr_purchase_update_material'
    `)
    
    if (updateTriggers.length === 0) {
      console.log('❌ tr_purchase_update_material 触发器不存在')
    } else {
      console.log('✅ tr_purchase_update_material 触发器存在')
      const trigger = updateTriggers[0]
      console.log('触发器名称:', trigger.TRIGGER_NAME)
      console.log('触发时机:', trigger.ACTION_TIMING)
      console.log('触发事件:', trigger.EVENT_MANIPULATION)
      console.log('目标表:', trigger.EVENT_OBJECT_TABLE)
      console.log('定义者:', trigger.DEFINER)
    }
    
    // 3. 检查INSERT触发器
    console.log('\n🔧 检查INSERT触发器:')
    const [insertTriggers] = await connection.query(`
      SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev' 
      AND TRIGGER_NAME = 'tr_purchase_insert_material'
    `)
    
    if (insertTriggers.length === 0) {
      console.log('❌ tr_purchase_insert_material 触发器不存在')
    } else {
      console.log('✅ tr_purchase_insert_material 触发器存在')
    }
    
    // 4. 检查material_usage相关触发器
    console.log('\n🔧 检查material_usage相关触发器:')
    const [usageTriggers] = await connection.query(`
      SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev' 
      AND TRIGGER_NAME LIKE '%material_usage%'
    `)
    
    if (usageTriggers.length === 0) {
      console.log('❌ 没有material_usage相关触发器')
    } else {
      console.log(`✅ 找到 ${usageTriggers.length} 个material_usage相关触发器:`)
      usageTriggers.forEach(trigger => {
        console.log(`- ${trigger.TRIGGER_NAME}: ${trigger.ACTION_TIMING} ${trigger.EVENT_MANIPULATION} ON ${trigger.EVENT_OBJECT_TABLE}`)
      })
    }
    
    // 5. 检查当前数据库名称
    console.log('\n🗄️ 当前数据库信息:')
    const [dbInfo] = await connection.query('SELECT DATABASE() as current_db')
    console.log('当前数据库:', dbInfo[0].current_db)
    
  } catch (error) {
    console.error('❌ 检查触发器状态时发生错误:', error)
  } finally {
    await connection.end()
  }
}

checkTriggersStatus()