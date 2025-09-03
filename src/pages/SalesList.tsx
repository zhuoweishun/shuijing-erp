import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Package,
  Loader2,
  AlertCircle,
  ShoppingCart,
  Trash2,
  History,
  Search,
  X
} from 'lucide-react'
import { useDeviceDetection } from '../hooks/useDeviceDetection'
import { useAuth } from '../hooks/useAuth'
import { useSkuPermissions } from '../hooks/useSkuPermissions'
import { skuApi, fixImageUrl } from '../services/api'
import { 
  SkuItem, 
  SellData, 
  DestroyData, 
  AdjustData 
} from '../types'
import Portal from '../components/Portal'
import SkuDetailModal from '../components/SkuDetailModal'
import SkuSellForm from '../components/SkuSellForm'
import SkuDestroyForm from '../components/SkuDestroyForm'
import SkuAdjustForm from '../components/SkuAdjustForm'

// 辅助函数：解析并获取第一张图片URL
const getFirstPhotoUrl = (photos: any): string | null => {
  if (!photos) return null
  
  let photoArray: string[] = []
  
  // 如果是字符串
  if (typeof photos === 'string') {
    // 如果字符串以http开头，直接作为URL返回
    if (photos.startsWith('http')) {
      return fixImageUrl(photos)
    }
    // 否则尝试解析为JSON
    try {
      const parsed = JSON.parse(photos)
      if (Array.isArray(parsed)) {
        photoArray = parsed
      } else {
        // 如果解析出来不是数组，可能是单个URL字符串
        return typeof parsed === 'string' ? fixImageUrl(parsed) : null
      }
    } catch (e) {
      // JSON解析失败，可能是普通字符串，尝试直接作为URL使用
      return photos.trim() ? fixImageUrl(photos) : null
    }
  } else if (Array.isArray(photos)) {
    photoArray = photos
  } else {
    return null
  }
  
  // 从数组中找到第一个有效的字符串URL
  for (const photo of photoArray) {
    if (photo && typeof photo === 'string' && photo.trim()) {
      return fixImageUrl(photo)
    }
  }
  
  return null
}

// SKU权限控制Hook已从 '../hooks/useSkuPermissions' 导入

// 使用导入的类型定义（已在API调用中使用any类型）

interface SalesListState {
  skuList: SkuItem[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  filters: {
    search: string
    status: ('ACTIVE' | 'INACTIVE')[]
    priceMin: string
    priceMax: string
    profitMarginMin: string
    profitMarginMax: string
  }
  sorting: {
    [key: string]: 'asc' | 'desc' | null
  }
  columnFilters: {
    [key: string]: {
      visible: boolean
      type: 'search' | 'select' | 'multiSelect' | 'sortAndRange' | 'sort'
    }
  }
  // SKU详情弹窗状态
  detail_modal: {
    isOpen: boolean
    sku_id: string | null
    mode: 'view' | 'sell' | 'destroy' | 'adjust'
  }
  // 图片预览弹窗状态
  image_preview: {
    isOpen: boolean
    image_url: string | null
    alt_text: string | null
  }
  // 选中的SKU
  selectedSku: SkuItem | null
}

export default function SalesList() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { isMobile } = useDeviceDetection()
  const permissions = useSkuPermissions()
  
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
  
  // 格式化库存状态
  const getStockStatus = (sku: SkuItem) => {
    if (sku.available_quantity === 0) return { text: '缺货', color: 'text-red-600 bg-red-100' }
    if (sku.available_quantity <= 2) return { text: '低库存', color: 'text-yellow-600 bg-yellow-100' }
    return { text: '正常', color: 'text-green-600 bg-green-100' }
  }
  
  const [state, setState] = useState<SalesListState>({
    skuList: [],
    loading: true,
    error: null,
    pagination: {
      page: 1,
      limit: 12, // 卡片布局，每页显示12个
      total: 0,
      total_pages: 0
    },
    filters: {
      search: '',
      status: ['ACTIVE'], // 默认显示活跃状态的SKU
      priceMin: '',
      priceMax: '',
      profitMarginMin: '',
      profitMarginMax: ''
    },
    sorting: { created_at: 'desc' as 'desc' }, // 默认按创建时间降序排列
    columnFilters: {
      skuCode: { visible: false, type: 'sort' },
      skuName: { visible: false, type: 'search' },
      status: { visible: false, type: 'multiSelect' },
      unitPrice: { visible: false, type: 'sortAndRange' },
      totalQuantity: { visible: false, type: 'sort' },
      availableQuantity: { visible: false, type: 'sort' },
      profitMargin: { visible: false, type: 'sortAndRange' }
    },
    detail_modal: {
      isOpen: false,
      sku_id: null,
      mode: 'view'
    },
    image_preview: {
      isOpen: false,
      image_url: null,
      alt_text: null
    },
    selectedSku: null
  })

