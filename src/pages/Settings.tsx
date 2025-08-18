import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Upload, Database, User, Bell, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { storage } from '../utils/storage';
import * as XLSX from 'xlsx';
import { getDefaultAIConfig, AIServiceConfig, saveGlobalAIConfig, getGlobalAIConfig } from '../services/aiService';
import { authService } from '../services/auth';

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    autoBackup: true,
    notifications: true,
    darkMode: false,
    language: 'zh-CN'
  });
  // AI配置状态 - 使用豆包AI作为默认值
  const [aiConfig, setAiConfig] = useState<{
    provider: 'doubao' | 'tongyi';
    apiKey?: string;
  }>({
    provider: 'doubao', // 默认使用豆包AI
    apiKey: ''
  });
  const [systemInfo, setSystemInfo] = useState({
    totalRecords: 0,
    dataSize: '0 KB',
    lastBackup: '从未备份'
  });
  const isAdmin = authService.isAdmin();

  useEffect(() => {
    loadSystemInfo();
    loadSettings();
    loadAIConfig(); // 自动加载AI配置
  }, []);

  const loadSystemInfo = async () => {
    try {
      const [purchases, products] = await Promise.all([
        storage.getPurchases(),
        storage.getProducts()
      ]);
      const totalRecords = purchases.length + products.length;
      
      // 估算数据大小
      const dataString = JSON.stringify({ purchases, products });
      const dataSize = (dataString.length / 1024).toFixed(1) + ' KB';
      
      // 获取最后备份时间
      const lastBackup = localStorage.getItem('lastBackupTime') || '从未备份';
      
      setSystemInfo({
        totalRecords,
        dataSize,
        lastBackup: lastBackup === '从未备份' ? lastBackup : new Date(lastBackup).toLocaleString('zh-CN')
      });
    } catch (error) {
      console.error('加载系统信息失败:', error);
    }
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const loadAIConfig = () => {
    try {
      const config = getGlobalAIConfig();
      setAiConfig({
        provider: (config.provider === 'doubao' || config.provider === 'tongyi') ? config.provider : 'doubao',
        apiKey: config.apiKey || ''
      });
    } catch (error) {
      console.error('加载AI配置失败:', error);
      // 如果加载失败，使用默认配置
      setAiConfig({
        provider: 'doubao',
        apiKey: ''
      });
    }
  };

  const handleAIConfigSave = (provider: 'doubao' | 'tongyi', apiKey?: string) => {
    try {
      const newConfig: AIServiceConfig = {
        provider,
        apiKey: apiKey || undefined
      };
      
      setAiConfig(newConfig);
      
      // 使用aiService的保存函数
      saveGlobalAIConfig(newConfig);
      
      toast.success(`AI服务已设置为${provider === 'doubao' ? '豆包AI' : '通义千问'}`);
    } catch (error) {
      console.error('保存AI配置失败:', error);
      toast.error('保存AI配置失败');
    }
  };

  const saveSettings = (newSettings: typeof settings) => {
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
  };

  const handleSettingChange = (key: string, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleExportData = async () => {
    try {
      const [purchases, products] = await Promise.all([
        storage.getPurchases(),
        storage.getProducts()
      ]);
      const data = {
        purchases,
        products,
        exportTime: new Date().toISOString()
      };
      
      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      
      // 处理采购数据
      if (data.purchases && data.purchases.length > 0) {
        const purchaseData = data.purchases.map(purchase => ({
          '供应商': purchase.supplier,
          '水晶类型': purchase.crystalType,
          '重量(克)': purchase.weight,
          '价格(元)': purchase.price,
          '品质': purchase.quality,
          '备注': purchase.notes,
          '创建时间': new Date(purchase.createdAt).toLocaleString('zh-CN')
        }));
        const purchaseSheet = XLSX.utils.json_to_sheet(purchaseData);
        XLSX.utils.book_append_sheet(workbook, purchaseSheet, '采购记录');
      }
      
      // 处理成品数据
      if (data.products && data.products.length > 0) {
        const productData = data.products.map(product => ({
          '产品名称': product.productName,
          '分类': product.category,
          '原材料': product.rawMaterial,
          '重量(克)': product.weight,
          '尺寸': product.size,
          '制作时间(小时)': product.craftTime,
          '成本(元)': product.cost,
          '售价(元)': product.sellingPrice,
          '状态': product.status,
          '描述': product.description,
          '创建时间': new Date(product.createdAt).toLocaleString('zh-CN')
        }));
        const productSheet = XLSX.utils.json_to_sheet(productData);
        XLSX.utils.book_append_sheet(workbook, productSheet, '成品记录');
      }
      
      // 导出Excel文件
      const fileName = `水晶销售数据_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Excel数据导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const importData: { purchases?: any[], products?: any[] } = {};
            
            // 读取采购数据
            if (workbook.SheetNames.includes('采购记录')) {
              const purchaseSheet = workbook.Sheets['采购记录'];
              const purchaseData = XLSX.utils.sheet_to_json(purchaseSheet);
              importData.purchases = purchaseData.map((row: any) => ({
                id: Date.now() + Math.random(),
                supplier: row['供应商'] || '',
                crystalType: row['水晶类型'] || '',
                weight: row['重量(克)'] || '',
                price: row['价格(元)'] || '',
                quality: row['品质'] || '',
                notes: row['备注'] || '',
                photos: [],
                createdAt: new Date().toISOString()
              }));
            }
            
            // 读取成品数据
            if (workbook.SheetNames.includes('成品记录')) {
              const productSheet = workbook.Sheets['成品记录'];
              const productData = XLSX.utils.sheet_to_json(productSheet);
              importData.products = productData.map((row: any) => ({
                id: Date.now() + Math.random(),
                productName: row['产品名称'] || '',
                category: row['分类'] || '',
                rawMaterial: row['原材料'] || '',
                weight: row['重量(克)'] || '',
                size: row['尺寸'] || '',
                craftTime: row['制作时间(小时)'] || '',
                cost: row['成本(元)'] || '',
                sellingPrice: row['售价(元)'] || '',
                status: row['状态'] || '制作中',
                description: row['描述'] || '',
                photos: [],
                createdAt: new Date().toISOString()
              }));
            }
            
            // 注意：当前系统使用本地MySQL数据库
            toast.info('当前系统使用本地MySQL数据库，暂不支持Excel导入功能。\n如需导入数据，请联系管理员通过数据库管理工具操作。');
            await loadSystemInfo();
          } catch (error) {
            console.error('导入失败:', error);
            toast.error('导入失败，请检查Excel文件格式');
          }
        };
        reader.readAsArrayBuffer(file);
      }
    };
    input.click();
  };

  const handleBackupData = async () => {
    try {
      const [purchases, products] = await Promise.all([
        storage.getPurchases(),
        storage.getProducts()
      ]);
      const data = {
        purchases,
        products,
        exportTime: new Date().toISOString()
      };
      localStorage.setItem('dataBackup', JSON.stringify(data));
      localStorage.setItem('lastBackupTime', new Date().toISOString());
      await loadSystemInfo();
      toast.success('数据备份成功！');
    } catch (error) {
      console.error('备份失败:', error);
      toast.error('备份失败，请重试');
    }
  };

  return (
    <div className="bg-gray-50 p-4 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-white shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 ml-4">系统设置</h1>
        </div>

        {/* 数据管理 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <Database className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">数据管理</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-800">导出数据</h3>
                <p className="text-sm text-gray-500">将所有数据导出为Excel文件</p>
              </div>
              <button
                onClick={handleExportData}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>导出</span>
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-800">导入数据</h3>
                <p className="text-sm text-gray-500">从Excel文件导入数据</p>
              </div>
              <button
                onClick={handleImportData}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>导入</span>
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-800">数据备份</h3>
                <p className="text-sm text-gray-500">创建数据备份文件</p>
              </div>
              <button
                onClick={handleBackupData}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 flex items-center space-x-2"
              >
                <Shield className="w-4 h-4" />
                <span>备份</span>
              </button>
            </div>
          </div>
        </div>

        {/* 应用设置 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">应用设置</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">自动备份</h3>
                <p className="text-sm text-gray-500">每日自动备份数据</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoBackup}
                  onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">消息通知</h3>
                <p className="text-sm text-gray-500">接收系统通知</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">深色模式</h3>
                <p className="text-sm text-gray-500">使用深色主题</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">语言设置</h3>
                <p className="text-sm text-gray-500">选择界面语言</p>
              </div>
              <select
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI服务配置 - 仅管理员可见 */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center mb-4">
              <Zap className="w-5 h-5 text-gray-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">AI服务配置</h2>
              <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">管理员专用</span>
            </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800 mb-2">选择AI服务提供商</h3>
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-700">
                  <span className="font-medium">💡 推荐配置：</span>
                  系统已默认选择豆包AI作为推荐的AI服务提供商，提供更准确的智能识别效果。
                </div>
              </div>
              <div className="space-y-2">
                
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="aiProvider"
                    value="doubao"
                    checked={aiConfig.provider === 'doubao'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const apiKey = (document.getElementById('doubaoApiKey') as HTMLInputElement)?.value;
                        handleAIConfigSave('doubao', apiKey);
                      }
                    }}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">豆包AI（推荐）</div>
                    <div className="text-sm text-gray-500">字节跳动AI服务，识别准确率高</div>
                  </div>
                </label>
                
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="aiProvider"
                    value="tongyi"
                    checked={aiConfig.provider === 'tongyi'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const apiKey = (document.getElementById('tongyiApiKey') as HTMLInputElement)?.value;
                        handleAIConfigSave('tongyi', apiKey);
                      }
                    }}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-800">通义千问</div>
                    <div className="text-sm text-gray-500">阿里云AI服务，支持复杂语义理解</div>
                  </div>
                </label>
              </div>
            </div>
            
            {/* API密钥配置 */}
            {true && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-800 mb-2">API密钥配置</h3>
                <div className="space-y-3">
                  {aiConfig.provider === 'doubao' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        豆包AI API密钥
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="password"
                          id="doubaoApiKey"
                          defaultValue={aiConfig.provider === 'doubao' ? aiConfig.apiKey || '' : ''}
                          placeholder="输入豆包AI的API密钥"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => {
                            const apiKey = (document.getElementById('doubaoApiKey') as HTMLInputElement)?.value;
                            handleAIConfigSave('doubao', apiKey);
                          }}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                        >
                          保存
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        获取API密钥：访问 <a href="https://www.volcengine.com/product/doubao" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">豆包AI开放平台</a>
                      </p>
                    </div>
                  )}
                  
                  {aiConfig.provider === 'tongyi' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        通义千问API密钥
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="password"
                          id="tongyiApiKey"
                          defaultValue={aiConfig.provider === 'tongyi' ? aiConfig.apiKey || '' : ''}
                          placeholder="输入通义千问的API密钥"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => {
                            const apiKey = (document.getElementById('tongyiApiKey') as HTMLInputElement)?.value;
                            handleAIConfigSave('tongyi', apiKey);
                          }}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                        >
                          保存
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        获取API密钥：访问 <a href="https://dashscope.aliyun.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">阿里云灵积平台</a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 当前配置状态 */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm">
                <span className="text-gray-600">当前AI服务：</span>
                <span className="font-medium text-gray-800">
                  {aiConfig.provider === 'doubao' ? '豆包AI' : '通义千问'}
                </span>
                {true && (
                  <span className="ml-2">
                    {aiConfig.apiKey ? 
                      <span className="text-green-600">✓ 已配置API密钥</span> : 
                      <span className="text-orange-600">⚠ 未配置API密钥</span>
                    }
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 系统信息 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">系统信息</h2>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">应用版本:</span>
              <span className="text-gray-800">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">最后备份:</span>
              <span className="text-gray-800">{systemInfo.lastBackup}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">数据库大小:</span>
              <span className="text-gray-800">{systemInfo.dataSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">总记录数:</span>
              <span className="text-gray-800">{systemInfo.totalRecords} 条</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}