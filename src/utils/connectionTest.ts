// API连接测试工具
import { getCurrentAccessIP, getLocalIP, getBestAPIBaseURL, checkAPIConnection, getDeviceType } from './networkUtils';

/**
 * 全面的网络连接测试
 */
export async function runConnectionTest() {
  console.log('🔍 开始网络连接测试...');
  
  // 1. 获取IP地址信息
  const currentIP = getCurrentAccessIP();
  const webrtcIP = await getLocalIP();
  
  console.log(`📍 当前访问IP: ${currentIP}`);
  console.log(`📍 WebRTC检测IP: ${webrtcIP}`);
  
  // 2. 根据设备类型确定测试策略
  const deviceType = getDeviceType();
  console.log(`📱 设备类型: ${deviceType}`);
  
  let testUrls: string[] = [];
  
  if (deviceType === 'mobile') {
    // 手机端：只测试有效的IP地址，跳过localhost
    testUrls = [
      currentIP !== 'localhost' ? `http://${currentIP}:3001` : null,
      webrtcIP !== 'localhost' && webrtcIP !== currentIP ? `http://${webrtcIP}:3001` : null,
      'http://192.168.50.160:3001' // 用户当前访问的IP
    ].filter(Boolean) as string[];
    console.log('📱 手机端测试策略：跳过localhost，只测试局域网IP');
  } else {
    // 桌面端：测试所有地址
    testUrls = [
      `http://${currentIP}:3001`,
      `http://${webrtcIP}:3001`,
      'http://localhost:3001',
      'http://192.168.50.160:3001' // 用户当前访问的IP
    ];
    console.log('🖥️ 桌面端测试策略：测试所有API地址');
  }
  
  // 去重
  testUrls = testUrls.filter((url, index, arr) => arr.indexOf(url) === index);
  
  console.log('🧪 测试API连接...');
  for (const url of testUrls) {
    try {
      const isConnected = await checkAPIConnection(url);
      console.log(`${isConnected ? '✅' : '❌'} ${url}: ${isConnected ? '连接成功' : '连接失败'}`);
    } catch (error) {
      console.log(`❌ ${url}: 连接异常 -`, error);
    }
  }
  
  // 3. 获取最佳API地址
  const bestAPI = await getBestAPIBaseURL();
  console.log(`🎯 最佳API地址: ${bestAPI}`);
  
  // 4. 测试实际API调用
  try {
    const response = await fetch(`${bestAPI.replace('/api', '')}/health`);
    const data = await response.json();
    console.log('✅ API健康检查成功:', data);
  } catch (error) {
    console.log('❌ API健康检查失败:', error);
  }
  
  console.log('🏁 网络连接测试完成');
}

/**
 * 快速连接测试（用于调试）
 */
export async function quickTest() {
  const currentIP = getCurrentAccessIP();
  const deviceType = getDeviceType();
  const bestAPI = await getBestAPIBaseURL();
  
  return {
    currentIP,
    deviceType,
    bestAPI,
    isCurrentIPUsed: bestAPI.includes(currentIP),
    shouldSkipLocalhost: deviceType === 'mobile'
  };
}