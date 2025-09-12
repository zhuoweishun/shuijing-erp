import { useState, useMemo, useRef, useEffect } from 'react'
import { Package, AlertTriangle, TrendingUp, ToggleRight, Filter, Search, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useDeviceDetection } from '../hooks/useDeviceDetection'
import { format_purchase_code } from '../utils/fieldConverter'
import Portal from './Portal'

// 半成品库存矩阵数据类型
interface SemiFinishedMatrixData {
  product_type: string
  total_quantity: number
  total_variants: number
  has_low_stock: boolean
  specifications: SpecificationData[]
}

interface SpecificationData {
  specification_value: number
  specification_unit: string
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
  purchase_code?: string
  material_name: string // 修改：product_name → material_name
  product_type: string // 保留：这里的productType实际上是material_type，但API返回仍使用product_type
  purchase_date: string
  supplier_name: string
  original_quantity: number
  used_quantity: number
  remaining_quantity: number
  price_per_unit: number | null
  price_per_bead: number | null
  price_per_gram: number | null
  photos?: string[]
  specification?: number
  bead_diameter?: number
  piece_count?: number
}

interface MatrixCell {
  product_type: string // 保留：这里的productType实际上是material_type，但API返回仍使用product_type
  material_name: string // 修改：product_name → material_name
  size: number
  quality?: string
  total_quantity: number
  avg_price: number
  priceUnit: string
  qualityDistribution: { [key: string]: number }
  qualityPrices: { [key: string]: number }
  is_low_stock: boolean
  batches: BatchData[]
}

// 矩阵视图模式
type MatrixViewMode = 'size' | 'quality'

interface Props {
  data: SemiFinishedMatrixData[]
  loading: boolean
  on_cell_click?: (cell: MatrixCell) => void
}



// 格式化品相显示
const format_quality = (quality: string | undefined | null) => {
  if (!quality) return '未知'
  return quality
}

// 获取库存状态颜色
const get_stock_status_color = (quantity: number, is_low_stock: boolean) => {if (is_low_stock || quantity <= 50) {
    return 'bg-red-100 border-red-200 text-red-800'
  } else if (quantity <= 200) {
    return 'bg-yellow-100 border-yellow-200 text-yellow-800'
  } else {
    return 'bg-green-100 border-green-200 text-green-800'
  }
}

// 获取品相颜色
const get_quality_color = (quality: string) => {
  const colorMap: Record<string, string> = {
    'AA': 'bg-red-500',
    'A': 'bg-orange-500',
    'AB': 'bg-yellow-500',
    'B': 'bg-blue-500',
    'C': 'bg-gray-500',
    '未知': 'bg-gray-400'
  }
  return colorMap[quality] || 'bg-gray-400'
}

