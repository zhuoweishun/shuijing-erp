import { useState, useEffect } from 'react'
import { Calendar, Download, FileText, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { financial_api } from '../services/api'
import { toast } from 'sonner'
import { format_currency, format_date } from '../utils/format'

interface FinancialReportData {
  period: string
  total_income: number
  total_expense: number
  net_profit: number
  incomeByCategory: { item_category: string; amount: number }[]
  expenseByCategory: { item_category: string; amount: number }[]
  monthlyTrend: { month: string; income: number; expense: number; profit: number }[]
}

interface FinancialReportsProps {
  className?: string
}

export default function FinancialReports({ className = '' }: FinancialReportsProps) {const [reportData, setReportData] = useState<FinancialReportData | null>(null)
  const [loading, set_loading] = useState(false)
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  })
  const [report_type, setReportType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')

  useEffect(() => {
    loadReportData()
  }, [dateRange, report_type])

  const loadReportData = async () => {try {
      set_loading(true)
      
      // 获取财务统计数据
      const response = await financial_api.get_statistics({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        // groupBy: report_type === 'monthly' ? 'day' : 'month' // 暂时注释掉不支持的参数
      })

      if (response.success && response.data) {
        const stats = response.data
        
        // 构建报表数据
        const reportData: FinancialReportData = {
          period: `${format_date(dateRange.start_date)} - ${format_date(dateRange.end_date)}`,
          total_income: (stats as any)?.total_income || 0,
          total_expense: (stats as any)?.total_expense || 0,
          net_profit: ((stats as any)?.total_income || 0) - ((stats as any)?.total_expense || 0),
          incomeByCategory: (stats as any)?.incomeByCategory || [],
          expenseByCategory: (stats as any)?.expenseByCategory || [],
          monthlyTrend: (stats as any)?.trend_data || []
        }
        
        setReportData(reportData)
      }
    } catch (error: any) {
      console.error('加载报表数据失败:', error)
      toast.error('加载报表数据失败')
    } finally {set_loading(false)
    }
  }

  const exportReport = () => {
    if (!reportData) return
    
    // 生成CSV格式的报表数据
    const csvContent = [
      ['财务报表', reportData.period],
      [''],
      ['概览'],
      ['总收入', format_currency(reportData.total_income)],
      ['总支出', format_currency(reportData.total_expense)],
      ['净利润', format_currency(reportData.net_profit)],
      [''],
      ['收入分类'],
      ...reportData.incomeByCategory.map(item => [item.item.category, format_currency(item.amount)]),
      [''],
      ['支出分类'],
      ...reportData.expenseByCategory.map(item => [item.item.category, format_currency(item.amount)])
    ]
    
    const csvString = csvContent.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `财务报表_${reportData.period.replace(/[\s-]/g, '_')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    
    toast.success('报表导出成功')
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-8">
          <FileText className="mx-auto h-8 w-8 text-gray-400 mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">加载中...</h3>
          <p className="text-xs text-gray-500">正在获取财务报表数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* 报表头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center mb-4 sm:mb-0">
          <FileText className="h-5 w-5 text-blue-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">财务报表</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 日期范围选择 */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* 报表类型选择 */}
          <select
            value={report_type}
            onChange={(e) => setReportType(e.target.value as 'monthly' | 'quarterly' | 'yearly')}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="monthly">月度报表</option>
            <option value="quarterly">季度报表</option>
            <option value="yearly">年度报表</option>
          </select>
          
          {/* 导出按钮 */}
          <button
            onClick={exportReport}
            disabled={!reportData}
            className="flex items-center px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-4 w-4 mr-1" />
            导出
          </button>
        </div>
      </div>

      {reportData ? (
        <div className="space-y-6">
          {/* 财务概览 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">流水收入</p>
                  <p className="text-2xl font-bold text-green-700">
                    {format_currency(reportData.total_income)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">流水支出</p>
                  <p className="text-2xl font-bold text-red-700">
                    {format_currency(reportData.total_expense)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </div>
            
            <div className={`${reportData.net_profit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} border rounded-lg p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${reportData.net_profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    净流水
                  </p>
                  <p className={`text-2xl font-bold ${reportData.net_profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                    {format_currency(reportData.net_profit)}
                  </p>
                </div>
                <DollarSign className={`h-8 w-8 ${reportData.net_profit >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
              </div>
            </div>
          </div>

          {/* 收入支出分类 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 收入分类 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">收入分类</h3>
              <div className="space-y-2">
                {reportData.incomeByCategory.length > 0 ? (
                  reportData.incomeByCategory.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">{item.item.category || '未分类'}</span>
                      <span className="text-sm font-bold text-green-600">
                        {format_currency(item.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">暂无收入记录</p>
                )}
              </div>
            </div>
            
            {/* 支出分类 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">支出分类</h3>
              <div className="space-y-2">
                {reportData.expenseByCategory.length > 0 ? (
                  reportData.expenseByCategory.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">{item.item.category || '未分类'}</span>
                      <span className="text-sm font-bold text-red-600">
                        {format_currency(item.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">暂无支出记录</p>
                )}
              </div>
            </div>
          </div>

          {/* 趋势数据 */}
          {reportData.monthlyTrend.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">趋势分析</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        收入
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        支出
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        利润
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.monthlyTrend.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {format_currency(item.income)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {format_currency(item.expense)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          item.profit >= 0 ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          {format_currency(item.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>暂无报表数据</p>
        </div>
      )}
    </div>
  )
}