import mysql from 'mysql2/promise'

async function check_table_structure() {
  let connection
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })
    
    console.log('✅ 数据库连接成功\n')
    
    // 查看product_skus表结构
    const [sku_columns] = await connection.query('DESCRIBE product_skus')
    console.log('📦 product_skus表字段:')
    sku_columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(必填)' : '(可选)'}`)
    })
    console.log('')
    
    // 查看customers表结构
    const [customer_columns] = await connection.query('DESCRIBE customers')
    console.log('👤 customers表字段:')
    customer_columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(必填)' : '(可选)'}`)
    })
    console.log('')
    
    // 查看customer_purchases表结构
    const [purchase_columns] = await connection.query('DESCRIBE customer_purchases')
    console.log('🛒 customer_purchases表字段:')
    purchase_columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(必填)' : '(可选)'}`)
    })
    console.log('')
    
    // 查看一些示例数据
    const [sample_skus] = await connection.query(`
      SELECT * FROM product_skus LIMIT 2
    `)
    console.log('📦 product_skus示例数据:')
    sample_skus.forEach((sku, index) => {
      console.log(`${index + 1}. ID: ${sku.id}`)
      Object.keys(sku).forEach(key => {
        if (key !== 'id') {
          console.log(`   ${key}: ${sku[key]}`)
        }
      })
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ 错误:', error.message)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔌 数据库连接已关闭')
    }
  }
}

check_table_structure()