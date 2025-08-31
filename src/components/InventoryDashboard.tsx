import { useState, useEffect } from 'react'
import {
  Package, AlertTriangle, RefreshCw, BarChart3
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { inventoryApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import ProductDistributionPieChart from './ProductDistributionPieChart'
import InventoryConsumptionChart from './InventoryConsumptionChart'
import ProductPriceDistributionChart from './ProductPriceDistributionChart'

// 统计数据类型定义
interface InventoryStatistics {
  total_stats?: {
    total_items: number
    total_quantity: number
    total_low_stock: number
    total_value?: number
  }
  totalStats?: {
    totalItems: number
    totalQuantity: number
    totalLowStock?: number
    totalValue?: number
  }
  type_statistics?: {
    product_type: string
    total_items: number
    total_quantity: number
    low_stock_count: number
    total_value?: number
    avg_unit_price?: number
  }[]
  typeStatistics?: {
    productType: string
    totalItems: number
    totalQuantity: number
    lowStockCount?: number
    totalValue?: number
    avgUnitPrice?: number
  }[]
  low_stock_items: {
    purchase_id: string
    product_name: string
    product_type: string
    quality?: string
    remaining_quantity: number
    min_stock_alert: number
    supplier_name?: string
  }[]
  quality_distribution: {
    quality: string
    count: number
    total_quantity: number
  }[]
  supplier_distribution: {
    supplier_name: string
    total_items: number
    total_quantity: number
    total_value?: number
  }[]
  price_distribution?: {
    price_range: string
    count: number
    avg_price: number
  }[]
}



export default function InventoryDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState<InventoryStatistics | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // 获取统计数据
  const fetchStatistics = async () => {
    try {
      setLoading(true)
      const response = await inventoryApi.getStatistics()
      
      if (response.success) {
        setStatistics(response.data as InventoryStatistics)
        console.log('📊 [库存仪表盘] 统计数据获取成功:', response.data)
      } else {
        toast.error('获取统计数据失败')
      }
    } catch (error: any) {
      console.error('❌ [库存仪表盘] 获取统计数据失败:', error)
      // 安全地访问错误信息
      const errorMessage = error?.response?.data?.message || error?.message || '获取统计数据失败'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStatistics()
    setRefreshing(false)
    toast.success('数据已刷新')
  }

  // 页面加载时获取数据
  useEffect(() => {
    fetchStatistics()
  }, [])



  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-gray-600">加载统计数据中...</span>
        </div>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无统计数据</h3>
        <p className="text-gray-600 text-center max-w-md mb-4">
          无法获取库存统计数据，请检查网络连接或稍后重试。
        </p>
        <button
          onClick={fetchStatistics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重新加载
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">库存仪表盘</h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? '刷新中...' : '刷新数据'}</span>
        </button>
      </div>



      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 产品价格分布 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <ProductPriceDistributionChart />
        </div>
        
        {/* 产品分布饼图 */}
        <ProductDistributionPieChart />
      </div>

      {/* 库存消耗分析 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <InventoryConsumptionChart />
      </div>



      {/* 其他图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 品相等级分布 - 暂时隐藏，等待后端支持 */}
        {false && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">品相等级分布</h3>
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>暂无数据</p>
            </div>
          </div>
        )}

        {/* 供应商库存分布 - 暂时隐藏，等待后端支持 */}
        {false && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">供应商库存分布（前10名）</h3>
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>暂无数据</p>
            </div>
          </div>
        )}

        {/* 价格分布（仅BOSS可见） - 暂时隐藏，等待后端支持 */}
        {false && user?.role === 'BOSS' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">单颗珠子价格分布</h3>
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>暂无数据</p>
            </div>
          </div>
        )}
      </div>

      {/* 低库存预警列表 - 暂时隐藏，等待后端支持 */}
      {false && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">低库存预警</h3>
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                0项
              </span>
            </div>
          </div>
          <div className="p-6 text-center text-gray-500">
            <p>暂无低库存预警数据</p>
          </div>
        </div>
      )}
    </div>
  )
}