import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  DollarSign, Package, RefreshCw
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { inventory_api } from '../services/api'
import { use_auth } from '../hooks/useAuth'
import { use_device_detection } from '../hooks/use_device_detection'

// 默认价格类型
const price_type = "sell_price";

// 产品类型映射
const PRODUCT_TYPE_MAP = {
  'LOOSE_BEADS': '散珠',
  'BRACELET': '手串', 
  'ACCESSORIES': '饰品配件',
  'FINISHED': '成品',
  'ALL': '全部类型'
}

// 品相映射
const QUALITY_MAP = {
  'AA': 'AA级',
  'A': 'A级',
  'AB': 'AB级',
  'B': 'B级',
  'C': 'C级'
}

// 图表颜色配置
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#84CC16']

// 价格分布数据类型
interface PriceDistributionData {
  material_type: string
  price_type: string
  priceLabel: string
  totalProducts: number
  // 单价区间分布数据
  price_ranges?: {
    name: string
    value: number
    percentage: string
  }[]
  // 总价分布数据
  avg_price?: number | null
  max_price?: number | null
  min_price?: number | null
  top_price_products?: {
    purchase_id: string
    product_name: string
    material_type: string
    bead_diameter?: number
    specification?: number
    quality?: string
    quantity?: number
    piece_count?: number
    total_beads?: number
    unit_price?: number
    total_price?: number
    price_per_bead?: number
    price_per_gram?: number
    weight?: number
    supplier_name?: string
    purchase_date: string
    remaining_beads?: number
    used_beads?: number
  }[]
  analysisDate: string
}

