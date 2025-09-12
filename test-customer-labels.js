// 测试客户标签计算逻辑
// 模拟20个客户数据，验证每个基于20%的标签是否都有4个客户

const customers = [
  { id: 1, name: '客户1', total_purchases: 10000, totalOrders: 15, refundCount: 8, refundRate: 53.3 },
  { id: 2, name: '客户2', total_purchases: 8500, totalOrders: 12, refundCount: 6, refundRate: 50.0 },
  { id: 3, name: '客户3', total_purchases: 7200, totalOrders: 10, refundCount: 5, refundRate: 50.0 },
  { id: 4, name: '客户4', total_purchases: 6800, totalOrders: 9, refundCount: 4, refundRate: 44.4 },
  { id: 5, name: '客户5', total_purchases: 5500, totalOrders: 8, refundCount: 3, refundRate: 37.5 },
  { id: 6, name: '客户6', total_purchases: 4800, totalOrders: 7, refundCount: 3, refundRate: 42.9 },
  { id: 7, name: '客户7', total_purchases: 4200, totalOrders: 6, refundCount: 2, refundRate: 33.3 },
  { id: 8, name: '客户8', total_purchases: 3800, totalOrders: 6, refundCount: 2, refundRate: 33.3 },
  { id: 9, name: '客户9', total_purchases: 3200, totalOrders: 5, refundCount: 2, refundRate: 40.0 },
  { id: 10, name: '客户10', total_purchases: 2800, totalOrders: 4, refundCount: 1, refundRate: 25.0 },
  { id: 11, name: '客户11', total_purchases: 2400, totalOrders: 4, refundCount: 1, refundRate: 25.0 },
  { id: 12, name: '客户12', total_purchases: 2000, totalOrders: 3, refundCount: 1, refundRate: 33.3 },
  { id: 13, name: '客户13', total_purchases: 1800, totalOrders: 3, refundCount: 1, refundRate: 33.3 },
  { id: 14, name: '客户14', total_purchases: 1500, totalOrders: 3, refundCount: 0, refundRate: 0 },
  { id: 15, name: '客户15', total_purchases: 1200, totalOrders: 2, refundCount: 0, refundRate: 0 },
  { id: 16, name: '客户16', total_purchases: 1000, totalOrders: 2, refundCount: 0, refundRate: 0 },
  { id: 17, name: '客户17', total_purchases: 800, totalOrders: 2, refundCount: 0, refundRate: 0 },
  { id: 18, name: '客户18', total_purchases: 600, totalOrders: 1, refundCount: 0, refundRate: 0 },
  { id: 19, name: '客户19', total_purchases: 400, totalOrders: 1, refundCount: 0, refundRate: 0 },
  { id: 20, name: '客户20', total_purchases: 200, totalOrders: 1, refundCount: 0, refundRate: 0 }
];

// 复制前端的标签计算逻辑
function getCustomerLabels(customer, allCustomers = []) {
  const labels = [];
  
  // 计算动态阈值（基于所有客户数据）
  const calculateThresholds = () => {
    if (allCustomers.length === 0) {
      return {
        vipThreshold: 5000,
        fanaticThreshold: 10,
        highValueThreshold: 1000,
        lowValueThreshold: 200
      };
    }
    
    // 计算累计消费金额前20%的阈值（VIP阈值）
    const total_purchases = allCustomers.map(c => c.total_purchases).sort((a, b) => b - a);
    const vipCount = Math.ceil(total_purchases.length * 0.2);
    const vipIndex = Math.max(0, vipCount - 1);
    const vipThreshold = total_purchases[vipIndex] || 5000;
    
    // 计算购买次数前20%的阈值（狂热客户阈值）
    const totalOrders = allCustomers.map(c => c.totalOrders).sort((a, b) => b - a);
    const fanaticCount = Math.ceil(totalOrders.length * 0.2);
    const fanaticIndex = Math.max(0, fanaticCount - 1);
    const fanaticThreshold = totalOrders[fanaticIndex] || 10;
    
    // 计算有效客单价的分位数（基于有效订单，去除退货）
    // 注意：高客和低客需要过滤掉没有有效订单的客户，因为没有有效订单就没有客单价概念
    const validCustomers = allCustomers.filter(c => c.totalOrders > 0); // 只包含有有效订单的客户
    const avgOrderValues = validCustomers
      .map(c => c.total_purchases / c.totalOrders) // 有效消费金额 / 有效订单数量
      .sort((a, b) => b - a);
    
    // 高客：前20%的客单价阈值
    const highValueCount = Math.ceil(avgOrderValues.length * 0.2);
    const highValueIndex = Math.max(0, highValueCount - 1);
    const highValueThreshold = avgOrderValues[highValueIndex] || 1000;
    
    // 低客：后20%的客单价阈值
    const lowValueCount = Math.ceil(avgOrderValues.length * 0.2);
    const lowValueIndex = Math.max(0, avgOrderValues.length - lowValueCount);
    const lowValueThreshold = avgOrderValues[lowValueIndex] || 200;
    
    return {
      vipThreshold,
      fanaticThreshold,
      highValueThreshold,
      lowValueThreshold
    };
  };
  
  const thresholds = calculateThresholds();
  
  // VIP判断（累计消费金额前20%）
  if (customer.total_purchases >= thresholds.vipThreshold) {
    labels.push('VIP');
  }
  
  // 狂热客户判断（购买次数前20%）
  if (customer.totalOrders >= thresholds.fanaticThreshold) {
    labels.push('FANATIC');
  }
  
  // 消费偏好维度判断（基于平均单价）
    if (customer.totalOrders > 0) {
      const avgOrderValue = customer.total_purchases / customer.totalOrders;
      // 允许相同单价有些许偏差，使用大于等于比较
      if (avgOrderValue >= thresholds.highValueThreshold) {
        labels.push('HIGH_VALUE');
      // 允许相同单价有些许偏差，使用小于等于比较
      } else if (avgOrderValue <= thresholds.lowValueThreshold) {
        labels.push('LOW_VALUE');
      }
    }
  
  // 退货行为维度判断
  const calculateRefundThresholds = () => {
    if (allCustomers.length === 0) {
      return { pickyThreshold: 5, assassinThreshold: 30 };
    }
    
    // 计算退货次数前20%的阈值
    const refundCounts = allCustomers
      .map(c => c.refundCount || 0)
      .sort((a, b) => b - a);
    const pickyCount = Math.ceil(refundCounts.length * 0.2);
    const pickyIndex = Math.max(0, pickyCount - 1);
    const pickyThreshold = refundCounts[pickyIndex] || 0;
    
    // 计算退货率前20%的阈值
    const refundRates = allCustomers
      .map(c => c.refundRate || 0)
      .sort((a, b) => b - a);
    const assassinCount = Math.ceil(refundRates.length * 0.2);
    const assassinIndex = Math.max(0, assassinCount - 1);
    const assassinThreshold = refundRates[assassinIndex] || 0;
    
    return { pickyThreshold, assassinThreshold };
  };
  
  const refundThresholds = calculateRefundThresholds();
  
  // 挑剔客户：退货次数前20%，且必须有退货记录
  if ((customer.refundCount || 0) >= refundThresholds.pickyThreshold && (customer.refundCount || 0) > 0) {
    labels.push('PICKY');
  }
  // 刺客客户：退货率前20%，且必须有退货记录
  if ((customer.refundRate || 0) >= refundThresholds.assassinThreshold && (customer.refundRate || 0) > 0) {
    labels.push('ASSASSIN');
  }
  
  return labels;
}

