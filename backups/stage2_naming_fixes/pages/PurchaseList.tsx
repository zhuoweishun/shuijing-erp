import { useState, useEffect, useCallback } from 'react'
import { use_navigate } from 'react-router-dom'
import { 
  Plus, 
  Eye, 
  Edit, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Download,
  Package,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { use_device_detection } from '../hooks/useDeviceDetection'
import { use_auth } from '../hooks/useAuth'
import { purchase_api, supplier_api, fixImageUrl, getApiUrl } from '../services/api'
import { Purchase } from '../types'
import Permission_wrapper from '../components/PermissionWrapper'
import PurchaseDetailModal from '../components/PurchaseDetailModal'
import Portal from '../components/Portal'

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


// 扩展Window接口以支持临时位置存储
declare global {
  interface Window {
    temp_filter_position?: {
      column: string
      top: number
      left: number
    }
  }
}

interface PurchaseListState {
  purchases: Purchase[]
  is_loading: boolean
  error: string | null
  pagination: {
    current_page: number
    page_size: number
    total_count: number
    total_pages: number
  }
  filters: {
    search_term: string
    purchase_code_search: string
    quality_filter: string[]
    start_date: string
    end_date: string
    supplier_filter: string[]
    diameter_min: string
    diameter_max: string
    specification_min: string
    specification_max: string
    quantity_min: string
    quantity_max: string
    price_per_gram_min: string
    price_per_gram_max: string
    total_price_min: string
    total_price_max: string
    material_types_filter: string[]
  }
  sorting: {
    [key: string]: 'asc' | 'desc' | null
  }
  column_filters: {
    [key: string]: {
      is_visible: boolean
      filter_type: 'search' | 'select' | 'multiSelect' | 'sortAndRange' | 'sort'
    }
  }
  // 详情弹窗状态
  detail_modal: {
    is_open: boolean
    purchase_id: string | null
    is_edit_mode?: boolean
  }
  // 图片预览弹窗状态
  image_preview: {
    is_open: boolean
    image_url: string | null
    alt_text: string | null
  }
  // Excel导出状态
  export_excel: {
    is_loading: boolean
    error: string | null
  }
}

export default function PurchaseList() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = use_auth()
  const { is_mobile } = useDeviceDetection()
  
  // 格式化产品类型
  const format_product_type = (product_type?: string) => {;
    const type_map = {
      'LOOSE_BEADS': '散珠',
      'BRACELET': '手串',
      'ACCESSORIES': '饰品配件',
      'FINISHED': '成品'
    }
    return type_map[product_type as keyof typeof type_map] || '手串'
  }
  
  // 格式化规格
  const format_specification = (purchase: Purchase) => {;
    if (purchase.material_type === 'LOOSE_BEADS' || purchase.material_type === 'BRACELET') {
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
  const format_quantity = (purchase: Purchase) => {;
    switch (purchase.material_type) {
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
    is_loading: true,
    error: null,
    pagination: {
      current_page: 1,
      page_size: 10,
      total_count: 0,
      total_pages: 0
    },
    filters: {
      search_term: '',
      purchase_code_search: '', // 采购编号搜索
      quality_filter: ['AA', 'A', 'AB', 'B', 'C', 'UNKNOWN'], // 默认全选状态
      supplier_filter: [] as string[], // 将在获取供应商数据后设置为全选
      material_types_filter: ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED'], // 全选状态
      
      // 日期范围
      start_date: '',
      end_date: '',
      
      // 数值范围筛选
      diameter_min: '',
      diameter_max: '',
      specification_min: '',
      specification_max: '',
      quantity_min: '',
      quantity_max: '',
      price_per_gram_min: '',
      price_per_gram_max: '',
      total_price_min: '',
      total_price_max: ''
    },
    sorting: { purchase_date: 'desc' }, // 默认按采购日期降序排列
    column_filters: {
      purchase_code: { is_visible: false, filter_type: 'search' }, // 采购编号：搜索功能
      product_name: { is_visible: false, filter_type: 'search' }, // 产品名称：搜索功能
      material_type: { is_visible: false, filter_type: 'multiSelect' }, // 产品类型：多选功能
      specification: { is_visible: false, filter_type: 'sortAndRange' }, // 规格：排序和范围筛选
      quality: { is_visible: false, filter_type: 'multiSelect' }, // 品相：多选功能
      supplier: { is_visible: false, filter_type: 'multiSelect' }, // 供应商：多选功能
      bead_diameter: { is_visible: false, filter_type: 'sortAndRange' }, // 珠径：排序和范围筛选
      quantity: { is_visible: false, filter_type: 'sort' }, // 数量：排序功能
      price_per_gram: { is_visible: false, filter_type: 'sortAndRange' }, // 克价：排序和范围筛选
      total_price: { is_visible: false, filter_type: 'sortAndRange' }, // 总价：排序和范围筛选
      purchase_date: { is_visible: false, filter_type: 'sortAndRange' } // 采购日期：排序功能和日期范围
    },
    detail_modal: {
      is_open: false,
      purchase_id: null,
      is_edit_mode: false
    },
    image_preview: {
      is_open: false,
      image_url: null,
      alt_text: null
    },
    export_excel: {
      is_loading: false,
      error: null
    }
  })
  

  const [supplier_search_term, set_supplier_search_term] = useState('')
  const [all_suppliers, set_all_suppliers] = useState<string[]>([]) // 存储所有供应商数据

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
            acc[key] = { ...prev.column_filters[key], is_visible: false };
            return acc;
          }, {} as any)
        }));
      }
    };
    
    document.addEventListener('mousedown'), handleClickOutside);
    return () => document.removeEventListener('mousedown'), handleClickOutside);
  }, []);



  // 获取采购列表
  const fetch_purchases = async (custom_params?: any) => {;
    try {
      setState(prev => ({ ...prev, is_loading: true, error: null )}));
      
      const currentState = custom_params || state;
      const params: any = {;
        page: currentState.pagination?.current_page || state.pagination.current_page,
        limit: currentState.pagination?.page_size || state.pagination.page_size
      }
      
      const filters = custom_params?.filters || state.filters;
      const sorting = custom_params?.sorting || state.sorting
      
      // 构建筛选参数
      if (filters.search_term) params.search = filters.search_term;
      if (filters.purchase_code_search) params.purchase_code_search = filters.purchase_code_search
      // 品相筛选：支持多选，将'UNKNOWN'映射为null
      // 只有当品相数组不为空时才发送quality参数
      if (filters.quality_filter !== undefined && filters.quality_filter.length > 0) {
        const qualityParams = filters.quality_filter
          .map((q: string) => q === 'UNKNOWN' ? null : q)
          .filter((q: string | null) => q !== undefined && q !== '') // 保留null值，只过滤undefined和空字符串
        
        // 只有当过滤后的数组不为空时才发送参数
        if (qualityParams.length > 0) {
          params.quality = qualityParams;
          console.log('品相筛选参数:'), params.quality) // 调试信息
        }
      }
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date
      // 添加日期参数调试日志
      if (filters.start_date || filters.end_date) {
        console.log('日期筛选参数:', {
          start_date: filters.start_date,
          end_date: filters.end_date,
          params: { start_date: params.start_date, end_date: params.end_date }
        )})
      }
      // 供应商筛选：支持多选
      if (filters.supplier_filter && filters.supplier_filter.length > 0) {
        params.supplier = filters.supplier_filter
      }
      if (filters.diameter_min) params.diameter_min = filters.diameter_min;
      if (filters.diameter_max) params.diameter_max = filters.diameter_max;
      if (filters.specification_min) params.specification_min = filters.specification_min;
      if (filters.specification_max) params.specification_max = filters.specification_max;
      if (filters.quantity_min) params.quantity_min = filters.quantity_min;
      if (filters.quantity_max) params.quantity_max = filters.quantity_max;
      if (filters.price_per_gram_min) params.price_per_gram_min = filters.price_per_gram_min;
      if (filters.price_per_gram_max) params.price_per_gram_max = filters.price_per_gram_max;
      if (filters.total_price_min) params.total_price_min = filters.total_price_min;
      if (filters.total_price_max) params.total_price_max = filters.total_price_max
      // 产品类型筛选：如果数组为空，发送空数组表示不显示任何结果
      if (filters.material_types_filter !== undefined) {
        params.material_types = filters.material_types_filter
      }
      
      // 构建排序参数
      const sortingEntries = Object.entries(sorting).filter(([_), order]) => order !== null);
      if (sortingEntries.length > 0) {
        const [field, order] = sortingEntries[0]
        const fieldMapping: { [key: string]: string } = {
          'purchase_date': 'purchase_date',
          'purchase_code': 'purchase_code',
          'product_name': 'product_name',
          'specification': 'specification',
          'supplier': 'supplier',
          'quantity': 'quantity',
          'price_per_gram': 'price_per_gram',
          'total_price': 'total_price',
          'bead_diameter': 'bead_diameter',
        }
        params.sort_by = fieldMapping[field] || field;
        params.sort_order = order
      }
      
      const response = await purchase_api.list(params);
      
      if (response.success && response.data) {
        const data = response.data as any;
        setState(prev => ({
          ...prev,
          purchases: data.purchases || [],
          pagination: {
            ...prev.pagination,
            current_page: data.pagination?.page || 1,
            page_size: data.pagination?.limit || 10,
            total_count: data.pagination?.total || 0,
            total_pages: data.pagination?.pages || 0
          },
          is_loading: false
        )}))
      } else {
        setState(prev => ({
          ...prev,
          error: response.message || '获取数据失败',
          is_loading: false
        )}))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        is_loading: false,
        error: error instanceof Error ? error.message : '获取采购列表失败'
      )}))
    }
  }

  // 获取所有供应商数据（用于筛选）
  const fetch_all_suppliers = async () => {;
    try {
      const response = await supplier_api.get_all();
      if (response.success && response.data) {
        // 处理API返回的数据结构：{suppliers: [...], pagination: {...}}
        let suppliersList: Array<{id: string, name: string}> = []
        
        if ((response.data as any).suppliers && Array.is_array((response.data as any).suppliers)) {
          // 新的API格式：{suppliers: [...], pagination: {...}}
          suppliersList = (response.data as any).suppliers
        } else if (Array.is_array(response.data)) {
          // 旧的API格式：直接返回数组
          suppliersList = response.data as Array<{id: string, name: string}>
        }
        
        const supplierNames = suppliersList
          .map(s => s.name)
          .filter(Boolean)
          .sort((a), b) => a.locale_compare(b)) // 按A-Z排序
        set_all_suppliers(supplierNames)
        
        // 设置供应商筛选为全选状态（默认行为）
        setState(prev => ({
          ...prev,
          filters: {
            ...prev.filters,
            supplier_filter: supplierNames // 默认全选所有供应商
          }
        )}))
      }
    } catch (error) {
      console.error('获取供应商列表失败:'), error)
    }
  }

  // 初始加载（仅在组件首次挂载时加载）
  useEffect(() => {
    if (is_authenticated) {
      fetch_purchases()
      fetch_all_suppliers() // 同时获取所有供应商数据
    }
  }, [is_authenticated])
  
  // 监听分页变化，确保页码和每页条数变化时重新获取数据
  useEffect(() => {
    if (is_authenticated) {
      fetch_purchases()
    }
  }, [state.pagination.current_page, state.pagination.page_size, is_authenticated])
  
  // 移除自动触发机制，恢复手动点击"应用"按钮的交互方式

  // 实时筛选应用
  const apply_filters_immediately = (newFilters: any, newSorting?: any) => {;
    const search_params = {;
      filters: newFilters,
      sorting: newSorting || state.sorting,
      pagination: { ...state.pagination, current_page: 1 }
    }
    
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, current_page: 1 }
    )}))
    
    // 使用防抖来避免频繁请求
    setTimeout(() => {
      fetch_purchases(search_params)
    }, 300)
  }



  // 重置筛选
  const handle_reset = () => {;
    const newState = {;
      filters: {
        search_term: '',
        purchase_code_search: '',
        quality_filter: [] as string[],
        supplier_filter: [],
        material_types_filter: [],
        start_date: '',
        end_date: '',
        diameter_min: '',
        diameter_max: '',
        specification_min: '',
        specification_max: '',
        quantity_min: '',
        quantity_max: '',
        price_per_gram_min: '',
        price_per_gram_max: '',
        total_price_min: '',
        total_price_max: ''
      },
      sorting: { purchase_date: 'desc' as 'desc' },
      pagination: { ...state.pagination, current_page: 1 }
    }
    
    setState(prev => ({
      ...prev,
      ...newState
    )}))
    
    setTimeout(() => fetch_purchases(newState), 50)
  }
  
  // 处理排序
  const handle_sort = (field: string, order: 'asc' | 'desc') => {;
    setState(prev => {
      // 确保同时只能有一个字段排序
      const newSorting: { [key: string]: 'asc' | 'desc' | null } = {
        [field]: order
      }
      
      const newState = {
        ...prev,
        sorting: newSorting,
        pagination: { ...prev.pagination, current_page: 1 }
      }
      
      // 立即调用API应用排序，保留现有筛选条件
      apply_filters_immediately(prev.filters), newSorting)
      
      return newState
    })
  }
  
  // 切换列筛选器显示
  const toggle_column_filter = (column: string) => {;
    setState(prev => {;
      const newVisible = !prev.column_filters[column]?.is_visible;
      return {
        ...prev,
        column_filters: {
          ...prev.column_filters,
          [column]: {
            ...prev.column_filters[column],
            is_visible: newVisible
          }
        }
      }
    )})
    
    // 如果是打开筛选框，立即计算位置
    const isOpening = !state.column_filters[column]?.is_visible;
    if (isOpening) {
      update_filter_position(column)
    }
  }
  

  


  // 分页处理
  const handle_page_change = (page: number) => {;
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, current_page: page }
    )}))
  }

  // 弹窗控制
  const open_detail_modal = (purchase_id: string) => {;
    setState(prev => ({
      ...prev,
      detail_modal: {
        is_open: true,
        purchase_id: purchase_id,
        is_edit_mode: false
      }
    )}))
  }

  const close_detail_modal = () => {;
    setState(prev => ({
      ...prev,
      detail_modal: {
        is_open: false,
        purchase_id: null,
        is_edit_mode: false
      }
    )}))
  }

  // 图片预览控制
  const open_image_preview = (image_url: string, alt_text: string) => {;
    setState(prev => ({
      ...prev,
      image_preview: {
        is_open: true,)
        image_url: fixImageUrl(image_url),
        alt_text
      }
    }))
  }

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

  // Excel导出功能
  const handle_export_excel = async () => {;
    setState(prev => ({
      ...prev,
      export_excel: { is_loading: true, error: null }
    )}))
    
    try {
      // 构建查询参数（与当前筛选条件相同）
      const params = new URLSearchParams()
      
      // 添加筛选条件
      if (state.filters.search_term) params.append('search'), state.filters.search_term)
      if (state.filters.purchase_code_search) params.append('purchase_code_search'), state.filters.purchase_code_search)
      
      // 品相筛选
      if (state.filters.quality_filter && state.filters.quality_filter.length > 0) {
        state.filters.quality_filter.for_each(q => params.append('quality'), q))
      }
      
      // 日期范围
      if (state.filters.start_date) params.append('start_date'), state.filters.start_date)
      if (state.filters.end_date) params.append('end_date'), state.filters.end_date)
      
      // 供应商筛选
      if (state.filters.supplier_filter && state.filters.supplier_filter.length > 0) {
        state.filters.supplier_filter.for_each(s => params.append('supplier'), s))
      }
      
      // 材料类型筛选
      if (state.filters.material_types_filter && state.filters.material_types_filter.length > 0) {
        state.filters.material_types_filter.for_each(t => params.append('material_types'), t))
      }
      
      // 数值范围筛选
      if (state.filters.diameter_min) params.append('diameter_min'), state.filters.diameter_min)
      if (state.filters.diameter_max) params.append('diameter_max'), state.filters.diameter_max)
      if (state.filters.specification_min) params.append('specification_min'), state.filters.specification_min)
      if (state.filters.specification_max) params.append('specification_max'), state.filters.specification_max)
      if (state.filters.quantity_min) params.append('quantity_min'), state.filters.quantity_min)
      if (state.filters.quantity_max) params.append('quantity_max'), state.filters.quantity_max)
      if (state.filters.price_per_gram_min) params.append('price_per_gram_min'), state.filters.price_per_gram_min)
      if (state.filters.price_per_gram_max) params.append('price_per_gram_max'), state.filters.price_per_gram_max)
      if (state.filters.total_price_min) params.append('total_price_min'), state.filters.total_price_min)
      if (state.filters.total_price_max) params.append('total_price_max'), state.filters.total_price_max)
      
      // 排序参数
      const sortingEntries = Object.entries(state.sorting).filter(([_), order]) => order !== null);
      if (sortingEntries.length > 0) {
        const [field, order] = sortingEntries[0]
        const fieldMapping: { [key: string]: string } = {
          'purchase_date': 'purchase_date',
          'purchase_code': 'purchase_code',
          'product_name': 'product_name',
          'specification': 'specification',
          'supplier': 'supplier',
          'quantity': 'quantity',
          'price_per_gram': 'price_per_gram',
          'total_price': 'total_price',
          'bead_diameter': 'bead_diameter',
        }
        params.append('sort_by'), fieldMapping[field] || field)
        params.append('sort_order'), order as string)
      }
      
      // 获取token
      const token = localStorage.get_item('auth_token');
      if (!token) {
        throw new Error('未找到认证token')
      }
      
      // 发起请求
      const apiUrl = get_api_url();
      const response = await fetch(`${apiUrl)}/purchases/export/excel?${params.to_string()}`, {;
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`导出失败: ${response.status} ${response.status_text)}`)
      }
      
      // 获取文件blob
      const blob = await response.blob()
      
      // 创建下载链接
      const url = window.URL.create_object_u_r_l(blob);
      const link = document.createElement('a');
      link.href = url
      
      // 从响应头获取文件名，如果没有则使用默认名称
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `采购记录_${new Date().to_i_s_o_string().slice(0), 10)}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^);=\n]*=(['"]?)([^'"\n]*?)\1/)
        if (filenameMatch && filenameMatch[2]) {
          filename = decodeURIComponent(filenameMatch[2])
        }
      }
      
      link.download = filename;
      document.body.appendChild(link)
      link.click()
      
      // 清理
      document.body.removeChild(link)
      window.URL.revoke_object_u_r_l(url)
      
      setState(prev => ({
        ...prev,
        export_excel: { is_loading: false, error: null }
      )}))
      
    } catch (error) {
      console.error('Excel导出失败:'), error)
      setState(prev => ({
        ...prev,
        export_excel: {
          is_loading: false,
          error: error instanceof Error ? error.message : '导出失败'
        }
      )}))
    }
  }

  // 编辑处理
  const handle_edit = (purchase_id: string) => {
    // 打开详情弹窗并进入编辑模式
    setState(prev => ({
      ...prev,
      detail_modal: {
        is_open: true,
        purchase_id: purchase_id,
        is_edit_mode: true
      }
    )}))
  }

  // 格式化日期
  const format_date = (dateString: string) => {;
    return new Date(dateString).to_locale_string('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    )})
  }

  // 格式化价格
  const format_price = (price: number | string | null | undefined, showSensitive: boolean = true, treatNullAsZero: boolean = false) => {;
    if (price === null || price === undefined || price === '') {;
      if (treatNullAsZero) {
        return showSensitive ? '¥0.0' : '不可见'
      }
      return showSensitive ? '-' : '不可见'
    }
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) {
      if (treatNullAsZero) {
        return showSensitive ? '¥0.0' : '不可见'
      }
      return showSensitive ? '-' : '不可见'
    }
    return `¥${numPrice.to_fixed(1)}`
  }

  // 格式化重量
  const format_weight = (weight: number | string | null | undefined) => {;
    if (weight === null || weight === undefined || weight === '') {;
      return '-'
    }
    const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;
    if (isNaN(numWeight)) return '-'
    return `${numWeight.to_fixed(1)}g`
  }
  
  // 格式化敏感价格字段
  const format_sensitive_price = (price: number | string | null | undefined, treatNullAsZero: boolean = false) => {;
    if (user?.role === 'EMPLOYEE') {;
      return '-'
    }
    return format_price(price, true), treatNullAsZero)
  }

  // 移除调试函数以减少不必要的网络请求

  // 移除自动调试代码以避免不必要的网络请求



  // 格式化品相
  const format_quality = (quality: string | undefined | null) => {
    // 品质值处理
    
    // 处理各种空值情况
    if (quality === null || quality === undefined || quality === '' || quality === 'null' || quality === 'undefined') {
      // 品质为空值
      return '未知'
    }
    
    // 确保quality是有效的枚举值
    const validQualities = ['AA', 'A', 'AB', 'B', 'C'];
    const normalizedQuality = String(quality).trim().to_upper_case();
    
    if (!validQualities.includes(normalizedQuality)) {
      // 品质值无效
      return '未知'
    }
    
    // 品质值正常
    return `${normalizedQuality}级`
  }
  
  // 获取唯一的供应商列表（按A-Z排序）- 修复：基于全部数据而非当前页
  const get_unique_suppliers = (search_term: string = '') => {;
    return all_suppliers
      .filter(supplier => ;
        search_term=== '' || )
        (supplier && supplier.to_lower_case().includes(search_term.to_lower_case()))
      )
  }
  
  // 筛选框位置状态管理
  const [filter_positions, set_filter_positions] = useState<{[key: string]: {top: number, left: number}}>({})
  
  // 计算筛选框位置的缓存函数
  const get_filter_position = useCallback((column: string) => {;
    const buttonElement = document.query_selector(`[data-filter-column="${column)}"]`) as HTMLButtonElement;
    if (!buttonElement) return { top: 0, left: 0 }
    
    const rect = buttonElement.get_bounding_client_rect();
    const viewportWidth = window.inner_width;
    const viewportHeight = window.inner_height;
    const filterWidth = 300 // 筛选框最大宽度;
    const filterHeight = 400 // 筛选框预估高度;
    
    let top = rect.bottom + 4 // 在按钮下方4px;
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
  const update_filter_position = useCallback((column: string) => {;
    setTimeout(() => {
      const position = get_filter_position(column);
      set_filter_positions(prev => ({
        ...prev,
        [column]: position
      )}))
    }, 10) // 延迟10ms确保DOM已更新
  }, [getFilterPosition])
  
  // 监听筛选状态变化，重新计算位置
  useEffect(() => {
    Object.keys(state.column_filters).for_each(column => {);
      if (state.column_filters[column]?.is_visible) {
        update_filter_position(column)
      }
    })
  }, [state.filters, state.column_filters, updateFilterPosition])
  
  // 渲染列头筛选器（按照文档3.6节规范实现）
  const render_column_filter = (column: string, title: string) => {;
    const filter = state.column_filters[column];
    
    if (!filter) {
      return null
    }
    
    const position = filter.is_visible ? (filter_positions[column] || { top: 0, left: 0 }) : { top: 0, left: 0 };
    
    return(
      <div className="relative inline-block">
        <button
          data-filter-column={column});
          onClick={() => toggle_column_filter(column)};
          className="filter-trigger ml-1 p-1 hover:bg-gray-100 rounded"
        >
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
        
        {filter.is_visible && (
          <Portal>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]";
              onClick={() => toggle_column_filter(column)}
            />
            <div 
              className="filter-panel fixed bg-white border border-gray-200 rounded-lg shadow-xl min-w-[200px] max-w-[300px] p-3 z-[9999]";
              style={{;
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0), 0.1), 0 10px 10px -5px rgba(0, 0, 0), 0.04)',
                minWidth: '200px',
                maxWidth: '300px',
                padding: '12px'
              }}
              onMouseDown={(e) => e.stopPropagation()};
                  onClick={(e) => e.stopPropagation()}
            >
            {/* 关闭按钮 */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{title}筛选</span>
              <button
                onClick={() => toggle_column_filter(column)};
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            {/* 排序功能 */}
            {(filter.filter_type === 'sort' || filter.filter_type === 'sortAndRange') && (
              <div className="mb-3 pb-3 border-b border-gray-100">
                <div className="text-xs text-gray-500 mb-2">排序</div>
                <div className="flex space-x-1">
                  <button 
                    onClick={() => handle_sort(column), 'asc')};
                    className={`px-2 py-1 text-xs rounded ${;
                      state.sorting[column] === 'asc'
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    升序
                  </button>
                  <button 
                    onClick={() => handle_sort(column), 'desc')};
                    className={`px-2 py-1 text-xs rounded ${;
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
            {filter.filter_type === 'search' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text";
                    placeholder={`搜索${title}...`};
                    value={column === 'purchase_code' ? state.filters.purchase_code_search : ;
                           column === 'product_name' ? state.filters.search_term : ''};
                    onChange={(e) => {;
                      let newFilters;
                      if (column === 'purchase_code') {;
                        newFilters = { ...state.filters, purchase_code_search: e.target.value }
                      } else if (column === 'product_name') {;
                        newFilters = { ...state.filters, search_term: e.target.value }
                      } else {
                        return;
                      }
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      )}))
                      // 移除实时搜索，只更新状态不立即应用
                    }}
                    onKeyPress={(e) => {;
                      if (e.key === 'Enter') {;
                        apply_filters_immediately(state.filters)
                      }
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={() => {;
                      apply_filters_immediately(state.filters)
                    }}
                    className="px-2 py-1 text-xs text-blue-500 hover:text-blue-700 border border-blue-300 rounded"
                  >
                    应用
                  </button>
                  {((column === '' && state.filters.purchase_code_search) || 
                    (column === '' && state.filters.search_term)) && (
                    <button
                      onClick={() => {;
                        let newFilters;
                        if (column === '') {;
                          newFilters = { ...state.filters, purchase_code_search: '' }
                        } else if (column === '') {;
                          newFilters = { ...state.filters, search_term: '' }
                        } else {
                          return;
                        }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        )}))
                        apply_filters_immediately(newFilters)
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
            {filter.filter_type === 'multiSelect' && column === 'quality' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">品相选择</div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {;
                        const allQualities = ['AA', 'A', 'AB', 'B', 'C', 'UNKNOWN'];
                        let newFilters;
                        if (state.filters.quality_filter.length === allQualities.length) {
                          // 当前全选状态，点击变为全不选
                          newFilters = { ...state.filters, quality_filter: [] };
                        } else {
                          // 当前非全选状态，点击变为全选
                          newFilters = { ...state.filters, quality_filter: allQualities };
                        }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        )}));
                        apply_filters_immediately(newFilters);
                        // 状态变化后重新计算位置
                        setTimeout(() => update_filter_position(column), 50);
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      {state.filters.quality_filter.length === 6 ? '取消全选' : '全选'}
                    </button>
                    {state.filters.quality_filter.length > 0 && (
                      <button
                        onClick={() => {;
                          const newFilters = { ...state.filters, quality_filter: [] };
                          setState(prev => ({
                            ...prev,
                            filters: newFilters
                          )}));
                          apply_filters_immediately(newFilters);
                          // 状态变化后重新计算位置
                          setTimeout(() => update_filter_position(column), 50);
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
                        type="checkbox");
                        checked={state.filters.quality_filter.includes(quality.value)};
                        onChange={(e) => {;
                          const newQualities = e.target.checked
                            ? [...state.filters.quality_filter, quality.value]
                            : state.filters.quality_filter.filter((q: string) => q !== quality.value)
                          const newFilters = { ...state.filters, quality_filter: newQualities };
                          setState(prev => ({
                            ...prev,
                            filters: newFilters
                          )}))
                          apply_filters_immediately(newFilters)
                          // 状态变化后重新计算位置
                          setTimeout(() => update_filter_position(column), 50)
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
            {filter.filter_type === 'multiSelect' && column === 'supplier' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">供应商选择</div>
                  {state.filters.supplier_filter.length > 0 && (
                    <button
                      onClick={() => {;
                        const newFilters = { ...state.filters, supplier_filter: [] };
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        )}))
                        apply_filters_immediately(newFilters)
                        // 状态变化后重新计算位置
                        setTimeout(() => update_filter_position(column), 50)
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      清除
                    </button>
                  )}
                </div>
                
                {/* 搜索输入框 */}
                <input
                  type="text";
                  placeholder="搜索供应商...";
                  value={supplier_search_term};
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2";
                  onChange={(e) => {;
                    set_supplier_search_term(e.target.value)
                  }}
                />
                
                {/* 供应商多选列表 */}
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {get_unique_suppliers('').map(supplier => (
                    <label key={supplier} className="flex items-center space-x-2 cursor-pointer text-xs">
                      <input
                        type="checkbox");
                        checked={state.filters.supplier_filter.includes(supplier)};
                        onChange={(e) => {;
                          const newSuppliers = e.target.checked
                            ? [...state.filters.supplier_filter, supplier]
                            : state.filters.supplier_filter.filter((s: string) => s !== supplier)
                          const newFilters = { ...state.filters, supplier_filter: newSuppliers };
                          setState(prev => ({
                            ...prev,
                            filters: newFilters
                          )}))
                          apply_filters_immediately(newFilters)
                          // 状态变化后重新计算位置
                          setTimeout(() => update_filter_position(column), 50)
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
            {filter.filter_type === 'multiSelect' && column === 'material_type' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">产品类型</div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {;
                        const allTypes = ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED'];
                        let newFilters;
                        if (state.filters.material_types_filter.length === allTypes.length) {
                          // 当前全选状态，点击变为全不选
                          newFilters = { ...state.filters, material_types_filter: [] };
                        } else {
                          // 当前非全选状态，点击变为全选
                          newFilters = { ...state.filters, material_types_filter: allTypes };
                        }
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        )}));
                        apply_filters_immediately(newFilters);
                        // 状态变化后重新计算位置
                        setTimeout(() => update_filter_position(column), 50);
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      {state.filters.material_types_filter.length === 4 ? '取消全选' : '全选'}
                    </button>
                    {state.filters.material_types_filter.length > 0 && state.filters.material_types_filter.length < 4 && (
                      <button
                        onClick={() => {;
                          const newFilters = { ...state.filters, material_types_filter: ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED'] };
                          setState(prev => ({
                            ...prev,
                            filters: newFilters
                          )}));
                          apply_filters_immediately(newFilters);
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
                        type="checkbox");
                        checked={state.filters.material_types_filter.includes(type.value)};
                        onChange={(e) => {;
                          let newFilters;
                          if (e.target.checked) {
                            // 选中：添加到包含列表
                            newFilters = {
                              ...state.filters,
                              material_types_filter: [...state.filters.material_types_filter, type.value]
                            };
                          } else {
                            // 取消选中：从包含列表中移除
                            newFilters = {
                              ...state.filters,
                              material_types_filter: state.filters.material_types_filter.filter((t: string) => t !== type.value)
                            };
                          }
                          setState(prev => ({
                            ...prev,
                            filters: newFilters
                          )}));
                          apply_filters_immediately(newFilters);
                          // 状态变化后重新计算位置
                          setTimeout(() => update_filter_position(column), 50);
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
            {(filter.filter_type === 'sortAndRange') && column === 'bead_diameter' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">珠径范围(mm)</div>
                  {(state.filters.diameter_min || state.filters.diameter_max) && (
                    <button
                    onClick={() => {;
                      const newFilters = { ...state.filters, diameter_min: '', diameter_max: '' };
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      )}))
                      apply_filters_immediately(newFilters)
                      toggle_column_filter('bead_diameter')
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    清除
                  </button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="number";
                    placeholder="最小值";
                    value={state.filters.diameter_min};
                    onChange={(e) => {;
                      const newFilters = { ...state.filters, diameter_min: e.target.value };
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      )}))
                      apply_filters_immediately(newFilters)
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-gray-400 self-center">-</span>
                  <input
                    type="number";
                    placeholder="最大值";
                    value={state.filters.diameter_max};
                    onChange={(e) => {;
                      const newFilters = { ...state.filters, diameter_max: e.target.value };
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      )}))
                      apply_filters_immediately(newFilters)
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            )}
            
            {/* 规格范围筛选功能 */}
            {(filter.filter_type === 'sortAndRange') && column === 'specification' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">规格范围</div>
                </div>
                <div className="flex space-x-1 items-center">
                  <input
                    type="number";
                    placeholder="最小";
                    value={state.filters.specification_min};
                    onChange={(e) => {;
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, specification_min: e.target.value }
                      )}))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                  <span className="text-gray-400 text-xs">-</span>
                  <input
                    type="number";
                    placeholder="最大";
                    value={state.filters.specification_max};
                    onChange={(e) => {;
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, specification_max: e.target.value }
                      )}))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {;
                      const newFilters = { ...state.filters };
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      )}))
                      apply_filters_immediately(newFilters)
                      toggle_column_filter('specification')
                    }}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    应用
                  </button>
                  <button
                    onClick={() => {;
                      const newFilters = { ...state.filters, specification_min: '', specification_max: '' };
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      )}))
                      apply_filters_immediately(newFilters)
                      toggle_column_filter('specification')
                    }}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    清除
                  </button>
                </div>
              </div>
            )}
            
            {/* 克价范围筛选功能 */}
            {(filter.filter_type === 'sortAndRange') && column === 'price_per_gram' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">克价范围(元/克)</div>
                </div>
                <div className="flex space-x-1 items-center">
                  <input
                    type="number";
                    placeholder="最小";
                    value={state.filters.price_per_gram_min};
                    onChange={(e) => {;
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, price_per_gram_min: e.target.value }
                      )}))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                  <span className="text-gray-400 text-xs">-</span>
                  <input
                    type="number";
                    placeholder="最大";
                    value={state.filters.price_per_gram_max};
                    onChange={(e) => {;
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, price_per_gram_max: e.target.value }
                      )}))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {;
                      const newFilters = { ...state.filters };
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      )}))
                      apply_filters_immediately(newFilters)
                      toggle_column_filter('price_per_gram')
                    }}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    应用
                  </button>
                  <button
                    onClick={() => {;
                      const newFilters = { ...state.filters, price_per_gram_min: '', price_per_gram_max: '' };
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      )}))
                      apply_filters_immediately(newFilters)
                      toggle_column_filter('price_per_gram')
                    }}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    清除
                  </button>
                </div>
              </div>
            )}
            
            {/* 总价范围筛选功能 */}
            {(filter.filter_type === 'sortAndRange') && column === 'total_price' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">总价范围(元)</div>
                </div>
                <div className="flex space-x-1 items-center">
                  <input
                    type="number";
                    placeholder="最小";
                    value={state.filters.total_price_min};
                    onChange={(e) => {;
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, total_price_min: e.target.value }
                      )}))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                  <span className="text-gray-400 text-xs">-</span>
                  <input
                    type="number";
                    placeholder="最大";
                    value={state.filters.total_price_max};
                    onChange={(e) => {;
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, total_price_max: e.target.value }
                      )}))
                    }}
                    className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {;
                      const newFilters = { ...state.filters };
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      )}))
                      apply_filters_immediately(newFilters)
                      toggle_column_filter('')
                    }}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    应用
                  </button>
                  <button
                    onClick={() => {;
                      const newFilters = { ...state.filters, total_price_min: '', total_price_max: '' };
                      setState(prev => ({
                        ...prev,
                        filters: newFilters
                      )}))
                      apply_filters_immediately(newFilters)
                      toggle_column_filter('')
                    }}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    清除
                  </button>
                </div>
              </div>
            )}
            
            {/* 日期范围筛选功能 */}
            {column === 'purchase_date' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">日期范围</div>
                  {(state.filters.start_date || state.filters.end_date) && (
                    <button
                      onClick={() => {;
                        const newFilters = { ...state.filters, start_date: '', end_date: '' };
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        )}))
                        apply_filters_immediately(newFilters)
                        toggle_column_filter('purchase_date')
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      清除
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="date";
                    placeholder="开始日期";
                    value={state.filters.start_date};
                    onChange={(e) => {;
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, start_date: e.target.value }
                      )}))
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="date";
                    placeholder="结束日期";
                    value={state.filters.end_date};
                    onChange={(e) => {;
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, end_date: e.target.value }
                      )}))
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => {;
                        apply_filters_immediately(state.filters)
                        toggle_column_filter('purchase_date')
                      }}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      应用
                    </button>
                    <button
                      onClick={() => {;
                        const newFilters = { ...state.filters, start_date: '', end_date: '' };
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        )}))
                        apply_filters_immediately(newFilters)
                        toggle_column_filter('purchase_date')
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
                  {render_column_filter('purchase_code'), '采购编号')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '180px' }}>
                <div className="flex items-center">
                  产品名称
                  {render_column_filter('material_name'), '产品名称')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                <div className="flex items-center">
                  产品类型
                  {render_column_filter('material_type'), '产品类型')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>
                <div className="flex items-center">
                  规格
                  {render_column_filter('specification'), '规格')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>
                <div className="flex items-center">
                  品相
                  {render_column_filter('quality'), '品相')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>
                <div className="flex items-center">
                  数量
                  {render_column_filter('quantity'), '数量')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                <div className="flex items-center">
                  克价
                  {user?.role === 'BOSS' && render_column_filter('price_per_gram'), '克价')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                <div className="flex items-center">
                  总价
                  {render_column_filter('total_price'), '总价')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>
                重量(g)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                <div className="flex items-center">
                  供应商
                  {user?.role === 'BOSS' && render_column_filter('supplier'), '供应商')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                <div className="flex items-center">
                  采购日期
                  {render_column_filter('purchase_date'), '采购日期')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {state.purchases.map((purchase) => {
              return(
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style={{ width: '120px' }}>
                     {purchase.purchase_code}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap" style={{ width: '180px' }}>
                     <div className="flex items-center space-x-3">)
                       {get_first_photo_url(purchase.photos) && (
                         <img 
                           src={get_first_photo_url(purchase.photos)!} ;
                           alt={purchase.material_name};
                           className="w-8 h-12 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity";
                           onClick={() => {;
                             const photoUrl = get_first_photo_url(purchase.photos);
                             if (photoUrl) open_image_preview(photoUrl), purchase.material_name)
                           }}
                         />
                       )}
                       <div className="text-sm font-medium text-gray-900 truncate">{purchase.material_name}</div>
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '100px' }}>
                     {format_product_type(purchase.material_type)}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '80px' }}>
                     {format_specification(purchase)}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '80px' }}>
                     {format_quality(purchase.quality)}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '80px' }}>
                     {format_quantity(purchase)}
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '100px' }}>
                    {format_sensitive_price(purchase.price_per_gram), true)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '100px' }}>
                    {format_sensitive_price(purchase.total_price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '80px' }}>
                    {user?.role === 'EMPLOYEE' ? '-' : format_weight(purchase.weight)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '120px' }}>
                    <div className="truncate">{user?.role === 'BOSS' ? (purchase.supplier?.name || '-') : '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '120px' }}>
                    {format_date(purchase.purchase_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ width: '100px' }}>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => open_detail_modal(purchase.id)};
                        className="text-gray-600 hover:text-gray-900";
                        title="查看详情"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <Permission_wrapper allowed_roles={['BOSS']}>
                        <button
                          onClick={() => handle_edit(purchase.id)};
                          className="text-blue-600 hover:text-blue-900";
                          title="编辑"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </Permission_wrapper>
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
        return(
          <div key={purchase.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3 flex-1">)
                {get_first_photo_url(purchase.photos) && (
                   <img 
                     src={get_first_photo_url(purchase.photos)!} ;
                     alt={purchase.material_name};
                     className="w-12 h-16 object-cover rounded border border-gray-200 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity";
                     onClick={() => {;
                       const photoUrl = get_first_photo_url(purchase.photos);
                       if (photoUrl) open_image_preview(photoUrl), purchase.material_name)
                     }}
                   />
                 )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-base">{purchase.material_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{purchase.purchase_code}</p>
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => open_detail_modal(purchase.id)};
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg";
                  title="查看详情"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <Permission_wrapper allowed_roles={['BOSS']}>
                  <button
                    onClick={() => handle_edit(purchase.id)};
                    className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg";
                    title="编辑"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </Permission_wrapper>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                 <span className="text-gray-500">类型:</span>
                 <span className="ml-1 text-gray-900">{format_product_type(purchase.material_type)}</span>
               </div>
              <div>
                <span className="text-gray-500">规格:</span>
                <span className="ml-1 text-gray-900">{format_specification(purchase)}</span>
              </div>
              <div>
                <span className="text-gray-500">品相:</span>
                <span className="ml-1 text-gray-900">{format_quality(purchase.quality)}</span>
              </div>
              <div>
                <span className="text-gray-500">数量:</span>
                <span className="ml-1 text-gray-900">{format_quantity(purchase)}</span>
              </div>
              <div>
                <span className="text-gray-500">日期:</span>
                <span className="ml-1 text-gray-900">{format_date(purchase.purchase_date)}</span>
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
                  <span className="ml-1 text-gray-900">{format_sensitive_price(purchase.price_per_gram), true)}</span>
                </div>
                <div>
                  <span className="text-gray-500">重量:</span>
                  <span className="ml-1 text-gray-900">{user?.role === 'EMPLOYEE' ? '-' : format_weight(purchase.weight)}</span>
                </div>
                <div>
                  <span className="text-gray-500">总价:</span>
                  <span className="ml-1 text-gray-900">{format_sensitive_price(purchase.total_price)}</span>
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
  const handleLimitChange = (newLimit: number) => {;
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        page_size: newLimit,
        current_page: 1 // 重置到第一页
      }
    )}))
    // 立即使用新的limit值重新获取数据
    setTimeout(() => {
      fetch_purchases({
        pagination: { current_page: 1, page_size: newLimit },
        filters: state.filters,
        sorting: state.sorting
      )})
    }, 0)
  }

  const renderPagination = () => {
    // 只有在没有数据时才不显示分页组件
    if (state.pagination.total_count === 0) return null;
    
    return(
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="sm:hidden">
          {/* 手机端记录信息和每页显示条数 */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-700">
              第{state.pagination.current_page}页，共{state.pagination.total_pages}页
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">每页:</span>
              <select
                value={state.pagination.page_size});
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
                onClick={() => handle_page_change(state.pagination.current_page - 1)};
                disabled={state.pagination.current_page <= 1};
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => handle_page_change(state.pagination.current_page + 1)};
                disabled={state.pagination.current_page >= state.pagination.total_pages};
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
              显示第 <span className="font-medium">{(state.pagination.current_page - 1) * state.pagination.page_size + 1}</span> 到{' '}
              <span className="font-medium">
                {Math.min(state.pagination.current_page * state.pagination.page_size), state.pagination.total_count)}
              </span>{' '}
              条，共 <span className="font-medium">{state.pagination.total_count}</span> 条记录
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">每页显示:</span>
              <select
                value={state.pagination.page_size};
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
                  onClick={() => handle_page_change(state.pagination.current_page - 1)};
                  disabled={state.pagination.current_page <= 1};
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {(() => {
                   const total_pages = state.pagination.total_pages;
                  const maxVisiblePages = 5;
                  
                  let startPage = Math.max(1), state.pagination.current_page - Math.floor(maxVisiblePages / 2));
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
                        page === state.pagination.current_page
                          ? 'z-10 bg-gray-50 border-gray-500 text-gray-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))
                })()}
                
                <button
                  onClick={() => handle_page_change(state.pagination.current_page + 1)};
                  disabled={state.pagination.current_page >= state.pagination.total_pages};
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

  return(
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
            onClick={handle_export_excel};
            disabled={state.export_excel.is_loading};
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.export_excel.is_loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />)
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {state.export_excel.is_loading ? '导出中...' : '导出Excel'}
          </button>
          <button
            onClick={() => navigate('/purchase-entry')};
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

      {/* Excel导出错误提示 */}
      {state.export_excel.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">导出失败</h3>
              <p className="text-sm text-red-700 mt-1">{state.export_excel.error}</p>
            </div>
            <button
              onClick={() => setState(prev => ({
                ...prev,
                export_excel: { ...prev.export_excel, error: null }
              )}))}
              className="text-red-400 hover:text-red-600"
            >
              <span className="sr-only">关闭</span>
              ×
            </button>
          </div>
        </div>
      )}

      {/* 采购详情弹窗 */}
      <PurchaseDetailModal
        is_open={state.detail_modal.is_open};
        onClose={close_detail_modal};
        purchase_id={state.detail_modal.purchase_id};
        edit_mode={state.detail_modal.is_edit_mode};
        onEdit={handle_edit};
        onDelete={() => {
          // 删除成功后刷新列表
          fetch_purchases()
        }}
        onSave={() => {
          // 保存成功后刷新列表
          fetch_purchases()
        }}
      />

      {/* 手机端高级筛选 */}
      <div className="block md:hidden mb-4">
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
              <div className="flex items-center space-x-2">
                <input
                  type="text";
                  placeholder="搜索产品名称或采购编号...";
                  value={state.filters.search_term};
                  onChange={(e) => {;
                    const newFilters = { ...state.filters, search_term: e.target.value };
                    setState(prev => ({
                      ...prev,
                      filters: newFilters
                    )}))
                    // 移除实时搜索，只更新状态不立即应用
                  }}
                  onKeyPress={(e) => {;
                    if (e.key === 'Enter') {;
                      apply_filters_immediately(state.filters)
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
                <button
                  onClick={() => {;
                    apply_filters_immediately(state.filters)
                  }}
                  className="px-3 py-2 text-sm text-blue-500 hover:text-blue-700 border border-blue-300 rounded-lg"
                >
                  应用
                </button>
              </div>
              {state.filters.search_term && (
                <button
                  onClick={() => {;
                    const newFilters = { ...state.filters, search_term: '' };
                    setState(prev => ({
                      ...prev,
                      filters: newFilters
                    )}))
                    apply_filters_immediately(newFilters)
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
                      type="checkbox");
                      checked={state.filters.material_types_filter.includes(type.value)};
                      onChange={(e) => {;
                        const newMaterialTypes = e.target.checked
                          ? [...state.filters.material_types_filter, type.value]
                          : state.filters.material_types_filter.filter((t: string) => t !== type.value)
                        const newFilters = { ...state.filters, material_types_filter: newMaterialTypes };
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        )}))
                        apply_filters_immediately(newFilters)
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
                      type="checkbox");
                      checked={state.filters.quality_filter.includes(quality.value)};
                      onChange={(e) => {;
                        const newQualities = e.target.checked
                          ? [...state.filters.quality_filter, quality.value]
                          : state.filters.quality_filter.filter((q: string) => q !== quality.value)
                        const newFilters = { ...state.filters, quality_filter: newQualities };
                        setState(prev => ({
                          ...prev,
                          filters: newFilters
                        )}))
                        apply_filters_immediately(newFilters)
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
                value={Object.keys(state.sorting).find(key => state.sorting[key] !== null) || ''};
                onChange={(e) => {
                   // 设置新排序并立即应用
                   if (e.target.value) {
                      const updatedSorting: { [key: string]: 'asc' | 'desc' | null } = { [e.target.value]: 'desc' as 'desc' }
                      setState(prev => ({ ...prev, sorting: updatedSorting )}));
                      apply_filters_immediately(state.filters), updatedSorting)
                    } else {
                      // 清除排序时，传递空的排序对象
                      const emptySorting: { [key: string]: 'asc' | 'desc' | null } = {}
                      setState(prev => ({ ...prev, sorting: emptySorting )}));
                      apply_filters_immediately(state.filters), emptySorting)
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
                type="number";
                placeholder="最小直径";
                value={state.filters.diameter_min};
                onChange={(e) => {;
                  const newFilters = { ...state.filters, diameter_min: e.target.value };
                  setState(prev => ({
                    ...prev,
                    filters: newFilters
                  )}))
                  apply_filters_immediately(newFilters)
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <input
                type="number";
                placeholder="最大直径";
                value={state.filters.diameter_max};
                onChange={(e) => {;
                  const newFilters = { ...state.filters, diameter_max: e.target.value };
                  setState(prev => ({
                    ...prev,
                    filters: newFilters
                  )}))
                  apply_filters_immediately(newFilters)
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <input
                type="number";
                placeholder="最小数量";
                value={state.filters.quantity_min};
                onChange={(e) => {;
                  const newFilters = { ...state.filters, quantity_min: e.target.value };
                  setState(prev => ({
                    ...prev,
                    filters: newFilters
                  )}))
                  apply_filters_immediately(newFilters)
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <input
                type="number";
                placeholder="最大数量";
                value={state.filters.quantity_max};
                onChange={(e) => {;
                  const newFilters = { ...state.filters, quantity_max: e.target.value };
                  setState(prev => ({
                    ...prev,
                    filters: newFilters
                  )}))
                  apply_filters_immediately(newFilters)
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>
            
            {/* 日期范围和排序方向 */}
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date";
                value={state.filters.start_date};
                onChange={(e) => {;
                  setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, start_date: e.target.value }
                  )}))
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <input
                type="date";
                value={state.filters.end_date};
                onChange={(e) => {;
                  setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, end_date: e.target.value }
                  )}))
                }}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <select
                value={Object.values(state.sorting).find(v => v !== null) || ''};
                onChange={(e) => {;
                  const sortField = Object.keys(state.sorting).find(key => state.sorting[key] !== null);
                  if (sortField && e.target.value) {
                    const updatedSorting: { [key: string]: 'asc' | 'desc' | null } = { [sortField]: e.target.value as 'asc' | 'desc' }
                    setState(prev => ({ ...prev, sorting: updatedSorting )}));
                    apply_filters_immediately(state.filters), updatedSorting)
                  }
                }}
                disabled={!Object.keys(state.sorting).find(key => state.sorting[key] !== null)};
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
      {state.is_loading && (
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
      {!is_authenticated && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800">请先登录后查看采购列表</span>
          </div>
        </div>
      )}

      {/* 数据列表 */}
      {is_authenticated && !state.is_loading && !state.error && (
        <>
          {state.purchases.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无采购记录</h3>
              <p className="text-gray-600 mb-4">还没有任何采购记录，点击下方按钮开始添加</p>
              <button
                onClick={() => navigate('/purchase-entry')};
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
      {state.image_preview.is_open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4";
          onClick={close_image_preview}
        >
          <div 
            className="relative flex items-center justify-center";
            onClick={(e) => e.stopPropagation()}
          >
            <img 
               src={fixImageUrl(state.image_preview.image_url || '')} ;
               alt={state.image_preview.alt_text || ''};
               className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl transition-transform duration-300 ease-in-out";
               style={{;
                 maxWidth: '90vw',
                 maxHeight: '90vh'
               }}
               onClick={(e) => e.stopPropagation()}
             />
            {/* 关闭按钮 - 相对于图片定位 */}
            <button
              onClick={(e) => {;
                e.stopPropagation()
                close_image_preview()
              }}
              className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-black bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-90 transition-all z-20 shadow-lg";
              title="关闭"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* 图片标题 - 相对于图片定位 */}
            <div 
              className="absolute -bottom-2 left-0 right-0 bg-black bg-opacity-70 text-white px-3 py-2 rounded-b-lg z-10";
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
