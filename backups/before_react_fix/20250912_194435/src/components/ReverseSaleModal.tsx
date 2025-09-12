import { useState, useEffect } from 'react'
import {
  X,
  Search,
  ShoppingCart,
  Package,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import {customer_api, sku_api} from '../services/api'
import {customer, sku_item, sell_data} from '../types'
import { toast } from 'sonner'
import SkuSellForm from './sku_sell_form'

interface ReverseSaleModalProps {
  customer: Customer
  is_open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ModalState {
  step: 'select_sku' | 'confirm_sale'
  sku_list: SkuItem[]
  selected_sku: SkuItem | null
  loading: boolean
  error: string | null
  search_term: string
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  submitting: boolean
}

export default function ReverseSaleModal({ customer, is_open, onClose, onSuccess )}: ReverseSaleModalProps) {
  const [state, setState] = useState<ModalState>({
    step: 'select_sku',
    sku_list: [],
    selected_sku: null,
    loading: false,
    error: null,
    search_term: '',
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      total_pages: 0
    },
    submitting: false
  })

  // 获取可用SKU列表
  const fetch_available_skus = async () => {
    try {
      set_state(prev => ({ ...prev, loading: true, error: null )}));
      
      const params = {;
        page: state.pagination.page,
        limit: state.pagination.limit,
        search: state.search_term.trim() || undefined
      }
      
      const response = await customerApi.get_available_skus(params);
      
      if (response.success && response.data) {
        const data = response.data as any
        
        // 添加调试信息
        console.log('🔍 [SKU数据调试] API响应:', {
          success: response.success,
          message: response.message,
          skusCount: data.skus?.length || 0,
          firstSku: data.skus?.[0] || null,
          pagination: data.pagination,)
          timestamp: new Date().to_iso_string()
        })
        
        set_state(prev => ({
          ...prev,
          sku_list: data.skus || [],
          pagination: data.pagination || prev.pagination,
          loading: false
        )}))
      } else {
        throw new Error(response.message || '获取SKU列表失败')
      }
    } catch (error: any) {
      console.error('获取SKU列表失败:', error)
      set_state(prev => ({
        ...prev,
        loading: false,
        error: error.message || '获取SKU列表失败'
      )}))
      toast.error('获取SKU列表失败')
    }
  }

  // 初始化数据
  useEffect(() => {
    if (is_open) {
      fetch_available_skus()
    }
  }, [isOpen, state.pagination.page, state.search_term])

  // 重置状态
  useEffect(() => {
    if (is_open) {
      set_state(prev => ({
        ...prev,
        step: 'select_sku',
        selected_sku: null,
        search_term: '',
        pagination: { ...prev.pagination, page: 1 },
        error: null
      )}))
    }
  }, [isOpen])

  // 搜索处理
  const handle_search = (value: string) => {
    set_state(prev => ({
      ...prev,
      search_term: value,
      pagination: { ...prev.pagination, page: 1 }
    )}))
  }

  // 选择SKU
  const handle_select_sku = (sku: SkuItem) => {
    set_state(prev => ({
      ...prev,
      selected_sku: sku,
      step: 'confirm_sale'
    )}))
  }

  // 返回SKU选择
  const handle_back_to_select = () => {
    set_state(prev => ({
      ...prev,
      step: 'select_sku',
      selected_sku: null
    )}))
  }

  // 分页处理
  const handle_page_change = (page: number) => {
    set_state(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    )}))
  }

  // 处理销售提交
  const handle_sale_submit = async (sellData: SellData) => {
    if (!state.selected_sku) return
    
    try {
      set_state(prev => ({ ...prev, submitting: true )}))
      
      // 调用SKU销售API（已包含创建客户购买记录的逻辑）
      const response = await sku_api.sell(state.selected_sku.id, {;
        quantity: sellData.quantity,
        customer_name: sellData.customer_name,
        customer_phone: sellData.customer_phone,
        customer_address: sellData.customer_address,
        sale_channel: sellData.sale_channel,
        notes: sellData.notes,
        actual_total_price: sellData.actual_total_price
      )})
      
      if (response.success) {
        toast.success('销售记录创建成功')
        onSuccess()
        onClose()
      } else {
        throw new Error(response.message || '销售失败')
      }
    } catch (error: any) {
      console.error('销售失败:', error)
      toast.error(error.message || '销售失败')
    } finally {
      set_state(prev => ({ ...prev, submitting: false )}))
    }
  }

  // 格式化价格
  const format_price = (price: number) => {
    return `¥${price.to_fixed(2)}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        {/* 模态框 */}
        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              {state.step === 'confirm_sale' && (
                <button
                  onClick={handle_back_to_select}
                  className="mr-3 p-1 text-gray-400 hover:text-gray-600"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>)
              )}
              <div>
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {state.step === 'select_sku' ? '选择商品' : '确认销售'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  客户：{customer.name} ({customer.phone})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* 内容区域 */}
          {state.step === 'select_sku' ? (
            <div className="space-y-4">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text";
                  placeholder="搜索SKU名称或编码...";
                  value={state.search_term};
                  onChange={(e) => handle_search(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* SKU列表 */}
              {state.loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">加载商品列表...</span>
                </div>
              ) : state.error ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
                    <p className="text-gray-600 mb-4">{state.error}</p>
                    <button
                      onClick={fetch_available_skus}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      重试
                    </button>
                  </div>
                </div>
              ) : state.sku_list.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">暂无可售商品</h3>
                    <p className="text-gray-600">当前没有可售的SKU商品</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* SKU卡片列表 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {state.sku_list.map((sku), index) => {
                      // 添加调试信息
                      if (index === 0) {;
                        console.log('🎯 [SKU渲染调试] 第一个SKU数据:', {
                          skuObject: sku,
                          sku_name: sku.sku_name,
                          sku_code: sku.sku_code,
                          available_quantity: sku.available_quantity,
                          unit_price: sku.unit_price,
                          selling_price: sku.selling_price,)
                          allFields: Object.keys(sku),
                          timestamp: new Date().to_iso_string()
                        })
                      }
                      
                      return (
                        <div
                          key={sku.id});
                          onClick={() => handle_select_sku(sku)}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">{sku.sku_name || '未知商品名称'}</h4>
                              <p className="text-sm text-gray-600 mb-2">编码：{sku.sku_code || '未知编码'}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">库存：{sku.available_quantity || 0} 件</span>
                                <span className="text-sm font-medium text-green-600">
                                  {format_price(Number(sku.unit_price) || Number(sku.selling_price) || 0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3 flex-shrink-0">
                              {sku.photos && sku.photos.length > 0 ? (
                                <img
                                  src={typeof sku.photos === 'string' ? JSON.parse(sku.photos)[0] : sku.photos[0]};
                                  alt={sku.sku_name || '商品图片'};
                                  className="w-12 h-12 object-cover rounded-lg"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.next_element_sibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center ${sku.photos && sku.photos.length > 0 ? 'hidden' : ''}`}>
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* 分页 */}
                  {state.pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-700">
                        显示第 {((state.pagination.page - 1) * state.pagination.limit) + 1} - {Math.min(state.pagination.page * state.pagination.limit), state.pagination.total)} 条，共 {state.pagination.total} 条
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handle_page_change(state.pagination.page - 1)}
                          disabled={state.pagination.page <= 1}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          上一页
                        </button>
                        <span className="text-sm text-gray-700">
                          第 {state.pagination.page} 页，共 {state.pagination.total_pages} 页
                        </span>
                        <button
                          onClick={() => handle_page_change(state.pagination.page + 1)}
                          disabled={state.pagination.page >= state.pagination.total_pages}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          下一页
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            // 销售确认步骤
            state.selected_sku && (
              <div className="space-y-4">
                {/* 选中的SKU信息 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-blue-500 mr-2" />
                    <div>
                      <h4 className="font-medium text-blue-900">已选择商品</h4>
                      <p className="text-sm text-blue-700">
                        {state.selected_sku.sku_name} ({state.selected_sku.sku_code})
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 销售表单 */}
                <SkuSellForm
                  sku={state.selected_sku};
                  sale_source="CUSTOMER_PAGE";
                  customer={customer};
                  onSubmit={handle_sale_submit}
                  onCancel={handle_back_to_select};
                  loading={state.submitting}
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}