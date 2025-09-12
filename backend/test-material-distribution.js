import fetch from 'node-fetch'
import fs from 'fs'

async function testMaterialDistribution() {
  try {
    // 获取token
    const tokenResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'boss',
        password: '123456'
      })
    })
    
    const tokenData = await tokenResponse.json()
    if (!tokenData.success) {
      throw new Error('登录失败: ' + tokenData.message)
    }
    
    const token = tokenData.data.token
    console.log('✅ 登录成功，获取到token')
    
    // 测试material-distribution API
    const apiResponse = await fetch('http://localhost:3001/api/v1/inventory/material-distribution?material_type=LOOSE_BEADS&limit=10', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 API响应状态:', apiResponse.status)
    
    const responseData = await apiResponse.json()
    console.log('📊 API响应数据:', JSON.stringify(responseData, null, 2))
    
    if (apiResponse.ok) {
      console.log('✅ API调用成功！')
    } else {
      console.log('❌ API调用失败')
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

testMaterialDistribution()