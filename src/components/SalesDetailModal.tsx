import { useState, useEffect } from 'react'
import { X, Edit, Save, DollarSign, Package, Calendar, Tag, Loader2, AlertCircle } from 'lucide-react'
import { finished_product_api, fixImageUrl } from '../services/api'
import { FinishedProduct } from '../types'
import { useAuth } from '../hooks/useAuth'
import Permission_wrapper from './PermissionWrapper'
import Portal from './Portal'
import { toast } from 'sonner'

interface SalesDetailModalProps {
  is_open: boolean
  onClose: () => void
  product_id: string | null
  edit_mode?: boolean
  onEdit?: (saleId: string) => void
  onDelete?: () => void
  onSave?: () => void
}

export default function SalesDetailModal({
  is_open,
  onClose, product_id,
  edit_mode = false,
  onEdit,
  onDelete,
  onSave
}: SalesDetailModalProps) {
  const { user } = useAuth()
  const [product, setProduct] = useState<FinishedProduct | null>(null)
  const [loading, set_loading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [is_editing, setIsEditing] = useState(edit_mode)
  const [saving, setSaving] = useState(false)
  
  // 编辑表单状态
  const [editForm, setEditForm] = useState({
    purchase_name: '',
    description: '',
    specification: '',
    selling_price: '',
    status: 'AVAILABLE' as 'MAKING' | 'AVAILABLE' | 'SOLD' | 'OFFLINE'
  })

  // 图片预览状态
  const [image_preview, setImagePreview] = useState<{
    is_open: boolean
    image_url: string | null
    alt_text: string | null
  }>({
    is_open: false,
    image_url: null,
    alt_text: null
  })

  // 获取产品详情
  const fetchProductDetail = async () => {if (!product_id) return
    
    try {
      set_loading(true)
      setError(null)
      
      const response = await finished_product_api.get(product_id)
      
      if (response.success && response.data) {
        const productData = response.data as FinishedProduct
        setProduct(productData)
        
        // 初始化编辑表单
        setEditForm({
          purchase_name: productData.purchase_name || '',
          description: productData.description || '',
          specification: productData.specification || '',
          selling_price: productData.selling_price?.toString() || '',
          status: productData.status || 'AVAILABLE'
        })
      } else {
        setError(response.message || '获取产品详情失败')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '获取产品详情失败')
    } finally {set_loading(false)
    }
  }

  // 保存编辑
  const handleSave = async () => {
    if (!product_id) return
    
    try {
      setSaving(true)
      
      const updateData: any = {
        purchase_name: editForm.purchase_name,
        description: editForm.description,
        specification: editForm.specification,
        status: editForm.status
      }
      
      // 只有BOSS可以编辑价格
      if (user?.role === 'BOSS' && editForm.selling_price) {
        updateData.selling_price = parseFloat(editForm.selling_price)
      }
      
      const response = await finished_product_api.update(product_id, updateData)
      
      if (response.success) {
        toast.success('保存成功')
        setIsEditing(false)
        fetchProductDetail() // 重新获取数据
        onSave?.()
      } else {
        toast.error(response.message || '保存失败')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 标记已售出
  const handleMarkAsSold = async () => {
    if (!product_id) return
    
    try {
      const response = await finished_product_api.markAsSold(product_id)
      
      if (response.success) {
        toast.success('已标记为售出')
        fetchProductDetail() // 重新获取数据
        onSave?.()
      } else {
        toast.error(response.message || '标记售出失败')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '标记售出失败')
    }
  }

  // 删除产品
  const handleDelete = async () => {
    if (!product_id || !window.confirm('确定要删除这个销售成品吗？此操作不可撤销。')) return
    
    try {
      const response = await finished_product_api.delete(product_id)
      
      if (response.success) {
        toast.success('删除成功')
        onClose()
        onDelete?.()
      } else {
        toast.error(response.message || '删除失败')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  // 打开图片预览
  const open_image_preview = (image_url: string, alt_text: string) => {
    setImagePreview({
      is_open: true,
      image_url: fixImageUrl(image_url),
      alt_text
    })
  }

  // 关闭图片预览
  const close_image_preview = () => {
    setImagePreview({
      is_open: false,
      image_url: null,
      alt_text: null
    })
  }

  // 格式化状态
  const formatStatus = (status?: string) => {
    const statusMap = {
      'MAKING': '制作中',
      'AVAILABLE': '可售',
      'SOLD': '已售出',
      'OFFLINE': '下架'
    }
    return statusMap[status as keyof typeof statusMap] || '可售'
  }

  // 格式化价格
  const format_price = (price?: number) => {
    if (!price) return '-'
    return `¥${price.toFixed(2)}`
  }

  // 格式化利润率
  const formatProfitMargin = (margin?: number) => {
    if (!margin) return '-'
    return `${margin.toFixed(1)}%`
  }

  // 格式化日期
  const format_date = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 监听弹窗打开和productId变化
  useEffect(() => {
    if (is_open && product_id) {
      fetchProductDetail()
      setIsEditing(edit_mode)
    }
  }, [is_open, product_id, edit_mode])

  // 监听编辑模式变化
  useEffect(() => {
    setIsEditing(edit_mode)
  }, [edit_mode])

  if (!is_open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={onClose}
          />
          
          {/* 弹窗内容 */}
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Package className="h-6 w-6 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {is_editing ? '编辑销售成品' : '销售成品详情'}
                </h2>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* 编辑按钮 */}
                {!is_editing && (
                  <Permission_wrapper allowed_roles={['BOSS']}>
                    <button
                      onClick={() => {
                        setIsEditing(true)
                        onEdit?.(product_id!)
                      }}
                      className="flex items-center px-3 py-2 text-sm text-green-600 hover:text-green-800 border border-green-300 rounded-lg hover:bg-green-50"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      编辑
                    </button>
                  </Permission_wrapper>
                )}
                
                {/* 保存按钮 */}
                {is_editing && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    保存
                  </button>
                )}
                
                {/* 标记售出按钮 */}
                {!is_editing && product?.status === 'AVAILABLE' && (
                  <button
                    onClick={handleMarkAsSold}
                    className="flex items-center px-3 py-2 text-sm text-orange-600 hover:text-orange-800 border border-orange-300 rounded-lg hover:bg-orange-50"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    标记售出
                  </button>
                )}
                
                {/* 关闭按钮 */}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* 弹窗内容 */}
            <div className="p-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  <span className="ml-3 text-gray-500">加载中...</span>
                </div>
              )}
              
              {error && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">{error}</p>
                  </div>
                </div>
              )}
              
              {!loading && !error && product && (
                <div className="space-y-6">
                  {/* 基本信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                        基本信息
                      </h3>
                      
                      {/* 成品编号 */}
                      <div className="flex items-center space-x-3">
                        <Tag className="h-5 w-5 text-gray-400" />
                        <div>
                          <label className="text-sm font-medium text-gray-700">成品编号</label>
                          <p className="text-sm text-gray-900">{product.material_code}</p>
                        </div>
                      </div>
                      
                      {/* 成品名称 */}
                      <div className="flex items-start space-x-3">
                        <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700">成品名称</label>
                          {is_editing ? (
                            <input
                              type="text"
                              value={editForm.purchase_name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, purchase_name: e.target.value }))}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900 mt-1">{product.purchase_name}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* 规格 */}
                      <div className="flex items-start space-x-3">
                        <Tag className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700">规格</label>
                          {is_editing ? (
                            <input
                              type="text"
                              value={editForm.specification}
                              onChange={(e) => setEditForm(prev => ({ ...prev, specification: e.target.value }))}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900 mt-1">{product.specification || '-'}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* 描述 */}
                      <div className="flex items-start space-x-3">
                        <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700">描述</label>
                          {is_editing ? (
                            <textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                              rows={3}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900 mt-1">{product.description || '-'}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* 状态 */}
                      <div className="flex items-center space-x-3">
                        <Tag className="h-5 w-5 text-gray-400" />
                        <div>
                          <label className="text-sm font-medium text-gray-700">状态</label>
                          {is_editing ? (
                            <select
                              value={editForm.status}
                              onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                            >
                              <option value="MAKING">制作中</option>
                              <option value="AVAILABLE">可售</option>
                              <option value="SOLD">已售出</option>
                              <option value="OFFLINE">下架</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              product.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                              product.status === 'SOLD' ? 'bg-gray-100 text-gray-800' :
                              product.status === 'MAKING' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {formatStatus(product.status)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 价格信息（权限控制） */}
                    <Permission_wrapper allowed_roles={['BOSS']}>
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                          价格信息
                        </h3>
                        
                        {/* 销售价格 */}
                        <div className="flex items-center space-x-3">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                          <div>
                            <label className="text-sm font-medium text-gray-700">销售价格</label>
                            {is_editing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.selling_price}
                                onChange={(e) => setEditForm(prev => ({ ...prev, selling_price: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                              />
                            ) : (
                              <p className="text-sm text-gray-900 mt-1">{format_price(product.selling_price)}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* 成本信息 */}
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">原材料成本:</span>
                            <span className="text-sm text-gray-900">{format_price(product.materialCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">人工成本:</span>
                            <span className="text-sm text-gray-900">{format_price(product.labor_cost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">工艺成本:</span>
                            <span className="text-sm text-gray-900">{format_price(product.craft_cost)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-sm font-medium text-gray-700">总成本:</span>
                            <span className="text-sm font-medium text-gray-900">{format_price(product.total_cost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">利润率:</span>
                            <span className="text-sm font-medium text-green-600">{formatProfitMargin(product.profit_margin)}</span>
                          </div>
                        </div>
                      </div>
                    </Permission_wrapper>
                  </div>
                  
                  {/* 时间信息 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                      时间信息
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <label className="text-sm font-medium text-gray-700">创建时间</label>
                          <p className="text-sm text-gray-900">{format_date(product.created_at)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <label className="text-sm font-medium text-gray-700">更新时间</label>
                          <p className="text-sm text-gray-900">{format_date(product.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 产品图片 */}
                  {product.photos && product.photos.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                        产品图片
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {product.photos.map((photo, index) => {
                          const image_url = fixImageUrl(photo)
                          return (
                            <div key={index} className="relative">
                              <img
                                src={image_url}
                                alt={`${product.purchase_name} - 图片 ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => open_image_preview(image_url, `${product.purchase_name} - 图片 ${index + 1}`)}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* 删除按钮（仅BOSS可见） */}
                  {!is_editing && (
                    <Permission_wrapper allowed_roles={['BOSS']}>
                      <div className="pt-6 border-t border-gray-200">
                        <button
                          onClick={handleDelete}
                          className="px-4 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50"
                        >
                          删除销售成品
                        </button>
                      </div>
                    </Permission_wrapper>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 图片预览弹窗 */}
      {image_preview.is_open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-75" onClick={close_image_preview}>
          <div className="max-w-4xl max-h-full p-4">
            <img
              src={image_preview.image_url!}
              alt={image_preview.alt_text || '图片预览'}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </Portal>
  )
}