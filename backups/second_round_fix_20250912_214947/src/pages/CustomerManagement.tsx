import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Users, 
  Plus, 
  Eye, 
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Star,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Undo,
  ChevronDown,
  X
} from 'lucide-react'
import { customer_api } from '../services/api'
import { Customer, CustomerAnalytics } from '../types'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import ReverseSaleModal from '../components/ReverseSaleModal'
import CustomerDetailModal from '../components/CustomerDetailModal'
import Customer_create_modal from '../components/CustomerCreateModal'
import CustomerRefundModal from '../components/CustomerRefundModal'
import Portal from '../components/Portal'



// 客户类型标签配置
const CUSTOMER_TYPE_LABELS: Record<string, { label: string; icon: any; color: string; description: string }> = {
  // 购买行为维度
  NEW: { 
    label: '新客', 
    icon: '🆕', 
    color: 'text-green-600 bg-green-100',
    description: '首次购买的客户，只有1次购买记录'
  },
  REPEAT: { 
    label: '复购', 
    icon: '🔄', 
    color: 'text-blue-600 bg-blue-100',
    description: '复购客户，购买次数≥2次的客户'
  },
  FANATIC: { 
    label: '狂热', 
    icon: '🔥', 
    color: 'text-orange-600 bg-orange-100',
    description: '狂热客户，购买次数前20%的客户'
  },
  VIP: { 
    label: 'VIP', 
    icon: '👑', 
    color: 'text-purple-600 bg-purple-100',
    description: 'VIP客户，累计消费金额前20%的客户'
  },
  
  // 消费偏好维度
  HIGH_VALUE: { 
    label: '高客', 
    icon: '💎', 
    color: 'text-yellow-600 bg-yellow-100',
    description: '高客单价客户，客单价前20%的客户'
  },
  LOW_VALUE: { 
    label: '低客', 
    icon: '📉', 
    color: 'text-gray-600 bg-gray-100',
    description: '低客单价客户，客单价最低20%的客户'
  },
  
  // 活跃度维度
  DECLINING: { 
    label: '渐退', 
    icon: '💧', 
    color: 'text-blue-600 bg-blue-100',
    description: '渐退客户，基于最后购买时间的活跃度分类'
  },
  COOLING: { 
    label: '冷静', 
    icon: '❄️', 
    color: 'text-cyan-600 bg-cyan-100',
    description: '冷静客户，基于最后购买时间的活跃度分类'
  },
  SILENT: { 
    label: '沉默', 
    icon: '🏔️', 
    color: 'text-gray-600 bg-gray-100',
    description: '沉默客户，基于最后购买时间的活跃度分类'
  },
  LOST: { 
    label: '流失', 
    icon: '⚠️', 
    color: 'text-red-600 bg-red-100',
    description: '流失客户，基于最后购买时间的活跃度分类'
  },
  
  // 退货行为维度
  PICKY: { 
    label: '挑剔', 
    icon: '🔍', 
    color: 'text-pink-600 bg-pink-100',
    description: '挑剔客户，退货次数前20%的客户'
  },
  ASSASSIN: { 
    label: '刺客', 
    icon: '⚔️', 
    color: 'text-red-600 bg-red-100',
    description: '刺客客户，退货率前20%的客户'
  }
}

