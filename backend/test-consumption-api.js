import fetch from 'node-fetch'

async function testConsumptionAPI() {
  try {
    console.log('=== 测试库存消耗分析API ===')
    
    const response = await fetch('http://localhost:3001/api/v1/inventory/consumption-analysis?time_range=30d&limit=10', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWV6N3p6ZGowMDBhbzNhajJxZGZkZGNhIiwicm9sZSI6IkJPU1MiLCJpYXQiOjE3MjUwOTU1NjIsImV4cCI6MTcyNTE4MTk2Mn0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8',
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('API请求失败:', response.status, response.statusText)
      return
    }
    
    const data = await response.json()
    console.log('\n=== API响应数据 ===')
    console.log('成功:', data.success)
    console.log('消息:', data.message)
    
    if (data.data) {
      console.log('\n=== 消耗分析数据 ===')
      console.log('时间范围:', data.data.time_range)
      console.log('总消耗量:', data.data.total_consumption)
      console.log('总消耗次数:', data.data.total_consumption_count)
      console.log('分析时间:', data.data.analysis_date)
      
      console.log('\n=== 前10名消耗产品 ===')
      data.data.top_consumed_products.forEach((item, index) => {
        console.log(`${index + 1}. ${item.product_name} (${item.product_type})`)
        console.log(`   消耗量: ${item.total_consumed} ${item.unit_type}`)
        console.log(`   消耗次数: ${item.consumption_count}`)
        console.log(`   平均消耗: ${item.avg_consumption} ${item.unit_type}`)
        console.log(`   供应商: ${item.supplier_name || '未知'}`)
        console.log('')
      })
      
      // 验证总消耗量计算
      const calculatedTotal = data.data.top_consumed_products.reduce((sum, item) => sum + item.total_consumed, 0)
      console.log('=== 验证计算 ===')
      console.log('API返回的总消耗量:', data.data.total_consumption)
      console.log('手动计算的总消耗量:', calculatedTotal)
      console.log('计算是否一致:', data.data.total_consumption === calculatedTotal ? '✓' : '✗')
    }
    
  } catch (error) {
    console.error('测试失败:', error)
  }
}

testConsumptionAPI()