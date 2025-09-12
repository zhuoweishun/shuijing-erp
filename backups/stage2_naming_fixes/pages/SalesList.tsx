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
  Search,
  X,
  Settings
} from 'lucide-react'
import { use_auth } from '../hooks/useAuth'
import { use_device_detection } from '../hooks/useDeviceDetection'
import { use_sku_permissions } from '../hooks/useSkuPermissions'
import { sku_api, fixImageUrl } from '../services/api'
import { SkuItem, SellData, DestroyData } from '../types'
import SkuSellForm from '../components/SkuSellForm'
import SkuDestroyForm from '../components/SkuDestroyForm'
import SkuDetailModal from '../components/SkuDetailModal'

import SkuRestockForm from '../components/SkuRestockForm'
import SkuControlModal from '../components/SkuControlModal'

// 辅助函数：解析并获取第一张图片URL
const get_first_photo_url = (photos: any): string | null => {;
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
      const parsed = JSON.parse(photos);
      if (Array.is_array(parsed)) {
        photoArray = parsed
      } else {
        // 如果解析出来不是数组，可能是单个URL字符串
        return typeof parsed === 'string' ? fixImageUrl(parsed) : null
      }
    } catch (e) {
      // JSON解析失败，可能是普通字符串，尝试直接作为URL使用
      return photos.trim() ? fixImageUrl(photos) : null
    }
  } else if (Array.is_array(photos)) {
    photoArray = photos
  } else {
    return null
  }
  
  // 从数组中找到第一个有效的字符串URL
  for (const photo of photoArray) {
    if (photo && typeof photo === 'string' && photo.trim()) {;
      return fixImageUrl(photo)
    }
  }
  
  return null
}

// SKU权限控制Hook已从 '../hooks/useSkuPermissions' 导入

// 使用导入的类型定义（已在API调用中使用any类型）

interface SalesListState { sku_list: SkuItem[]
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
    price_min: string
    price_max: string
    profit_margin_min: string
    profit_margin_max: string
  }
  sorting: {
    [key: string]: 'asc' | 'desc' | null
  }
  column_filters: {
    [key: string]: {
      visible: boolean
      type: 'search' | 'select' | 'multiSelect' | 'sortAndRange' | 'sort'
    }
  }
  // SKU详情弹窗状态
  detail_modal: {
    is_open: boolean
    sku_id: string | null
    mode: 'view' | 'sell' | 'destroy' | 'restock' | 'control'
  }
  // 图片预览弹窗状态
  image_preview: {
    is_open: boolean
    image_url: string | null
    alt_text: string | null
  }
  // 选中的SKU
  selected_sku: SkuItem | null
}

