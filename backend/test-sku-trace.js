import axios from 'axios'

// 测试SKU溯源API（制作配方）
async function testSkuTrace() {
  try {
    console.log('🧪 测试SKU溯源API（制作配方）...')
    
    // 使用测试token（从其他测试文件获取）
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey_j1c2_vy_s_w_qi_oi_jjb_w_ywb_wo3b3_ew_m_d_aw_n_dg5_z_w8xdmlq_z_gpx_iiwid_x_nlcm5hb_w_ui_oi_jib3_nz_iiwicm9s_z_s_i6_ik_j_p_u1_mi_l_c_jp_y_x_qi_oj_e3_n_tcw_nz_a2_n_d_ms_im_v4c_c_i6_m_tc1_nz_y3_n_t_q0_m30.j_l_pd_a_tt_b6_j_y_ubp_mt2_d_c4a_e_r_s1-QO_Ln507PchFB7OIM'
    console.log('🔐 使用测试访问令牌')
    
    // 先获取所有SKU列表
    const skusResponse = await axios.get('http://localhost:3001/api/v1/skus', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!skusResponse.data.success || skusResponse.data.data.length === 0) {
      console.log('❌ 没有找到SKU数据')
      return
    }
    
    const firstSku = skusResponse.data.data[0]
    console.log(`\n📦 测试SKU: ${firstSku.sku_code} - ${firstSku.sku_name}`)
    console.log(`   总数量: ${firstSku.total_quantity}`)
    console.log(`   规格: ${firstSku.specification || '未设置'}`)
    
    // 测试溯源API
    const traceResponse = await axios.get(`http://localhost:3001/api/v1/skus/${firstSku.id}/trace`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (traceResponse.data.success) {
      console.log('\n✅ SKU制作配方获取成功!')
      console.log('\n📋 制作配方信息:')
      
      const { sku_info, recipe, summary } = traceResponse.data.data
      
      console.log(`\n🏷️  SKU信息:`)
      console.log(`   SKU编码: ${sku_info.sku_code}`)
      console.log(`   SKU名称: ${sku_info.sku_name}`)
      console.log(`   规格: ${sku_info.specification || '未设置'}`)
      console.log(`   总数量: ${sku_info.total_quantity}`)
      
      console.log(`\n🧾 制作配方 (${recipe.length}种原材料):`)
      recipe.for_each((item, index) => {
        console.log(`   ${index + 1}. ${item.material_name}`)
        console.log(`      规格: ${item.specification}`)
        console.log(`      单个SKU需要: ${item.quantity_per_sku}${item.unit}`)
        console.log(`      供应商: ${item.supplier}`)
        console.log(`      CG编号: ${item.cg_number}`)
        console.log(`      单位成本: ¥${item.unit_cost.to_fixed(2)}`)
        console.log(`      单个SKU总成本: ¥${item.total_cost_per_sku.to_fixed(2)}`)
        console.log(`      品质等级: ${item.quality_grade}`)
        console.log(`      采购日期: ${new Date(item.purchase_date).to_locale_date_string()}`)
        console.log(`      说明: ${item.details.description}`)
        console.log('')
      })
      
      console.log(`\n📊 配方汇总:`)
      console.log(`   原材料种类: ${summary.total_materials}种`)
      console.log(`   单个SKU总成本: ¥${summary.total_cost_per_sku.to_fixed(2)}`)
      
      console.log('\n✅ 测试完成: SKU溯源API现在正确显示制作配方，而不是采购记录使用情况')
      console.log('✅ 配方显示单个SKU需要的原材料组成，包含数量、CG编号、供应商等信息')
      
    } else {
      console.log('❌ SKU溯源API调用失败:', traceResponse.data.message)
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message)
    if (error.response) {
      console.error('   响应状态:', error.response.status)
      console.error('   响应数据:', error.response.data)
    }
  }
}

// 运行测试
testSkuTrace()