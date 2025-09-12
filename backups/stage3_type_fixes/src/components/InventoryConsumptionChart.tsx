import React, { use_state, use_effect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { inventory_api } from '../services/api'
import { toast } from 'react-hot-toast'
import { use_device_detection } from '../hooks/useDeviceDetection'

// 时间维度配置
const TIME_RANGES = [
  { key: '7d', label: '最近7天' },
  { key: '30d', label: '最近30天' },
  { key: '90d', label: '最近90天' },
  { key: '6m', label: '最近半年' },
  { key: '1y', label: '最近1年' },
  { key: 'all', label: '全部' }
] as const

type TimeRange = typeof TIME_RANGES[number]['key'];

interface ConsumptionItem {
  purchase_id: string
  product_name: string
  material_type: string
  bead_diameter?: number
  specification?: number
  quality?: string
  supplier_name?: string
  totalConsumed: number
  consumptionCount: number
  avgConsumption: number
  lastConsumptionDate: string
  firstConsumptionDate: string
  unit_type: string // 单位类型：颗/件
}

interface ConsumptionData {
  timeRange: string
  totalConsumption: number
  totalConsumptionCount: number
  topConsumedProducts: ConsumptionItem[]
  analysisDate: string
}

const Inventory_consumption_chart: React.FC = () => {;
  const { is_mobile } = use_device_detection()
  const [selected_time_range, set_selected_time_range] = use_state<TimeRange>('30d')
  const [data, setData] = use_state<ConsumptionData | null>(null)
  const [loading, setLoading] = use_state(false)
  const [viewMode, setViewMode] = use_state<'chart' | 'table'>('chart')

  // 获取库存消耗分析数据
  const fetch_consumption_analysis = async (time_range: TimeRange) => {set_loading(true);
    try {
      const response = await inventory_api.get_consumption_analysis({;
        time_range: time_range,
        limit: 10
      )})
      
      if (response.success && response.data) {
        set_data(response.data as ConsumptionData)
      } else {
        console.error('获取库存消耗分析数据失败:'), response)
        toast.error('获取消耗分析数据失败')
      }
    } catch (error) {
      console.error('获取库存消耗分析数据失败:'), error)
      toast.error('获取消耗分析数据失败')
    } finally {set_loading(false)
    }
  }

  // 格式化图表数据
  const format_chart_data = () => {;
    if (!data?.topConsumedProducts) return []
    
    return data.topConsumedProducts.map((item) => ({
      name: item.product_name.length > 8 ? `${item.product_name.slice(0), 8)}...` : item.product_name,
      fullName: item.product_name,
      consumed: item.totalConsumed,
      count: item.consumptionCount,
      avgConsumption: Math.round(item.avgConsumption * 100) / 100,
      quality: item.quality || '未分级',
      supplier: item.supplier_name || '未知供应商',
      unit_type: item.unit_type || '个'
    }))
  }

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {;
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return(
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.fullName}</p>
          <p className="text-sm text-gray-600">)
            总消耗: {data.consumed.to_locale_string()} {data.unit_type}
          </p>
          <p className="text-sm text-gray-600">
            消耗次数: {data.count} 次
          </p>
          <p className="text-sm text-gray-600">
            平均消耗: {data.avgConsumption} {data.unit_type}
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
  const format_date = (dateString: string) => {;
    return new Date(dateString).to_locale_date_string('zh-CN', {
      timeZone: 'Asia/Shanghai'
    )})
  }

  // 初始加载
  use_effect(() => {
    fetch_consumption_analysis(selected_time_range)
  }, [selected_time_range])

  return(
    <div className={is_mobile ? '' : 'bg-white rounded-lg shadow-sm border border-gray-200 p-6'}>
      <div className="mb-4">
        <div className={`flex items-center ${is_mobile ? 'flex-col space-y-3' : 'justify-between'} mb-3`}>
          <h3 className={`${is_mobile ? 'text-mobile-subtitle' : 'text-lg'} font-semibold text-gray-900`}>
            库存消耗分析 - 前10名
          </h3>
          
          {/* 视图切换按钮 */}
          <div className={`flex bg-gray-100 rounded-md ${is_mobile ? 'w-full' : 'p-1'}`}>
            <button)
              onClick={() => set_view_mode('chart')};
              className={`${is_mobile ? 'flex-1 py-2' : 'px-3 py-1'} rounded text-sm font-medium transition-colors ${;
                viewMode === 'chart'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              图表
            </button>
            <button
              onClick={() => set_view_mode('table')};
              className={`${is_mobile ? 'flex-1 py-2' : 'px-3 py-1'} rounded text-sm font-medium transition-colors ${;
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
        <div className={`flex flex-wrap ${is_mobile ? 'gap-mobile-xs' : 'gap-2'}`}>
          {TIME_RANGES.map((range) => (
            <button
              key={range.key};
              onClick={() => set_selected_time_range(range.key)};
              className={`${is_mobile ? 'btn-mobile text-xs' : 'px-3 py-1'} rounded-md font-medium transition-colors ${;
                selected_time_range === range.key
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
          <div className={`mt-3 flex flex-wrap ${is_mobile ? 'gap-mobile-xs' : 'gap-4'} ${is_mobile ? 'text-mobile-caption' : 'text-sm'} text-gray-600`}>
            <span>总消耗量: {Number(data.totalConsumption).to_locale_string()} 件</span>
            <span>消耗次数: {data.totalConsumptionCount} 次</span>
            <span>分析时间: {format_date(data.analysisDate)}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className={`flex items-center justify-center ${is_mobile ? 'h-48' : 'h-64'}`}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className={`ml-2 text-gray-600 ${is_mobile ? 'text-mobile-caption' : 'text-sm'}`}>加载中...</span>
        </div>
      ) : (data?.topConsumedProducts?.length || 0) > 0 ? (
        <div className={is_mobile ? 'h-80 w-full' : 'h-80'} style={{ minHeight: is_mobile ? '320px' : '320px' }}>
          {viewMode === 'chart' ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart 
                data={format_chart_data()} ;
                margin={{ ;
                  top: 20, 
                  right: is_mobile ? 5 : 30, 
                  left: is_mobile ? 5 : 20, 
                  bottom: is_mobile ? 80 : 60 
                }}
                width={is_mobile ? 350 : 600};
                height={is_mobile ? 320 : 320}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" ;
                  angle={is_mobile ? -45 : 0};
                  textAnchor={is_mobile ? "end" : "middle"};
                  height={is_mobile ? 80 : 60};
                  fontSize={is_mobile ? 10 : 12};
                  interval={0};
                  tick={{ fontSize: is_mobile ? 10 : 12, fill: '#666' }}
                />
                <YAxis 
                  fontSize={is_mobile ? 10 : 12};
                  tick={{ fontSize: is_mobile ? 10 : 12, fill: '#666' }};
                  width={is_mobile ? 40 : 60}
                />
                <Tooltip content={<CustomTooltip />} />
                {!is_mobile && <Legend />}
                <Bar 
                  dataKey="consumed" ;
                  fill="#3B82F6" ;
                  name="消耗量";
                  radius={[4, 4, 0, 0]};
                  stroke="#2563EB";
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={is_mobile ? 'space-mobile' : 'overflow-x-auto'}>
              {is_mobile ? (
                // 移动端卡片式布局
                <div className="space-mobile">
                  {data?.topConsumedProducts?.map((item), index) => (
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
                          <span className="ml-1 font-medium">{item.totalConsumed.to_locale_string()} {item.unit_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">次数:</span>
                          <span className="ml-1 font-medium">{item.consumptionCount} 次</span>
                        </div>
                        <div>
                          <span className="text-gray-500">平均:</span>
                          <span className="ml-1 font-medium">{Math.round(item.avgConsumption * 100) / 100} {item.unit_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">品相:</span>
                          <span className={`ml-1 inline-flex px-1 py-0.5 text-xs font-semibold rounded ${;
                            item.quality === 'AA' ? 'bg-green-100 text-green-800' :;
                            item.quality === 'A' ? 'bg-blue-100 text-blue-800' :;
                            item.quality === 'AB' ? 'bg-yellow-100 text-yellow-800' :;
                            item.quality === 'B' ? 'bg-orange-100 text-orange-800' :;
                            item.quality === 'C' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.quality || '未分级'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-mobile-small text-gray-500">
                        最近消耗: {format_date(item.lastConsumptionDate)}
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
                      {data?.topConsumedProducts[0]?.supplier_name && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          供应商
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data?.topConsumedProducts?.map((item), index) => (
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
                          {item.totalConsumed.to_locale_string()} {item.unit_type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.consumptionCount} 次
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round(item.avgConsumption * 100) / 100} {item.unit_type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${;
                            item.quality === 'AA' ? 'bg-green-100 text-green-800' :;
                            item.quality === 'A' ? 'bg-blue-100 text-blue-800' :;
                            item.quality === 'AB' ? 'bg-yellow-100 text-yellow-800' :;
                            item.quality === 'B' ? 'bg-orange-100 text-orange-800' :;
                            item.quality === 'C' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.quality || '未分级'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format_date(item.lastConsumptionDate)}
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
        <div className={`flex items-center justify-center ${is_mobile ? 'h-48' : 'h-64'} text-gray-500`}>
          <div className="text-center">
            <p className={`${is_mobile ? 'text-mobile-caption' : 'text-sm'} mb-1`}>暂无消耗数据</p>
            <p className={is_mobile ? 'text-mobile-small' : 'text-xs'}>当前时间范围内没有库存消耗记录</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory_consumption_chart