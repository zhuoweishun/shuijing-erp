import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { financial_api } from '../services/api'
import { financial_record, create_financial_record_request } from '../types/financial'

interface FinancialRecordModalProps {
  is_open: boolean
  onClose: () => void
  onSuccess: () => void
  record?: financial_record | null
}

export default function FinancialRecordModal({ is_open, onClose, onSuccess, record }: FinancialRecordModalProps) {const [loading, set_loading] = useState(false)
  const [formData, setFormData] = useState<create_financial_record_request>({
    record_type: 'INCOME',
    amount: 0,
    description: '',
    reference_type: 'MANUAL',
    reference_id: '',
    category: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    if (record) {
      setFormData({
        record_type: record.record_type,
        amount: record.amount,
        description: record.description,
        reference_type: record.reference_type,
        reference_id: record.reference_id || '',
        category: record.category || '',
        transaction_date: record.transaction_date.split('T')[0],
        notes: record.notes || ''
      })
    } else {
      setFormData({
        record_type: 'INCOME',
        amount: 0,
        description: '',
        reference_type: 'MANUAL',
        reference_id: '',
        category: '',
        transaction_date: new Date().toISOString().split('T')[0],
        notes: ''
      })
    }
  }, [record, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.description.trim()) {
      toast.error('请输入描述')
      return
    }
    
    if (formData.amount <= 0) {
      toast.error('金额必须大于0')
      return
    }

    try {set_loading(true)
      
      if (record) {
        await financialApi.update_record(record.id, formData)
        toast.success('财务记录更新成功')
      } else {
        await financial_api.create_record(formData)
        toast.success('财务记录创建成功')
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('保存财务记录失败:', error)
      toast.error(error.message || '保存失败')
    } finally {set_loading(false)
    }
  }

  const handleInputChange = (field: keyof create_financial_record_request, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* 模态框内容 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {record ? '编辑财务记录' : '添加财务记录'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 记录类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              记录类型 *
            </label>
            <select
              value={formData.record_type}
              onChange={(e) => handleInputChange('record_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="INCOME">收入</option>
              <option value="EXPENSE">支出</option>
              <option value="REFUND">退款</option>
              <option value="LOSS">损耗</option>
            </select>
          </div>
          
          {/* 金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              金额 *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入金额"
              required
            />
          </div>
          
          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              描述 *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入描述"
              required
            />
          </div>
          
          {/* 关联类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              关联类型
            </label>
            <select
              value={formData.reference_type}
              onChange={(e) => handleInputChange('reference_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MANUAL">手动录入</option>
              <option value="PURCHASE">采购</option>
              <option value="SALE">销售</option>
              <option value="REFUND">退货</option>
            </select>
          </div>
          
          {/* 关联ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              关联ID
            </label>
            <input
              type="text"
              value={formData.reference_id}
              onChange={(e) => handleInputChange('reference_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="关联的业务ID（可选）"
            />
          </div>
          
          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分类
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="财务分类（可选）"
            />
          </div>
          
          {/* 交易日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              交易日期 *
            </label>
            <input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => handleInputChange('transaction_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="备注信息（可选）"
            />
          </div>
          
          {/* 按钮组 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '保存中...' : (record ? '更新' : '创建')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}