import { useState, useEffect } from 'react'
import { Package, Calendar, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { SkuItem } from '../types'
import { sku_api } from '../services/api'

interface SkuTraceViewProps {
  sku: SkuItem
}

export default function SkuTraceView({ sku }: SkuTraceViewProps) {
  const [recipeData, setRecipeData] = useState<any[]>([])
  const [, setSkuInfo] = useState<any>(null)
  const [, setSummary] = useState<any>(null)
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set())
  const [is_loading, set_is_loading] = useState(false)

  // 获取SKU制作配方数据
  useEffect(() => {
    const fetchRecipeData = async () => {
      set_is_loading(true)
      try {
        const response = await sku_api.get_traces(sku.id)
        
        if (response.success) {
          const data = response.data as any
          setRecipeData(data.traces || [])
          setSkuInfo(data.sku_info || null)
          setSummary(data.summary || null)
        } else {
          console.error('获取制作配方失败:', response.message)
          setRecipeData([])
        }
      } catch (error) {
        console.error('获取制作配方失败:', error)
        setRecipeData([])
      } finally {
        set_is_loading(false)
      }
    }

    if (sku.id) {
      fetchRecipeData()
    }
  }, [sku.id])

  // 获取制作配方数据（直接使用recipeData）
  const filteredMaterials = recipeData

  // 切换原材料展开状态
  const toggleMaterialExpansion = (material_id: string) => {
    const newExpanded = new Set(expandedMaterials)
    if (newExpanded.has(material_id)) {
      newExpanded.delete(material_id)
    } else {
      newExpanded.add(material_id)
    }
    setExpandedMaterials(newExpanded)
  }

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    })
  }

  // 辅助函数已移除，如需要可重新添加



  if (is_loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载溯源信息...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 制作配方列表 */}
      <div className="space-y-3">
        {filteredMaterials.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无制作配方记录</p>
          </div>
        ) : (
          filteredMaterials.map((recipe, index) => {
            const materialKey = `${recipe.id}-${index}`
            const isExpanded = expandedMaterials.has(materialKey)
            
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
                            {recipe.materials?.[0]?.material_name || '未知材料'}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-blue-600 font-medium">
                            {recipe.details?.quality_grade || '未设置'}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-green-600 font-medium">
                            ¥{recipe.materials?.[0]?.cost_per_unit?.toFixed(2) || '0.00'}/{recipe.materials?.[0]?.unit || '件'}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-orange-600 font-medium">
                            需要{recipe.materials?.[0]?.quantity_used || 0}{recipe.materials?.[0]?.unit || '件'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          供应商：{recipe.details?.supplier || '未知'} | 规格：{recipe.details?.diameter || '未设置'} | CG编号：{recipe.details?.batch_number || '无'}
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
                
                {/* 配方详情展开区域 */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      配方详情
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 基本配方信息 */}
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-500">原材料名称：</span>
                          <span className="text-gray-900">{recipe.materials?.[0]?.material_name || '未知材料'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">规格：</span>
                          <span className="text-gray-900">{recipe.details?.diameter || '未设置'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">供应商：</span>
                          <span className="text-gray-900">{recipe.details?.supplier || '未知供应商'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">CG编号：</span>
                          <span className="text-gray-900">{recipe.details?.batch_number || '无批次号'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">品质等级：</span>
                          <span className="text-gray-900">{recipe.details?.quality_grade || '未设置'}</span>
                        </div>
                      </div>
                      
                      {/* 配方用量信息 */}
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-500">单个SKU需要：</span>
                          <span className="text-gray-900 font-medium">{recipe.materials?.[0]?.quantity_used || 0}{recipe.materials?.[0]?.unit || '件'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">单位成本：</span>
                          <span className="text-gray-900 font-medium">¥{recipe.materials?.[0]?.cost_per_unit?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">单个SKU成本：</span>
                          <span className="text-green-600 font-medium">¥{((recipe.materials?.[0]?.cost_per_unit || 0) * (recipe.materials?.[0]?.quantity_used || 0)).toFixed(2)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">采购日期：</span>
                          <span className="text-gray-900">{formatTime(recipe.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 配方说明 */}
                    {recipe.details?.description && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h6 className="text-sm font-medium text-gray-900 mb-2">配方说明</h6>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-sm text-gray-700">{recipe.details.description}</p>
                        </div>
                      </div>
                    )}
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