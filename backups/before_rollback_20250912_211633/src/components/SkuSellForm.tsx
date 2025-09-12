import { useState } from 'react';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { SkuItem, SellData } from '../types';

interface SkuSellFormProps {
  sku: SkuItem, onSubmit: (data: SellData) => void, onCancel: () => void
  loading?: boolean
}

interface FormState {
  quantity: number, buyer_info: string, sale_channel: string, notes: string
}

interface FormErrors {
  quantity?: string
  buyer_info?: string
  sale_channel?: string
  notes?: string
}

export default function SkuSellForm({ sku, onSubmit, onCancel, loading = false }: SkuSellFormProps) {
  const [formData, setFormData] = useState<FormState>({
    quantity: 1,
    buyer_info: '',
    sale_channel: '',
    notes: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // 验证数量
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = '销售数量必须大于0'
    } else if (formData.quantity > sku.available_quantity) {
      newErrors.quantity = `销售数量不能超过可售数量(${sku.available_quantity}件)`
    } else if (!Number.isInteger(formData.quantity)) {
      newErrors.quantity = '销售数量必须是整数'
    }

    // 买家信息可选，但如果填写了要有基本验证
    if (formData.buyer_info && formData.buyer_info.trim().length < 2) {
      newErrors.buyer_info = '买家信息至少需要2个字符'
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

    const sellData: SellData = {
      quantity: formData.quantity,
      buyer_info: formData.buyer_info.trim() || undefined,
      sale_channel: formData.sale_channel.trim() || undefined,
      notes: formData.notes.trim() || undefined
    }

    onSubmit(sellData)
  }

  // 处理输入变化
  const handleInputChange = (field: keyof, FormState, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // 计算销售总价
  const calculateTotalPrice = () => {
    return (sku.unit_price || sku.selling_price || 0) * formData.quantity
  }

  return (
    <div className="space-y-6">
      {/* 销售确认提示 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <ShoppingCart className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-green-800">销售确认</h3>
            <p className="text-sm text-green-700 mt-1">
              确认销售 <span className="font-medium">{sku.sku_name}</span>，当前可售数量：{sku.available_quantity} 件
            </p>
          </div>
        </div>
      </div>

      {/* 销售表单 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 销售数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            销售数量 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={sku.available_quantity},
              value={formData.quantity},
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)},
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.quantity ? 'border-red-300' : 'border-gray-300'
              }`},
              placeholder="请输入销售数量"
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

        {/* 买家信息 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            买家信息
          </label>
          <input
            type="text"
            value={formData.buyer_info},
            onChange={(e) => handleInputChange('buyer_info', e.target.value)},
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
              errors.buyer_info ? 'border-red-300' : 'border-gray-300'
            }`},
            placeholder="买家姓名、联系方式等（可选）"
            disabled={loading}
          />
          {errors.buyer_info && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.buyer_info}
            </p>
          )}
        </div>

        {/* 销售渠道 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            销售渠道
          </label>
          <select
            value={formData.sale_channel},
            onChange={(e) => handleInputChange('sale_channel', e.target.value)},
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="">请选择销售渠道（可选）</option>
            <option value="线下门店">线下门店</option>
            <option value="微信">微信</option>
            <option value="淘宝">淘宝</option>
            <option value="京东">京东</option>
            <option value="拼多多">拼多多</option>
            <option value="抖音">抖音</option>
            <option value="小红书">小红书</option>
            <option value="其他">其他</option>
          </select>
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            备注信息
          </label>
          <textarea
            value={formData.notes},
            onChange={(e) => handleInputChange('notes', e.target.value)},
            rows={3},
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="销售备注、特殊要求等（可选）"
            disabled={loading}
          />
        </div>

        {/* 销售总价预览 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">销售总价：</span>
            <span className="text-lg font-medium text-green-600">
              ¥{calculateTotalPrice().toFixed(2)}
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
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || formData.quantity <= 0 || formData.quantity > sku.available_quantity}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                确认销售中...
              </div>
            ) : (
              '确认销售'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}