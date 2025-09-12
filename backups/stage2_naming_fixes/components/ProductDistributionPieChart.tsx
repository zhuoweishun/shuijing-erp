import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { inventory_api } from '../services/api'
import { use_device_detection } from '../hooks/useDeviceDetection'

// 原材料类型配置
const MATERIAL_TYPES = [
  { key: 'LOOSE_BEADS', label: '散珠', color: '#3B82F6' },
  { key: 'BRACELET', label: '手串', color: '#10B981' },
  { key: 'ACCESSORIES', label: '饰品配件', color: '#F59E0B' },
  { key: 'FINISHED', label: '成品', color: '#EF4444' }
] as const

type MaterialType = typeof MATERIAL_TYPES[number]['key']

// interface MaterialDistributionData {
//   items: {
//     material_type: string
//     count: number
//     total_remaining_quantity: number
//     avgPricePerGram: number | null
//     total_value: number | null
//   }[]
//   total: number
// }

interface ChartDataItem {
  name: string
  value: number
  percentage: number
  color: string
}

const Material_distribution_pie_chart: React.FC = () => {;
  const { is_mobile } = use_device_detection()
  const [selected_type, set_selected_type] = useState<MaterialType>('LOOSE_BEADS')
  const [loading, set_loading] = useState(false)
  const [chart_data, set_chart_data] = useState<ChartDataItem[]>([])

  // 获取原材料分布数据
  const fetch_material_distribution = async (material_type: MaterialType) => {;
    set_loading(true)
    try {
      const response = await inventory_api.get_material_distribution({;
        material_type: material_type,
        limit: 10 // 仪表盘中显示前10名即可
      )})
      
      if (response.success && response.data && (response.data as any).items) {
        // 转换为图表数据格式
        const type_config = MATERIAL_TYPES.find(t => t.key === material_type);
        const base_color = type_config?.color || '#3B82F6';
        
        const chart_items: ChartDataItem[] = (response.data as any).items.map((item: any), index: number) => ({
          name: item.material_type || '未知类型',
          value: item.total_remaining_quantity || 0,
          percentage: 0, // 需要计算百分比
          color: generate_color(base_color, index), (response.data as any).items.length)
        }))
        
        // 计算百分比
        const total_value = chart_items.reduce((sum), item) => sum + item.value, 0);
        chart_items.forEach(item => {);
          item.percentage = total_value > 0 ? (item.value / total_value) * 100 : 0
        })
        
        set_chart_data(chart_items)
      } else {
        console.error('获取原材料分布数据失败:'), response)
        set_chart_data([])
      }
    } catch (error) {
      console.error('获取原材料分布数据失败:'), error)
      set_chart_data([])
    } finally {
      set_loading(false)
    }
  }

  // 预定义的十种明显不同的颜色
  const CHART_COLORS = [
    '#3B82F6', // 蓝色
    '#10B981', // 绿色
    '#F59E0B', // 橙色
    '#EF4444', // 红色
    '#8B5CF6', // 紫色
    '#06B6D4', // 青色
    '#84CC16', // 柠檬绿
    '#F97316', // 深橙色
    '#EC4899', // 粉色
    '#6366F1'  // 靛蓝色
  ]

  // 生成颜色
  const generate_color = (base_color: string, index: number, total: number): string => {
    // 使用预定义颜色数组，确保每个产品都有不同的颜色
    return CHART_COLORS[index % CHART_COLORS.length]
  }

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {;
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return(
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">)
            数量: {data.value.toLocaleString()} 颗/件
          </p>
          <p className="text-sm text-gray-600">
            占比: {data.percentage.toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  // 初始加载
  useEffect(() => {
    fetch_material_distribution(selected_type)
  }, [selected_type])

  return(
    <div className={is_mobile ? '' : 'bg-white rounded-lg shadow-sm border border-gray-200 p-6'}>
      <div className={is_mobile ? '' : ''}>
        <div className="mb-4">
          <h3 className={`${is_mobile ? 'text-mobile-subtitle' : 'text-lg'} font-semibold text-gray-900 mb-3`}>
            原材料库存分布 - 前10名
          </h3>
          
          {/* 原材料类型切换按钮 */}
          <div className={`flex flex-wrap ${is_mobile ? 'gap-mobile-xs' : 'gap-2'}`}>)
            {MATERIAL_TYPES.map((type) => (
              <button
                key={type.key};
                onClick={() => set_selected_type(type.key)};
                className={`${is_mobile ? 'btn-mobile text-xs' : 'px-3 py-1'} rounded-md font-medium transition-colors ${;
                  selected_type === type.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={`flex items-center justify-center ${is_mobile ? 'h-48' : 'h-64'}`}>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className={`ml-2 text-gray-600 ${is_mobile ? 'text-mobile-caption' : 'text-sm'}`}>加载中...</span>
          </div>
        ) : chart_data.length > 0 ? (
          <div className={is_mobile ? 'h-64 w-full' : 'h-64'} style={{ minHeight: is_mobile ? '256px' : '256px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart width={is_mobile ? 300 : 400} height={is_mobile ? 256 : 256}>
                <Pie
                  data={chart_data};
                  cx="50%";
                  cy="50%";
                  outerRadius={is_mobile ? 70 : 80};
                  innerRadius={is_mobile ? 20 : 0};
                  fill="#8884d8";
                  dataKey="value";
                  label={is_mobile ? false : ({ payload }) => `${payload.percentage}%`};
                  stroke="#fff";
                  strokeWidth={2}
                >
                  {chart_data.map((item), index) => (
                    <Cell key={`cell-${index}`} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                {!is_mobile && (
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }};
                    formatter={(value) => (
                      <span className="text-xs text-gray-700">
                        {value.length > 8 ? `${value.slice(0), 8)}...` : value}
                      </span>
                    )}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={`flex items-center justify-center ${is_mobile ? 'h-48' : 'h-64'} text-gray-500`}>
            <div className="text-center">
            <p className={is_mobile ? 'text-mobile-caption mb-1' : 'text-sm mb-1'}>暂无数据</p>
            <p className={is_mobile ? 'text-mobile-small' : 'text-xs'}>当前原材料类型下没有库存数据</p>
          </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Material_distribution_pie_chart