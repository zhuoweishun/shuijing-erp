import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'

async function recreate_triggers() {
  let connection
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      multipleStatements: true
    })

    console.log('🔧 重新创建触发器...')
    
    // 读取触发器SQL文件
    const sql_file_path = path.join(process.cwd(), 'sql', 'material_sync_triggers.sql')
    const sql_content = fs.readFileSync(sql_file_path, 'utf8')
    
    console.log('📄 执行触发器SQL脚本...')
    
    // 执行SQL脚本
    await connection.query(sql_content)
    
    console.log('✅ 触发器重新创建成功！')
    
    // 验证触发器是否存在
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE 
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev'
      ORDER BY TRIGGER_NAME
    `)
    
    console.log('\n📋 当前数据库中的触发器:')
    triggers.forEach(trigger => {
      console.log(`- ${trigger.TRIGGER_NAME}: ${trigger.EVENT_MANIPULATION} on ${trigger.EVENT_OBJECT_TABLE}`)
    })
    
    console.log('\n🎉 触发器重新创建完成！')
    
  } catch (error) {
    console.error('❌ 重新创建触发器时发生错误:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// 运行脚本
recreate_triggers().catch(error => {
  console.error('重新创建触发器失败:', error)
  process.exit(1)
})