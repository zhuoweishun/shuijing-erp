import mysql from 'mysql2/promise'

async function test_youdan_price_display() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  })

  try {
    console.log('🧪 测试油胆价格显示问题...')
    
    // 1. 查询materials表中的油胆数据，检查unit_cost字段
    console.log('\n📊 [Materials表] 查询油胆数据的价格字段...')
    const [materialsData] = await connection.execute(`
      SELECT 
        id,
        material_name,
        material_type,
        quality,
        bead_diameter,
        original_quantity,
        remaining_quantity,
        unit_cost,
        total_cost,
        purchase_id
      FROM materials 
      WHERE material_name LIKE '%油胆%'
      ORDER BY material_name, quality
    `)
    
    console.log(`找到 ${materialsData.length} 条油胆记录:`)
    materialsData.forEach((record, index) => {
      console.log(`\n记录 ${index + 1}:`)
      console.log(`  - 名称: ${record.material_name}`)
      console.log(`  - 品相: ${record.quality}`)
      console.log(`  - 规格: ${record.bead_diameter}mm`)
      console.log(`  - 库存: ${record.remaining_quantity}/${record.original_quantity}`)
      console.log(`  - unit_cost: ${record.unit_cost} (类型: ${typeof record.unit_cost})`)
      console.log(`  - total_cost: ${record.total_cost} (类型: ${typeof record.total_cost})`)
      console.log(`  - purchase_id: ${record.purchase_id}`)
    })
    
    // 2. 模拟层级式库存查询的SQL，检查price_per_unit字段
    console.log('\n📊 [层级式查询] 模拟inventory API的查询逻辑...')
    const inventoryQuery = `
      SELECT 
        m.id as material_id,
        m.material_code as material_code,
        m.material_name as material_name,
        m.material_type as material_type,
        m.quality,
        m.bead_diameter as bead_diameter,
        m.original_quantity,
        m.used_quantity,
        COALESCE(m.remaining_quantity, m.original_quantity - m.used_quantity) as remaining_quantity,
        m.unit_cost as price_per_unit,
        NULL as price_per_gram,
        m.material_date as material_date,
        s.name as supplier_name
      FROM materials m
      LEFT JOIN suppliers s ON m.supplier_id = s.id
      WHERE m.material_name LIKE '%油胆%'
      ORDER BY m.material_type, m.material_name, m.bead_diameter, m.quality
    `
    
    const [inventoryData] = await connection.execute(inventoryQuery)
    
    console.log(`\n层级式查询结果 (${inventoryData.length} 条记录):`)
    inventoryData.forEach((record, index) => {
      console.log(`\n记录 ${index + 1}:`)
      console.log(`  - material_name: ${record.material_name}`)
      console.log(`  - material_type: ${record.material_type}`)
      console.log(`  - quality: ${record.quality}`)
      console.log(`  - bead_diameter: ${record.bead_diameter}mm`)
      console.log(`  - remaining_quantity: ${record.remaining_quantity}`)
      console.log(`  - price_per_unit: ${record.price_per_unit} (类型: ${typeof record.price_per_unit})`)
      console.log(`  - supplier_name: ${record.supplier_name}`)
    })
    
    // 3. 检查是否有price_per_unit为null或0的情况
    const nullPriceRecords = inventoryData.filter(record => 
      record.price_per_unit === null || record.price_per_unit === 0
    )
    
    if (nullPriceRecords.length > 0) {
      console.log(`\n⚠️  发现 ${nullPriceRecords.length} 条记录的price_per_unit为空或0:`)
      nullPriceRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.material_name} (${record.quality}级) - price_per_unit: ${record.price_per_unit}`)
      })
    } else {
      console.log('\n✅ 所有油胆记录都有有效的price_per_unit值')
    }
    
    // 4. 计算加权平均价格（模拟前端逻辑）
    console.log('\n📊 [价格计算] 模拟前端加权平均价格计算...')
    const priceCalculation = {}
    
    inventoryData.forEach(record => {
      const key = `${record.material_name}_${record.bead_diameter}mm`
      if (!priceCalculation[key]) {
        priceCalculation[key] = {
          material_name: record.material_name,
          bead_diameter: record.bead_diameter,
          total_weighted_price: 0,
          total_quantity: 0,
          records: []
        }
      }
      
      const price = Number(record.price_per_unit) || 0
      const quantity = Number(record.original_quantity) || 0
      
      if (price > 0 && quantity > 0) {
        priceCalculation[key].total_weighted_price += price * quantity
        priceCalculation[key].total_quantity += quantity
      }
      
      priceCalculation[key].records.push({
        quality: record.quality,
        price: price,
        quantity: quantity,
        remaining: record.remaining_quantity
      })
    })
    
    Object.values(priceCalculation).forEach(calc => {
      const avgPrice = calc.total_quantity > 0 ? calc.total_weighted_price / calc.total_quantity : 0
      console.log(`\n${calc.material_name} (${calc.bead_diameter}mm):`)
      console.log(`  - 加权平均价格: ¥${avgPrice.toFixed(2)}`)
      console.log(`  - 总数量: ${calc.total_quantity}`)
      console.log(`  - 品相分布:`)
      calc.records.forEach(record => {
        console.log(`    * ${record.quality}级: ¥${record.price.toFixed(2)}/颗, 库存${record.remaining}颗`)
      })
    })
    
    console.log('\n✅ 油胆价格显示测试完成!')
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await connection.end()
  }
}

test_youdan_price_display()