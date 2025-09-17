import mysql from 'mysql2/promise'

async function checkCurrentTrigger() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔍 检查当前INSERT触发器内容...')
    
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME, ACTION_STATEMENT 
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'shuijing_erp' 
      AND TRIGGER_NAME = 'tr_purchase_insert_material'
    `)

    if (triggers.length > 0) {
      console.log('\n📋 当前INSERT触发器内容:')
      console.log(triggers[0].ACTION_STATEMENT)
      
      // 检查是否包含remaining_quantity设置
      const actionStatement = triggers[0].ACTION_STATEMENT
      if (actionStatement.includes('remaining_quantity')) {
        console.log('\n✅ 触发器包含remaining_quantity字段设置')
      } else {
        console.log('\n❌ 触发器缺少remaining_quantity字段设置！这是问题根源！')
      }
    } else {
      console.log('\n❌ 未找到INSERT触发器')
    }

    await connection.end()
  } catch (error) {
    console.error('❌ 检查触发器时发生错误:', error)
  }
}

checkCurrentTrigger()