// 客户类型判断函数
const get_customer_labels = (customer: Customer, allCustomers: Customer[] = []): string[] => {
  const labels: string[] = []
  
  // 购买行为维度判断（基于动态阈值）
  const calculateBehaviorThresholds = () => {
    if (allCustomers.length === 0) {
      return { newThreshold: 1, repeatThreshold: 2 }
    }
    
    // 新客户：只有1次购买的客户
    const newThreshold = 1
    // 复购客户：购买次数≥2次的客户
    const repeatThreshold = 2
    
    return { newThreshold, repeatThreshold }
  }
  
  const behaviorThresholds = calculateBehaviorThresholds()
  
  if (customer.total_orders === behaviorThresholds.newThreshold) {
    labels.push('NEW')
  } else if (customer.total_orders >= behaviorThresholds.repeatThreshold) {
    labels.push('REPEAT')
  }
  
  // 计算动态阈值（基于所有客户数据）
  const calculateThresholds = () => {
    if (allCustomers.length === 0) {
      // 如果没有客户数据，使用默认阈值
      return {
        vipThreshold: 5000,
        fanaticThreshold: 10,
        highValueThreshold: 1000,
        lowValueThreshold: 200
      }
    }
    
    // 计算累计消费金额前20%的阈值（VIP阈值）
    const total_purchases = allCustomers.map(c => c.total_purchases).sort((a, b) => b - a)
    // 前20%的数量：Math.ceil(length * 0.2)，阈值取第20%位置的值
    const vipCount = Math.ceil(total_purchases.length * 0.2)
    const vipIndex = Math.max(0, vipCount - 1) // 索引从0开始，所以减1
    const vipThreshold = total_purchases[vipIndex] || 5000
    
    // 计算购买次数前20%的阈值（狂热客户阈值）
    const total_orders = allCustomers.map(c => c.total_orders).sort((a, b) => b - a)
    const fanaticCount = Math.ceil(total_orders.length * 0.2)
    const fanaticIndex = Math.max(0, fanaticCount - 1)
    const fanaticThreshold = total_orders[fanaticIndex] || 10
    
    // 计算有效客单价的分位数（基于有效订单，去除退货）
    // 注意：高客和低客需要过滤掉没有有效订单的客户，因为没有有效订单就没有客单价概念
    const validCustomers = allCustomers.filter(c => c.total_orders > 0) // 只包含有有效订单的客户
    const avgOrderValues = validCustomers
      .map(c => c.total_purchases / c.total_orders) // 有效消费金额 / 有效订单数量
      .sort((a, b) => b - a)
    
    // 高客：前20%的客单价阈值（基于有有效订单的客户）
    const highValueCount = Math.ceil(avgOrderValues.length * 0.2)
    const highValueIndex = Math.max(0, highValueCount - 1)
    const highValueThreshold = avgOrderValues[highValueIndex] || 1000
    
    // 低客：后20%的客单价阈值（基于有有效订单的客户）
    const lowValueCount = Math.ceil(avgOrderValues.length * 0.2)
    const lowValueIndex = Math.max(0, avgOrderValues.length - lowValueCount)
    const lowValueThreshold = avgOrderValues[lowValueIndex] || 200
    
    return {
      vipThreshold,
      fanaticThreshold,
      highValueThreshold,
      lowValueThreshold
    }
  }
  
  const thresholds = calculateThresholds()
  
  // VIP判断（累计消费金额前20%）
  if (customer.total_purchases >= thresholds.vipThreshold) {
    labels.push('VIP')
  }
  
  // 狂热客户判断（购买次数前20%）
  if (customer.total_orders >= thresholds.fanaticThreshold) {
    labels.push('FANATIC')
  }
  
  // 消费偏好维度判断（基于平均单价）
  if (customer.total_orders > 0) {
    const avgOrderValue = customer.total_purchases / customer.total_orders
    // 允许相同单价有些许偏差，使用大于等于比较
    if (avgOrderValue >= thresholds.highValueThreshold) {
      labels.push('HIGH_VALUE')
    // 允许相同单价有些许偏差，使用小于等于比较
    } else if (avgOrderValue <= thresholds.lowValueThreshold) {
      labels.push('LOW_VALUE')
    }
  }
  
  // 活跃度维度判断（基于动态阈值）
  const calculateActivityThresholds = () => {
    if (allCustomers.length === 0) {
      return {
        decliningThreshold: 31,
        coolingThreshold: 91,
        silentThreshold: 181,
        lostThreshold: 366
      }
    }
    
    // 获取所有客户的最后购买天数
    const now = new Date()
    const daysSinceLastPurchases = allCustomers
      .filter(c => c.last_purchase_date)
      .map(c => {
        const lastPurchase = new Date(c.last_purchase_date!)
        return Math.floor((now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
      })
      .sort((a, b) => a - b)
    
    if (daysSinceLastPurchases.length === 0) {
      return {
        decliningThreshold: 31,
        coolingThreshold: 91,
        silentThreshold: 181,
        lostThreshold: 366
      }
    }
    
    // 基于四分位数动态计算阈值
    const q1Index = Math.floor(daysSinceLastPurchases.length * 0.25)
    const q2Index = Math.floor(daysSinceLastPurchases.length * 0.5)
    const q3Index = Math.floor(daysSinceLastPurchases.length * 0.75)
    
    const decliningThreshold = daysSinceLastPurchases[q1Index] || 31
    const coolingThreshold = daysSinceLastPurchases[q2Index] || 91
    const silentThreshold = daysSinceLastPurchases[q3Index] || 181
    const lostThreshold = Math.max(silentThreshold + 30, 366) // 至少366天
    
    return {
      decliningThreshold,
      coolingThreshold,
      silentThreshold,
      lostThreshold
    }
  }
  
  if (customer.last_purchase_date) {
    const lastPurchase = new Date(customer.last_purchase_date)
    const now = new Date()
    const days_since_last_purchase = Math.floor((now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
    
    const activityThresholds = calculateActivityThresholds()
    
    if (days_since_last_purchase >= activityThresholds.decliningThreshold && days_since_last_purchase < activityThresholds.coolingThreshold) {
      labels.push('DECLINING')
    } else if (days_since_last_purchase >= activityThresholds.coolingThreshold && days_since_last_purchase < activityThresholds.silentThreshold) {
      labels.push('COOLING')
    } else if (days_since_last_purchase >= activityThresholds.silentThreshold && days_since_last_purchase < activityThresholds.lostThreshold) {
      labels.push('SILENT')
    } else if (days_since_last_purchase >= activityThresholds.lostThreshold) {
      labels.push('LOST')
    }
  }
  
  // 退货行为维度判断（基于动态阈值）
  const calculateRefundThresholds = () => {
    if (allCustomers.length === 0) {
      return { pickyThreshold: 5, assassinThreshold: 30 }
    }
    
    // 计算退货次数前20%的阈值（挑剔客户阈值）
    const refundCounts = allCustomers
      .map(c => c.refund_count || 0)
      .sort((a, b) => b - a)
    const pickyCount = Math.ceil(refundCounts.length * 0.2)
    const pickyIndex = Math.max(0, pickyCount - 1)
    const pickyThreshold = refundCounts[pickyIndex] || 0 // 可能为0
    
    // 计算退货率前20%的阈值（刺客客户阈值）
    // 注意：不要过滤掉退货率为0的客户，因为我们需要基于所有客户计算前20%
    const refundRates = allCustomers
      .map(c => c.refund_rate || 0)
      .sort((a, b) => b - a)
    const assassinCount = Math.ceil(refundRates.length * 0.2)
    const assassinIndex = Math.max(0, assassinCount - 1)
    const assassinThreshold = refundRates[assassinIndex] || 0 // 可能为0
    
    return { pickyThreshold, assassinThreshold }
  }
  
  const refundThresholds = calculateRefundThresholds()
  
  // 挑剔客户：退货次数前20%，且必须有退货记录
  if ((customer.refund_count || 0) >= refundThresholds.pickyThreshold && (customer.refund_count || 0) > 0) {
    labels.push('PICKY')
  }
  // 刺客客户：退货率前20%，且必须有退货记录
  if ((customer.refund_rate || 0) >= refundThresholds.assassinThreshold && (customer.refund_rate || 0) > 0) {
    labels.push('ASSASSIN')
  }
  
  return labels
}

// 从地址中提取城市信息
const extractCityFromAddress = (address?: string): string => {
  if (!address) return '未知'
  
  // 匹配常见的城市格式：省市区
  const cityMatch = address.match(/([^省]+省)?([^市]+市)/)
  if (cityMatch && cityMatch[2]) {
    return cityMatch[2]
  }
  
  // 匹配直辖市格式
  const municipalityMatch = address.match(/(北京|上海|天津|重庆)市?/)
  if (municipalityMatch) {
    return municipalityMatch[1] + '市'
  }
  
  // 如果无法匹配，返回地址的前几个字符
  return address.substring(0, 6) + '...'
}

interface CityStats {
  name: string
  count: number
}

interface CustomerManagementState {
  customers: Customer[]
  analytics: CustomerAnalytics | null
  loading: boolean
  error: string | null
  search_term: string
  selected_type: string
  time_period: 'week' | 'month' | 'half_year' | 'year' | 'all'
  sort_by: string
  sort_order: 'asc' | 'desc'
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  // 筛选相关状态
  filters: {
    customer_code_search: string
    name_search: string
    phone_search: string
    city_filter: string[]
    customer_type: string[]
    total_orders_min: string
    total_orders_max: string
    total_all_orders_min: string
    total_all_orders_max: string
    total_purchases_min: string
    total_purchases_max: string
    first_purchase_start: string
    first_purchase_end: string
    last_purchase_start: string
    last_purchase_end: string
  }
  column_filters: {
    visible: boolean
    column: string
    type: 'search' | 'multiSelect' | 'sortAndRange' | 'sort'
  }
  filter_panel_position: { x: number; y: number }
  city_search_term: string
  city_stats: CityStats[]
  show_create_modal: boolean
  show_detail_modal: boolean
  show_reverse_sale_modal: boolean
  show_refund_modal: boolean
  selected_customer: Customer | null
}

export default function CustomerManagement() {
  const { is_authenticated } = useAuth()
  const [state, setState] = useState<CustomerManagementState>({
    customers: [],
    analytics: null,
    loading: false, // 初始设置为false，避免闪烁
    error: null,
    search_term: '',
    selected_type: '',
    time_period: 'all',
    sort_by: 'created_at',
    sort_order: 'desc',
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      total_pages: 0
    },
    // 筛选相关初始状态
    filters: {
      customer_code_search: '',
      name_search: '',
      phone_search: '',
      city_filter: [],
      customer_type: [],
      total_orders_min: '',
      total_orders_max: '',
      total_all_orders_min: '',
      total_all_orders_max: '',
      total_purchases_min: '',
      total_purchases_max: '',
      first_purchase_start: '',
      first_purchase_end: '',
      last_purchase_start: '',
      last_purchase_end: ''
    },
    column_filters: {
      visible: false,
      column: '',
      type: 'search'
    },
    filter_panel_position: { x: 0, y: 0 },
    city_search_term: '',
    city_stats: [],
    show_create_modal: false,
    show_detail_modal: false,
    show_reverse_sale_modal: false,
    show_refund_modal: false,
    selected_customer: null
  })

  // 筛选面板位置状态管理
  const columnRefs = useRef<Record<string, HTMLElement | null>>({})

  // 计算筛选框位置的缓存函数
  const get_filter_position = useCallback((column: string) => {
    const buttonElement = columnRefs.current[column]
    if (!buttonElement) return { x: 0, y: 0 }
    
    const rect = buttonElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // 根据列类型和屏幕尺寸设置不同的面板宽度
    const isSmallScreen = viewportWidth < 640 // sm breakpoint
    const filterWidth = column === 'customer_type' 
      ? (isSmallScreen ? 400 : 600) // 四列布局需要更宽的面板
      : 300
    const filterHeight = column === 'customer_type' ? 350 : 400
    
    let top = rect.bottom + 4
    let left = rect.left
    
    // 边界检测
    if (left + filterWidth > viewportWidth) {
      left = viewportWidth - filterWidth - 10
    }
    
    if (top + filterHeight > viewportHeight) {
      top = rect.top - filterHeight - 4
    }
    
    if (left < 10) {
      left = 10
    }
    
    if (top < 10) {
      top = 10
    }
    
    return { x: left, y: top }
  }, [])

  // 更新筛选框位置
  const update_filter_position = useCallback((column: string) => {
    setTimeout(() => {
      const position = get_filter_position(column)
      setState(prev => ({
        ...prev,
        filter_panel_position: position
      }))
    }, 10)
  }, [getFilterPosition])

  // 切换筛选面板显示状态
  const toggle_column_filter = (e: React.MouseEvent, column: string) => {
    e.stopPropagation()
    
    const isCurrentlyVisible = state.column_filters.visible && state.column_filters.column === column
    
    setState(prev => ({
      ...prev,
      column_filters: {
        visible: !isCurrentlyVisible,
        column: !isCurrentlyVisible ? column : '',
        type: get_column_filter_type(column)
      }
    }))
    
    // 如果是打开面板，更新位置
    if (!isCurrentlyVisible) {
      update_filter_position(column)
    }
  }
  
  // 获取列筛选类型
  const get_column_filter_type = (column: string): 'search' | 'multiSelect' | 'sortAndRange' | 'sort' => {
    const type_map: Record<string, 'search' | 'multiSelect' | 'sortAndRange' | 'sort'> = {
      customer_code: 'search',
      name: 'search',
      phone: 'search',
      city: 'multiSelect',
      total_orders: 'sortAndRange',
      total_all_orders: 'sortAndRange',
      total_purchases: 'sortAndRange',
      first_purchase_date: 'sortAndRange',
      last_purchase_date: 'sortAndRange',
      customer_type: 'multiSelect'
    }
    return type_map[column] || 'search'
  }

  // 应用筛选条件
  // const apply_filters_immediately = (filters: any) => {
  //   setState(prev => ({
  //     ...prev,
  //     pagination: { ...prev.pagination, page: 1 }
  //   }))
  //   // 触发数据重新获取
  //   fetchCustomers()
  // }

  // 点击外部关闭筛选面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      const isInsideFilterPanel = target.closest('.filter-panel')
      const isFilterTrigger = target.closest('.filter-trigger')
      
      if (!isInsideFilterPanel && !isFilterTrigger && state.column_filters.visible) {
        setState(prev => ({
          ...prev,
          column_filters: {
            visible: false,
            column: '',
            type: 'search'
          }
        }))
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [state.column_filters.visible])

  // 监听筛选状态变化，重新计算位置
  useEffect(() => {
    if (state.column_filters.visible && state.column_filters.column) {
      update_filter_position(state.column_filters.column)
    }
  }, [state.column_filters.visible, state.column_filters.column, updateFilterPosition])

  // 渲染筛选面板
   const renderFilterPanel = () => {
     const { column } = state.column_filters
     if (!column) return null
     
     const columnConfig = {
       customer_code: { title: '客户编号', type: 'search' },
       name: { title: '客户名称', type: 'search' },
       phone: { title: '手机号', type: 'search' },
       city: { title: '所在城市', type: 'multiSelect' },
       total_orders: { title: '有效订单', type: 'sortAndRange' },
       total_all_orders: { title: '总订单量', type: 'sortAndRange' },
       total_purchases: { title: '累计消费', type: 'sortAndRange' },
       first_purchase_date: { title: '首次购买', type: 'daterange' },
       last_purchase_date: { title: '最后购买', type: 'daterange' },
       customer_type: { title: '客户类型', type: 'multiSelect' }
     }[column]
     
     if (!columnConfig) return null
     
     return (
       <div className="p-4">
         <div className="flex items-center justify-between mb-3">
           <h3 className="text-sm font-medium text-gray-900">{columnConfig.title}筛选</h3>
           <button
             onClick={() => setState(prev => ({
               ...prev,
               column_filters: { ...prev.column_filters, visible: false }
             }))}
             className="text-gray-400 hover:text-gray-600"
           >
             <X className="h-4 w-4" />
           </button>
         </div>
         
         {columnConfig.type === 'search' && renderSearchFilter(column)}
         {columnConfig.type === 'multiSelect' && renderMultiSelectFilter(column)}
         {columnConfig.type === 'range' && renderRangeFilter(column)}
         {columnConfig.type === 'sortAndRange' && renderSortAndRangeFilter(column)}
         {columnConfig.type === 'daterange' && renderDateRangeFilter(column)}
         
         <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-200">
           <button
             onClick={() => clearColumnFilter(column)}
             className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
           >
             清除
           </button>
           <button
             onClick={() => setState(prev => ({
               ...prev,
               column_filters: { ...prev.column_filters, visible: false }
             }))}
             className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
           >
             确定
           </button>
         </div>
       </div>
     )
    }
   
   // 渲染搜索筛选
   const renderSearchFilter = (column: string) => {
     const get_filter_value = () => {
       switch (column) {
         case 'customer_code': return state.filters.customer_code_search
         case 'name': return state.filters.name_search
         case 'phone': return state.filters.phone_search
         default: return ''
       }
     }
     
     const setFilterValue = (value: string) => {
       setState(prev => ({
         ...prev,
         filters: {
           ...prev.filters,
           ...(column === 'customer_code' && { customer_code_search: value }),
           ...(column === 'name' && { name_search: value }),
           ...(column === 'phone' && { phone_search: value })
         }
       }))
     }
     
     // 处理排序
     const handleSortClick = (order: 'asc' | 'desc') => {
       // 构建新的状态
       const newState = {
         ...state,
         sort_by: column,
         sort_order: order,
         pagination: { ...state.pagination, page: 1 }
       }
       
       // 更新状态
       setState(prev => ({
         ...prev,
         sort_by: column,
         sort_order: order,
         pagination: { ...prev.pagination, page: 1 }
       }))
       
       // 立即获取数据
       setTimeout(() => {
         fetchCustomers(newState)
       }, 0)
     }
     
     return (
       <div className="space-y-4">
         {/* 排序功能 */}
         <div>
           <label className="block text-xs text-gray-600 mb-2">排序</label>
           <div className="flex space-x-2">
             <button
               onClick={() => handleSortClick('asc')}
               className={`px-2 py-1 text-xs rounded ${
                 state.sort_by === column && state.sort_order === 'asc'
                   ? 'bg-blue-500 text-white'
                   : 'bg-gray-100 hover:bg-gray-200'
               }`}
             >
               升序
             </button>
             <button
               onClick={() => handleSortClick('desc')}
               className={`px-2 py-1 text-xs rounded ${
                 state.sort_by === column && state.sort_order === 'desc'
                   ? 'bg-blue-500 text-white'
                   : 'bg-gray-100 hover:bg-gray-200'
               }`}
             >
               降序
             </button>
           </div>
         </div>
         
         {/* 搜索功能 */}
         <div>
           <label className="block text-xs text-gray-600 mb-2">搜索</label>
           <input
             type="text"
             placeholder="输入搜索内容..."
             value={get_filter_value()}
             onChange={(e) => setFilterValue(e.target.value)}
             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
           />
         </div>
       </div>
     )
   }
   
   // 渲染多选筛选
   const renderMultiSelectFilter = (column: string) => {
     // 处理排序 - 仅对城市字段启用
     const handleSortClick = (order: 'asc' | 'desc') => {
       // 构建新的状态
       const newState = {
         ...state,
         sort_by: column,
         sort_order: order,
         pagination: { ...state.pagination, page: 1 }
       }
       
       // 更新状态
       setState(prev => ({
         ...prev,
         sort_by: column,
         sort_order: order,
         pagination: { ...prev.pagination, page: 1 }
       }))
       
       // 立即获取数据
       setTimeout(() => {
         fetchCustomers(newState)
       }, 0)
     }
     
     return (
       <div className="space-y-4">
         {/* 排序功能 - 仅对城市字段显示 */}
         {column === 'city' && (
           <div>
             <label className="block text-xs text-gray-600 mb-2">排序</label>
             <div className="flex space-x-2">
               <button
                 onClick={() => handleSortClick('asc')}
                 className={`px-2 py-1 text-xs rounded ${
                   state.sort_by === column && state.sort_order === 'asc'
                     ? 'bg-blue-500 text-white'
                     : 'bg-gray-100 hover:bg-gray-200'
                 }`}
               >
                 升序
               </button>
               <button
                 onClick={() => handleSortClick('desc')}
                 className={`px-2 py-1 text-xs rounded ${
                   state.sort_by === column && state.sort_order === 'desc'
                     ? 'bg-blue-500 text-white'
                     : 'bg-gray-100 hover:bg-gray-200'
                 }`}
               >
                 降序
               </button>
             </div>
           </div>
         )}
         
         {/* 筛选功能 */}
         <div>
           <label className="block text-xs text-gray-600 mb-2">筛选</label>
           {column === 'city' && renderCityFilter()}
           {column === 'customer_type' && renderCustomerTypeFilter()}
         </div>
       </div>
     )
   }
   
   // 渲染城市筛选
   const renderCityFilter = () => {
     // 使用从后端获取的城市统计数据，按A-Z排序
     const filteredCities = state.city_search_term
       ? state.city_stats.filter(cityData => 
           cityData.name.toLowerCase().includes(state.city_search_term.toLowerCase())
         )
       : state.city_stats
     
     return (
       <div>
         <input
           type="text"
           placeholder="搜索城市..."
           value={state.city_search_term}
           onChange={(e) => setState(prev => ({ ...prev, city_search_term: e.target.value }))}
           className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
         />
         <div className="max-h-48 overflow-y-auto">
           {filteredCities.map(cityData => (
             <label key={cityData.name} className="flex items-center justify-between py-1 hover:bg-gray-50">
               <div className="flex items-center">
                 <input
                   type="checkbox"
                   checked={state.filters.city_filter.includes(cityData.name)}
                   onChange={(e) => {
                     const newCities = e.target.checked
                       ? [...state.filters.city_filter, cityData.name]
                       : state.filters.city_filter.filter(c => c !== cityData.name)
                     setState(prev => ({
                       ...prev,
                       filters: { ...prev.filters, city_filter: newCities }
                     }))
                   }}
                   className="mr-2"
                 />
                 <span className="text-sm">
                   {cityData.name}
                   {cityData.count > 0 && (
                     <span className="text-gray-500 ml-1">({cityData.count})</span>
                   )}
                 </span>
               </div>
             </label>
           ))}
         </div>
       </div>
     )
   }
   
   // 渲染客户类型筛选
   const renderCustomerTypeFilter = () => {
     // 按维度分类客户类型 - 紧凑四列布局
     const categoryGroups = {
       '购买行为': ['NEW', 'REPEAT', 'FANATIC', 'VIP'],
       '消费偏好': ['HIGH_VALUE', 'LOW_VALUE'],
       '活跃度': ['DECLINING', 'COOLING', 'SILENT', 'LOST'],
       '退货行为': ['PICKY', 'ASSASSIN']
     }
     
     return (
       <div className="grid grid-cols-4 gap-2">
         {Object.entries(categoryGroups).map(([categoryName, types]) => (
           <div key={category_name} className="space-y-1.5">
             <h4 className="text-xs font-medium text-gray-700 text-center border-b border-gray-200 pb-0.5 mb-1">{category_name}</h4>
             <div className="space-y-0.5">
               {types.map(type => {
                 const config = CUSTOMER_TYPE_LABELS[type]
                 if (!config) return null
                 
                 const { icon, label } = config
                 
                 return (
                   <label key={type} className="flex items-center py-0.5 px-1 hover:bg-gray-50 cursor-pointer rounded text-xs" title={config.description}>
                     <input
                       type="checkbox"
                       checked={state.filters.customer_type.includes(type)}
                       onChange={(e) => {
                         const newTypes = e.target.checked
                           ? [...state.filters.customer_type, type]
                           : state.filters.customer_type.filter(t => t !== type)
                         
                         setState(prev => ({
                           ...prev,
                           filters: { ...prev.filters, customer_type: newTypes }
                         }))
                       }}
                       className="mr-1 scale-75 flex-shrink-0"
                     />
                     <span className="flex items-center truncate min-w-0">
                       <span className="mr-0.5 text-xs flex-shrink-0">{icon}</span>
                       <span className="truncate text-xs">{label}</span>
                     </span>
                   </label>
                 )
               })}
               {/* 为退货行为列添加占位空间，保持对齐 */}
               {categoryName === '退货行为' && types.length < 4 && (
                 Array.from({ length: 4 - types.length }).map((_, index) => (
                   <div key={`placeholder-${index}`} className="py-0.5 px-1 text-xs" style={{ height: '20px' }}></div>
                 ))
               )}
             </div>
           </div>
         ))}
       </div>
     )
   }
   
   // 渲染范围筛选
   const renderRangeFilter = (column: string) => {
     const get_range_values = () => {
       switch (column) {
         case 'total_orders':
           return { min: state.filters.total_orders_min, max: state.filters.total_orders_max }
         case 'total_all_orders':
           return { min: state.filters.total_all_orders_min, max: state.filters.total_all_orders_max }
         case 'total_purchases':
           return { min: state.filters.total_purchases_min, max: state.filters.total_purchases_max }
         default:
           return { min: '', max: '' }
       }
     }
     
     const setRangeValues = (min: string, max: string) => {
       setState(prev => ({
         ...prev,
         filters: {
           ...prev.filters,
           ...(column === 'total_orders' && { 
             total_orders_min: min, 
             total_orders_max: max 
           }),
           ...(column === 'total_all_orders' && { 
             total_all_orders_min: min, 
             total_all_orders_max: max 
           }),
           ...(column === 'total_purchases' && { 
             total_purchases_min: min, 
             total_purchases_max: max 
           })
         }
       }))
     }
     
     const { min, max } = get_range_values()
     
     return (
       <div className="space-y-3">
         <div>
           <label className="block text-xs text-gray-600 mb-1">最小值</label>
           <input
             type="number"
             placeholder="最小值"
             value={min}
             onChange={(e) => setRangeValues(e.target.value, max)}
             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
           />
         </div>
         <div>
           <label className="block text-xs text-gray-600 mb-1">最大值</label>
           <input
             type="number"
             placeholder="最大值"
             value={max}
             onChange={(e) => setRangeValues(min, e.target.value)}
             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
           />
         </div>
       </div>
     )
   }
   
   // 渲染排序和范围筛选
   const renderSortAndRangeFilter = (column: string) => {
     const get_range_values = () => {
       switch (column) {
         case 'total_orders':
           return { min: state.filters.total_orders_min, max: state.filters.total_orders_max }
         case 'total_all_orders':
           return { min: state.filters.total_all_orders_min, max: state.filters.total_all_orders_max }
         case 'total_purchases':
           return { min: state.filters.total_purchases_min, max: state.filters.total_purchases_max }
         default:
           return { min: '', max: '' }
       }
     }
     
     const setRangeValues = (min: string, max: string) => {
       setState(prev => ({
         ...prev,
         filters: {
           ...prev.filters,
           ...(column === 'total_orders' && { 
             total_orders_min: min, 
             total_orders_max: max 
           }),
           ...(column === 'total_all_orders' && { 
             total_all_orders_min: min, 
             total_all_orders_max: max 
           }),
           ...(column === 'total_purchases' && { 
             total_purchases_min: min, 
             total_purchases_max: max 
           })
         },
         pagination: { ...prev.pagination, page: 1 }
       }))
     }
     
     // 处理排序
     const handleSortClick = (order: 'asc' | 'desc') => {
       // 构建新的状态
       const newState = {
         ...state,
         sort_by: column,
         sort_order: order,
         pagination: { ...state.pagination, page: 1 }
       }
       
       // 更新状态
       setState(prev => ({
         ...prev,
         sort_by: column,
         sort_order: order,
         pagination: { ...prev.pagination, page: 1 }
       }))
       
       // 立即调用API应用排序，传入新状态
       fetchCustomers(newState)
       
       // 关闭筛选面板
       setState(prev => ({
         ...prev,
         column_filters: { ...prev.column_filters, visible: false }
       }))
     }
     
     const { min, max } = get_range_values()
     
     return (
       <div className="space-y-4">
         {/* 排序功能 */}
         <div>
           <label className="block text-xs text-gray-600 mb-2">排序</label>
           <div className="flex space-x-2">
             <button
               onClick={() => handleSortClick('asc')}
               className={`px-2 py-1 text-xs rounded ${
                 state.sort_by === column && state.sort_order === 'asc'
                   ? 'bg-blue-500 text-white'
                   : 'bg-gray-100 hover:bg-gray-200'
               }`}
             >
               升序
             </button>
             <button
               onClick={() => handleSortClick('desc')}
               className={`px-2 py-1 text-xs rounded ${
                 state.sort_by === column && state.sort_order === 'desc'
                   ? 'bg-blue-500 text-white'
                   : 'bg-gray-100 hover:bg-gray-200'
               }`}
             >
               降序
             </button>
           </div>
         </div>
         
         {/* 范围筛选 */}
         <div>
           <label className="block text-xs text-gray-600 mb-2">范围筛选</label>
           <div className="flex space-x-1 items-center">
             <input
               type="number"
               placeholder="最小"
               value={min}
               onChange={(e) => setRangeValues(e.target.value, max)}
               className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
             />
             <span className="text-xs text-gray-500">-</span>
             <input
               type="number"
               placeholder="最大"
               value={max}
               onChange={(e) => setRangeValues(min, e.target.value)}
               className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
             />
           </div>
           <div className="flex space-x-1 mt-2">
             <button
               onClick={() => {
                 // 立即应用范围筛选
                 setState(prev => ({
                   ...prev,
                   column_filters: { ...prev.column_filters, visible: false }
                 }))
                 setTimeout(() => {
                   fetchCustomers()
                 }, 0)
               }}
               className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
             >
               应用
             </button>
             <button
               onClick={() => {
                 // 清除范围筛选
                 clearColumnFilter(column)
                 setState(prev => ({
                   ...prev,
                   column_filters: { ...prev.column_filters, visible: false }
                 }))
                 setTimeout(() => {
                   fetchCustomers()
                 }, 0)
               }}
               className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
             >
               清除
             </button>
           </div>
         </div>
       </div>
     )
   }
   
   // 渲染日期范围筛选
   const renderDateRangeFilter = (column: string) => {
     if (column !== 'last_purchase_date' && column !== 'first_purchase_date') return null
     
     // 处理排序
     const handleSortClick = (order: 'asc' | 'desc') => {
       // 构建新的状态
       const newState = {
         ...state,
         sort_by: column,
         sort_order: order,
         pagination: { ...state.pagination, page: 1 }
       }
       
       // 更新状态
       setState(prev => ({
         ...prev,
         sort_by: column,
         sort_order: order,
         pagination: { ...prev.pagination, page: 1 }
       }))
       
       // 立即获取数据
       setTimeout(() => {
         fetchCustomers(newState)
       }, 0)
     }
     
     return (
       <div className="space-y-4">
         {/* 排序功能 */}
         <div>
           <label className="block text-xs text-gray-600 mb-2">排序</label>
           <div className="flex space-x-2">
             <button
               onClick={() => handleSortClick('asc')}
               className={`px-2 py-1 text-xs rounded ${
                 state.sort_by === column && state.sort_order === 'asc'
                   ? 'bg-blue-500 text-white'
                   : 'bg-gray-100 hover:bg-gray-200'
               }`}
             >
               升序
             </button>
             <button
               onClick={() => handleSortClick('desc')}
               className={`px-2 py-1 text-xs rounded ${
                 state.sort_by === column && state.sort_order === 'desc'
                   ? 'bg-blue-500 text-white'
                   : 'bg-gray-100 hover:bg-gray-200'
               }`}
             >
               降序
             </button>
           </div>
         </div>
         
         {/* 日期范围筛选 */}
         <div>
           <label className="block text-xs text-gray-600 mb-2">日期范围</label>
           <div className="space-y-3">
             <div>
               <label className="block text-xs text-gray-600 mb-1">开始日期</label>
               <input
                 type="date"
                 value={column === 'first_purchase_date' ? state.filters.first_purchase_start : state.filters.last_purchase_start}
                 onChange={(e) => setState(prev => ({
                   ...prev,
                   filters: { 
                     ...prev.filters, 
                     ...(column === 'first_purchase_date' 
                       ? { first_purchase_start: e.target.value }
                       : { last_purchase_start: e.target.value }
                     )
                   }
                 }))}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               />
             </div>
             <div>
               <label className="block text-xs text-gray-600 mb-1">结束日期</label>
               <input
                 type="date"
                 value={column === 'first_purchase_date' ? state.filters.first_purchase_end : state.filters.last_purchase_end}
                 onChange={(e) => setState(prev => ({
                   ...prev,
                   filters: { 
                     ...prev.filters, 
                     ...(column === 'first_purchase_date' 
                       ? { first_purchase_end: e.target.value }
                       : { last_purchase_end: e.target.value }
                     )
                   }
                 }))}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               />
             </div>
           </div>
         </div>
       </div>
     )
   }
   
   // 清除列筛选
   const clearColumnFilter = (column: string) => {
     setState(prev => {
       const newFilters = { ...prev.filters }
       
       switch (column) {
         case 'customer_code':
           newFilters.customer_code_search = ''
           break
         case 'name':
           newFilters.name_search = ''
           break
         case 'phone':
           newFilters.phone_search = ''
           break
         case 'city':
           newFilters.city_filter = []
           break
         case 'customer_type':
           newFilters.customer_type = []
           break
         case 'total_orders':
           newFilters.total_orders_min = ''
           newFilters.total_orders_max = ''
           break
         case 'total_all_orders':
           newFilters.total_all_orders_min = ''
           newFilters.total_all_orders_max = ''
           break
         case 'total_purchases':
           newFilters.total_purchases_min = ''
           newFilters.total_purchases_max = ''
           break
         case 'first_purchase_date':
           newFilters.first_purchase_start = ''
           newFilters.first_purchase_end = ''
           break
         case 'last_purchase_date':
           newFilters.last_purchase_start = ''
           newFilters.last_purchase_end = ''
           break
       }
       
       return {
         ...prev,
         filters: newFilters,
         city_search_term: column === 'city' ? '' : prev.city_search_term
       }
     })
   }
 
   // 获取客户列表
  const fetchCustomers = async (customState?: Partial<CustomerManagementState>) => {
    try {
      // 使用传入的状态或当前状态
      const currentState = customState ? { ...state, ...custom_state } : state
      
      // 只有在没有数据时才显示loading，避免闪烁
      setState(prev => ({ 
        ...prev, 
        loading: prev.customers.length === 0, // 只有在没有客户数据时才显示loading
        error: null 
      }))
      console.log('📊 当前状态:', {
        filters: currentState.filters,
        selected_type: currentState.selected_type,
        search_term: currentState.search_term
      })
      
      const params: any = {
        page: currentState.pagination.page,
        limit: currentState.pagination.limit,
        sort: currentState.sort_order,
        sort_by: currentState.sort_by,
        getCityStats: true // 获取城市统计数据
      }
      
      // 保持向后兼容的搜索
      if (currentState.search_term.trim()) {
        params.search = currentState.search_term.trim()
      }
      
      // 修复客户类型参数冲突问题
      // 优先使用新的多维度筛选，如果没有则使用旧的单一类型筛选
      if (currentState.filters.customer_type.length > 0) {
        params.customer_type_filter = currentState.filters.customer_type.join(',')
        console.log('🏷️ 使用多维度客户类型筛选:', currentState.filters.customer_type)
      } else if (currentState.selected_type) {
        params.customer_type = currentState.selected_type

      }
      
      // 新增的筛选参数
      if (currentState.filters.customer_code_search) {
        params.customer_code_search = currentState.filters.customer_code_search
      }
      
      if (currentState.filters.name_search) {
        params.name_search = currentState.filters.name_search
      }
      
      if (currentState.filters.phone_search) {
        params.phone_search = currentState.filters.phone_search
      }
      
      if (currentState.filters.city_filter.length > 0) {
        params.city_filter = currentState.filters.city_filter.join(',')
      }
      
      if (currentState.filters.total_orders_min) {
        params.total_orders_min = currentState.filters.total_orders_min
      }
      
      if (currentState.filters.total_orders_max) {
        params.total_orders_max = currentState.filters.total_orders_max
      }
      
      if (currentState.filters.total_all_orders_min) {
        params.total_all_orders_min = currentState.filters.total_all_orders_min
      }
      
      if (currentState.filters.total_all_orders_max) {
        params.total_all_orders_max = currentState.filters.total_all_orders_max
      }
      
      if (currentState.filters.total_purchases_min) {
        params.total_purchases_min = currentState.filters.total_purchases_min
      }
      
      if (currentState.filters.total_purchases_max) {
        params.total_purchases_max = currentState.filters.total_purchases_max
      }
      
      if (currentState.filters.first_purchase_start) {
        params.first_purchase_start = currentState.filters.first_purchase_start
      }
      
      if (currentState.filters.first_purchase_end) {
        params.first_purchase_end = currentState.filters.first_purchase_end
      }
      
      if (currentState.filters.last_purchase_start) {
        params.last_purchase_start = currentState.filters.last_purchase_start
      }
      
      if (currentState.filters.last_purchase_end) {
        params.last_purchase_end = currentState.filters.last_purchase_end
      }
      
      console.log('📡 API请求参数:', params)
      const response = await customer_api.list(params)
      console.log('📡 API响应:', response)
      
      if (response.success && response.data) {
        const data = response.data as any
        console.log('✅ 数据获取成功:', {
          customersCount: data.customers?.length || 0,
          pagination: data.pagination,
          cityStatsCount: data.city_stats?.length || 0
        })
        setState(prev => ({
          ...prev,
          customers: data.customers || [],
          pagination: data.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 },
          city_stats: data.city_stats || [], // 更新城市统计数据
          loading: false // 确保数据加载完成后关闭loading
        }))
      } else {
        console.error('❌ API响应失败:', response)
        throw new Error(response.message || '获取客户列表失败')
      }
    } catch (error: any) {
      console.error('❌ fetchCustomers 执行失败:', error)
      
      // 检查是否是因为没有客户数据导致的错误
      const isNoDataError = error.message?.includes('客户不存在') || error.message?.includes('404')
      
      if (!isNoDataError) {
        console.error('获取客户列表失败:', error)
        toast.error('获取客户列表失败')
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        customers: [], // 设置空数组
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }, // 重置分页
        city_stats: [], // 重置城市统计数据
        error: isNoDataError ? null : (error.message || '获取客户列表失败')
      }))
    }
  }

  // 获取客户统计分析
  const fetchAnalytics = async () => {
    try {
      const response = await customer_api.get_analytics({ time_period: state.time_period })
      if (response.success && response.data) {
        setState(prev => ({ ...prev, analytics: response.data as CustomerAnalytics }))
      } else {
        // 如果没有数据，设置默认的空统计数据
        setState(prev => ({ 
          ...prev, 
          analytics: {
            total_customers: 0,
            new_customers: 0,
            repeat_customers: 0,
            vip_customers: 0,
            active_customers: 0,
            inactive_customers: 0,
            average_order_value: 0,
            repeat_purchase_rate: 0,
            refund_rate: 0,
            average_profit_margin: 0
          }
        }))
      }
    } catch (error: any) {
      // 静默处理错误，不在控制台输出错误日志
      // 设置默认的空统计数据
      setState(prev => ({ 
        ...prev, 
        analytics: {
          total_customers: 0,
          new_customers: 0,
          repeat_customers: 0,
          vip_customers: 0,
          active_customers: 0,
          inactive_customers: 0,
          average_order_value: 0,
          repeat_purchase_rate: 0,
          refund_rate: 0,
          average_profit_margin: 0
        }
      }))
    }
  }

  // 初始化数据
  useEffect(() => {
    if (is_authenticated) {
      fetchCustomers()
      fetchAnalytics()
      
      // 添加页面可见性监听，当用户返回页面时自动刷新数据
      const handleVisibilityChange = () => {
        if (!document.hidden && is_authenticated) {
          // 页面变为可见时刷新客户数据
          fetchCustomers()
          fetchAnalytics()
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // 清理事件监听器
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [
    is_authenticated, 
    state.pagination.page, 
    state.search_term, 
    state.selected_type, 
    state.sort_by, 
    state.sort_order, 
    state.time_period
  ])

  // 筛选条件变化时重新获取数据
  useEffect(() => {
    if (is_authenticated) {
      console.log('🔄 筛选条件变化，准备重新获取数据', {
        customer_type: state.filters.customer_type,
        city_filter: state.filters.city_filter,
        customer_code_search: state.filters.customer_code_search,
        name_search: state.filters.name_search,
        phone_search: state.filters.phone_search
      })
      
      const timer = setTimeout(() => {
        console.log('⏰ 防抖时间到，开始获取数据')
        fetchCustomers()
      }, 300) // 防抖处理
      return () => {
        console.log('🚫 清除防抖定时器')
        clearTimeout(timer)
      }
    }
  }, [
    state.filters.customer_code_search,
    state.filters.name_search,
    state.filters.phone_search,
    state.filters.city_filter,
    state.filters.customer_type,
    state.filters.total_orders_min,
    state.filters.total_orders_max,
    state.filters.total_all_orders_min,
    state.filters.total_all_orders_max,
    state.filters.total_purchases_min,
    state.filters.total_purchases_max,
    state.filters.last_purchase_start,
    state.filters.last_purchase_end
  ])
  
  // 专门监控客户类型筛选变化
  useEffect(() => {

    
    // 检查是否有无效的客户类型
    const invalidTypes = state.filters.customer_type.filter(type => 
      !Object.keys(CUSTOMER_TYPE_LABELS).includes(type)
    )
    
    if (invalidTypes.length > 0) {
      console.warn('⚠️ 发现无效的客户类型:', invalidTypes)
    }
  }, [state.filters.customer_type, state.column_filters])

  // 删除未使用的搜索和筛选函数

  // 删除未使用的函数以修复TypeScript错误

  // 分页处理
  const handle_page_change = (page: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    }))
  }

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
    // 立即使用新的limit值重新获取数据
    setTimeout(() => {
      fetchCustomers({
        pagination: { 
          page: 1, 
          limit: newLimit,
          total: state.pagination.total,
          total_pages: Math.ceil(state.pagination.total / newLimit)
        },
        filters: state.filters,
        sort_by: state.sort_by,
        sort_order: state.sort_order
      })
    }, 0)
  }

  // 分页组件
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
                onClick={() => handle_page_change(state.pagination.page - 1)}
                disabled={state.pagination.page <= 1}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => handle_page_change(state.pagination.page + 1)}
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
                  onClick={() => handle_page_change(state.pagination.page - 1)}
                  disabled={state.pagination.page <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {(() => {
                   const total_pages = state.pagination.total_pages
                  const maxVisiblePages = 5
                  const current_page = state.pagination.page
                  
                  let startPage = Math.max(1, current_page - Math.floor(maxVisiblePages / 2))
                  let endPage = Math.min(total_pages, startPage + maxVisiblePages - 1)
                  
                  // 调整起始页，确保显示足够的页码
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1)
                  }
                  
                  const pages = []
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i)
                  }
                  
                  return pages.map(page => (
                    <button
                      key={page}
                      onClick={() => handle_page_change(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
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
                  onClick={() => handle_page_change(state.pagination.page + 1)}
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

  // 查看客户详情
  const handleViewCustomer = (customer: Customer) => {
    setState(prev => ({
      ...prev,
      selected_customer: customer,
      show_detail_modal: true
    }))
  }

  // 打开反向销售录入
  const handleReverseSale = (customer: Customer) => {
    setState(prev => ({
      ...prev,
      selected_customer: customer,
      show_reverse_sale_modal: true
    }))
  }

  // 打开退货功能
  const handleRefund = (customer: Customer) => {
    setState(prev => ({
      ...prev,
      selected_customer: customer,
      show_refund_modal: true
    }))
  }

  // 反向销售成功回调
  const handleReverseSaleSuccess = () => {
    // 刷新客户列表和统计数据
    fetchCustomers()
    fetchAnalytics()
  }

  // 创建客户成功回调
  const handleCreateSuccess = () => {
    // 刷新客户列表和统计数据
    fetchCustomers()
    fetchAnalytics()
  }

  // 格式化金额
  const format_currency = (amount: any) => {
    // 处理各种数据类型
    if (amount === undefined || amount === null || amount === '') {
      return '¥0.00'
    }
    
    // 转换为数字
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
    
    // 检查是否为有效数字
    if (isNaN(numAmount) || !isFinite(numAmount)) {
      return '¥0.00'
    }
    
    return `¥${numAmount.toFixed(2)}`
  }

  // 格式化日期
  const format_date = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      timeZone: 'Asia/Shanghai'
    })
  }

  if (!is_authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">需要登录</h2>
          <p className="text-gray-600">请先登录后再访问客户管理页面</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="h-7 w-7 mr-3 text-blue-600" />
              客户管理
            </h1>
            <p className="text-gray-600 mt-1">管理客户信息、购买记录和销售分析</p>
          </div>
          <button
            onClick={() => setState(prev => ({ ...prev, show_create_modal: true }))}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增客户
          </button>
        </div>
      </div>

      {/* 客户统计概览 */}
      {state.analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">总客户数</p>
                <p className="text-2xl font-bold text-gray-900">{state.analytics.total_customers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">总复购率</p>
                <p className="text-2xl font-bold text-gray-900">{state.analytics.repeat_purchase_rate?.toFixed(1) || '0.0'}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Undo className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">总退货率</p>
                <p className="text-2xl font-bold text-gray-900">{state.analytics.refund_rate?.toFixed(1) || '0.0'}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">平均订单价值</p>
                <p className="text-2xl font-bold text-gray-900">{format_currency(state.analytics.average_order_value)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">平均毛利率</p>
                <p className="text-2xl font-bold text-gray-900">{state.analytics.average_profit_margin?.toFixed(1) || '0.0'}%</p>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* 客户列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {state.error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
              <p className="text-gray-600 mb-4">{state.error}</p>
              <button
                onClick={() => fetchCustomers()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                重试
              </button>
            </div>
          </div>
        ) : state.loading && state.customers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">加载中...</h3>
              <p className="text-gray-600">正在获取客户数据</p>
            </div>
          </div>
        ) : state.customers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无客户</h3>
              <p className="text-gray-600 mb-4">还没有客户记录，点击上方按钮添加第一个客户</p>
              <button
                onClick={() => setState(prev => ({ ...prev, show_create_modal: true }))}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2 inline" />
                新增客户
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 表格 */}
            <div className="overflow-x-auto">
              <table className="table-apple" style={{ tableLayout: 'fixed', minWidth: '1100px' }}>
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center" style={{ whiteSpace: 'nowrap' }}>
                        <span className="flex-shrink-0">客户编号</span>
                        <button
                          ref={(el) => {
                            if (el) columnRefs.current['customer_code'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e, 'customer_code')}
                          className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center" style={{ whiteSpace: 'nowrap' }}>
                        <span className="flex-shrink-0">客户名称</span>
                        <button
                          ref={(el) => {
                            if (el) columnRefs.current['name'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e, 'name')}
                          className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center" style={{ whiteSpace: 'nowrap' }}>
                        <span className="flex-shrink-0">手机号</span>
                        <button
                          ref={(el) => {
                            if (el) columnRefs.current['phone'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e, 'phone')}
                          className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center" style={{ whiteSpace: 'nowrap' }}>
                        <span className="flex-shrink-0">城市</span>
                        <button
                          ref={(el) => {
                            if (el) columnRefs.current['city'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e, 'city')}
                          className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '60px', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center" style={{ whiteSpace: 'nowrap' }}>
                        <span className="flex-shrink-0">有效单</span>
                        <button
                          ref={(el) => {
                            if (el) columnRefs.current['total_orders'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e, 'total_orders')}
                          className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '60px', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center" style={{ whiteSpace: 'nowrap' }}>
                        <span className="flex-shrink-0">总订单</span>
                        <button
                          ref={(el) => {
                            if (el) columnRefs.current['total_all_orders'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e, 'total_all_orders')}
                          className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center" style={{ whiteSpace: 'nowrap' }}>
                        <span className="flex-shrink-0">累计消费</span>
                        <button
                          ref={(el) => {
                            if (el) columnRefs.current['total_purchases'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e, 'total_purchases')}
                          className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center" style={{ whiteSpace: 'nowrap' }}>
                        <span className="flex-shrink-0">首次购买</span>
                        <button
                          ref={(el) => {
                            if (el) columnRefs.current['first_purchase_date'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e, 'first_purchase_date')}
                          className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center" style={{ whiteSpace: 'nowrap' }}>
                        <span className="flex-shrink-0">最后购买</span>
                        <button
                          ref={(el) => {
                            if (el) columnRefs.current['last_purchase_date'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e, 'last_purchase_date')}
                          className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '90px', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center" style={{ whiteSpace: 'nowrap' }}>
                        <span className="flex-shrink-0">客户类型</span>
                        <button
                          ref={(el) => {
                            if (el) columnRefs.current['customer_type'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e, 'customer_type')}
                          className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px', whiteSpace: 'nowrap' }}>操作</th>
                  </tr>
                </thead>
            
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.customers.map((customer) => {
                    const customer_labels = get_customer_labels(customer, state.customers)
                    return (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        {/* 客户编号 */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-mono" style={{ width: '120px' }}>
                          <div className="truncate">{customer.customer_code || 'N/A'}</div>
                        </td>
                        
                        {/* 客户名称 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style={{ width: '100px' }}>
                          <div className="truncate">{customer.name}</div>
                        </td>
                        
                        {/* 手机号 */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-mono" style={{ width: '100px' }}>
                          <div className="truncate">{customer.phone}</div>
                        </td>
                        
                        {/* 所在城市 */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600" style={{ width: '80px' }}>
                          {extractCityFromAddress(customer.address)}
                        </td>
                        
                        {/* 有效订单 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '60px' }}>
                          {customer.total_orders} 单
                        </td>
                        
                        {/* 总订单量 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '60px' }}>
                          {customer.total_all_orders || 0} 单
                        </td>
                        
                        {/* 累计消费 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style={{ width: '100px' }}>
                          <div className="truncate">{format_currency(customer.total_purchases)}</div>
                        </td>
                        
                        {/* 首次购买 */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900" style={{ width: '80px' }}>
                          <div className="truncate">{customer.first_purchase_date ? format_date(customer.first_purchase_date) : '暂无'}</div>
                        </td>
                        
                        {/* 最后购买 */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900" style={{ width: '80px' }}>
                          <div className="truncate">{customer.last_purchase_date ? format_date(customer.last_purchase_date) : '暂无'}</div>
                        </td>
                        
                        {/* 客户类型 */}
                        <td className="px-6 py-4 whitespace-nowrap" style={{ width: '90px' }}>
                          <div className="flex flex-wrap gap-1">
                            {customer_labels.map((label_key) => {
                              const labelConfig = CUSTOMER_TYPE_LABELS[labelKey]
                              if (!labelConfig) return null
                              
                              return (
                                <div
                                  key={label_key}
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                  title={labelConfig.description}
                                >
                                  <span className="text-xs">{labelConfig.icon}</span>
                                </div>
                              )
                            })}
                          </div>
                        </td>
                        
                        {/* 操作按钮 */}
                        <td className="px-6 py-4 whitespace-nowrap" style={{ width: '80px' }}>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleViewCustomer(customer)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="查看详情"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleReverseSale(customer)}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="销售录入"
                            >
                              <ShoppingCart className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleRefund(customer)}
                              className="p-1 transition-colors"
                              style={{ color: '#ef4444' }}
                              onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#dc2626'}
                              onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#ef4444'}
                              title="退货"
                            >
                              <span className="text-sm">🔙</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* 分页 */}
            {renderPagination()}
          </>
        )}
      </div>
      
      {/* 反向销售录入模态框 */}
      {state.selected_customer && (
        <ReverseSaleModal
          customer={state.selected_customer}
          is_open={state.show_reverse_sale_modal}
          onClose={() => setState(prev => ({ ...prev, show_reverse_sale_modal: false, selected_customer: null }))}
          onSuccess={handleReverseSaleSuccess}
        />
      )}
      
      {/* 客户详情模态框 */}
      {state.selected_customer && (
          <CustomerDetailModal
            customer={state.selected_customer}
            is_open={state.show_detail_modal}
            onClose={() => setState(prev => ({ ...prev, show_detail_modal: false, selected_customer: null }))}
            onCustomerUpdate={fetchCustomers} // 退货后刷新客户列表
            allCustomers={state.customers} // 传入所有客户数据用于标签计算
          />
        )}
      
      {/* 客户退货模态框 */}
      {state.selected_customer && (
        <CustomerRefundModal
          customer={state.selected_customer}
          is_open={state.show_refund_modal}
          onClose={() => setState(prev => ({ ...prev, show_refund_modal: false, selected_customer: null }))}
          onSuccess={handleReverseSaleSuccess}
        />
      )}
      
      {/* 创建客户模态框 */}
      <Customer_create_modal
        is_open={state.show_create_modal}
        onClose={() => setState(prev => ({ ...prev, show_create_modal: false }))}
        onSuccess={handleCreateSuccess}
      />
      
      {/* 筛选面板 */}
      {state.column_filters.visible && (
        <Portal>
          <div
            className="filter-panel fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50"
            style={{
              left: `${state.filter_panel_position.x}px`,
              top: `${state.filter_panel_position.y}px`,
              width: state.column_filters.column === 'customer_type' 
                ? (window.innerWidth < 640 ? '320px' : '480px') 
                : '300px',
              maxWidth: 'calc(100vw - 20px)' // 确保不超出屏幕
            }}
            onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
          >
            {renderFilterPanel()}
          </div>
        </Portal>
      )}
    </div>
  )
}