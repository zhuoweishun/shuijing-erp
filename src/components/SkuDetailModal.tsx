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
import { sku_api, fixImageUrl } from '../services/api'
import SkuSellForm from './SkuSellForm'
import SkuDestroyForm from './SkuDestroyForm'
import SkuAdjustForm from './SkuAdjustForm'
import SkuTraceView from './SkuTraceView'
import SkuHistoryView from './SkuHistoryView'

interface SkuDetailModalProps {
  sku_id: string | null
  is_open: boolean
  onClose: () => void
  mode: 'view' | 'sell' | 'destroy' | 'adjust'
  permissions: SkuPermissions
  onSell?: (sku_id: string, data: SellData) => void
  onDestroy?: (sku_id: string, data: DestroyData) => void
  onAdjust?: (sku_id: string, data: AdjustData) => void
}

interface SkuDetailState {
  sku: SkuItem | null
  material_traces: MaterialTrace[]
  purchaseList: any[]
  inventoryLogs: SkuInventoryLog[]
  loading: boolean
  error: string | null
  active_tab: 'info' | 'trace' | 'history'
  historyPagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export default function SkuDetailModal({
  sku_id,
  is_open,
  onClose,
  mode,
  permissions,
  onSell,
  onDestroy,
  onAdjust
}: SkuDetailModalProps) {
  const [state, setState] = useState<SkuDetailState>({
    sku: null,
    material_traces: [],
    purchaseList: [],
    inventoryLogs: [],
    loading: false,
    error: null,
    active_tab: 'info',
    historyPagination: {
      page: 1,
      limit: 10,
      total: 0,
      total_pages: 0
    }
  })

  // 格式化价格
  const format_price = (price?: number | string) => {
    if (!price) return '-'
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(numPrice)) return '-'
    return `¥${numPrice.toFixed(2)}`
  }
  
  // 格式化利润率
  const formatProfitMargin = (margin?: number | string) => {
    if (!margin) return '-'
    const numMargin = typeof margin === 'string' ? parseFloat(margin) : margin
    if (isNaN(numMargin)) return '-'
    return `${numMargin.toFixed(1)}%`
  }

  // 格式化日期
  const format_date = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 获取第一张图片URL
  const get_first_photo_url = (photos: any): string | null => {
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
    if (!sku_id) return
    
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await sku_api.get(sku_id)
      
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
    if (!sku_id) return
    
    try {
      const response = await sku_api.get_history(sku_id, {
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
    setState(prev => ({ ...prev, active_tab: tab }))
    
    // 如果切换到历史标签页，加载历史数据
    if (tab === 'history' && state.inventoryLogs.length === 0) {
      fetchSkuHistory()
    }
  }

  // 当skuId变化时重新加载数据
  useEffect(() => {
    if (is_open && sku_id) {
      fetchSkuDetail()
      setState(prev => ({
        ...prev,
        active_tab: 'info',
        material_traces: [],
        purchaseList: [],
        inventoryLogs: [],
        historyPagination: {
          page: 1,
          limit: 10,
          total: 0,
          total_pages: 0
        }
      }))
    } else {
      setState(prev => ({
        ...prev,
        sku: null,
        error: null,
        loading: false,
        active_tab: 'info',
        material_traces: [],
        purchaseList: [],
        inventoryLogs: [],
        historyPagination: {
          page: 1,
          limit: 10,
          total: 0,
          total_pages: 0
        }
      }))
    }
  }, [is_open, sku_id])

  if (!is_open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* 弹窗内容 */}
        <div className="inline-block w-full max-w-4xl p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl max-h-[95vh] overflow-y-auto">
          {/* 弹窗头部 */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {mode === 'view' && 'SKU详情'}
              {mode === 'sell' && 'SKU销售确认'}
              {mode === 'destroy' && 'SKU销毁操作'}
              {mode === 'adjust' && 'SKU库存调整'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 内容区域 */}
          {state.loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-3 text-gray-600">加载中...</span>
            </div>
          )}

          {state.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{state.error}</p>
            </div>
          )}

          {state.sku && (
            <div className="space-y-6">
              {/* SKU基本信息卡片 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  {/* SKU图片 */}
                  <div className="flex-shrink-0">
                    <div className="max-w-24 max-h-24 bg-gray-200 rounded-lg overflow-hidden">
                      {get_first_photo_url(state.sku.photos) ? (
                        <img
                          src={get_first_photo_url(state.sku.photos)!}
                          alt={state.sku.sku_name}
                          className="w-auto h-auto max-w-full max-h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.png';
                          }}
                        />
                      ) : (
                        <div className="w-24 h-24 flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
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
                        <span className="text-gray-600">累计制作:</span>
                        <div className="font-medium">{state.sku.total_quantity} 件</div>
                      </div>
                      <div>
                        <span className="text-gray-600">当前库存:</span>
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
                      {permissions.can_view_price && (
                        <>
                          <div>
                            <span className="text-gray-600">单价:</span>
                            <div className="font-medium">{format_price(state.sku.selling_price || state.sku.unit_price)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">总价值:</span>
                            <div className="font-medium">{format_price(state.sku.total_value || state.sku.total_cost)}</div>
                          </div>
                          {state.sku.profit_margin && (
                            <div>
                              <span className="text-gray-600">利润率:</span>
                              <div className="font-medium text-blue-600">{formatProfitMargin(state.sku.profit_margin)}</div>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">创建时间:</span>
                            <div className="font-medium">{format_date(state.sku.created_at)}</div>
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
                          state.active_tab === 'info'
                            ? 'border-gray-900 text-gray-900'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Eye className="h-4 w-4 inline mr-2" />
                        详细信息
                      </button>
                      
                      {permissions.can_view_trace && (
                        <button
                          onClick={() => handleTabChange('trace')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            state.active_tab === 'trace'
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
                          state.active_tab === 'history'
                            ? 'border-gray-900 text-gray-900'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <History className="h-4 w-4 inline mr-2" />
                        库存变动
                      </button>
                    </nav>
                  </div>

                  {/* 标签页内容 */}
                  {state.active_tab === 'info' && (
                    <div className="space-y-6">
                      {/* 成本信息（仅BOSS可见） */}
                      {permissions.can_view_price && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <DollarSign className="h-4 w-4 mr-2" />
                            成本分析
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">材料成本:</span>
                              <div className="font-medium">{format_price(state.sku.material_cost || 0)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">人工成本:</span>
                              <div className="font-medium">{format_price(state.sku.labor_cost || 0)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">工艺成本:</span>
                              <div className="font-medium">{format_price(state.sku.craft_cost || 0)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">总成本:</span>
                              <div className="font-medium text-red-600">{format_price(state.sku.total_cost || 0)}</div>
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

                  {state.active_tab === 'trace' && permissions.can_view_trace && state.sku && (
                    <SkuTraceView
                      sku={state.sku}

                    />
                  )}

                  {state.active_tab === 'history' && (
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
                  on_submit={(data) => onSell(state.sku!.id, data)}
                  onCancel={onClose}
                />
              )}

              {mode === 'destroy' && onDestroy && (
                <SkuDestroyForm
                  sku={state.sku}
                  on_submit={(data) => onDestroy(state.sku!.id, data)}
                  onCancel={onClose}
                  loading={false}
                />
              )}

              {mode === 'adjust' && onAdjust && (
                <SkuAdjustForm
                  sku={state.sku}
                  on_submit={(data) => onAdjust(state.sku!.id, data)}
                  onCancel={onClose}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}