export default function SemiFinishedMatrixView({ data, loading, on_cell_click }: Props) {
  const { user } = useAuth()
  const { isMobile } = useDeviceDetection()
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null)
  const [viewMode, set_view_mode] = useState<MatrixViewMode>('size')
  
  // 产品筛选状态
  const [showProductFilter, setShowProductFilter] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  // 临时筛选状态（用于手动应用）
  const [tempSearchKeyword, setTempSearchKeyword] = useState('')
  const [tempSelectedProducts, setTempSelectedProducts] = useState<string[]>([])
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 })

  // 计算筛选按钮位置
  const update_filter_position = () => {
    if (filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect()
      setFilterPosition({
        top: rect.bottom + 8,
        left: rect.left
      })
    }
  }

  // 监听筛选框显示状态变化，重新计算位置
  useEffect(() => {
    if (showProductFilter) {
      // 使用setTimeout确保DOM更新后再计算位置
      setTimeout(() => {
        update_filter_position()
      }, 0)
    }
  }, [showProductFilter])

  // 点击外部关闭筛选下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowProductFilter(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 处理数据，构建矩阵结构
  const matrixData = useMemo(() => {
    // 只处理散珠和手串类型
    const semiFinishedData = data.filter(item => 
      item.product_type === 'LOOSE_BEADS' || item.product_type === 'BRACELET'
    )

    if (viewMode === 'size') {
      // 按尺寸展示的矩阵
      const matrix: { [product_name: string]: { [size: string]: MatrixCell } } = {}
      const allSizes = new Set<number>()
      const productNames = new Set<string>()

      semiFinishedData.forEach(productTypeData => {
        productTypeData.specifications.forEach(specData => {
          allSizes.add(specData.specification_value)
          
          specData.qualities.forEach(qualityData => {
            qualityData.batches.forEach(batch => {
              // 兼容性处理：优先使用materialName，如果不存在则使用productName
              const material_name = batch.material_name || '未知产品'
              const size = specData.specification_value
              
              productNames.add(material_name) // 修改：使用materialName
              
              if (!matrix[material_name]) {
                matrix[material_name] = {}
              }
              
              if (!matrix[material_name][size]) {
                matrix[material_name][size] = {
                  product_type: productTypeData.product_type,
                  material_name: material_name, // 修改：product_name → material_name
                  size: size,
                  total_quantity: 0,
                  avg_price: 0,
                  priceUnit: productTypeData.product_type === 'LOOSE_BEADS' ? '元/颗' : 
                            productTypeData.product_type === 'BRACELET' ? '元/颗' : 
                            productTypeData.product_type === 'ACCESSORIES' ? '元/片' : '元/件',
                  qualityDistribution: {},
                  qualityPrices: {},
                  is_low_stock: false,
                  batches: []
                }
              }
              
              const cell = matrix[material_name][size]
              const remainingQty = Number(batch.remaining_quantity) || 0
              cell.total_quantity += remainingQty
              cell.batches.push(batch)
              
              // 计算品相分布
              const quality = format_quality(qualityData.quality)
              const qualityRemainingQty = Number(batch.remaining_quantity) || 0
              cell.qualityDistribution[quality] = (cell.qualityDistribution[quality] || 0) + qualityRemainingQty
              
              // 检查低库存状态
              if (qualityData.is_low_stock) {
                cell.is_low_stock = true
              }
            })
          })
        })
      })

      // 计算按品相分别的平均价格
      Object.values(matrix).forEach(productRow => {
        Object.values(productRow).forEach(cell => {
          const qualityPriceData: { [quality: string]: { total_price: number, total_quantity: number } } = {}
          
          cell.batches.forEach(batch => {
            // 根据产品类型选择合适的价格字段
            let price = 0
            if (batch.product_type === 'LOOSE_BEADS' || batch.product_type === 'BRACELET') {
              // 散珠和手串优先使用pricePerBead
              price = Number(batch.price_per_bead) || Number(batch.price_per_unit) || Number(batch.price_per_gram) || 0
            } else {
              // 其他产品类型使用原有逻辑
              price = Number(batch.price_per_unit) || Number(batch.price_per_gram) || 0
            }
            // 确保price是有效数字
            if (isNaN(price) || price < 0) {
              price = 0
            }
            if (price > 0) {
              // 从批次数据中获取品相信息
              const batchQuality = format_quality(
                semiFinishedData.find(ptd => ptd.product_type === batch.product_type)
                  ?.specifications.find(spec => spec.specification_value === cell.size)
                  ?.qualities.find(q => q.batches.some(b => b.purchase_id === batch.purchase_id))
                  ?.quality
              )
              
              if (!qualityPriceData[batchQuality]) {
                qualityPriceData[batchQuality] = { total_price: 0, total_quantity: 0 }
              }
              
              const remainingQty = Number(batch.remaining_quantity) || 0
              qualityPriceData[batchQuality].total_price += price * remainingQty
              qualityPriceData[batchQuality].total_quantity += remainingQty
            }
          })
          
          // 计算每个品相的平均价格
          Object.entries(qualityPriceData).forEach(([quality, data]) => {
            cell.qualityPrices[quality] = data.total_quantity > 0 ? data.total_price / data.total_quantity : 0
          })
          
          // 计算总体平均价格（加权平均）
          const total_price = Object.values(qualityPriceData).reduce((sum, data) => sum + data.total_price, 0)
          const total_quantity = Object.values(qualityPriceData).reduce((sum, data) => sum + data.total_quantity, 0)
          cell.avg_price = total_quantity > 0 ? total_price / total_quantity : 0
        })
      })

      return {
        matrix,
        allSizes: Array.from(allSizes).sort((a, b) => a - b),
        allQualities: [],
        productNames: Array.from(productNames).sort((a, b) => a.localeCompare(b, 'zh-CN'))
      }
    } else {
      // 按品相展示的矩阵
      const matrix: { [product_name: string]: { [quality: string]: MatrixCell } } = {}
      // 定义完整的品相选项，确保所有品相都显示
      const completeQualities = ['AA', 'A', 'AB', 'B', 'C', '未知']
      const allQualities = new Set<string>(completeQualities)
      const productNames = new Set<string>()

      semiFinishedData.forEach(productTypeData => {
        productTypeData.specifications.forEach(specData => {
          specData.qualities.forEach(qualityData => {
            const quality = format_quality(qualityData.quality)
            allQualities.add(quality)
            
            qualityData.batches.forEach(batch => {
              // 兼容性处理：优先使用materialName，如果不存在则使用productName
              const material_name = batch.material_name || '未知产品'
              
              productNames.add(material_name) // 修改：使用materialName
              
              if (!matrix[material_name]) {
                matrix[material_name] = {}
              }
              
              if (!matrix[material_name][quality]) {
                matrix[material_name][quality] = {
                  product_type: productTypeData.product_type,
                  material_name: material_name, // 修改：product_name → material_name
                  size: 0, // 在品相视图中，size不是主要维度
                  quality: quality,
                  total_quantity: 0,
                  avg_price: 0,
                  priceUnit: productTypeData.product_type === 'LOOSE_BEADS' ? '元/颗' : 
                            productTypeData.product_type === 'BRACELET' ? '元/颗' : 
                            productTypeData.product_type === 'ACCESSORIES' ? '元/片' : '元/件',
                  qualityDistribution: {},
                  qualityPrices: {},
                  is_low_stock: false,
                  batches: []
                }
              }
              
              const cell = matrix[material_name][quality]
              const remainingQty = Number(batch.remaining_quantity) || 0
              cell.total_quantity += remainingQty
              cell.batches.push(batch)
              
              // 在品相视图中，qualityDistribution显示尺寸分布
              const sizeKey = `${specData.specification_value}mm`
              cell.qualityDistribution[sizeKey] = (cell.qualityDistribution[sizeKey] || 0) + remainingQty
              
              // 检查低库存状态
              if (qualityData.is_low_stock) {
                cell.is_low_stock = true
              }
            })
          })
        })
      })

      // 确保每个产品都有完整的品相列（包括空数据）
      productNames.forEach(product_name => {
        if (!matrix[product_name]) {
          matrix[product_name] = {}
        }
        
        completeQualities.forEach(quality => {
          if (!matrix[product_name][quality]) {
            // 创建空的品相单元格
            matrix[product_name][quality] = {
              product_type: 'LOOSE_BEADS', // 默认类型，实际会被数据覆盖
              material_name: product_name, // 修改：product_name → material_name（这里productName实际上是materialName）
              size: 0,
              quality: quality,
              total_quantity: 0,
              avg_price: 0,
              priceUnit: '元/颗',
              qualityDistribution: {},
              qualityPrices: {},
              is_low_stock: false,
              batches: []
            }
          }
        })
      })
      
      // 计算平均价格（按品相）
      Object.values(matrix).forEach(productRow => {
        Object.values(productRow).forEach(cell => {
          let total_price = 0
          let total_quantity = 0
          const sizePriceData: { [sizeKey: string]: { total_price: number, total_quantity: number } } = {}
          
          cell.batches.forEach(batch => {
            // 根据产品类型选择合适的价格字段
            let price = 0
            if (batch.product_type === 'LOOSE_BEADS' || batch.product_type === 'BRACELET') {
              // 散珠和手串优先使用pricePerBead
              price = Number(batch.price_per_bead) || Number(batch.price_per_unit) || Number(batch.price_per_gram) || 0
            } else {
              // 其他产品类型使用原有逻辑
              price = Number(batch.price_per_unit) || Number(batch.price_per_gram) || 0
            }
            // 确保price是有效数字
            if (isNaN(price) || price < 0) {
              price = 0
            }
            if (price > 0) {
              const remainingQty = Number(batch.remaining_quantity) || 0
              total_price += price * remainingQty
              total_quantity += remainingQty
              
              // 根据批次找到对应的尺寸
              const batchSpec = semiFinishedData.find(ptd => ptd.product_type === batch.product_type)
                ?.specifications.find(spec => 
                  spec.qualities.some(q => q.batches.some(b => b.purchase_id === batch.purchase_id))
                )
              
              if (batchSpec) {
                const sizeKey = `${batchSpec.specification_value}mm`
                if (!sizePriceData[sizeKey]) {
                  sizePriceData[sizeKey] = { total_price: 0, total_quantity: 0 }
                }
                sizePriceData[sizeKey].total_price += price * remainingQty
                sizePriceData[sizeKey].total_quantity += remainingQty
              }
            }
          })
          
          // 计算每个尺寸的平均价格
          Object.entries(sizePriceData).forEach(([sizeKey, data]) => {
            cell.qualityPrices[sizeKey] = data.total_quantity > 0 ? data.total_price / data.total_quantity : 0
          })
          
          cell.avg_price = total_quantity > 0 ? total_price / total_quantity : 0
        })
      })

      return {
        matrix,
        allSizes: [],
        allQualities: completeQualities, // 使用预定义的完整品相顺序
        productNames: Array.from(productNames).sort((a, b) => a.localeCompare(b, 'zh-CN'))
      }
    }
  }, [data, viewMode])

  // 获取所有产品名称用于筛选
  const allProductNames = useMemo(() => {
    const names = new Set<string>()
    data.forEach(productTypeData => {
      productTypeData.specifications.forEach(specData => {
        specData.qualities.forEach(qualityData => {
          qualityData.batches.forEach(batch => {
            // 兼容性处理：优先使用materialName，如果不存在则使用productName
            const material_name = batch.material_name || '未知产品'
            names.add(material_name)
          })
        })
      })
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'zh-CN')) // 中文拼音A-Z排序
  }, [data])

  // 筛选后的产品名称
  const filteredProductNames = useMemo(() => {
    let filtered = allProductNames
    
    // 搜索关键词筛选
    if (searchKeyword.trim()) {
      filtered = filtered.filter(name => 
        name.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    }
    
    // 多选筛选
    if (selectedProducts.length > 0) {
      filtered = filtered.filter(name => selectedProducts.includes(name))
    }
    
    return filtered
  }, [allProductNames, searchKeyword, selectedProducts])

  // 筛选功能处理函数
  const handleProductToggle = (product_name: string) => {
    setTempSelectedProducts(prev => {
      if (prev.includes(product_name)) {
        return prev.filter(name => name !== product_name)
      } else {
        return [...prev, product_name]
      }
    })
  }

  const handleSelectAll = () => {
    const searchFiltered = allProductNames.filter(name => 
      name.toLowerCase().includes(tempSearchKeyword.toLowerCase())
    )
    setTempSelectedProducts(searchFiltered)
  }

  const handleClearAll = () => {
    setTempSelectedProducts([])
  }

  // 应用筛选
  const handleApplyFilter = () => {
    setSearchKeyword(tempSearchKeyword)
    setSelectedProducts(tempSelectedProducts)
    setShowProductFilter(false)
  }

  // 重置筛选
  const handleResetFilter = () => {
    setTempSearchKeyword('')
    setTempSelectedProducts([])
    setSearchKeyword('')
    setSelectedProducts([])
    setShowProductFilter(false)
  }

  const handleCellClick = (cell: MatrixCell) => {
    setSelectedCell(cell)
    on_cell_click?.(cell)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crystal-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">加载中...</p>
      </div>
    )
  }

  if (matrixData.productNames.length === 0) {
    return (
      <div className="bg-white p-12 rounded-xl shadow-lg border border-gray-200 text-center">
        <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无半成品库存数据</h3>
        <p className="text-gray-500">请尝试添加散珠或手串的采购记录</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-crystal-500" />
            <h3 className="text-lg font-semibold text-gray-900">半成品库存矩阵</h3>
          </div>
          <div className="flex items-center space-x-6">
            {/* 视图模式切换 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">横轴:</span>
              <button
                onClick={() => set_view_mode(viewMode === 'size' ? 'quality' : 'size')}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
                  viewMode === 'size'
                    ? 'bg-crystal-100 text-crystal-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {viewMode === 'size' ? (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">尺寸</span>
                  </>
                ) : (
                  <>
                    <ToggleRight className="h-4 w-4" />
                    <span className="text-sm">品相</span>
                  </>
                )}
              </button>
            </div>
            
            {/* 图例 */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>库存充足</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>库存偏低</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>库存不足</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-crystal-600">{filteredProductNames.length}</div>
            <div className="text-sm text-gray-500">产品种类</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-crystal-600">
              {viewMode === 'size' ? matrixData.allSizes.length : matrixData.allQualities.length}
            </div>
            <div className="text-sm text-gray-500">{viewMode === 'size' ? '规格数量' : '品相数量'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Object.entries(matrixData.matrix)
                .filter(([product_name]) => filteredProductNames.includes(product_name))
                .reduce((total, [, productRow]) => 
                  total + Object.values(productRow).reduce((sum, cell) => sum + (Number(cell.total_quantity) || 0), 0), 0
                )}
            </div>
            <div className="text-sm text-gray-500">总库存</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {Object.entries(matrixData.matrix)
                .filter(([product_name]) => filteredProductNames.includes(product_name))
                .reduce((total, [, productRow]) => 
                  total + Object.values(productRow).filter(cell => cell.is_low_stock).length, 0
                )}
            </div>
            <div className="text-sm text-gray-500">低库存项</div>
          </div>
        </div>
      </div>

      {/* 矩阵表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className={`overflow-x-auto ${isMobile ? 'max-w-full' : ''}`}>
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  <div className="flex items-center justify-between">
                    <span>产品名称</span>
                    <div className="relative" ref={filterDropdownRef}>
                      <button
                        ref={filterButtonRef}
                        onClick={() => {
                          if (!showProductFilter) {
                            // 打开筛选框时初始化临时状态
                            setTempSearchKeyword(searchKeyword)
                            setTempSelectedProducts(selectedProducts)
                          }
                          setShowProductFilter(!showProductFilter)
                        }}
                        className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                        title="筛选产品"
                      >
                        <Filter className="h-3 w-3 text-gray-400" />
                      </button>
                      
                      {showProductFilter && (
                        <Portal>
                          <div 
                            className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
                            onClick={() => setShowProductFilter(false)}
                          />
                          <div 
                            ref={filterDropdownRef}
                            className="fixed w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999]"
                            style={{
                              top: `${filterPosition.top}px`,
                              left: `${filterPosition.left}px`,
                              maxWidth: 'calc(100vw - 2rem)'
                            }}
                          >
                            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                              <h3 className="text-lg font-medium text-gray-900">筛选产品</h3>
                              <button
                                onClick={() => setShowProductFilter(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <div className="p-4">
                              <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="搜索产品名称..."
                                  value={tempSearchKeyword}
                                  onChange={(e) => setTempSearchKeyword(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-crystal-500 focus:border-crystal-500 text-sm"
                                />
                                {tempSearchKeyword && (
                                  <button
                                    onClick={() => setTempSearchKeyword('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-sm text-gray-600">
                                  已选择 {tempSelectedProducts.length} / {allProductNames.filter(name => name.toLowerCase().includes(tempSearchKeyword.toLowerCase())).length} 个产品
                                </span>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={handleSelectAll}
                                    className="text-xs text-crystal-600 hover:text-crystal-700"
                                  >
                                    全选
                                  </button>
                                  <button
                                    onClick={handleClearAll}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    清空
                                  </button>
                                </div>
                              </div>
                              <div className="max-h-60 overflow-y-auto mb-3">
                                {allProductNames
                                  .filter(name => name.toLowerCase().includes(tempSearchKeyword.toLowerCase()))
                                  .map((product_name, filterIndex) => (
                                  <label key={`filter-${product_name}-${filterIndex}`} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={tempSelectedProducts.includes(product_name)}
                                      onChange={() => handleProductToggle(product_name)}
                                      className="rounded border-gray-300 text-crystal-600 focus:ring-crystal-500"
                                    />
                                    <span className="text-sm text-gray-700 truncate" title={product_name}>
                                      {product_name}
                                    </span>
                                  </label>
                                ))}
                              </div>
                              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                                <button
                                  onClick={handleResetFilter}
                                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                  重置
                                </button>
                                <button
                                  onClick={handleApplyFilter}
                                  className="px-3 py-1.5 text-sm text-white bg-crystal-600 hover:bg-crystal-700 rounded-md transition-colors"
                                >
                                  应用筛选
                                </button>
                              </div>
                            </div>
                          </div>
                        </Portal>
                       )}
                    </div>
                  </div>
                </th>
                {viewMode === 'size' ? (
                  matrixData.allSizes.map((size, headerIndex) => (
                    <th key={`header-size-${size}-${headerIndex}`} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32">
                      {size}mm
                    </th>
                  ))
                ) : (
                  matrixData.allQualities.map((quality, headerIndex) => (
                    <th key={`header-quality-${quality}-${headerIndex}`} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32">
                      {quality === '未知' ? quality : `${quality}级`}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProductNames.map((product_name, rowIndex) => (
                <tr key={`${product_name}-${rowIndex}`} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="max-w-32 truncate" title={product_name}>
                      {product_name}
                    </div>
                  </td>
                  {viewMode === 'size' ? (
                    matrixData.allSizes.map((size, cellIndex) => {
                      const cell = matrixData.matrix[product_name]?.[size]
                      
                      if (!cell) {
                        return (
                          <td key={`${product_name}-${size}-${cellIndex}`} className="px-3 py-4 text-center">
                            <div className="text-gray-400 text-xs">-</div>
                          </td>
                        )
                      }
                      
                      return (
                        <td key={`${product_name}-${size}-${cellIndex}`} className="px-3 py-4 text-center">
                          <div 
                            className={`cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md ${
              get_stock_status_color(cell.total_quantity, cell.is_low_stock)
            }`}
            style={{
              filter: cell.is_low_stock || cell.total_quantity <= 50 ? 'grayscale(1)' : 'none',
              transition: 'filter 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (cell.is_low_stock || cell.total_quantity <= 50) {
                e.currentTarget.style.filter = 'grayscale(0)'
              }
            }}
            onMouseLeave={(e) => {
              if (cell.is_low_stock || cell.total_quantity <= 50) {
                e.currentTarget.style.filter = 'grayscale(1)'
              }
            }}
                            onClick={() => handleCellClick(cell)}
                          >
                            {/* 库存数量 */}
                            <div className="font-bold text-lg">
                              {cell.total_quantity}
                            </div>
                            
                            {/* 价格信息 - 显示按品相分别的价格 */}
                            {user?.role === 'BOSS' && Object.keys(cell.qualityDistribution).length > 0 && (
                              <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                {Object.entries(cell.qualityDistribution)
                                  .filter(([, quantity]) => quantity > 0)
                                  .sort(([a], [b]) => {
                                    // 按品相等级排序：AA > A > AB > B > C > 未知
                                    const order = ['AA', 'A', 'AB', 'B', 'C', '未知'];
                                    return order.indexOf(a) - order.indexOf(b);
                                  })
                                  .map(([quality, quantity]) => (
                                    <div key={quality} className="flex justify-center items-center space-x-1">
                                      <div className={`w-1.5 h-1.5 rounded-full ${get_quality_color(quality)}`}></div>
                                      <span className="text-xs">{quality}: {quantity}{cell.product_type === 'LOOSE_BEADS' ? '颗' : cell.product_type === 'BRACELET' ? '颗' : cell.product_type === 'ACCESSORIES' ? '片' : '件'}</span>
                                    </div>
                                  ))
                                }
                              </div>
                            )}
                            

                            
                            {/* 低库存警告 */}
                            {cell.is_low_stock && (
                              <AlertTriangle className="h-3 w-3 text-red-500 mx-auto mt-1" />
                            )}
                          </div>
                        </td>
                      )
                    })
                  ) : (
                    matrixData.allQualities.map((quality, cellIndex) => {
                      const cell = matrixData.matrix[product_name]?.[quality]
                      
                      if (!cell) {
                        return (
                          <td key={`${product_name}-${quality}-${cellIndex}`} className="px-3 py-4 text-center">
                            <div className="text-gray-400 text-xs">-</div>
                          </td>
                        )
                      }
                      
                      return (
                        <td key={`${product_name}-${quality}-${cellIndex}`} className="px-3 py-4 text-center">
                          <div 
                            className={`cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md ${
                              get_stock_status_color(cell.total_quantity, cell.is_low_stock)
                            }`}
                            style={{
                              filter: cell.is_low_stock || cell.total_quantity <= 50 ? 'grayscale(1)' : 'none',
                              transition: 'filter 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (cell.is_low_stock || cell.total_quantity <= 50) {
                                e.currentTarget.style.filter = 'grayscale(0)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (cell.is_low_stock || cell.total_quantity <= 50) {
                                e.currentTarget.style.filter = 'grayscale(1)'
                              }
                            }}
                            onClick={() => handleCellClick(cell)}
                          >
                            {/* 库存数量 */}
                            <div className="font-bold text-lg">
                              {cell.total_quantity}
                            </div>
                            
                            {/* 尺寸分布信息 - 按品相显示不同尺寸的数量 */}
                            {user?.role === 'BOSS' && Object.keys(cell.qualityDistribution).length > 0 && (
                              <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                {Object.entries(cell.qualityDistribution)
                                  .filter(([, quantity]) => quantity > 0)
                                  .sort(([a], [b]) => {
                                    // 按尺寸排序
                                    const sizeA = parseFloat(a.replace('mm', '')) || 0;
                                    const sizeB = parseFloat(b.replace('mm', '')) || 0;
                                    return sizeA - sizeB;
                                  })
                                  .map(([sizeKey, quantity]) => (
                                    <div key={sizeKey} className="flex justify-center items-center">
                                      <span className="text-xs">{sizeKey}: {quantity}{cell.product_type === 'LOOSE_BEADS' ? '颗' : cell.product_type === 'BRACELET' ? '颗' : cell.product_type === 'ACCESSORIES' ? '片' : '件'}</span>
                                    </div>
                                  ))
                                }
                              </div>
                            )}
                            

                            
                            {/* 低库存警告 */}
                            {cell.is_low_stock && (
                              <AlertTriangle className="h-3 w-3 text-red-500 mx-auto mt-1" />
                            )}
                          </div>
                        </td>
                      )
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedCell && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCell(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedCell.material_name} - {viewMode === 'size' ? `${selectedCell.size}mm` : `${selectedCell.quality}级`}
                </h3>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">总库存</div>
                    <div className="text-xl font-bold text-gray-900">{selectedCell.total_quantity} {
                      selectedCell.product_type === 'LOOSE_BEADS' ? '颗' :
                      selectedCell.product_type === 'BRACELET' ? '颗' :
                      selectedCell.product_type === 'ACCESSORIES' ? '片' : '件'
                    }</div>
                  </div>
                  {user?.role === 'BOSS' && (
                        <div>
                          <div className="text-sm text-gray-500">加权平均价格</div>
                          {selectedCell.avg_price > 0 ? (
                            <div className="text-xl font-bold text-gray-900">¥{selectedCell.avg_price.toFixed(2)}</div>
                          ) : (
                            <div className="text-sm text-gray-500">暂无价格信息</div>
                          )}
                        </div>
                      )}
                </div>
                

                
                <div>
                  <div className="text-sm text-gray-500 mb-2">{viewMode === 'size' ? '品相分布' : '尺寸分布'}</div>
                  <div className="space-y-2">
                    {Object.entries(selectedCell.qualityDistribution).map(([key, quantity], distIndex) => (
                      <div key={`dist-${key}-${distIndex}`} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {viewMode === 'size' ? (
                            <>
                              <div className={`w-3 h-3 rounded-full ${get_quality_color(key)}`}></div>
                              <span className="text-sm text-gray-700">{key === '未知' ? key : `${key}级`}</span>
                            </>
                          ) : (
                            <>
                              <div className="w-3 h-3 bg-gray-400 rounded"></div>
                              <span className="text-sm text-gray-700">{key}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{quantity} {viewMode === 'size' ? 
                            (selectedCell.product_type === 'LOOSE_BEADS' ? '颗' :
                             selectedCell.product_type === 'BRACELET' ? '颗' :
                             selectedCell.product_type === 'ACCESSORIES' ? '片' : '件') :
                            (selectedCell.product_type === 'LOOSE_BEADS' ? '颗' :
                             selectedCell.product_type === 'BRACELET' ? '颗' :
                             selectedCell.product_type === 'ACCESSORIES' ? '片' : '件')
                          }</span>
                          {/* 在品相视图中显示尺寸对应的价格，在尺寸视图中显示品相对应的价格 */}
                          {user?.role === 'BOSS' && selectedCell.qualityPrices[key] && (
                            <span className="text-xs text-gray-500">¥{selectedCell.qualityPrices[key].toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500 mb-2">批次信息 ({selectedCell.batches.length} 个批次)</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedCell.batches.map((batch, index) => (
                      <div key={`${batch.purchase_id}-${batch.material_name}-${index}`} className="text-xs text-gray-600 p-3 bg-gray-50 rounded">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="font-medium text-gray-700">CG编号:</span>
                            <span className="ml-1">{batch.purchase_code || format_purchase_code(batch.purchase_id)}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">供应商:</span>
                            <span className="ml-1">{batch.supplier_name}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">规格:</span>
                            <span className="ml-1">{batch.specification || batch.bead_diameter || '-'}mm</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">库存:</span>
                            <span className="ml-1">{batch.original_quantity} {
                              selectedCell.product_type === 'LOOSE_BEADS' ? '颗' :
                              selectedCell.product_type === 'BRACELET' ? '颗' :
                              selectedCell.product_type === 'ACCESSORIES' ? '片' : '件'
                            }</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">采购日期:</span>
                            <span className="ml-1">{new Date(batch.purchase_date).toLocaleDateString()}</span>
                          </div>
                          {batch.piece_count && (
                            <div>
                              <span className="font-medium text-gray-700">颗数:</span>
                              <span className="ml-1">{batch.piece_count}颗</span>
                            </div>
                          )}
                          {user?.role === 'BOSS' && (() => {
                            // 根据产品类型选择合适的价格字段
                            let price = 0
                            if (batch.product_type === 'LOOSE_BEADS' || batch.product_type === 'BRACELET') {
                              price = Number(batch.price_per_bead) || Number(batch.price_per_unit) || Number(batch.price_per_gram) || 0
                            } else {
                              price = Number(batch.price_per_unit) || Number(batch.price_per_gram) || 0
                            }
                            // 确保price是有效数字
                            if (isNaN(price) || price < 0) {
                              price = 0
                            }
                            return price > 0 ? (
                              <div>
                                <span className="font-medium text-gray-700">{
                                  selectedCell.product_type === 'LOOSE_BEADS' ? '颗单价:' :
                                  selectedCell.product_type === 'BRACELET' ? '颗单价:' :
                                  selectedCell.product_type === 'ACCESSORIES' ? '片单价:' : '件单价:'
                                }</span>
                                <span className="ml-1">¥{price.toFixed(2)}</span>
                              </div>
                            ) : null
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}