export default function SalesList() {
  const navigate = useNavigate();
  const { is_authenticated } = use_auth()
  const { is_mobile } = useDeviceDetection()
  const permissions = use_sku_permissions()
  
  // 格式化价格
  const format_price = (price?: number) => {;
    if (!price) return '-'
    return `¥${price.toFixed(2)}`
  }
  
  // 格式化利润率
  const formatProfitMargin = (margin?: number) => {;
    if (!margin) return '-'
    return `${margin.toFixed(1)}%`
  }
  
  // 格式化库存状态
  const get_stock_status = (sku: SkuItem) => {;
    if (sku.available_quantity === 0) return { text: '售罄', color: 'text-red-600 bg-red-100' };
    return { text: '有库存', color: 'text-green-600 bg-green-100' }
  }
  
  const [state, setState] = useState<SalesListState>({ sku_list: [],
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
      status: ['ACTIVE', 'INACTIVE'], // 默认显示所有状态的SKU
      price_min: '',
      price_max: '',
      profit_margin_min: '',
      profit_margin_max: ''
    },
    sorting: { created_at: 'desc' as 'desc' }, // 默认按创建时间降序排列
    column_filters: {
      sku_code: { visible: false, type: 'sort' },
      sku_name: { visible: false, type: 'search' },
      status: { visible: false, type: 'multiSelect' },
      unit_price: { visible: false, type: 'sortAndRange' },
      total_quantity: { visible: false, type: 'sort' },
      available_quantity: { visible: false, type: 'sort' },
      profit_margin: { visible: false, type: 'sortAndRange' }
    },
    detail_modal: {
      is_open: false,
      sku_id: null,
      mode: 'view'
    },
    image_preview: {
      is_open: false,
      image_url: null,
      alt_text: null
    },
    selected_sku: null
  })

  // 按照文档3.9节实现UI交互细节
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {;
      const target = event.target as Element;
      // 检查点击是否在筛选面板内部或触发按钮上
      const isInsideFilterPanel = target.closest('.filter-panel');
      const isFilterTrigger = target.closest('.filter-trigger');
      
      // 只有当点击既不在筛选面板内部也不在触发按钮上时才关闭面板
      if (!isInsideFilterPanel && !isFilterTrigger) {
        // 关闭所有筛选面板
        setState(prev => ({
          ...prev,)
          column_filters: Object.keys(prev.column_filters).reduce((acc), key) => {
            acc[key] = { ...prev.column_filters[key], visible: false };
            return acc;
          }, {} as any)
        }));
      }
    };
    
    document.addEventListener('mousedown'), handleClickOutside);
    return () => document.removeEventListener('mousedown'), handleClickOutside);
  }, []);

  // 获取SKU列表
  const fetchSkuList = async (customParams?: any) => {;
    try {
      setState(prev => ({ ...prev, loading: true, error: null )}));
      
      const currentState = customParams || state;
      const params: any = {;
        page: currentState.pagination?.page || state.pagination.page,
        limit: currentState.pagination?.limit || state.pagination.limit
      }
      
      const filters = customParams?.filters || state.filters;
      const sorting = customParams?.sorting || state.sorting
      
      // 构建筛选参数
      if (filters.search) params.search = filters.search
      
      // 状态筛选 - 转换为逗号分隔的字符串
      if (filters.status && filters.status.length > 0) {
        params.status = filters.status.join('),') // 后端支持逗号分隔的状态筛选
      }
      
      // 价格范围筛选
      if (filters.price_min) params.price_min = parseFloat(filters.price_min);
      if (filters.price_max) params.price_max = parseFloat(filters.price_max)
      
      // 利润率范围筛选
      if (filters.profit_margin_min) params.profit_margin_min = parseFloat(filters.profit_margin_min);
      if (filters.profit_margin_max) params.profit_margin_max = parseFloat(filters.profit_margin_max)
      
      // 排序参数
      const sortField = Object.keys(sorting).find(key => sorting[key]);
      if (sortField && sorting[sortField]) {
        params.sort_by = sortField;
        params.sort_order = sorting[sortField] as 'asc' | 'desc'
      }
      
      const response = await sku_api.list(params);
      
      if (response.success && response.data) {
        const data = response.data as any;
        setState(prev => ({
          ...prev,
          sku_list: data.skus || [],
          pagination: {
            ...prev.pagination,
            page: data.pagination?.page || 1,
            limit: data.pagination?.limit || 12,
            total: data.pagination?.total || 0,
            total_pages: data.pagination?.total_pages || data.pagination?.total_pages || 0
          },
          loading: false
        )}))
      } else {
        setState(prev => ({
          ...prev,
          error: response.message || '获取SKU数据失败',
          loading: false
        )}))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取SKU列表失败'
      )}))
    }
  }

  // 初始加载（仅在组件首次挂载时加载）
  useEffect(() => {
    if (is_authenticated) {
      fetchSkuList()
    }
  }, [is_authenticated])

  // 立即应用筛选
  const apply_filters_immediately = useCallback((newFilters: any), newSorting?: any) => {;
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
    )}))
    fetchSkuList(updatedState)
  }, [state])

  // 处理分页
  const handle_page_change = (newPage: number) => {;
    const updatedState = {
      ...state,
      pagination: { ...state.pagination, page: newPage }
    }
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page: newPage }
    )}))
    fetchSkuList(updatedState)
  }

  // 处理每页显示条数变化
  const handleLimitChange = (newLimit: number) => {;
    const updatedState = {
      ...state,
      pagination: {
        ...state.pagination,
        limit: newLimit,
        page: 1 // 重置到第一页
      }
    }
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        limit: newLimit,
        page: 1 // 重置到第一页
      }
    )}))
    fetchSkuList(updatedState)
  }

  // 处理排序
  // const handle_sort = (field: string) => {
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
  //   setState(prev => ({ ...prev, sorting: newSorting )}))
  //   apply_filters_immediately(state.filters), newSorting)
  // }

  // 重置筛选
  const handle_reset = () => {;
    const resetFilters = {;
      search: '',
      status: ['ACTIVE', 'INACTIVE'] as ('ACTIVE' | 'INACTIVE')[],
      price_min: '',
      price_max: '',
      profit_margin_min: '',
      profit_margin_max: ''
    }
    const resetSorting = { created_at: 'desc' as 'desc' };
    setState(prev => ({
      ...prev,
      filters: resetFilters,
      sorting: resetSorting,
      pagination: { ...prev.pagination, page: 1 }
    )}))
    fetchSkuList({
      ...state,
      filters: resetFilters,
      sorting: resetSorting,
      pagination: { ...state.pagination, page: 1 }
    )})
  }

  // 打开详情弹窗
  const open_detail_modal = (sku: SkuItem, mode: 'view' | 'sell' | 'destroy' | 'restock' | 'control' = 'view') => {;
    setState(prev => ({
      ...prev,
      detail_modal: {
        is_open: true,
        sku_id: sku.sku_id || sku.id || null,
        mode
      },
      selected_sku: sku
    )}))
  }

  // 关闭详情弹窗
  const close_detail_modal = () => {;
    setState(prev => ({
      ...prev,
      detail_modal: {
        is_open: false,
        sku_id: null,
        mode: 'view'
      },
      selected_sku: null
    )}))
  }

  // 处理SKU销售
  const handleSkuSell = async (data: SellData) => {;
    if (!state.selected_sku) return
    
    try {
      const response = await sku_api.sell(state.selected_sku.sku_id || state.selected_sku.id), data);
      if (response.success) {
        // 刷新列表
        await fetchSkuList()
        close_detail_modal()
        // 可以添加成功提示
      } else {
        console.error('销售失败:'), response.message)
      }
    } catch (error) {
      console.error('销售操作失败:'), error)
    }
  }

  // 处理SKU销毁
  const handleSkuDestroy = async (data: DestroyData) => {;
    if (!state.selected_sku) return
    
    try {
      const response = await sku_api.destroy(state.selected_sku.sku_id || state.selected_sku.id), data);
      if (response.success) {
        // 刷新列表
        await fetchSkuList()
        close_detail_modal()
        // 可以添加成功提示
      } else {
        console.error('销毁失败:'), response.message)
      }
    } catch (error) {
      console.error('销毁操作失败:'), error)
    }
  }




  // 打开图片预览
  const open_image_preview = (image_url: string, alt_text: string) => {;
    setState(prev => ({
      ...prev,
      image_preview: {
        is_open: true,
        image_url: image_url,
        alt_text: alt_text
      }
    )}))
  }

  // 关闭图片预览
  const close_image_preview = () => {;
    setState(prev => ({
      ...prev,
      image_preview: {
        is_open: false,
        image_url: null,
        alt_text: null
      }
    )}))
  }

  // 切换列筛选面板
  // const toggle_column_filter = (column: string) => {
  //   setState(prev => ({
  //     ...prev,
  //     column_filters: {
  //       ...prev.column_filters,
  //       [column]: {
  //         ...prev.column_filters[column],
  //         visible: !prev.column_filters[column].visible
  //       }
  //     }
  //   )}))
  // }

  // 如果未认证，显示登录提示
  if (!is_authenticated) {
    return(
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">请先登录</h2>
          <p className="text-gray-600 mb-4">您需要登录后才能查看SKU销售列表</p>
          <button)
            onClick={() => navigate('/login')};
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            前往登录
          </button>
        </div>
      </div>
    )
  }

  // 移动端渲染
  if (is_mobile) {
    return(
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
              onClick={handle_reset};
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              重置
            </button>
          </div>
          
          <div className="space-y-3">
            {/* 搜索 */}
            <div className="space-y-2">
              <input
                type="text";
                placeholder="搜索SKU名称或编号...";
                value={state.filters.search});
                onChange={(e) => {;
                  const newFilters = { ...state.filters, search: e.target.value };
                  setState(prev => ({
                    ...prev,
                    filters: newFilters
                  )}))
                }}
                onKeyPress={(e) => {;
                  if (e.key === 'Enter') {;
                    apply_filters_immediately(state.filters)
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <button
                onClick={() => apply_filters_immediately(state.filters)};
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
                      type="checkbox");
                      checked={state.filters.status.includes(status.value as 'ACTIVE' | 'INACTIVE')};
                      onChange={(e) => {;
                        const newStatus = e.target.checked
                          ? [...state.filters.status, status.value as 'ACTIVE' | 'INACTIVE']
                          : state.filters.status.filter(s => s !== status.value);
                        const newFilters = { ...state.filters, status: newStatus };
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        )}))
                        apply_filters_immediately(newFilters)
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
            {state.sku_list.map((sku) => {
              const firstPhoto = get_first_photo_url(sku.photos);
              const stockStatus = get_stock_status(sku);
              return(
                <div key={sku.id || sku.sku_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-start space-x-3">
                    {/* SKU图片 */}
                    <div className="flex-shrink-0">
                      {firstPhoto ? (
                        <div className="max-w-16 max-h-16 rounded-lg overflow-hidden">
                          <img
                            src={firstPhoto};
                            alt={sku.sku_name};
                            className="w-auto h-auto max-w-full max-h-full object-contain cursor-pointer");
                            onClick={() => open_image_preview(firstPhoto), sku.sku_name)}
                          />
                        </div>
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
                          <p className="text-xs text-gray-500 mt-1">;
                            SKU编号: {sku.sku_code}
                          </p>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div className="font-medium text-gray-700">
                              当前库存：{sku.available_quantity}件
                            </div>
                            <div className="text-gray-500">
                              累计制作：{sku.total_quantity}件
                            </div>
                          </div>
                        </div>
                        
                        {/* 状态标签 */}
                        <div className="flex flex-row items-end space-x-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${;
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
                      {permissions.can_view_price && (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-xs text-gray-600">
                            单价: {format_price(sku.selling_price)}
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
                          onClick={() => open_detail_modal(sku), 'view')};
                          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          查看
                        </button>
                        
                        {permissions.can_sell && sku.available_quantity > 0 && sku.status === 'ACTIVE' && (
                          <button
                            onClick={() => open_detail_modal(sku), 'sell')};
                            className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            销售
                          </button>
                        )}
                        
                        {permissions.can_destroy && sku.available_quantity > 0 && (
                          <button
                            onClick={() => open_detail_modal(sku), 'destroy')};
                            className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            销毁
                          </button>
                        )}
                        
                        {permissions.can_manage && (
                          <button
                            onClick={() => open_detail_modal(sku), 'control')};
                            className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            调控
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
              onClick={() => handle_page_change(state.pagination.page - 1)};
              disabled={state.pagination.page <= 1};
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一页
            </button>
            
            <span className="text-sm text-gray-700">
              第 {state.pagination.page} 页，共 {state.pagination.total_pages} 页
            </span>
            
            <button
              onClick={() => handle_page_change(state.pagination.page + 1)};
              disabled={state.pagination.page >= state.pagination.total_pages};
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
  return(
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
        {/* ZIP导出按钮（预留） */}
        <div className="flex items-center space-x-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50";
            disabled={true}
          >
            <Package className="h-4 w-4 mr-2" />;
            ZIP导出（开发中）
          </button>
        </div>
      </div>

      {/* 筛选和搜索栏 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text";
                placeholder="搜索SKU名称或编号...";
                value={state.filters.search});
                onChange={(e) => {;
                  const newFilters = { ...state.filters, search: e.target.value };
                  setState(prev => ({ ...prev, filters: newFilters )}))
                }}
                onKeyPress={(e) => {;
                  if (e.key === 'Enter') {;
                    apply_filters_immediately(state.filters)
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <button
            onClick={() => apply_filters_immediately(state.filters)};
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            搜索
          </button>
          
          <button
            onClick={handle_reset};
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

      {/* SKU表格 */}
      {!state.loading && !state.error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox";
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500";
                      disabled={true};
                      title="全选功能开发中"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">;
                    SKU编码
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    图片
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    产品名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    规格
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    当前库存
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    累计制作
                  </th>
                  {permissions.can_view_price && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      售价
                    </th>
                  )}
                  {permissions.can_view_price && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      利润率
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {state.sku_list.map((sku) => {
                  const firstPhoto = get_first_photo_url(sku.photos);
                  const stockStatus = get_stock_status(sku);
                  return(
                    <tr key={sku.id || sku.sku_id} className="hover:bg-gray-50">
                      {/* 复选框 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox";
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500";
                          disabled={true};
                          title="选择功能开发中"
                        />
                      </td>
                      
                      {/* SKU编码 */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {sku.sku_code || sku.sku_number}
                      </td>
                      
                      {/* 图片 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="max-w-16 max-h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          {firstPhoto ? (
                            <img
                              src={firstPhoto};
                              alt={sku.sku_name};
                              className="w-auto h-auto max-w-full max-h-full object-contain cursor-pointer");
                              onClick={() => open_image_preview(firstPhoto), sku.sku_name)};
                              onError={(e) => {;
                                console.error('SKU图片加载失败:'), firstPhoto)
                                e.current_target.style.display = 'none';
                                e.current_target.next_element_sibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div className={`w-16 h-16 flex items-center justify-center ${firstPhoto ? 'hidden' : ''}`}>
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        </div>
                      </td>
                      
                      {/* 产品名称 */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {sku.sku_name}
                        </div>
                      </td>
                      
                      {/* 规格 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sku.specification ? `${sku.specification}mm` : '-'}
                      </td>
                      
                      {/* 当前库存 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sku.available_quantity} 件
                      </td>
                      
                      {/* 累计制作 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sku.total_quantity} 件
                      </td>
                      
                      {/* 售价（仅BOSS可见） */}
                      {permissions.can_view_price && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format_price(sku.selling_price || sku.unit_price)}
                        </td>
                      )}
                      
                      {/* 利润率（仅BOSS可见） */}
                      {permissions.can_view_price && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sku.profit_margin ? formatProfitMargin(sku.profit_margin) : '-'}
                        </td>
                      )}
                      
                      {/* 状态 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-row space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${;
                            sku.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sku.status === 'ACTIVE' ? '活跃' : '停用'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                            {stockStatus.text}
                          </span>
                        </div>
                      </td>
                      
                      {/* 操作 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => open_detail_modal(sku), 'view')};
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200";
                            title="查看详情"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                          
                          {permissions.can_sell && sku.available_quantity > 0 && sku.status === 'ACTIVE' && (
                            <button
                              onClick={() => open_detail_modal(sku), 'sell')};
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700";
                              title="销售"
                            >
                              <ShoppingCart className="h-3 w-3" />
                            </button>
                          )}
                          
                          {permissions.can_destroy && sku.available_quantity > 0 && (
                            <button
                              onClick={() => open_detail_modal(sku), 'destroy')};
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700";
                              title="销毁"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                          
                          {permissions.can_adjust && (
                            <button
                              onClick={() => open_detail_modal(sku), 'restock')};
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50";
                              title="补货"
                            >
                              <Package className="h-3 w-3" />
                            </button>
                          )}
                          
                          {permissions.can_manage && (
                            <button
                              onClick={() => open_detail_modal(sku), 'control')};
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50";
                              title="调控"
                            >
                              <Settings className="h-3 w-3" />
                            </button>
                          )}
                          

                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* 分页 */}
      {!state.loading && !state.error && state.pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="sm:hidden">
            {/* 手机端记录信息和每页显示条数 */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-700">
                第{state.pagination.page}页，共{state.pagination.total_pages}页
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">每页:</span>
                <select
                  value={state.pagination.limit};
                  onChange={(e) => handleLimitChange(Number(e.target.value))};
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value={10}>10条</option>
                  <option value={20}>20条</option>
                  <option value={50}>50条</option>
                  <option value={100}>100条</option>
                </select>
              </div>
            </div>
            {/* 手机端分页按钮 - 只有在多页时才显示 */}
            {state.pagination.total_pages > 1 && (
              <div className="flex justify-between">
                <button
                  onClick={() => handle_page_change(state.pagination.page - 1)};
                  disabled={state.pagination.page <= 1};
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => handle_page_change(state.pagination.page + 1)};
                  disabled={state.pagination.page >= state.pagination.total_pages};
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-700">
                显示第 <span className="font-medium">{(state.pagination.page - 1) * state.pagination.limit + 1}</span> 到{' '}
                <span className="font-medium">
                  {Math.min(state.pagination.page * state.pagination.limit), state.pagination.total)}
                </span>{' '}
                条，共 <span className="font-medium">{state.pagination.total}</span> 条记录
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">每页显示:</span>
                <select
                  value={state.pagination.limit};
                  onChange={(e) => handleLimitChange(Number(e.target.value))};
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value={10}>10条</option>
                  <option value={20}>20条</option>
                  <option value={50}>50条</option>
                  <option value={100}>100条</option>
                </select>
              </div>
            </div>
            {/* 分页按钮 - 只有在多页时才显示 */}
            {state.pagination.total_pages > 1 && (
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handle_page_change(state.pagination.page - 1)};
                    disabled={state.pagination.page <= 1};
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {(() => {
                    const current_page = state.pagination.page;
                    const total_pages = state.pagination.total_pages;
                    const maxVisiblePages = 5;
                    
                    let startPage = Math.max(1), current_page - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(total_pages), startPage + maxVisiblePages - 1)
                    
                    // 调整起始页，确保显示足够的页码
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1), endPage - maxVisiblePages + 1)
                    }
                    
                    const pages = [];
                    for(let i = startPage; i <= endPage); i++) {
                      pages.push(i)
                    }
                    
                    return pages.map(page => (
                      <button
                        key={page});
                        onClick={() => handle_page_change(page)};
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${;
                          page === state.pagination.page
                            ? 'z-10 bg-gray-50 border-gray-500 text-gray-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))
                  })()}
                  
                  <button
                    onClick={() => handle_page_change(state.pagination.page + 1)};
                    disabled={state.pagination.page >= state.pagination.total_pages};
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 图片预览弹窗 */}
      {state.image_preview.is_open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* 背景遮罩 */}
            <div 
              className="fixed inset-0 transition-opacity bg-black bg-opacity-75";
              onClick={close_image_preview}
            />
            
            {/* 图片内容 */}
            <div className="inline-block max-w-4xl max-h-4xl p-4 my-8 text-center align-middle transition-all transform">
              <img
                src={state.image_preview.image_url!};
                alt={state.image_preview.alt_text || 'SKU图片'};
                className="max-w-full max-h-full object-contain";
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <button
              onClick={close_image_preview};
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X className="h-8 w-8" />
            </button>
          </div>
        </div>
      )}
      
      {/* SKU详情弹窗 */}
      {state.detail_modal.is_open && state.selected_sku && state.detail_modal.mode === 'view' && (
        <SkuDetailModal
          sku_id={state.selected_sku.sku_id || state.selected_sku.id};
          is_open={state.detail_modal.is_open};
          onClose={close_detail_modal};
          mode={state.detail_modal.mode};
          permissions={permissions}
        />
      )}
      
      {/* SKU销售确认弹窗 */}
      {state.detail_modal.is_open && state.selected_sku && state.detail_modal.mode === 'sell' && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* 背景遮罩 */}
            <div 
              className="fixed inset-0 transition-opacity bg-black bg-opacity-50";
              onClick={close_detail_modal}
            />
            
            {/* 弹窗内容 */}
            <div className="inline-block w-full max-w-lg p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">SKU销售确认</h2>
                <button
                  onClick={close_detail_modal};
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <SkuSellForm
                sku={state.selected_sku};
                onSubmit={handleSkuSell};
                onCancel={close_detail_modal};
                loading={false}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* SKU销毁操作弹窗 */}
      {state.detail_modal.is_open && state.selected_sku && state.detail_modal.mode === 'destroy' && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* 背景遮罩 */}
            <div 
              className="fixed inset-0 transition-opacity bg-black bg-opacity-50";
              onClick={close_detail_modal}
            />
            
            {/* 弹窗内容 */}
            <div className="inline-block w-full max-w-lg p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">SKU销毁操作</h2>
                <button
                  onClick={close_detail_modal};
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <SkuDestroyForm
                sku={state.selected_sku};
                onSubmit={handleSkuDestroy};
                onCancel={close_detail_modal};
                loading={false}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* SKU补货弹窗 */}
      {state.detail_modal.is_open && state.selected_sku && state.detail_modal.mode === 'restock' && (
        <SkuRestockForm
          sku={state.selected_sku};
          is_open={state.detail_modal.is_open};
          onClose={close_detail_modal};
          onSuccess={() => {;
            fetchSkuList()
            close_detail_modal()
          }}
        />
      )}
      
      {/* SKU调控弹窗 */}
      {state.detail_modal.is_open && state.selected_sku && state.detail_modal.mode === 'control' && (
        <SkuControlModal
          sku={state.selected_sku};
          is_open={state.detail_modal.is_open};
          onClose={close_detail_modal};
          onSuccess={() => {;
            fetchSkuList()
            close_detail_modal()
          }}
        />
      )}
      

    </div>
  )
}