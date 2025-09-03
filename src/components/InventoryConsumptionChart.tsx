import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { inventoryApi } from '../services/api'
import { toast } from 'react-hot-toast'
import { useDeviceDetection } from '../hooks/useDeviceDetection'

// 时间维度配置
const TIME_RANGES = [
  { key: '7d', label: '最近7天' },
  { key: '30d', label: '最近30天' },
  { key: '90d', label: '最近90天' },
  { key: '6m', label: '最近半年' },
  { key: '1y', label: '最近1年' },
  { key: 'all', label: '全部' }
] as const

type TimeRange = typeof TIME_RANGES[number]['key']

interface ConsumptionItem {
  purchase_id: string
  product_name: string
  product_type: string
  bead_diameter?: number
  specification?: number
  quality?: string
  supplier_name?: string
  total_consumed: number
  consumption_count: number
  avg_consumption: number
  last_consumption_date: string
  first_consumption_date: string
  unit_type: string // 单位类型：颗/件
}

interface ConsumptionData {
  time_range: string
  total_consumption: number
  total_consumption_count: number
  top_consumed_products: ConsumptionItem[]
  analysis_date: string
}

const InventoryConsumptionChart: React.FC = () => {
  const { isMobile } = useDeviceDetection()
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('30d')
  const [data, setData] = useState<ConsumptionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  // 获取库存消耗分析数据
  const fetchConsumptionAnalysis = async (timeRange: TimeRange) => {
    setLoading(true)
    try {
      const response = await inventoryApi.getConsumptionAnalysis({
        time_range: timeRange,
        limit: 10
      })
      
      if (response.success && response.data) {
        setData(response.data as ConsumptionData)
      } else {
        console.error('获取库存消耗分析数据失败:', response)
        toast.error('获取消耗分析数据失败')
      }
    } catch (error) {
      console.error('获取库存消耗分析数据失败:', error)
      toast.error('获取消耗分析数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 格式化图表数据
  const formatChartData = () => {
    if (!data?.top_consumed_products) return []
    
    return data.top_consumed_products.map((item) => ({
      name: item.product_name.length > 8 ? `${item.product_name.slice(0, 8)}...` : item.product_name,
      fullName: item.product_name,
      consumed: item.total_consumed,
      count: item.consumption_count,
      avgConsumption: Math.round(item.avg_consumption * 100) / 100,
      quality: item.quality || '未分级',
      supplier: item.supplier_name || '未知供应商',
      unitType: item.unit_type || '个'
    }))
  }

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.fullName}</p>
          <p className="text-sm text-gray-600">
            总消耗: {data.consumed.toLocaleString()} {data.unitType}
          </p>
          <p className="text-sm text-gray-600">
            消耗次数: {data.count} 次
          </p>
          <p className="text-sm text-gray-600">
            平均消耗: {data.avgConsumption} {data.unitType}
          </p>
          <p className="text-sm text-gray-600">
            品相: {data.quality}
          </p>
          {data.supplier && (
            <p className="text-sm text-gray-600">
              供应商: {data.supplier}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  // 初始加载
  useEffect(() => {
    fetchConsumptionAnalysis(selectedTimeRange)
  }, [selectedTimeRange])

  return (
    <div className={isMobile ? '' : 'bg-white rounded-lg shadow-sm border border-gray-200 p-6'}>
      <div className="mb-4">
        <div className={`flex items-center ${isMobile ? 'flex-col space-y-3' : 'justify-between'} mb-3`}>
          <h3 className={`${isMobile ? 'text-mobile-subtitle' : 'text-lg'} font-semibold text-gray-900`}>
            库存消耗分析 - 前10名
          </h3>
          
          {/* 视图切换按钮 */}
          <div className={`flex bg-gray-100 rounded-md ${isMobile ? 'w-full' : 'p-1'}`}>
            <button
              onClick={() => setViewMode('chart')}
              className={`${isMobile ? 'flex-1 py-2' : 'px-3 py-1'} rounded text-sm font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              图表
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`${isMobile ? 'flex-1 py-2' : 'px-3 py-1'} rounded text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              表格
            </button>
          </div>
        </div>
        
        {/* 时间维度切换按钮 */}
        <div className={`flex flex-wrap ${isMobile ? 'gap-mobile-xs' : 'gap-2'}`}>
          {TIME_RANGES.map((range) => (
            <button
              key={range.key}
              onClick={() => setSelectedTimeRange(range.key)}
              className={`${isMobile ? 'btn-mobile text-xs' : 'px-3 py-1'} rounded-md font-medium transition-colors ${
                selectedTimeRange === range.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        
        {/* 统计信息 */}
        {data && (
          <div className={`mt-3 flex flex-wrap ${isMobile ? 'gap-mobile-xs' : 'gap-4'} ${isMobile ? 'text-mobile-caption' : 'text-sm'} text-gray-600`}>
            <span>总消耗量: {Number(data.total_consumption).toLocaleString()} 件</span>
            <span>消耗次数: {data.total_consumption_count} 次</span>
            <span>分析时间: {formatDate(data.analysis_date)}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className={`flex items-center justify-center ${isMobile ? 'h-48' : 'h-64'}`}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className={`ml-2 text-gray-600 ${isMobile ? 'text-mobile-caption' : 'text-sm'}`}>加载中...</span>
        </div>
      ) : (data?.top_consumed_products?.length || 0) > 0 ? (
        <div className={isMobile ? 'h-80 w-full' : 'h-80'} style={{ minHeight: isMobile ? '320px' : '320px' }}>
          {viewMode === 'chart' ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart 
                data={formatChartData()} 
                margin={{ 
                  top: 20, 
                  right: isMobile ? 5 : 30, 
                  left: isMobile ? 5 : 20, 
                  bottom: isMobile ? 80 : 60 
                }}
                width={isMobile ? 350 : 600}
                height={isMobile ? 320 : 320}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 80 : 60}
                  fontSize={isMobile ? 10 : 12}
                  interval={0}
                  tick={{ fontSize: isMobile ? 10 : 12, fill: '#666' }}
                />
                <YAxis 
                  fontSize={isMobile ? 10 : 12}
                  tick={{ fontSize: isMobile ? 10 : 12, fill: '#666' }}
                  width={isMobile ? 40 : 60}
                />
                <Tooltip content={<CustomTooltip />} />
                {!isMobile && <Legend />}
                <Bar 
                  dataKey="consumed" 
                  fill="#3B82F6" 
                  name="消耗量"
                  radius={[4, 4, 0, 0]}
                  stroke="#2563EB"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={isMobile ? 'space-mobile' : 'overflow-x-auto'}>
              {isMobile ? (
                // 移动端卡片式布局
                <div className="space-mobile">
                  {data?.top_consumed_products?.map((item, index) => (
                    <div key={item.purchase_id} className="card-mobile">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-mobile-body">{item.product_name}</div>
                          <div className="text-mobile-caption text-gray-500">
                            {item.bead_diameter && `${item.bead_diameter}mm`}
                            {item.specification && `${item.specification}mm`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-mobile-caption font-medium text-gray-900">#{index + 1}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-mobile-caption">
                        <div>
                          <span className="text-gray-500">总消耗:</span>
                          <span className="ml-1 font-medium">{item.total_consumed.toLocaleString()} {item.unit_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">次数:</span>
                          <span className="ml-1 font-medium">{item.consumption_count} 次</span>
                        </div>
                        <div>
                          <span className="text-gray-500">平均:</span>
                          <span className="ml-1 font-medium">{Math.round(item.avg_consumption * 100) / 100} {item.unit_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">品相:</span>
                          <span className={`ml-1 inline-flex px-1 py-0.5 text-xs font-semibold rounded ${
                            item.quality === 'AA' ? 'bg-green-100 text-green-800' :
                            item.quality === 'A' ? 'bg-blue-100 text-blue-800' :
                            item.quality === 'AB' ? 'bg-yellow-100 text-yellow-800' :
                            item.quality === 'B' ? 'bg-orange-100 text-orange-800' :
                            item.quality === 'C' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.quality || '未分级'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-mobile-small text-gray-500">
                        最近消耗: {formatDate(item.last_consumption_date)}
                        {item.supplier_name && ` · 供应商: ${item.supplier_name}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        排名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        产品名称
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        总消耗量
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        消耗次数
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        平均消耗
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        品相
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        最近消耗
                      </th>
                      {data?.top_consumed_products[0]?.supplier_name && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          供应商
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data?.top_consumed_products?.map((item, index) => (
                      <tr key={item.purchase_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{index + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-xs text-gray-500">
                              {item.bead_diameter && `${item.bead_diameter}mm`}
                              {item.specification && `${item.specification}mm`}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.total_consumed.toLocaleString()} {item.unit_type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.consumption_count} 次
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round(item.avg_consumption * 100) / 100} {item.unit_type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.quality === 'AA' ? 'bg-green-100 text-green-800' :
                            item.quality === 'A' ? 'bg-blue-100 text-blue-800' :
                            item.quality === 'AB' ? 'bg-yellow-100 text-yellow-800' :
                            item.quality === 'B' ? 'bg-orange-100 text-orange-800' :
                            item.quality === 'C' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.quality || '未分级'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(item.last_consumption_date)}
                        </td>
                        {item.supplier_name && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.supplier_name}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={`flex items-center justify-center ${isMobile ? 'h-48' : 'h-64'} text-gray-500`}>
          <div className="text-center">
            <p className={`${isMobile ? 'text-mobile-caption' : 'text-sm'} mb-1`}>暂无消耗数据</p>
            <p className={isMobile ? 'text-mobile-small' : 'text-xs'}>当前时间范围内没有库存消耗记录</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryConsumptionChart