import { useState, useEffect } from 'react'
import { Search, Package, Calendar, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { SkuItem, TraceNode, SkuTraceResponse, MaterialTrace } from '../types'
import { skuApi } from '../services/api'

interface SkuTraceViewProps {
  sku: SkuItem
  loading?: boolean
}

export default function SkuTraceView({ sku, loading = false }: SkuTraceViewProps) {
  const [traceData, setTraceData] = useState<TraceNode[]>([])
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 获取真实溯源数据
  useEffect(() => {
    const fetchTraceData = async () => {
      setIsLoading(true)
      try {
        const response = await skuApi.getTraces(sku.id) as SkuTraceResponse
        
        if (response.success && response.data) {
          setTraceData(response.data.traces)
        } else {
          console.error('获取溯源数据失败:', response.message)
          setTraceData([])
        }
      } catch (error) {
        console.error('获取溯源数据失败:', error)
        setTraceData([])
      } finally {
        setIsLoading(false)
      }
    }

    if (sku.id) {
      fetchTraceData()
    }
  }, [sku.id])

  // 获取所有原材料数据
  const getAllMaterials = (): MaterialTrace[] => {
    const materials: MaterialTrace[] = []
    traceData.forEach(node => {
      if (node.materials && node.materials.length > 0) {
        materials.push(...node.materials)
      }
    })
    return materials
  }

  // 过滤原材料数据
  const filteredMaterials = getAllMaterials().filter(material => {
    const matchesSearch = material.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // 切换原材料展开状态
  const toggleMaterialExpansion = (materialId: string) => {
    const newExpanded = new Set(expandedMaterials)
    if (newExpanded.has(materialId)) {
      newExpanded.delete(materialId)
    } else {
      newExpanded.add(materialId)
    }
    setExpandedMaterials(newExpanded)
  }

  // 获取原材料对应的采购详情
  const getPurchaseDetails = (material: MaterialTrace) => {
    // 从traceData中找到对应的采购详情
    for (const node of traceData) {
      if (node.materials.some(m => m.material_id === material.material_id)) {
        return {
          purchaseDate: node.timestamp,
          operator: node.operator,
          location: node.location,
          batchNumber: material.batch_number,
          supplier: material.supplier,
          details: node.details
        }
      }
    }
    return null
  }

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 获取品相显示文本
  const getQualityText = (details: any) => {
    return details?.quality_grade || '未知品相'
  }

  // 获取规格显示文本
  const getSpecificationText = (details: any) => {
    // 优先使用bead_diameter（珠径），其次使用diameter，最后使用specification
    if (details?.bead_diameter && details.bead_diameter !== '未设置') {
      const beadDiameterStr = String(details.bead_diameter)
      return beadDiameterStr.includes('mm') ? beadDiameterStr : `${beadDiameterStr}mm`
    }
    if (details?.diameter && details.diameter !== '未设置') {
      const diameterStr = String(details.diameter)
      return diameterStr.includes('mm') ? diameterStr : `${diameterStr}mm`
    }
    if (details?.specification && details.specification !== '未设置') {
      const specificationStr = String(details.specification)
      return specificationStr.includes('mm') ? specificationStr : `${specificationStr}mm`
    }
    return '未知规格'
  }



  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载溯源信息...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索原材料或供应商..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 原材料列表 */}
      <div className="space-y-3">
        {filteredMaterials.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无原材料溯源记录</p>
          </div>
        ) : (
          filteredMaterials.map((material, index) => {
            const materialKey = `${material.material_id}-${index}`
            const isExpanded = expandedMaterials.has(materialKey)
            const purchaseDetails = getPurchaseDetails(material)
            
            return (
              <div key={materialKey} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {/* 原材料主要信息 - 一行显示 */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleMaterialExpansion(materialKey)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex items-center space-x-4">
                      {/* 原材料图标 */}
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      {/* 原材料信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-gray-900 truncate">
                            {material.material_name}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-blue-600 font-medium">
                            {purchaseDetails ? getQualityText(purchaseDetails.details) : '未知品相'}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-green-600 font-medium">
                            ¥{material.cost_per_unit.toFixed(2)}/{material.unit}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-orange-600 font-medium">
                            使用{material.quantity_used}{material.unit}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          供应商：{material.supplier} | 规格：{purchaseDetails ? getSpecificationText(purchaseDetails.details) : '未知'}
                        </div>
                      </div>
                    </div>
                    
                    {/* 展开/收起按钮 */}
                    <div className="flex-shrink-0 ml-4">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 采购详情展开区域 */}
                {isExpanded && purchaseDetails && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      采购详情
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 基本采购信息 */}
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-500">采购日期：</span>
                          <span className="text-gray-900">{formatTime(purchaseDetails.purchaseDate)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">采购人员：</span>
                          <span className="text-gray-900">{purchaseDetails.operator}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">供应商：</span>
                          <span className="text-gray-900">{material.supplier}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">批次号：</span>
                          <span className="text-gray-900">{purchaseDetails.batchNumber}</span>
                        </div>
                      </div>
                      
                      {/* 详细规格信息 */}
                      <div className="space-y-2">
                        {purchaseDetails.details && Object.entries(purchaseDetails.details)
                          .filter(([key]) => {
                            // 过滤掉在基本采购信息中已经显示的字段，避免重复
                            const excludeFields = ['supplier', 'batch_number']
                            return !excludeFields.includes(key)
                          })
                          .map(([key, value]) => {
                            // 将英文字段名转换为中文
                            const fieldNameMap: { [key: string]: string } = {
                              'quantity': '数量',
                              'quality_grade': '品相等级',
                              'diameter': '直径',
                              'purchase_price': '采购价格',
                              'product_name': '产品名称',
                              'product_type': '产品类型',
                              'unit_price': '单价',
                              'total_price': '总价',
                              'weight': '重量',
                              'bead_diameter': '珠径',
                              'specification': '规格',
                              'piece_count': '件数',
                              'notes': '备注'
                            }
                            const displayName = fieldNameMap[key] || key
                            
                            return (
                              <div key={key} className="text-sm">
                                <span className="text-gray-500">{displayName}：</span>
                                <span className="text-gray-900">
                                  {Array.isArray(value) ? value.join(', ') : String(value)}
                                </span>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                    
                    {/* 成本信息 */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h6 className="text-sm font-medium text-gray-900 mb-2">成本明细</h6>
                      <div className="bg-white rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">单价：</span>
                            <span className="text-gray-900 font-medium">¥{material.cost_per_unit.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">使用量：</span>
                            <span className="text-gray-900 font-medium">{material.quantity_used}{material.unit}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">总成本：</span>
                            <span className="text-green-600 font-medium">¥{(material.cost_per_unit * material.quantity_used).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}