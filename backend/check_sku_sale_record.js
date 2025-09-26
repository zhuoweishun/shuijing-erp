// 检查SKU20250924001销售记录的脚本
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') })

// 数据库配置
const db_config = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  charset: 'utf8mb4'
}

async function check_sku_sale_record() {
  let connection
  
  try {
    console.log('🔍 开始检查SKU20250924001的销售记录...')
    console.log('📊 数据库配置:', {
      host: db_config.host,
      port: db_config.port,
      database: db_config.database
    })
    
    // 创建数据库连接
    connection = await mysql.createConnection(db_config)
    console.log('✅ 数据库连接成功')
    
    const target_sku = 'SKU20250924001'
    
    // 1. 检查SKU是否存在
    console.log('\n1. 检查SKU是否存在...')
    const [sku_records] = await connection.execute(`
      SELECT id, sku_code, sku_name, total_quantity, available_quantity, 
             selling_price, created_at, updated_at
      FROM product_skus 
      WHERE sku_code = ?
    `, [target_sku])
    
    if (sku_records.length === 0) {
      console.log('❌ 未找到SKU20250924001')
      return
    }
    
    const sku = sku_records[0]
    console.log('✅ 找到SKU信息:')
    console.log(`  - SKU编码: ${sku.sku_code}`)
    console.log(`  - SKU名称: ${sku.sku_name}`)
    console.log(`  - 总库存: ${sku.total_quantity}`)
    console.log(`  - 可用库存: ${sku.available_quantity}`)
    console.log(`  - 售价: ¥${sku.selling_price}`)
    console.log(`  - 创建时间: ${sku.created_at}`)
    
    // 2. 检查销售记录（customer_purchases表）
    console.log('\n2. 检查销售记录...')
    const [purchase_records] = await connection.execute(`
      SELECT cp.id, cp.customer_id, cp.sku_id, cp.quantity, cp.unit_price, 
             cp.total_price, cp.status, cp.purchase_date, cp.created_at,
             c.name as customer_name, c.phone as customer_phone
      FROM customer_purchases cp
      LEFT JOIN customers c ON cp.customer_id = c.id
      WHERE cp.sku_id = ?
      ORDER BY cp.created_at DESC
    `, [sku.id])
    
    console.log(`📊 找到 ${purchase_records.length} 条销售记录:`)
    if (purchase_records.length > 0) {
      purchase_records.forEach((record, index) => {
        console.log(`  ${index + 1}. 销售记录ID: ${record.id}`)
        console.log(`     - 客户: ${record.customer_name} (${record.customer_phone})`)
        console.log(`     - 数量: ${record.quantity}`)
        console.log(`     - 单价: ¥${record.unit_price}`)
        console.log(`     - 总价: ¥${record.total_price}`)
        console.log(`     - 状态: ${record.status}`)
        console.log(`     - 销售时间: ${record.purchase_date}`)
        console.log(`     - 创建时间: ${record.created_at}`)
        console.log('')
      })
    } else {
      console.log('❌ 没有找到任何销售记录')
    }
    
    // 3. 检查客户信息
    console.log('\n3. 检查相关客户信息...')
    if (purchase_records.length > 0) {
      const customer_ids = [...new Set(purchase_records.map(r => r.customer_id))]
      
      for (const customer_id of customer_ids) {
        const [customer_info] = await connection.execute(`
          SELECT id, name, phone, address, total_purchases, total_orders,
                 first_purchase_date, last_purchase_date, created_at
          FROM customers 
          WHERE id = ?
        `, [customer_id])
        
        if (customer_info.length > 0) {
          const customer = customer_info[0]
          console.log(`✅ 客户信息 (ID: ${customer.id}):`)
          console.log(`  - 姓名: ${customer.name}`)
          console.log(`  - 电话: ${customer.phone}`)
          console.log(`  - 地址: ${customer.address}`)
          console.log(`  - 总消费: ¥${customer.total_purchases}`)
          console.log(`  - 总订单数: ${customer.total_orders}`)
          console.log(`  - 首次购买: ${customer.first_purchase_date}`)
          console.log(`  - 最后购买: ${customer.last_purchase_date}`)
          console.log(`  - 创建时间: ${customer.created_at}`)
        }
      }
    }
    
    // 4. 检查SKU库存变化记录
    console.log('\n4. 检查SKU库存变化记录...')
    const [inventory_logs] = await connection.execute(`
      SELECT id, action, quantity_change, quantity_before, quantity_after,
             reference_type, reference_id, notes, created_at, user_id
      FROM sku_inventory_logs 
      WHERE sku_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [sku.id])
    
    console.log(`📊 找到 ${inventory_logs.length} 条库存变化记录:`)
    if (inventory_logs.length > 0) {
      inventory_logs.forEach((log, index) => {
        console.log(`  ${index + 1}. 操作: ${log.action}`)
        console.log(`     - 数量变化: ${log.quantity_change}`)
        console.log(`     - 变化前: ${log.quantity_before}`)
        console.log(`     - 变化后: ${log.quantity_after}`)
        console.log(`     - 关联类型: ${log.reference_type}`)
        console.log(`     - 关联ID: ${log.reference_id}`)
        console.log(`     - 备注: ${log.notes}`)
        console.log(`     - 操作时间: ${log.created_at}`)
        console.log(`     - 操作用户: ${log.user_id}`)
        console.log('')
      })
    } else {
      console.log('❌ 没有找到库存变化记录')
    }
    
    // 5. 检查财务记录
    console.log('\n5. 检查相关财务记录...')
    const [financial_records] = await connection.execute(`
      SELECT id, record_type, amount, description, reference_type, reference_id,
             transaction_date, created_at
      FROM financial_records 
      WHERE reference_type = 'CUSTOMER_SALE' 
      AND reference_id IN (${purchase_records.map(() => '?').join(',')})
      ORDER BY created_at DESC
    `, purchase_records.map(r => r.id))
    
    console.log(`📊 找到 ${financial_records.length} 条财务记录:`)
    if (financial_records.length > 0) {
      financial_records.forEach((record, index) => {
        console.log(`  ${index + 1}. 类型: ${record.record_type}`)
        console.log(`     - 金额: ¥${record.amount}`)
        console.log(`     - 描述: ${record.description}`)
        console.log(`     - 关联类型: ${record.reference_type}`)
        console.log(`     - 关联ID: ${record.reference_id}`)
        console.log(`     - 交易日期: ${record.transaction_date}`)
        console.log(`     - 创建时间: ${record.created_at}`)
        console.log('')
      })
    } else {
      console.log('❌ 没有找到相关财务记录')
    }
    
    // 6. 总结检查结果
    console.log('\n📋 检查结果总结:')
    console.log(`✅ SKU存在: ${sku_records.length > 0 ? '是' : '否'}`)
    console.log(`✅ 销售记录: ${purchase_records.length} 条`)
    console.log(`✅ 库存变化记录: ${inventory_logs.length} 条`)
    console.log(`✅ 财务记录: ${financial_records.length} 条`)
    
    if (purchase_records.length === 0) {
      console.log('\n⚠️  警告: 没有找到SKU20250924001的销售记录！')
      console.log('   可能的原因:')
      console.log('   1. 销售操作失败，没有创建记录')
      console.log('   2. 数据库事务回滚')
      console.log('   3. API调用出现错误')
      console.log('   4. 前端提交数据有问题')
    } else {
      console.log('\n✅ SKU20250924001的销售流程看起来正常完成')
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔚 数据库连接已关闭')
    }
  }
}

// 运行检查
check_sku_sale_record().then(() => {
  console.log('\n✅ SKU销售记录检查完成')
}).catch(error => {
  console.error('❌ 检查脚本执行失败:', error)
})