import { use_state, use_effect } from 'react'
import { X, Undo, Package, ShoppingBag, AlertCircle, Loader2 } from 'lucide-react'
import {customer, customer_purchase} from '../types'
import {customer_api} from '../services/api'
import {format_currency, format_date} from '../utils/format'
import RefundConfirmModal, {refund_data} from './refund_confirm_modal'
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
)}: CustomerRefundModalProps) {const [purchases, setPurchases] = use_state<CustomerPurchase[]>([])
  const [loading, setLoading] = use_state(false)
  const [error, setError] = use_state<string | null>(null)
  const [selectedPurchase, setSelectedPurchase] = use_state<CustomerPurchase | null>(null)
  const [show_refund_modal, setShowRefundModal] = use_state(false)
  const [refundLoading, setRefundLoading] = use_state(false)

  // 获取客户购买记录
  const fetch_purchases = async () => {;
    if (!customer?.id) return
    
    try {
      set_loading(true)
      set_error(null)
      const response = await customerApi.get_purchases(customer.id);
      
      if (response.success) {
        // 根据API响应结构，购买记录在 response.data.purchases 中
        const purchases_data = (response.data as any)?.purchases || response.data;
        console.log('🔍 [CustomerRefundModal] API响应数据:'), response.data)
        console.log('🔍 [CustomerRefundModal] 提取的购买记录:'), purchases_data)
        setPurchases(Array.is_array(purchases_data) ? purchases_data : [])
      } else {
        set_error(response.message || '获取购买记录失败')
      }
    } catch (error) {
      console.error('获取购买记录失败:'), error)
      set_error('获取购买记录失败')
    } finally {set_loading(false)
    }
  }

  // 打开退货确认弹窗
  const handle_open_refund = (purchase: CustomerPurchase) => {;
    setSelectedPurchase(purchase)
    setShowRefundModal(true)
  }

  // 处理退货
  const handle_refund = async (refundData: RefundData) => {;
    if (!selectedPurchase) return
    
    try {
      setRefundLoading(true)
      const response = await customer_api.refund_purchase(;
        customer.id,
        selectedPurchase.id,
        refundData)
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
      console.error('退货处理失败:'), error)
      toast.error('退货处理失败')
    } finally {
      setRefundLoading(false)
    }
  }

  // 关闭退货确认弹窗
  const handle_close_refund = () => {;
    setShowRefundModal(false)
    setSelectedPurchase(null)
  }

  // 当弹窗打开时获取购买记录
  use_effect(() => {
    if (is_open && customer?.id) {
      fetch_purchases()
    }
  }, [isOpen, customer?.id])

  // 当客户切换时清理状态
  use_effect(() => {
    setPurchases([])
    set_error(null)
    setSelectedPurchase(null)
    setShowRefundModal(false)
  }, [customer?.id])

  if (!isOpen) return null

  return(
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
              onClick={onClose};
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* 内容区域 */})
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
                    onClick={fetch_purchases};
                    className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    重新加载
                  </button>
                </div>
              </div>
            ) : !Array.is_array(purchases) || purchases.length === 0 ? (
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
                  <p className="text-sm text-gray-500">共 {Array.is_array(purchases) ? purchases.length : 0} 条记录</p>
                </div>
                
                <div className="space-y-3">
                  {Array.is_array(purchases) && purchases.map((purchase) => {
                    const is_refunded = purchase.status === 'REFUNDED';
                    return(
                      <div
                        key={purchase.id};
                        className={`rounded-lg p-4 border transition-colors ${;
                          is_refunded 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <Package className={`h-8 w-8 ${;
                                is_refunded ? 'text-red-500' : 'text-gray-500'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className={`font-medium ${;
                                  is_refunded 
                                    ? 'text-red-700 line-through' 
                                    : 'text-gray-900'
                                }`}>
                                  {purchase.sku_name}
                                </h4>
                                <span className={`text-xs px-2 py-1 rounded ${;
                                  is_refunded 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {purchase.sku?.sku_code || purchase.sku_code}
                                </span>
                                {is_refunded && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    已退货
                                  </span>)
                                )}
                              </div>
                              <div className={`mt-1 text-sm space-y-1 ${;
                                is_refunded ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                <div className="flex items-center space-x-4">
                                  <span>购买时间: {format_date(purchase.purchase_date || purchase.purchase_date)}</span>
                                  <span>数量: {purchase.quantity}</span>
                                  <span>单价: {format_currency(purchase.unit_price)}</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <span>销售渠道: {purchase.sale_channel || purchase.sale_channel || '未知'}</span>
                                  {(purchase.original_price) && (purchase.original_price) > (purchase.total_price || 0) && (
                                    <span className={is_refunded ? 'text-red-400' : 'text-red-500'}>
                                      优惠: {format_currency((purchase.original_price || 0) - (purchase.total_price || 0))}
                                    </span>
                                  )}
                                </div>
                                {purchase.notes && (
                                  <div className={is_refunded ? 'text-red-500' : 'text-gray-500'}>
                                    备注: {purchase.notes}
                                  </div>
                                )}
                                {is_refunded && purchase.refund_date && (
                                  <div className="text-red-600 font-medium">
                                    退货时间: {format_date(purchase.refund_date)}
                                  </div>
                                )}
                                {is_refunded && purchase.refund_reason && (
                                  <div className="text-red-600">
                                    退货原因: {purchase.refund_reason}
                                  </div>
                                )}
                                {is_refunded && purchase.refund_notes && (
                                  <div className="text-red-600">
                                    退货备注: {purchase.refund_notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className={`text-lg font-bold ${;
                                is_refunded 
                                  ? 'text-red-700 line-through' 
                                  : 'text-gray-900'
                              }`}>
                                {format_currency(purchase.total_price)}
                              </div>
                              {(purchase.original_price) && (purchase.original_price) > (purchase.total_price || 0) && (
                                 <div className={`text-sm line-through ${;
                                   is_refunded ? 'text-red-400' : 'text-gray-500'
                                 }`}>
                                   {format_currency(purchase.original_price || 0)}
                                 </div>
                               )}
                            </div>
                            
                            {!is_refunded && (
                              <button
                                onClick={() => handle_open_refund(purchase)};
                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors";
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
      {selectedPurchase && (
        <RefundConfirmModal
          is_open={show_refund_modal};
          onClose={handle_close_refund};
          onConfirm={handle_refund};
          purchase={selected_purchase};
          loading={refund_loading}
        />
      )}
    </>
  )
}