import React from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Supplier } from '../types'

interface SupplierDeleteConfirmModalProps {
  is_open: boolean
  supplier: Supplier | null
  on_close: () => void
  on_confirm: () => void
  loading?: boolean
}

export const SupplierDeleteConfirmModal: React.FC<SupplierDeleteConfirmModalProps> = ({
  is_open,
  supplier,
  on_close,
  on_confirm,
  loading = false
}) => {
  if (!is_open || !supplier) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              确认删除供应商
            </h3>
          </div>
          <button
            onClick={on_close}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-700 mb-2">
              您确定要删除以下供应商吗？
            </p>
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-red-500">
              <div className="font-medium text-gray-900">
                {supplier.name}
              </div>
              {supplier.contact && (
                <div className="text-sm text-gray-600 mt-1">
                  联系人：{supplier.contact}
                </div>
              )}
              {supplier.phone && (
                <div className="text-sm text-gray-600">
                  电话：{supplier.phone}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">警告：此操作不可恢复</p>
                <p>删除供应商后，相关的历史记录将被保留，但供应商信息将无法恢复。</p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={on_close}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={on_confirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>确认删除</span>
          </button>
        </div>
      </div>
    </div>
  )
}