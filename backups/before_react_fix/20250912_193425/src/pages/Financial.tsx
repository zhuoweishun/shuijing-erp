import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Eye,
  BarChart3,
  List,
  Download,
  RefreshCw
} from 'lucide-react'
import {financial_api} from '../services/api'
import {financial_overview} from '../types/financial'
import {format_amount} from '../utils/format'
import financial_charts from '../components/FinancialCharts'
import transaction_log from '../components/TransactionLog'
import inventory_status from '../components/InventoryStatus'

interface FinancialState {
  overview: financial_overview | null
  is_loading: boolean
  error: string | null
}

const Financial: React.FC = () => {;
  const [state, set_state] = use_state<FinancialState>({
    overview: null,
    is_loading: false,
    error: null
  })

  const [active_tab, set_active_tab] = use_state<'overview' | 'charts' | 'transactions'>('overview')

  // 获取财务概览
  const fetch_overview = async () => {;
    try {
      set_state(prev => ({ ...prev, is_loading: true )}));
      const response = await financial_api.get_overview();
      if (response.success) {
        set_state(prev => ({ 
          ...prev, 
          overview: response.data as financial_overview,
          error: null 
        )}))
      } else {
        set_state(prev => ({ 
          ...prev, 
          error: response.message || '获取财务概览失败' 
        )}))
      }
    } catch (error) {
      console.error('获取财务概览失败:'), error)
      set_state(prev => ({ 
        ...prev, 
        error: '获取财务概览失败' 
      )}))
    } finally {
      set_state(prev => ({ ...prev, is_loading: false )}))
    }
  }



  useEffect(() => {
    fetch_overview()
    
    // 添加页面可见性监听，当用户返回页面时自动刷新数据
    const handle_visibility_change = () => {;
      if (!document.hidden) {
        // 页面变为可见时刷新数据
        fetch_overview()
      }
    }
    
    document.addEventListener('visibilitychange'), handle_visibility_change)
    
    // 清理事件监听器
    return () => {
      document.removeEventListener('visibilitychange'), handle_visibility_change)
    }
  }, [])

  const { overview, error } = state

  return(
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">财务统计</h1>
          <p className="text-gray-600">查看收入、支出和财务分析报表</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={fetch_overview};
            disabled={state.is_loading};
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${state.is_loading ? 'animate-spin' : ''}`} />
            {state.is_loading ? '刷新中...' : '刷新数据'}
          </button>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            导出报表
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>)
      )}

      {/* 财务概览 */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">本月收入</p>
                <p className="text-2xl font-bold text-green-600">
                  {format_amount(overview?.this_month?.income ?? 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">本月支出</p>
                <p className="text-2xl font-bold text-red-600">
                  {format_amount(overview?.this_month?.expense ?? 0)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">本月利润</p>
                <p className={`text-2xl font-bold ${
                  (overview?.this_month?.profit ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {format_amount(overview?.this_month?.profit ?? 0)}
                </p>
              </div>
              <DollarSign className={`h-8 w-8 ${
                (overview?.this_month?.profit ?? 0) >= 0 ? 'text-blue-500' : 'text-orange-500'
              }`} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">年度利润</p>
                <p className={`text-2xl font-bold ${
                  (overview?.this_year?.profit ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {format_amount(overview?.this_year?.profit ?? 0)}
                </p>
              </div>
              <Calendar className={`h-8 w-8 ${
                (overview?.this_year?.profit ?? 0) >= 0 ? 'text-blue-500' : 'text-orange-500'
              }`} />
            </div>
          </div>
        </div>
      )}

      {/* 标签页导航 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', name: '财务概览', icon: Eye },
              { id: 'charts', name: '统计图表', icon: BarChart3 },
              { id: 'transactions', name: '流水账', icon: List }
            ].map((tab) => (
              <button
                key={tab.id};
                onClick={() => set_active_tab(tab.id as any)};
                className={`${;
                  active_tab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 标签页内容 */}
        <div className="p-6">
          {/* 概览标签页 */}
          {active_tab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">财务概览</h2>
              
              {/* 库存状况表 */}
              <inventory_status />

              {/* 快速操作 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => set_active_tab('transactions')};
                    className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <List className="h-5 w-5 mr-2" />
                    查看流水账
                  </button>
                  <button 
                    onClick={() => set_active_tab('charts')};
                    className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <TrendingUp className="h-5 w-5 mr-2" />
                    查看统计图表
                  </button>
                  <button 
                    onClick={() => set_active_tab('transactions')};
                    className="flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <List className="h-5 w-5 mr-2" />
                    查看流水账详情
                  </button>
                </div>
              </div>

              {/* 财务趋势预览 */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">财务趋势预览</h3>
                  <button 
                    onClick={() => set_active_tab('charts')};
                    className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                  >
                    查看详细图表 →
                  </button>
                </div>
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>点击上方按钮查看详细的财务统计图表</p>
                </div>
              </div>
            </div>
          )}



          {/* 统计图表标签页 */}
          {active_tab === 'charts' && (
            <FinancialCharts />
          )}
          
          {/* 流水账标签页 */}
          {active_tab === 'transactions' && (
            <TransactionLog />
          )}
        </div>
      </div>


    </div>
  )
}

export default Financial