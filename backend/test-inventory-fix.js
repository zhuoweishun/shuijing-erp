import axios from 'axios'

const BASE_URL = 'http://localhost:3001/api/v1'

async function testInventoryFix() {
  try {
    console.log('🔍 测试库存修复结果...')
    
    // 1. 登录获取token
    console.log('\n1. 登录获取访问令牌...')
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'boss',
      password: '123456'
    })
    
    const token = loginResponse.data.data.token
    console.log('✅ 登录成功')
    
    // 2. 获取采购记录列表
    console.log('\n2. 查询原材料CG20250901590291的库存...')
    const purchasesResponse = await axios.get(`${BASE_URL}/purchases?limit=100`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('完整API响应:', JSON.stringify(purchasesResponse.data, null, 2))
    
    // 先不查找具体材料，直接看响应结构
    const targetMaterial = null
    
    if (targetMaterial) {
      console.log('✅ 找到目标原材料:')
      console.log(`   编号: ${targetMaterial.code}`)
      console.log(`   名称: ${targetMaterial.product_name}`)
      console.log(`   剩余库存: ${targetMaterial.remaining_quantity}件`)
      
      if (targetMaterial.remaining_quantity === 39) {
        console.log('\n🎉 库存修复成功！显示正确的39件')
      } else {
        console.log(`\n❌ 库存仍然不正确，显示${targetMaterial.remaining_quantity}件，应该是39件`)
      }
    } else {
      console.log('❌ 未找到目标原材料CG20250901590291')
    }
    
    // 3. 测试SKU补货信息
    console.log('\n3. 测试SKU补货信息...')
    const skuRestockResponse = await axios.get(`${BASE_URL}/skus/cmf0pmed6001qosna2yc1g044/restock-info`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const restockInfo = skuRestockResponse.data.data
    const hetianyu = restockInfo.materials.find(m => m.product_name.includes('和田玉挂件'))
    
    if (hetianyu) {
      console.log('✅ SKU补货信息中的和田玉挂件:')
      console.log(`   当前库存: ${hetianyu.current_remaining}件`)
      console.log(`   需要数量: ${hetianyu.quantity_needed}件`)
      
      if (hetianyu.current_remaining === 39) {
        console.log('\n🎉 SKU补货信息也显示正确的39件库存！')
      } else {
        console.log(`\n❌ SKU补货信息仍显示${hetianyu.current_remaining}件，应该是39件`)
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data?.message || error.message)
  }
}

testInventoryFix()