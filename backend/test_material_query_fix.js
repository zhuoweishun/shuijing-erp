import axios from 'axios'

async function testMaterialQueryFix() {
  try {
    console.log('🧪 测试 Material 查询字段修复...')
    
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
      console.log('⚠️ 没有供应商数据，无法测试原材料查询')
      return
    }
    
    // 测试第一个供应商的原材料查询
    const testSupplier = suppliers[0]
    console.log(`🔍 测试供应商: ${testSupplier.name} (ID: ${testSupplier.id})`)
    
    // 测试查询所有记录（包括原材料）
    const allRecordsResponse = await axios.get(
      `http://localhost:3001/api/v1/suppliers/${testSupplier.id}/purchases?type=all&page=1&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (allRecordsResponse.data.success) {
      console.log('✅ 供应商所有记录查询成功!')
      console.log('📊 查询结果:', {
        供应商名称: allRecordsResponse.data.data.supplier.name,
        采购记录数量: allRecordsResponse.data.data.purchases.length,
        原材料记录数量: allRecordsResponse.data.data.materials.length,
        统计信息: allRecordsResponse.data.data.statistics
      })
      
      // 如果有原材料记录，显示第一条的字段
      if (allRecordsResponse.data.data.materials.length > 0) {
        const firstMaterial = allRecordsResponse.data.data.materials[0]
        console.log('📦 第一条原材料记录字段:', Object.keys(firstMaterial))
        console.log('📦 第一条原材料详情:', firstMaterial)
      }
    } else {
      console.error('❌ 供应商记录查询失败:', allRecordsResponse.data.message)
      if (allRecordsResponse.data.error) {
        console.error('错误详情:', allRecordsResponse.data.error)
      }
    }
    
    // 单独测试原材料查询
    const materialsResponse = await axios.get(
      `http://localhost:3001/api/v1/suppliers/${testSupplier.id}/purchases?type=materials&page=1&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (materialsResponse.data.success) {
      console.log('✅ 供应商原材料查询成功!')
      console.log('📦 原材料查询结果:', {
        原材料记录数量: materialsResponse.data.data.materials.length
      })
    } else {
      console.error('❌ 供应商原材料查询失败:', materialsResponse.data.message)
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
    if (error.response?.data) {
      console.error('API响应错误:', error.response.data)
    }
  }
}

testMaterialQueryFix()