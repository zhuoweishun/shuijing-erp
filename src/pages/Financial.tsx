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
import { financial_api } from '../services/api'
import { financial_overview } from '../types/financial'
import { format_amount } from '../utils/format'
import { useAuth } from '../hooks/useAuth'
import FinancialCharts from '../components/FinancialCharts'
import TransactionLog from '../components/TransactionLog'
import InventoryStatus from '../components/InventoryStatus'

interface FinancialState {
  overview: financial_overview | null
  is_loading: boolean
  error: string | null
}

const Financial: React.FC = () => {
  const { is_authenticated, is_loading: auth_loading } = useAuth()
  const [state, setState] = useState<FinancialState>({
    overview: null,
    is_loading: false,
    error: null
  })

  const [active_tab, set_active_tab] = useState<'overview' | 'charts' | 'transactions'>('overview')

  // 获取财务概览
  const fetchOverview = async () => {
    // 在发起请求前再次检查认证状态
    const token = localStorage.getItem('auth_token')
    if (!is_authenticated || !token) {
      console.warn('⚠️ [财务页面] 认证状态异常，取消API请求:', { is_authenticated, hasToken: !!token })
      setState(prev => ({ 
        ...prev, 
        error: '用户未登录，请重新登录' 
      }))
      return
    }
    
    try {
      console.log('🚀 [财务页面] 开始获取财务概览数据')
      setState(prev => ({ ...prev, is_loading: true, error: null }))
      
      const response = await financial_api.get_overview()
      
      if (response.success) {
        console.log('✅ [财务页面] 财务概览数据获取成功')
        setState(prev => ({ 
          ...prev, 
          overview: response.data as financial_overview,
          error: null 
        }))
      } else {
        console.error('❌ [财务页面] 财务概览API返回错误:', response.message)
        setState(prev => ({ 
          ...prev, 
          error: response.message || '获取财务概览失败' 
        }))
      }
    } catch (error: any) {
      console.error('❌ [财务页面] 获取财务概览失败:', error)
      
      // 检查是否是认证错误
      if (error.message && (error.message.includes('401') || error.message.includes('unauthorized') || error.message.includes('token'))) {
        setState(prev => ({ 
          ...prev, 
          error: '登录已过期，请重新登录' 
        }))
      } else {
        setState(prev => ({ 
          ...prev, 
          error: '获取财务概览失败，请检查网络连接' 
        }))
      }
    } finally {
      setState(prev => ({ ...prev, is_loading: false }))
    }
  }



  useEffect(() => {
    // 只有在认证完成且已登录时才获取数据
    if (!auth_loading && is_authenticated) {
      console.log('🔄 [财务页面] 认证状态正常，开始获取财务概览数据')
      fetchOverview()
    } else {
      console.log('⏳ [财务页面] 等待认证状态:', { auth_loading, is_authenticated })
    }
  }, [auth_loading, is_authenticated])

  const { overview, error } = state

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">财务统计</h1>
          <p className="text-gray-600">查看收入、支出和财务分析报表</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => {
              console.log('🔄 [财务页面] 手动刷新按钮点击')
              fetchOverview()
            }}
            disabled={state.is_loading || !is_authenticated}
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
        </div>
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
                key={tab.id}
                onClick={() => set_active_tab(tab.id as any)}
                className={`${
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
              <InventoryStatus />

              {/* 快速操作 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => set_active_tab('transactions')}
                    className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <List className="h-5 w-5 mr-2" />
                    查看流水账
                  </button>
                  <button 
                    onClick={() => set_active_tab('charts')}
                    className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <TrendingUp className="h-5 w-5 mr-2" />
                    查看统计图表
                  </button>
                  <button 
                    onClick={() => set_active_tab('transactions')}
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
                    onClick={() => set_active_tab('charts')}
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