// 测试标签分配
function testLabelDistribution() {
  console.log('=== 客户标签分配测试 ===');
  console.log('总客户数:', customers.length);
  console.log('期望的前20%数量:', Math.ceil(customers.length * 0.2));
  console.log('');
  
  const results = {
    VIP: [],
    FANATIC: [],
    HIGH_VALUE: [],
    LOW_VALUE: [],
    PICKY: [],
    ASSASSIN: []
  };
  
  // 计算每个客户的标签
  customers.forEach(customer => {
    const labels = getCustomerLabels(customer, customers);
    labels.forEach(label => {
      if (results[label]) {
        results[label].push(customer.name);
      }
    });
  });
  
  // 显示结果
  console.log('=== 标签分配结果 ===');
  Object.keys(results).forEach(labelType => {
    const count = results[labelType].length;
    const isCorrect = count === 4;
    const status = isCorrect ? '✅' : '❌';
    
    console.log(`${status} ${labelType}: ${count}/4个`);
    console.log(`   客户: ${results[labelType].join(', ')}`);
    console.log('');
  });
  
  // 验证总体结果
  const allCorrect = Object.values(results).every(list => list.length === 4);
  console.log('=== 总体结果 ===');
  console.log(allCorrect ? '✅ 所有标签都正确分配了4个客户' : '❌ 存在标签分配不正确的情况');
  
  return results;
}

// 运行测试
testLabelDistribution();

// 详细阈值信息
function showThresholds() {
  console.log('\n=== 阈值计算详情 ===');
  
  // VIP阈值
  const total_purchases = customers.map(c => c.total_purchases).sort((a, b) => b - a);
  const vipIndex = Math.ceil(total_purchases.length * 0.2) - 1;
  console.log('VIP阈值 (累计消费前20%):', total_purchases[vipIndex]);
  console.log('前4名消费:', total_purchases.slice(0, 4));
  
  // 狂热客户阈值
  const totalOrders = customers.map(c => c.totalOrders).sort((a, b) => b - a);
  const fanaticIndex = Math.ceil(totalOrders.length * 0.2) - 1;
  console.log('\n狂热客户阈值 (购买次数前20%):', totalOrders[fanaticIndex]);
  console.log('前4名购买次数:', totalOrders.slice(0, 4));
  
  // 高客阈值
  const avgOrderValues = customers
    .map(c => c.totalOrders > 0 ? c.total_purchases / c.totalOrders : 0)
    .sort((a, b) => b - a);
  const highValueIndex = Math.ceil(avgOrderValues.length * 0.2) - 1;
  console.log('\n高客阈值 (客单价前20%):', avgOrderValues[highValueIndex].toFixed(2));
  console.log('前4名客单价:', avgOrderValues.slice(0, 4).map(v => v.toFixed(2)));
  
  // 低客阈值
  const lowValueIndex = avgOrderValues.length - Math.ceil(avgOrderValues.length * 0.2);
  console.log('\n低客阈值 (客单价后20%):', avgOrderValues[lowValueIndex].toFixed(2));
  console.log('后4名客单价:', avgOrderValues.slice(-4).map(v => v.toFixed(2)));
  
  // 挑剔客户阈值
  const refundCounts = customers.map(c => c.refundCount || 0).sort((a, b) => b - a);
  const pickyIndex = Math.ceil(refundCounts.length * 0.2) - 1;
  console.log('\n挑剔客户阈值 (退货次数前20%):', refundCounts[pickyIndex]);
  console.log('前4名退货次数:', refundCounts.slice(0, 4));
  
  // 刺客客户阈值
  const refundRates = customers.map(c => c.refundRate || 0).sort((a, b) => b - a);
  const assassinIndex = Math.ceil(refundRates.length * 0.2) - 1;
  console.log('\n刺客客户阈值 (退货率前20%):', refundRates[assassinIndex]);
  console.log('前4名退货率:', refundRates.slice(0, 4));
}

showThresholds();