import { useState, useEffect } from 'react'
import { X, Undo, Package, ShoppingBag, AlertCircle, Loader2 } from 'lucide-react'
import { Customer, CustomerPurchase } from '../types'
import { customer_api } from '../services/api'
import { format_currency, format_date } from '../utils/format'
import RefundConfirmModal, { RefundData } from './RefundConfirmModal'
import { toast } from 'sonner'

interface CustomerRefundModalProps {
  customer: Customer
  is_open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CustomerRefundModal({
  customer,
  is_open,
  onClose,
  onSuccess
}: CustomerRefundModalProps) {const [purchases, setPurchases] = useState<CustomerPurchase[]>([])
  const [loading, set_loading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected_purchase, setSelectedPurchase] = useState<CustomerPurchase | null>(null)
  const [show_refund_modal, setShowRefundModal] = useState(false)
  const [refund_loading, setRefundLoading] = useState(false)

  // 获取客户购买记录
  const fetch_purchases = async () => {
    if (!customer?.id) return
    
    try {
      set_loading(true)
      setError(null)
      const response = await customer_api.get_purchases(customer.id)
      
      if (response.success) {
        // 根据API响应结构，购买记录在 response.data.purchases 中
        const purchasesData = (response.data as any)?.purchases || response.data
        console.log('🔍 [CustomerRefundModal] API响应数据:', response.data)
        console.log('🔍 [CustomerRefundModal] 提取的购买记录:', purchasesData)
        setPurchases(Array.isArray(purchasesData) ? purchasesData : [])
      } else {
        setError(response.message || '获取购买记录失败')
      }
    } catch (error) {
      console.error('获取购买记录失败:', error)
      setError('获取购买记录失败')
    } finally {set_loading(false)
    }
  }

  // 打开退货确认弹窗
  const handleOpenRefund = (purchase: CustomerPurchase) => {
    setSelectedPurchase(purchase)
    setShowRefundModal(true)
  }

  // 处理退货
  const handleRefund = async (refundData: RefundData) => {
    if (!selected_purchase) return
    
    try {
      setRefundLoading(true)
      const response = await customer_api.refund_purchase(
        customer.id,
        selected_purchase.id,
        refundData
      )
      
      if (response.success) {
        // 重新获取购买记录
        await fetch_purchases()
        // 通知父组件刷新
        onSuccess()
        setShowRefundModal(false)
        setSelectedPurchase(null)
        toast.success('退货处理成功')
      } else {
        toast.error(response.message || '退货处理失败')
      }
    } catch (error) {
      console.error('退货处理失败:', error)
      toast.error('退货处理失败')
    } finally {
      setRefundLoading(false)
    }
  }

  // 关闭退货确认弹窗
  const handleCloseRefund = () => {
    setShowRefundModal(false)
    setSelectedPurchase(null)
  }

  // 当弹窗打开时获取购买记录
  useEffect(() => {
    if (is_open && customer?.id) {
      fetch_purchases()
    }
  }, [is_open, customer?.id])

  // 当客户切换时清理状态
  useEffect(() => {
    setPurchases([])
    setError(null)
    setSelectedPurchase(null)
    setShowRefundModal(false)
  }, [customer?.id])

  if (!is_open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Undo className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">客户退货</h2>
                <p className="text-sm text-gray-600">
                  {customer.name} - {customer.phone}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                  <p className="text-sm text-gray-600">加载购买记录中...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <p className="text-sm text-red-600">{error}</p>
                  <button
                    onClick={fetch_purchases}
                    className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    重新加载
                  </button>
                </div>
              </div>
            ) : !Array.isArray(purchases) || purchases.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center space-y-2">
                  <ShoppingBag className="h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">该客户暂无购买记录</p>
                  <p className="text-sm text-gray-400">无法进行退货操作</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">购买记录</h3>
                  <p className="text-sm text-gray-500">共 {Array.isArray(purchases) ? purchases.length : 0} 条记录</p>
                </div>
                
                <div className="space-y-3">
                  {Array.isArray(purchases) && purchases.map((purchase) => {
                    const isRefunded = purchase.status === 'REFUNDED'
                    return (
                      <div
                        key={purchase.id}
                        className={`rounded-lg p-4 border transition-colors ${
                          isRefunded 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <Package className={`h-8 w-8 ${
                                isRefunded ? 'text-red-500' : 'text-gray-500'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className={`font-medium ${
                                  isRefunded 
                                    ? 'text-red-700 line-through' 
                                    : 'text-gray-900'
                                }`}>
                                  {purchase.sku_name}
                                </h4>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  isRefunded 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {purchase.sku?.sku_code || purchase.sku_code}
                                </span>
                                {isRefunded && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    已退货
                                  </span>
                                )}
                              </div>
                              <div className={`mt-1 text-sm space-y-1 ${
                                isRefunded ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                <div className="flex items-center space-x-4">
                                  <span>购买时间: {format_date(purchase.purchase_date || purchase.purchase_date)}</span>
                                  <span>数量: {purchase.quantity}</span>
                                  <span>单价: {format_currency(purchase.unit_price)}</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <span>销售渠道: {purchase.sale_channel || purchase.sale_channel || '未知'}</span>
                                  {(purchase.original_price) && (purchase.original_price) > (purchase.total_price || 0) && (
                                    <span className={isRefunded ? 'text-red-400' : 'text-red-500'}>
                                      优惠: {format_currency((purchase.original_price || 0) - (purchase.total_price || 0))}
                                    </span>
                                  )}
                                </div>
                                {purchase.notes && (
                                  <div className={isRefunded ? 'text-red-500' : 'text-gray-500'}>
                                    备注: {purchase.notes}
                                  </div>
                                )}
                                {isRefunded && purchase.refund_date && (
                                  <div className="text-red-600 font-medium">
                                    退货时间: {format_date(purchase.refund_date)}
                                  </div>
                                )}
                                {isRefunded && purchase.refund_reason && (
                                  <div className="text-red-600">
                                    退货原因: {purchase.refund_reason}
                                  </div>
                                )}
                                {isRefunded && purchase.refund_notes && (
                                  <div className="text-red-600">
                                    退货备注: {purchase.refund_notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className={`text-lg font-bold ${
                                isRefunded 
                                  ? 'text-red-700 line-through' 
                                  : 'text-gray-900'
                              }`}>
                                {format_currency(purchase.total_price)}
                              </div>
                              {(purchase.original_price) && (purchase.original_price) > (purchase.total_price || 0) && (
                                 <div className={`text-sm line-through ${
                                   isRefunded ? 'text-red-400' : 'text-gray-500'
                                 }`}>
                                   {format_currency(purchase.original_price || 0)}
                                 </div>
                               )}
                            </div>
                            
                            {!isRefunded && (
                              <button
                                onClick={() => handleOpenRefund(purchase)}
                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                                title="退货"
                              >
                                <Undo className="h-4 w-4 mr-1" />
                                退货
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 退货确认弹窗 */}
      {selected_purchase && (
        <RefundConfirmModal
          is_open={show_refund_modal}
          onClose={handleCloseRefund}
          onConfirm={handleRefund}
          purchase={selected_purchase}
          loading={refund_loading}
        />
      )}
    </>
  )
}