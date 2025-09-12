import { useState } from 'react'
import { Package, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { SkuItem, AdjustData } from '../types'

interface SkuAdjustFormProps {
  sku: SkuItem
  on_submit: (data: AdjustData) => void
  onCancel: () => void
  loading?: boolean
}

interface FormState {
  type: 'increase' | 'decrease'
  quantity: number
  reason: string
  cost_adjustment: number
}

interface FormErrors {
  quantity?: string
  reason?: string
  costAdjustment?: string
}

export default function SkuAdjustForm({ sku, on_submit, onCancel, loading = false }: SkuAdjustFormProps) {
  const [formData, setFormData] = useState<FormState>({
    type: 'increase',
    quantity: 1,
    reason: '',
    cost_adjustment: 0
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // 预定义的调整原因
  const adjustReasons = {
    increase: [
      '盘点盈余',
      '退货入库',
      '生产补充',
      '供应商补发',
      '初始库存录入',
      '其他增加'
    ],
    decrease: [
      '盘点亏损',
      '损坏报废',
      '样品消耗',
      '丢失遗失',
      '质量问题',
      '其他减少'
    ]
  }

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // 验证数量
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = '调整数量必须大于0'
    } else if (!Number.isInteger(formData.quantity)) {
      newErrors.quantity = '调整数量必须是整数'
    } else if (formData.type === 'decrease' && formData.quantity > sku.available_quantity) {
      newErrors.quantity = `减少数量不能超过当前库存(${sku.available_quantity}件)`
    }

    // 验证调整原因
    if (!formData.reason.trim()) {
      newErrors.reason = '请输入调整原因'
    } else if (formData.reason.trim().length < 2) {
      newErrors.reason = '调整原因至少需要2个字符'
    }

    // 验证成本调整
    if (formData.cost_adjustment < 0) {
      newErrors.cost_adjustment = '成本调整不能为负数'
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

    const adjustData: AdjustData = {
      type: formData.type,
      quantity: formData.quantity,
      reason: formData.reason.trim(),
      cost_adjustment: formData.cost_adjustment
    }

    on_submit(adjustData)
  }

  // 处理输入变化
  const handleInputChange = (field: keyof FormState, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // 清除对应字段的错误
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }

    // 切换调整类型时清空原因
    if (field === 'type') {
      setFormData(prev => ({ ...prev, reason: '' }))
    }
  }

  // 计算调整后的库存
  const calculateNewQuantity = () => {
    if (formData.type === 'increase') {
      return sku.available_quantity + formData.quantity
    } else {
      return sku.available_quantity - formData.quantity
    }
  }

  // 计算单位成本
  const unitCost = sku.materialCost || sku.selling_price || 0
  
  // 计算调整后的总成本
  const calculateNewTotalCost = () => {
    const currentTotalCost = unitCost * sku.available_quantity
    
    if (formData.type === 'increase') {
      return currentTotalCost + (formData.cost_adjustment * formData.quantity)
    } else {
      const removedCost = unitCost * formData.quantity
      return currentTotalCost - removedCost
    }
  }

  // 计算调整后的单位成本
  const calculateNewUnitCost = () => {
    const newQuantity = calculateNewQuantity()
    const newTotalCost = calculateNewTotalCost()
    
    if (newQuantity <= 0) return 0
    return newTotalCost / newQuantity
  }

  return (
    <div className="space-y-6">
      {/* 当前库存信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Package className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">当前库存信息</h3>
            <div className="mt-2 space-y-1 text-sm text-blue-700">
              <p><span className="font-medium">SKU名称：</span>{sku.sku_name}</p>
              <p><span className="font-medium">当前库存：</span>{sku.available_quantity} 件</p>
              <p><span className="font-medium">单位成本：</span>¥{unitCost.toFixed(2)}</p>
              <p><span className="font-medium">总成本：</span>¥{(unitCost * sku.available_quantity).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 调整表单 */}
      <form on_submit={handleSubmit} className="space-y-4">
        {/* 调整类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            调整类型 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleInputChange('type', 'increase')}
              className={`flex items-center justify-center px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formData.type === 'increase'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              disabled={loading}
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              库存增加
            </button>
            <button
              type="button"
              onClick={() => handleInputChange('type', 'decrease')}
              className={`flex items-center justify-center px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formData.type === 'decrease'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              disabled={loading}
            >
              <TrendingDown className="h-5 w-5 mr-2" />
              库存减少
            </button>
          </div>
        </div>

        {/* 调整数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            调整数量 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={formData.type === 'decrease' ? sku.available_quantity : undefined}
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.quantity ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请输入调整数量"
              disabled={loading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-sm text-gray-500">件</span>
            </div>
          </div>
          {errors.quantity && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.quantity}
            </p>
          )}
          {formData.type === 'decrease' && (
            <p className="mt-1 text-xs text-gray-500">
              最大可减少：{sku.available_quantity} 件
            </p>
          )}
        </div>

        {/* 调整原因 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            调整原因 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {/* 预定义原因选择 */}
            <div className="grid grid-cols-2 gap-2">
              {adjustReasons[formData.type].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleInputChange('reason', reason)}
                  className={`px-3 py-2 text-sm border rounded-lg text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formData.reason === reason
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700'
                  }`}
                  disabled={loading}
                >
                  {reason}
                </button>
              ))}
            </div>
            
            {/* 自定义原因输入 */}
            <textarea
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.reason ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请选择或输入调整原因..."
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

        {/* 成本调整 */}
        {formData.type === 'increase' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              单位成本调整
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_adjustment}
                onChange={(e) => handleInputChange('costAdjustment', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.cost_adjustment ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={loading}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-sm text-gray-500">¥/件</span>
              </div>
            </div>
            {errors.cost_adjustment && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.cost_adjustment}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              增加库存时的单位成本，默认使用当前成本 ¥{unitCost.toFixed(2)}
            </p>
          </div>
        )}

        {/* 调整预览 */}
        <div className={`rounded-lg p-4 ${
          formData.type === 'increase' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <h3 className={`text-sm font-medium mb-3 ${
            formData.type === 'increase' ? 'text-green-800' : 'text-red-800'
          }`}>
            调整预览
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">当前数量：</span>
              <span className="font-medium">{sku.available_quantity} 件</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                {formData.type === 'increase' ? '增加数量：' : '减少数量：'}
              </span>
              <span className={`font-medium ${
                formData.type === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {formData.type === 'increase' ? '+' : '-'}{formData.quantity} 件
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-gray-600">调整后数量：</span>
              <span className="font-medium text-lg">{calculateNewQuantity()} 件</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">调整后单位成本：</span>
              <span className="font-medium">¥{calculateNewUnitCost().toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">调整后总成本：</span>
              <span className="font-medium">¥{calculateNewTotalCost().toFixed(2)}</span>
            </div>
          </div>
        </div>

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
            className={`flex-1 px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              formData.type === 'increase'
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
            disabled={loading || formData.quantity <= 0 || !formData.reason.trim() || (formData.type === 'decrease' && formData.quantity > sku.available_quantity)}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                调整中...
              </div>
            ) : (
              `确认${formData.type === 'increase' ? '增加' : '减少'}库存`
            )}
          </button>
        </div>
      </form>
    </div>
  )
}