export default function ProductPriceDistributionChart() {
  const { user } = use_auth()
  const { is_mobile } = use_device_detection()
  const [loading, set_loading] = useState(true)
  const [data, setData] = useState<PriceDistributionData | null>(null)
  const [material_type, setMaterial_type] = useState<string>('LOOSE_BEADS')
  const [priceType, setPriceType] = useState<string>('unit_price')

  // 获取价格分布数据
  const fetchPriceDistribution = async () => {set_loading(true)
    try {
      const response = await inventory_api.get_price_distribution({
        material_type: material_type as 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED' | 'ALL',
        price_type: price_type as 'unit_price' | 'total_price',
      })
      
      console.log('🔍 [价格分布] API响应:', response)
      
      if (response.success && response.data) {
        console.log('🔍 [价格分布] 设置数据:', response.data)
        setData(response.data as PriceDistributionData)
      } else {
        console.error('🔍 [价格分布] API响应失败:', response)
        toast.error('获取价格分布数据失败')
      }
    } catch (error) {
      console.error('获取价格分布数据失败:', error)
      toast.error('获取价格分布数据失败')
    } finally {set_loading(false)
    }
  }

  // 页面加载和参数变化时获取数据
  useEffect(() => {
    fetchPriceDistribution()
  }, [material_type, priceType])

  // 格式化价格
  const format_price = (price: number | string | null | undefined) => {
    if (price === null || price === undefined) return '***'
    
    // 转换为数字类型
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    
    // 检查是否为有效数字
    if (isNaN(numPrice) || !isFinite(numPrice)) return '***'
    
    return `¥${numPrice.toFixed(2)}`
  }

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
      if (price_type === 'unit_price') {
        // 单价区间分布的tooltip
        return (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
            <p className="font-medium text-gray-900">{data.name}</p>
            <p className="text-sm text-gray-600">产品类型：{PRODUCT_TYPE_MAP[material_type as keyof typeof PRODUCT_TYPE_MAP]}</p>
            <p className="text-sm text-blue-600 font-medium">
              数量：{data.value}个产品
            </p>
            <p className="text-sm text-green-600">
              占比：{data.percentage}%
            </p>
          </div>
        )
      } else {
        // 总价分布的tooltip
        return (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
            <p className="font-medium text-gray-900">{data.product_name || data.name}</p>
            <p className="text-sm text-gray-600">类型：{PRODUCT_TYPE_MAP[data.material_type as keyof typeof PRODUCT_TYPE_MAP]}</p>
            {data.quality && (
              <p className="text-sm text-gray-600">品相：{QUALITY_MAP[data.quality as keyof typeof QUALITY_MAP]}</p>
            )}
            <p className="text-sm text-blue-600 font-medium">
              总价：{format_price(payload[0].value)}
            </p>
            {user?.role === 'BOSS' && data.supplier_name && (
              <p className="text-sm text-gray-600">供应商：{data.supplier_name}</p>
            )}
          </div>
        )
      }
    }
    return null
  }

  if (loading) {
    return (
      <div className={is_mobile ? 'p-mobile' : 'p-6'}>
        <div className={`flex items-center justify-center ${is_mobile ? 'py-8' : 'py-12'}`}>
          <div className={`flex items-center ${is_mobile ? 'space-x-2' : 'space-x-3'}`}>
            <RefreshCw className={`${is_mobile ? 'h-5 w-5' : 'h-6 w-6'} animate-spin text-blue-500`} />
            <span className={`text-gray-600 ${is_mobile ? 'text-mobile-caption' : ''}`}>加载价格分布数据中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!data || (price_type === 'unit_price' ? !data.price_ranges?.length : !data.top_price_products?.length)) {
    return (
      <div className={is_mobile ? 'p-mobile' : 'p-6'}>
        <div className={`flex items-center ${is_mobile ? 'flex-col space-y-3' : 'justify-between'} mb-6`}>
          <div className={`flex items-center ${is_mobile ? 'space-x-2' : 'space-x-3'}`}>
            <DollarSign className={`${is_mobile ? 'h-5 w-5' : 'h-6 w-6'} text-green-500`} />
            <h3 className={`${is_mobile ? 'text-mobile-subtitle' : 'text-lg'} font-semibold text-gray-900`}>
              {price_type === 'unit_price' ? '单价区间分布' : '总价分布 - 前10名'}
            </h3>
          </div>
          <button
            onClick={fetchPriceDistribution}
            className={is_mobile ? 'btn-mobile-primary w-full' : 'px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm'}
          >
            重新加载
          </button>
        </div>
        <div className={`flex flex-col items-center justify-center ${is_mobile ? 'py-8' : 'py-12'}`}>
          <Package className={`${is_mobile ? 'h-10 w-10' : 'h-12 w-12'} text-gray-400 mb-4`} />
          <h3 className={`${is_mobile ? 'text-mobile-subtitle' : 'text-lg'} font-medium text-gray-900 mb-2`}>暂无价格数据</h3>
          <p className={`text-gray-600 text-center max-w-md ${is_mobile ? 'text-mobile-body px-2' : ''}`}>
            当前筛选条件下没有找到价格数据，请尝试切换产品类型或价格维度。
          </p>
        </div>
      </div>
    )
  }

  // 准备图表数据
  const chartData = price_type === 'unit_price' 
    ? // 单价区间分布数据
      data.price_ranges?.map((item, index) => ({
        name: item.name,
        value: item.value,
        percentage: item.percentage,
        color: COLORS[index % COLORS.length]
      })) || []
    : // 总价分布数据
      data.top_price_products?.map((item, index) => {
        const rawValue = item.total_price
        const num_value = typeof rawValue === 'string' ? parseFloat(rawValue) : rawValue
        const value = (num_value && !isNaN(num_value) && isFinite(num_value)) ? num_value : 0
        
        return {
          ...item,
          name: item.product_name,
          value: value,
          color: COLORS[index % COLORS.length]
        }
      }) || []

  return (
    <div className={is_mobile ? 'p-mobile' : 'p-6'}>
      {/* 标题 */}
      <div className={`flex items-center ${is_mobile ? 'space-x-2' : 'space-x-3'} mb-6`}>
        <DollarSign className={`${is_mobile ? 'h-5 w-5' : 'h-6 w-6'} text-green-500`} />
        <h3 className={`${is_mobile ? 'text-mobile-subtitle' : 'text-lg'} font-semibold text-gray-900`}>
          {price_type === 'unit_price' ? '单价区间分布' : '总价分布 - 前10名'}
        </h3>
      </div>

      {/* 产品类型和价格维度切换 */}
      <div className="mb-4">
        <div className={`flex flex-wrap ${is_mobile ? 'gap-mobile-xs' : 'gap-2'} items-center`}>
          {/* 产品类型按钮 */}
          {Object.entries(PRODUCT_TYPE_MAP).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMaterial_type(key)}
              className={`${is_mobile ? 'btn-mobile text-xs' : 'px-3 py-1'} rounded-md font-medium transition-colors ${
                material_type === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          
          {/* 分隔线 */}
          {!is_mobile && <div className="h-6 w-px bg-gray-300 mx-2"></div>}
          
          {/* 价格维度按钮 */}
          <button
            onClick={() => setPriceType('unit_price')}
            className={`${is_mobile ? 'btn-mobile text-xs' : 'px-3 py-1'} rounded-md font-medium transition-colors ${
              price_type === 'unit_price'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            单价分布
          </button>
          <button
            onClick={() => setPriceType('total_price')}
            className={`${is_mobile ? 'btn-mobile text-xs' : 'px-3 py-1'} rounded-md font-medium transition-colors ${
              price_type === 'total_price'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            总价分布
          </button>
        </div>
      </div>

      {/* 价格分布饼图 */}
      <div className={is_mobile ? 'h-64 w-full' : 'h-64'} style={{ minHeight: is_mobile ? '256px' : '256px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <PieChart width={is_mobile ? 300 : 400} height={is_mobile ? 256 : 256}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={is_mobile ? false : ({ name, value, percent }) => 
                priceType === 'unit_price' 
                  ? `${name}: ${value}个 (${((percent || 0) * 100).toFixed(1)}%)`
                  : `${name}: ${format_price(value)} (${((percent || 0) * 100).toFixed(1)}%)`
              }
              outerRadius={is_mobile ? 70 : 80}
              innerRadius={is_mobile ? 20 : 0}
              fill="#8884d8"
              dataKey="value"
              stroke="#fff"
              strokeWidth={2}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}