  // 按照文档3.9节实现UI交互细节
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // 检查点击是否在筛选面板内部或触发按钮上
      const isInsideFilterPanel = target.closest('.filter-panel');
      const isFilterTrigger = target.closest('.filter-trigger');
      
      // 只有当点击既不在筛选面板内部也不在触发按钮上时才关闭面板
      if (!isInsideFilterPanel && !isFilterTrigger) {
        // 关闭所有筛选面板
        setState(prev => ({
          ...prev,
          columnFilters: Object.keys(prev.columnFilters).reduce((acc, key) => {
            acc[key] = { ...prev.columnFilters[key], visible: false };
            return acc;
          }, {} as any)
        }));
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取SKU列表
  const fetchSkuList = async (customParams?: any) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const currentState = customParams || state
      const params: any = {
        page: currentState.pagination?.page || state.pagination.page,
        limit: currentState.pagination?.limit || state.pagination.limit
      }
      
      const filters = customParams?.filters || state.filters
      const sorting = customParams?.sorting || state.sorting
      
      // 构建筛选参数
      if (filters.search) params.search = filters.search
      
      // 状态筛选
      if (filters.status && filters.status.length > 0) {
        params.status = filters.status // SKU API支持数组状态筛选
      }
      
      // 价格范围筛选
      if (filters.priceMin) params.price_min = parseFloat(filters.priceMin)
      if (filters.priceMax) params.price_max = parseFloat(filters.priceMax)
      
      // 利润率范围筛选
      if (filters.profitMarginMin) params.profit_margin_min = parseFloat(filters.profitMarginMin)
      if (filters.profitMarginMax) params.profit_margin_max = parseFloat(filters.profitMarginMax)
      
      // 排序参数
      const sortField = Object.keys(sorting).find(key => sorting[key])
      if (sortField && sorting[sortField]) {
        params.sort_by = sortField
        params.sort_order = sorting[sortField] as 'asc' | 'desc'
      }
      
      const response = await skuApi.list(params)
      
      if (response.success && response.data) {
        const data = response.data as any
        setState(prev => ({
          ...prev,
          skuList: data.skus || [],
          pagination: {
            ...prev.pagination,
            page: data.pagination?.page || 1,
            limit: data.pagination?.limit || 12,
            total: data.pagination?.total || 0,
            total_pages: data.pagination?.totalPages || 0
          },
          loading: false
        }))
      } else {
        setState(prev => ({
          ...prev,
          error: response.message || '获取SKU数据失败',
          loading: false
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取SKU列表失败'
      }))
    }
  }

  // 初始加载（仅在组件首次挂载时加载）
  useEffect(() => {
    if (isAuthenticated) {
      fetchSkuList()
    }
  }, [isAuthenticated])

  // 立即应用筛选
  const applyFiltersImmediately = useCallback((newFilters: any, newSorting?: any) => {
    const updatedState = {
      ...state,
      filters: newFilters,
      sorting: newSorting || state.sorting,
      pagination: { ...state.pagination, page: 1 } // 重置到第一页
    }
    setState(prev => ({
      ...prev,
      filters: newFilters,
      sorting: newSorting || prev.sorting,
      pagination: { ...prev.pagination, page: 1 }
    }))
    fetchSkuList(updatedState)
  }, [state])

