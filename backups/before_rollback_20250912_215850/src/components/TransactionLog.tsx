import React, { useState, useEffect } from 'react'
import {
  Filter,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { financial_api } from '../services/api'
import {
  TransactionRecord,
  TransactionListResponse,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_CATEGORY_COLORS
} from '../types/financial'
import { format_amount, format_date } from '../utils/format'
import { extract_and_translate_refund_reason } from '../utils/refundReasons'

interface TransactionLogState {
  transactions: TransactionRecord[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  summary: {
    total_income: number
    total_expense: number
    net_profit: number
  }
}

interface FilterState {
  type: 'all' | 'income' | 'expense'
  search: string
  start_date: string
  end_date: string
}

const TransactionLog: React.FC = () => {
  const [state, setState] = useState<TransactionLogState>({
    transactions: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      total_pages: 0
    },
    summary: {
      total_income: 0,
      total_expense: 0,
      net_profit: 0
    }
  })

  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    search: '',
    start_date: '',
    end_date: ''
  })

  const [showFilters, setShowFilters] = useState(false)

  // 获取流水账数据
  const fetchTransactions = async (page: number = 1, custom_limit?: number) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const params: any = {
        page,
        limit: custom_limit || state.pagination.limit,
        type: filters.type === 'all' ? undefined : filters.type
      }

      if (filters.search.trim()) {
        params.search = filters.search.trim()
      }
      if (filters.start_date) {
        params.start_date = filters.start_date
      }
      if (filters.end_date) {
        params.end_date = filters.end_date
      }

      const response = await financial_api.get_transactions(params)
      
      if (response.success) {
        const data = response.data as TransactionListResponse
        setState(prev => ({
          ...prev,
          transactions: data.transactions,
          pagination: data.pagination,
          summary: data.summary,
          error: null
        }))
      } else {
        setState(prev => ({
          ...prev,
          error: response.message || '获取流水账失败'
        }))
      }
    } catch (error) {
      console.error('获取流水账失败:', error)
      setState(prev => ({
        ...prev,
        error: '获取流水账失败'
      }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  // 处理筛选变化
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  // 应用筛选
  const applyFilters = () => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page: 1 }
    }))
    fetchTransactions(1)
  }

  // 重置筛选
  const resetFilters = () => {
    setFilters({
      type: 'all',
      search: '',
      start_date: '',
      end_date: ''
    })
    setTimeout(() => {
      fetchTransactions(1)
    }, 100)
  }

  // 分页处理
  const handle_page_change = (page: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    }))
    fetchTransactions(page)
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
    fetchTransactions(1, newLimit)
  }



  // 获取交易类型图标
  const get_transaction_icon = (type: 'income' | 'expense') => {
    return type === 'income' ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const { transactions, loading, error, pagination, summary } = state

  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">流水账</h2>
          <p className="text-sm text-gray-600">查看所有收支记录的详细流水</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-gray-600">净利润</div>
            <div className={`text-lg font-semibold ${
              summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {format_amount(summary.net_profit)}
            </div>
          </div>
          <button
            onClick={() => fetchTransactions(pagination.page)}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">流水收入</p>
              <p className="text-2xl font-bold text-green-600">
                {format_amount(summary.total_income)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">流水支出</p>
              <p className="text-2xl font-bold text-red-600">
                {format_amount(summary.total_expense)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className={`border rounded-lg p-4 ${
          summary.net_profit >= 0 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                summary.net_profit >= 0 ? 'text-blue-800' : 'text-orange-800'
              }`}>
                净流水
              </p>
              <p className={`text-2xl font-bold ${
                summary.net_profit >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {format_amount(summary.net_profit)}
              </p>
            </div>
            {summary.net_profit >= 0 ? (
              <TrendingUp className="h-8 w-8 text-blue-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-orange-500" />
            )}
          </div>
        </div>
      </div>

      {/* 筛选工具栏 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">筛选条件</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? '收起筛选' : '展开筛选'}
          </button>
        </div>

        {/* 基础筛选 */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">类型：</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange({ type: e.target.value as any })}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">全部</option>
              <option value="income">收入</option>
              <option value="expense">支出</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索描述或编号..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm w-48"
            />
          </div>

          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
          >
            应用筛选
          </button>
          
          <button
            onClick={resetFilters}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
          >
            重置
          </button>
        </div>

        {/* 高级筛选 */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">开始日期：</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange({ start_date: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">结束日期：</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange({ end_date: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 流水账列表 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            流水账记录 ({pagination.total} 条)
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">加载中...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无流水账记录</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {get_transaction_icon(transaction.type)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          TRANSACTION_CATEGORY_COLORS[transaction.item.category]
                        } bg-gray-100`}>
                          {TRANSACTION_CATEGORY_LABELS[transaction.item.category]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {transaction.item.category === 'refund' ? extract_and_translate_refund_reason(transaction.details) : transaction.details}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format_date(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{format_amount(transaction.amount)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {pagination.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
            <div className="sm:hidden">
              {/* 手机端记录信息和每页显示条数 */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-700">
                  第{pagination.page}页，共{pagination.total_pages}页
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">每页:</span>
                  <select
                    value={pagination.limit}
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
              {pagination.total_pages > 1 && (
                <div className="flex justify-between">
                  <button
                    onClick={() => handle_page_change(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => handle_page_change(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages}
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
                  显示第 <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> 到{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  条，共 <span className="font-medium">{pagination.total}</span> 条记录
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">每页显示:</span>
                  <select
                    value={pagination.limit}
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
              {pagination.total_pages > 1 && (
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handle_page_change(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {(() => {
                       const total_pages = pagination.total_pages
                       const maxVisiblePages = 5
                       
                       let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2))
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
                            page === pagination.page
                              ? 'z-10 bg-gray-50 border-gray-500 text-gray-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))
                    })()}
                    
                    <button
                      onClick={() => handle_page_change(pagination.page + 1)}
                      disabled={pagination.page >= pagination.total_pages}
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
      </div>
    </div>
  )
}

export default TransactionLog