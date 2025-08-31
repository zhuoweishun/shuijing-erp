import { useState } from 'react'
import { ChevronDown, ChevronRight, Package, AlertTriangle, Eye, Boxes, Expand, Minimize2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useDeviceDetection } from '../hooks/useDeviceDetection'

// 层级式库存数据类型
interface HierarchicalInventoryData {
  product_type: string
  total_quantity: number
  total_variants: number
  has_low_stock: boolean
  specifications: SpecificationData[]
}

interface SpecificationData {
  specification_value: number
  specification_unit: string | { unit: string } | any
  total_quantity: number
  total_variants: number
  has_low_stock: boolean
  qualities: QualityData[]
}

interface QualityData {
  quality: string
  remaining_quantity: number
  is_low_stock: boolean
  price_per_unit: number | null
  price_per_gram: number | null
  batch_count: number
  batches: BatchData[]
}

interface BatchData {
  purchase_id: number
  product_name: string
  product_type: string
  purchase_date: string
  supplier_name: string
  original_quantity: number
  used_quantity: number
  remaining_quantity: number
  price_per_unit: number | null
  price_per_gram: number | null
}

interface Props {
  data: HierarchicalInventoryData[]
  loading: boolean
  onViewBatchDetail?: (batch: BatchData) => void
  // 筛选条件
  selected_quality?: string
  selected_product_types?: string[]
  search_term?: string
  low_stock_only?: boolean
  diameter_min?: string
  diameter_max?: string
  specification_min?: string
  specification_max?: string
  sort_by?: string
  sort_order?: string
  onQualityChange?: (value: string) => void
  onProductTypesChange?: (value: string[]) => void
  onSearchTermChange?: (value: string) => void
  onLowStockOnlyChange?: (value: boolean) => void
  onDiameterMinChange?: (value: string) => void
  onDiameterMaxChange?: (value: string) => void
  onSpecificationMinChange?: (value: string) => void
  onSpecificationMaxChange?: (value: string) => void
  onSortChange?: (sort_by: string, sort_order: string) => void
}

// 格式化品相显示
const formatQuality = (quality: string | undefined | null) => {
  if (!quality) return '未知'
  return quality
}

// 格式化产品类型显示
const formatProductType = (productType: string) => {
  const typeMap: Record<string, string> = {
    'LOOSE_BEADS': '散珠',
    'BRACELET': '手串',
    'ACCESSORIES': '饰品配件',
    'FINISHED': '成品'
  }
  return typeMap[productType] || productType
}

