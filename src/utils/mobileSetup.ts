// 手机端设置工具
import { getLocalIP } from './networkUtils';

/**
 * 生成手机端访问配置
 */
export async function generateMobileConfig() {
  const localIP = await getLocalIP();
  const frontendPort = '5173';
  const apiPort = '3001';
  
  return {
    localIP,
    frontendURL: `http://${localIP}:${frontendPort}`,
    apiURL: `http://${localIP}:${apiPort}/api`,
    qrCodeData: `http://${localIP}:${frontendPort}`,
    instructions: {
      zh: {
        title: '手机端访问设置',
        steps: [
          '确保手机和电脑连接同一WiFi网络',
          `在手机浏览器中访问：http://${localIP}:${frontendPort}`,
          '使用相同的账号密码登录',
          '如果无法访问，请检查电脑防火墙设置'
        ],
        troubleshooting: [
          '如果显示"failed to fetch"，请检查网络连接',
          '如果页面无法加载，请确认IP地址是否正确',
          '如果登录失败，请确认后端服务是否运行',
          '可以尝试关闭Windows防火墙或添加端口例外'
        ]
      }
    }
  };
}

/**
 * 检查手机端访问的前置条件
 */
export async function checkMobilePrerequisites() {
  const results = {
    networkOnline: navigator.onLine,
    localIPAvailable: false,
    apiServerRunning: false,
    frontendServerRunning: false
  };
  
  try {
    // 检查本地IP
    const localIP = await getLocalIP();
    results.localIPAvailable = localIP !== 'localhost';
    
    // 检查API服务器
    try {
      const apiResponse = await fetch(`http://${localIP}:3001/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      results.apiServerRunning = apiResponse.ok;
    } catch {
      results.apiServerRunning = false;
    }
    
    // 检查前端服务器
    try {
      const frontendResponse = await fetch(`http://${localIP}:5173`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      results.frontendServerRunning = frontendResponse.ok;
    } catch {
      results.frontendServerRunning = false;
    }
    
  } catch (error) {
    console.error('检查手机端前置条件失败:', error);
  }
  
  return results;
}

/**
 * 生成Windows防火墙配置命令
 */
export function generateFirewallCommands() {
  return {
    allowPorts: [
      'netsh advfirewall firewall add rule name="ERP Frontend" dir=in action=allow protocol=TCP localport=5173',
      'netsh advfirewall firewall add rule name="ERP Backend" dir=in action=allow protocol=TCP localport=3001'
    ],
    removePorts: [
      'netsh advfirewall firewall delete rule name="ERP Frontend"',
      'netsh advfirewall firewall delete rule name="ERP Backend"'
    ],
    instructions: [
      '以管理员身份打开命令提示符',
      '复制并执行上述命令',
      '重启应用程序',
      '在手机端重新尝试访问'
    ]
  };
}

/**
 * 自动配置环境变量
 */
export async function autoConfigureEnvironment() {
  try {
    const localIP = await getLocalIP();
    
    if (localIP === 'localhost') {
      throw new Error('无法获取本地IP地址');
    }
    
    const config = {
      VITE_API_URL: `http://${localIP}:3001/api`,
      message: `已自动配置API地址为: http://${localIP}:3001/api`,
      frontendURL: `http://${localIP}:5173`,
      instructions: [
        '配置已更新，请重启前端服务器',
        '在手机端使用新的访问地址',
        '如果仍有问题，请检查防火墙设置'
      ]
    };
    
    return config;
  } catch (error) {
    throw new Error(`自动配置失败: ${error.message}`);
  }
}