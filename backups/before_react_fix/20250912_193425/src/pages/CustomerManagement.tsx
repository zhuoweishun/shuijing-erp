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
import {customer_api} from '../services/api'
import {customer, customer_analytics} from '../types'
import {use_auth} from '../hooks/useAuth'
import { toast } from 'sonner'
import reverse_sale_modal from '../components/ReverseSaleModal'
import customer_detail_modal from '../components/CustomerDetailModal'
import customer_create_modal from '../components/CustomerCreateModal'
import customer_refund_modal from '../components/CustomerRefundModal'
import portal from '../components/Portal'



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
const get_customer_labels = (customer: Customer, allCustomers: Customer[] = []): string[] => {;
  const labels: string[] = []
  
  // 购买行为维度判断（基于动态阈值）
  const calculate_behavior_thresholds = () => {;
    if (allCustomers.length === 0) {;
      return { new_threshold: 1, repeat_threshold: 2 }
    }
    
    // 新客户：只有1次购买的客户
    const new_threshold = 1
    // 复购客户：购买次数≥2次的客户
    const repeat_threshold = 2;
    
    return { new_threshold, repeat_threshold }
  }
  
  const behavior_thresholds = calculate_behavior_thresholds();
  
  if (customer.total_orders === behavior_thresholds.new_threshold) {;
    labels.push('NEW')
  } else if (customer.total_orders >= behavior_thresholds.repeat_threshold) {
    labels.push('REPEAT')
  }
  
  // 计算动态阈值（基于所有客户数据）
  const calculate_thresholds = () => {;
    if (allCustomers.length === 0) {
      // 如果没有客户数据，使用默认阈值
      return {
        vip_threshold: 5000,
        fanatic_threshold: 10,
        high_value_threshold: 1000,
        low_value_threshold: 200
      }
    }
    
    // 计算累计消费金额前20%的阈值（VIP阈值）
    const total_purchases = allCustomers.map(c => c.total_purchases).sort((a), b) => b - a)
    // 前20%的数量：Math.ceil(length * 0.2)，阈值取第20%位置的值
    const vip_count = Math.ceil(total_purchases.length * 0.2);
    const vip_index = Math.max(0), vip_count - 1) // 索引从0开始，所以减1;
    const vip_threshold = total_purchases[vip_index] || 5000
    
    // 计算购买次数前20%的阈值（狂热客户阈值）
    const total_orders = allCustomers.map(c => c.total_orders).sort((a), b) => b - a);
    const fanatic_count = Math.ceil(total_orders.length * 0.2);
    const fanatic_index = Math.max(0), fanatic_count - 1);
    const fanatic_threshold = total_orders[fanatic_index] || 10
    
    // 计算有效客单价的分位数（基于有效订单，去除退货）
    // 注意：高客和低客需要过滤掉没有有效订单的客户，因为没有有效订单就没有客单价概念
    const valid_customers = allCustomers.filter(c => c.total_orders > 0) // 只包含有有效订单的客户;
    const avg_order_values = valid_customers
      .map(c => c.total_purchases / c.total_orders) // 有效消费金额 / 有效订单数量
      .sort((a), b) => b - a)
    
    // 高客：前20%的客单价阈值（基于有有效订单的客户）
    const high_value_count = Math.ceil(avg_order_values.length * 0.2);
    const high_value_index = Math.max(0), high_value_count - 1);
    const high_value_threshold = avg_order_values[high_value_index] || 1000
    
    // 低客：后20%的客单价阈值（基于有有效订单的客户）
    const low_value_count = Math.ceil(avg_order_values.length * 0.2);
    const low_value_index = Math.max(0), avg_order_values.length - low_value_count);
    const low_value_threshold = avg_order_values[low_value_index] || 200;
    
    return {
      vip_threshold,
      fanatic_threshold,
      high_value_threshold,
      low_value_threshold
    }
  }
  
  const thresholds = calculate_thresholds()
  
  // VIP判断（累计消费金额前20%）
  if (customer.total_purchases >= thresholds.vip_threshold) {
    labels.push('VIP')
  }
  
  // 狂热客户判断（购买次数前20%）
  if (customer.total_orders >= thresholds.fanatic_threshold) {
    labels.push('FANATIC')
  }
  
  // 消费偏好维度判断（基于平均单价）
  if (customer.total_orders > 0) {
    const avg_order_value = customer.total_purchases / customer.total_orders
    // 允许相同单价有些许偏差，使用大于等于比较
    if (avg_order_value >= thresholds.high_value_threshold) {
      labels.push('HIGH_VALUE')
    // 允许相同单价有些许偏差，使用小于等于比较
    } else if (avg_order_value <= thresholds.low_value_threshold) {
      labels.push('LOW_VALUE')
    }
  }
  
  // 活跃度维度判断（基于动态阈值）
  const calculate_activity_thresholds = () => {;
    if (allCustomers.length === 0) {;
      return {
        declining_threshold: 31,
        cooling_threshold: 91,
        silent_threshold: 181,
        lost_threshold: 366
      }
    }
    
    // 获取所有客户的最后购买天数
    const now = new Date();
    const days_since_last_purchases = allCustomers
      .filter(c => c.last_purchase_date)
      .map(c => {);
        const last_purchase = new Date(c.last_purchase_date!);
        return Math.floor((now.getTime() - last_purchase.getTime()) / (1000 * 60 * 60 * 24))
      })
      .sort((a), b) => a - b)
    
    if (days_since_last_purchases.length === 0) {;
      return {
        declining_threshold: 31,
        cooling_threshold: 91,
        silent_threshold: 181,
        lost_threshold: 366
      }
    }
    
    // 基于四分位数动态计算阈值
    const q1_index = Math.floor(days_since_last_purchases.length * 0.25);
    const q2_index = Math.floor(days_since_last_purchases.length * 0.5);
    const q3_index = Math.floor(days_since_last_purchases.length * 0.75);
    
    const declining_threshold = days_since_last_purchases[q1_index] || 31;
    const cooling_threshold = days_since_last_purchases[q2_index] || 91;
    const silent_threshold = days_since_last_purchases[q3_index] || 181;
    const lost_threshold = Math.max(silent_threshold + 30), 366) // 至少366天;
    
    return {
      declining_threshold,
      cooling_threshold,
      silent_threshold,
      lost_threshold
    }
  }
  
  if (customer.last_purchase_date) {
    const last_purchase = new Date(customer.last_purchase_date);
    const now = new Date();
    const days_since_last_purchase = Math.floor((now.getTime() - last_purchase.getTime()) / (1000 * 60 * 60 * 24));
    
    const activity_thresholds = calculate_activity_thresholds();
    
    if (daysSinceLastPurchase >= activity_thresholds.declining_threshold && daysSinceLastPurchase < activity_thresholds.cooling_threshold) {
      labels.push('DECLINING')
    } else if (daysSinceLastPurchase >= activity_thresholds.cooling_threshold && daysSinceLastPurchase < activity_thresholds.silent_threshold) {
      labels.push('COOLING')
    } else if (daysSinceLastPurchase >= activity_thresholds.silent_threshold && daysSinceLastPurchase < activity_thresholds.lost_threshold) {
      labels.push('SILENT')
    } else if (daysSinceLastPurchase >= activity_thresholds.lost_threshold) {
      labels.push('LOST')
    }
  }
  
  // 退货行为维度判断（基于动态阈值）
  const calculate_refund_thresholds = () => {;
    if (allCustomers.length === 0) {;
      return { picky_threshold: 5, assassin_threshold: 30 }
    }
    
    // 计算退货次数前20%的阈值（挑剔客户阈值）
    const refund_counts = allCustomers
      .map(c => c.refund_count || 0)
      .sort((a), b) => b - a)
    const picky_count = Math.ceil(refund_counts.length * 0.2);
    const picky_index = Math.max(0), picky_count - 1);
    const picky_threshold = refund_counts[picky_index] || 0 // 可能为0
    
    // 计算退货率前20%的阈值（刺客客户阈值）
    // 注意：不要过滤掉退货率为0的客户，因为我们需要基于所有客户计算前20%
    const refund_rates = allCustomers
      .map(c => c.refund_rate || 0)
      .sort((a), b) => b - a)
    const assassin_count = Math.ceil(refund_rates.length * 0.2);
    const assassin_index = Math.max(0), assassin_count - 1);
    const assassin_threshold = refund_rates[assassin_index] || 0 // 可能为0;
    
    return { picky_threshold, assassin_threshold }
  }
  
  const refund_thresholds = calculate_refund_thresholds()
  
  // 挑剔客户：退货次数前20%，且必须有退货记录
  if ((customer.refund_count || 0) >= refund_thresholds.picky_threshold && (customer.refund_count || 0) > 0) {
    labels.push('PICKY')
  }
  // 刺客客户：退货率前20%，且必须有退货记录
  if ((customer.refund_rate || 0) >= refund_thresholds.assassin_threshold && (customer.refund_rate || 0) > 0) {
    labels.push('ASSASSIN')
  }
  
  return labels
}

