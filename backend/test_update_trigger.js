import mysql from 'mysql2/promise'

async function testUpdateTrigger() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  })

  try {
    console.log('🧪 测试UPDATE触发器功能...')
    
    // 1. 获取当前数据
    console.log('\n📋 获取当前数据...')
    const [beforeData] = await connection.query(`
      SELECT 
        p.purchase_code, p.piece_count, p.total_price, p.updated_at as p_updated,
        m.original_quantity, m.total_cost, m.updated_at as m_updated
      FROM purchases p
      JOIN materials m ON m.purchase_id = p.id
      WHERE p.purchase_code = 'CG20250917120816'
    `)
    
    if (beforeData.length === 0) {
      console.log('❌ 未找到测试数据')
      return
    }
    
    const before = beforeData[0]
    console.log('更新前 - Purchase数量:', before.piece_count, '价格:', before.total_price)
    console.log('更新前 - Material数量:', before.original_quantity, '总价:', before.total_cost)
    console.log('更新前 - Purchase更新时间:', before.p_updated)
    console.log('更新前 - Material更新时间:', before.m_updated)
    
    // 2. 执行一个明显的数量和价格修改
    console.log('\n🔄 执行数量和价格修改...')
    const newQuantity = 15
    const newPrice = 1500
    
    await connection.query(`
      UPDATE purchases 
      SET piece_count = ?, total_price = ?, updated_at = CURRENT_TIMESTAMP
      WHERE purchase_code = 'CG20250917120816'
    `, [newQuantity, newPrice])
    
    console.log(`✅ 已将数量修改为 ${newQuantity}，价格修改为 ${newPrice}`)
    
    // 3. 等待一下确保触发器执行
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 4. 检查修改后的数据
    console.log('\n📊 检查修改后的数据...')
    const [afterData] = await connection.query(`
      SELECT 
        p.purchase_code, p.piece_count, p.total_price, p.updated_at as p_updated,
        m.original_quantity, m.total_cost, m.unit_cost, m.remaining_quantity, m.updated_at as m_updated
      FROM purchases p
      JOIN materials m ON m.purchase_id = p.id
      WHERE p.purchase_code = 'CG20250917120816'
    `)
    
    if (afterData.length === 0) {
      console.log('❌ 修改后未找到数据')
      return
    }
    
    const after = afterData[0]
    console.log('修改后 - Purchase数量:', after.piece_count, '价格:', after.total_price)
    console.log('修改后 - Material数量:', after.original_quantity, '总价:', after.total_cost)
    console.log('修改后 - Material单价:', after.unit_cost, '剩余数量:', after.remaining_quantity)
    console.log('修改后 - Purchase更新时间:', after.p_updated)
    console.log('修改后 - Material更新时间:', after.m_updated)
    
    // 5. 验证同步结果
    console.log('\n🔍 验证同步结果...')
    const expectedUnitCost = newPrice / newQuantity
    
    if (after.piece_count == newQuantity) {
      console.log('✅ Purchase数量更新成功')
    } else {
      console.log('❌ Purchase数量更新失败')
    }
    
    if (after.total_price == newPrice) {
      console.log('✅ Purchase价格更新成功')
    } else {
      console.log('❌ Purchase价格更新失败')
    }
    
    if (after.original_quantity == newQuantity) {
      console.log('✅ Material数量同步成功')
    } else {
      console.log('❌ Material数量同步失败，期望:', newQuantity, '实际:', after.original_quantity)
    }
    
    if (after.total_cost == newPrice) {
      console.log('✅ Material总价同步成功')
    } else {
      console.log('❌ Material总价同步失败，期望:', newPrice, '实际:', after.total_cost)
    }
    
    if (Math.abs(after.unit_cost - expectedUnitCost) < 0.01) {
      console.log('✅ Material单价计算正确')
    } else {
      console.log('❌ Material单价计算错误，期望:', expectedUnitCost.toFixed(2), '实际:', after.unit_cost)
    }
    
    if (after.remaining_quantity == newQuantity) {
      console.log('✅ Material剩余数量计算正确')
    } else {
      console.log('❌ Material剩余数量计算错误，期望:', newQuantity, '实际:', after.remaining_quantity)
    }
    
    if (after.m_updated > before.m_updated) {
      console.log('✅ Material更新时间已更新')
    } else {
      console.log('❌ Material更新时间未更新')
    }
    
    // 6. 总结测试结果
    const allSynced = (
      after.original_quantity == newQuantity &&
      after.total_cost == newPrice &&
      Math.abs(after.unit_cost - expectedUnitCost) < 0.01 &&
      after.remaining_quantity == newQuantity &&
      after.m_updated > before.m_updated
    )
    
    if (allSynced) {
      console.log('\n🎉 UPDATE触发器工作完全正常！')
      console.log('Purchase表的修改已正确同步到Material表')
    } else {
      console.log('\n⚠️ UPDATE触发器存在问题，部分数据未正确同步')
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await connection.end()
  }
}

testUpdateTrigger()