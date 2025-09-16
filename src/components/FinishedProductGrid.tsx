import React, { useState, useEffect } from 'react'
import { Eye, Package, Ruler, DollarSign, X } from 'lucide-react'
import { toast } from 'sonner'
import { inventory_api, fixImageUrl } from '../services/api'
import { useAuth } from '@/hooks/useAuth'
import { format_purchase_code, formatPurchaseDate } from '../utils/format'

// 成品数据类型定义
interface FinishedProduct {
  purchase_id: string
  purchase_code?: string
  purchase_name: string  // 采购系统使用purchase_name
  specification: number
  piece_count: number
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  photos?: string[]
  price_per_unit?: number
  total_price?: number
  supplier_name?: string
  purchase_date: string
  remaining_quantity: number
  is_low_stock: boolean
}

interface FinishedProductGridProps {search_term?: string
  selected_quality?: string
  low_stock_only?: boolean
  specification_min?: string
  specification_max?: string
}

export default function FinishedProductGrid({search_term,
  selected_quality,
  low_stock_only,
  specification_min,
  specification_max
}: FinishedProductGridProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<FinishedProduct[]>([])
  const [loading, set_loading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null)

  // 获取成品数据
  const fetch_finished_products = async (page_num: number = 1, append: boolean = false) => {
    set_loading(true)
    try {
      console.log('🔍 [成品数据获取] 请求参数:', {
        page: page_num,
        limit: 20,
        search: search_term,
        material_types: ['FINISHED_MATERIAL'],
        quality: selected_quality,
        low_stock_only,
        specification_min,
        specification_max
      })
      
      const params = {
        page: page_num,
        limit: 20,
        search: search_term || undefined,
        material_types: ['FINISHED_MATERIAL'], // 修复：使用material_types参数名
        quality: (selected_quality as 'AA' | 'A' | 'AB' | 'B' | 'C') || undefined,
        low_stock_only: low_stock_only || undefined,
        specification_min: specification_min || undefined,
        specification_max: specification_max || undefined
      }

      console.log('🔍 [API请求] 请求参数:', params)
      // 使用层级式库存API，但只查询成品类型
      const response = await inventory_api.list_hierarchical(params)
      
      if (response.success && response.data) {
        console.log('🔍 [API响应] 原始数据:', response)
        const responseData = response.data as any
        console.log('🔍 [成品数据] 层级数据:', responseData.hierarchy)
        
        // 从层级数据中提取成品产品
        const finished_products = extract_finished_products(responseData.hierarchy || [])
        console.log('🔍 [成品数据] 提取的成品产品:', finished_products)
        
        if (append) {
          setProducts(prev => [...prev, ...finished_products])
        } else {
          setProducts(finished_products)
        }
        
        setHasMore(responseData.pagination?.has_next || false)
      } else {
        console.error('🔍 [成品数据] API响应失败:', response)
      }
    } catch (error) {
      console.error('获取成品数据失败:', error)
      toast.error('获取成品数据失败')
    } finally {
      set_loading(false)
    }
  }

  // 加载更多数据
  const load_more = () => {
    if (!loading && hasMore) {
      const next_page = page + 1
      setPage(next_page)
      fetch_finished_products(next_page, true)
    }
  }

  // 监听筛选条件变化
  useEffect(() => {
    setPage(1)
    fetch_finished_products(1, false)
  }, [search_term, selected_quality, low_stock_only, specification_min, specification_max])

  // 产品类型中文映射
  const get_product_type_display = (purchase_type: string) => {
    const type_map: { [key: string]: string } = {
      'LOOSE_BEADS': '散珠',
      'BRACELET': '手串',
      'ACCESSORIES': '饰品配件',
      'FINISHED_MATERIAL': '成品'
    }
    return type_map[purchase_type] || purchase_type
  }

  // 从层级数据中提取成品产品
  const extract_finished_products = (hierarchy_data: any[]): FinishedProduct[] => {
    const products: FinishedProduct[] = []
    
    console.log('🔍 [成品数据提取] 原始层级数据:', hierarchy_data)
    
    hierarchy_data.forEach((type_group) => {
      console.log('🔍 [成品数据提取] type_group:', type_group)
      if (type_group.material_type === 'FINISHED_MATERIAL' || type_group.purchase_type === 'FINISHED_MATERIAL') {
        type_group.specifications?.forEach((spec_group: any, spec_index: number) => {
          spec_group.qualities?.forEach((quality_group: any, quality_index: number) => {
            // 从batches中获取实际的产品数据
            if (quality_group.batches && quality_group.batches.length > 0) {
              console.log('🔍 [成品数据提取] quality_group.batches:', quality_group.batches)
              quality_group.batches.forEach((batch: any) => {
                console.log('🔍 [成品数据提取] batch数据:', batch)
                
                // 后端mapPurchaseToMaterial函数将purchase_date映射为material_date
                const finalDate = batch.material_date || batch.purchase_date || new Date().toISOString()
                console.log('🔍 [成品数据提取] 最终采购日期:', finalDate, '类型:', typeof finalDate)
                
                // 解析photos字段
                let photos = []
                try {
                  if (batch.photos) {
                    if (typeof batch.photos === 'string') {
                      photos = JSON.parse(batch.photos)
                    } else if (Array.isArray(batch.photos)) {
                      photos = batch.photos
                    }
                  }
                } catch (e) {
                  console.error('解析photos失败:', e)
                  photos = []
                }
                
                // 添加详细的字段调试信息
                console.log('🔍 [字段调试] batch.remaining_quantity:', batch.remaining_quantity, '类型:', typeof batch.remaining_quantity)
                console.log('🔍 [字段调试] batch.price_per_unit:', batch.price_per_unit, '类型:', typeof batch.price_per_unit)
                console.log('🔍 [字段调试] batch.purchase_code:', batch.purchase_code, '类型:', typeof batch.purchase_code)
                console.log('🔍 [字段调试] batch.purchase_id:', batch.purchase_id, '类型:', typeof batch.purchase_id)
                
                // 确保数值字段正确转换（考虑字段映射）
                const remaining_qty = Number(batch.remaining_quantity) || Number(batch.material_remaining_quantity) || 0
                const price_unit = Number(batch.price_per_unit) || Number(batch.material_price_per_unit) || 0
                // 后端mapPurchaseToMaterial函数将purchase_code映射为material_code
                const purchase_code = batch.material_code || batch.purchase_code || batch.material_id || batch.purchase_id || ''
                
                console.log('🔍 [字段转换] remaining_qty:', remaining_qty, 'price_unit:', price_unit, 'purchase_code:', purchase_code)
                console.log('🔍 [原始字段值] batch.remaining_quantity:', batch.remaining_quantity, 'batch.material_remaining_quantity:', batch.material_remaining_quantity)
                console.log('🔍 [原始字段值] batch.price_per_unit:', batch.price_per_unit, 'batch.material_price_per_unit:', batch.material_price_per_unit)
                
                const product: FinishedProduct = {
                  purchase_id: batch.purchase_id,
                  purchase_code: purchase_code,
                  purchase_name: batch.material_name || batch.purchase_name || get_product_type_display(type_group.purchase_type),
                  specification: parseFloat(spec_group.specification_value) || 0,
                  piece_count: remaining_qty, // 修复：使用转换后的数量
                  quality: quality_group.quality,
                  photos: photos,
                  price_per_unit: price_unit, // 修复：使用转换后的价格
                  total_price: price_unit * remaining_qty, // 修复：使用转换后的值计算总价
                  supplier_name: batch.supplier_name || '',
                  purchase_date: finalDate,
                  remaining_quantity: remaining_qty, // 修复：使用转换后的数量
                  is_low_stock: batch.is_low_stock || quality_group.is_low_stock || false
                }
                
                console.log('🔍 [成品数据提取] 映射后的产品:', product)
                products.push(product)
              })
            } else {
              // 如果没有batches，使用品相组的汇总数据
              const key = `${type_group.purchase_type}-${spec_group.specification_value || `spec-${spec_index}`}-${quality_group.quality}-${quality_index}`
              
              // 尝试从不同层级获取采购日期
              const purchase_date = quality_group.purchase_date || 
                                  spec_group.purchase_date || 
                                  type_group.purchase_date || 
                                  new Date().toISOString()
              
              // 汇总数据的字段调试信息
              console.log('🔍 [汇总数据调试] quality_group.remaining_quantity:', quality_group.remaining_quantity, '类型:', typeof quality_group.remaining_quantity)
              console.log('🔍 [汇总数据调试] quality_group.price_per_unit:', quality_group.price_per_unit, '类型:', typeof quality_group.price_per_unit)
              
              // 确保汇总数据的数值字段正确转换（考虑字段映射）
              const summary_remaining_qty = Number(quality_group.remaining_quantity) || Number(quality_group.material_remaining_quantity) || 0
              const summary_price_unit = Number(quality_group.price_per_unit) || Number(quality_group.material_price_per_unit) || 0
              
              console.log('🔍 [汇总数据转换] summary_remaining_qty:', summary_remaining_qty, 'summary_price_unit:', summary_price_unit)
              
              // 汇总数据中尝试获取purchase_code（考虑字段映射）
              const summary_purchase_code = quality_group.material_code || 
                                          quality_group.purchase_code || 
                                          spec_group.material_code || 
                                          spec_group.purchase_code || 
                                          type_group.material_code || 
                                          type_group.purchase_code || 
                                          quality_group.material_id || 
                                          quality_group.purchase_id || 
                                          spec_group.material_id || 
                                          spec_group.purchase_id || 
                                          type_group.material_id || 
                                          type_group.purchase_id || ''
              
              console.log('🔍 [成品汇总数据] summary_purchase_code:', summary_purchase_code)
              
              const product: FinishedProduct = {
                purchase_id: key,
                purchase_code: summary_purchase_code, // 修复：使用正确的采购编号
                purchase_name: get_product_type_display(type_group.purchase_type),
                specification: parseFloat(spec_group.specification_value) || 0,
                piece_count: summary_remaining_qty, // 修复：使用转换后的数量
                quality: quality_group.quality,
                photos: [],
                price_per_unit: summary_price_unit, // 修复：使用转换后的价格
                total_price: summary_price_unit * summary_remaining_qty, // 修复：使用转换后的值计算总价
                supplier_name: '',
                purchase_date: purchase_date,
                remaining_quantity: summary_remaining_qty, // 修复：使用转换后的数量
                is_low_stock: quality_group.is_low_stock || false
              }
              
              console.log('🔍 [成品数据提取] 汇总数据产品:', product)
              products.push(product)
            }
          })
        })
      }
    })
    
    console.log('🔍 [成品数据提取] 最终提取的产品数量:', products.length)
    return products
  }

  // 格式化价格显示
  const format_price = (price?: number) => {
    if (price === undefined || price === null) return '暂无价格'
    return `¥${price.toFixed(2)}`
  }

  // 格式化品相显示
  const format_quality = (quality: string | undefined | null) => {
    // 品质值处理
    
    // 处理各种空值情况
    if (quality === null || quality === undefined || quality === '' || quality === 'null' || quality === 'undefined') {
      // 品质为空值
      return '未知'
    }
    
    // 确保quality是有效的枚举值
    const validQualities = ['AA', 'A', 'AB', 'B', 'C']
    const normalizedQuality = String(quality).trim().toUpperCase()
    
    if (!validQualities.includes(normalizedQuality)) {
      // 品质值无效
      return '未知'
    }
    
    // 返回格式化的品质值
    return `${normalizedQuality}级`
  }

  // 获取品相颜色
  const get_quality_color = (quality?: string) => {
    switch (quality) {
      case 'AA级': return 'bg-red-100 text-red-800'
      case 'A级': return 'bg-orange-100 text-orange-800'
      case 'AB级': return 'bg-yellow-100 text-yellow-800'
      case 'B级': return 'bg-blue-100 text-blue-800'
      case 'C级': return 'bg-gray-100 text-gray-800'
      case '未知': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  // 处理图片加载错误
  const handle_image_error = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('图片加载失败:', e.currentTarget.src)
    // 尝试重新加载一次
    const img = e.currentTarget
    if (!img.dataset.retried) {
      img.dataset.retried = 'true'
      setTimeout(() => {
        img.src = img.src + '?retry=' + Date.now()
      }, 1000)
    }
  }

  // 移除骨架屏，避免闪烁，直接显示空状态或加载中文字
  if (loading && products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">加载中...</h3>
        <p className="text-gray-500">正在获取成品数据</p>
      </div>
    )
  }

  if (products.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无成品数据</h3>
        <p className="text-gray-500">请尝试调整筛选条件或添加新的成品采购记录</p>
      </div>
    )
  }

  // 计算统计数据
  const stats = {
    product_types: new Set(products.map(p => p.purchase_name)).size,
    total_quantity: products.reduce((sum, p) => sum + (p.remaining_quantity || 0), 0),
    low_stock_items: products.filter(p => p.is_low_stock).length,
    avg_price: products.length > 0 ? products.reduce((sum, p) => sum + (p.price_per_unit || 0), 0) / products.length : 0
  }

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-crystal-500" />
            <h3 className="text-lg font-semibold text-gray-900">成品库存统计</h3>
          </div>
          
          {/* 图例 */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>库存充足</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>库存不足</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-crystal-600">{stats.product_types}</div>
            <div className="text-sm text-gray-500">产品种类</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.total_quantity}</div>
            <div className="text-sm text-gray-500">总库存</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.low_stock_items}</div>
            <div className="text-sm text-gray-500">低库存项</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">¥{stats.avg_price.toFixed(2)}</div>
            <div className="text-sm text-gray-500">平均价格</div>
          </div>
        </div>
      </div>

      {/* 成品网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
        {products.map((product, index) => (
          <div 
            key={product.purchase_id || `product-${index}`} 
            className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 bg-white rounded-lg shadow-sm border border-gray-200 ${
              product.is_low_stock ? 'ring-2 ring-red-200' : ''
            }`}
            onClick={() => setSelectedProduct(product)}
          >
            {/* 产品图片 */}
            <div 
              className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100"
              style={{
                filter: product.is_low_stock ? 'grayscale(1)' : 'none',
                transition: 'filter 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (product.is_low_stock) {
                  e.currentTarget.style.filter = 'grayscale(0)'
                }
              }}
              onMouseLeave={(e) => {
                if (product.is_low_stock) {
                  e.currentTarget.style.filter = 'grayscale(1)'
                }
              }}
            >
              {product.photos && product.photos.length > 0 ? (
                <img
                  src={fixImageUrl(product.photos[0])}
                  alt={product.purchase_name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                  onError={handle_image_error}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              )}
              
              {/* 低库存标识 */}
              {product.is_low_stock && (
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    库存不足
                  </span>
                </div>
              )}
              
              {/* 品相标识 */}
              {product.quality && (
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${get_quality_color(product.quality)}`}>
                    {format_quality(product.quality)}
                  </span>
                </div>
              )}
              
              {/* 悬浮查看按钮 */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:bg-gray-50 flex items-center space-x-1"
                >
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">查看详情</span>
                </button>
              </div>
            </div>
            
            {/* 产品信息 */}
            <div className="p-4">
              {/* 产品名称 */}
              <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm leading-tight">
                {product.purchase_name}
              </h3>
              
              {/* 规格信息 */}
              <div className="flex items-center text-xs text-gray-600 mb-1">
                <Ruler className="h-3 w-3 mr-1" />
                <span>规格: {product.specification}mm</span>
              </div>
              
              {/* 库存数量 */}
              <div className="flex items-center text-xs text-gray-600 mb-2">
                <Package className="h-3 w-3 mr-1" />
                <span>库存: {product.remaining_quantity}件</span>
              </div>
              
              {/* 价格信息 - 更突出显示，添加权限控制 */}
              <div className="mt-2 pt-2 border-t border-gray-100">
                {user?.role === 'BOSS' && product.price_per_unit !== undefined && product.price_per_unit !== null && product.price_per_unit > 0 ? (
                  <div className="flex items-center justify-center bg-green-50 rounded-md py-1 px-2">
                    <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                    <span className="text-sm font-bold text-green-700">{format_price(product.price_per_unit)}/件</span>
                  </div>
                ) : user?.role === 'BOSS' ? (
                  <div className="flex items-center justify-center bg-gray-50 rounded-md py-1 px-2">
                    <span className="text-xs text-gray-500">暂无价格</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center bg-gray-50 rounded-md py-1 px-2">
                    <span className="text-xs text-gray-500">-</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 加载更多按钮 */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={load_more}
            disabled={loading}
            className="min-w-32 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedProduct.purchase_name}
                </h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">库存数量</div>
                    <div className="text-xl font-bold text-gray-900">{selectedProduct.remaining_quantity} 件</div>
                  </div>
                  {user?.role === 'BOSS' && selectedProduct.price_per_unit !== undefined && selectedProduct.price_per_unit !== null && (
                    <div>
                      <div className="text-sm text-gray-500">单价</div>
                      <div className="text-xl font-bold text-gray-900">¥{selectedProduct.price_per_unit.toFixed(2)}</div>
                    </div>
                  )}
                </div>
                
                {/* 规格信息和品相等级在同一行 */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-2">规格信息</div>
                    <div className="flex items-center space-x-2">
                      <Ruler className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{selectedProduct.specification}mm</span>
                    </div>
                  </div>
                  {selectedProduct.quality && (
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-2">品相等级</div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${get_quality_color(selectedProduct.quality)}`}>
                        {format_quality(selectedProduct.quality)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="text-sm text-gray-500 mb-2">批次信息</div>
                  <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium text-gray-700">CG编号:</span>
                        <span className="ml-1">{selectedProduct.purchase_code || format_purchase_code(selectedProduct.purchase_id)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">供应商:</span>
                        <span className="ml-1">{selectedProduct.supplier_name || '未知'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">规格:</span>
                        <span className="ml-1">{selectedProduct.specification || '-'}mm</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">库存:</span>
                        <span className="ml-1">{selectedProduct.remaining_quantity} 件</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">采购日期:</span>
                        <span className="ml-1">{formatPurchaseDate(selectedProduct)}</span>
                      </div>

                      {user?.role === 'BOSS' && selectedProduct.price_per_unit !== undefined && selectedProduct.price_per_unit !== null && (
                        <div>
                          <span className="font-medium text-gray-700">件单价:</span>
                          <span className="ml-1">¥{selectedProduct.price_per_unit.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedProduct.photos && selectedProduct.photos.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">产品图片</div>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedProduct.photos.slice(0, 4).map((photo, index) => (
                        <img
                          key={index}
                          src={fixImageUrl(photo)}
                          alt={`${selectedProduct.purchase_name} ${index + 1}`}
                          className="w-full max-w-full h-auto object-contain rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onError={handle_image_error}
                          onClick={() => window.open(fixImageUrl(photo), '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}