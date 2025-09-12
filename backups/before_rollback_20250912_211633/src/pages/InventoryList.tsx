import { useState, useEffect, useCallback } from 'react';
import { Boxes, Download, Package, Grid, List } from 'lucide-react';
import { inventoryApi } from '../services/api';
import FinishedProductGrid from '../components/FinishedProductGrid'
import AccessoriesProductGrid from '../components/AccessoriesProductGrid'
import SemiFinishedMatrixView from '../components/SemiFinishedMatrixView'
import InventoryDashboard from '../components/InventoryDashboard'
import { toast } from 'react-hot-toast';

// 库存查询页面
export default function InventoryList() {
  // const { user } = useAuth()
  // const { isMobile } = useDeviceDetection()
  
  // 状态管理
  const [loading, setLoading] = useState(false)
  const [inventoryData, setInventoryData] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [, setTotalCount] = useState(0)
  const [limit] = useState(20)
  
  // 视图模式：'all' | 'semi-finished' | 'accessories' | 'finished'
  const [viewMode, setViewMode] = useState<'all' | 'semi-finished' | 'accessories' | 'finished'>('all')
  
  // 筛选条件
  const [searchTerm] = useState('')
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([])
  const [selectedQuality] = useState('')
  const [lowStockOnly] = useState(false)
  const [diameterMin] = useState('')
  const [diameterMax] = useState('')
  const [specificationMin] = useState('')
  const [specificationMax] = useState('')
  const [sortBy] = useState<'product_type' | 'total_quantity'>('total_quantity')
   const [sortOrder] = useState<'asc' | 'desc'>('desc')
  

  
  // 获取层级式库存数据
  const fetchHierarchicalInventory = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
         page: currentPage,
         limit: limit,
         search: searchTerm || undefined,
         product_types: selectedProductTypes.length > 0 ? selectedProductTypes : undefined,
         quality: (selectedQuality, as 'AA' | 'A' | 'AB' | 'B' | 'C') || undefined,
         low_stock_only: lowStockOnly || undefined,
         diameter_min: diameterMin || undefined,
         diameter_max: diameterMax || undefined,
         specification_min: specificationMin || undefined,
         specification_max: specificationMax || undefined,
         sort: sortOrder,
         sort_by: sortBy
       }
      
      console.log('📊 [库存查询] 请求参数:', params)
      
      const response = await inventoryApi.list_hierarchical(params)
       
       console.log('📊 [库存查询] 完整响应数据:', response.data)
       
       // 直接检查数据结构，不依赖success字段
       const responseData = response.data as any
       if (responseData.hierarchy || (responseData.data && responseData.data.hierarchy)) {
         // 处理两种可能的数据结构
         const hierarchyData = responseData.hierarchy || responseData.data?.hierarchy || []
         const paginationData = responseData.pagination || responseData.data?.pagination || {}
         
         setInventoryData(hierarchyData)
         setTotalPages(paginationData.pages || 1)
         setTotalCount(paginationData.total || 0)
         
         console.log('📊 [库存查询] 查询成功:', {
           dataLength: hierarchyData.length,
           totalCount: paginationData.total || 0,
           firstItem: hierarchyData[0],
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
      setLoading(false)
    }
  }, [
    currentPage, limit, searchTerm, selectedProductTypes, selectedQuality,
    lowStockOnly, diameterMin, diameterMax, specificationMin, specificationMax,
    sortBy, sortOrder
  ])
  
  // 页面加载时获取数据
  useEffect(() => {
    fetchHierarchicalInventory()
  }, [fetchHierarchicalInventory])
  

  
  // 导出数据
  const handleExport = async () => {
    try {
      toast.loading('正在导出数据...')
      const response = await inventoryApi.export()
      
      if ((response.data, as any).success) {
         // 创建下载链接
         const url = window.URL.createObjectURL(new, Blob([response.data, as any]))
         const link = document.createElement('a')
         link.href = url
         link.setAttribute('download', `库存数据_${new, Date().toISOString().split('T')[0]}.xlsx`)
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
  const handleViewModeChange = (mode: 'all' | 'semi-finished' | 'accessories' | 'finished') => {
    setViewMode(mode)
    setCurrentPage(1)
    
    // 根据视图模式自动筛选对应的产品类型
    if (mode === 'finished') {
      setSelectedProductTypes(['FINISHED'])
    } else if (mode === 'semi-finished') {
      setSelectedProductTypes(['LOOSE_BEADS', 'BRACELET'])
    } else if (mode === 'accessories') {
      setSelectedProductTypes(['ACCESSORIES'])
    } else {
      // 切换回全部视图时，清除产品类型筛选
      setSelectedProductTypes([])
    }
  }
  
  // 成品详情查看处理
  const handleProductClick = (product: any) => {
    // 这里可以添加查看成品详情的逻辑
    console.log('查看成品详情:', product)
    toast.success(`查看 ${product.product_name} 详情`)
  }
  
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Boxes className="h-8 w-8 text-crystal-500" />
          <h1 className="text-2xl font-bold text-gray-900">库存查询</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport},
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
            onClick={() => handleViewModeChange('all')},
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'all'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500, hover:text-gray-700, hover:bg-gray-50'
            }`}
          >
            <List className="h-4 w-4" />
            <span>全部库存</span>
          </button>
          <button
            onClick={() => handleViewModeChange('semi-finished')},
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'semi-finished'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500, hover:text-gray-700, hover:bg-gray-50'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>半成品库存</span>
          </button>
          <button
            onClick={() => handleViewModeChange('accessories')},
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'accessories'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500, hover:text-gray-700, hover:bg-gray-50'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>配件库存</span>
          </button>
          <button
            onClick={() => handleViewModeChange('finished')},
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'finished'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500, hover:text-gray-700, hover:bg-gray-50'
            }`}
          >
            <Grid className="h-4 w-4" />
            <span>成品库存</span>
          </button>
        </div>
      </div>
      

      

      
      {/* 库存数据展示 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {viewMode === 'finished' ? (
          // 成品卡片展示
          <div className="p-6">
            <FinishedProductGrid
              searchTerm={searchTerm},
              selectedQuality={selectedQuality},
              lowStockOnly={lowStockOnly},
              specificationMin={specificationMin},
              specificationMax={specificationMax}
            />
          </div>
        ) : viewMode === 'accessories' ? (
          // 配件卡片展示
          <div className="p-6">
            <AccessoriesProductGrid
              searchTerm={searchTerm},
              selectedQuality={selectedQuality},
              lowStockOnly={lowStockOnly},
              specificationMin={specificationMin},
              specificationMax={specificationMax}
            />
          </div>
        ) : viewMode === 'semi-finished' ? (
          // 半成品矩阵展示
          <div className="p-6">
            <SemiFinishedMatrixView
              data={inventoryData},
              loading={loading},
              onCellClick={handleProductClick}
            />
          </div>
        ) : (
          // 库存仪表盘展示
          <div className="p-6">
            <InventoryDashboard />
          </div>
        )}
      </div>
      
      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))},
            disabled={currentPage === 1},
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1
              return (
                <button
                  key={page},
                  onClick={() => setCurrentPage(page)},
                  className={`px-3 py-2 rounded-lg ${
                    currentPage === page
                      ? 'bg-crystal-600 text-white'
                      : 'border border-gray-300, hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))},
            disabled={currentPage === totalPages},
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
