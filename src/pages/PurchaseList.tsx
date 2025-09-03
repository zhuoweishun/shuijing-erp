import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Eye, 
  Edit, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,

  Package,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useDeviceDetection } from '../hooks/useDeviceDetection'
import { useAuth } from '../hooks/useAuth'
import { purchaseApi, supplierApi, fixImageUrl } from '../services/api'
import { Purchase } from '../types'
import PermissionWrapper from '../components/PermissionWrapper'
import PurchaseDetailModal from '../components/PurchaseDetailModal'
import Portal from '../components/Portal'

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


// 扩展Window接口以支持临时位置存储
declare global {
  interface Window {
    tempFilterPosition?: {
      column: string
      top: number
      left: number
    }
  }
}

interface PurchaseListState {
  purchases: Purchase[]
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
    purchaseCodeSearch: string
    quality: string[]
    startDate: string
    endDate: string
    supplier: string[]
    diameterMin: string
    diameterMax: string
    specificationMin: string
    specificationMax: string
    quantityMin: string
    quantityMax: string
    price_per_gram_min: string
    price_per_gram_max: string
    totalPriceMin: string
    totalPriceMax: string
    product_types: string[]
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
  // 详情弹窗状态
  detail_modal: {
    isOpen: boolean
    purchase_id: string | null
    edit_mode?: boolean
  }
  // 图片预览弹窗状态
  image_preview: {
    isOpen: boolean
    image_url: string | null
    alt_text: string | null
  }
}