  // 处理分页
  const handlePageChange = (newPage: number) => {
    const updatedState = {
      ...state,
      pagination: { ...state.pagination, page: newPage }
    }
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page: newPage }
    }))
    fetchSkuList(updatedState)
  }

  // 处理排序
  // const handleSort = (field: string) => {
  //   const currentOrder = state.sorting[field]
  //   let newOrder: 'asc' | 'desc' | null = 'desc'
  //   
  //   if (currentOrder === 'desc') {
  //     newOrder = 'asc'
  //   } else if (currentOrder === 'asc') {
  //     newOrder = null
  //   }
  //   
  //   const newSorting = { [field]: newOrder }
  //   setState(prev => ({ ...prev, sorting: newSorting }))
  //   applyFiltersImmediately(state.filters, newSorting)
  // }

  // 重置筛选
  const handleReset = () => {
    const resetFilters = {
      search: '',
      status: ['ACTIVE'] as ('ACTIVE' | 'INACTIVE')[],
      priceMin: '',
      priceMax: '',
      profitMarginMin: '',
      profitMarginMax: ''
    }
    const resetSorting = { created_at: 'desc' as 'desc' }
    setState(prev => ({
      ...prev,
      filters: resetFilters,
      sorting: resetSorting,
      pagination: { ...prev.pagination, page: 1 }
    }))
    fetchSkuList({
      ...state,
      filters: resetFilters,
      sorting: resetSorting,
      pagination: { ...state.pagination, page: 1 }
    })
  }

  // 打开详情弹窗
  const openDetailModal = (sku: SkuItem, mode: 'view' | 'sell' | 'destroy' | 'adjust' = 'view') => {
    setState(prev => ({
      ...prev,
      detail_modal: {
        isOpen: true,
        sku_id: sku.id || sku.sku_id || null,
        mode
      },
      selectedSku: sku
    }))
  }

  // 关闭详情弹窗
  const closeDetailModal = () => {
    setState(prev => ({
      ...prev,
      detail_modal: {
        isOpen: false,
        sku_id: null,
        mode: 'view'
      },
      selectedSku: null
    }))
  }

  // 处理SKU销售
  const handleSkuSell = async (data: SellData) => {
    if (!state.selectedSku) return
    
    try {
      const response = await skuApi.sell(state.selectedSku.sku_id || state.selectedSku.id, data)
      if (response.success) {
        // 刷新列表
        await fetchSkuList()
        closeDetailModal()
        // 可以添加成功提示
      } else {
        console.error('销售失败:', response.message)
      }
    } catch (error) {
      console.error('销售操作失败:', error)
    }
  }

  // 处理SKU销毁
  const handleSkuDestroy = async (data: DestroyData) => {
    if (!state.selectedSku) return
    
    try {
      const response = await skuApi.destroy(state.selectedSku.sku_id || state.selectedSku.id, data)
      if (response.success) {
        // 刷新列表
        await fetchSkuList()
        closeDetailModal()
        // 可以添加成功提示
      } else {
        console.error('销毁失败:', response.message)
      }
    } catch (error) {
      console.error('销毁操作失败:', error)
    }
  }

  // 处理SKU库存调整
  const handleSkuAdjust = async (data: AdjustData) => {
    if (!state.selectedSku) return
    
    try {
      const skuId = state.selectedSku.id || state.selectedSku.sku_id
      if (!skuId) {
        console.error('SKU ID不存在')
        return
      }
      const response = await skuApi.adjust(skuId, data)
      if (response.success) {
        // 刷新列表
        await fetchSkuList()
        closeDetailModal()
        // 可以添加成功提示
      } else {
        console.error('调整失败:', response.message)
      }
    } catch (error) {
      console.error('调整操作失败:', error)
    }
  }



  // 打开图片预览
  const openImagePreview = (imageUrl: string, altText: string) => {
    setState(prev => ({
      ...prev,
      image_preview: {
        isOpen: true,
        image_url: imageUrl,
        alt_text: altText
      }
    }))
  }

  // 关闭图片预览
  const closeImagePreview = () => {
    setState(prev => ({
      ...prev,
      image_preview: {
        isOpen: false,
        image_url: null,
        alt_text: null
      }
    }))
  }

  // 切换列筛选面板
  // const toggleColumnFilter = (column: string) => {
  //   setState(prev => ({
  //     ...prev,
  //     columnFilters: {
  //       ...prev.columnFilters,
  //       [column]: {
  //         ...prev.columnFilters[column],
  //         visible: !prev.columnFilters[column].visible
  //       }
  //     }
  //   }))
  // }

  // 如果未认证，显示登录提示
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">请先登录</h2>
          <p className="text-gray-600 mb-4">您需要登录后才能查看销售列表</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            前往登录
          </button>
        </div>
      </div>
    )
  }

  // 移动端渲染
  if (isMobile) {
    return (
      <div className="space-y-4 p-4">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="h-6 w-6 text-gray-700" />
            <h1 className="text-xl font-semibold text-gray-900">SKU销售列表</h1>
          </div>
        </div>

        {/* 移动端筛选 */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-gray-900">筛选和排序</h3>
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              重置
            </button>
          </div>
          
          <div className="space-y-3">
            {/* 搜索 */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="搜索SKU名称或编号..."
                value={state.filters.search}
                onChange={(e) => {
                  const newFilters = { ...state.filters, search: e.target.value }
                  setState(prev => ({
                    ...prev,
                    filters: newFilters
                  }))
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    applyFiltersImmediately(state.filters)
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <button
                onClick={() => applyFiltersImmediately(state.filters)}
                className="w-full px-3 py-2 text-sm text-blue-500 hover:text-blue-700 border border-blue-300 rounded-lg"
              >
                应用搜索
              </button>
            </div>
            
            {/* 状态选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">SKU状态</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'ACTIVE', label: '活跃' },
                  { value: 'INACTIVE', label: '停用' }
                ].map(status => (
                  <label key={status.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.filters.status.includes(status.value as 'ACTIVE' | 'INACTIVE')}
                      onChange={(e) => {
                        const newStatus = e.target.checked
                          ? [...state.filters.status, status.value as 'ACTIVE' | 'INACTIVE']
                          : state.filters.status.filter(s => s !== status.value)
                        const newFilters = { ...state.filters, status: newStatus }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        }))
                        applyFiltersImmediately(newFilters)
                      }}
                      className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-sm text-gray-700">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 加载状态 */}
        {state.loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        )}

        {/* 错误状态 */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{state.error}</span>
            </div>
          </div>
        )}

        {/* 移动端SKU卡片列表 */}
        {!state.loading && !state.error && (
          <div className="space-y-3">
            {state.skuList.map((sku) => {
              const firstPhoto = getFirstPhotoUrl(sku.photos)
              const stockStatus = getStockStatus(sku)
              return (
                <div key={sku.id || sku.sku_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-start space-x-3">
                    {/* SKU图片 */}
                    <div className="flex-shrink-0">
                      {firstPhoto ? (
                        <img
                          src={firstPhoto}
                          alt={sku.sku_name}
                          className="w-16 h-16 rounded-lg object-cover cursor-pointer"
                          onClick={() => openImagePreview(firstPhoto, sku.sku_name)}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* SKU信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {sku.sku_name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            SKU编号: {sku.sku_code || sku.sku_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            库存: {sku.available_quantity}/{sku.total_quantity} 件
                          </p>
                        </div>
                        
                        {/* 状态标签 */}
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            sku.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sku.status === 'ACTIVE' ? '活跃' : '停用'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                            {stockStatus.text}
                          </span>
                        </div>
                      </div>
                      
                      {/* 价格信息（仅BOSS可见） */}
                      {permissions.canViewPrice && (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-xs text-gray-600">
                            单价: {formatPrice(sku.selling_price || sku.unit_price)}
                          </div>
                          {sku.profit_margin && (
                            <div className="text-xs text-gray-600">
                              利润率: {formatProfitMargin(sku.profit_margin)}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 操作按钮 */}
                      <div className="mt-3 flex items-center space-x-2">
                        <button
                          onClick={() => openDetailModal(sku, 'view')}
                          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          查看
                        </button>
                        
                        {permissions.canSell && sku.available_quantity > 0 && (
                          <button
                            onClick={() => openDetailModal(sku, 'sell')}
                            className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            销售
                          </button>
                        )}
                        
                        {permissions.canDestroy && sku.available_quantity > 0 && (
                          <button
                            onClick={() => openDetailModal(sku, 'destroy')}
                            className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            销毁
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* 分页 */}
        {!state.loading && !state.error && state.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <button
              onClick={() => handlePageChange(state.pagination.page - 1)}
              disabled={state.pagination.page <= 1}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一页
            </button>
            
            <span className="text-sm text-gray-700">
              第 {state.pagination.page} 页，共 {state.pagination.total_pages} 页
            </span>
            
            <button
              onClick={() => handlePageChange(state.pagination.page + 1)}
              disabled={state.pagination.page >= state.pagination.total_pages}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // 桌面端渲染
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ShoppingCart className="h-8 w-8 text-gray-700" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">SKU销售列表</h1>
            <p className="text-sm text-gray-600 mt-1">管理和查看所有SKU的销售状态</p>
          </div>
        </div>
      </div>

      {/* 筛选和搜索栏 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索SKU名称或编号..."
                value={state.filters.search}
                onChange={(e) => {
                  const newFilters = { ...state.filters, search: e.target.value }
                  setState(prev => ({ ...prev, filters: newFilters }))
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    applyFiltersImmediately(state.filters)
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <button
            onClick={() => applyFiltersImmediately(state.filters)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            搜索
          </button>
          
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            重置
          </button>
        </div>
      </div>

      {/* 加载状态 */}
      {state.loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {/* 错误状态 */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{state.error}</span>
          </div>
        </div>
      )}

      {/* 桌面端SKU卡片网格 */}
      {!state.loading && !state.error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {state.skuList.map((sku) => {
            const firstPhoto = getFirstPhotoUrl(sku.photos)
            const stockStatus = getStockStatus(sku)
            return (
              <div key={sku.id || sku.sku_id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* SKU图片 */}
                <div className="aspect-square bg-gray-100 relative">
                  {firstPhoto ? (
                    <img
                      src={firstPhoto}
                      alt={sku.sku_name}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => openImagePreview(firstPhoto, sku.sku_name)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* 状态标签 */}
                  <div className="absolute top-2 right-2 flex flex-col space-y-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      sku.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sku.status === 'ACTIVE' ? '活跃' : '停用'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                      {stockStatus.text}
                    </span>
                  </div>
                </div>
                
                {/* SKU信息 */}
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                    {sku.sku_name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    SKU编号: {sku.sku_code || sku.sku_number}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    库存: {sku.available_quantity}/{sku.total_quantity} 件
                  </p>
                  
                  {/* 价格信息（仅BOSS可见） */}
                  {permissions.canViewPrice && (
                    <div className="mb-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">单价:</span>
                        <span className="font-medium">{formatPrice(sku.selling_price || sku.unit_price)}</span>
                      </div>
                      {sku.profit_margin && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">利润率:</span>
                          <span className="font-medium">{formatProfitMargin(sku.profit_margin)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openDetailModal(sku, 'view')}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      查看
                    </button>
                    
                    {permissions.canSell && sku.available_quantity > 0 && (
                      <button
                        onClick={() => openDetailModal(sku, 'sell')}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        销售
                      </button>
                    )}
                  </div>
                  
                  {/* 更多操作按钮 */}
                  {(permissions.canDestroy || permissions.canAdjust) && (
                    <div className="flex items-center space-x-2 mt-2">
                      {permissions.canDestroy && sku.available_quantity > 0 && (
                        <button
                          onClick={() => openDetailModal(sku, 'destroy')}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          销毁
                        </button>
                      )}
                      
                      {permissions.canAdjust && (
                        <button
                          onClick={() => openDetailModal(sku, 'adjust')}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <History className="h-3 w-3 mr-1" />
                          调整
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* 分页 */}
      {!state.loading && !state.error && state.pagination.total_pages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              显示第 {((state.pagination.page - 1) * state.pagination.limit) + 1} - {Math.min(state.pagination.page * state.pagination.limit, state.pagination.total)} 条，共 {state.pagination.total} 条
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(state.pagination.page - 1)}
              disabled={state.pagination.page <= 1}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一页
            </button>
            
            <span className="text-sm text-gray-700">
              第 {state.pagination.page} 页，共 {state.pagination.total_pages} 页
            </span>
            
            <button
              onClick={() => handlePageChange(state.pagination.page + 1)}
              disabled={state.pagination.page >= state.pagination.total_pages}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}
      
      {/* 图片预览弹窗 */}
      {state.image_preview.isOpen && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeImagePreview}>
            <div className="max-w-4xl max-h-4xl p-4">
              <img
                src={state.image_preview.image_url!}
                alt={state.image_preview.alt_text || 'SKU图片'}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <button
              onClick={closeImagePreview}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X className="h-8 w-8" />
            </button>
          </div>
        </Portal>
      )}
      
      {/* SKU详情弹窗 */}
      {state.detail_modal.isOpen && state.selectedSku && state.detail_modal.mode === 'view' && (
        <SkuDetailModal
          skuId={state.selectedSku.sku_id || state.selectedSku.id}
          isOpen={state.detail_modal.isOpen}
          onClose={closeDetailModal}
          mode={state.detail_modal.mode}
          permissions={permissions}
        />
      )}
      
      {/* SKU销售确认弹窗 */}
      {state.detail_modal.isOpen && state.selectedSku && state.detail_modal.mode === 'sell' && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">SKU销售确认</h2>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <SkuSellForm
                sku={state.selectedSku}
                onSubmit={handleSkuSell}
                onCancel={closeDetailModal}
                loading={false}
              />
            </div>
          </div>
        </Portal>
      )}
      
      {/* SKU销毁操作弹窗 */}
      {state.detail_modal.isOpen && state.selectedSku && state.detail_modal.mode === 'destroy' && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">SKU销毁操作</h2>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <SkuDestroyForm
                sku={state.selectedSku}
                onSubmit={handleSkuDestroy}
                onCancel={closeDetailModal}
                loading={false}
              />
            </div>
          </div>
        </Portal>
      )}
      
      {/* SKU库存调整弹窗 */}
      {state.detail_modal.isOpen && state.selectedSku && state.detail_modal.mode === 'adjust' && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">SKU库存调整</h2>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <SkuAdjustForm
                sku={state.selectedSku}
                onSubmit={handleSkuAdjust}
                onCancel={closeDetailModal}
                loading={false}
              />
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}