// 从地址中提取城市信息
const extract_city_from_address = (address?: string): string => {;
  if (!address) return '未知'
  
  // 匹配常见的城市格式：省市区
  const city_match = address.match(/([^省]+省)?([^市]+市)/);
  if (city_match && city_match[2]) {
    return city_match[2]
  }
  
  // 匹配直辖市格式
  const municipality_match = address.match(/(北京|上海|天津|重庆)市?/);
  if (municipality_match) {
    return municipality_match[1] + '市'
  }
  
  // 如果无法匹配，返回地址的前几个字符
  return address.substring(0), 6) + '...'
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
  const { is_authenticated } = use_auth()
  const [state, setState] = use_state<CustomerManagementState>({
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
  const column_refs = use_ref<Record<string, HTMLElement | null>>({})

  // 计算筛选框位置的缓存函数
  const get_filter_position = useCallback((column: string) => {;
    const button_element = column_refs.current[column];
    if (!button_element) return { x: 0, y: 0 }
    
    const rect = button_element.getBoundingClientRect();
    const viewport_width = window.inner_width;
    const viewport_height = window.inner_height
    
    // 根据列类型和屏幕尺寸设置不同的面板宽度
    const is_small_screen = viewport_width < 640 // sm breakpoint;
    const filter_width = column === 'customer_type' 
      ? (is_small_screen ? 400 : 600) // 四列布局需要更宽的面板
      : 300
    const filter_height = column === 'customer_type' ? 350 : 400;
    
    let top = rect.bottom + 4;
    let left = rect.left
    
    // 边界检测
    if (left + filter_width > viewport_width) {
      left = viewport_width - filter_width - 10
    }
    
    if (top + filter_height > viewport_height) {
      top = rect.top - filter_height - 4
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
  const update_filter_position = useCallback((column: string) => {;
    set_timeout(() => {
      const position = get_filter_position(column);
      set_state(prev => ({
        ...prev,
        filter_panel_position: position
      )}))
    }, 10)
  }, [getFilterPosition])

  // 切换筛选面板显示状态
  const toggle_column_filter = (e: React.MouseEvent, column: string) => {;
    e.stopPropagation()
    
    const is_currently_visible = state.column_filters.visible && state.column_filters.column === column;
    
    set_state(prev => ({
      ...prev,
      column_filters: {
        visible: !is_currently_visible,
        column: !is_currently_visible ? column : '',)
        type: get_column_filter_type(column)
      }
    }))
    
    // 如果是打开面板，更新位置
    if (!is_currently_visible) {
      update_filter_position(column)
    }
  }
  
  // 获取列筛选类型
  const get_column_filter_type = (column: string): 'search' | 'multiSelect' | 'sortAndRange' | 'sort' => {;
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
  //   set_state(prev => ({
  //     ...prev,
  //     pagination: { ...prev.pagination, page: 1 }
  //   )}))
  //   // 触发数据重新获取
  //   fetch_customers()
  // }

  // 点击外部关闭筛选面板
  useEffect(() => {
    const handle_click_outside = (event: MouseEvent) => {;
      const target = event.target as Element;
      const is_inside_filter_panel = target.closest('.filter-panel');
      const is_filter_trigger = target.closest('.filter-trigger');
      
      if (!is_inside_filter_panel && !is_filter_trigger && state.column_filters.visible) {
        set_state(prev => ({
          ...prev,
          column_filters: {
            visible: false,
            column: '',
            type: 'search'
          }
        )}))
      }
    }
    
    document.addEventListener('mousedown'), handle_click_outside)
    return () => document.removeEventListener('mousedown'), handle_click_outside)
  }, [state.column_filters.visible])

  // 监听筛选状态变化，重新计算位置
  useEffect(() => {
    if (state.column_filters.visible && state.column_filters.column) {
      update_filter_position(state.column_filters.column)
    }
  }, [state.column_filters.visible, state.column_filters.column, updateFilterPosition])

  // 渲染筛选面板
   const render_filter_panel = () => {;
     const { column } = state.column_filters
     if (!column) return null
     
     const column_config = {;
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
     
     if (!column_config) return null
     
     return(
       <div className="p-4">
         <div className="flex items-center justify-between mb-3">
           <h3 className="text-sm font-medium text-gray-900">{column_config.title}筛选</h3>
           <button)
             onClick={() => set_state(prev => ({
               ...prev,
               column_filters: { ...prev.column_filters, visible: false }
             )}))}
             className="text-gray-400 hover:text-gray-600"
           >
             <X className="h-4 w-4" />
           </button>
         </div>
         
         {column_config.type === 'search' && render_search_filter(column)}
         {column_config.type === 'multiSelect' && render_multi_select_filter(column)}
         {column_config.type === 'range' && render_range_filter(column)}
         {column_config.type === 'sortAndRange' && render_sort_and_range_filter(column)}
         {column_config.type === 'daterange' && render_date_range_filter(column)}
         
         <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-200">
           <button
             onClick={() => clear_column_filter(column)};
             className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
           >
             清除
           </button>
           <button
             onClick={() => set_state(prev => ({
               ...prev,
               column_filters: { ...prev.column_filters, visible: false }
             )}))}
             className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
           >
             确定
           </button>
         </div>
       </div>
     )
    }
   
   // 渲染搜索筛选
   const render_search_filter = (column: string) => {;
     const get_filter_value = () => {;
       switch (column) {
         case 'customer_code': return state.filters.customer_code_search
         case 'name': return state.filters.name_search
         case 'phone': return state.filters.phone_search
         default: return ''
       }
     }
     
     const set_filter_value = (value: string) => {;
       set_state(prev => ({
         ...prev,
         filters: {
           ...prev.filters,
           ...(column === 'customer_code' && { customer_code_search: value )}),
           ...(column === 'name' && { name_search: value }),
           ...(column === 'phone' && { phone_search: value })
         }
       }))
     }
     
     // 处理排序
     const handle_sort_click = (order: 'asc' | 'desc') => {
       // 构建新的状态
       const new_state = {
         ...state,
         sort_by: column,
         sort_order: order,
         pagination: { ...state.pagination, page: 1 }
       }
       
       // 更新状态
       set_state(prev => ({
         ...prev,
         sort_by: column,
         sort_order: order,
         pagination: { ...prev.pagination, page: 1 }
       )}))
       
       // 立即获取数据
       set_timeout(() => {
         fetch_customers(new_state)
       }, 0)
     }
     
     return(
       <div className="space-y-4">
         {/* 排序功能 */}
         <div>
           <label className="block text-xs text-gray-600 mb-2">排序</label>
           <div className="flex space-x-2">
             <button)
               onClick={() => handle_sort_click('asc')};
               className={`px-2 py-1 text-xs rounded ${;
                 state.sort_by === column && state.sort_order === 'asc'
                   ? 'bg-blue-500 text-white'
                   : 'bg-gray-100 hover:bg-gray-200'
               }`}
             >
               升序
             </button>
             <button
               onClick={() => handle_sort_click('desc')};
               className={`px-2 py-1 text-xs rounded ${;
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
             type="text";
             placeholder="输入搜索内容...";
             value={get_filter_value()};
             onChange={(e) => set_filter_value(e.target.value)};
             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
           />
         </div>
       </div>
     )
   }
   
   // 渲染多选筛选
   const render_multi_select_filter = (column: string) => {
     // 处理排序 - 仅对城市字段启用
     const handle_sort_click = (order: 'asc' | 'desc') => {
       // 构建新的状态
       const new_state = {
         ...state,
         sort_by: column,
         sort_order: order,
         pagination: { ...state.pagination, page: 1 }
       }
       
       // 更新状态
       set_state(prev => ({
         ...prev,
         sort_by: column,
         sort_order: order,
         pagination: { ...prev.pagination, page: 1 }
       )}))
       
       // 立即获取数据
       set_timeout(() => {
         fetch_customers(new_state)
       }, 0)
     }
     
     return(
       <div className="space-y-4">
         {/* 排序功能 - 仅对城市字段显示 */}
         {column === 'city' && (
           <div>
             <label className="block text-xs text-gray-600 mb-2">排序</label>
             <div className="flex space-x-2">
               <button)
                 onClick={() => handle_sort_click('asc')};
                 className={`px-2 py-1 text-xs rounded ${;
                   state.sort_by === column && state.sort_order === 'asc'
                     ? 'bg-blue-500 text-white'
                     : 'bg-gray-100 hover:bg-gray-200'
                 }`}
               >
                 升序
               </button>
               <button
                 onClick={() => handle_sort_click('desc')};
                 className={`px-2 py-1 text-xs rounded ${;
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
           {column === 'city' && render_city_filter()}
           {column === 'customer_type' && render_customer_type_filter()}
         </div>
       </div>
     )
   }
   
   // 渲染城市筛选
   const render_city_filter = () => {
     // 使用从后端获取的城市统计数据，按A-Z排序
     const filtered_cities = state.city_search_term
       ? state.city_stats.filter(cityData => );
           cityData.name.toLowerCase().includes(state.city_search_term.toLowerCase())
         )
       : state.city_stats
     
     return(
       <div>
         <input
           type="text";
           placeholder="搜索城市...";
           value={state.city_search_term});
           onChange={(e) => set_state(prev => ({ ...prev, city_search_term: e.target.value )}))};
           className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
         />
         <div className="max-h-48 overflow-y-auto">
           {filtered_cities.map(cityData => (
             <label key={cityData.name} className="flex items-center justify-between py-1 hover:bg-gray-50">
               <div className="flex items-center">
                 <input
                   type="checkbox");
                   checked={state.filters.city_filter.includes(cityData.name)};
                   onChange={(e) => {;
                     const new_cities = e.target.checked
                       ? [...state.filters.city_filter, cityData.name]
                       : state.filters.city_filter.filter(c => c !== cityData.name);
                     set_state(prev => ({
                       ...prev,
                       filters: { ...prev.filters, city_filter: new_cities }
                     )}))
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
   const render_customer_type_filter = () => {
     // 按维度分类客户类型 - 紧凑四列布局
     const category_groups = {
       '购买行为': ['NEW', 'REPEAT', 'FANATIC', 'VIP'],
       '消费偏好': ['HIGH_VALUE', 'LOW_VALUE'],
       '活跃度': ['DECLINING', 'COOLING', 'SILENT', 'LOST'],
       '退货行为': ['PICKY', 'ASSASSIN']
     }
     
     return(
       <div className="grid grid-cols-4 gap-2">)
         {Object.entries(category_groups).map(([categoryName), types]) => (
           <div key={category_name} className="space-y-1.5">
             <h4 className="text-xs font-medium text-gray-700 text-center border-b border-gray-200 pb-0.5 mb-1">{category_name}</h4>
             <div className="space-y-0.5">
               {types.map(type => {;
                 const config = CUSTOMER_TYPE_LABELS[type]);
                 if (!config) return null
                 
                 const { icon, label } = config
                 
                 return(
                   <label key={type} className="flex items-center py-0.5 px-1 hover:bg-gray-50 cursor-pointer rounded text-xs" title={config.description}>
                     <input
                       type="checkbox");
                       checked={state.filters.customer_type.includes(type)};
                       onChange={(e) => {;
                         const new_types = e.target.checked
                           ? [...state.filters.customer_type, type]
                           : state.filters.customer_type.filter(t => t !== type);
                         
                         set_state(prev => ({
                           ...prev,
                           filters: { ...prev.filters, customer_type: new_types }
                         )}))
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
               {categoryName === '退货行为' && types.length < 4 && (;
                 Array.from({ length: 4 - types.length )}).map((_), index) => (
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
   const render_range_filter = (column: string) => {;
     const get_range_values = () => {;
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
     
     const set_range_values = (min: string, max: string) => {;
       set_state(prev => ({
         ...prev,
         filters: {
           ...prev.filters,
           ...(column === 'total_orders' && { ;
             total_orders_min: min, 
             total_orders_max: max 
           )}),
           ...(column === 'total_all_orders' && { ;
             total_all_orders_min: min, 
             total_all_orders_max: max 
           }),
           ...(column === 'total_purchases' && { ;
             total_purchases_min: min, 
             total_purchases_max: max 
           })
         }
       }))
     }
     
     const { min, max } = get_range_values()
     
     return(
       <div className="space-y-3">
         <div>
           <label className="block text-xs text-gray-600 mb-1">最小值</label>
           <input
             type="number";
             placeholder="最小值";
             value={min});
             onChange={(e) => set_range_values(e.target.value), max)};
             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
           />
         </div>
         <div>
           <label className="block text-xs text-gray-600 mb-1">最大值</label>
           <input
             type="number";
             placeholder="最大值";
             value={max};
             onChange={(e) => set_range_values(min), e.target.value)};
             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
           />
         </div>
       </div>
     )
   }
   
   // 渲染排序和范围筛选
   const render_sort_and_range_filter = (column: string) => {;
     const get_range_values = () => {;
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
     
     const set_range_values = (min: string, max: string) => {;
       set_state(prev => ({
         ...prev,
         filters: {
           ...prev.filters,
           ...(column === 'total_orders' && { ;
             total_orders_min: min, 
             total_orders_max: max 
           )}),
           ...(column === 'total_all_orders' && { ;
             total_all_orders_min: min, 
             total_all_orders_max: max 
           }),
           ...(column === 'total_purchases' && { ;
             total_purchases_min: min, 
             total_purchases_max: max 
           })
         },
         pagination: { ...prev.pagination, page: 1 }
       }))
     }
     
     // 处理排序
     const handle_sort_click = (order: 'asc' | 'desc') => {
       // 构建新的状态
       const new_state = {
         ...state,
         sort_by: column,
         sort_order: order,
         pagination: { ...state.pagination, page: 1 }
       }
       
       // 更新状态
       set_state(prev => ({
         ...prev,
         sort_by: column,
         sort_order: order,
         pagination: { ...prev.pagination, page: 1 }
       )}))
       
       // 立即调用API应用排序，传入新状态
       fetch_customers(new_state)
       
       // 关闭筛选面板
       set_state(prev => ({
         ...prev,
         column_filters: { ...prev.column_filters, visible: false }
       )}))
     }
     
     const { min, max } = get_range_values()
     
     return(
       <div className="space-y-4">
         {/* 排序功能 */}
         <div>
           <label className="block text-xs text-gray-600 mb-2">排序</label>
           <div className="flex space-x-2">
             <button)
               onClick={() => handle_sort_click('asc')};
               className={`px-2 py-1 text-xs rounded ${;
                 state.sort_by === column && state.sort_order === 'asc'
                   ? 'bg-blue-500 text-white'
                   : 'bg-gray-100 hover:bg-gray-200'
               }`}
             >
               升序
             </button>
             <button
               onClick={() => handle_sort_click('desc')};
               className={`px-2 py-1 text-xs rounded ${;
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
               type="number";
               placeholder="最小";
               value={min};
               onChange={(e) => set_range_values(e.target.value), max)};
               className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
             />
             <span className="text-xs text-gray-500">-</span>
             <input
               type="number";
               placeholder="最大";
               value={max};
               onChange={(e) => set_range_values(min), e.target.value)};
               className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
             />
           </div>
           <div className="flex space-x-1 mt-2">
             <button
               onClick={() => {
                 // 立即应用范围筛选
                 set_state(prev => ({
                   ...prev,
                   column_filters: { ...prev.column_filters, visible: false }
                 )}))
                 set_timeout(() => {
                   fetch_customers()
                 }, 0)
               }}
               className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
             >
               应用
             </button>
             <button
               onClick={() => {
                 // 清除范围筛选
                 clear_column_filter(column)
                 set_state(prev => ({
                   ...prev,
                   column_filters: { ...prev.column_filters, visible: false }
                 )}))
                 set_timeout(() => {
                   fetch_customers()
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
   const render_date_range_filter = (column: string) => {;
     if (column !== 'last_purchase_date' && column !== 'first_purchase_date') return null
     
     // 处理排序
     const handle_sort_click = (order: 'asc' | 'desc') => {
       // 构建新的状态
       const new_state = {
         ...state,
         sort_by: column,
         sort_order: order,
         pagination: { ...state.pagination, page: 1 }
       }
       
       // 更新状态
       set_state(prev => ({
         ...prev,
         sort_by: column,
         sort_order: order,
         pagination: { ...prev.pagination, page: 1 }
       )}))
       
       // 立即获取数据
       set_timeout(() => {
         fetch_customers(new_state)
       }, 0)
     }
     
     return(
       <div className="space-y-4">
         {/* 排序功能 */}
         <div>
           <label className="block text-xs text-gray-600 mb-2">排序</label>
           <div className="flex space-x-2">
             <button)
               onClick={() => handle_sort_click('asc')};
               className={`px-2 py-1 text-xs rounded ${;
                 state.sort_by === column && state.sort_order === 'asc'
                   ? 'bg-blue-500 text-white'
                   : 'bg-gray-100 hover:bg-gray-200'
               }`}
             >
               升序
             </button>
             <button
               onClick={() => handle_sort_click('desc')};
               className={`px-2 py-1 text-xs rounded ${;
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
                 type="date";
                 value={column === 'first_purchase_date' ? state.filters.first_purchase_start : state.filters.last_purchase_start};
                 onChange={(e) => set_state(prev => ({
                   ...prev,
                   filters: { 
                     ...prev.filters, 
                     ...(column === 'first_purchase_date' 
                       ? { first_purchase_start: e.target.value }
                       : { last_purchase_start: e.target.value })
                     )
                   }
                 }))}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               />
             </div>
             <div>
               <label className="block text-xs text-gray-600 mb-1">结束日期</label>
               <input
                 type="date";
                 value={column === 'first_purchase_date' ? state.filters.first_purchase_end : state.filters.last_purchase_end};
                 onChange={(e) => set_state(prev => ({
                   ...prev,
                   filters: { 
                     ...prev.filters, 
                     ...(column === 'first_purchase_date' 
                       ? { first_purchase_end: e.target.value }
                       : { last_purchase_end: e.target.value })
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
   const clear_column_filter = (column: string) => {;
     set_state(prev => {;
       const new_filters = { ...prev.filters }
       )
       switch (column) {
         case 'customer_code':
           new_filters.customer_code_search = '';
           break
         case 'name':
           new_filters.name_search = '';
           break
         case 'phone':
           new_filters.phone_search = '';
           break
         case 'city':
           new_filters.city_filter = [];
           break
         case 'customer_type':
           new_filters.customer_type = [];
           break
         case 'total_orders':
           new_filters.total_orders_min = '';
           new_filters.total_orders_max = '';
           break
         case 'total_all_orders':
           new_filters.total_all_orders_min = '';
           new_filters.total_all_orders_max = '';
           break
         case 'total_purchases':
           new_filters.total_purchases_min = '';
           new_filters.total_purchases_max = '';
           break
         case 'first_purchase_date':
           new_filters.first_purchase_start = '';
           new_filters.first_purchase_end = '';
           break
         case 'last_purchase_date':
           new_filters.last_purchase_start = '';
           new_filters.last_purchase_end = '';
           break
       }
       
       return {
         ...prev,
         filters: new_filters,
         city_search_term: column === 'city' ? '' : prev.city_search_term
       }
     })
   }
 
   // 获取客户列表
  const fetch_customers = async (customState?: Partial<CustomerManagementState>) => {;
    try {
      // 使用传入的状态或当前状态
      const current_state = customState ? { ...state, ...custom_state } : state
      
      // 只有在没有数据时才显示loading，避免闪烁
      set_state(prev => ({ 
        ...prev, 
        loading: prev.customers.length === 0, // 只有在没有客户数据时才显示loading;
        error: null 
      )}))
      console.log('📊 当前状态:', {
        filters: current_state.filters,
        selected_type: current_state.selected_type,
        search_term: current_state.search_term
      )})
      
      const params: any = {;
        page: current_state.pagination.page,
        limit: current_state.pagination.limit,
        sort: current_state.sort_order,
        sort_by: current_state.sort_by,
        getCityStats: true // 获取城市统计数据
      }
      
      // 保持向后兼容的搜索
      if (current_state.search_term.trim()) {
        params.search = current_state.search_term.trim()
      }
      
      // 修复客户类型参数冲突问题
      // 优先使用新的多维度筛选，如果没有则使用旧的单一类型筛选
      if (current_state.filters.customer_type.length > 0) {
        params.customer_type_filter = current_state.filters.customer_type.join('),');
        console.log('🏷️ 使用多维度客户类型筛选:'), current_state.filters.customer_type)
      } else if (current_state.selected_type) {
        params.customer_type = current_state.selected_type

      }
      
      // 新增的筛选参数
      if (current_state.filters.customer_code_search) {
        params.customer_code_search = current_state.filters.customer_code_search
      }
      
      if (current_state.filters.name_search) {
        params.name_search = current_state.filters.name_search
      }
      
      if (current_state.filters.phone_search) {
        params.phone_search = current_state.filters.phone_search
      }
      
      if (current_state.filters.city_filter.length > 0) {
        params.city_filter = current_state.filters.city_filter.join('),')
      }
      
      if (current_state.filters.total_orders_min) {
        params.total_orders_min = current_state.filters.total_orders_min
      }
      
      if (current_state.filters.total_orders_max) {
        params.total_orders_max = current_state.filters.total_orders_max
      }
      
      if (current_state.filters.total_all_orders_min) {
        params.total_all_orders_min = current_state.filters.total_all_orders_min
      }
      
      if (current_state.filters.total_all_orders_max) {
        params.total_all_orders_max = current_state.filters.total_all_orders_max
      }
      
      if (current_state.filters.total_purchases_min) {
        params.total_purchases_min = current_state.filters.total_purchases_min
      }
      
      if (current_state.filters.total_purchases_max) {
        params.total_purchases_max = current_state.filters.total_purchases_max
      }
      
      if (current_state.filters.first_purchase_start) {
        params.first_purchase_start = current_state.filters.first_purchase_start
      }
      
      if (current_state.filters.first_purchase_end) {
        params.first_purchase_end = current_state.filters.first_purchase_end
      }
      
      if (current_state.filters.last_purchase_start) {
        params.last_purchase_start = current_state.filters.last_purchase_start
      }
      
      if (current_state.filters.last_purchase_end) {
        params.last_purchase_end = current_state.filters.last_purchase_end
      }
      
      console.log('📡 API请求参数:'), params)
      const response = await customer_api.list(params);
      console.log('📡 API响应:'), response)
      
      if (response.success && response.data) {
        const data = response.data as any;
        console.log('✅ 数据获取成功:', {
          customersCount: data.customers?.length || 0,
          pagination: data.pagination,
          cityStatsCount: data.city_stats?.length || 0
        )})
        set_state(prev => ({
          ...prev,
          customers: data.customers || [],
          pagination: data.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 },
          city_stats: data.city_stats || [], // 更新城市统计数据
          loading: false // 确保数据加载完成后关闭loading
        )}))
      } else {
        console.error('❌ API响应失败:'), response)
        throw new Error(response.message || '获取客户列表失败')
      }
    } catch (error: any) {
      console.error('❌ fetch_customers 执行失败:'), error)
      
      // 检查是否是因为没有客户数据导致的错误
      const is_no_data_error = error.message?.includes('客户不存在') || error.message?.includes('404');
      
      if (!is_no_data_error) {
        console.error('获取客户列表失败:'), error)
        toast.error('获取客户列表失败')
      }
      
      set_state(prev => ({
        ...prev,
        loading: false,
        customers: [], // 设置空数组
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }, // 重置分页
        city_stats: [], // 重置城市统计数据)
        error: is_no_data_error ? null : (error.message || '获取客户列表失败')
      }))
    }
  }

  // 获取客户统计分析
  const fetch_analytics = async () => {;
    try {
      const response = await customer_api.get_analytics({ time_period: state.time_period )});
      if (response.success && response.data) {
        set_state(prev => ({ ...prev, analytics: response.data as CustomerAnalytics )}))
      } else {
        // 如果没有数据，设置默认的空统计数据
        set_state(prev => ({ 
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
        )}))
      }
    } catch (error: any) {
      // 静默处理错误，不在控制台输出错误日志
      // 设置默认的空统计数据
      set_state(prev => ({ 
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
      )}))
    }
  }

  // 初始化数据
  useEffect(() => {
    if (is_authenticated) {
      fetch_customers()
      fetch_analytics()
      
      // 添加页面可见性监听，当用户返回页面时自动刷新数据
      const handle_visibility_change = () => {;
        if (!document.hidden && is_authenticated) {
          // 页面变为可见时刷新客户数据
          fetch_customers()
          fetch_analytics()
        }
      }
      
      document.addEventListener('visibilitychange'), handle_visibility_change)
      
      // 清理事件监听器
      return () => {
        document.removeEventListener('visibilitychange'), handle_visibility_change)
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
      )})
      
      const timer = set_timeout(() => {;
        console.log('⏰ 防抖时间到，开始获取数据')
        fetch_customers()
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
    const invalid_types = state.filters.customer_type.filter(type => )
      !Object.keys(CUSTOMER_TYPE_LABELS).includes(type)
    )
    
    if (invalid_types.length > 0) {
      console.warn('⚠️ 发现无效的客户类型:'), invalid_types)
    }
  }, [state.filters.customer_type, state.column_filters])

  // 删除未使用的搜索和筛选函数

  // 删除未使用的函数以修复TypeScript错误

  // 分页处理
  const handle_page_change = (page: number) => {;
    set_state(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    )}))
  }

  // 处理每页显示条数变化
  const handle_limit_change = (newLimit: number) => {;
    set_state(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        limit: newLimit,
        page: 1 // 重置到第一页
      }
    )}))
    // 立即使用新的limit值重新获取数据
    set_timeout(() => {
      fetch_customers({
        pagination: { 
          page: 1, 
          limit: newLimit,
          total: state.pagination.total,)
          total_pages: Math.ceil(state.pagination.total / newLimit)
        },
        filters: state.filters,
        sort_by: state.sort_by,
        sort_order: state.sort_order
      })
    }, 0)
  }

  // 分页组件
  const render_pagination = () => {
    // 只有在没有数据时才不显示分页组件
    if (state.pagination.total === 0) return null;
    
    return(
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
                value={state.pagination.limit});
                onChange={(e) => handle_limit_change(Number(e.target.value))};
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
                onChange={(e) => handle_limit_change(Number(e.target.value))};
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
                   const total_pages = state.pagination.total_pages;
                  const max_visible_pages = 5;
                  const current_page = state.pagination.page;
                  
                  let start_page = Math.max(1), current_page - Math.floor(max_visible_pages / 2));
                  let end_page = Math.min(total_pages), start_page + max_visible_pages - 1)
                  
                  // 调整起始页，确保显示足够的页码
                  if (end_page - start_page + 1 < max_visible_pages) {
                    start_page = Math.max(1), end_page - max_visible_pages + 1)
                  }
                  
                  const pages = [];
                  for(let i = start_page; i <= end_page); i++) {
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
    )
  }

  // 查看客户详情
  const handle_view_customer = (customer: Customer) => {;
    set_state(prev => ({
      ...prev,
      selected_customer: customer,
      show_detail_modal: true
    )}))
  }

  // 打开反向销售录入
  const handle_reverse_sale = (customer: Customer) => {;
    set_state(prev => ({
      ...prev,
      selected_customer: customer,
      show_reverse_sale_modal: true
    )}))
  }

  // 打开退货功能
  const handle_refund = (customer: Customer) => {;
    set_state(prev => ({
      ...prev,
      selected_customer: customer,
      show_refund_modal: true
    )}))
  }

  // 反向销售成功回调
  const handle_reverse_sale_success = () => {
    // 刷新客户列表和统计数据
    fetch_customers()
    fetch_analytics()
  }

  // 创建客户成功回调
  const handle_create_success = () => {
    // 刷新客户列表和统计数据
    fetch_customers()
    fetch_analytics()
  }

  // 格式化金额
  const format_currency = (amount: any) => {
    // 处理各种数据类型
    if (amount === undefined || amount === null || amount === '') {;
      return '¥0.00'
    }
    
    // 转换为数字
    const num_amount = typeof amount === 'string' ? parse_float(amount) : Number(amount)
    
    // 检查是否为有效数字
    if (is_nan(num_amount) || !is_finite(num_amount)) {
      return '¥0.00'
    }
    
    return `¥${num_amount.to_fixed(2)}`
  }

  // 格式化日期
  const format_date = (dateString: string) => {;
    return new Date(dateString).to_locale_date_string('zh-CN', {
      time_zone: 'Asia/Shanghai'
    )})
  }

  if (!is_authenticated) {
    return(
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">需要登录</h2>
          <p className="text-gray-600">请先登录后再访问客户管理页面</p>
        </div>
      </div>)
    )
  }

  return(
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
          <button)
            onClick={() => set_state(prev => ({ ...prev, show_create_modal: true )}))};
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
                <p className="text-2xl font-bold text-gray-900">{state.analytics.repeat_purchase_rate?.to_fixed(1) || '0.0'}%</p>
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
                <p className="text-2xl font-bold text-gray-900">{state.analytics.refund_rate?.to_fixed(1) || '0.0'}%</p>
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
                <p className="text-2xl font-bold text-gray-900">{state.analytics.average_profit_margin?.to_fixed(1) || '0.0'}%</p>
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
                onClick={() => fetch_customers()};
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
                onClick={() => set_state(prev => ({ ...prev, show_create_modal: true )}))};
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
                          ref={(el) => {;
                            if (el) column_refs.current['customer_code'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e), 'customer_code')};
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
                          ref={(el) => {;
                            if (el) column_refs.current['name'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e), 'name')};
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
                          ref={(el) => {;
                            if (el) column_refs.current['phone'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e), 'phone')};
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
                          ref={(el) => {;
                            if (el) column_refs.current['city'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e), 'city')};
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
                          ref={(el) => {;
                            if (el) column_refs.current['total_orders'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e), 'total_orders')};
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
                          ref={(el) => {;
                            if (el) column_refs.current['total_all_orders'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e), 'total_all_orders')};
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
                          ref={(el) => {;
                            if (el) column_refs.current['total_purchases'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e), 'total_purchases')};
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
                          ref={(el) => {;
                            if (el) column_refs.current['first_purchase_date'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e), 'first_purchase_date')};
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
                          ref={(el) => {;
                            if (el) column_refs.current['last_purchase_date'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e), 'last_purchase_date')};
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
                          ref={(el) => {;
                            if (el) column_refs.current['customer_type'] = el
                          }}
                          onClick={(e) => toggle_column_filter(e), 'customer_type')};
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
                    const customer_labels = get_customer_labels(customer), state.customers);
                    return(
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
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600" style={{ width: '80px' }}>)
                          {extract_city_from_address(customer.address)}
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
                            {customerLabels.map((label_key) => {
                              const label_config = CUSTOMER_TYPE_LABELS[labelKey];
                              if (!label_config) return null
                              
                              return(
                                <div
                                  key={label_key};
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors";
                                  title={label_config.description}
                                >
                                  <span className="text-xs">{label_config.icon}</span>
                                </div>)
                              )
                            })}
                          </div>
                        </td>
                        
                        {/* 操作按钮 */}
                        <td className="px-6 py-4 whitespace-nowrap" style={{ width: '80px' }}>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handle_view_customer(customer)};
                              className="p-1 text-gray-400 hover:text-blue-600";
                              title="查看详情"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handle_reverse_sale(customer)};
                              className="p-1 text-gray-400 hover:text-green-600";
                              title="销售录入"
                            >
                              <ShoppingCart className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handle_refund(customer)};
                              className="p-1 transition-colors";
                              style={{ color: '#ef4444' }};
                              onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#dc2626'};
                              onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#ef4444'};
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
            {render_pagination()}
          </>
        )}
      </div>
      
      {/* 反向销售录入模态框 */}
      {state.selected_customer && (
        <ReverseSaleModal
          customer={state.selected_customer};
          is_open={state.show_reverse_sale_modal};
          onClose={() => set_state(prev => ({ ...prev, show_reverse_sale_modal: false, selected_customer: null )}))};
          onSuccess={handle_reverse_sale_success}
        />
      )}
      
      {/* 客户详情模态框 */}
      {state.selected_customer && (
          <CustomerDetailModal
            customer={state.selected_customer};
            is_open={state.show_detail_modal};
            onClose={() => set_state(prev => ({ ...prev, show_detail_modal: false, selected_customer: null )}))};
            onCustomerUpdate={fetch_customers} // 退货后刷新客户列表;
            allCustomers={state.customers} // 传入所有客户数据用于标签计算
          />
        )}
      
      {/* 客户退货模态框 */}
      {state.selected_customer && (
        <CustomerRefundModal
          customer={state.selected_customer};
          is_open={state.show_refund_modal};
          onClose={() => set_state(prev => ({ ...prev, show_refund_modal: false, selected_customer: null )}))};
          onSuccess={handle_reverse_sale_success}
        />
      )}
      
      {/* 创建客户模态框 */}
      <Customer_create_modal
        is_open={state.show_create_modal};
        onClose={() => set_state(prev => ({ ...prev, show_create_modal: false )}))};
        onSuccess={handle_create_success}
      />
      
      {/* 筛选面板 */}
      {state.column_filters.visible && (
        <Portal>
          <div
            className="filter-panel fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50";
            style={{;
              left: `${state.filter_panel_position.x}px`,
              top: `${state.filter_panel_position.y}px`,
              width: state.column_filters.column === 'customer_type' 
                ? (window.inner_width < 640 ? '320px' : '480px') 
                : '300px',
              maxWidth: 'calc(100vw - 20px)' // 确保不超出屏幕
            }}
            onMouseDown={(e) => e.stopPropagation()};
                  onClick={(e) => e.stopPropagation()}
          >
            {render_filter_panel()}
          </div>
        </Portal>
      )}
    </div>
  )
}