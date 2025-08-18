import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { checkAPIConnection } from '../utils/networkUtils';

interface ConnectionTestButtonProps {
  ip: string;
  label: string;
}

export default function ConnectionTestButton({ ip, label }: ConnectionTestButtonProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [lastTest, setLastTest] = useState<string>('');

  const testConnection = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      const baseUrl = `http://${ip}:3001`;
      const success = await checkAPIConnection(baseUrl);
      setResult(success ? 'success' : 'error');
      setLastTest(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('连接测试失败:', error);
      setResult('error');
      setLastTest(new Date().toLocaleTimeString());
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = () => {
    if (testing) {
      return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
    }
    if (result === 'success') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (result === 'error') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  const getStatusText = () => {
    if (testing) return '测试中...';
    if (result === 'success') return '连接成功';
    if (result === 'error') return '连接失败';
    return '未测试';
  };

  const getButtonColor = () => {
    if (result === 'success') return 'bg-green-100 border-green-300 text-green-700';
    if (result === 'error') return 'bg-red-100 border-red-300 text-red-700';
    return 'bg-gray-100 border-gray-300 text-gray-700';
  };

  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium text-sm">{label}</div>
          <div className="text-xs text-gray-500">http://{ip}:3001</div>
        </div>
        <button
          onClick={testConnection}
          disabled={testing}
          className={`px-3 py-1 rounded text-xs border transition-colors ${
            testing ? 'bg-blue-100 border-blue-300 text-blue-700' : getButtonColor()
          }`}
        >
          {testing ? '测试中' : '测试连接'}
        </button>
      </div>
      
      <div className="flex items-center gap-2 text-xs">
        {getStatusIcon()}
        <span className={`${
          result === 'success' ? 'text-green-600' : 
          result === 'error' ? 'text-red-600' : 'text-gray-500'
        }`}>
          {getStatusText()}
        </span>
        {lastTest && (
          <span className="text-gray-400 ml-auto">
            {lastTest}
          </span>
        )}
      </div>
    </div>
  );
}