export default function PurchaseList() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { isMobile } = useDeviceDetection()
  
  // 格式化产品类型
  const formatProductType = (productType?: string) => {
    const typeMap = {
      'LOOSE_BEADS': '散珠',
      'BRACELET': '手串',
      'ACCESSORIES': '饰品配件',
      'FINISHED': '成品'
    }
    return typeMap[productType as keyof typeof typeMap] || '手串'
  }
  
  // 格式化规格
  const formatSpecification = (purchase: Purchase) => {
    if (purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'BRACELET') {
      // 确保bead_diameter是数字类型
      const diameter = typeof purchase.bead_diameter === 'object' 
        ? (purchase.bead_diameter as any)?.value || (purchase.bead_diameter as any)?.diameter || 0
        : purchase.bead_diameter
      return diameter ? `${diameter}mm` : '-'
    } else {
      // 确保specification是数字类型
      const spec = typeof purchase.specification === 'object'
        ? (purchase.specification as any)?.value || (purchase.specification as any)?.specification || 0
        : purchase.specification
      return spec ? `${spec}mm` : '-'
    }
  }
  
  // 格式化数量
  const formatQuantity = (purchase: Purchase) => {
    switch (purchase.product_type) {
      case 'LOOSE_BEADS':
        return purchase.piece_count ? `${purchase.piece_count}颗` : '-'
      case 'BRACELET':
        return purchase.quantity ? `${purchase.quantity}条` : '-'
      case 'ACCESSORIES':
        return purchase.piece_count ? `${purchase.piece_count}片` : '-'
      case 'FINISHED':
        return purchase.piece_count ? `${purchase.piece_count}件` : '-'
      default:
        return purchase.quantity ? `${purchase.quantity}条` : '-'
    }
  }
  
  const [state, setState] = useState<PurchaseListState>({
    purchases: [],
    loading: true,
    error: null,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      total_pages: 0
    },
    filters: {
      search: '',
      purchaseCodeSearch: '', // 采购编号搜索
      quality: ['AA', 'A', 'AB', 'B', 'C', 'UNKNOWN'], // 默认全选状态
      supplier: [] as string[], // 将在获取供应商数据后设置为全选
      product_types: ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED'], // 全选状态
      
      // 日期范围
      startDate: '',
      endDate: '',
      
      // 数值范围筛选
      diameterMin: '',
      diameterMax: '',
      specificationMin: '',
      specificationMax: '',
      quantityMin: '',
      quantityMax: '',
      price_per_gram_min: '',
      price_per_gram_max: '',
      totalPriceMin: '',
      totalPriceMax: ''
    },
    sorting: { purchase_date: 'desc' }, // 默认按采购日期降序排列
    columnFilters: {
      purchaseCode: { visible: false, type: 'search' }, // 采购编号：搜索功能
      productName: { visible: false, type: 'search' }, // 产品名称：搜索功能
      product_type: { visible: false, type: 'multiSelect' }, // 产品类型：多选功能
      specification: { visible: false, type: 'sortAndRange' }, // 规格：排序和范围筛选
      quality: { visible: false, type: 'multiSelect' }, // 品相：多选功能
      supplier: { visible: false, type: 'multiSelect' }, // 供应商：多选功能
      beadDiameter: { visible: false, type: 'sortAndRange' }, // 珠径：排序和范围筛选
      quantity: { visible: false, type: 'sort' }, // 数量：排序功能
      pricePerGram: { visible: false, type: 'sortAndRange' }, // 克价：排序和范围筛选
      totalPrice: { visible: false, type: 'sortAndRange' }, // 总价：排序和范围筛选
      purchaseDate: { visible: false, type: 'sortAndRange' } // 采购日期：排序功能和日期范围
    },
    detail_modal: {
      isOpen: false,
      purchase_id: null,
      edit_mode: false
    },
    image_preview: {
      isOpen: false,
      image_url: null,
      alt_text: null
    }
  })
  

  const [supplierSearchTerm, setSupplierSearchTerm] = useState('')
  const [allSuppliers, setAllSuppliers] = useState<string[]>([]) // 存储所有供应商数据

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



  // 获取采购列表
  const fetchPurchases = async (customParams?: any) => {
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
      if (filters.purchaseCodeSearch) params.purchase_code_search = filters.purchaseCodeSearch
      // 品相筛选：支持多选，将'UNKNOWN'映射为null
      // 只有当品相数组不为空时才发送quality参数
      if (filters.quality !== undefined && filters.quality.length > 0) {
        const qualityParams = filters.quality
          .map((q: string) => q === 'UNKNOWN' ? null : q)
          .filter((q: string | null) => q !== undefined && q !== '') // 保留null值，只过滤undefined和空字符串
        
        // 只有当过滤后的数组不为空时才发送参数
        if (qualityParams.length > 0) {
          params.quality = qualityParams
          console.log('品相筛选参数:', params.quality) // 调试信息
        }
      }
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate
      // 添加日期参数调试日志
      if (filters.startDate || filters.endDate) {
        console.log('日期筛选参数:', {
          startDate: filters.startDate,
          endDate: filters.endDate,
          params: { startDate: params.startDate, endDate: params.endDate }
        })
      }
      // 供应商筛选：支持多选
      if (filters.supplier && filters.supplier.length > 0) {
        params.supplier = filters.supplier
      }
      if (filters.diameterMin) params.diameter_min = filters.diameterMin
      if (filters.diameterMax) params.diameter_max = filters.diameterMax
      if (filters.specificationMin) params.specification_min = filters.specificationMin
      if (filters.specificationMax) params.specification_max = filters.specificationMax
      if (filters.quantityMin) params.quantity_min = filters.quantityMin
      if (filters.quantityMax) params.quantity_max = filters.quantityMax
      if (filters.price_per_gram_min) params.price_per_gram_min = filters.price_per_gram_min
      if (filters.price_per_gram_max) params.price_per_gram_max = filters.price_per_gram_max
      if (filters.totalPriceMin) params.total_price_min = filters.totalPriceMin
      if (filters.totalPriceMax) params.total_price_max = filters.totalPriceMax
      // 产品类型筛选：如果数组为空，发送空数组表示不显示任何结果
      if (filters.product_types !== undefined) {
        params.product_types = filters.product_types
      }
      
      // 构建排序参数
      const sortingEntries = Object.entries(sorting).filter(([_, order]) => order !== null)
      if (sortingEntries.length > 0) {
        const [field, order] = sortingEntries[0]
        const fieldMapping: { [key: string]: string } = {
          'purchase_date': 'purchase_date',
          'purchaseCode': 'purchase_code', // 修复：前端使用purchaseCode，后端期望purchase_code
          'purchase_code': 'purchase_code',
          'product_name': 'product_name',
          'specification': 'specification',
          'supplier': 'supplier',
          'quantity': 'quantity',
          'pricePerGram': 'price_per_gram',
          'totalPrice': 'total_price',
          'bead_diameter': 'bead_diameter',
          'purchaseDate': 'purchase_date'
        }
        params.sortBy = fieldMapping[field] || field
        params.sortOrder = order
      }
      
      const response = await purchaseApi.list(params)
      
      if (response.success && response.data) {
        const data = response.data as any
        setState(prev => ({
          ...prev,
          purchases: data.purchases || [],
          pagination: {
            ...prev.pagination,
            page: data.pagination?.page || 1,
            limit: data.pagination?.limit || 10,
            total: data.pagination?.total || 0,
            total_pages: data.pagination?.pages || 0
          },
          loading: false
        }))
      } else {
        setState(prev => ({
          ...prev,
          error: response.message || '获取数据失败',
          loading: false
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取采购列表失败'
      }))
    }
  }

  // 获取所有供应商数据（用于筛选）
  const fetchAllSuppliers = async () => {
    try {
      const response = await supplierApi.getAll()
      if (response.success && response.data) {
        // 处理API返回的数据结构：{suppliers: [...], pagination: {...}}
        let suppliersList: Array<{id: string, name: string}> = []
        
        if ((response.data as any).suppliers && Array.isArray((response.data as any).suppliers)) {
          // 新的API格式：{suppliers: [...], pagination: {...}}
          suppliersList = (response.data as any).suppliers
        } else if (Array.isArray(response.data)) {
          // 旧的API格式：直接返回数组
          suppliersList = response.data as Array<{id: string, name: string}>
        }
        
        const supplierNames = suppliersList
          .map(s => s.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b)) // 按A-Z排序
        setAllSuppliers(supplierNames)
        
        // 设置供应商筛选为全选状态（默认行为）
        setState(prev => ({
          ...prev,
          filters: {
            ...prev.filters,
            supplier: supplierNames // 默认全选所有供应商
          }
        }))
      }
    } catch (error) {
      console.error('获取供应商列表失败:', error)
    }
  }

  // 初始加载（仅在组件首次挂载时加载）
  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases()
      fetchAllSuppliers() // 同时获取所有供应商数据
    }
  }, [isAuthenticated])
  
  // 监听分页变化，确保页码和每页条数变化时重新获取数据
  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases()
    }
  }, [state.pagination.page, state.pagination.limit, isAuthenticated])
  
  // 移除自动触发机制，恢复手动点击"应用"按钮的交互方式

  // 实时筛选应用
  const applyFiltersImmediately = (newFilters: any, newSorting?: any) => {
    const searchParams = {
      filters: newFilters,
      sorting: newSorting || state.sorting,
      pagination: { ...state.pagination, page: 1 }
    }
    
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page: 1 }
    }))
    
    // 使用防抖来避免频繁请求
    setTimeout(() => {
      fetchPurchases(searchParams)
    }, 300)
  }



  // 重置筛选
  const handleReset = () => {
    const new_state = {
      filters: {
        search: '',
        purchaseCodeSearch: '',
        quality: [] as string[],
        supplier: [],
        product_types: [],
        startDate: '',
        endDate: '',
        diameterMin: '',
        diameterMax: '',
        specificationMin: '',
        specificationMax: '',
        quantityMin: '',
        quantityMax: '',
        price_per_gram_min: '',
        price_per_gram_max: '',
        totalPriceMin: '',
        totalPriceMax: ''
      },
      sorting: { purchase_date: 'desc' as 'desc' },
      pagination: { ...state.pagination, page: 1 }
    }
    
    setState(prev => ({
      ...prev,
      ...new_state
    }))
    
    setTimeout(() => fetchPurchases(new_state), 50)
  }
  
  // 处理排序
  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setState(prev => {
      // 确保同时只能有一个字段排序
      const newSorting: { [key: string]: 'asc' | 'desc' | null } = {
        [field]: order
      }
      
      const new_state = {
        ...prev,
        sorting: newSorting,
        pagination: { ...prev.pagination, page: 1 }
      }
      
      // 立即调用API应用排序，保留现有筛选条件
      applyFiltersImmediately(prev.filters, newSorting)
      
      return new_state
    })
  }
  
  // 切换列筛选器显示
  const toggleColumnFilter = (column: string) => {
    setState(prev => {
      const newVisible = !prev.columnFilters[column]?.visible
      return {
        ...prev,
        columnFilters: {
          ...prev.columnFilters,
          [column]: {
            ...prev.columnFilters[column],
            visible: newVisible
          }
        }
      }
    })
    
    // 如果是打开筛选框，立即计算位置
    const isOpening = !state.columnFilters[column]?.visible
    if (isOpening) {
      updateFilterPosition(column)
    }
  }
  

  


  // 分页处理
  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    }))
  }

  // 弹窗控制
  const openDetailModal = (purchase_id: string) => {
    setState(prev => ({
      ...prev,
      detail_modal: {
        isOpen: true,
        purchase_id: purchase_id,
        edit_mode: false
      }
    }))
  }

  const closeDetailModal = () => {
    setState(prev => ({
      ...prev,
      detail_modal: {
        isOpen: false,
        purchase_id: null,
        edit_mode: false
      }
    }))
  }

  // 图片预览控制
  const openImagePreview = (image_url: string, alt_text: string) => {
    setState(prev => ({
      ...prev,
      image_preview: {
        isOpen: true,
        image_url: fixImageUrl(image_url),
        alt_text
      }
    }))
  }

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

  // 编辑处理
  const handleEdit = (purchase_id: string) => {
    // 打开详情弹窗并进入编辑模式
    setState(prev => ({
      ...prev,
      detail_modal: {
        isOpen: true,
        purchase_id: purchase_id,
        edit_mode: true
      }
    }))
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  // 格式化价格
  const formatPrice = (price: number | string | null | undefined, showSensitive: boolean = true, treatNullAsZero: boolean = false) => {
    if (price === null || price === undefined || price === '') {
      if (treatNullAsZero) {
        return showSensitive ? '¥0.0' : '不可见'
      }
      return showSensitive ? '-' : '不可见'
    }
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(numPrice)) {
      if (treatNullAsZero) {
        return showSensitive ? '¥0.0' : '不可见'
      }
      return showSensitive ? '-' : '不可见'
    }
    return `¥${numPrice.toFixed(1)}`
  }

  // 格式化重量
  const formatWeight = (weight: number | string | null | undefined) => {
    if (weight === null || weight === undefined || weight === '') {
      return '-'
    }
    const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight
    if (isNaN(numWeight)) return '-'
    return `${numWeight.toFixed(1)}g`
  }
  
  // 格式化敏感价格字段
  const formatSensitivePrice = (price: number | string | null | undefined, treatNullAsZero: boolean = false) => {
    if (user?.role === 'EMPLOYEE') {
      return '-'
    }
    return formatPrice(price, true, treatNullAsZero)
  }

  // 移除调试函数以减少不必要的网络请求

  // 移除自动调试代码以避免不必要的网络请求



  // 格式化品相
  const formatQuality = (quality: string | undefined | null) => {
    // 品质值处理
    
    // 处理各种空值情况
    if (quality === null || quality === undefined || quality === '' || quality === 'null' || quality === 'undefined') {
      // 品质为空值
      return '未知'
    }
    
    // 确保quality是有效的枚举值
    const validQualities = ['AA', 'A', 'AB', 'B', 'C']
    const normalizedQuality = String(quality).trim().toUpperCase()
    
    if (!validQualities.includes(normalizedQuality)) {
      // 品质值无效
      return '未知'
    }
    
    // 品质值正常
    return `${normalizedQuality}级`
  }
  
  // 获取唯一的供应商列表（按A-Z排序）- 修复：基于全部数据而非当前页
  const getUniqueSuppliers = (searchTerm: string = '') => {
    return allSuppliers
      .filter(supplier => 
        searchTerm === '' || 
        (supplier && supplier.toLowerCase().includes(searchTerm.toLowerCase()))
      )
  }
  
  // 筛选框位置状态管理
  const [filterPositions, setFilterPositions] = useState<{[key: string]: {top: number, left: number}}>({})
  
  // 计算筛选框位置的缓存函数
  const getFilterPosition = useCallback((column: string) => {
    const buttonElement = document.querySelector(`[data-filter-column="${column}"]`) as HTMLButtonElement
    if (!buttonElement) return { top: 0, left: 0 }
    
    const rect = buttonElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const filterWidth = 300 // 筛选框最大宽度
    const filterHeight = 400 // 筛选框预估高度
    
    let top = rect.bottom + 4 // 在按钮下方4px
    let left = rect.left // 与按钮左对齐
    
    // 边界检测：防止筛选框超出视口右边界
    if (left + filterWidth > viewportWidth) {
      left = viewportWidth - filterWidth - 10
    }
    
    // 边界检测：防止筛选框超出视口下边界
    if (top + filterHeight > viewportHeight) {
      top = rect.top - filterHeight - 4 // 显示在按钮上方
    }
    
    // 确保不超出视口左边界
    if (left < 10) {
      left = 10
    }
    
    // 确保不超出视口上边界
    if (top < 10) {
      top = 10
    }
    
    return { top, left }
  }, [])
  
  // 更新筛选框位置
  const updateFilterPosition = useCallback((column: string) => {
    setTimeout(() => {
      const position = getFilterPosition(column)
      setFilterPositions(prev => ({
        ...prev,
        [column]: position
      }))
    }, 10) // 延迟10ms确保DOM已更新
  }, [getFilterPosition])
  
  // 监听筛选状态变化，重新计算位置
  useEffect(() => {
    Object.keys(state.columnFilters).forEach(column => {
      if (state.columnFilters[column]?.visible) {
        updateFilterPosition(column)
      }
    })
  }, [state.filters, state.columnFilters, updateFilterPosition])
  
  // 渲染列头筛选器（按照文档3.6节规范实现）
  const renderColumnFilter = (column: string, title: string) => {
    const filter = state.columnFilters[column]
    
    if (!filter) {
      return null
    }
    
    const position = filter.visible ? (filterPositions[column] || { top: 0, left: 0 }) : { top: 0, left: 0 }
    
    return (
      <div className="relative inline-block">
        <button
          data-filter-column={column}
          onClick={() => toggleColumnFilter(column)}
          className="filter-trigger ml-1 p-1 hover:bg-gray-100 rounded"
        >
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
        
        {filter.visible && (
          <Portal>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
              onClick={() => toggleColumnFilter(column)}
            />
            <div 
              className="filter-panel fixed bg-white border border-gray-200 rounded-lg shadow-xl min-w-[200px] max-w-[300px] p-3 z-[9999]"
              style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                minWidth: '200px',
                maxWidth: '300px',
                padding: '12px'
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
            {/* 关闭按钮 */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{title}筛选</span>
              <button
                onClick={() => toggleColumnFilter(column)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            {/* 排序功能 */}
            {(filter.type === 'sort' || filter.type === 'sortAndRange') && (
              <div className="mb-3 pb-3 border-b border-gray-100">
                <div className="text-xs text-gray-500 mb-2">排序</div>
                <div className="flex space-x-1">
                  <button 
                    onClick={() => handleSort(column, 'asc')}
                    className={`px-2 py-1 text-xs rounded ${
                      state.sorting[column] === 'asc'
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    升序
                  </button>
                  <button 
                    onClick={() => handleSort(column, 'desc')}
                    className={`px-2 py-1 text-xs rounded ${
                      state.sorting[column] === 'desc'
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    降序
                  </button>
                </div>
              </div>
            )}
            
            {/* 搜索功能 */}
            {filter.type === 'search' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder={`搜索${title}...`}
                    value={column === 'purchaseCode' ? state.filters.purchaseCodeSearch : 
                           column === 'productName' ? state.filters.search : ''}
                    onChange={(e) => {
                      let newFilters;
                      if (column === 'purchaseCode') {
                        newFilters = { ...state.filters, purchaseCodeSearch: e.target.value }
                      } else if (column === 'productName') {
                        newFilters = { ...state.filters, search: e.target.value }
                      } else {
                        return;
                      }
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      }))
                      // 移除实时搜索，只更新状态不立即应用
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        applyFiltersImmediately(state.filters)
                      }
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={() => {
                      applyFiltersImmediately(state.filters)
                    }}
                    className="px-2 py-1 text-xs text-blue-500 hover:text-blue-700 border border-blue-300 rounded"
                  >
                    应用
                  </button>
                  {((column === 'purchaseCode' && state.filters.purchaseCodeSearch) || 
                    (column === 'productName' && state.filters.search)) && (
                    <button
                      onClick={() => {
                        let newFilters;
                        if (column === 'purchaseCode') {
                          newFilters = { ...state.filters, purchaseCodeSearch: '' }
                        } else if (column === 'productName') {
                          newFilters = { ...state.filters, search: '' }
                        } else {
                          return;
                        }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        }))
                        applyFiltersImmediately(newFilters)
                      }}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* 品相多选功能 */}
            {filter.type === 'multiSelect' && column === 'quality' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">品相选择</div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const allQualities = ['AA', 'A', 'AB', 'B', 'C', 'UNKNOWN'];
                        let newFilters;
                        if (state.filters.quality.length === allQualities.length) {
                          // 当前全选状态，点击变为全不选
                          newFilters = { ...state.filters, quality: [] };
                        } else {
                          // 当前非全选状态，点击变为全选
                          newFilters = { ...state.filters, quality: allQualities };
                        }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        }));
                        applyFiltersImmediately(newFilters);
                        // 状态变化后重新计算位置
                        setTimeout(() => updateFilterPosition(column), 50);
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      {state.filters.quality.length === 6 ? '取消全选' : '全选'}
                    </button>
                    {state.filters.quality.length > 0 && (
                      <button
                        onClick={() => {
                          const newFilters = { ...state.filters, quality: [] };
                          setState(prev => ({
                            ...prev,
                            filters: newFilters
                          }));
                          applyFiltersImmediately(newFilters);
                          // 状态变化后重新计算位置
                          setTimeout(() => updateFilterPosition(column), 50);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  {[
                    { value: 'AA', label: 'AA级' },
                    { value: 'A', label: 'A级' },
                    { value: 'AB', label: 'AB级' },
                    { value: 'B', label: 'B级' },
                    { value: 'C', label: 'C级' },
                    { value: 'UNKNOWN', label: '未知' }
                  ].map(quality => (
                    <label key={quality.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.filters.quality.includes(quality.value)}
                        onChange={(e) => {
                          const newQualities = e.target.checked
                            ? [...state.filters.quality, quality.value]
                            : state.filters.quality.filter(q => q !== quality.value)
                          const newFilters = { ...state.filters, quality: newQualities }
                          setState(prev => ({
                            ...prev,
                            filters: newFilters
                          }))
                          applyFiltersImmediately(newFilters)
                          // 状态变化后重新计算位置
                          setTimeout(() => updateFilterPosition(column), 50)
                        }}
                        className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                      />
                      <span className="text-sm text-gray-700">{quality.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {/* 供应商多选功能 */}
            {filter.type === 'multiSelect' && column === 'supplier' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">供应商选择</div>
                  {state.filters.supplier.length > 0 && (
                    <button
                      onClick={() => {
                        const newFilters = { ...state.filters, supplier: [] }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        }))
                        applyFiltersImmediately(newFilters)
                        // 状态变化后重新计算位置
                        setTimeout(() => updateFilterPosition(column), 50)
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      清除
                    </button>
                  )}
                </div>
                
                {/* 搜索输入框 */}
                <input
                  type="text"
                  placeholder="搜索供应商..."
                  value={supplierSearchTerm}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                  onChange={(e) => {
                    setSupplierSearchTerm(e.target.value)
                  }}
                />
                
                {/* 供应商多选列表 */}
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {getUniqueSuppliers('').map(supplier => (
                    <label key={supplier} className="flex items-center space-x-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={state.filters.supplier.includes(supplier)}
                        onChange={(e) => {
                          const newSuppliers = e.target.checked
                            ? [...state.filters.supplier, supplier]
                            : state.filters.supplier.filter(s => s !== supplier)
                          const newFilters = { ...state.filters, supplier: newSuppliers }
                          setState(prev => ({
                            ...prev,
                            filters: newFilters
                          }))
                          applyFiltersImmediately(newFilters)
                          // 状态变化后重新计算位置
                          setTimeout(() => updateFilterPosition(column), 50)
                        }}
                        className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                      />
                      <span className="text-gray-700">{supplier}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {/* 产品类型多选功能 */}
            {filter.type === 'multiSelect' && column === 'product_type' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">产品类型</div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const allTypes = ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED'];
                        let newFilters;
                        if (state.filters.product_types.length === allTypes.length) {
                          // 当前全选状态，点击变为全不选
                          newFilters = { ...state.filters, product_types: [] };
                        } else {
                          // 当前非全选状态，点击变为全选
                          newFilters = { ...state.filters, product_types: allTypes };
                        }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        }));
                        applyFiltersImmediately(newFilters);
                        // 状态变化后重新计算位置
                        setTimeout(() => updateFilterPosition(column), 50);
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      {state.filters.product_types.length === 4 ? '取消全选' : '全选'}
                    </button>
                    {state.filters.product_types.length > 0 && state.filters.product_types.length < 4 && (
                      <button
                        onClick={() => {
                          const newFilters = { ...state.filters, product_types: ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED'] };
                          setState(prev => ({
                            ...prev,
                            filters: newFilters
                          }));
                          applyFiltersImmediately(newFilters);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {[
                    { value: 'LOOSE_BEADS', label: '散珠' },
                    { value: 'BRACELET', label: '手串' },
                    { value: 'ACCESSORIES', label: '饰品配件' },
                    { value: 'FINISHED', label: '成品' }
                  ].map(type => (
                    <label key={type.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={state.filters.product_types.includes(type.value)}
                        onChange={(e) => {
                          let newFilters;
                          if (e.target.checked) {
                            // 选中：添加到包含列表
                            newFilters = {
                              ...state.filters,
                              product_types: [...state.filters.product_types, type.value]
                            };
                          } else {
                            // 取消选中：从包含列表中移除
                            newFilters = {
                              ...state.filters,
                              product_types: state.filters.product_types.filter(t => t !== type.value)
                            };
                          }
                          setState(prev => ({
                            ...prev,
                            filters: newFilters
                          }));
                          applyFiltersImmediately(newFilters);
                          // 状态变化后重新计算位置
                          setTimeout(() => updateFilterPosition(column), 50);
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {/* 珠径范围筛选功能 */}
            {(filter.type === 'sortAndRange') && column === 'beadDiameter' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">珠径范围(mm)</div>
                  {(state.filters.diameterMin || state.filters.diameterMax) && (
                    <button
                    onClick={() => {
                      const newFilters = { ...state.filters, diameterMin: '', diameterMax: '' }
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      }))
                      applyFiltersImmediately(newFilters)
                      toggleColumnFilter('beadDiameter')
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    清除
                  </button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="最小值"
                    value={state.filters.diameterMin}
                    onChange={(e) => {
                      const newFilters = { ...state.filters, diameterMin: e.target.value }
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      }))
                      applyFiltersImmediately(newFilters)
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-gray-400 self-center">-</span>
                  <input
                    type="number"
                    placeholder="最大值"
                    value={state.filters.diameterMax}
                    onChange={(e) => {
                      const newFilters = { ...state.filters, diameterMax: e.target.value }
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      }))
                      applyFiltersImmediately(newFilters)
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            )}
            
            {/* 规格范围筛选功能 */}
            {(filter.type === 'sortAndRange') && column === 'specification' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">规格范围</div>
                </div>
                <div className="flex space-x-1 items-center">
                  <input
                    type="number"
                    placeholder="最小"
                    value={state.filters.specificationMin}
                    onChange={(e) => {
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, specificationMin: e.target.value }
                      }))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                  <span className="text-gray-400 text-xs">-</span>
                  <input
                    type="number"
                    placeholder="最大"
                    value={state.filters.specificationMax}
                    onChange={(e) => {
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, specificationMax: e.target.value }
                      }))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      const newFilters = { ...state.filters }
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      }))
                      applyFiltersImmediately(newFilters)
                      toggleColumnFilter('specification')
                    }}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    应用
                  </button>
                  <button
                    onClick={() => {
                      const newFilters = { ...state.filters, specificationMin: '', specificationMax: '' }
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      }))
                      applyFiltersImmediately(newFilters)
                      toggleColumnFilter('specification')
                    }}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    清除
                  </button>
                </div>
              </div>
            )}
            
            {/* 克价范围筛选功能 */}
            {(filter.type === 'sortAndRange') && column === 'pricePerGram' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">克价范围(元/克)</div>
                </div>
                <div className="flex space-x-1 items-center">
                  <input
                    type="number"
                    placeholder="最小"
                    value={state.filters.price_per_gram_min}
                    onChange={(e) => {
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, price_per_gram_min: e.target.value }
                      }))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                  <span className="text-gray-400 text-xs">-</span>
                  <input
                    type="number"
                    placeholder="最大"
                    value={state.filters.price_per_gram_max}
                    onChange={(e) => {
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, price_per_gram_max: e.target.value }
                      }))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      const newFilters = { ...state.filters }
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      }))
                      applyFiltersImmediately(newFilters)
                      toggleColumnFilter('pricePerGram')
                    }}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    应用
                  </button>
                  <button
                    onClick={() => {
                      const newFilters = { ...state.filters, price_per_gram_min: '', price_per_gram_max: '' }
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      }))
                      applyFiltersImmediately(newFilters)
                      toggleColumnFilter('pricePerGram')
                    }}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    清除
                  </button>
                </div>
              </div>
            )}
            
            {/* 总价范围筛选功能 */}
            {(filter.type === 'sortAndRange') && column === 'totalPrice' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">总价范围(元)</div>
                </div>
                <div className="flex space-x-1 items-center">
                  <input
                    type="number"
                    placeholder="最小"
                    value={state.filters.totalPriceMin}
                    onChange={(e) => {
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, totalPriceMin: e.target.value }
                      }))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                  <span className="text-gray-400 text-xs">-</span>
                  <input
                    type="number"
                    placeholder="最大"
                    value={state.filters.totalPriceMax}
                    onChange={(e) => {
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, totalPriceMax: e.target.value }
                      }))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      const newFilters = { ...state.filters }
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      }))
                      applyFiltersImmediately(newFilters)
                      toggleColumnFilter('totalPrice')
                    }}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    应用
                  </button>
                  <button
                    onClick={() => {
                      const newFilters = { ...state.filters, totalPriceMin: '', totalPriceMax: '' }
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      }))
                      applyFiltersImmediately(newFilters)
                      toggleColumnFilter('totalPrice')
                    }}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    清除
                  </button>
                </div>
              </div>
            )}
            
            {/* 日期范围筛选功能 */}
            {column === 'purchaseDate' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">日期范围</div>
                  {(state.filters.startDate || state.filters.endDate) && (
                    <button
                      onClick={() => {
                        const newFilters = { ...state.filters, startDate: '', endDate: '' }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        }))
                        applyFiltersImmediately(newFilters)
                        toggleColumnFilter('purchaseDate')
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      清除
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="date"
                    placeholder="开始日期"
                    value={state.filters.startDate}
                    onChange={(e) => {
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, startDate: e.target.value }
                      }))
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="date"
                    placeholder="结束日期"
                    value={state.filters.endDate}
                    onChange={(e) => {
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, endDate: e.target.value }
                      }))
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => {
                        applyFiltersImmediately(state.filters)
                        toggleColumnFilter('purchaseDate')
                      }}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      应用
                    </button>
                    <button
                      onClick={() => {
                        const newFilters = { ...state.filters, startDate: '', endDate: '' }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        }))
                        applyFiltersImmediately(newFilters)
                        toggleColumnFilter('purchaseDate')
                      }}
                      className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      清除
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </Portal>
        )}
      </div>
    )
  }


  // 电脑端表格视图
  const renderDesktopTable = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200" style={{ overflow: 'visible', position: 'relative' }}>
      <div className="overflow-x-auto" style={{ overflowY: 'visible', position: 'static' }}>
        <table className="table-apple" style={{ tableLayout: 'fixed', minWidth: '1400px' }}>
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                <div className="flex items-center">
                  采购编号
                  {renderColumnFilter('purchaseCode', '采购编号')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '180px' }}>
                <div className="flex items-center">
                  产品名称
                  {renderColumnFilter('productName', '产品名称')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                <div className="flex items-center">
                  产品类型
                  {renderColumnFilter('product_type', '产品类型')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>
                <div className="flex items-center">
                  规格
                  {renderColumnFilter('specification', '规格')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>
                <div className="flex items-center">
                  品相
                  {renderColumnFilter('quality', '品相')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>
                <div className="flex items-center">
                  数量
                  {renderColumnFilter('quantity', '数量')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                <div className="flex items-center">
                  克价
                  {user?.role === 'BOSS' && renderColumnFilter('pricePerGram', '克价')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                <div className="flex items-center">
                  总价
                  {renderColumnFilter('totalPrice', '总价')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>
                重量(g)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                <div className="flex items-center">
                  供应商
                  {user?.role === 'BOSS' && renderColumnFilter('supplier', '供应商')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                <div className="flex items-center">
                  采购日期
                  {renderColumnFilter('purchaseDate', '采购日期')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {state.purchases.map((purchase) => {
              return (
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style={{ width: '120px' }}>
                     {purchase.purchase_code}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap" style={{ width: '180px' }}>
                     <div className="flex items-center space-x-3">
                       {getFirstPhotoUrl(purchase.photos) && (
                         <img 
                           src={getFirstPhotoUrl(purchase.photos)!} 
                           alt={purchase.product_name}
                           className="w-8 h-12 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                           onClick={() => {
                             const photoUrl = getFirstPhotoUrl(purchase.photos)
                             if (photoUrl) openImagePreview(photoUrl, purchase.product_name)
                           }}
                         />
                       )}
                       <div className="text-sm font-medium text-gray-900 truncate">{purchase.product_name}</div>
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '100px' }}>
                     {formatProductType(purchase.product_type)}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '80px' }}>
                     {formatSpecification(purchase)}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '80px' }}>
                     {formatQuality(purchase.quality)}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '80px' }}>
                     {formatQuantity(purchase)}
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '100px' }}>
                    {formatSensitivePrice(purchase.price_per_gram, true)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '100px' }}>
                    {formatSensitivePrice(purchase.total_price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '80px' }}>
                    {user?.role === 'EMPLOYEE' ? '-' : formatWeight(purchase.weight)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '120px' }}>
                    <div className="truncate">{user?.role === 'BOSS' ? (purchase.supplier?.name || '-') : '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '120px' }}>
                    {formatDate(purchase.purchase_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ width: '100px' }}>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openDetailModal(purchase.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="查看详情"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <PermissionWrapper allowed_roles={['BOSS']}>
                        <button
                          onClick={() => handleEdit(purchase.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="编辑"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </PermissionWrapper>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  // 手机端卡片视图
  const renderMobileCards = () => (
    <div className="space-y-4">
      {state.purchases.map((purchase) => {
        return (
          <div key={purchase.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3 flex-1">
                {getFirstPhotoUrl(purchase.photos) && (
                   <img 
                     src={getFirstPhotoUrl(purchase.photos)!} 
                     alt={purchase.product_name}
                     className="w-12 h-16 object-cover rounded border border-gray-200 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                     onClick={() => {
                       const photoUrl = getFirstPhotoUrl(purchase.photos)
                       if (photoUrl) openImagePreview(photoUrl, purchase.product_name)
                     }}
                   />
                 )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-base">{purchase.product_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{purchase.purchase_code}</p>
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => openDetailModal(purchase.id)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  title="查看详情"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <PermissionWrapper allowed_roles={['BOSS']}>
                  <button
                    onClick={() => handleEdit(purchase.id)}
                    className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
                    title="编辑"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </PermissionWrapper>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                 <span className="text-gray-500">类型:</span>
                 <span className="ml-1 text-gray-900">{formatProductType(purchase.product_type)}</span>
               </div>
              <div>
                <span className="text-gray-500">规格:</span>
                <span className="ml-1 text-gray-900">{formatSpecification(purchase)}</span>
              </div>
              <div>
                <span className="text-gray-500">品相:</span>
                <span className="ml-1 text-gray-900">{formatQuality(purchase.quality)}</span>
              </div>
              <div>
                <span className="text-gray-500">数量:</span>
                <span className="ml-1 text-gray-900">{formatQuantity(purchase)}</span>
              </div>
              <div>
                <span className="text-gray-500">日期:</span>
                <span className="ml-1 text-gray-900">{formatDate(purchase.purchase_date)}</span>
              </div>
            </div>
            
            {purchase.notes && (
              <div className="mt-2 text-sm">
                <span className="text-gray-500">备注:</span>
                <span className="ml-1 text-gray-900">{purchase.notes}</span>
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">克价:</span>
                  <span className="ml-1 text-gray-900">{formatSensitivePrice(purchase.price_per_gram, true)}</span>
                </div>
                <div>
                  <span className="text-gray-500">重量:</span>
                  <span className="ml-1 text-gray-900">{user?.role === 'EMPLOYEE' ? '-' : formatWeight(purchase.weight)}</span>
                </div>
                <div>
                  <span className="text-gray-500">总价:</span>
                  <span className="ml-1 text-gray-900">{formatSensitivePrice(purchase.total_price)}</span>
                </div>
                <div>
                  <span className="text-gray-500">供应商:</span>
                  <span className="ml-1 text-gray-900">
                    {user?.role === 'BOSS' ? (purchase.supplier?.name || '-') : '-'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )
      })}
    </div>
  )

  // 分页组件
  // 处理每页显示条数变化
  const handleLimitChange = (newLimit: number) => {
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        limit: newLimit,
        page: 1 // 重置到第一页
      }
    }))
  }

  const renderPagination = () => {
    // 只有在没有数据时才不显示分页组件
    if (state.pagination.total === 0) return null
    
    return (
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
                value={state.pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
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
                onClick={() => handlePageChange(state.pagination.page - 1)}
                disabled={state.pagination.page <= 1}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => handlePageChange(state.pagination.page + 1)}
                disabled={state.pagination.page >= state.pagination.total_pages}
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
                {Math.min(state.pagination.page * state.pagination.limit, state.pagination.total)}
              </span>{' '}
              条，共 <span className="font-medium">{state.pagination.total}</span> 条记录
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">每页显示:</span>
              <select
                value={state.pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
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
                  onClick={() => handlePageChange(state.pagination.page - 1)}
                  disabled={state.pagination.page <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {Array.from({ length: Math.min(5, state.pagination.total_pages) }, (_, i) => {
                  const page = i + 1
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === state.pagination.page
                          ? 'z-10 bg-gray-50 border-gray-500 text-gray-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
                
                <button
                  onClick={() => handlePageChange(state.pagination.page + 1)}
                  disabled={state.pagination.page >= state.pagination.total_pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Package className="h-8 w-8 text-gray-700" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">采购列表</h1>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/purchase-entry')}
            className="inline-flex items-center px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增采购
          </button>
        </div>
      </div>

      {/* 筛选说明 */}
      <div className="hidden md:flex items-center justify-center bg-white p-3 rounded-xl shadow-sm border border-gray-200">
        <span className="text-sm text-gray-600">表头筛选：点击列标题旁的筛选按钮进行筛选，筛选条件会实时应用</span>
      </div>

      {/* 采购详情弹窗 */}
      <PurchaseDetailModal
        isOpen={state.detail_modal.isOpen}
        onClose={closeDetailModal}
        purchase_id={state.detail_modal.purchase_id}
        edit_mode={state.detail_modal.edit_mode}
        onEdit={handleEdit}
        onDelete={() => {
          // 删除成功后刷新列表
          fetchPurchases()
        }}
        onSave={() => {
          // 保存成功后刷新列表
          fetchPurchases()
        }}
      />

      {/* 手机端高级筛选 */}
      <div className="block md:hidden mb-4">
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
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="搜索产品名称或采购编号..."
                  value={state.filters.search}
                  onChange={(e) => {
                    const newFilters = { ...state.filters, search: e.target.value }
                    setState(prev => ({
                      ...prev,
                      filters: newFilters
                    }))
                    // 移除实时搜索，只更新状态不立即应用
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      applyFiltersImmediately(state.filters)
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
                <button
                  onClick={() => {
                    applyFiltersImmediately(state.filters)
                  }}
                  className="px-3 py-2 text-sm text-blue-500 hover:text-blue-700 border border-blue-300 rounded-lg"
                >
                  应用
                </button>
              </div>
              {state.filters.search && (
                <button
                  onClick={() => {
                    const newFilters = { ...state.filters, search: '' }
                    setState(prev => ({
                      ...prev,
                      filters: newFilters
                    }))
                    applyFiltersImmediately(newFilters)
                  }}
                  className="w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                >
                  清除搜索
                </button>
              )}
            </div>
            
            {/* 产品类型多选框 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">产品类型</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'LOOSE_BEADS', label: '散珠' },
                  { value: 'BRACELET', label: '手串' },
                  { value: 'ACCESSORIES', label: '饰品配件' },
                  { value: 'FINISHED', label: '成品' }
                ].map(type => (
                  <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.filters.product_types.includes(type.value)}
                      onChange={(e) => {
                        const newProductTypes = e.target.checked
                          ? [...state.filters.product_types, type.value]
                          : state.filters.product_types.filter(t => t !== type.value)
                        const newFilters = { ...state.filters, product_types: newProductTypes }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        }))
                        applyFiltersImmediately(newFilters)
                      }}
                      className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-sm text-gray-700">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* 品相多选框 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">品相选择</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'AA', label: 'AA级' },
                  { value: 'A', label: 'A级' },
                  { value: 'AB', label: 'AB级' },
                  { value: 'B', label: 'B级' },
                  { value: 'C', label: 'C级' },
                  { value: 'UNKNOWN', label: '未知' }
                ].map(quality => (
                  <label key={quality.value} className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.filters.quality.includes(quality.value)}
                      onChange={(e) => {
                        const newQualities = e.target.checked
                          ? [...state.filters.quality, quality.value]
                          : state.filters.quality.filter(q => q !== quality.value)
                        const newFilters = { ...state.filters, quality: newQualities }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        }))
                        applyFiltersImmediately(newFilters)
                      }}
                      className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-xs text-gray-700">{quality.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* 排序字段 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">排序</label>
              <select
                value={Object.keys(state.sorting).find(key => state.sorting[key] !== null) || ''}
                onChange={(e) => {
                   // 设置新排序并立即应用
                   if (e.target.value) {
                      const updatedSorting: { [key: string]: 'asc' | 'desc' | null } = { [e.target.value]: 'desc' as 'desc' }
                      setState(prev => ({ ...prev, sorting: updatedSorting }))
                      applyFiltersImmediately(state.filters, updatedSorting)
                    } else {
                      // 清除排序时，传递空的排序对象
                      const emptySorting: { [key: string]: 'asc' | 'desc' | null } = {}
                      setState(prev => ({ ...prev, sorting: emptySorting }))
                      applyFiltersImmediately(state.filters, emptySorting)
                    }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="">排序字段</option>
                <option value="bead_diameter">直径</option>
                <option value="specification">规格</option>
                <option value="quantity">数量</option>
                <option value="purchase_date">日期</option>
              </select>
            </div>
            
            {/* 直径和数量范围 */}
            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                placeholder="最小直径"
                value={state.filters.diameterMin}
                onChange={(e) => {
                  const newFilters = { ...state.filters, diameterMin: e.target.value }
                  setState(prev => ({
                    ...prev,
                    filters: newFilters
                  }))
                  applyFiltersImmediately(newFilters)
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="最大直径"
                value={state.filters.diameterMax}
                onChange={(e) => {
                  const newFilters = { ...state.filters, diameterMax: e.target.value }
                  setState(prev => ({
                    ...prev,
                    filters: newFilters
                  }))
                  applyFiltersImmediately(newFilters)
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="最小数量"
                value={state.filters.quantityMin}
                onChange={(e) => {
                  const newFilters = { ...state.filters, quantityMin: e.target.value }
                  setState(prev => ({
                    ...prev,
                    filters: newFilters
                  }))
                  applyFiltersImmediately(newFilters)
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="最大数量"
                value={state.filters.quantityMax}
                onChange={(e) => {
                  const newFilters = { ...state.filters, quantityMax: e.target.value }
                  setState(prev => ({
                    ...prev,
                    filters: newFilters
                  }))
                  applyFiltersImmediately(newFilters)
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>
            
            {/* 日期范围和排序方向 */}
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={state.filters.startDate}
                onChange={(e) => {
                  setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, startDate: e.target.value }
                  }))
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <input
                type="date"
                value={state.filters.endDate}
                onChange={(e) => {
                  setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, endDate: e.target.value }
                  }))
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <select
                value={Object.values(state.sorting).find(v => v !== null) || ''}
                onChange={(e) => {
                  const sortField = Object.keys(state.sorting).find(key => state.sorting[key] !== null)
                  if (sortField && e.target.value) {
                    const updatedSorting: { [key: string]: 'asc' | 'desc' | null } = { [sortField]: e.target.value as 'asc' | 'desc' }
                    setState(prev => ({ ...prev, sorting: updatedSorting }))
                    applyFiltersImmediately(state.filters, updatedSorting)
                  }
                }}
                disabled={!Object.keys(state.sorting).find(key => state.sorting[key] !== null)}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">排序方向</option>
                <option value="asc">升序</option>
                <option value="desc">降序</option>
              </select>
            </div>
            
            {/* 筛选说明 */}
            <div className="text-xs text-gray-500 text-center py-2">
              日期范围筛选需要在桌面端手动应用，其他筛选条件会自动应用
            </div>
          </div>
        </div>
      </div>

      {/* 加载状态 */}
      {state.loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">加载中...</span>
        </div>
      )}

      {/* 错误状态 */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{state.error}</span>
          </div>
        </div>
      )}



      {/* 未认证状态 */}
      {!isAuthenticated && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800">请先登录后查看采购列表</span>
          </div>
        </div>
      )}

      {/* 数据列表 */}
      {isAuthenticated && !state.loading && !state.error && (
        <>
          {state.purchases.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无采购记录</h3>
              <p className="text-gray-600 mb-4">还没有任何采购记录，点击下方按钮开始添加</p>
              <button
                onClick={() => navigate('/purchase-entry')}
                className="inline-flex items-center px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                新增采购
              </button>
            </div>
          ) : (
            <>
              {isMobile ? renderMobileCards() : renderDesktopTable()}
              {renderPagination()}
            </>
          )}
        </>
      )}

      {/* 图片预览弹窗 */}
      {state.image_preview.isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={closeImagePreview}
        >
          <div 
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
               src={fixImageUrl(state.image_preview.image_url || '')} 
               alt={state.image_preview.alt_text || ''}
               className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl transition-transform duration-300 ease-in-out"
               style={{
                 maxWidth: '90vw',
                 maxHeight: '90vh'
               }}
               onClick={(e) => e.stopPropagation()}
             />
            {/* 关闭按钮 - 相对于图片定位 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeImagePreview()
              }}
              className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-black bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-90 transition-all z-20 shadow-lg"
              title="关闭"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* 图片标题 - 相对于图片定位 */}
            <div 
              className="absolute -bottom-2 left-0 right-0 bg-black bg-opacity-70 text-white px-3 py-2 rounded-b-lg z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs sm:text-sm font-medium text-center truncate">{state.image_preview.alt_text}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
