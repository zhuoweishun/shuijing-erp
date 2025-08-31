import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { inventoryApi } from '../services/api'
import { toast } from 'sonner'

// 产品类型配置
const PRODUCT_TYPES = [
  { key: 'LOOSE_BEADS', label: '散珠', color: '#8884d8' },
  { key: 'BRACELET', label: '手串', color: '#82ca9d' },
  { key: 'ACCESSORIES', label: '饰品配件', color: '#ffc658' },
  { key: 'FINISHED', label: '成品', color: '#ff7300' }
] as const

type ProductType = typeof PRODUCT_TYPES[number]['key']

interface ProductDistributionItem {
  product_name: string
  product_type: string
  total_quantity: number
  percentage: number
}

interface ProductDistributionData {
  top_products: ProductDistributionItem[]
  others?: {
    total_quantity: number
    percentage: number
  }
}

interface ChartDataItem {
  name: string
  value: number
  percentage: number
  color: string
}

const InventoryPieChart: React.FC = () => {
  const [selectedType, setSelectedType] = useState<ProductType>('LOOSE_BEADS')
  const [data, setData] = useState<ProductDistributionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [chartData, setChartData] = useState<ChartDataItem[]>([])

  // 获取产品分布数据
  const fetchProductDistribution = async (productType: ProductType) => {
    setLoading(true)
    try {
      const response = await inventoryApi.getProductDistribution({
        product_type: productType,
        limit: 20
      })
      
      if (response.success && response.data) {
        setData(response.data as ProductDistributionData)
        
        // 转换为图表数据格式
        const typeConfig = PRODUCT_TYPES.find(t => t.key === productType)
        const baseColor = typeConfig?.color || '#8884d8'
        
        const responseData = response.data as ProductDistributionData
        const chartItems: ChartDataItem[] = responseData.top_products.map((item: any, index: number) => ({
          name: item.product_name,
          value: item.total_quantity,
          percentage: item.percentage,
          color: generateColor(baseColor, index, responseData.top_products.length)
        }))
        
        // 添加"其他"分类
        if (responseData.others && responseData.others.total_quantity > 0) {
          chartItems.push({
            name: '其他',
            value: responseData.others.total_quantity,
            percentage: responseData.others.percentage,
            color: '#cccccc'
          })
        }
        
        setChartData(chartItems)
      } else {
        toast.error('获取产品分布数据失败')
      }
    } catch (error) {
      console.error('获取产品分布数据失败:', error)
      toast.error('获取产品分布数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 生成渐变色
  const generateColor = (baseColor: string, index: number, total: number): string => {
    // 简单的颜色变化算法
    const hue = parseInt(baseColor.slice(1), 16)
    const variation = Math.floor((index / total) * 60) // 色相变化范围
    const newHue = (hue + variation) % 0xffffff
    return `#${newHue.toString(16).padStart(6, '0')}`
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
    }
    return null
  }

  // 自定义Legend
  const CustomLegend = ({ payload }: any) => {
    if (!payload || payload.length === 0) return null
    
    return (
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700 max-w-20 truncate" title={entry.value}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // 初始加载
  useEffect(() => {
    fetchProductDistribution(selectedType)
  }, [selectedType])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          库存分布情况 - 前20名产品
        </h3>
        
        {/* 产品类型切换按钮 */}
        <div className="flex flex-wrap gap-2">
          {PRODUCT_TYPES.map((type) => (
            <button
              key={type.key}
              onClick={() => setSelectedType(type.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedType === type.key
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
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      ) : chartData.length > 0 ? (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((item, index) => (
                  <Cell key={`cell-${index}`} fill={item.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">暂无数据</p>
            <p className="text-sm">当前产品类型下没有库存数据</p>
          </div>
        </div>
      )}
      
      {/* 数据统计信息 */}
      {data && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">显示产品数:</span>
              <span className="ml-2 font-medium">{data.top_products.length}</span>
            </div>
            <div>
              <span className="text-gray-600">总数量:</span>
              <span className="ml-2 font-medium">
                {(data.top_products.reduce((sum, item) => sum + item.total_quantity, 0) + 
                  (data.others?.total_quantity || 0)).toLocaleString()} 颗/件
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryPieChart