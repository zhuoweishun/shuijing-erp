import React, { useState, useEffect } from 'react'
import { Package, AlertTriangle, TrendingDown, RotateCcw } from 'lucide-react'
import { financial_api } from '../services/api'
import { InventoryStatusData, STALE_PERIOD_LABELS } from '../types/financial'
import { format_amount } from '../utils/format'

interface InventoryStatusState {
  data: InventoryStatusData | null;
  loading: boolean;
  error: string | null;
}

interface InventoryStatusProps {
  className?: string;
}

const inventory_status: React.FC<InventoryStatusProps> = ({ className = '' }) => {
  const [state, setState] = useState<InventoryStatusState>({
    data: null,
    loading: false,
    error: null
  })
  
  const [stale_period, set_stale_period] = useState<'1' | '3' | '6'>('1')

  // 获取库存状况数据
  const fetch_inventory_status = async (period: '1' | '3' | '6' = stale_period) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const response = await financial_api.get_inventory_status({ stale_period: period })
      
      if (response.success) {
        setState(prev => ({ 
          ...prev, 
          data: response.data as InventoryStatusData,
          error: null 
        }))
      } else {
        setState(prev => ({ 
          ...prev, 
          error: response.message || '获取库存状况失败' 
        }))
      }
    } catch (error) {
      console.error('获取库存状况失败:', error)
      setState(prev => ({ 
        ...prev, 
        error: '获取库存状况失败' 
      }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  // 切换滞销时间
  const handle_period_change = (period: '1' | '3' | '6') => {
    set_stale_period(period)
    fetch_inventory_status(period)
  }

  useEffect(() => {
    fetch_inventory_status()
  }, [])

  const { data, loading, error } = state

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
        <button 
          onClick={() => fetch_inventory_status()}
          className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg p-6 border border-indigo-200 ${className}`}>
      {/* 标题和控制区域 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
          <Package className="h-5 w-5 mr-2" />
          库存状况
        </h3>
        
        {/* 滞销时间切换按钮 */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-indigo-600">滞销筛选:</span>
          <div className="flex bg-white rounded-md border border-indigo-200">
            {(['1', '3', '6'] as const).map((period) => (
              <button
                key={period}
                onClick={() => handle_period_change(period)}
                disabled={loading}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  stale_period === period
                    ? 'bg-indigo-500 text-white'
                    : 'text-indigo-600 hover:bg-indigo-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {period}个月
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => fetch_inventory_status()}
            disabled={loading}
            className="p-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="刷新数据"
          >
            <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-6">
          <Package className="mx-auto h-6 w-6 text-indigo-400 mb-2" />
          <p className="text-sm text-indigo-600">加载库存数据中...</p>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* 当前筛选条件显示 */}
          <div className="text-xs text-indigo-600 bg-white bg-opacity-50 rounded px-2 py-1 inline-block">
            {STALE_PERIOD_LABELS[stale_period]} | 截止日期: {data?.stale_threshold_date || '未知'}
          </div>
          
          {/* 原材料库存成本 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-indigo-600 flex items-center">
                <Package className="h-4 w-4 mr-1" />
                剩余库存原材料成本
              </span>
              <span className="font-semibold text-gray-700">
                {format_amount(data?.material_inventory?.total_cost || 0)}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-indigo-500">其中滞销成本</span>
              <div className="flex items-center space-x-2">
                <span className={`font-medium ${
                  (data?.material_inventory?.stale_cost || 0) > 0 ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {format_amount(data?.material_inventory?.stale_cost || 0)}
                </span>
                <span className={`text-xs px-1 py-0.5 rounded ${
                  (data?.material_inventory?.stale_ratio || 0) > 30 
                    ? 'bg-red-100 text-red-600' 
                    : (data?.material_inventory?.stale_ratio || 0) > 10
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-green-100 text-green-600'
                }`}>
                  {(data?.material_inventory?.stale_ratio || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* SKU库存成本 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-indigo-600 flex items-center">
                <TrendingDown className="h-4 w-4 mr-1" />
                剩余SKU库存成本
              </span>
              <span className="font-semibold text-gray-700">
                {format_amount(data?.sku_inventory?.total_cost || 0)}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-indigo-500">其中滞销成本</span>
              <div className="flex items-center space-x-2">
                <span className={`font-medium ${
                  (data?.sku_inventory?.stale_cost || 0) > 0 ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {format_amount(data?.sku_inventory?.stale_cost || 0)}
                </span>
                <span className={`text-xs px-1 py-0.5 rounded ${
                  (data?.sku_inventory?.stale_ratio || 0) > 30 
                    ? 'bg-red-100 text-red-600' 
                    : (data?.sku_inventory?.stale_ratio || 0) > 10
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-green-100 text-green-600'
                }`}>
                  {(data?.sku_inventory?.stale_ratio || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* 总计 */}
          <div className="border-t border-indigo-200 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-indigo-700">库存总成本</span>
              <span className="font-bold text-indigo-800">
                {format_amount(data?.total_inventory?.total_cost || 0)}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-indigo-500">滞销风险</span>
              <div className="flex items-center space-x-2">
                <span className={`font-medium ${
                  (data?.total_inventory?.stale_cost || 0) > 0 ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {format_amount(data?.total_inventory?.stale_cost || 0)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  (data?.total_inventory?.stale_ratio || 0) > 30 
                    ? 'bg-red-100 text-red-700' 
                    : (data?.total_inventory?.stale_ratio || 0) > 10
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {(data?.total_inventory?.stale_ratio || 0) > 30 ? '高风险' :
                   (data?.total_inventory?.stale_ratio || 0) > 10 ? '中风险' : '低风险'}
                </span>
              </div>
            </div>
          </div>

          {/* 库存统计信息 */}
          <div className="text-xs text-indigo-500 bg-white bg-opacity-30 rounded p-2">
            <div className="grid grid-cols-2 gap-2">
              <div>原材料: {data?.material_inventory?.total_count || 0} 项</div>
              <div>SKU: {data?.sku_inventory?.total_count || 0} 项</div>
              <div>滞销原材料: {data?.material_inventory?.stale_count || 0} 项</div>
              <div>滞销SKU: {data?.sku_inventory?.stale_count || 0} 项</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-indigo-600">
          <Package className="h-8 w-8 mx-auto mb-2 text-indigo-400" />
          <p className="text-sm">暂无库存数据</p>
        </div>
      )}
    </div>
  )
}

export default inventory_status