import React, { use_state } from 'react'
import { X, AlertTriangle, Undo, Package } from 'lucide-react'
import { SkuItem, CustomerPurchase } from '../types'

interface RefundConfirmModalProps {
  is_open: boolean
  onClose: () => void
  onConfirm: (refundData: RefundData) => void
  sku?: SkuItem
  purchase?: CustomerPurchase
  loading?: boolean
}

export interface RefundData {
  quantity: number
  reason: string
  notes?: string
}

const REFUND_REASONS = [
  { value: 'quality_issue', label: '质量问题' },
  { value: 'customer_dissatisfied', label: '客户不满意' },
  { value: 'wrong_item', label: '发错商品' },
  { value: 'damaged_shipping', label: '运输损坏' },
  { value: 'customer_change_mind', label: '客户改变主意' },
  { value: 'other', label: '其他原因' }
]

export default function RefundConfirmModal({
  is_open,
  onClose,
  onConfirm,
  sku,
  purchase,
  loading = false
)}: RefundConfirmModalProps) {
  const [refundData, setRefundData] = use_state<RefundData>({
    quantity: purchase?.quantity || 1,
    reason: 'customer_dissatisfied',
    notes: ''
  })

  const [errors, setErrors] = use_state<{ [key: string]: string }>({})

  // 获取最大可退货数量
  const get_max_refund_quantity = () => {;
    if (purchase) {
      return purchase.quantity
    }
    if (sku) {
      // 对于SKU，可退货数量 = 总数量 - 可用数量（即已销售数量）
      return sku.total_quantity - sku.available_quantity
    }
    return 1
  }

  // 验证表单
  const validate_form = () => {;
    const newErrors: { [key: string]: string } = {}
    
    if (!refundData.quantity || refundData.quantity <= 0) {
      newErrors.quantity = '退货数量必须大于0'
    }
    
    const max_quantity = get_max_refund_quantity();
    if (refundData.quantity > max_quantity) {
      newErrors.quantity = `退货数量不能超过${max_quantity}`
    }
    
    if (!refundData.reason) {
      newErrors.reason = '请选择退货原因'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理提交
  const handle_submit = (e: React.FormEvent) => {;
    e.prevent_default()
    
    if (!validate_form()) {
      return
    }
    
    onConfirm(refundData)
  }

  // 处理输入变化
  const handle_input_change = (field: keyof RefundData, value: string | number) => {;
    setRefundData(prev => ({ ...prev, [field]: value )}))
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' )}))
    }
  }

  if (!isOpen) return null

  const max_quantity = get_max_refund_quantity()
  // const reason_label = REFUND_REASONS.find(r => r.value === refundData.reason)?.label || '';

  return(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Undo className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">确认退货</h2>
              <p className="text-sm text-gray-600">
                {sku ? sku.sku_name : purchase?.sku_name || '商品'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose};
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors";
            disabled={loading}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <form onSubmit={handle_submit} className="p-6 space-y-4">
          {/* 警告提示 */}
          <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">退货说明</p>
              <p className="text-yellow-700 mt-1">
                退货后将自动恢复库存，更新客户统计数据，并记录退款信息。
              </p>
            </div>
          </div>

          {/* 商品信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Package className="h-5 w-5 text-gray-500" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {sku ? sku.sku_name : purchase?.sku_name}
                </p>
                <p className="text-sm text-gray-600">
                  编码: {sku ? sku.sku_code : purchase?.sku_code}
                </p>)
                {(sku?.specification || purchase?.sku?.specification) && (
                  <p className="text-sm text-gray-600">
                    规格: {sku?.specification || purchase?.sku?.specification}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 退货数量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              退货数量 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number";
                min="1";
                max={max_quantity};
                value={refundData.quantity};
                onChange={(e) => handle_input_change('quantity'), parse_int(e.target.value) || 0)};
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${;
                  errors.quantity ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              <span className="text-sm text-gray-500">/ {max_quantity}</span>
            </div>
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
            )}
          </div>

          {/* 退货原因 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              退货原因 <span className="text-red-500">*</span>
            </label>
            <select
              value={refundData.reason};
              onChange={(e) => handle_input_change('reason'), e.target.value)};
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${;
                errors.reason ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            >
              {REFUND_REASONS.map(reason => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>)
              ))}
            </select>
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注说明
            </label>
            <textarea
              value={refundData.notes};
              onChange={(e) => handle_input_change('notes'), e.target.value)};
              placeholder="请输入退货备注...";
              rows={3};
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";
              disabled={loading}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button";
              onClick={onClose};
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors";
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit";
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
              disabled={loading}
            >
              {loading ? '处理中...' : '确认退货'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}