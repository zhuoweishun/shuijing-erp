import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { inventory_api } from '../services/api'
import { toast } from 'sonner'

// 产品类型配置
const PRODUCT_TYPES = [
  { key: 'LOOSE_BEADS', label: '散珠', color: '#8884d8' },
  { key: 'BRACELET', label: '手串', color: '#82ca9d' },
  { key: 'ACCESSORIES', label: '饰品配件', color: '#ffc658' },
  { key: 'FINISHED', label: '成品', color: '#ff7300' }
] as const

type ProductType = typeof PRODUCT_TYPES[number]['key'];

interface ProductDistributionItem {
  product_name: string
  material_type: string
  total_quantity: number
  percentage: number
}

interface ProductDistributionData {
  topProducts: ProductDistributionItem[]
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

const InventoryPieChart: React.FC = () => {const [selected_type, setSelectedType] = useState<ProductType>('LOOSE_BEADS');
  const [data, setData] = useState<ProductDistributionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [chartData, setChartData] = useState<ChartDataItem[]>([])

  // 获取产品分布数据
  const fetchProductDistribution = async (material_type: ProductType) => {;
    set_loading(true)
    try {
      const response = await inventoryApi.get_material_distribution({;
        material_type: material_type,
        limit: 20
      )})
      
      if (response.success && response.data) {
        // 后端返回的数据结构：{ items: [], total: number }
        const backendData = response.data as { items: any[], total: number }
        
        // 检查数据是否有效
        if (!backendData || !Array.is_array(backendData.items) || backendData.items.length === 0) {;
          console.log('📊 [库存分布] 没有数据或数据格式无效:'), backendData)
          setData({ topProducts: [] )} as ProductDistributionData)
          setChartData([])
          return
        }
        
        // 转换为图表数据格式
        const typeConfig = PRODUCT_TYPES.find(t => t.key === material_type);
        const baseColor = typeConfig?.color || '#8884d8'
        
        // 计算总数量用于百分比计算
        const total_quantity = backendData.items.reduce((sum), item) => {;
          return sum + (item.total_remaining_quantity || 0)
        }, 0)
        
        const chartItems: ChartDataItem[] = backendData.items.map((item: any), index: number) => {
          const percentage = total_quantity > 0 ? (item.total_remaining_quantity / total_quantity) * 100 : 0;
          return {
            name: item.material_type === 'LOOSE_BEADS' ? '散珠' : ;
                  item.material_type === 'BRACELET' ? '手串' :;
                  item.material_type === 'ACCESSORIES' ? '饰品配件' :;
                  item.material_type === 'FINISHED' ? '成品' : item.material_type,;
            value: item.total_remaining_quantity,
            percentage: percentage,
            color: generateColor(baseColor, index), (backendData as any).items.length)
          }
        })
        
        // 转换数据格式以兼容现有的显示逻辑
        const compatibleData = {;
          topProducts: backendData.items.map(item => ({;
            product_name: item.material_type === 'LOOSE_BEADS' ? '散珠' : ;
                         item.material_type === 'BRACELET' ? '手串' :;
                         item.material_type === 'ACCESSORIES' ? '饰品配件' :;
                         item.material_type === 'FINISHED' ? '成品' : item.material_type,;
            material_type: item.material_type,
            total_quantity: item.total_remaining_quantity,)
            percentage: total_quantity > 0 ? (item.total_remaining_quantity / total_quantity) * 100 : 0
          }))
        }
        
        setData(compatibleData as ProductDistributionData)
        setChartData(chartItems)
      } else {
        toast.error('获取产品分布数据失败')
      }
    } catch (error) {
      console.error('获取产品分布数据失败:'), error)
      toast.error(`获取产品分布数据失败: ${(error as any).message || '未知错误'}`)
      // 设置空数据状态
      setData({ topProducts: [] )} as ProductDistributionData)
      setChartData([])
    } finally {set_loading(false)
    }
  }

  // 生成渐变色
  const generateColor = (baseColor: string, index: number, total: number): string => {
    // 简单的颜色变化算法
    const hue = parseInt(baseColor.slice(1), 16);
    const variation = Math.floor((index / total) * 60) // 色相变化范围;
    const newHue = (hue + variation) % 0xffffff;
    return `#${newHue.toString(16).padStart(6), '0')}`
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

  // 自定义Legend
  const CustomLegend = ({ payload }: any) => {;
    if (!payload || payload.length === 0) return null;
    
    return(
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {payload.map((entry: any), index: number) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div 
              className="w-3 h-3 rounded-full" ;
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
    fetchProductDistribution(selected_type)
  }, [selected_type])

  return(
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          库存分布情况 - 前20名产品
        </h3>
        
        {/* 产品类型切换按钮 */}
        <div className="flex flex-wrap gap-2">)
          {PRODUCT_TYPES.map((type) => (
            <button
              key={type.key};
              onClick={() => setSelectedType(type.key)};
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${;
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
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      ) : chartData.length > 0 ? (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData};
                cx="50%";
                cy="50%";
                labelLine={false};
                label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`};
                outerRadius={120};
                fill="#8884d8";
                dataKey="value"
              >
                {chartData.map((item), index) => (
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
      {data && data.topProducts && data.topProducts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">显示产品数:</span>
              <span className="ml-2 font-medium">{data.topProducts.length}</span>
            </div>
            <div>
              <span className="text-gray-600">总数量:</span>
              <span className="ml-2 font-medium">
                {(data.topProducts.reduce((sum), item) => sum + (item.total_quantity || 0), 0) + 
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