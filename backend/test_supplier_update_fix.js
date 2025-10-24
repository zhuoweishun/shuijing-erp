import axios from 'axios'

async function testSupplierUpdateFix() {
  try {
    console.log('🧪 测试供应商更新功能修复...')
    
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
      console.log('⚠️ 没有供应商数据，无法测试更新功能')
      return
    }
    
    // 测试第一个供应商的更新
    const testSupplier = suppliers[0]
    console.log(`🔍 测试供应商: ${testSupplier.name} (ID: ${testSupplier.id})`)
    
    // 准备更新数据（只修改描述，避免影响其他字段）
    const updateData = {
      name: testSupplier.name,
      contact: testSupplier.contact,
      phone: testSupplier.phone,
      email: testSupplier.email,
      address: testSupplier.address,
      description: `${testSupplier.description || ''} - 测试更新于 ${new Date().toLocaleString()}`
    }
    
    console.log('📝 准备更新数据:', {
      原描述: testSupplier.description,
      新描述: updateData.description
    })
    
    // 执行更新操作
    const updateResponse = await axios.put(
      `http://localhost:3001/api/v1/suppliers/${testSupplier.id}`,
      updateData,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (updateResponse.data.success) {
      console.log('✅ 供应商更新成功!')
      console.log('📊 更新结果:', {
        供应商名称: updateResponse.data.data.name,
        更新时间: updateResponse.data.data.updated_at,
        新描述: updateResponse.data.data.description
      })
      
      // 验证更新是否生效
      const verifyResponse = await axios.get(
        `http://localhost:3001/api/v1/suppliers`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (verifyResponse.data.success) {
        const updatedSupplier = verifyResponse.data.data.suppliers.find(s => s.id === testSupplier.id)
        if (updatedSupplier && updatedSupplier.description === updateData.description) {
          console.log('✅ 更新验证成功，数据已正确保存')
        } else {
          console.log('⚠️ 更新验证失败，数据可能未正确保存')
        }
      }
      
    } else {
      console.error('❌ 供应商更新失败:', updateResponse.data.message)
      if (updateResponse.data.error) {
        console.error('错误详情:', updateResponse.data.error)
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
    if (error.response?.data) {
      console.error('API响应错误:', error.response.data)
    }
    if (error.response?.status) {
      console.error('HTTP状态码:', error.response.status)
    }
  }
}

testSupplierUpdateFix()