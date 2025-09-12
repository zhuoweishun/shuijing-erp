// 测试财务流水账修复效果
import axios from 'axios';

// 配置
const API_BASE_URL = 'http://localhost:3001/api/v1';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey_j1c2_vy_s_w_qi_oi_jjb_w_y4a_d_nn_o_h_aw_m_d_awd_h_vw_z3_e0_z2_ny_zncw_iiwid_x_nlcm5hb_w_ui_oi_jh_z_g1pbi_is_in_jvb_g_ui_oi_j_b_r_e1_j_ti_is_imlhd_c_i6_m_tc1_nz_my_mjcx_m_swi_z_xhw_ijox_nz_u3_n_d_a5_m_t_exf_q.74XxeWsUec6xOuNEoxy2UQd-lq4u4hmSpnMw3upsV68';

async function testFinancialTransactions() {
  try {
    console.log('🔍 测试财务流水账修复效果...');
    console.log('=' .repeat(60));
    
    // 获取流水账数据
    const response = await axios.get(`${API_BASE_URL}/financial/transactions`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      params: {
        page: 1,
        limit: 10
      }
    });
    
    if (!response.data.success) {
      console.error('❌ API调用失败:', response.data.message);
      return;
    }
    
    const { transactions, summary } = response.data.data;
    
    console.log('📊 流水账统计:');
    console.log(`   总收入: ¥${summary.total_income.to_fixed(2)}`);
    console.log(`   总支出: ¥${summary.total_expense.to_fixed(2)}`);
    console.log(`   净利润: ¥${summary.net_profit.to_fixed(2)}`);
    console.log('');
    
    console.log('📋 前10条流水账记录:');
    console.log('-'.repeat(60));
    
    transactions.for_each((transaction, index) => {
      const date = new Date(transaction.created_at);
      const formattedDate = date.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
      
      const typeIcon = transaction.type === 'income' ? '💰' : '💸';
      const categoryLabel = {
        'purchase': '采购支出',
        'production': '制作成本',
        'sale': '销售收入',
        'refund': '退款退回'
      }[transaction.category] || transaction.category;
      
      console.log(`${index + 1}. ${typeIcon} [${categoryLabel}] ${transaction.description}`);
      console.log(`   💰 金额: ¥${transaction.amount.to_fixed(2)}`);
      console.log(`   📅 时间: ${formattedDate}`);
      console.log(`   📝 详情: ${transaction.details}`);
      console.log('');
    });
    
    // 分析排序结果
    console.log('🔍 排序分析:');
    console.log('-'.repeat(60));
    
    const productionCount = transactions.filter(t => t.category === 'production').length;
    const purchase_count = transactions.filter(t => t.category === 'purchase').length;
    const firstRecord = transactions[0];
    
    console.log(`   制作记录数量: ${productionCount}`);
    console.log(`   采购记录数量: ${ purchase_count }`);
    console.log(`   第一条记录类型: ${firstRecord.category} (${firstRecord.description})`);
    
    if (firstRecord.category === 'production') {
      console.log('✅ 排序正确: 制作记录显示在前');
    } else {
      console.log('⚠️  排序可能有问题: 第一条不是制作记录');
    }
    
    // 检查时间格式
    console.log('');
    console.log('🕐 时间格式检查:');
    console.log('-'.repeat(60));
    
    const now = new Date();
    const hasInvalidTime = transactions.some(t => {
      const recordTime = new Date(t.created_at);
      return recordTime > now; // 检查是否有未来时间
    });
    
    if (hasInvalidTime) {
      console.log('⚠️  发现未来时间记录');
      transactions.for_each((t, i) => {
        const recordTime = new Date(t.created_at);
        if (recordTime > now) {
          console.log(`   记录${i + 1}: ${t.description} - ${recordTime.to_locale_string('zh-CN')}`);
        }
      });
    } else {
      console.log('✅ 所有时间记录正常，无未来时间');
    }
    
    console.log('');
    console.log('🎉 测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 运行测试
testFinancialTransactions();