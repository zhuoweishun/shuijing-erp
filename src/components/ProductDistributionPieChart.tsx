import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { inventory_api } from '../services/api'
import { useDeviceDetection } from '../hooks/useDeviceDetection'

// 原材料类型配置
const MATERIAL_TYPES = [
  { key: 'LOOSE_BEADS', label: '散珠', color: '#3B82F6' },
  { key: 'BRACELET', label: '手串', color: '#10B981' },
  { key: 'ACCESSORIES', label: '饰品配件', color: '#F59E0B' },
  { key: 'FINISHED_MATERIAL', label: '成品', color: '#EF4444' }
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
  [key: string]: any // 添加索引签名以兼容recharts
}

const Material_distribution_pie_chart: React.FC = () => {
  const { is_mobile } = useDeviceDetection()
  const [selected_type, set_selected_type] = useState<MaterialType>('LOOSE_BEADS')
  const [loading, set_loading] = useState(false)
  const [chart_data, set_chart_data] = useState<ChartDataItem[]>([])

  // 获取原材料分布数据
  const fetch_material_distribution = async (material_type: MaterialType) => {
    console.log('🔄 [原材料分布] 开始获取数据:', material_type)
    set_loading(true)
    try {
      const response = await inventory_api.get_material_distribution({
        purchase_type: material_type, // 后端使用purchase_type参数
        limit: 10 // 仪表盘中显示前10名即可
      })
      
      console.log('📊 [原材料分布] API响应:', response)
      
      if (response.success && response.data && (response.data as any).items) {
        // 转换为图表数据格式
        const chart_items: ChartDataItem[] = (response.data as any).items.map((item: any, index: number) => {
          // 优先使用映射后的material字段，向后兼容purchase字段，如果都没有则使用当前选中的类型
          const materialType = item.material_type || item.purchase_type || material_type
          const materialName = item.material_name || item.purchase_name || item.name || '未知产品'
          
          console.log('🔄 [数据转换] item:', item, 'materialType:', materialType, 'selected_type:', material_type)
          
          return {
            name: materialName, // 使用映射后的material_name字段
            value: Number(item.value) || Number(item.total_remaining_quantity) || 0, // 优先使用后端返回的value字段
            percentage: Number(item.percentage) || 0, // 使用后端计算的百分比
            color: generate_color(index),
            material_type: materialType // 保留类型信息，确保有值
          }
        })
        
        // 如果后端没有返回百分比，前端计算
        const has_backend_percentage = chart_items.some(item => item.percentage > 0)
        if (!has_backend_percentage) {
          const total_value = chart_items.reduce((sum, item) => sum + item.value, 0)
          chart_items.forEach(item => {
            item.percentage = total_value > 0 ? (item.value / total_value) * 100 : 0
          })
        }
        
        set_chart_data(chart_items)
      } else {
        console.error('获取原材料分布数据失败:', response)
        set_chart_data([])
      }
    } catch (error) {
      console.error('获取原材料分布数据失败:', error)
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
  const generate_color = (index: number): string => {
    // 使用预定义颜色数组，确保每个产品都有不同的颜色
    return CHART_COLORS[index % CHART_COLORS.length]
  }

  // 获取单位显示
  const get_unit = (material_type: string): string => {
    switch (material_type) {
      case 'LOOSE_BEADS': return '颗'
      case 'BRACELET': return '颗'
      case 'ACCESSORIES': return '片'
      case 'FINISHED_MATERIAL': return '件'
      default: return '个'
    }
  }

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      // 优先使用数据中的material_type，如果没有则使用当前选中的类型
      const material_type = data.material_type || selected_type
      const unit = get_unit(material_type)
      console.log('🔍 [Tooltip] material_type:', material_type, 'unit:', unit, 'data:', data)
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            数量: {data.value.toLocaleString()} {unit}
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

  return (
    <div className={is_mobile ? '' : 'bg-white rounded-lg shadow-sm border border-gray-200 p-6'}>
      <div className={is_mobile ? '' : ''}>
        <div className="mb-4">
          <h3 className={`${is_mobile ? 'text-mobile-subtitle' : 'text-lg'} font-semibold text-gray-900 mb-3`}>
            原材料库存分布 - 前10名
          </h3>
          
          {/* 原材料类型切换按钮 */}
          <div className={`flex flex-wrap ${is_mobile ? 'gap-mobile-xs' : 'gap-2'}`}>
            {MATERIAL_TYPES.map((type) => (
              <button
                key={type.key}
                onClick={() => set_selected_type(type.key)}
                className={`${is_mobile ? 'btn-mobile text-xs' : 'px-3 py-1'} rounded-md font-medium transition-colors ${
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
                  data={chart_data}
                  cx="50%"
                  cy="50%"
                  outerRadius={is_mobile ? 70 : 80}
                  innerRadius={is_mobile ? 20 : 0}
                  fill="#8884d8"
                  dataKey="value"
                  label={is_mobile ? false : ({ payload }: any) => `${(payload as ChartDataItem).percentage.toFixed(1)}%`}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {chart_data.map((item, index) => (
                    <Cell key={`cell-${index}`} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                {!is_mobile && (
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    formatter={(value) => (
                      <span className="text-xs text-gray-700">
                        {value.length > 8 ? `${value.slice(0, 8)}...` : value}
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