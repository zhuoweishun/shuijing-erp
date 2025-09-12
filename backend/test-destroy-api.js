// 测试销毁API的数据格式
import axios from 'axios'

const API_BASE = 'http://localhost:3001/api/v1'

// 测试用的token（需要先登录获取）
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey_j1c2_vy_s_w_qi_oi_jjb_w_ywb_wo3b3_ew_m_d_aw_n_dg5_z_w8xdmlq_z_gpx_iiwid_x_nlcm5hb_w_ui_oi_jib3_nz_iiwicm9s_z_s_i6_ik_j_p_u1_mi_l_c_jp_y_x_qi_oj_e3_n_t_y5_nz_i1_m_t_us_im_v4c_c_i6_m_tc1_nz_u3_nz_mx_n_x0.WELZfXAsjNRoTexEh30mjHHiCo_3UZeD5mu9uROiTP0'

async function testDestroyAPI() {
  try {
    console.log('🧪 开始测试销毁API...')
    
    // 1. 先获取SKU列表
    console.log('\n1. 获取SKU列表...')
    const skuResponse = await axios.get(`${API_BASE}/skus?limit=5`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    })
    
    if (!skuResponse.data.success || !skuResponse.data.data.skus.length) {
      console.log('❌ 没有找到可测试的SKU')
      return
    }
    
    const testSku = skuResponse.data.data.skus[0]
    console.log(`✅ 找到测试SKU: ${testSku.sku_code} (可售数量: ${testSku.available_quantity})`)
    
    if (testSku.available_quantity < 1) {
      console.log('❌ SKU可售数量不足，无法测试销毁')
      return
    }
    
    // 2. 测试简单销毁（不退回原材料）
    console.log('\n2. 测试简单销毁（不退回原材料）...')
    const simpleDestroyData = {
      quantity: 1,
      reason: '测试销毁',
      returnToMaterial: false
    }
    
    console.log('发送数据:', JSON.stringify(simpleDestroyData, null, 2))
    
    try {
      const destroyResponse = await axios.post(
        `${API_BASE}/skus/${testSku.id}/destroy`,
        simpleDestroyData,
        {
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      console.log('✅ 简单销毁测试成功:', destroyResponse.data)
      
    } catch (error) {
      console.log('❌ 简单销毁测试失败:')
      if (error.response) {
        console.log('状态码:', error.response.status)
        console.log('错误信息:', error.response.data)
      } else {
        console.log('网络错误:', error.message)
      }
    }
    
    // 3. 测试带原材料退回的销毁
    console.log('\n3. 测试带原材料退回的销毁...')
    
    // 先获取SKU的原材料信息
    try {
      const materialsResponse = await axios.get(
        `${API_BASE}/skus/${testSku.id}/materials`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`
          }
        }
      )
      
      if (materialsResponse.data.success && materialsResponse.data.data.materials.length > 0) {
        const materials = materialsResponse.data.data.materials
        console.log(`✅ 获取到 ${materials.length} 个原材料记录`)
        
        // 构造退回数据 - 模拟用户场景：销毁2件，只退回1个原材料
        const customReturnQuantities = {}
        const selected_materials = []
        
        // 只选择第一个原材料进行退回
        if (materials.length > 0) {
          const firstMaterial = materials[0]
          selected_materials.push(firstMaterial.purchase_id)
          customReturnQuantities[firstMaterial.purchase_id] = 1 // 只退回1个
        }
        
        const complexDestroyData = {
          quantity: 2, // 销毁2件
          reason: '拆散重做',
          returnToMaterial: true,
          selected_materials: selected_materials,
          customReturnQuantities: customReturnQuantities
        }
        
        console.log('🔍 测试场景: 销毁2件SKU，只退回1个原材料')
        
        console.log('发送数据:', JSON.stringify(complexDestroyData, null, 2))
        
        try {
          const complexDestroyResponse = await axios.post(
            `${API_BASE}/skus/${testSku.id}/destroy`,
            complexDestroyData,
            {
              headers: {
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          )
          
          console.log('✅ 复杂销毁测试成功:', complexDestroyResponse.data)
          
        } catch (error) {
          console.log('❌ 复杂销毁测试失败:')
          if (error.response) {
            console.log('状态码:', error.response.status)
            console.log('错误信息:', error.response.data)
          } else {
            console.log('网络错误:', error.message)
          }
        }
        
      } else {
        console.log('⚠️ 该SKU没有原材料记录，跳过复杂销毁测试')
      }
      
    } catch (error) {
      console.log('❌ 获取原材料信息失败:', error.response?.data || error.message)
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message)
  }
}

// 运行测试
testDestroyAPI()