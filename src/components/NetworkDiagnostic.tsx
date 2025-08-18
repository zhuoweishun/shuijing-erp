import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Smartphone, Monitor, AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { getLocalIP, getCurrentAccessIP, checkAPIConnection, getDeviceType, getNetworkInfo, getBestAPIBaseURL } from '../utils/networkUtils';
import { getAPIBaseURL, refreshAPIAddress } from '../lib/apiService';
import ConnectionTestButton from './ConnectionTestButton';

interface DiagnosticResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function NetworkDiagnostic() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [localIP, setLocalIP] = useState<string>('');
  const [currentIP, setCurrentIP] = useState<string>('');
  const [deviceType, setDeviceType] = useState<string>('');

  useEffect(() => {
    // 初始化设备信息
    setDeviceType(getDeviceType());
    setCurrentIP(getCurrentAccessIP());
    getLocalIP().then(setLocalIP);
  }, []);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);

    const steps: DiagnosticResult[] = [
      { step: '检测设备类型', status: 'pending', message: '正在检测...' },
      { step: '检测网络状态', status: 'pending', message: '正在检测...' },
      { step: '获取当前访问IP', status: 'pending', message: '正在检测...' },
      { step: '获取WebRTC检测IP', status: 'pending', message: '正在检测...' },
      { step: '检测API服务器连接', status: 'pending', message: '正在检测...' },
      { step: '测试最佳API地址', status: 'pending', message: '正在检测...' }
    ];

    setResults([...steps]);

    try {
      // 步骤1：检测设备类型
      const device = getDeviceType();
      steps[0] = {
        step: '检测设备类型',
        status: 'success',
        message: `设备类型：${device === 'mobile' ? '移动设备' : '桌面设备'}`,
        details: device === 'mobile' ? '移动设备需要使用电脑的IP地址访问API' : '桌面设备可以使用localhost访问API'
      };
      setResults([...steps]);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 步骤2：检测网络状态
      const networkInfo = getNetworkInfo();
      const connectionTypeText = networkInfo.connectionType === 'wifi' ? 'WiFi' : 
                                networkInfo.connectionType === 'cellular' ? '移动数据' : '未知';
      steps[1] = {
        step: '检测网络状态',
        status: networkInfo.online ? 'success' : 'error',
        message: networkInfo.online ? `网络连接正常 (${connectionTypeText})` : '网络连接异常',
        details: `网络类型：${networkInfo.effectiveType}，连接方式：${connectionTypeText}，带宽：${networkInfo.downlink}Mbps，延迟：${networkInfo.rtt}ms`
      };
      setResults([...steps]);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 步骤3：获取当前访问IP
      const accessIP = getCurrentAccessIP();
      steps[2] = {
        step: '获取当前访问IP',
        status: accessIP !== 'localhost' ? 'success' : 'error',
        message: `当前访问IP：${accessIP}`,
        details: accessIP === 'localhost' ? '当前使用localhost访问' : '当前使用IP地址访问，适合移动设备'
      };
      setResults([...steps]);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 步骤4：获取WebRTC检测IP
      const webrtcIP = await getLocalIP();
      steps[3] = {
        step: '获取WebRTC检测IP',
        status: webrtcIP !== 'localhost' ? 'success' : 'error',
        message: `WebRTC检测IP：${webrtcIP}`,
        details: webrtcIP === 'localhost' ? '无法通过WebRTC获取IP地址' : accessIP === webrtcIP ? '与当前访问IP一致' : '检测到不同的网络接口IP'
      };
      setResults([...steps]);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 步骤5：检测API服务器连接
      const currentAPI = getAPIBaseURL();
      const baseUrl = currentAPI.replace('/api', '');
      const apiConnected = await checkAPIConnection(baseUrl);
      steps[4] = {
        step: '检测API服务器连接',
        status: apiConnected ? 'success' : 'error',
        message: apiConnected ? 'API服务器连接正常' : 'API服务器连接失败',
        details: `当前API地址：${currentAPI}`
      };
      setResults([...steps]);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 步骤6：刷新并测试最佳API地址
      const refreshedAPI = await refreshAPIAddress();
      const refreshedConnected = await checkAPIConnection(refreshedAPI.replace('/api', ''));
      steps[5] = {
        step: '刷新并测试最佳API地址',
        status: refreshedConnected ? 'success' : 'error',
        message: refreshedConnected ? '已找到并验证最佳API地址' : 'API地址刷新后仍无法连接',
        details: `刷新后API地址：${refreshedAPI}`
      };
      setResults([...steps]);

    } catch (error) {
      console.error('诊断过程出错:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getMobileAccessInstructions = () => {
    const displayIP = currentIP !== 'localhost' ? currentIP : localIP;
    
    if (!displayIP || displayIP === 'localhost') {
      return (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">📱 手机端访问说明</h4>
          <p className="text-sm text-yellow-700 mb-2">
            无法自动获取IP地址，请手动获取电脑IP地址：
          </p>
          <ol className="text-sm text-yellow-700 space-y-1 ml-4">
            <li>1. 按 Windows + R，输入 cmd</li>
            <li>2. 输入 ipconfig，查看IPv4地址</li>
            <li>3. 使用 http://您的IP:5173 访问</li>
          </ol>
        </div>
      );
    }

    return (
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-medium text-green-800 mb-2">📱 手机端访问地址</h4>
        <p className="text-sm text-green-700 mb-2">
          请在手机浏览器中访问：
        </p>
        <div className="bg-white p-2 rounded border font-mono text-sm">
          http://{displayIP}:5173
        </div>
        <p className="text-xs text-green-600 mt-2">
          确保手机和电脑在同一WiFi网络下
        </p>
        {currentIP !== 'localhost' && (
          <p className="text-xs text-blue-600 mt-1">
            ✅ 当前正在使用此IP地址访问
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors z-50"
        title="网络诊断"
      >
        {deviceType === 'mobile' ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  网络诊断
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  {deviceType === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                  当前设备：{deviceType === 'mobile' ? '移动设备' : '桌面设备'}
                </div>
                {currentIP && (
                  <div className="text-sm text-gray-600">
                    当前访问IP：{currentIP}
                  </div>
                )}
                {localIP && localIP !== currentIP && (
                  <div className="text-sm text-gray-500">
                    WebRTC检测IP：{localIP}
                  </div>
                )}
                <div className="text-sm text-gray-500 mt-1">
                  网络状态：{getNetworkInfo().connectionType === 'wifi' ? '🔗 WiFi连接' : 
                           getNetworkInfo().connectionType === 'cellular' ? '📱 移动数据' : '❓ 未知连接'}
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  当前API地址：{getAPIBaseURL()}
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={runDiagnostic}
                  disabled={isRunning}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {isRunning ? '诊断中...' : '开始诊断'}
                </button>
                <button
                  onClick={async () => {
                    console.log('🔄 手动刷新API地址...');
                    await refreshAPIAddress();
                    // 刷新当前显示的IP信息
                    setCurrentIP(getCurrentAccessIP());
                    const newLocalIP = await getLocalIP();
                    setLocalIP(newLocalIP);
                  }}
                  disabled={isRunning}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 px-3 rounded-lg transition-colors"
                  title="刷新API地址"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {results.length > 0 && (
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{result.step}</div>
                        <div className="text-sm text-gray-600">{result.message}</div>
                        {result.details && (
                          <div className="text-xs text-gray-500 mt-1">{result.details}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deviceType === 'mobile' && getMobileAccessInstructions()}
              
              {/* 连接测试区域 */}
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  API连接测试
                </h4>
                <div className="space-y-2">
                  {currentIP !== 'localhost' && (
                    <ConnectionTestButton 
                      ip={currentIP} 
                      label="当前访问IP" 
                    />
                  )}
                  {localIP && localIP !== 'localhost' && localIP !== currentIP && (
                    <ConnectionTestButton 
                      ip={localIP} 
                      label="WebRTC检测IP" 
                    />
                  )}
                  {/* 只在桌面端显示localhost测试 */}
                  {deviceType !== 'mobile' && (
                    <ConnectionTestButton 
                      ip="localhost" 
                      label="本地回环地址" 
                    />
                  )}
                  {deviceType === 'mobile' && (
                    <div className="text-xs text-gray-500 p-2 bg-blue-50 rounded">
                      💡 手机端已跳过localhost测试（无法访问）
                    </div>
                  )}
                </div>
              </div>
              
              {/* 调试信息 */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">🔍 调试信息</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>User-Agent: {navigator.userAgent.slice(0, 60)}...</div>
                  <div>屏幕尺寸: {window.screen.width}x{window.screen.height}</div>
                  <div>窗口尺寸: {window.innerWidth}x{window.innerHeight}</div>
                  <div>触摸支持: {('ontouchstart' in window) ? '是' : '否'}</div>
                  <div>方向API: {('orientation' in window) ? '是' : '否'}</div>
                  <div>最大触摸点: {navigator.maxTouchPoints}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}