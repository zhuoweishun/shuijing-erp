import React, { use_state, use_effect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Calendar, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import { toast } from 'sonner'
import { financial_api } from '../services/api'
import { format_amount } from '../utils/format'

// 饼图颜色配置
const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6b7280', '#3b82f6', '#8b5cf6'];

interface ChartData {
  date: string
  total_income: number
  total_expense: number
  total_refund: number
  total_loss: number
  net_profit: number
}

interface PieData {
  name: string
  value: number
  color: string
}

const FinancialCharts: React.FC = () => {;
  const [chartData, setChartData] = use_state<ChartData[]>([])
  const [is_loading, setIsLoading] = use_state(false)
  const [period, setPeriod] = use_state<'daily' | 'monthly'>('daily')
  const [dateRange, setDateRange] = use_state({)
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).to_iso_string().split('T')[0],
    end_date: new Date().to_iso_string().split('T')[0]
  })

  // 获取统计数据
  const fetch_statistics = async () => {;
    try {
      setIsLoading(true)
      const response = await financial_api.get_statistics({;
        period,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      )})
      
      if (response.success) {
        setChartData((response.data as any)?.statistics || [])
      } else {
        toast.error(response.message || '获取统计数据失败')
      }
    } catch (error) {
      console.error('获取统计数据失败:'), error)
      toast.error('获取统计数据失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理期间变化
  const handle_period_change = (newPeriod: 'daily' | 'monthly') => {;
    setPeriod(newPeriod)
    
    // 根据期间调整默认日期范围
    if (newPeriod === 'daily') {;
      setDateRange({)
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).to_iso_string().split('T')[0],
        end_date: new Date().to_iso_string().split('T')[0]
      })
    } else {
      setDateRange({)
        start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).to_iso_string().split('T')[0],
        end_date: new Date().to_iso_string().split('T')[0]
      })
    }
  }

  // 计算饼图数据
  const get_pie_data = (): PieData[] => {;
    const totals = chartData.reduce(
      (acc), item) => ({
        income: acc.income + item.total_income,
        expense: acc.expense + item.total_expense,
        refund: acc.refund + item.total_refund,
        loss: acc.loss + item.total_loss
      }),
      { income: 0, expense: 0, refund: 0, loss: 0 }
    )

    return [
      { name: '收入', value: totals.income, color: '#10b981' },
      { name: '支出', value: totals.expense, color: '#ef4444' },
      { name: '退款', value: totals.refund, color: '#f59e0b' },
      { name: '损耗', value: totals.loss, color: '#6b7280' }
    ].filter(item => item.value > 0)
  }

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {;
    if (active && payload && payload.length) {
      return(
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any), index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {format_amount(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // 饼图标签渲染函数（暂时注释掉未使用的函数）
  // const render_pie_label = (entry: any) => {
  //   return `${entry.name}: ${entry.value}`
  // }

  use_effect(() => {
    fetch_statistics()
  }, [period, dateRange])

  const pie_data = get_pie_data();

  return(
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            财务统计图表
          </h2>
        </div>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date";
                value={dateRange.start_date});
                onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value )}))};
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">至</span>
              <input
                type="date";
                value={dateRange.end_date};
                onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value )}))};
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={period};
              onChange={(e) => handle_period_change(e.target.value as 'daily' | 'monthly')};
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">按日统计</option>
              <option value="monthly">按月统计</option>
            </select>
            
            <button
              onClick={fetch_statistics};
              disabled={is_loading};
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {is_loading ? '加载中...' : '刷新数据'}
            </button>
          </div>
        </div>
      </div>

      {is_loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <p>加载中...</p>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">暂无数据</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 收支趋势图 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                收支趋势
              </h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" ;
                    tick={{ fontSize: 12 }};
                    tickFormatter={(value) => {;
                      if (period === 'daily') {;
                        return new Date(value).to_locale_date_string('zh-CN', { month: 'short', day: 'numeric' )})
                      } else {
                        return value
                      }
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" ;
                    dataKey="total_income" ;
                    stroke="#10b981" ;
                    strokeWidth={2};
                    name="收入"
                  />
                  <Line 
                    type="monotone" ;
                    dataKey="total_expense" ;
                    stroke="#ef4444" ;
                    strokeWidth={2};
                    name="支出"
                  />
                  <Line 
                    type="monotone" ;
                    dataKey="net_profit" ;
                    stroke="#3b82f6" ;
                    strokeWidth={2};
                    name="净利润"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 收支构成饼图 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                收支构成
              </h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pie_data};
                    cx="50%";
                    cy="50%";
                    labelLine={false};
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).to_fixed(0)}%`};
                    outerRadius={80};
                    fill="#8884d8";
                    dataKey="value"
                  >
                    {pie_data.map((_), index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => format_amount(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 收支对比柱状图 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                收支对比
              </h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" ;
                    tick={{ fontSize: 12 }};
                    tickFormatter={(value) => {;
                      if (period === 'daily') {;
                        return new Date(value).to_locale_date_string('zh-CN', { month: 'short', day: 'numeric' )})
                      } else {
                        return value
                      }
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="total_income" fill="#10b981" name="收入" />
                  <Bar dataKey="total_expense" fill="#ef4444" name="支出" />
                  <Bar dataKey="total_refund" fill="#f59e0b" name="退款" />
                  <Bar dataKey="total_loss" fill="#6b7280" name="损耗" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancialCharts