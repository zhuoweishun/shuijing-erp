import axios from 'axios'

// 测试修复后的SKU溯源API
async function testTraceFix() {
  try {
    console.log('🔍 测试修复后的SKU溯源API...')
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey_j1c2_vy_s_w_qi_oi_jjb_w_ywb_wo3b3_ew_m_d_aw_n_dg5_z_w8xdmlq_z_gpx_iiwid_x_nlcm5hb_w_ui_oi_jib3_nz_iiwicm9s_z_s_i6_ik_j_p_u1_mi_l_c_jp_y_x_qi_oj_e3_n_tcw_nz_a2_n_d_ms_im_v4c_c_i6_m_tc1_nz_y3_n_t_q0_m30.j_l_pd_a_tt_b6_j_y_ubp_mt2_d_c4a_e_r_s1-QO_Ln507PchFB7OIM'
    
    // 获取SKU列表
    const skusResponse = await axios.get('http://localhost:3001/api/v1/skus', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    
    console.log('SKU API响应结构:', typeof skusResponse.data.data, Array.is_array(skusResponse.data.data))
    
    let sku
    if (Array.is_array(skusResponse.data.data)) {
      sku = skusResponse.data.data.find(s => s.sku_code === 'SKU20250905929')
    } else {
      // 如果data不是数组，可能是分页结构
      const sku_list = skusResponse.data.data.skus || skusResponse.data.data.items || []
      sku = skuList.find(s => s.sku_code === 'SKU20250905929')
    }
    
    if (!sku) {
      console.log('❌ 未找到测试SKU')
      return
    }
    
    console.log(`\n🏷️  SKU信息:`)
    console.log(`   SKU编码: ${sku.sku_code}`)
    console.log(`   材料成本: ¥${sku.material_cost}`)
    
    // 测试溯源API
    const traceResponse = await axios.get(`http://localhost:3001/api/v1/skus/${sku.id}/trace`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    
    const { recipe, summary } = traceResponse.data.data
    
    console.log(`\n🧾 修复后的制作配方 (${recipe.length}种原材料):`)
    recipe.for_each((item, index) => {
      console.log(`   ${index + 1}. ${item.material_name}`)
      console.log(`      单个SKU需要: ${item.quantity_per_sku}${item.unit}`)
      console.log(`      单位成本: ¥${item.unit_cost.to_fixed(2)}`)
      console.log(`      单个SKU成本: ¥${item.total_cost_per_sku.to_fixed(2)}`)
      console.log('')
    })
    
    console.log(`📊 汇总信息:`)
    console.log(`   单个SKU总成本: ¥${summary.total_cost_per_sku.to_fixed(2)}`)
    console.log(`   SKU记录的materialCost: ¥${sku.material_cost}`)
    
    const isConsistent = Math.abs(summary.total_cost_per_sku - sku.material_cost) < 0.01
    console.log(`   数据一致性: ${isConsistent ? '✅ 一致' : '❌ 不一致'}`)
    
    if (isConsistent) {
      console.log('\n✅ 修复成功！溯源信息现在显示正确的单个SKU成本')
    } else {
      console.log('\n❌ 仍有问题，需要进一步检查')
      console.log(`   差异: ¥${Math.abs(summary.total_cost_per_sku - sku.material_cost).to_fixed(2)}`)
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message)
    if (error.response) {
      console.error('   响应状态:', error.response.status)
      console.error('   响应数据:', error.response.data)
    }
  }
}

testTraceFix()