import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Filter, Plus, ArrowLeft, Edit, Trash2, Eye, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { storage, Purchase } from '../utils/storage';
import { authService } from '../services/auth';
import { supabase } from '../lib/supabase';


export default function PurchaseList() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [dataSource, setDataSource] = useState<{ source: 'local' | 'cloud', reason: string, user?: string } | null>(null);
  const [userStatus, setUserStatus] = useState<string>('检查中...');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const subscriptionRef = useRef<any>(null);

  // 简化的数据加载
  useEffect(() => {
    const initializeData = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        setUserStatus(`已登录: ${user.username} (${user.role})`);
      } else {
        setUserStatus('未登录');
      }
      
      // 直接加载数据，无延迟
      loadPurchases();
    };
    
    initializeData();
    
    // 检测设备类型
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 移除实时订阅以提升性能



  // 简化的手动刷新
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPurchases();
    setLastSyncTime(new Date());
    setIsRefreshing(false);
  }, []);

  const loadPurchases = async () => {
    try {
      console.log('开始加载采购数据');
      setIsLoading(true);
      setLoadingProgress(0);
      
      // 立即设置进度到50%
      setLoadingProgress(50);
      
      // 直接加载数据，无延迟
      const data = await storage.getPurchases();
      
      // 立即设置进度到100%
      setLoadingProgress(100);
      
      setPurchases(data);
      setDataSource({ source: 'cloud', reason: '数据已加载' });
      
      console.log('✅ 采购数据加载成功，共', data.length, '条记录');
    } catch (error: any) {
      console.error('❌ 加载采购数据失败:', error);
      setPurchases([]);
      setUserStatus('加载失败');
      setLoadingProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  // 移除预加载逻辑以提升性能

  const testSupabaseConnection = async () => {
    try {
      // 测试连接
      const isConnected = await storage.testSupabaseConnection();
      
      if (isConnected) {
        alert('✅ Supabase连接成功！数据将保存到云端数据库。');
        // 重新加载数据
        await loadPurchases();
      } else {
        alert('❌ Supabase连接失败，请检查配置。');
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      alert('❌ 测试连接时发生错误：' + error.message);
    }
  };

  const handleEdit = useCallback((purchase: Purchase) => {
    // 导航到编辑页面，传递数据
    navigate('/purchase/entry', { state: { editData: purchase } });
  }, [navigate]);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('确定要删除这条采购记录吗？')) {
      try {
        console.log('开始删除采购记录:', id);
        const success = await storage.deletePurchase(id);
        console.log('删除结果:', success);
        
        if (success) {
          // 立即从本地状态中移除，避免重新加载
          setPurchases(prev => prev.filter(p => p.id !== id));
          alert('删除成功！');
        } else {
          alert('删除失败，请重试');
        }
      } catch (error) {
        console.error('删除采购记录失败:', error);
        alert('删除失败：' + (error as Error).message);
      }
    }
  }, []);

  const handleView = useCallback((purchase: Purchase) => {
    setSelectedPurchase(purchase);
  }, []);

  const closeDetailModal = useCallback(() => {
    setSelectedPurchase(null);
  }, []);

  const handleImageClick = useCallback((imageUrl: string) => {
    if (enlargedImage === imageUrl) {
      setEnlargedImage(null);
    } else {
      setEnlargedImage(imageUrl);
    }
  }, [enlargedImage]);

  // 延迟加载图片URL获取函数
  const getImageUrl = useCallback((purchase: Purchase) => {
    if (purchase.photos && purchase.photos.length > 0) {
      return purchase.photos[0];
    }
    return null;
  }, []);

  // 使用useMemo优化过滤和计算
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const matchesSearch = purchase.crystalType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterQuality === '' || purchase.quality === filterQuality;
      return matchesSearch && matchesFilter;
    });
  }, [purchases, searchTerm, filterQuality]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  }, []);

  const { totalValue, totalWeight } = useMemo(() => {
    return filteredPurchases.reduce(
      (acc, purchase) => ({
        totalValue: acc.totalValue + purchase.price,
        totalWeight: acc.totalWeight + purchase.weight
      }),
      { totalValue: 0, totalWeight: 0 }
    );
  }, [filteredPurchases]);

  return (
    <div className="bg-gray-50 p-4 min-h-screen">
      <div className={isMobile ? "mx-auto" : "max-w-full mx-auto px-4"}>
        {/* 图片放大查看模态框 */}
        {enlargedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={() => setEnlargedImage(null)}
          >
            <div className="relative max-w-4xl max-h-4xl p-4">
              <img 
                src={enlargedImage} 
                alt="放大查看" 
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setEnlargedImage(null)}
                className="absolute top-2 right-2 bg-white rounded-full p-2 hover:bg-gray-100"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 采购详情查看模态框 */}
        {selectedPurchase && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4"
            onClick={closeDetailModal}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 模态框头部 */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">采购详情</h3>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 模态框内容 */}
              <div className="p-6">
                {/* 产品图片 */}
                {getImageUrl(selectedPurchase) && (
                  <div className="mb-6 text-center">
                    <img 
                      src={getImageUrl(selectedPurchase)!} 
                      alt={selectedPurchase.crystalType}
                      className="max-w-full h-48 object-contain mx-auto rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {/* 详细信息网格 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">水晶类型</label>
                      <p className="text-gray-900 font-medium">{selectedPurchase.crystalType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">供应商</label>
                      <p className="text-gray-900 font-medium">{selectedPurchase.supplier}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">数量</label>
                      <p className="text-gray-900 font-medium">{selectedPurchase.quantity || 1}串</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">尺寸</label>
                      <p className="text-gray-900 font-medium">{selectedPurchase.size ? `${selectedPurchase.size}mm` : '未知'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">重量</label>
                      <p className="text-gray-900 font-medium">{selectedPurchase.weight}g</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">克价</label>
                      <p className="text-gray-900 font-medium">¥{selectedPurchase.unitPrice || '未知'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">总价</label>
                      <p className="text-green-600 font-medium text-lg">¥{selectedPurchase.price}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">单珠价格</label>
                      <p className="text-orange-600 font-medium">
                        {selectedPurchase.beadPrice ? `¥${selectedPurchase.beadPrice.toFixed(2)}` : '未计算'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">估算珠子数量</label>
                      <p className="text-purple-600 font-medium">
                        {selectedPurchase.estimatedBeadCount ? `${selectedPurchase.estimatedBeadCount} 颗` : '未计算'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">品相</label>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        selectedPurchase.quality === 'AA' ? 'bg-purple-100 text-purple-800' :
                        selectedPurchase.quality === 'A' ? 'bg-green-100 text-green-800' :
                        selectedPurchase.quality === 'AB' ? 'bg-blue-100 text-blue-800' :
                        selectedPurchase.quality === 'B' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedPurchase.quality}级
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">采购日期</label>
                      <p className="text-gray-900 font-medium">{formatDate(selectedPurchase.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* 录入信息 */}
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">录入人</label>
                      <p className="text-gray-900 font-medium">
                        {selectedPurchase.createdBy || 
                         selectedPurchase.user_profiles?.full_name || 
                         selectedPurchase.user_profiles?.username || 
                         '未知用户'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">录入时间</label>
                      <p className="text-gray-900 font-medium">
                        {new Date(selectedPurchase.createdAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 自然语言描述 */}
                {selectedPurchase.notes && (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="text-sm font-medium text-gray-500 block mb-2">自然语言描述</label>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedPurchase.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 模态框底部操作按钮 */}
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    closeDetailModal();
                    handleEdit(selectedPurchase);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>编辑</span>
                </button>
                <button
                  onClick={closeDetailModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-white shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 ml-4">采购列表</h1>
          </div>
          <div className="flex items-center space-x-3">
            {/* 同步状态显示 */}
            {lastSyncTime && (
              <div className="text-xs text-gray-500">
                最后同步: {lastSyncTime.toLocaleTimeString()}
              </div>
            )}
            

            
            {/* 手动刷新按钮 */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`px-3 py-2 rounded-lg transition-colors text-sm flex items-center space-x-2 ${
                isRefreshing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
              title="手动刷新数据"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? '刷新中...' : '刷新'}</span>
            </button>
            
            <button
              onClick={testSupabaseConnection}
              className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              测试连接
            </button>
            <button
              onClick={() => navigate('/purchase/entry')}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              <span>新增采购</span>
            </button>
          </div>
        </div>

        {/* 用户状态和数据源信息显示 */}
        <div className="mb-4 space-y-2">
          {/* 用户状态 */}
          <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-sm font-medium text-green-800">
              👤 用户状态: {userStatus}
            </span>
          </div>
          
          {/* 数据源信息 */}
          {dataSource && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-blue-800">
                    数据源: {dataSource.source === 'cloud' ? '☁️ 云端存储' : '💾 本地存储'}
                  </span>
                  <span className="text-xs text-blue-600 ml-2">({dataSource.reason})</span>
                  {dataSource.user && (
                    <span className="text-xs text-blue-600 ml-2">用户: {dataSource.user}</span>
                  )}
                </div>
                <button
                  onClick={testSupabaseConnection}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                >
                  测试连接
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">总记录数</div>
            <div className="text-2xl font-bold text-gray-800">{filteredPurchases.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">总重量</div>
            <div className="text-2xl font-bold text-gray-800">{totalWeight}g</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">总价值</div>
            <div className="text-2xl font-bold text-gray-800">¥{totalValue}</div>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索水晶类型或供应商"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-400 w-4 h-4" />
              <select
                value={filterQuality}
                onChange={(e) => setFilterQuality(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部品质</option>
                <option value="AA">AA级</option>
                <option value="A">A级</option>
                <option value="AB">AB级</option>
                <option value="B">B级</option>
                <option value="C">C级</option>
              </select>
            </div>
          </div>
        </div>

        {/* 加载状态指示器 */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="text-center">
                <div className="text-lg font-medium text-gray-700 mb-2">正在加载采购数据...</div>
                <div className="w-64 bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-500">{loadingProgress}% 完成</div>
              </div>
            </div>
          </div>
        )}

        {/* 采购列表 */}
        {!isLoading && isMobile ? (
          // 移动端卡片布局
          <div className="space-y-4">
            {filteredPurchases.map((purchase) => {
              const imageUrl = getImageUrl(purchase);
              return (
                <div key={purchase.id} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      {/* 缩略图 */}
                      {imageUrl ? (
                        <div 
                          className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer border border-gray-200 flex-shrink-0"
                          onClick={() => handleImageClick(imageUrl)}
                        >
                          <img 
                            src={imageUrl} 
                            alt={purchase.crystalType}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-400 text-xs">无图</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-800">{purchase.crystalType}</h3>
                        <p className="text-sm text-gray-500">{purchase.supplier}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleView(purchase)}
                        className="p-1 text-gray-400 hover:text-blue-500"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(purchase)}
                        className="p-1 text-gray-400 hover:text-blue-500"
                        title={currentUser?.role === 'admin' ? '编辑' : '查看'}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {/* 删除按钮 */}
                      <button 
                        onClick={() => handleDelete(purchase.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* 第一行：基本信息 */}
                  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                    <div>
                      <span className="text-gray-500">数量:</span>
                      <span className="ml-1 font-medium">{purchase.quantity || 1}串</span>
                    </div>
                    <div>
                      <span className="text-gray-500">尺寸:</span>
                      <span className="ml-1 font-medium">{purchase.size ? `${purchase.size}mm` : '未知'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">重量:</span>
                      <span className="ml-1 font-medium">{purchase.weight}g</span>
                    </div>
                    <div>
                      <span className="text-gray-500">克价:</span>
                      <span className="ml-1 font-medium">¥{purchase.unitPrice || '未知'}</span>
                    </div>
                  </div>
                  
                  {/* 第二行：价格和品质信息 */}
                  <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                    <div>
                      <span className="text-gray-500">总价:</span>
                      <span className="ml-1 font-medium">¥{purchase.price}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">单珠价:</span>
                      <span className="ml-1 font-medium text-orange-600">
                        {purchase.beadPrice ? `¥${purchase.beadPrice.toFixed(2)}` : '未计算'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">品质:</span>
                      <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                        purchase.quality === 'AA' ? 'bg-purple-100 text-purple-800' :
                        purchase.quality === 'A' ? 'bg-green-100 text-green-800' :
                        purchase.quality === 'AB' ? 'bg-blue-100 text-blue-800' :
                        purchase.quality === 'B' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {purchase.quality}级
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">日期:</span>
                      <span className="ml-1 font-medium">{formatDate(purchase.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !isLoading ? (
          // 电脑端表格布局
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* 表格头部 */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                <div className="col-span-1">图片</div>
                <div className="col-span-2">产品名称</div>
                <div className="col-span-1">数量</div>
                <div className="col-span-1">尺寸</div>
                <div className="col-span-1">重量</div>
                <div className="col-span-1">克价</div>
                <div className="col-span-1">总价</div>
                <div className="col-span-1">单珠价</div>
                <div className="col-span-1">品相</div>
                <div className="col-span-1">供应商</div>
                <div className="col-span-1">操作</div>
              </div>
            </div>
            
            {/* 表格内容 */}
            <div className="divide-y divide-gray-200">
              {filteredPurchases.map((purchase) => {
                const imageUrl = getImageUrl(purchase);
                return (
                  <div key={purchase.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      {/* 缩略图 */}
                      <div className="col-span-1">
                        {imageUrl ? (
                          <div 
                            className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer border border-gray-200 hover:border-blue-300 transition-colors"
                            onClick={() => handleImageClick(imageUrl)}
                          >
                            <img 
                              src={imageUrl} 
                              alt={purchase.crystalType}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">无图</span>
                          </div>
                        )}
                      </div>
                      
                      {/* 产品名称 */}
                      <div className="col-span-2">
                        <div className="font-medium text-gray-900">{purchase.crystalType}</div>
                        <div className="text-gray-500 text-xs">{formatDate(purchase.createdAt)}</div>
                      </div>
                      
                      {/* 数量 */}
                      <div className="col-span-1">
                        <span className="font-medium">{purchase.quantity || 1}串</span>
                      </div>
                      
                      {/* 尺寸 */}
                      <div className="col-span-1">
                        <span className="font-medium">{purchase.size ? `${purchase.size}mm` : '未知'}</span>
                      </div>
                      
                      {/* 重量 */}
                      <div className="col-span-1">
                        <span className="font-medium">{purchase.weight}g</span>
                      </div>
                      
                      {/* 克价 */}
                      <div className="col-span-1">
                        <span className="font-medium">¥{purchase.unitPrice || '未知'}</span>
                      </div>
                      
                      {/* 总价 */}
                      <div className="col-span-1">
                        <span className="font-medium text-green-600">¥{purchase.price}</span>
                      </div>
                      
                      {/* 单珠价 */}
                      <div className="col-span-1">
                        <span className="font-medium text-orange-600">
                          {purchase.beadPrice ? `¥${purchase.beadPrice.toFixed(2)}` : '未计算'}
                        </span>
                      </div>
                      
                      {/* 品相 */}
                      <div className="col-span-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          purchase.quality === 'AA' ? 'bg-purple-100 text-purple-800' :
                          purchase.quality === 'A' ? 'bg-green-100 text-green-800' :
                          purchase.quality === 'AB' ? 'bg-blue-100 text-blue-800' :
                          purchase.quality === 'B' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {purchase.quality}级
                        </span>
                      </div>
                      
                      {/* 供应商 */}
                      <div className="col-span-1">
                        <span className="font-medium text-gray-700">{purchase.supplier}</span>
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="col-span-1">
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => handleView(purchase)}
                            className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEdit(purchase)}
                            className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(purchase.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {!isLoading && filteredPurchases.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">暂无采购记录</div>
            <button
              onClick={() => navigate('/purchase/entry')}
              className="text-blue-500 hover:text-blue-600"
            >
              立即添加第一条记录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}