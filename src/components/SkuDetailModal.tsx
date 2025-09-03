import { useState, useEffect } from 'react'
import { 
  X, 
  Package, 
  Eye, 
  History, 
  TrendingUp,
  DollarSign
} from 'lucide-react'
import { 
  SkuItem, 
  MaterialTrace, 
  SkuInventoryLog, 
  SellData, 
  DestroyData, 
  AdjustData,
  SkuPermissions
} from '../types'
import { skuApi, fixImageUrl } from '../services/api'
import Portal from './Portal'
import SkuSellForm from './SkuSellForm'
import SkuDestroyForm from './SkuDestroyForm'
import SkuAdjustForm from './SkuAdjustForm'
import SkuTraceView from './SkuTraceView'
import SkuHistoryView from './SkuHistoryView'

interface SkuDetailModalProps {
  skuId: string | null
  isOpen: boolean
  onClose: () => void
  mode: 'view' | 'sell' | 'destroy' | 'adjust'
  permissions: SkuPermissions
  onSell?: (skuId: string, data: SellData) => void
  onDestroy?: (skuId: string, data: DestroyData) => void
  onAdjust?: (skuId: string, data: AdjustData) => void
}

interface SkuDetailState {
  sku: SkuItem | null
  materialTraces: MaterialTrace[]
  purchaseList: any[]
  inventoryLogs: SkuInventoryLog[]
  loading: boolean
  error: string | null
  activeTab: 'info' | 'trace' | 'history'
  historyPagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export default function SkuDetailModal({
  skuId,
  isOpen,
  onClose,
  mode,
  permissions,
  onSell,
  onDestroy,
  onAdjust
}: SkuDetailModalProps) {
  const [state, setState] = useState<SkuDetailState>({
    sku: null,
    materialTraces: [],
    purchaseList: [],
    inventoryLogs: [],
    loading: false,
    error: null,
    activeTab: 'info',
    historyPagination: {
      page: 1,
      limit: 10,
      total: 0,
      total_pages: 0
    }
  })

  // 格式化价格
  const formatPrice = (price?: number) => {
    if (!price) return '-'
    return `¥${price.toFixed(2)}`
  }
  
  // 格式化利润率
  const formatProfitMargin = (margin?: number) => {
    if (!margin) return '-'
    return `${margin.toFixed(1)}%`
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 获取第一张图片URL
  const getFirstPhotoUrl = (photos: any): string | null => {
    if (!photos) return null
    
    let photoArray: string[] = []
    
    if (typeof photos === 'string') {
      if (photos.startsWith('http')) {
        return fixImageUrl(photos)
      }
      try {
        const parsed = JSON.parse(photos)
        if (Array.isArray(parsed)) {
          photoArray = parsed
        } else {
          return typeof parsed === 'string' ? fixImageUrl(parsed) : null
        }
      } catch (e) {
        return photos.trim() ? fixImageUrl(photos) : null
      }
    } else if (Array.isArray(photos)) {
      photoArray = photos
    } else {
      return null
    }
    
    for (const photo of photoArray) {
      if (photo && typeof photo === 'string' && photo.trim()) {
        return fixImageUrl(photo)
      }
    }
    
    return null
  }

  // 获取SKU详情
  const fetchSkuDetail = async () => {
    if (!skuId) return
    
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await skuApi.get(skuId)
      
      if (response.success && response.data) {
        setState(prev => ({ ...prev, sku: response.data as SkuItem }))
      } else {
        setState(prev => ({ ...prev, error: response.message || 'SKU详情获取失败' }))
      }
    } catch (error) {
      console.error('获取SKU详情失败:', error)
      setState(prev => ({ ...prev, error: '获取SKU详情失败，请重试' }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  // 获取SKU操作历史
  const fetchSkuHistory = async (page: number = 1) => {
    if (!skuId) return
    
    try {
      const response = await skuApi.getHistory(skuId, {
        page,
        limit: state.historyPagination.limit
      })
      
      if (response.success && response.data) {
        const data = response.data
        setState(prev => ({
          ...prev,
          inventoryLogs: (data as any).logs || [],
          historyPagination: {
            ...prev.historyPagination,
            page: (data as any).pagination?.page || 1,
            total: (data as any).pagination?.total || 0,
            total_pages: (data as any).pagination?.total_pages || 0
          }
        }))
      }
    } catch (error) {
      console.error('获取SKU历史失败:', error)
    }
  }

  // 处理标签页切换
  const handleTabChange = (tab: 'info' | 'trace' | 'history') => {
    setState(prev => ({ ...prev, activeTab: tab }))
    
    // 如果切换到历史标签页，加载历史数据
    if (tab === 'history' && state.inventoryLogs.length === 0) {
      fetchSkuHistory()
    }
  }

  // 处理历史分页
  // const handleHistoryPageChange = (page: number) => {
  //   fetchSkuHistory(page)
  // }

  // 当skuId变化时重新加载数据
  useEffect(() => {
    if (isOpen && skuId) {
      fetchSkuDetail()
      // 重置状态
      setState(prev => ({
        ...prev,
        activeTab: 'info',
        inventoryLogs: [],
        historyPagination: {
          page: 1,
          limit: 10,
          total: 0,
          total_pages: 0
        }
      }))
    }
  }, [isOpen, skuId])

  if (!isOpen) return null

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'view' && 'SKU详情'}
              {mode === 'sell' && 'SKU销售确认'}
              {mode === 'destroy' && 'SKU销毁操作'}
              {mode === 'adjust' && 'SKU库存调整'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {state.loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-3 text-gray-600">加载中...</span>
              </div>
            )}

            {state.error && (
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <X className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-700">{state.error}</span>
                  </div>
                </div>
              </div>
            )}

            {!state.loading && !state.error && state.sku && (
              <div className="p-6">
                {/* SKU基本信息卡片 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-4">
                    {/* SKU图片 */}
                    <div className="flex-shrink-0">
                      {getFirstPhotoUrl(state.sku.photos) ? (
                        <img
                          src={getFirstPhotoUrl(state.sku.photos)!}
                          alt={state.sku.sku_name}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* SKU基本信息 */}
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {state.sku.sku_name}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">SKU编号:</span>
                          <div className="font-medium">{state.sku.sku_code || state.sku.sku_number}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">规格:</span>
                          <div className="font-medium">{state.sku.specification ? (String(state.sku.specification).includes('mm') ? String(state.sku.specification) : `${state.sku.specification}mm`) : '未设置'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">总数量:</span>
                          <div className="font-medium">{state.sku.total_quantity} 件</div>
                        </div>
                        <div>
                          <span className="text-gray-600">可售数量:</span>
                          <div className="font-medium text-green-600">{state.sku.available_quantity} 件</div>
                        </div>
                        <div>
                          <span className="text-gray-600">状态:</span>
                          <div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              state.sku.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {state.sku.status === 'ACTIVE' ? '活跃' : '停用'}
                            </span>
                          </div>
                        </div>
                        
                        {/* 价格信息（仅BOSS可见） */}
                        {permissions.canViewPrice && (
                          <>
                            <div>
                              <span className="text-gray-600">单价:</span>
                              <div className="font-medium">{formatPrice(state.sku.selling_price || state.sku.unit_price)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">总价值:</span>
                              <div className="font-medium">{formatPrice(state.sku.total_value || state.sku.total_cost)}</div>
                            </div>
                            {state.sku.profit_margin && (
                              <div>
                                <span className="text-gray-600">利润率:</span>
                                <div className="font-medium text-blue-600">{formatProfitMargin(state.sku.profit_margin)}</div>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-600">创建时间:</span>
                              <div className="font-medium">{formatDate(state.sku.created_at)}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 根据模式显示不同内容 */}
                {mode === 'view' && (
                  <div>
                    {/* 标签页导航 */}
                    <div className="border-b border-gray-200 mb-6">
                      <nav className="-mb-px flex space-x-8">
                        <button
                          onClick={() => handleTabChange('info')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            state.activeTab === 'info'
                              ? 'border-gray-900 text-gray-900'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <Eye className="h-4 w-4 inline mr-2" />
                          详细信息
                        </button>
                        
                        {permissions.canViewTrace && (
                          <button
                            onClick={() => handleTabChange('trace')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                              state.activeTab === 'trace'
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <TrendingUp className="h-4 w-4 inline mr-2" />
                            溯源信息
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleTabChange('history')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            state.activeTab === 'history'
                              ? 'border-gray-900 text-gray-900'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <History className="h-4 w-4 inline mr-2" />
                          操作历史
                        </button>
                      </nav>
                    </div>

                    {/* 标签页内容 */}
                    {state.activeTab === 'info' && (
                      <div className="space-y-6">
                        {/* 成本信息（仅BOSS可见） */}
                        {permissions.canViewPrice && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                              <DollarSign className="h-4 w-4 mr-2" />
                              成本分析
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">材料成本:</span>
                                <div className="font-medium">{formatPrice(state.sku.material_cost || 0)}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">人工成本:</span>
                                <div className="font-medium">{formatPrice(state.sku.labor_cost || 0)}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">工艺成本:</span>
                                <div className="font-medium">{formatPrice(state.sku.craft_cost || 0)}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">总成本:</span>
                                <div className="font-medium text-red-600">{formatPrice(state.sku.total_cost || 0)}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 描述信息 */}
                        {state.sku.description && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">描述信息</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                              {state.sku.description}
                            </p>
                          </div>
                        )}


                      </div>
                    )}

                    {state.activeTab === 'trace' && permissions.canViewTrace && state.sku && (
                      <SkuTraceView
                        sku={state.sku}
                        loading={false}
                      />
                    )}

                    {state.activeTab === 'history' && (
                      <SkuHistoryView
                        sku={state.sku}
                        loading={false}
                      />
                    )}
                  </div>
                )}

                {mode === 'sell' && onSell && (
                  <SkuSellForm
                    sku={state.sku}
                    onSubmit={(data) => onSell(state.sku!.id, data)}
                    onCancel={onClose}
                  />
                )}

                {mode === 'destroy' && onDestroy && (
                  <SkuDestroyForm
                    sku={state.sku}
                    onSubmit={(data) => onDestroy(state.sku!.id, data)}
                    onCancel={onClose}
                  />
                )}

                {mode === 'adjust' && onAdjust && (
                  <SkuAdjustForm
                    sku={state.sku}
                    onSubmit={(data) => onAdjust(state.sku!.id, data)}
                    onCancel={onClose}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}