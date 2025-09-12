import axios from 'axios';

async function testInventoryAPI() {
  try {
    console.log('🔍 测试库存API...');
    console.log('📡 请求URL: http://localhost:3001/api/v1/inventory/hierarchical');
    console.log('📋 请求参数:', { material_types: 'LOOSE_BEADS,BRACELET' });
    
    const response = await axios.get('http://localhost:3001/api/v1/inventory/hierarchical', {
      params: {
        material_types: 'LOOSE_BEADS,BRACELET'
      },
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey_j1c2_vy_s_w_qi_oi_jjb_w_y4a_d_nn_o_h_aw_m_d_awd_h_vw_z3_e0_z2_ny_zncw_iiwid_x_nlcm5hb_w_ui_oi_jh_z_g1pbi_is_in_jvb_g_ui_oi_j_b_r_e1_j_ti_is_imlhd_c_i6_m_tc1_nz_q4_o_d_iw_nywi_z_xhw_ijox_nz_u3_n_tc0_nj_a3f_q.x00o5OWqX6qmzXUu6qRBkx7ymBhNrFJfCn_pMTk-Pwg'
      }
    });
    
    console.log('✅ API响应状态:', response.status);
    console.log('📊 API响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.data && response.data.data.hierarchy) {
      console.log('✅ 层级数据长度:', response.data.data.hierarchy.length);
      if (response.data.data.hierarchy.length > 0) {
        console.log('📋 第一个材料类型数据:', JSON.stringify(response.data.data.hierarchy[0], null, 2));
      }
    } else {
      console.log('❌ 响应数据格式异常，没有hierarchy字段');
    }
    
  } catch (error) {
    console.error('❌ API请求失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

console.log('🚀 开始执行测试脚本...');
testInventoryAPI().then(() => {
  console.log('✅ 测试脚本执行完成');
}).catch((error) => {
  console.error('❌ 测试脚本执行失败:', error);
});