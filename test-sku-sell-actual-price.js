// 测试SKU销售实际价格功能
// 使用Node.js内置的fetch API (Node.js 18+)

// 配置
const API_BASE = 'http://localhost:3001/api/v1';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey_j1c2_vy_s_w_qi_oi_j1c2_vy_xz_aw_m_s_is_in_vz_z_x_ju_y_w1l_ijoi_y_w_rta_w4i_l_c_jyb2xl_ijoi_qk9_t_uy_is_imlhd_c_i6_m_tcz_n_tcy_nz_iw_m_cwi_z_xhw_ijox_nz_m1_o_d_ez_nj_awf_q.example'; // 需要替换为实际token

async function testSkuSellActualPrice() {
  console.log('🧪 开始测试SKU销售实际价格功能...');
  
  try {
    // 1. 获取SKU列表
    console.log('\n1. 获取SKU列表...');
    const skuListResponse = await fetch(`${API_BASE}/skus?limit=5`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const skuListData = await skuListResponse.json();
    console.log('SKU列表响应:', JSON.stringify(skuListData, null, 2));
    
    if (!skuListData.success || !skuListData.data.skus.length) {
      console.log('❌ 没有可用的SKU进行测试');
      return;
    }
    
    const testSku = skuListData.data.skus[0];
    console.log(`✅ 选择测试SKU: ${testSku.sku_name} (${testSku.sku_code})`);
    console.log(`   标准单价: ¥${testSku.unit_price || testSku.selling_price}`);
    console.log(`   可售数量: ${testSku.available_quantity}`);
    
    if (testSku.available_quantity < 1) {
      console.log('❌ SKU库存不足，无法进行销售测试');
      return;
    }
    
    // 2. 测试标准价格销售
    console.log('\n2. 测试标准价格销售...');
    const standardPrice = (testSku.unit_price || testSku.selling_price) * 1;
    
    const standardSellData = {
      quantity: 1,
      customerName: '测试客户A',
      customerPhone: '13800138001',
      customerAddress: '测试地址A',
      saleChannel: '测试渠道',
      notes: '标准价格销售测试',
      actualTotalPrice: standardPrice
    };
    
    console.log('标准价格销售数据:', JSON.stringify(standardSellData, null, 2));
    
    const standardSellResponse = await fetch(`${API_BASE}/skus/${testSku.id}/sell`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(standardSellData)
    });
    
    const standardSellResult = await standardSellResponse.json();
    console.log('标准价格销售响应:', JSON.stringify(standardSellResult, null, 2));
    
    if (standardSellResult.success) {
      console.log('✅ 标准价格销售成功');
      console.log(`   实际成交单价: ¥${standardSellResult.data.sale_info.actual_unit_price}`);
      console.log(`   实际成交总价: ¥${standardSellResult.data.sale_info.total_price}`);
      console.log(`   优惠金额: ¥${standardSellResult.data.sale_info.discount_amount}`);
    } else {
      console.log('❌ 标准价格销售失败:', standardSellResult.message);
    }
    
    // 3. 测试优惠价格销售
    console.log('\n3. 测试优惠价格销售...');
    const discountPrice = standardPrice * 0.8; // 8折优惠
    
    const discountSellData = {
      quantity: 1,
      customerName: '测试客户B',
      customerPhone: '13800138002',
      customerAddress: '测试地址B',
      saleChannel: '测试渠道',
      notes: '优惠价格销售测试',
      actualTotalPrice: discountPrice
    };
    
    console.log('优惠价格销售数据:', JSON.stringify(discountSellData, null, 2));
    
    const discountSellResponse = await fetch(`${API_BASE}/skus/${testSku.id}/sell`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(discountSellData)
    });
    
    const discountSellResult = await discountSellResponse.json();
    console.log('优惠价格销售响应:', JSON.stringify(discountSellResult, null, 2));
    
    if (discountSellResult.success) {
      console.log('✅ 优惠价格销售成功');
      console.log(`   SKU标准单价: ¥${discountSellResult.data.sale_info.sku_unit_price}`);
      console.log(`   实际成交单价: ¥${discountSellResult.data.sale_info.actual_unit_price}`);
      console.log(`   实际成交总价: ¥${discountSellResult.data.sale_info.total_price}`);
      console.log(`   优惠金额: ¥${discountSellResult.data.sale_info.discount_amount}`);
    } else {
      console.log('❌ 优惠价格销售失败:', discountSellResult.message);
    }
    
    // 4. 测试溢价销售
    console.log('\n4. 测试溢价销售...');
    const premiumPrice = standardPrice * 1.2; // 1.2倍溢价
    
    const premiumSellData = {
      quantity: 1,
      customerName: '测试客户C',
      customerPhone: '13800138003',
      customerAddress: '测试地址C',
      saleChannel: '测试渠道',
      notes: '溢价销售测试',
      actualTotalPrice: premiumPrice
    };
    
    console.log('溢价销售数据:', JSON.stringify(premiumSellData, null, 2));
    
    const premiumSellResponse = await fetch(`${API_BASE}/skus/${testSku.id}/sell`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(premiumSellData)
    });
    
    const premiumSellResult = await premiumSellResponse.json();
    console.log('溢价销售响应:', JSON.stringify(premiumSellResult, null, 2));
    
    if (premiumSellResult.success) {
      console.log('✅ 溢价销售成功');
      console.log(`   SKU标准单价: ¥${premiumSellResult.data.sale_info.sku_unit_price}`);
      console.log(`   实际成交单价: ¥${premiumSellResult.data.sale_info.actual_unit_price}`);
      console.log(`   实际成交总价: ¥${premiumSellResult.data.sale_info.total_price}`);
      console.log(`   优惠金额: ¥${premiumSellResult.data.sale_info.discount_amount}`);
    } else {
      console.log('❌ 溢价销售失败:', premiumSellResult.message);
    }
    
    console.log('\n🎉 SKU销售实际价格功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testSkuSellActualPrice();