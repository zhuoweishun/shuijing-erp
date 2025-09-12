import axios from 'axios'

// 测试配置
const API_BASE_URL = 'http://localhost:3001/api/v1'
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey_j1c2_vy_s_w_qi_oi_jjb_w_ywb_wx6a_d_yw_m_d_vye_hdqe_h_v4a_w_nte_d_bo_iiwia_w_f0_ijox_nz_u2_o_t_a1_nz_u3_l_c_jle_h_ai_oj_e3_n_t_y5_o_t_ix_n_td9.valid_signature_here'

// 测试数据
const testData = {
  quantity: 1,
  reason: '拆散重做',
  returnToMaterial: true,
  selected_materials: ['purchase_id_1'],
  customReturnQuantities: {
    'purchase_id_1': 10
  }
}

async function testDestroy() {
  try {
    console.log('🧪 开始测试SKU销毁功能...')
    console.log('📤 发送数据:', JSON.stringify(testData, null, 2))
    
    const response = await axios.post(
      `${API_BASE_URL}/skus/cmf0pmed6001qosna2yc1g044/destroy`,
      testData,
      {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    console.log('✅ 测试成功!')
    console.log('📥 响应数据:', JSON.stringify(response.data, null, 2))
    
  } catch (error) {
    console.error('❌ 测试失败:')
    if (error.response) {
      console.error('状态码:', error.response.status)
      console.error('错误信息:', JSON.stringify(error.response.data, null, 2))
    } else {
      console.error('网络错误:', error.message)
    }
  }
}

// 运行测试
testDestroy()

console.log('\n📋 测试说明:')
console.log('- 测试字段名修复：customReturnQuantities')
console.log('- 验证后端是否正确接收字段')
console.log('- 检查销毁功能是否正常工作')