export default function HierarchicalInventoryView({ 
  data, 
  loading, 
  onViewBatchDetail,
  selected_quality,
  selected_product_types,
  search_term,
  low_stock_only,
  diameter_min,
  diameter_max,
  specification_min,
  specification_max
}: Props) {
  const { user } = useAuth()
  const { isMobile } = useDeviceDetection()
  const [expandedProductTypes, setExpandedProductTypes] = useState<Set<string>>(new Set())
  const [expandedSpecifications, setExpandedSpecifications] = useState<Set<string>>(new Set())
  const [expandedQualities, setExpandedQualities] = useState<Set<string>>(new Set())
  const [highlightedItems] = useState<Set<string>>(new Set())

  // 应用筛选条件
  const filteredData = data.filter(product_type_data => {
    // 产品类型筛选（多选）
    if (selected_product_types && selected_product_types.length > 0) {
      if (!selected_product_types.includes(product_type_data.product_type)) {
        return false
      }
    }

    // 低库存筛选
    if (low_stock_only && !product_type_data.has_low_stock) {
      return false
    }

    // 过滤规格
    const filteredSpecifications = product_type_data.specifications.filter(spec_data => {
      // 规格范围筛选
      if (specification_min && spec_data.specification_value < Number(specification_min)) {
        return false
      }
      if (specification_max && spec_data.specification_value > Number(specification_max)) {
        return false
      }
      
      // 珠子直径范围筛选（对于散珠类型）
      if (diameter_min && spec_data.specification_value < Number(diameter_min)) {
        return false
      }
      if (diameter_max && spec_data.specification_value > Number(diameter_max)) {
        return false
      }

      // 过滤品相
      const filteredQualities = spec_data.qualities.filter(quality_data => {
        // 品相筛选
        if (selected_quality && quality_data.quality !== selected_quality) {
          return false
        }
        
        // 搜索词筛选（在批次中搜索产品名称）
        if (search_term) {
          const hasMatchingBatch = quality_data.batches.some(batch => 
            batch.product_name.toLowerCase().includes(search_term.toLowerCase())
          )
          if (!hasMatchingBatch) {
            return false
          }
        }
        
        return true
      })

      // 如果没有符合条件的品相，过滤掉这个规格
      if (filteredQualities.length === 0) {
        return false
      }

      // 更新规格数据的品相列表
      spec_data.qualities = filteredQualities
      return true
    })

    // 如果没有符合条件的规格，过滤掉这个产品类型
    if (filteredSpecifications.length === 0) {
      return false
    }

    // 更新产品类型数据的规格列表
    product_type_data.specifications = filteredSpecifications
    return true
  }).map(product_type_data => {
    // 深拷贝数据以避免修改原始数据
    return {
      ...product_type_data,
      specifications: product_type_data.specifications.map(spec_data => ({
        ...spec_data,
        qualities: spec_data.qualities.map(quality_data => ({
          ...quality_data,
          batches: quality_data.batches.slice() // 复制批次数组
        }))
      }))
    }
  })

  // 全局展开/折叠功能
  const expandAll = () => {
    const productTypes = new Set<string>()
    const specifications = new Set<string>()
    const qualities = new Set<string>()

    filteredData.forEach(product_type_data => {
      productTypes.add(product_type_data.product_type)
      
      product_type_data.specifications.forEach(spec_data => {
        const specKey = `${product_type_data.product_type}-${spec_data.specification_value}`
        specifications.add(specKey)
        
        spec_data.qualities.forEach(quality_data => {
          const qualityKey = `${product_type_data.product_type}-${spec_data.specification_value}-${quality_data.quality}`
          qualities.add(qualityKey)
        })
      })
    })

    setExpandedProductTypes(productTypes)
    setExpandedSpecifications(specifications)
    setExpandedQualities(qualities)
  }

  const collapseAll = () => {
    setExpandedProductTypes(new Set())
    setExpandedSpecifications(new Set())
    setExpandedQualities(new Set())
  }

  const toggleProductType = (productType: string) => {
    const newExpanded = new Set(expandedProductTypes)
    if (newExpanded.has(productType)) {
      newExpanded.delete(productType)
    } else {
      newExpanded.add(productType)
    }
    setExpandedProductTypes(newExpanded)
  }

  const toggleSpecification = (productType: string, specificationValue: number) => {
    const key = `${productType}-${specificationValue}`
    const newExpanded = new Set(expandedSpecifications)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedSpecifications(newExpanded)
  }

  const toggleQuality = (productType: string, specificationValue: number, quality: string) => {
    const key = `${productType}-${specificationValue}-${quality}`
    const newExpanded = new Set(expandedQualities)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedQualities(newExpanded)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crystal-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">加载中...</p>
      </div>
    )
  }

  if (filteredData.length === 0) {
    return (
      <div className="bg-white p-12 rounded-xl shadow-lg border border-gray-200 text-center">
        <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {data.length === 0 ? '暂无库存数据' : '没有符合筛选条件的库存数据'}
        </h3>
        <p className="text-gray-500">
          {data.length === 0 ? '请尝试添加新的采购记录' : '请尝试调整搜索条件或筛选条件'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-mobile-lg">
      {/* 全局控制面板 */}
      <div className="card-mobile">
        <div className={`flex items-center ${isMobile ? 'flex-col space-y-3' : 'justify-between'}`}>
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-crystal-500" />
            <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-mobile-subtitle' : 'text-lg'}`}>库存总览</h3>
            <span className="badge-mobile bg-crystal-100 text-crystal-800">
              {filteredData.length} 个品类
            </span>
          </div>
          
          <div className={`flex items-center ${isMobile ? 'w-full justify-between' : 'space-x-3'}`}>
            <button
              onClick={expandAll}
              className={`btn-mobile-secondary ${isMobile ? 'flex-1 mr-2' : ''}`}
            >
              <Expand className="h-4 w-4" />
              <span className={isMobile ? 'ml-1' : 'ml-1'}>全部展开</span>
            </button>
            
            <button
              onClick={collapseAll}
              className={`btn-mobile-secondary ${isMobile ? 'flex-1' : ''}`}
            >
              <Minimize2 className="h-4 w-4" />
              <span className={isMobile ? 'ml-1' : 'ml-1'}>全部折叠</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* 产品类型网格布局 */}
      <div className={`grid gap-mobile ${
        isMobile ? 'grid-mobile-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      }`}>
        {filteredData.map((product_type_data) => {
          const isProductTypeExpanded = expandedProductTypes.has(product_type_data.product_type)
          
          return (
            <div key={product_type_data.product_type} className="card-mobile overflow-hidden hover:shadow-lg transition-all duration-200">
              {/* 产品类型卡片头部 */}
              <div 
                className={`p-mobile cursor-pointer touch-feedback transition-colors ${
                  product_type_data.has_low_stock ? 'bg-red-50 border-l-4 border-l-red-500' : 'bg-gray-50'
                }`}
                onClick={() => toggleProductType(product_type_data.product_type)}
              >
                <div className="space-mobile-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isProductTypeExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <Boxes className="h-4 w-4 text-crystal-500" />
                    </div>
                    {product_type_data.has_low_stock && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  
                  <div>
                    <h3 className={`font-semibold text-gray-900 truncate ${
                      isMobile ? 'text-mobile-body' : 'text-sm'
                    }`}>{formatProductType(product_type_data.product_type)}</h3>
                    <p className={`text-gray-500 ${
                      isMobile ? 'text-mobile-caption' : 'text-xs'
                    }`}>{product_type_data.total_variants} 个变体</p>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-semibold text-gray-900 ${
                      isMobile ? 'text-mobile-body' : 'text-sm'
                    }`}>
                      {product_type_data.total_quantity} 件
                    </p>
                    {product_type_data.has_low_stock && (
                      <p className={`text-red-600 font-medium ${
                        isMobile ? 'text-mobile-caption' : 'text-xs'
                      }`}>低库存</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 展开的详细信息 */}
              {isProductTypeExpanded && (
                <div className="border-t border-gray-200 bg-white">
                  <div className={`bg-crystal-25 border-b border-gray-100 ${
                    isMobile ? 'p-mobile' : 'px-3 py-2'
                  }`}>
                    <h4 className={`font-semibold text-gray-700 ${
                      isMobile ? 'text-mobile-caption' : 'text-xs'
                    }`}>{formatProductType(product_type_data.product_type)} - 详细信息</h4>
                  </div>
                  
                  {/* 规格列表 */}
                  <div className={`divide-y divide-gray-100 overflow-y-auto ${
                    isMobile ? 'max-h-80' : 'max-h-96'
                  }`}>
                    {product_type_data.specifications.map((spec_data) => {
                      const specKey = `${product_type_data.product_type}-${spec_data.specification_value}`
                      const isSpecExpanded = expandedSpecifications.has(specKey)
                      
                      return (
                        <div key={specKey}>
                          <div 
                            className={`cursor-pointer touch-feedback transition-colors ${
                              isMobile ? 'p-mobile' : 'px-3 py-2'
                            } ${
                              spec_data.has_low_stock ? 'bg-orange-50' : ''
                            }`}
                            onClick={() => toggleSpecification(product_type_data.product_type, spec_data.specification_value)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {isSpecExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-gray-400" />
                                )}
                                <span className={`font-medium text-gray-800 ${
                                  isMobile ? 'text-mobile-caption' : 'text-xs'
                                }`}>
                                  {spec_data.specification_value}
                                  {typeof spec_data.specification_unit === 'string' 
                                    ? spec_data.specification_unit 
                                    : (spec_data.specification_unit?.unit || 'mm')
                                  }
                                </span>
                                {spec_data.has_low_stock && (
                                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                                )}
                              </div>
                              <div className="text-right">
                                <p className={`text-gray-500 ${
                                  isMobile ? 'text-mobile-small' : 'text-xs'
                                }`}>{spec_data.total_variants} 个品相</p>
                                <p className={`font-medium text-gray-700 ${
                                  isMobile ? 'text-mobile-caption' : 'text-xs'
                                }`}>
                                  {spec_data.total_quantity} 件
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 品相列表 */}
                          {isSpecExpanded && (
                            <div className="bg-gray-25 divide-y divide-gray-100">
                              <div className={`bg-gray-50 ${
                                isMobile ? 'p-mobile' : 'p-2'
                              }`}>
                                <div className="grid gap-mobile-xs grid-cols-1">
                                  {spec_data.qualities.map((quality_data) => {
                                    const qualityKey = `${product_type_data.product_type}-${spec_data.specification_value}-${quality_data.quality}`
                                    const isQualityExpanded = expandedQualities.has(qualityKey)
                                    const isHighlighted = highlightedItems.has(qualityKey)
                                    
                                    return (
                                      <div key={qualityKey} className="space-y-1">
                                        {/* 品相卡片 */}
                                        <div 
                                          className={`border rounded cursor-pointer touch-feedback transition-all ${
                                            isMobile ? 'p-mobile' : 'p-2'
                                          } ${
                                            isHighlighted
                                              ? 'border-yellow-400 bg-yellow-50 shadow-md ring-2 ring-yellow-200'
                                              : quality_data.is_low_stock 
                                                ? 'border-red-300 bg-red-50' 
                                                : 'border-gray-200 bg-white'
                                          }`}
                                          onClick={() => toggleQuality(product_type_data.product_type, spec_data.specification_value, quality_data.quality)}
                                        >
                                          <div className={`flex items-center justify-between ${
                                            isMobile ? 'mb-2' : 'mb-1'
                                          }`}>
                                            <div className="flex items-center space-x-1">
                                              <span className={`px-1.5 py-0.5 font-medium bg-crystal-100 text-crystal-800 rounded ${
                                                isMobile ? 'text-mobile-small' : 'text-xs'
                                              }`}>
                                                {formatQuality(quality_data.quality)}
                                              </span>
                                              {quality_data.batch_count > 1 && (
                                                <span className={`px-1.5 py-0.5 font-medium bg-blue-100 text-blue-800 rounded ${
                                                  isMobile ? 'text-mobile-small' : 'text-xs'
                                                }`}>
                                                  {quality_data.batch_count}批次
                                                </span>
                                              )}
                                            </div>
                                            {isQualityExpanded ? (
                                              <ChevronDown className="h-2.5 w-2.5 text-gray-400" />
                                            ) : (
                                              <ChevronRight className="h-2.5 w-2.5 text-gray-400" />
                                            )}
                                          </div>
                                          
                                          <div className={isMobile ? 'space-mobile-xs' : 'space-y-0.5'}>
                                            <div className="flex justify-between items-center">
                                              <span className={`text-gray-600 ${
                                                isMobile ? 'text-mobile-caption' : 'text-xs'
                                              }`}>库存:</span>
                                              <span className={`font-medium ${
                                                quality_data.is_low_stock ? 'text-red-600' : 'text-gray-900'
                                              } ${
                                                isMobile ? 'text-mobile-caption' : 'text-xs'
                                              }`}>
                                                {quality_data.remaining_quantity} 件
                                              </span>
                                            </div>
                                            
                                            {user?.role === 'BOSS' && quality_data.price_per_unit && (
                                              <div className="flex justify-between items-center">
                                                <span className={`text-gray-600 ${
                                                  isMobile ? 'text-mobile-caption' : 'text-xs'
                                                }`}>
                                                  {quality_data.batch_count > 1 ? '平均单价:' : 
                                                    product_type_data.product_type === 'LOOSE_BEADS' ? '每颗单价:' :
                                                    product_type_data.product_type === 'BRACELET' ? '每颗单价:' :
                                                    product_type_data.product_type === 'ACCESSORIES' ? '每片单价:' : '每件单价:'}
                                                </span>
                                                <span className={`font-medium text-gray-900 ${
                                                  isMobile ? 'text-mobile-caption' : 'text-xs'
                                                }`}>
                                                  ¥{quality_data.price_per_unit.toFixed(4)}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* 批次详情 */}
                                        {isQualityExpanded && quality_data.batches.length > 0 && (
                                          <div className={`ml-2 ${
                                            isMobile ? 'space-mobile-xs' : 'space-y-0.5'
                                          }`}>
                                            {quality_data.batches.map((batch, batchIndex) => (
                                              <div 
                                                key={`${qualityKey}-batch-${batch.purchase_id}-${batchIndex}`}
                                                className={`bg-white border border-gray-200 rounded cursor-pointer touch-feedback ${
                                                  isMobile ? 'p-mobile text-mobile-small' : 'p-1.5 text-xs'
                                                }`}
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  onViewBatchDetail?.(batch)
                                                }}
                                              >
                                                <div className={`flex items-center justify-between ${
                                                  isMobile ? 'mb-1' : 'mb-0.5'
                                                }`}>
                                                  <span className={`font-medium text-gray-700 ${
                                                    isMobile ? 'text-mobile-caption' : 'text-xs'
                                                  }`}>
                                                    批次 {batchIndex + 1}
                                                  </span>
                                                  <Eye className="h-2.5 w-2.5 text-gray-400" />
                                                </div>
                                                <div className={`text-gray-600 ${
                                                  isMobile ? 'space-mobile-xs' : 'space-y-0.5'
                                                }`}>
                                                  <div className="flex justify-between">
                                                    <span className={isMobile ? 'text-mobile-small' : 'text-xs'}>剩余:</span>
                                                    <span className={isMobile ? 'text-mobile-small' : 'text-xs'}>{batch.remaining_quantity} 件</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className={isMobile ? 'text-mobile-small' : 'text-xs'}>供应商:</span>
                                                    <span className={`truncate ml-1 ${
                                                      isMobile ? 'text-mobile-small' : 'text-xs'
                                                    }`}>{batch.supplier_name}</span>
                                                  </div>
                                                  {user?.role === 'BOSS' && batch.price_per_unit && (
                                                    <div className="flex justify-between">
                                                      <span className={isMobile ? 'text-mobile-small' : 'text-xs'}>单价:</span>
                                                      <span className={isMobile ? 'text-mobile-small' : 'text-xs'}>¥{batch.price_per_unit.toFixed(4)}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}