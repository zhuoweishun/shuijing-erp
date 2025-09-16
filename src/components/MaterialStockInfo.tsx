import { Package, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'

// 原材料库存信息组件
interface MaterialStockInfoProps {
  material: {
    material_id: string
    material_name: string
    material_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL'
    material_code?: string
    original_quantity: number
    used_quantity: number
    remaining_quantity: number
    inventory_unit?: string
    usage_rate?: number
    remaining_rate?: number
    stock_status?: 'sufficient' | 'low' | 'out'
    min_stock_alert?: number
    material_date?: string
    supplier_name?: string
  }
  showDetails?: boolean
  className?: string
}

export default function MaterialStockInfo({ 
  material, 
  showDetails = true, 
  className = '' 
}: MaterialStockInfoProps) {
  // 计算库存指标
  const calculateUsageRate = (original: number, used: number) => {
    if (original <= 0) return 0
    return Math.round((used / original) * 100)
  }
  
  const calculateRemainingRate = (original: number, used: number) => {
    return 100 - calculateUsageRate(original, used)
  }
  
  const getStockStatus = (remaining: number, minAlert?: number) => {
    if (remaining <= 0) return 'out'
    if (minAlert && remaining <= minAlert) return 'low'
    return 'sufficient'
  }
  
  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'sufficient': return 'text-green-600'
      case 'low': return 'text-yellow-600'
      case 'out': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }
  
  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'sufficient': return '充足'
      case 'low': return '偏低'
      case 'out': return '缺货'
      default: return '未知'
    }
  }
  
  const usageRate = material.usage_rate ?? calculateUsageRate(material.original_quantity, material.used_quantity)
  const remainingRate = material.remaining_rate ?? calculateRemainingRate(material.original_quantity, material.used_quantity)
  const stockStatus = material.stock_status ?? getStockStatus(material.remaining_quantity, material.min_stock_alert)
  
  // 获取单位显示
  const getUnit = (material_type: string) => {
    switch (material_type) {
      case 'LOOSE_BEADS': return '颗'
      case 'BRACELET': return '颗'
      case 'ACCESSORIES': return '片'
      case 'FINISHED_MATERIAL': return '件'
      default: return '个'
    }
  }
  
  // 格式化数量显示
  const formatQuantity = (quantity: number) => {
    return `${quantity.toLocaleString()}${getUnit(material.material_type)}`
  }
  
  // 获取状态图标
  const getStatusIcon = () => {
    switch (stockStatus) {
      case 'sufficient':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'out':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }
  
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* 标题区域 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 text-sm">{material.material_name}</h3>
          {material.material_code && (
            <p className="text-xs text-gray-500 mt-1">{material.material_code}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-xs font-medium ${getStockStatusColor(stockStatus)}`}>
            {getStockStatusText(stockStatus)}
          </span>
        </div>
      </div>
      
      {/* 库存数量概览 */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {formatQuantity(material.original_quantity)}
          </div>
          <div className="text-xs text-gray-500">原始库存</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600">
            {formatQuantity(material.used_quantity)}
          </div>
          <div className="text-xs text-gray-500">已使用</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${getStockStatusColor(stockStatus)}`}>
            {formatQuantity(material.remaining_quantity)}
          </div>
          <div className="text-xs text-gray-500">剩余库存</div>
        </div>
      </div>
      
      {/* 使用率进度条 */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600">使用率</span>
          <span className="text-xs font-medium text-gray-900">{usageRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(usageRate, 100)}%` }}
          />
        </div>
      </div>
      
      {/* 剩余率进度条 */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600">剩余率</span>
          <span className="text-xs font-medium text-gray-900">{remainingRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              stockStatus === 'sufficient' ? 'bg-green-600' :
              stockStatus === 'low' ? 'bg-yellow-600' : 'bg-red-600'
            }`}
            style={{ width: `${Math.min(remainingRate, 100)}%` }}
          />
        </div>
      </div>
      
      {/* 详细信息 */}
      {showDetails && (
        <div className="border-t border-gray-100 pt-3 space-y-2">
          {/* 原材料类型 */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">原材料类型</span>
            <span className="text-xs font-medium text-gray-900">
              {material.material_type === 'LOOSE_BEADS' ? '散珠' :
               material.material_type === 'BRACELET' ? '手串' :
               material.material_type === 'ACCESSORIES' ? '配件' : '成品'}
            </span>
          </div>
          
          {/* 库存单位 */}
          {material.inventory_unit && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">库存单位</span>
              <span className="text-xs font-medium text-gray-900">{material.inventory_unit}</span>
            </div>
          )}
          
          {/* 最低库存预警 */}
          {material.min_stock_alert && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">预警阈值</span>
              <span className="text-xs font-medium text-gray-900">
                {formatQuantity(material.min_stock_alert)}
              </span>
            </div>
          )}
          
          {/* 供应商 */}
          {material.supplier_name && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">供应商</span>
              <span className="text-xs font-medium text-gray-900">{material.supplier_name}</span>
            </div>
          )}
          
          {/* 入库日期 */}
          {material.material_date && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">入库日期</span>
              <span className="text-xs font-medium text-gray-900">
                {new Date(material.material_date).toLocaleDateString('zh-CN')}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* 库存预警提示 */}
      {stockStatus === 'low' && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
            <span className="text-xs text-yellow-800">库存偏低，建议及时补货</span>
          </div>
        </div>
      )}
      
      {stockStatus === 'out' && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-xs text-red-800">库存不足，需要紧急补货</span>
          </div>
        </div>
      )}
    </div>
  )
}

// 简化版本的库存信息卡片
export function MaterialStockCard({ material, onClick }: {
  material: MaterialStockInfoProps['material']
  onClick?: () => void
}) {
  const getStockStatus = (remaining: number, minAlert?: number) => {
    if (remaining <= 0) return 'out'
    if (minAlert && remaining <= minAlert) return 'low'
    return 'sufficient'
  }
  
  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'sufficient': return '充足'
      case 'low': return '偏低'
      case 'out': return '缺货'
      default: return '未知'
    }
  }
  
  const getUnit = (material_type: string) => {
    switch (material_type) {
      case 'LOOSE_BEADS': return '颗'
      case 'BRACELET': return '颗'
      case 'ACCESSORIES': return '片'
      case 'FINISHED_MATERIAL': return '件'
      default: return '个'
    }
  }
  
  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'sufficient': return 'text-green-600'
      case 'low': return 'text-yellow-600'
      case 'out': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }
  
  const stockStatus = material.stock_status ?? getStockStatus(material.remaining_quantity, material.min_stock_alert)
  const formatQuantity = (quantity: number) => `${quantity.toLocaleString()}${getUnit(material.material_type)}`
  
  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm truncate">{material.material_name}</h4>
        <span className={`text-xs px-2 py-1 rounded-full ${
          stockStatus === 'sufficient' ? 'bg-green-100 text-green-800' :
          stockStatus === 'low' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {getStockStatusText(stockStatus)}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingDown className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">剩余</span>
        </div>
        <span className={`font-bold ${getStockStatusColor(stockStatus)}`}>
          {formatQuantity(material.remaining_quantity)}
        </span>
      </div>
      
      {material.material_code && (
        <div className="mt-2 text-xs text-gray-500">{material.material_code}</div>
      )}
    </div>
  )
}