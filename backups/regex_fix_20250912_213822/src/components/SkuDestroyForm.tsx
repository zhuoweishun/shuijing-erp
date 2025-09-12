import { useState, useEffect } from 'react'
import { Trash2, AlertTriangle, AlertCircle, Package } from 'lucide-react'
import { SkuItem, DestroyData, SkuMaterialInfo } from '../types'
import { sku_api } from '../services/api'

interface SkuDestroyFormProps {
  sku: SkuItem;
  on_submit: (data: DestroyData) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface FormState {
  quantity: number;
  reason: string;
  return_to_material: boolean;
  selected_materials: string[];
  materials: SkuMaterialInfo[];
  custom_return_quantities: { [purchase_id: string]: number }
}

interface FormErrors {
  quantity?: string;
  reason?: string;
}

export default function SkuDestroyForm({ sku, on_submit, onCancel, loading = false }: SkuDestroyFormProps) {
  const [form_data, setFormData] = useState<FormState>({
    quantity: 1,
    reason: '',
    return_to_material: true,
    selected_materials: [],
    materials: [],
    custom_return_quantities: {}
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loadingMaterials, setLoadingMaterials] = useState(false)

  // 根据销毁原因自动设置原材料处理选项
  useEffect(() => {
    if (form_data.reason === '赠送销毁' || form_data.reason === '库存遗失') {
      // 赠送销毁和库存遗失不退回原材料
      setFormData(prev => ({ ...prev, return_to_material: false }))
    } else if (form_data.reason === '拆散重做') {
      // 拆散重做退回原材料，并加载原材料列表
      setFormData(prev => ({ ...prev, return_to_material: true }))
      loadSkuMaterials()
    } else if (form_data.reason && !destroyReasons.includes(form_data.reason)) {
      // 自定义原因默认不退回原材料
      setFormData(prev => ({ ...prev, return_to_material: false }))
    }
  }, [form_data.reason])

  // 加载SKU的原材料信息
  const loadSkuMaterials = async () => {
    const sku_id = sku.sku_id || sku.id
    if (!sku_id) {
      console.error('SKU ID不存在:', { sku })
      return
    }
    
    setLoadingMaterials(true)
    try {
      console.log('🔍 开始获取SKU原材料信息:', { sku_id })
      
      const result = await sku_api.get_materials(sku_id)
      
      console.log('📦 SKU原材料API响应:', result)
      
      if (result.success) {
        const materials = (result.data as any)?.materials || []
        console.log('✅ 成功获取原材料信息:', materials)
        
        // 初始化自定义退回数量（简化版）
        const initialCustomQuantities: { [purchase_id: string]: number } = {}
        materials.forEach((material: SkuMaterialInfo) => {
          // 简化：直接使用数字转换
          initialCustomQuantities[material.purchase_id] = Number(material.quantity_used_beads) || 0
        })
        
        console.log('🔍 [原材料初始化] 初始化自定义退回数量:', {
          materialsCount: materials.length,
          initialCustomQuantities,
          sampleMaterial: materials[0]
        })
        
        setFormData(prev => ({
          ...prev,
          materials: materials,
          selected_materials: materials.map((m: SkuMaterialInfo) => m.purchase_id), // 默认全选
          custom_return_quantities: initialCustomQuantities
        }))
      } else {
        throw new Error(result.message || '获取原材料信息失败')
      }
    } catch (error) {
      console.error('❌ 加载原材料信息失败:', {
        error,
        sku_id,
        errorMessage: error instanceof Error ? error.message : '未知错误'
      })
      
      // 如果加载失败，使用空数组
      setFormData(prev => ({
        ...prev,
        materials: [],
        selected_materials: []
      }))
    } finally {
      setLoadingMaterials(false)
    }
  }

  // 预定义的销毁原因（只保留三个核心选项）
  const destroyReasons = [
    '赠送销毁',
    '库存遗失', 
    '拆散重做'
  ]

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // 验证数量
    if (!form_data.quantity || form_data.quantity <= 0) {
      newErrors.quantity = '销毁数量必须大于0'
    } else if (form_data.quantity > sku.available_quantity) {
      newErrors.quantity = `销毁数量不能超过当前库存(${sku.available_quantity}件)`
    } else if (!Number.is_integer(form_data.quantity)) {
      newErrors.quantity = '销毁数量必须是整数'
    }

    // 验证销毁原因
    if (!form_data.reason.trim()) {
      newErrors.reason = '请输入销毁原因'
    } else if (form_data.reason.trim().length < 2) {
      newErrors.reason = '销毁原因至少需要2个字符'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // 显示确认对话框
    setShowConfirmation(true)
  }

  // 确认销毁
  const handleConfirmDestroy = () => {
    // 简化数据处理：直接使用退回数量
    let returnQuantities: { [purchase_id: string]: number } | undefined = undefined
    
    if (form_data.reason === '拆散重做' && form_data.custom_return_quantities) {
      returnQuantities = {}
      Object.entries(form_data.custom_return_quantities).forEach(([material_id, quantity]) => {
        // 直接使用数字作为退回数量
        returnQuantities![material_id] = Number(quantity) || 0
      })
    }
    
    const destroyData: DestroyData = {
      quantity: form_data.quantity,
      reason: form_data.reason.trim(),
      return_to_material: form_data.return_to_material,
      selected_materials: form_data.reason === '拆散重做' ? form_data.selected_materials : undefined,
      custom_return_quantities: returnQuantities
    }

    console.log('🔍 [销毁数据调试] 发送的数据:', {
      destroyData,
      returnQuantitiesType: typeof destroyData.custom_return_quantities,
      returnQuantitiesKeys: destroyData.custom_return_quantities ? Object.keys(destroyData.custom_return_quantities) : [],
      sampleValue: destroyData.custom_return_quantities ? Object.values(destroyData.custom_return_quantities)[0] : null
    })

    on_submit(destroyData)
  }

  // 处理输入变化
  const handleInputChange = (field: keyof FormState, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // 清除对应字段的错误
    if (field !== 'returnToMaterial' && errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // 处理原材料选择变化
  const handleMaterialSelection = (material_id: string, selected: boolean) => {
    setFormData(prev => ({
      ...prev,
      selected_materials: selected 
        ? [...prev.selected_materials, material_id]
        : prev.selected_materials.filter(id => id !== material_id)
    }))
  }

  // 全选/取消全选原材料
  const handleSelectAllMaterials = (selectAll: boolean) => {
    setFormData(prev => ({
      ...prev,
      selected_materials: selectAll ? prev.materials.map(m => m.purchase_id) : []
    }))
  }

  // 处理自定义退回数量变化（简化版）
  const handleCustomQuantityChange = (material_id: string, value: number) => {
    const numericValue = Math.max(0, Number(value) || 0) // 简化：确保是非负数字
    
    setFormData(prev => {
      console.log('🔍 [数量变化] 更新退回数量:', {
        material_id,
        oldValue: prev.custom_return_quantities[material_id],
        newValue: numericValue,
        inputValue: value
      })
      
      return {
        ...prev,
        custom_return_quantities: {
          ...prev.custom_return_quantities,
          [material_id]: numericValue
        }
      }
    })
  }

  // 获取原材料的最大可退回数量
  const getMaxReturnQuantity = (material: SkuMaterialInfo) => {
    // 使用单个SKU的配方数量（同时考虑颗数和件数）
    const singleSkuBeads = material.quantity_used_beads || 0
    const singleSkuPieces = material.quantity_used_pieces || 0
    const singleSkuQuantity = singleSkuBeads + singleSkuPieces
    
    // 确保销毁数量大于0
    const destroyQuantity = Math.max(1, form_data.quantity || 1)
    
    console.log('🔍 [最大退回数量] 计算过程:', {
      material_name: material.material_name,
      quantity_used_beads: material.quantity_used_beads,
      quantity_used_pieces: material.quantity_used_pieces,
      singleSkuQuantity,
      destroyQuantity,
      maxReturn: singleSkuQuantity * destroyQuantity
    })
    
    // 最大退回数量 = 单个SKU配方数量 * 销毁数量
    return singleSkuQuantity * destroyQuantity
  }

  if (showConfirmation) {
    return (
      <div className="space-y-6">
        {/* 确认警告 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">确认销毁操作</h3>
              <p className="text-sm text-red-700 mt-2">
                您即将销毁 <span className="font-medium">{form_data.quantity}</span> 件 
                <span className="font-medium">{sku.sku_name}</span>
              </p>
              <p className="text-sm text-red-700 mt-1">
                销毁原因：<span className="font-medium">{form_data.reason}</span>
              </p>
              {form_data.return_to_material && (
                <p className="text-sm text-red-700 mt-1">
                  原材料处理：退回到库存
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 确认按钮 */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowConfirmation(false)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            disabled={loading}
          >
            返回修改
          </button>
          <button
            type="button"
            onClick={handleConfirmDestroy}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                销毁中...
              </div>
            ) : (
              '确认销毁'
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form on_submit={handleSubmit} className="space-y-6">
        {/* 销毁信息 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <Trash2 className="h-6 w-6 text-red-500 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-800">SKU销毁</h3>
              <p className="text-sm text-red-700 mt-1">
                销毁 <span className="font-medium">{sku.sku_name}</span>，当前库存：{sku.available_quantity} 件
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ 销毁操作将永久删除SKU库存，请谨慎操作
              </p>
            </div>
          </div>
        </div>

        {/* 销毁数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            销毁数量 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={sku.available_quantity}
              value={form_data.quantity}
              onChange={(e) = /> handleInputChange('quantity', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.quantity ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请输入销毁数量"
              disabled={loading}
            />
          </div>
          {errors.quantity && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.quantity}
            </p>
          )}
        </div>

        {/* 销毁原因 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            销毁原因 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {/* 预定义原因按钮 */}
            <div className="flex flex-wrap gap-2">
              {destroyReasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleInputChange('reason', reason)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    form_data.reason === reason
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={loading}
                >
                  {reason}
                </button>
              ))}
            </div>
            
            {/* 自定义原因输入 */}
            <textarea
              value={form_data.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.reason ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请选择或输入销毁原因..."
              disabled={loading}
            />
          </div>
          {errors.reason && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.reason}
            </p>
          )}
        </div>

        {/* 原材料退回选项 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            原材料处理
          </label>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="returnToMaterial"
                checked={form_data.return_to_material === true}
                onChange={() = /> handleInputChange('returnToMaterial', true)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                disabled={loading || (form_data.reason === '赠送销毁' || form_data.reason === '库存遗失')}
              />
              <span className="ml-2 text-sm text-gray-700">
                退回原材料库存
                <span className="text-xs text-gray-500 block">将使用的原材料退回到库存中</span>
              </span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="returnToMaterial"
                checked={form_data.return_to_material === false}
                onChange={() = /> handleInputChange('returnToMaterial', false)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                disabled={loading || form_data.reason === '拆散重做'}
              />
              <span className="ml-2 text-sm text-gray-700">
                不退回原材料
                <span className="text-xs text-gray-500 block">原材料一并销毁，不退回库存</span>
              </span>
            </label>
          </div>
          
          {/* 原因说明 */}
          {(form_data.reason === '赠送销毁' || form_data.reason === '库存遗失') && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              💡 {form_data.reason}不支持退回原材料
            </div>
          )}
          {form_data.reason === '拆散重做' && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              💡 拆散重做必须退回原材料到库存
            </div>
          )}
        </div>

        {/* 原材料选择界面（仅当选择"拆散重做"时显示） */}
        {form_data.reason === '拆散重做' && form_data.return_to_material && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                <Package className="inline h-4 w-4 mr-1" />
                选择要退回的原材料
              </label>
              {loadingMaterials ? (
                <div className="text-xs text-gray-500">加载中...</div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllMaterials(true)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    disabled={loading}
                  >
                    全选
                  </button>
                  <span className="text-xs text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllMaterials(false)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    disabled={loading}
                  >
                    取消全选
                  </button>
                </div>
              )}
            </div>
            
            {loadingMaterials ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-sm text-gray-500">正在加载原材料信息...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {form_data.materials.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    暂无原材料信息
                  </div>
                ) : (
                  form_data.materials.map((material) => (
                    <label key={material.purchase_id} className="flex items-start space-x-3 p-2 border border-gray-100 rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form_data.selected_materials.includes(material.purchase_id)}
                        onChange={(e) = /> handleMaterialSelection(material.purchase_id, e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={loading}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {material.material_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          供应商: {material.supplier_name || '未知'}
                        </div>
                        
                        {/* 自定义退回数量输入 */}
                        <div className="mt-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-600 w-16">退回数量:</span>
                            <input
                              type="number"
                              min="0"
                              max={getMaxReturnQuantity(material)}
                              value={form_data.custom_return_quantities[material.purchase_id] || 0}
                              onChange={(e) = /> handleCustomQuantityChange(material.purchase_id, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              disabled={loading || !form_data.selected_materials.includes(material.purchase_id)}
                            />
                            <span className="text-xs text-gray-500">/ {getMaxReturnQuantity(material)} {material.quantity_used_beads > 0 ? '颗' : '件'}</span>
                          </div>
                          
                          {/* 显示计算后的成本 */}
                          {form_data.custom_return_quantities[material.purchase_id] > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {(() => {
                                const returnQuantity = form_data.custom_return_quantities[material.purchase_id] || 0;
                                
                                // 使用后端返回的unit_cost字段（已根据产品类型选择正确的价格字段）
                                if (material.unit_cost && material.unit_cost > 0) {
                                  const totalCost = material.unit_cost * returnQuantity;
                                  return <div>退回成本: ¥{totalCost.toFixed(2)}</div>;
                                } else {
                                  return <div>退回成本: 暂无价格数据</div>;
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
            
            <div className="mt-3 text-xs text-gray-500">
              已选择 {form_data.selected_materials.length} / {form_data.materials.length} 项原材料
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={loading}
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || form_data.quantity <= 0 || form_data.quantity > sku.available_quantity || !form_data.reason.trim()}
          >
            下一步：确认销毁
          </button>
        </div>
      </form>
    </div>
  )
}