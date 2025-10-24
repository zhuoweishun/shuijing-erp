import axios from 'axios'

async function testSupplierPurchasesAPI() {
  try {
    console.log('🧪 测试供应商采购记录API修复...')
    
    // 首先登录获取token
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      user_name: 'boss',
      password: '123456'
    })
    
    if (!loginResponse.data.success) {
      console.error('❌ 登录失败:', loginResponse.data.message)
      return
    }
    
    const token = loginResponse.data.data.token
    console.log('✅ 登录成功，获取到token')
    
    // 获取供应商列表
    const suppliersResponse = await axios.get('http://localhost:3001/api/v1/suppliers', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (!suppliersResponse.data.success) {
      console.error('❌ 获取供应商列表失败:', suppliersResponse.data.message)
      return
    }
    
    const suppliers = suppliersResponse.data.data.suppliers
    console.log(`✅ 获取到 ${suppliers.length} 个供应商`)
    
    if (suppliers.length === 0) {
      console.log('⚠️ 没有供应商数据，无法测试采购记录查询')
      return
    }
    
    // 测试第一个供应商的采购记录查询
    const testSupplier = suppliers[0]
    console.log(`🔍 测试供应商: ${testSupplier.name} (ID: ${testSupplier.id})`)
    
    const purchasesResponse = await axios.get(
      `http://localhost:3001/api/v1/suppliers/${testSupplier.id}/purchases?type=purchases&page=1&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (purchasesResponse.data.success) {
      console.log('✅ 供应商采购记录查询成功!')
      console.log('📊 查询结果:', {
        供应商名称: purchasesResponse.data.data.supplier.name,
        采购记录数量: purchasesResponse.data.data.purchases.length,
        统计信息: purchasesResponse.data.data.statistics
      })
    } else {
      console.error('❌ 供应商采购记录查询失败:', purchasesResponse.data.message)
      if (purchasesResponse.data.error) {
        console.error('错误详情:', purchasesResponse.data.error)
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
    if (error.response?.data) {
      console.error('API响应错误:', error.response.data)
    }
  }
}

testSupplierPurchasesAPI()