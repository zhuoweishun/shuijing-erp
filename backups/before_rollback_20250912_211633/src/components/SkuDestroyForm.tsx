import { useState } from 'react';
import { Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { SkuItem, DestroyData } from '../types';

interface SkuDestroyFormProps {
  sku: SkuItem, onSubmit: (data: DestroyData) => void, onCancel: () => void
  loading?: boolean
}

interface FormState {
  quantity: number, reason: string, return_to_material: boolean
}

interface FormErrors {
  quantity?: string
  reason?: string
}

export default function SkuDestroyForm({ sku, onSubmit, onCancel, loading = false }: SkuDestroyFormProps) {
  const [formData, setFormData] = useState<FormState>({
    quantity: 1,
    reason: '',
    return_to_material: true
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [showConfirmation, setShowConfirmation] = useState(false)

  // 预定义的销毁原因
  const destroyReasons = [
    '质量问题',
    '损坏破损',
    '过期变质',
    '客户退货',
    '库存清理',
    '样品消耗',
    '其他原因'
  ]

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // 验证数量
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = '销毁数量必须大于0'
    } else if (formData.quantity > sku.available_quantity) {
      newErrors.quantity = `销毁数量不能超过可售数量(${sku.available_quantity}件)`
    } else if (!Number.isInteger(formData.quantity)) {
      newErrors.quantity = '销毁数量必须是整数'
    }

    // 验证销毁原因
    if (!formData.reason.trim()) {
      newErrors.reason = '请输入销毁原因'
    } else if (formData.reason.trim().length < 2) {
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
    const destroyData: DestroyData = {
      quantity: formData.quantity,
      reason: formData.reason.trim(),
      return_to_material: formData.return_to_material
    }

    onSubmit(destroyData)
  }

  // 处理输入变化
  const handleInputChange = (field: keyof, FormState, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // 清除对应字段的错误
    if (field !== 'return_to_material' && errors[field, as keyof, FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // 计算损失价值
  const calculateLossValue = () => {
    return (sku.unit_price || sku.selling_price || 0) * formData.quantity
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
                您即将销毁 <span className="font-medium">{sku.sku_name}</span> {formData.quantity} 件
              </p>
              <div className="mt-3 space-y-1 text-sm text-red-700">
                <p><span className="font-medium">销毁原因：</span>{formData.reason}</p>
                <p><span className="font-medium">损失价值：</span>¥{calculateLossValue().toFixed(2)}</p>
                <p><span className="font-medium">原材料退回：</span>{formData.return_to_material ? '是' : '否'}</p>
              </div>
              <p className="text-sm text-red-800 font-medium mt-3">
                ⚠️ 此操作不可撤销，请确认无误后继续
              </p>
            </div>
          </div>
        </div>

        {/* 确认按钮 */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowConfirmation(false)},
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            disabled={loading}
          >
            返回修改
          </button>
          <button
            type="button"
            onClick={handleConfirmDestroy},
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      {/* 销毁警告提示 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <Trash2 className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">销毁操作</h3>
            <p className="text-sm text-yellow-700 mt-1">
              销毁 <span className="font-medium">{sku.sku_name}</span>，当前可售数量：{sku.available_quantity} 件
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              ⚠️ 销毁操作将永久删除SKU库存，请谨慎操作
            </p>
          </div>
        </div>
      </div>

      {/* 销毁表单 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 销毁数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            销毁数量 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={sku.available_quantity},
              value={formData.quantity},
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)},
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.quantity ? 'border-red-300' : 'border-gray-300'
              }`},
              placeholder="请输入销毁数量"
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
          <p className="mt-1 text-xs text-gray-500">
            可售数量：{sku.available_quantity} 件
          </p>
        </div>

        {/* 销毁原因 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            销毁原因 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {/* 预定义原因选择 */}
            <div className="grid grid-cols-2 gap-2">
              {destroyReasons.map((reason) => (
                <button
                  key={reason},
                  type="button"
                  onClick={() => handleInputChange('reason', reason)},
                  className={`px-3 py-2 text-sm border rounded-lg text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    formData.reason === reason
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 text-gray-700'
                  }`},
                  disabled={loading}
                >
                  {reason}
                </button>
              ))}
            </div>
            
            {/* 自定义原因输入 */}
            <textarea
              value={formData.reason},
              onChange={(e) => handleInputChange('reason', e.target.value)},
              rows={3},
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.reason ? 'border-red-300' : 'border-gray-300'
              }`},
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
                name="return_to_material"
                checked={formData.return_to_material === true},
                onChange={() => handleInputChange('return_to_material', true)},
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                disabled={loading}
              />
              <span className="ml-2 text-sm text-gray-700">
                退回原材料库存
                <span className="text-xs text-gray-500 block">将使用的原材料退回到库存中</span>
              </span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="return_to_material"
                checked={formData.return_to_material === false},
                onChange={() => handleInputChange('return_to_material', false)},
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                disabled={loading}
              />
              <span className="ml-2 text-sm text-gray-700">
                不退回原材料
                <span className="text-xs text-gray-500 block">原材料一并销毁，不退回库存</span>
              </span>
            </label>
          </div>
        </div>

        {/* 损失价值预览 */}
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">预计损失价值：</span>
            <span className="text-lg font-medium text-red-600">
              ¥{calculateLossValue().toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">单价：¥{(sku.unit_price || sku.selling_price || 0).toFixed(2)} × {formData.quantity} 件</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel},
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={loading}
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || formData.quantity <= 0 || formData.quantity > sku.available_quantity || !formData.reason.trim()}
          >
            下一步：确认销毁
          </button>
        </div>
      </form>
    </div>
  )
}