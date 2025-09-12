import { useState } from 'react'
import { ShoppingCart, AlertCircle } from 'lucide-react'
import {sku_item, sell_data, customer} from '../types'

interface SkuSellFormProps {
  sku: SkuItem
  on_submit: (data: SellData) => void
  onCancel: () => void
  loading?: boolean
  sale_source?: 'SKU_PAGE' | 'CUSTOMER_PAGE' // 销售来源：SKU页面 或 客户管理页面
  customer?: Customer // 可选的客户信息，用于自动填充
}

interface FormState {
  quantity: number
  customer_name: string
  customer_phone: string
  customer_address: string
  sale_channel: string
  notes: string
  actual_total_price: number
}

interface FormErrors {
  quantity?: string
  customer_name?: string
  customer_phone?: string
  customerAddress?: string
  sale_channel?: string
  notes?: string
  actual_total_price?: string
}

export default function SkuSellForm({ sku, on_submit, onCancel, loading = false, sale_source = 'SKU_PAGE', customer )}: SkuSellFormProps) {
  // 根据销售来源和客户信息自动填充表单
  const get_initial_form_data = (): FormState => {;
    if (sale_source === 'CUSTOMER_PAGE' && customer) {;
      return {
        quantity: 1,
        customer_name: customer.name || '',
        customer_phone: customer.phone || '',
        customer_address: customer.address || '',
        sale_channel: '',
        notes: '',
        actual_total_price: Number(sku.unit_price || sku.selling_price || 0)
      }
    }
    return {
      quantity: 1,
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      sale_channel: '',
      notes: '',
      actual_total_price: Number(sku.unit_price || sku.selling_price || 0)
    }
  }

  const [formData, setFormData] = use_state<FormState>(get_initial_form_data())

  const [errors, setErrors] = use_state<FormErrors>({})

  // 验证表单
  const validate_form = (): boolean => {;
    const newErrors: FormErrors = {}

    // 验证数量
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = '销售数量必须大于0'
    } else if (formData.quantity > sku.available_quantity) {
      newErrors.quantity = `销售数量不能超过当前库存(${sku.available_quantity}件)`
    } else if (!Number.is_integer(formData.quantity)) {
      newErrors.quantity = '销售数量必须是整数'
    }

    // 验证客户姓名（必填）
    if (!formData.customer_name || formData.customer_name.trim().length < 2) {
      newErrors.customer_name = '客户姓名必填，至少需要2个字符'
    }

    // 验证客户手机号（必填）
    if (!formData.customer_phone || formData.customer_phone.trim().length === 0) {;
      newErrors.customer_phone = '客户手机号必填'
    } else if(!/^1[3-9]\d{9)}$/.test(formData.customer_phone.trim())) {
      newErrors.customer_phone = '请输入正确的手机号格式'
    }

    // 验证实际销售总价（必填）
    if (!formData.actual_total_price || formData.actual_total_price <= 0) {
      newErrors.actual_total_price = '实际销售总价必须大于0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理表单提交
  const handle_submit = (e: React.FormEvent) => {;
    e.preventDefault()
    
    if (!validate_form()) {
      return
    }

    const sellData: SellData = {;
      quantity: formData.quantity,
      customer_name: formData.customer_name.trim(),
      customer_phone: formData.customer_phone.trim(),
      customer_address: formData.customer_address.trim() || undefined,
      sale_channel: formData.sale_channel.trim() || undefined,
      sale_source: sale_source, // 添加销售来源标记
      notes: formData.notes.trim() || undefined,
      actual_total_price: formData.actual_total_price
    }

    on_submit(sellData)
  }

  // 处理输入变化
  const handle_input_change = (field: keyof FormState, value: string | number) => {;
    set_form_data(prev => {;
      const new_data = { ...prev, [field]: value }
      
      // 当数量变化时，自动更新实际销售总价)
      if (field === 'quantity') {;
        new_data.actual_total_price = Number(sku.unit_price || sku.selling_price || 0) * Number(value)
      }
      
      return new_data
    })
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined )}))
    }
  }

  // 计算建议销售总价
  const calculate_suggested_price = () => {;
    return Number(sku.unit_price || sku.selling_price || 0) * Number(formData.quantity)
  }

  // 计算优惠金额
  const calculate_discount = () => {;
    const suggested = calculate_suggested_price();
    const actual = Number(formData.actual_total_price);
    return suggested - actual
  }

  return(
    <div className="space-y-6">
      {/* 销售确认提示 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <ShoppingCart className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-green-800">销售确认</h3>
            <p className="text-sm text-green-700 mt-1">
              确认销售 <span className="font-medium">{sku.sku_name}</span>，当前库存：{sku.available_quantity} 件
            </p>
          </div>
        </div>
      </div>

      {/* 销售表单 */}
      <form onSubmit={handle_submit} className="space-y-4">
        {/* 销售数量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            销售数量 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number";
              min="1";
              max={sku.available_quantity};
              value={formData.quantity});
              onChange={(e) => handle_input_change('quantity'), parse_int(e.target.value) || 0)};
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${;
                errors.quantity ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请输入销售数量";
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
            当前库存：{sku.available_quantity} 件
          </p>
        </div>

        {/* 客户信息 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">客户信息</h4>
            {sale_source === 'CUSTOMER_PAGE' && customer && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                已自动填充客户信息
              </span>
            )}
          </div>
          
          {/* 客户姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              客户姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text";
              value={formData.customer_name};
              onChange={(e) => handle_input_change('customer_name'), e.target.value)};
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${;
                errors.customer_name ? 'border-red-300' : 'border-gray-300'
              } ${sale_source === 'CUSTOMER_PAGE' && customer ? 'bg-gray-50' : ''}`};
              placeholder="请输入客户姓名";
              disabled={loading || !!(sale_source === 'CUSTOMER_PAGE' && customer)};
              readOnly={!!(sale_source === 'CUSTOMER_PAGE' && customer)}
            />
            {errors.customer_name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.customer_name}
              </p>
            )}
          </div>

          {/* 客户手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              手机号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel";
              value={formData.customer_phone};
              onChange={(e) => handle_input_change('customer_phone'), e.target.value)};
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${;
                errors.customer_phone ? 'border-red-300' : 'border-gray-300'
              } ${sale_source === 'CUSTOMER_PAGE' && customer ? 'bg-gray-50' : ''}`};
              placeholder="请输入手机号";
              disabled={loading || !!(sale_source === 'CUSTOMER_PAGE' && customer)};
              readOnly={!!(sale_source === 'CUSTOMER_PAGE' && customer)}
            />
            {errors.customer_phone && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.customer_phone}
              </p>
            )}
          </div>

          {/* 客户地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              收货地址
            </label>
            <input
              type="text";
              value={formData.customer_address};
              onChange={(e) => handle_input_change('customerAddress'), e.target.value)};
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${;
                errors.customer_address ? 'border-red-300' : 'border-gray-300'
              } ${sale_source === 'CUSTOMER_PAGE' && customer && customer.address ? 'bg-gray-50' : ''}`};
              placeholder="请输入收货地址（可选）";
              disabled={loading};
              readOnly={!!(sale_source === 'CUSTOMER_PAGE' && customer && customer.address)}
            />
            {errors.customer_address && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.customer_address}
              </p>
            )}
          </div>
        </div>

        {/* 销售渠道 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            销售渠道
          </label>
          <select
            value={formData.sale_channel};
            onChange={(e) => handle_input_change('sale_channel'), e.target.value)};
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent";
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
            value={formData.notes};
            onChange={(e) => handle_input_change('notes'), e.target.value)};
            rows={3};
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent";
            placeholder="销售备注、特殊要求等（可选）";
            disabled={loading}
          />
        </div>

        {/* 实际销售总价 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            实际销售总价 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number";
              min="0.01";
              step="0.01";
              value={formData.actual_total_price};
              onChange={(e) => handle_input_change('actual_total_price'), parse_float(e.target.value) || 0)};
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${;
                errors.actual_total_price ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请输入实际销售总价";
              disabled={loading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-sm text-gray-500">元</span>
            </div>
          </div>
          {errors.actual_total_price && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.actual_total_price}
            </p>
          )}
          <div className="mt-1 text-xs text-gray-500">
            <p>建议价格：¥{calculate_suggested_price().to_fixed(2)}</p>
            {calculate_discount() > 0 && (
              <p className="text-orange-600">优惠金额：¥{calculate_discount().to_fixed(2)}</p>
            )}
            {calculate_discount() < 0 && (
              <p className="text-green-600">溢价金额：¥{Math.abs(calculate_discount()).to_fixed(2)}</p>
            )}
          </div>
        </div>

        {/* 销售总价预览 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">实际销售总价：</span>
            <span className="text-lg font-medium text-green-600">
              ¥{Number(formData.actual_total_price || 0).to_fixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">数量：{formData.quantity} 件</span>
            <span className="text-xs text-gray-500">平均单价：¥{(Number(formData.actual_total_price || 0) / Number(formData.quantity || 1)).to_fixed(2)}/件</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-3 pt-4">
          <button
            type="button";
            onClick={onCancel};
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50";
            disabled={loading}
          >
            取消
          </button>
          <button
            type="submit";
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
            disabled={loading || formData.quantity <= 0 || formData.quantity > sku.available_quantity || !formData.customer_name.trim() || !formData.customer_phone.trim() || formData.actual_total_price <= 0}
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