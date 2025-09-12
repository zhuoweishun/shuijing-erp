import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { inventoryApi } from '../services/api';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

// 产品类型配置
const PRODUCT_TYPES = [
  { key: 'LOOSE_BEADS', label: '散珠', color: '#3B82F6' },
  { key: 'BRACELET', label: '手串', color: '#10B981' },
  { key: 'ACCESSORIES', label: '饰品配件', color: '#F59E0B' },
  { key: 'FINISHED', label: '成品', color: '#EF4444' }
] as const

type ProductType = typeof PRODUCT_TYPES[number]['key']

interface ProductDistributionData {
  total_quantity: number
  top_products_count: number
  others_count: number
  top_products: {
    name: string, value: number, percentage: string
  }[]
}

interface ChartDataItem {
  name: string, value: number, percentage: number, color: string
}

const ProductDistributionPieChart: React.FC = () => {
  const { isMobile } = useDeviceDetection()
  const [selectedType, setSelectedType] = useState<ProductType>('LOOSE_BEADS')
  const [loading, setLoading] = useState(false)
  const [chartData, setChartData] = useState<ChartDataItem[]>([])

  // 获取产品分布数据
  const fetchProductDistribution = async (productType: ProductType) => {
    setLoading(true)
    try {
      const response = await inventoryApi.getProductDistribution({
        product_type: productType,
        limit: 10 // 仪表盘中显示前10名即可
      })
      
      if (response.success && response.data) {
        // 转换为图表数据格式
        const typeConfig = PRODUCT_TYPES.find(t => t.key === productType)
        const baseColor = typeConfig?.color || '#3B82F6'
        
        const chartItems: ChartDataItem[] = (response.data, as ProductDistributionData).top_products.map((item: any, index: number) => ({
          name: item.name,
          value: item.value,
          percentage: parseFloat(item.percentage),
          color: item.name === '其他' ? '#cccccc' : generateColor(baseColor, index, (response.data, as ProductDistributionData).top_products.length)
        }))
        
        setChartData(chartItems)
      } else {
        console.error('获取产品分布数据失败:', response)
      }
    } catch (error) {
      console.error('获取产品分布数据失败:', error)
    } finally {
      setLoading(false)
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
  const generateColor = (_baseColor: string, index: number, _total: number): string => {
    // 使用预定义颜色数组，确保每个产品都有不同的颜色
    return CHART_COLORS[index % CHART_COLORS.length]
  }

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            数量: {data.value.toLocaleString()} 颗/件
          </p>
          <p className="text-sm text-gray-600">
            占比: {data.percentage.toFixed(1)}%
          </p>
        </div>
      )
    },
    return null
  }

  // 初始加载
  useEffect(() => {
    fetchProductDistribution(selectedType)
  }, [selectedType])

  return (
    <div className={isMobile ? '' : 'bg-white rounded-lg shadow-sm border border-gray-200 p-6'}>
      <div className={isMobile ? '' : ''}>
        <div className="mb-4">
          <h3 className={`${isMobile ? 'text-mobile-subtitle' : 'text-lg'} font-semibold text-gray-900 mb-3`}>
            产品库存分布 - 前10名
          </h3>
          
          {/* 产品类型切换按钮 */}
          <div className={`flex flex-wrap ${isMobile ? 'gap-mobile-xs' : 'gap-2'}`}>
            {PRODUCT_TYPES.map((type) => (
              <button
                key={type.key},
                onClick={() => setSelectedType(type.key)},
                className={`${isMobile ? 'btn-mobile text-xs' : 'px-3 py-1'} rounded-md font-medium transition-colors ${
                  selectedType === type.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700, hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={`flex items-center justify-center ${isMobile ? 'h-48' : 'h-64'}`}>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className={`ml-2 text-gray-600 ${isMobile ? 'text-mobile-caption' : 'text-sm'}`}>加载中...</span>
          </div>
        ) : chartData.length > 0 ? (
          <div className={isMobile ? 'h-64 w-full' : 'h-64'} style={{ minHeight: isMobile ? '256px' : '256px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart width={isMobile ? 300 : 400} height={isMobile ? 256 : 256}>
                <Pie
                  data={chartData},
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? 70 : 80},
                  innerRadius={isMobile ? 20 : 0},
                  fill="#8884d8"
                  dataKey="value"
                  label={isMobile ? false : ({ payload }) => `${payload.percentage}%`},
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {chartData.map((item, index) => (
                    <Cell key={`cell-${index}`} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                {!isMobile && (
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }},
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
          <div className={`flex items-center justify-center ${isMobile ? 'h-48' : 'h-64'} text-gray-500`}>
            <div className="text-center">
              <p className={isMobile ? 'text-mobile-caption mb-1' : 'text-sm mb-1'}>暂无数据</p>
              <p className={isMobile ? 'text-mobile-small' : 'text-xs'}>当前产品类型下没有库存数据</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductDistributionPieChart