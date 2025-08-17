import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../utils/storage';
import { authService } from '../services/auth';

export default function Debug() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // 基本功能测试
  const testBasicFunctions = async () => {
    setIsLoading(true);
    addLog('开始基本功能测试...');
    
    try {
      // 测试认证
      const user = await authService.getCurrentUser();
      addLog(`当前用户: ${user ? user.username : '未登录'}`);
      
      // 测试数据连接
      const purchases = await storage.getPurchases();
      addLog(`采购记录数量: ${purchases.length}`);
      
      addLog('✅ 基本功能测试完成');
    } catch (error: any) {
      addLog(`❌ 测试失败: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  // 清理本地数据
  const clearLocalData = () => {
    localStorage.clear();
    sessionStorage.clear();
    addLog('✅ 本地数据已清理');
  };

  // 重新初始化
  const reinitialize = async () => {
    setIsLoading(true);
    addLog('重新初始化系统...');
    
    try {
      clearLocalData();
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.reload();
    } catch (error: any) {
      addLog(`❌ 初始化失败: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">调试工具</h1>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              返回首页
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={testBasicFunctions}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              基本功能测试
            </button>
            
            <button
              onClick={clearLocalData}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              清理本地数据
            </button>
            
            <button
              onClick={reinitialize}
              disabled={isLoading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              重新初始化
            </button>
            
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              清空日志
            </button>
          </div>

          {/* 日志显示 */}
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">等待操作...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}