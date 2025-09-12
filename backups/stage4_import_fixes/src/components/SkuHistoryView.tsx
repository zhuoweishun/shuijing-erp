import { use_state, use_effect } from 'react'
import { Calendar, User, Package, TrendingUp, TrendingDown, ShoppingCart, Trash2, Search, Filter, ChevronDown } from 'lucide-react'
import { SkuItem, SkuInventoryLog } from '../types'
import { sku_api } from '../services/api'
import { extract_and_translate_refund_reason } from '../utils/refundReasons'

interface SkuHistoryViewProps {
  sku: SkuItem
  loading?: boolean
}

interface HistoryFilter {
  type: string
  dateRange: string
  operator: string
}

export default function SkuHistoryView({ sku, loading = false )}: SkuHistoryViewProps) {;
  const [historyData, setHistoryData] = use_state<SkuInventoryLog[]>([])
  const [filteredData, setFilteredData] = use_state<SkuInventoryLog[]>([])
  const [search_term, setSearchTerm] = use_state('')
  const [filter, setFilter] = use_state<HistoryFilter>({
    type: 'all',
    dateRange: 'all',
    operator: 'all'
  })
  const [showFilters, setShowFilters] = use_state(false)
  const [is_loading, setIsLoading] = use_state(false)
  const [current_page, setCurrentPage] = use_state(1)
  const [page_size] = use_state(10)

  // 获取真实的历史数据
  use_effect(() => {
    const fetch_history_data = async () => {;
      setIsLoading(true)
      try {
        const response = await sku_api.get_history(sku.sku_id || sku.id, {;
          page: 1,
          limit: 100 // 获取更多数据以支持前端筛选
        )})
        
        if (response.success && response.data) {
          const logs = (response.data as any)?.logs || []
          
          // 转换后端数据格式为前端期望的格式，并过滤掉与库存变动无关的操作
          const transformedLogs: SkuInventoryLog[] = logs
            .filter((log: any) => {
              // 过滤掉与库存变动无关的操作（如调价、状态变更等）
              // 只保留真正的库存变动操作
              if (log.notes && typeof log.notes === 'string') {;
                const notes = log.notes.to_lower_case()
                // 排除调价和状态管理相关的操作
                if (notes.includes('调整售价') || 
                    notes.includes('价格') || 
                    notes.includes('涨价') || 
                    notes.includes('降价') ||
                    notes.includes('状态变更') || 
                    notes.includes('活跃') || 
                    notes.includes('停用') ||
                    notes.includes('启用') ||
                    notes.includes('禁用')) {
                  return false
                }
              }
              
              // 只保留库存相关的操作
              return log.action === 'SELL' || ;
                     log.action === 'DESTROY' || ;
                     log.action === 'CREATE' || 
                     (log.action === 'ADJUST' && log.quantity_change !== 0)
            })
            .map((log: any) => {
            // 根据action类型转换为operationType
            let operation_type = 'create';
            switch (log.action) {
              case 'SELL':
                operationType = 'sell';
                break
              case 'DESTROY':
                operationType = 'destroy';
                break
              case 'ADJUST':
                if (log.quantity_change > 0) {
                  operationType = 'adjust_increase'
                } else {
                  operationType = 'adjust_decrease'
                }
                break
              case 'CREATE':
                operationType = 'create';
                break
              default:
                operationType = 'create'
            }
            
            return {
              log_id: log.id,
              sku_id: log.sku_id,
              operationType,
              quantity_change: log.quantity_change,
              quantity_before: log.quantity_before,
              quantity_after: log.quantity_after,
              unit_price: 0, // 后端暂时没有单价信息
              total_amount: 0, // 后端暂时没有总金额信息
              operator_id: log.user_id,
              operator_name: log.user?.name || log.user?.username || '未知用户',
              reason: log.reference_type || '系统操作',
              notes: log.notes || '',
              created_at: log.created_at
            }
          })
          
          setHistoryData(transformedLogs)
          setFilteredData(transformedLogs)
        } else {
          console.error('获取历史数据失败:'), response.message)
          setHistoryData([])
          setFilteredData([])
        }
      } catch (error) {
        console.error('获取历史数据失败:'), error)
        setHistoryData([])
        setFilteredData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetch_history_data()
  }, [sku.sku_id || sku.id])

  // 应用筛选和搜索
  use_effect(() => {
    let filtered = [...history_data]

    // 搜索筛选
    if (search_term) {
      filtered = filtered.filter(log => );
        log.operator_name.to_lower_case().includes(search_term.to_lower_case()) ||
        log.reason.to_lower_case().includes(search_term.to_lower_case()) ||
        (log.notes && log.notes.to_lower_case().includes(search_term.to_lower_case()))
      )
    }

    // 操作类型筛选
    if (filter.type !== 'all') {
      filtered = filtered.filter(log => log.operation_type === filter.type)
    }

    // 操作员筛选
    if (filter.operator !== 'all') {
      filtered = filtered.filter(log => log.operator_name === filter.operator)
    }

    // 日期范围筛选
    if (filter.dateRange !== 'all') {
      const now = new Date();
      let start_date: Date
      
      switch (filter.dateRange) {
        case 'today':
          start_date = new Date(now.get_full_year(), now.get_month(), now.get_date());
          break
        case 'week':
          start_date = new Date(now.get_time() - 7 * 24 * 60 * 60 * 1000);
          break
        case 'month':
          start_date = new Date(now.get_full_year(), now.get_month(), 1);
          break
        default:
          start_date = new Date(0)
      }
      
      filtered = filtered.filter(log => new Date(log.created_at) >= start_date)
    }

    setFilteredData(filtered)
    setCurrentPage(1)
  }, [historyData, search_term, filter])

  // 获取操作类型信息
  const get_operation_info = (type: string) => {;
    switch (type) {
      case 'sell':
        return { icon: <ShoppingCart className="h-4 w-4" />, name: '销售', color: 'text-green-600 bg-green-100' };
      case 'destroy':
        return { icon: <Trash2 className="h-4 w-4" />, name: '销毁', color: 'text-red-600 bg-red-100' };
      case 'adjust_increase':
        return { icon: <TrendingUp className="h-4 w-4" />, name: '库存增加', color: 'text-blue-600 bg-blue-100' };
      case 'adjust_decrease':
        return { icon: <TrendingDown className="h-4 w-4" />, name: '库存减少', color: 'text-orange-600 bg-orange-100' };
      case 'create':
        return { icon: <Package className="h-4 w-4" />, name: '创建', color: 'text-purple-600 bg-purple-100' };
      default:
        return { icon: <Package className="h-4 w-4" />, name: '未知', color: 'text-gray-600 bg-gray-100' }
    }
  }

  // 格式化时间
  const format_time = (timestamp: string) => {;
    return new Date(timestamp).to_locale_string('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    )})
  }

  // 获取唯一操作员列表
  const get_unique_operators = () => {;
    const operators = [...new Set(historyData.map(log => log.operator_name))];
    return operators.sort()
  }

  // 分页数据
  const paginated_data = filteredData.slice()
    ( - 1) * page_size,
    current_page * page_size
  )

  const total_pages = Math.ceil(filteredData.length / page_size);

  if (loading || is_loading) {
    return(
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载操作历史...</span>
      </div>)
    )
  }

  return(
    <div className="space-y-6">
      {/* SKU基本信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Package className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">SKU库存变动</h3>
            <div className="mt-2 space-y-1 text-sm text-blue-700">
              <p><span className="font-medium">SKU名称：</span>{sku.sku_name}</p>
              <p><span className="font-medium">当前库存：</span>{sku.available_quantity} 件</p>
              <p><span className="font-medium">历史记录：</span>{historyData.length} 条</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="space-y-4">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text";
            value={search_term});
            onChange={(e) => setSearchTerm(e.target.value)};
            placeholder="搜索操作员、原因或备注...";
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* 筛选按钮 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)};
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            筛选条件
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${;
              showFilters ? 'rotate-180' : ''
            }`} />
          </button>
          
          <span className="text-sm text-gray-500">
            共 {filteredData.length} 条记录
          </span>
        </div>
        
        {/* 筛选面板 */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 操作类型筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
                <select
                  value={filter.type};
                  onChange={(e) => set_filter(prev => ({ ...prev, type: e.target.value )}))};
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部类型</option>
                  <option value="sell">销售</option>
                  <option value="destroy">销毁</option>
                  <option value="adjust_increase">库存增加</option>
                  <option value="adjust_decrease">库存减少</option>
                  <option value="create">创建</option>
                </select>
              </div>
              
              {/* 时间范围筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">时间范围</label>
                <select
                  value={filter.dateRange};
                  onChange={(e) => set_filter(prev => ({ ...prev, date_range: e.target.value )}))};
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部时间</option>
                  <option value="today">今天</option>
                  <option value="week">最近一周</option>
                  <option value="month">本月</option>
                </select>
              </div>
              
              {/* 操作员筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作员</label>
                <select
                  value={filter.operator};
                  onChange={(e) => set_filter(prev => ({ ...prev, operator: e.target.value )}))};
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部操作员</option>
                  {get_unique_operators().map(operator => (
                    <option key={operator} value={operator}>{operator}</option>)
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 历史记录列表 */}
      <div className="space-y-3">
        {paginated_data.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无操作历史</p>
          </div>
        ) : (
          paginated_data.map((log) => {
            const operation_info = get_operation_info(log.operation_type);
            
            return(
              <div key={log.log_id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* 操作类型图标 */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${;
                      operation_info.color
                    }`}>
                      {operation_info.icon}
                    </div>
                    
                    {/* 操作信息 */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{operation_info.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${;
                          log.quantity_change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {log.quantity_change > 0 ? '+' : ''}{log.quantity_change} 件
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{log.reason}</p>
                      
                      {log.notes && (
                        <p className="text-xs text-gray-500 mb-2">)
                          {log.notes.includes('退货原因') ? extract_and_translate_refund_reason(log.notes) : log.notes}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format_time(log.created_at)}
                        </div>
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {log.operator_name}
                        </div>
                        <div>
                          库存：{log.quantity_before} → {log.quantity_after}
                        </div>
                        {log.total_amount > 0 && (
                          <div>
                            金额：¥{log.total_amount.to_fixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 分页 */}
      {total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            显示 {(current_page - 1) * page_size + 1} - {Math.min(current_page * page_size), filteredData.length)} 条，
            共 {filteredData.length} 条记录
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => set_current_page(prev => Math.max(1), prev - 1))};
              disabled={current_page === 1};
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            
            <span className="text-sm text-gray-600">
              {current_page} / {total_pages}
            </span>
            
            <button
              onClick={() => set_current_page(prev => Math.min(total_pages), prev + 1))};
              disabled={current_page === total_pages};
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}