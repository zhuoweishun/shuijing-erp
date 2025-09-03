import { useState, useEffect } from 'react'
import { Calendar, User, Package, TrendingUp, TrendingDown, ShoppingCart, Trash2, Search, Filter, ChevronDown } from 'lucide-react'
import { SkuItem, SkuInventoryLog } from '../types'

interface SkuHistoryViewProps {
  sku: SkuItem
  loading?: boolean
}

interface HistoryFilter {
  type: string
  dateRange: string
  operator: string
}

export default function SkuHistoryView({ sku, loading = false }: SkuHistoryViewProps) {
  const [historyData, setHistoryData] = useState<SkuInventoryLog[]>([])
  const [filteredData, setFilteredData] = useState<SkuInventoryLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<HistoryFilter>({
    type: 'all',
    dateRange: 'all',
    operator: 'all'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  // 模拟获取历史数据
  useEffect(() => {
    const fetchHistoryData = async () => {
      setIsLoading(true)
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 模拟历史数据
        const mockHistoryData: SkuInventoryLog[] = [
          {
            log_id: 'log-001',
            sku_id: sku.sku_id || sku.id,
            operation_type: 'sell',
            quantity_change: -2,
            quantity_before: 50,
            quantity_after: 48,
            unit_price: 299.99,
            total_amount: 599.98,
            operator_id: 'user-001',
            operator_name: '张三',
            reason: '线上销售',
            notes: '客户订单：ORD20240116001',
            created_at: '2024-01-16T14:30:00Z'
          },
          {
            log_id: 'log-002',
            sku_id: sku.sku_id || sku.id,
            operation_type: 'adjust_increase',
            quantity_change: 10,
            quantity_before: 40,
            quantity_after: 50,
            unit_price: 0,
            total_amount: 0,
            operator_id: 'user-002',
            operator_name: '李四',
            reason: '盘点盈余',
            notes: '年度盘点发现库存盈余',
            created_at: '2024-01-15T16:00:00Z'
          },
          {
            log_id: 'log-003',
            sku_id: sku.sku_id || sku.id,
            operation_type: 'destroy',
            quantity_change: -3,
            quantity_before: 43,
            quantity_after: 40,
            unit_price: 0,
            total_amount: 0,
            operator_id: 'user-003',
            operator_name: '王五',
            reason: '质量问题',
            notes: '发现产品存在质量缺陷，予以销毁',
            created_at: '2024-01-14T10:15:00Z'
          },
          {
            log_id: 'log-004',
            sku_id: sku.sku_id || sku.id,
            operation_type: 'sell',
            quantity_change: -5,
            quantity_before: 48,
            quantity_after: 43,
            unit_price: 299.99,
            total_amount: 1499.95,
            operator_id: 'user-001',
            operator_name: '张三',
            reason: '批量销售',
            notes: '企业客户批量采购',
            created_at: '2024-01-13T11:20:00Z'
          },
          {
            log_id: 'log-005',
            sku_id: sku.sku_id || sku.id,
            operation_type: 'adjust_decrease',
            quantity_change: -2,
            quantity_before: 50,
            quantity_after: 48,
            unit_price: 0,
            total_amount: 0,
            operator_id: 'user-002',
            operator_name: '李四',
            reason: '盘点亏损',
            notes: '盘点发现库存短缺',
            created_at: '2024-01-12T09:30:00Z'
          },
          {
            log_id: 'log-006',
            sku_id: sku.sku_id || sku.id,
            operation_type: 'create',
            quantity_change: 50,
            quantity_before: 0,
            quantity_after: 50,
            unit_price: 0,
            total_amount: 0,
            operator_id: 'user-004',
            operator_name: '赵六',
            reason: '初始库存',
            notes: 'SKU创建时的初始库存录入',
            created_at: '2024-01-10T08:00:00Z'
          }
        ]
        
        setHistoryData(mockHistoryData)
        setFilteredData(mockHistoryData)
      } catch (error) {
        console.error('获取历史数据失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistoryData()
  }, [sku.sku_id || sku.id])

  // 应用筛选和搜索
  useEffect(() => {
    let filtered = [...historyData]

    // 搜索筛选
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.operator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()))
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
      const now = new Date()
      let startDate: Date
      
      switch (filter.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          startDate = new Date(0)
      }
      
      filtered = filtered.filter(log => new Date(log.created_at) >= startDate)
    }

    setFilteredData(filtered)
    setCurrentPage(1)
  }, [historyData, searchTerm, filter])

  // 获取操作类型信息
  const getOperationInfo = (type: string) => {
    switch (type) {
      case 'sell':
        return { icon: <ShoppingCart className="h-4 w-4" />, name: '销售', color: 'text-green-600 bg-green-100' }
      case 'destroy':
        return { icon: <Trash2 className="h-4 w-4" />, name: '销毁', color: 'text-red-600 bg-red-100' }
      case 'adjust_increase':
        return { icon: <TrendingUp className="h-4 w-4" />, name: '库存增加', color: 'text-blue-600 bg-blue-100' }
      case 'adjust_decrease':
        return { icon: <TrendingDown className="h-4 w-4" />, name: '库存减少', color: 'text-orange-600 bg-orange-100' }
      case 'create':
        return { icon: <Package className="h-4 w-4" />, name: '创建', color: 'text-purple-600 bg-purple-100' }
      default:
        return { icon: <Package className="h-4 w-4" />, name: '未知', color: 'text-gray-600 bg-gray-100' }
    }
  }

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 获取唯一操作员列表
  const getUniqueOperators = () => {
    const operators = [...new Set(historyData.map(log => log.operator_name))]
    return operators.sort()
  }

  // 分页数据
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const totalPages = Math.ceil(filteredData.length / pageSize)

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载操作历史...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* SKU基本信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Package className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">SKU操作历史</h3>
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
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索操作员、原因或备注..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* 筛选按钮 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            筛选条件
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${
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
                  value={filter.type}
                  onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
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
                  value={filter.dateRange}
                  onChange={(e) => setFilter(prev => ({ ...prev, dateRange: e.target.value }))}
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
                  value={filter.operator}
                  onChange={(e) => setFilter(prev => ({ ...prev, operator: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部操作员</option>
                  {getUniqueOperators().map(operator => (
                    <option key={operator} value={operator}>{operator}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 历史记录列表 */}
      <div className="space-y-3">
        {paginatedData.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无操作历史</p>
          </div>
        ) : (
          paginatedData.map((log) => {
            const operationInfo = getOperationInfo(log.operation_type)
            
            return (
              <div key={log.log_id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* 操作类型图标 */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      operationInfo.color
                    }`}>
                      {operationInfo.icon}
                    </div>
                    
                    {/* 操作信息 */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{operationInfo.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          log.quantity_change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {log.quantity_change > 0 ? '+' : ''}{log.quantity_change} 件
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{log.reason}</p>
                      
                      {log.notes && (
                        <p className="text-xs text-gray-500 mb-2">{log.notes}</p>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatTime(log.created_at)}
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
                            金额：¥{log.total_amount.toFixed(2)}
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} 条，
            共 {filteredData.length} 条记录
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            
            <span className="text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
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