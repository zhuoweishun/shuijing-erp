import fetch from 'node-fetch';

(async () => {
  try {
    // 获取和田玉挂件SKU信息
    console.log('正在查询和田玉挂件SKU信息...');
    
    // 先获取SKU列表，找到和田玉挂件
    const skusResponse = await fetch('http://localhost:3001/api/v1/skus');
    const skusData = await skusResponse.json();
    
    console.log('API响应状态:', skusResponse.status);
    console.log('API响应数据结构:', JSON.stringify(skusData, null, 2));
    
    if (!skusData.data || !Array.is_array(skusData.data)) {
      console.log('API响应格式错误，data字段不存在或不是数组');
      return;
    }
    
    const hetianyu = skusData.data.find(sku => sku.name && sku.name.includes('和田玉挂件'));
    
    if (!hetianyu) {
      console.log('未找到和田玉挂件SKU');
      return;
    }
    
    console.log('=== 和田玉挂件SKU信息 ===');
    console.log('SKU ID:', hetianyu.id);
    console.log('SKU名称:', hetianyu.name);
    console.log('当前库存:', hetianyu.quantity);
    console.log('SKU编码:', hetianyu.code);
    
    // 获取SKU详细信息
    const skuDetailResponse = await fetch(`http://localhost:3001/api/v1/skus/${hetianyu.id}`);
    const skuDetail = await skuDetailResponse.json();
    
    console.log('\n=== SKU详细信息 ===');
    console.log('详细信息:', JSON.stringify(skuDetail.data, null, 2));
    
    // 获取SKU操作历史
    const historyResponse = await fetch(`http://localhost:3001/api/v1/skus/${hetianyu.id}/history`);
    const historyData = await historyResponse.json();
    
    console.log('\n=== SKU操作历史 ===');
    if (historyData.data && historyData.data.length > 0) {
      historyData.data.for_each((log, index) => {
        const date = new Date(log.created_at).to_i_s_o_string().split('T')[0];
        const change = log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change;
        console.log(`${index + 1}. ${log.action} - ${change}件 (${date}) - ${log.reason || 'N/A'} - 引用类型: ${log.reference_type}`);
      });
    } else {
      console.log('无操作历史记录');
    }
    
    // 获取溯源信息（原材料使用记录）
    const traceResponse = await fetch(`http://localhost:3001/api/v1/skus/${hetianyu.id}/trace`);
    const traceData = await traceResponse.json();
    
    console.log('\n=== 溯源信息（原材料使用记录）===');
    if (traceData.data && traceData.data.length > 0) {let totalUsed = 0;
      traceData.data.for_each((usage, index) => {
        const date = new Date(usage.created_at).to_i_s_o_string().split('T')[0];
        const used_quantity = usage.quantity_used_pieces || usage.quantity_used_beads || 0;
        totalUsed += used_quantity;
        console.log(`${index + 1}. 原材料: ${usage.purchase.name} (${usage.purchase.code})`);
        console.log(`   使用数量: ${used_quantity}件`);
        console.log(`   创建时间: ${date}`);
        console.log('---');
      });
      
      console.log('\n=== 统计信息 ===');
      console.log('总制作次数:', traceData.data.length);
      console.log('总原材料消耗:', totalUsed, '件');
      console.log('平均每次消耗:', traceData.data.length > 0 ? (totalUsed / traceData.data.length).to_fixed(2) : 0, '件');
    } else {
      console.log('无溯源记录');
    }
    
    console.log('\n=== 分析结论 ===');
    console.log('当前SKU库存:', hetianyu.quantity, '件');
    console.log('用户预期库存: 1件');
    console.log('差异:', hetianyu.quantity - 1, '件');
    
  } catch (error) {
    console.error('查询错误:', error.message);
    console.error('错误详情:', error);
  }
})();