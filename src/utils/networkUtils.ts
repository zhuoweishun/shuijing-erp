// 网络工具类 - 用于检测IP地址和网络连接

/**
 * 获取当前页面访问使用的IP地址
 */
export function getCurrentAccessIP(): string {
  try {
    // 从当前页面URL获取主机名
    const hostname = window.location.hostname;
    
    // 如果是IP地址格式，直接返回
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return hostname;
    }
    
    // 如果是localhost或域名，返回localhost
    return 'localhost';
  } catch (error) {
    console.warn('获取当前访问IP失败:', error);
    return 'localhost';
  }
}

/**
 * 获取当前设备的本地IP地址（通过WebRTC）
 */
export async function getLocalIP(): Promise<string> {
  try {
    // 首先尝试获取当前访问的IP
    const currentIP = getCurrentAccessIP();
    if (currentIP !== 'localhost') {
      return currentIP;
    }
    
    // 创建一个RTCPeerConnection来获取本地IP
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    // 创建一个数据通道
    pc.createDataChannel('');
    
    // 创建offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    return new Promise((resolve) => {
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/);
          
          if (ipMatch && ipMatch[1]) {
            const ip = ipMatch[1];
            // 过滤掉本地回环地址和链路本地地址
            if (!ip.startsWith('127.') && !ip.startsWith('169.254.') && !ip.startsWith('::1')) {
              pc.close();
              resolve(ip);
            }
          }
        }
      };
      
      // 超时处理
      setTimeout(() => {
        pc.close();
        resolve('localhost'); // 回退到localhost
      }, 3000);
    });
  } catch (error) {
    console.warn('获取本地IP失败:', error);
    return 'localhost';
  }
}

/**
 * 检测API服务器是否可访问
 */
