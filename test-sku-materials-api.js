// 测试SKU原材料API的脚本
const testSkuMaterialsApi = async () => {
  const skuId = 'cmf0pmed6001qosna2yc1g044' // 使用日志中看到的SKU ID
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey_j1c2_vy_s_w_qi_oi_jjb_w_ywc_g1l_z_d_yw_m_d_fxb3_nu_y_t_j5_yz_fn_m_d_q0_iiwid_x_nlcm5hb_w_ui_oi_jh_z_g1pbi_is_in_jvb_g_ui_oi_j_c_t1_n_t_iiwia_w_f0_ijox_nz_u2_o_dkz_nz_i1_l_c_jle_h_ai_oj_e3_n_t_y5_o_d_ax_mj_v9.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8' // 示例token，需要替换为实际token
  
  console.log('🔍 测试SKU原材料API调用...')
  console.log('SKU ID:', skuId)
  
  try {
    // 测试直接调用后端API
    const directUrl = `http://localhost:3001/api/v1/skus/${skuId}/materials`
    console.log('\n📡 直接调用后端API:', directUrl)
    
    const directResponse = await fetch(directUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('直接调用状态:', directResponse.status)
    
    if (directResponse.ok) {
      const directResult = await directResponse.json()
      console.log('✅ 直接调用成功:', directResult)
    } else {
      const errorText = await directResponse.text()
      console.log('❌ 直接调用失败:', errorText)
    }
    
    // 测试通过代理调用
    const proxyUrl = `http://localhost:5173/api/v1/skus/${skuId}/materials`
    console.log('\n🔄 通过代理调用:', proxyUrl)
    
    const proxyResponse = await fetch(proxyUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('代理调用状态:', proxyResponse.status)
    
    if (proxyResponse.ok) {
      const proxyResult = await proxyResponse.json()
      console.log('✅ 代理调用成功:', proxyResult)
    } else {
      const errorText = await proxyResponse.text()
      console.log('❌ 代理调用失败:', errorText)
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 如果在Node.js环境中运行
if (typeof window === 'undefined') {
  // 导入fetch polyfill
  import('node-fetch').then(({ default: fetch }) => {
    global.fetch = fetch
    testSkuMaterialsApi()
  }).catch(() => {
    console.log('请在浏览器控制台中运行此脚本')
  })
} else {
  // 在浏览器中运行
  testSkuMaterialsApi()
}

// 导出函数供浏览器使用
if (typeof window !== 'undefined') {
  window.testSkuMaterialsApi = testSkuMaterialsApi
}