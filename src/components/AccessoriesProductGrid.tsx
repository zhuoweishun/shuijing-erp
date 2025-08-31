import React, { useState, useEffect } from 'react'
import { Eye, Package, Ruler, DollarSign, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { inventoryApi } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'

// 配件数据类型定义
interface AccessoryProduct {
  purchase_id: string
  product_name: string
  specification?: number
  piece_count?: number
  quantity?: number
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  photos?: string[]
  price_per_unit?: number
  price_per_piece?: number
  price_per_gram?: number
  total_price?: number
  supplier_name?: string
  purchase_date: string
  remaining_quantity: number
  is_low_stock: boolean
  key?: string
}

interface AccessoriesProductGridProps {
  searchTerm?: string
  selectedQuality?: string
  lowStockOnly?: boolean
  specificationMin?: string
  specificationMax?: string
}

export default function AccessoriesProductGrid({
  searchTerm,
  selectedQuality,
  lowStockOnly,
  specificationMin,
  specificationMax
}: AccessoriesProductGridProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<AccessoryProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<AccessoryProduct | null>(null)

  // 获取配件数据
  const fetchAccessoryProducts = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true)
      
      const params = {
        page: pageNum,
        limit: 20,
        search: searchTerm || undefined,
        product_types: ['ACCESSORIES'], // 只查询配件类型
        quality: (selectedQuality as 'AA' | 'A' | 'AB' | 'B' | 'C') || undefined,
        low_stock_only: lowStockOnly || undefined,
        specification_min: specificationMin || undefined,
        specification_max: specificationMax || undefined
      }

      // 使用层级式库存API，但只查询配件类型
      const response = await inventoryApi.list_hierarchical(params)
      
      if (response.success && response.data) {
        console.log('🔍 [配件数据] API响应成功:', response.data)
        const responseData = response.data as any
        console.log('🔍 [配件数据] 层级数据:', responseData.hierarchy)
        
        // 从层级数据中提取配件产品
        const accessoryProducts = extractAccessoryProducts(responseData.hierarchy || [])
        console.log('🔍 [配件数据] 提取的配件产品:', accessoryProducts)
        
        if (append) {
          setProducts(prev => [...prev, ...accessoryProducts])
        } else {
          setProducts(accessoryProducts)
        }
        
        // setTotal(responseData.pagination?.total || accessoryProducts.length) // total变量已移除
        setHasMore(responseData.pagination?.has_next || false)
      } else {
        console.error('🔍 [配件数据] API响应失败:', response)
      }
    } catch (error) {
      console.error('获取配件数据失败:', error)
      toast.error('获取配件数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 产品类型中文映射
  const getProductTypeDisplay = (productType: string) => {
    const typeMap: { [key: string]: string } = {
      'LOOSE_BEADS': '散珠',
      'BRACELET': '手串',
      'ACCESSORIES': '饰品配件',
      'FINISHED': '成品'
    }
    return typeMap[productType] || productType
  }

  // 从层级式数据中提取配件产品
  const extractAccessoryProducts = (hierarchyData: any[]): AccessoryProduct[] => {
    const products: AccessoryProduct[] = []
    
    hierarchyData.forEach((typeGroup) => {
      if (typeGroup.product_type === 'ACCESSORIES') {
        typeGroup.specifications?.forEach((specGroup: any, specIndex: number) => {
          specGroup.qualities?.forEach((qualityGroup: any, qualityIndex: number) => {
            // 从batches中获取实际的产品数据
            if (qualityGroup.batches && qualityGroup.batches.length > 0) {
              qualityGroup.batches.forEach((batch: any, batchIndex: number) => {
                const key = `${batch.purchase_id}-${batchIndex}`
                
                products.push({
                  purchase_id: batch.purchase_id,
                  product_name: batch.product_name || getProductTypeDisplay(typeGroup.product_type),
                  specification: specGroup.specification_value,
                  quality: qualityGroup.quality,
                  remaining_quantity: batch.remaining_quantity || 0,
                  is_low_stock: batch.is_low_stock || qualityGroup.is_low_stock || false,
                  price_per_unit: batch.price_per_unit,
                  price_per_gram: batch.price_per_gram,
                  photos: batch.photos || [],
                  supplier_name: batch.supplier_name,
                  purchase_date: batch.purchase_date,
                  key
                })
              })
            } else {
              // 如果没有batches，使用品相组的汇总数据
              const key = `${typeGroup.product_type}-${specGroup.specification_value || `spec-${specIndex}`}-${qualityGroup.quality}-${qualityIndex}`
              
              products.push({
                purchase_id: key,
                product_name: getProductTypeDisplay(typeGroup.product_type),
                specification: specGroup.specification_value,
                quality: qualityGroup.quality,
                remaining_quantity: qualityGroup.remaining_quantity || 0,
                is_low_stock: qualityGroup.is_low_stock || false,
                price_per_unit: qualityGroup.price_per_unit,
                price_per_gram: qualityGroup.price_per_gram,
                photos: [],
                purchase_date: new Date().toISOString(),
                key
              })
            }
          })
        })
      }
    })
    return products
  }

  // 加载更多数据
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchAccessoryProducts(nextPage, true)
    }
  }

  // 监听筛选条件变化
  useEffect(() => {
    setPage(1)
    fetchAccessoryProducts(1, false)
  }, [searchTerm, selectedQuality, lowStockOnly, specificationMin, specificationMax])

  // 格式化价格显示
  const formatPrice = (price?: number) => {
    if (!price) return '暂无价格'
    return `¥${price.toFixed(2)}`
  }

  // 格式化品相显示
  const formatQuality = (quality?: string) => {
    if (!quality) return '未分级'
    return quality
  }

  // 获取品相颜色
  const getQualityColor = (quality?: string) => {
    switch (quality) {
      case 'AA': return 'bg-red-100 text-red-800'
      case 'A': return 'bg-orange-100 text-orange-800'
      case 'AB': return 'bg-yellow-100 text-yellow-800'
      case 'B': return 'bg-blue-100 text-blue-800'
      case 'C': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  // 处理图片加载错误
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
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

  if (loading && products.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
            <div className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无配件数据</h3>
        <p className="text-gray-500">请尝试调整筛选条件或添加新的配件采购记录</p>
      </div>
    )
  }

  // 计算统计数据
  const stats = {
    productTypes: new Set(products.map(p => p.product_name)).size,
    totalQuantity: products.reduce((sum, p) => sum + (p.remaining_quantity || 0), 0),
    lowStockItems: products.filter(p => p.is_low_stock).length,
    avgPrice: products.length > 0 ? products.reduce((sum, p) => sum + (p.price_per_unit || p.price_per_piece || p.price_per_gram || 0), 0) / products.length : 0
  }

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-crystal-500" />
            <h3 className="text-lg font-semibold text-gray-900">配件库存统计</h3>
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
            <div className="text-2xl font-bold text-crystal-600">{stats.productTypes}</div>
            <div className="text-sm text-gray-500">产品种类</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalQuantity}</div>
            <div className="text-sm text-gray-500">总库存</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.lowStockItems}</div>
            <div className="text-sm text-gray-500">低库存项</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">¥{stats.avgPrice.toFixed(2)}</div>
            <div className="text-sm text-gray-500">平均价格</div>
          </div>
        </div>
      </div>

      {/* 配件网格 */}
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
            <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100">
              {product.photos && product.photos.length > 0 ? (
                <img
                  src={product.photos[0]}
                  alt={product.product_name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                  onError={handleImageError}
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
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(product.quality)}`}>
                    {formatQuality(product.quality)}
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
                {product.product_name}
              </h3>
              
              {/* 规格信息 */}
              {product.specification && (
                <div className="flex items-center text-xs text-gray-600 mb-1">
                  <Ruler className="h-3 w-3 mr-1" />
                  <span>规格: {product.specification}mm</span>
                </div>
              )}
              
              {/* 库存数量 */}
              <div className="flex items-center text-xs text-gray-600 mb-2">
                <Package className="h-3 w-3 mr-1" />
                <span>库存: {product.remaining_quantity}件</span>
              </div>
              
              {/* 价格信息 - 更突出显示 */}
              <div className="mt-2 pt-2 border-t border-gray-100">
                {product.price_per_unit || product.price_per_piece || product.price_per_gram ? (
                  <div className="flex items-center justify-center bg-green-50 rounded-md py-1 px-2">
                    <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                    <span className="text-sm font-bold text-green-700">
                      {product.price_per_unit 
                        ? `${formatPrice(product.price_per_unit)}/件`
                        : product.price_per_piece 
                        ? `${formatPrice(product.price_per_piece)}/片`
                        : `${formatPrice(product.price_per_gram)}/克`
                      }
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center bg-gray-50 rounded-md py-1 px-2">
                    <span className="text-xs text-gray-500">暂无价格</span>
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
            onClick={loadMore}
            disabled={loading}
            className="min-w-32 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedProduct.product_name}
                </h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className={`grid gap-4 ${user?.role === 'BOSS' && (selectedProduct.price_per_unit || selectedProduct.price_per_piece || selectedProduct.price_per_gram) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div>
                    <div className="text-sm text-gray-500">库存数量</div>
                    <div className="text-xl font-bold text-gray-900">{selectedProduct.remaining_quantity} 件</div>
                  </div>
                  {user?.role === 'BOSS' && (selectedProduct.price_per_unit || selectedProduct.price_per_piece || selectedProduct.price_per_gram) && (
                    <div>
                      <div className="text-sm text-gray-500">单价</div>
                      <div className="text-xl font-bold text-gray-900">
                        {selectedProduct.price_per_unit 
                          ? `¥${selectedProduct.price_per_unit.toFixed(2)}/件`
                          : selectedProduct.price_per_piece 
                          ? `¥${selectedProduct.price_per_piece.toFixed(2)}/片`
                          : selectedProduct.price_per_gram
                          ? `¥${selectedProduct.price_per_gram.toFixed(2)}/克`
                          : '暂无价格'
                        }
                      </div>
                    </div>
                  )}
                </div>
                
                {selectedProduct.specification && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">规格信息</div>
                    <div className="flex items-center space-x-2">
                      <Ruler className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{selectedProduct.specification}mm</span>
                    </div>
                  </div>
                )}
                
                {selectedProduct.quality && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">品相等级</div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getQualityColor(selectedProduct.quality)}`}>
                      {formatQuality(selectedProduct.quality)}
                    </span>
                  </div>
                )}
                
                <div>
                  <div className="text-sm text-gray-500 mb-2">供应商信息</div>
                  <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium text-gray-700">供应商:</span>
                        <span className="ml-1">{selectedProduct.supplier_name || '未知'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">采购日期:</span>
                        <span className="ml-1">{new Date(selectedProduct.purchase_date).toLocaleDateString()}</span>
                      </div>
                      {selectedProduct.piece_count && (
                        <div>
                          <span className="font-medium text-gray-700">件数:</span>
                          <span className="ml-1">{selectedProduct.piece_count}件</span>
                        </div>
                      )}
                      {user?.role === 'BOSS' && selectedProduct.total_price && (
                        <div>
                          <span className="font-medium text-gray-700">总价:</span>
                          <span className="ml-1">¥{selectedProduct.total_price.toFixed(2)}</span>
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
                          src={photo}
                          alt={`${selectedProduct.product_name} ${index + 1}`}
                          className="w-full max-w-full h-auto object-contain rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onError={handleImageError}
                          onClick={() => window.open(photo, '_blank')}
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