export async function checkAPIConnection(baseUrl: string): Promise<boolean> {
  const maxRetries = 3;
  const retryDelay = 1000; // 1秒
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 API连接测试 (尝试 ${attempt}/${maxRetries}): ${baseUrl}`);
      
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 增加超时时间到8秒
      
      // 尝试多个端点进行连接测试
      const testEndpoints = ['/api/health', '/health', '/api', '/'];
      
      for (const endpoint of testEndpoints) {
        try {
          const testUrl = baseUrl.endsWith('/api') ? baseUrl.replace('/api', endpoint) : `${baseUrl}${endpoint}`;
          console.log(`🧪 测试端点: ${testUrl}`);
          
          // 使用简化的CORS请求
          try {
            const response = await fetch(testUrl, {
              method: 'GET',
              signal: controller.signal,
              mode: 'cors',
              cache: 'no-cache',
              credentials: 'include',
              headers: {
                'Accept': 'application/json, text/plain, */*'
              }
            });
            
            // 检查响应状态
            if (response.ok || response.status === 200) {
              clearTimeout(timeoutId);
              console.log(`✅ API服务器连接成功: ${testUrl}`);
              return true;
            } else if (response.status === 404 && endpoint === '/') {
              // 404对于根路径是正常的，说明服务器在运行
              clearTimeout(timeoutId);
              console.log(`✅ API服务器运行中: ${testUrl} (状态: ${response.status})`);
              return true;
            } else {
              console.log(`⚠️ 响应状态: ${response.status} - ${testUrl}`);
            }
          } catch (fetchError: any) {
            // 如果是CORS错误但服务器响应了，说明服务器存在
            if (fetchError.name === 'TypeError' && fetchError.message.includes('CORS')) {
              clearTimeout(timeoutId);
              console.log(`✅ API服务器存在但有CORS限制: ${testUrl}`);
              return true;
            }
            console.log(`❌ 请求失败:`, fetchError.message);
          }
        } catch (endpointError: any) {
          console.log(`❌ 端点测试失败: ${endpoint}`, {
            name: endpointError.name,
            message: endpointError.message,
            type: typeof endpointError
          });
          
          // 如果是网络错误但包含特定信息，可能服务器存在
          if (endpointError.name === 'TypeError' && 
              (endpointError.message.includes('Failed to fetch') || 
               endpointError.message.includes('CORS') ||
               endpointError.message.includes('Network request failed'))) {
            console.log(`⚠️ 网络错误可能表示服务器存在: ${endpoint}`);
          }
          continue;
        }
      }
      
      clearTimeout(timeoutId);
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        console.log(`⏳ 等待 ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
    } catch (error: any) {
      console.warn(`API连接检测失败 (${baseUrl}) - 尝试 ${attempt}:`, {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n')[0] // 只显示第一行堆栈
      });
      
      // 如果是最后一次尝试，返回false
      if (attempt === maxRetries) {
        return false;
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  console.log(`❌ API连接测试最终失败: ${baseUrl}`);
  return false;
}

/**
 * 获取最佳的API基础URL
 */
export async function getBestAPIBaseURL(): Promise<string> {
  const port = '3001';
  const deviceType = getDeviceType();
  
  // 获取当前访问的IP地址
  const currentIP = getCurrentAccessIP();
  const webrtcIP = await getLocalIP();
  
  console.log(`🔍 设备类型: ${deviceType}`);
  console.log(`🔍 当前访问IP: ${currentIP}`);
  console.log(`🔍 WebRTC检测IP: ${webrtcIP}`);
  
  let candidates: string[] = [];
  
  if (deviceType === 'mobile') {
    // 手机端：强制优先使用当前访问IP，完全跳过localhost和环境变量
    if (currentIP !== 'localhost') {
      // 如果有当前访问IP，直接使用它
      const primaryAPI = `http://${currentIP}:${port}/api`;
      console.log('📱 手机端强制使用当前访问IP:', primaryAPI);
      return primaryAPI;
    } else if (webrtcIP !== 'localhost') {
      // 如果没有当前访问IP但有WebRTC IP，使用WebRTC IP
      const fallbackAPI = `http://${webrtcIP}:${port}/api`;
      console.log('📱 手机端使用WebRTC检测IP:', fallbackAPI);
      return fallbackAPI;
    } else {
      // 最后的备选方案
      const lastResort = 'http://192.168.50.160:3001/api';
      console.log('📱 手机端使用备选IP:', lastResort);
      return lastResort;
    }
  } else {
    // 桌面端：保持原有策略，包含连接测试
    candidates = [
      import.meta.env.VITE_API_URL,
      currentIP !== 'localhost' ? `http://${currentIP}:${port}/api` : null,
      webrtcIP !== 'localhost' && webrtcIP !== currentIP ? `http://${webrtcIP}:${port}/api` : null,
      `http://localhost:${port}/api`
    ].filter(Boolean) as string[];
    console.log('🖥️ 桌面端API选择策略：包含localhost作为备选');
    
    console.log(`🔍 候选API地址:`, candidates);
    
    // 测试每个候选URL
    for (const url of candidates) {
      const baseUrl = url.replace('/api', '');
      console.log(`🧪 测试API连接: ${baseUrl}`);
      if (await checkAPIConnection(baseUrl)) {
        console.log(`✅ 使用API地址: ${url}`);
        return url;
      } else {
        console.log(`❌ API连接失败: ${baseUrl}`);
      }
    }
    
    // 桌面端默认回退到localhost
    const fallback = `http://localhost:${port}/api`;
    console.warn(`⚠️ 所有API地址都不可用，使用默认地址: ${fallback}`);
    return fallback;
  }
}

/**
 * 检测当前设备类型
 */
export function getDeviceType(): 'mobile' | 'desktop' {
  // 多重检测方法确保准确性
  const userAgent = navigator.userAgent.toLowerCase();
  
  // 检测移动设备User-Agent
  const mobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|phone|tablet/i.test(userAgent);
  
  // 检测触摸屏支持
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // 检测屏幕尺寸（移动设备通常屏幕较小）
  const smallScreen = window.screen.width <= 768 || window.innerWidth <= 768;
  
  // 检测设备方向API（移动设备特有）
  const hasOrientationAPI = 'orientation' in window;
  
  // 综合判断
  const isMobile = mobileUserAgent || (hasTouchScreen && smallScreen) || hasOrientationAPI;
  
  console.log(`📱 设备检测详情:`, {
    userAgent: userAgent,
    mobileUserAgent,
    hasTouchScreen,
    smallScreen,
    hasOrientationAPI,
    screenWidth: window.screen.width,
    innerWidth: window.innerWidth,
    result: isMobile ? 'mobile' : 'desktop'
  });
  
  return isMobile ? 'mobile' : 'desktop';
}

/**
 * 获取网络状态信息
 */
export function getNetworkInfo() {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  // 尝试检测连接类型（WiFi vs 移动数据）
  let connectionType = 'unknown';
  
  if (connection) {
    // 根据网络速度和延迟推断连接类型
    const downlink = connection.downlink || 0;
    const rtt = connection.rtt || 0;
    const effectiveType = connection.effectiveType || 'unknown';
    
    // 改进的WiFi检测逻辑
    // 1. 首先检查是否为桌面设备（桌面设备通常使用WiFi或有线连接）
    const deviceType = getDeviceType();
    
    if (deviceType === 'desktop') {
      // 桌面设备默认认为是WiFi或有线连接
      connectionType = 'wifi';
    } else {
      // 移动设备需要更精确的判断
      // WiFi通常有更高的带宽和更低的延迟
      if (downlink >= 5 && rtt <= 150) {
        connectionType = 'wifi';
      } else if (effectiveType === '4g' && downlink < 5) {
        connectionType = 'cellular';
      } else if (effectiveType === '3g' || effectiveType === '2g' || effectiveType === 'slow-2g') {
        connectionType = 'cellular';
      } else if (downlink >= 10) {
        // 高带宽通常表示WiFi连接
        connectionType = 'wifi';
      } else {
        // 默认假设是WiFi（更保守的策略）
        connectionType = 'wifi';
      }
    }
    
    console.log(`🌐 网络检测详情:`, {
      deviceType,
      effectiveType,
      downlink,
      rtt,
      推断类型: connectionType,
      判断依据: deviceType === 'desktop' ? '桌面设备默认WiFi' : `带宽${downlink}Mbps, 延迟${rtt}ms`
    });
  } else {
    // 没有网络连接API时，根据设备类型推断
    const deviceType = getDeviceType();
    connectionType = deviceType === 'desktop' ? 'wifi' : 'unknown';
    console.log(`🌐 网络API不可用，根据设备类型推断: ${connectionType}`);
  }
  
  return {
    online: navigator.onLine,
    effectiveType: connection?.effectiveType || 'unknown',
    connectionType, // 新增：连接类型（wifi/cellular/unknown）
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0
  };
}