import { useState, useEffect, useCallback } from 'react'
import { Boxes, Download, Package, Grid, List } from 'lucide-react'
import { inventory_api } from '../services/api'
import FinishedProductGrid from '../components/FinishedProductGrid'
import AccessoriesProductGrid from '../components/AccessoriesProductGrid'
import SemiFinishedMatrixView from '../components/SemiFinishedMatrixView'
import InventoryDashboard from '../components/InventoryDashboard'
import { toast } from 'react-hot-toast'

// 原材料库存页面
export default function InventoryList() {
  // const { user } = useAuth()
  // const { isMobile } = useDeviceDetection()
  
  // 状态管理
  const [loading, set_loading] = useState(false)
  const [inventory_data, set_inventory_data] = useState<any[]>([])
  const [current_page, setCurrentPage] = useState(1)
  const [total_pages, set_total_pages] = useState(1)
  const [search_term] = useState('')
  const [selectedProductTypes, set_selected_product_types] = useState<string[]>([])
  const [selected_quality] = useState('')
  const [low_stock_only] = useState(false)
  const [specification_min] = useState('')
  const [specification_max] = useState('')
  const [view_mode, set_view_mode] = useState<'all' | 'semi-finished' | 'accessories' | 'finished'>('all')
  

  
  // 获取层级式库存数据
  const fetch_hierarchical_inventory = useCallback(async () => {try {
      set_loading(true)
      const params = {
         page: current_page,
         limit: 20,
         search: search_term || undefined,
         material_types: selectedProductTypes.length > 0 ? selectedProductTypes: undefined,
         quality: (selected_quality as 'AA' | 'A' | 'AB' | 'B' | 'C') || undefined,
         low_stock_only: low_stock_only || undefined,
         specification_min: specification_min || undefined,
         specification_max: specification_max || undefined
       }
      
      console.log('📊 [库存查询] 请求参数:', params)
      
      const response = await inventory_api.list_hierarchical(params)
       
       console.log('📊 [库存查询] 完整响应数据:', response.data)
       
       // 直接检查数据结构，不依赖success字段
       const responseData = response.data as any
       console.log('🔧 [数据处理] responseData结构:', responseData)
       
       // API返回的数据结构是 { success: true, data: { hierarchy: [...], pagination: {...} } }
       const actualData = responseData.data || responseData
       console.log('🔧 [数据处理] actualData结构:', actualData)
       
       if (actualData && actualData.hierarchy) {
         const hierarchy_data = Array.isArray(actualData.hierarchy) ? actualData.hierarchy : []
         const paginationData = actualData.pagination || {}
         
         set_inventory_data(hierarchy_data)
         set_total_pages(typeof paginationData.pages === 'number' ? paginationData.pages : 1)
         
         console.log('📊 [库存查询] 查询成功:', {
           dataLength: hierarchy_data.length,
           total_count: paginationData.total || 0,
           firstItem: hierarchy_data[0],
           paginationData
         })
       } else {
         console.error('📊 [库存查询] 响应数据格式异常:', responseData)
         toast.error('获取库存数据失败：数据格式异常')
       }
    } catch (error: any) {
      console.error('📊 [库存查询] 查询失败:', error)
      toast.error(error.response?.data?.message || '获取库存数据失败')
    } finally {
      set_loading(false)
    }
  }, [
    current_page, search_term, selectedProductTypes, selected_quality,
    low_stock_only, specification_min, specification_max
  ])
  
  // 页面加载时获取数据
  useEffect(() => {fetch_hierarchical_inventory()
  }, [fetch_hierarchical_inventory])
  

  
  // 导出数据
  const handle_export = async () => {
    try {
      toast.loading('正在导出数据...')
      const response = await inventory_api.export()
      
      if ((response.data as any).success) {
         // 创建下载链接
         const url = window.URL.createObjectURL(new Blob([response.data as any]))
         const link = document.createElement('a')
         link.href = url
         link.setAttribute('download', `库存数据_${new Date().toISOString().split('T')[0]}.xlsx`)
         document.body.appendChild(link)
         link.click()
         link.remove()
         window.URL.revokeObjectURL(url)
         
         toast.success('导出成功')
       } else {
         toast.error('导出失败')
       }
    } catch (error: any) {
      console.error('导出失败:', error)
      toast.error(error.response?.data?.message || '导出失败')
    }
  }
  

  
  // 视图模式切换处理
  const handle_view_mode_change = (mode: 'all' | 'semi-finished' | 'accessories' | 'finished') => {
    // 避免重复设置相同的视图模式
    if (view_mode === mode) {
      return
    }
    
    // 批量更新状态，避免多次渲染
    set_view_mode(mode)
    setCurrentPage(1)
    
    // 根据视图模式自动筛选对应的原材料类型
    if (mode === 'finished') {
      set_selected_product_types(['FINISHED_MATERIAL'])
    } else if (mode === 'semi-finished') {
      set_selected_product_types(['LOOSE_BEADS', 'BRACELET'])
    } else if (mode === 'accessories') {
      set_selected_product_types(['ACCESSORIES'])
    } else {
      // 切换回全部视图时，清除原材料类型筛选
      set_selected_product_types([])
    }
  }
  
  // 原材料详情查看处理
  const handle_material_click = (material: any) => {
    // 安全检查：确保material对象存在且有material_name属性
    if (!material || !material.material_name) {
      console.warn('原材料信息不完整:', material)
      toast.error('原材料信息不完整，无法查看详情')
      return
    }
    
    // 这里可以添加查看原材料详情的逻辑
    console.log('查看原材料详情:', material)
    toast.success(`查看 ${material.material_name} 详情`)
  }
  
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Boxes className="h-8 w-8 text-crystal-500" />
          <h1 className="text-2xl font-bold text-gray-900">原材料库存</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handle_export}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>导出数据</span>
          </button>
        </div>
      </div>
      
      {/* 视图模式切换 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => handle_view_mode_change('all')}
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              view_mode === 'all'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <List className="h-4 w-4" />
            <span>全部库存</span>
          </button>
          <button
            onClick={() => handle_view_mode_change('semi-finished')}
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              view_mode === 'semi-finished'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>半成品库存</span>
          </button>
          <button
            onClick={() => handle_view_mode_change('accessories')}
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              view_mode === 'accessories'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>配件库存</span>
          </button>
          <button
            onClick={() => handle_view_mode_change('finished')}
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              view_mode === 'finished'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Grid className="h-4 w-4" />
            <span>成品库存</span>
          </button>
        </div>
      </div>
      

      

      
      {/* 原材料库存数据展示 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {view_mode === 'finished' && (
          // 成品卡片展示
          <div className="p-6">
            <FinishedProductGrid
              key="finished-grid"
              search_term={search_term}
              selected_quality={selected_quality}
              low_stock_only={low_stock_only}
              specification_min={specification_min}
              specification_max={specification_max}
            />
          </div>
        )}
        {view_mode === 'accessories' && (
          // 配件卡片展示
          <div className="p-6">
            <AccessoriesProductGrid
              key="accessories-grid"
              search_term={search_term}
              selected_quality={selected_quality}
              low_stock_only={low_stock_only}
              specification_min={specification_min}
              specification_max={specification_max}
            />
          </div>
        )}
        {view_mode === 'semi-finished' && (
          // 半成品矩阵展示
          <div className="p-6">
            <SemiFinishedMatrixView
              key="semi-finished-matrix"
              data={inventory_data}
              loading={loading}
              on_cell_click={handle_material_click}
            />
          </div>
        )}
        {view_mode === 'all' && (
          // 库存仪表盘展示
          <div className="p-6">
            <InventoryDashboard key="inventory-dashboard" />
          </div>
        )}
      </div>
      
      {/* 分页 */}
      {total_pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={current_page === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, total_pages) }, (_, i) => {
              const page = i + 1
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg ${
                    current_page === page
                      ? 'bg-crystal-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(total_pages, prev + 1))}
            disabled={current_page === total_pages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
