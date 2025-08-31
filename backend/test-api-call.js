import fetch from 'node-fetch'
import jwt from 'jsonwebtoken'

async function testPriceDistributionAPI() {
  try {
    // 生成测试token
    const token = jwt.sign(
      { userId: 'cmeyetibk0000f49cmtul3xiq', role: 'BOSS' }, 
      'crystal_erp_jwt_secret_key_2024'
    )
    
    console.log('🔍 测试价格分布API调用...')
    
    // 测试单价分布
    const unitPriceResponse = await fetch(
      'http://localhost:3001/api/v1/inventory/price-distribution?product_type=LOOSE_BEADS&price_type=unit_price',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    const unitPriceData = await unitPriceResponse.json()
    console.log('\n📊 单价分布API响应:')
    console.log('Status:', unitPriceResponse.status)
    console.log('Data:', JSON.stringify(unitPriceData, null, 2))
    
    // 测试总价分布
    const totalPriceResponse = await fetch(
      'http://localhost:3001/api/v1/inventory/price-distribution?product_type=LOOSE_BEADS&price_type=total_price',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    const totalPriceData = await totalPriceResponse.json()
    console.log('\n📊 总价分布API响应:')
    console.log('Status:', totalPriceResponse.status)
    console.log('Data:', JSON.stringify(totalPriceData, null, 2))
    
  } catch (error) {
    console.error('❌ API调用失败:', error)
  }
}

testPriceDistributionAPI()