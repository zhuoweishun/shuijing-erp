import React, { useState, useEffect } from 'react'
import { X, Package, ShoppingCart, Calendar, DollarSign, Phone, Mail, MapPin, FileText, Loader2 } from 'lucide-react'
import { supplier_api } from '../services/api'
import { Supplier, SupplierPurchaseResponse, SupplierPurchaseItem, SupplierMaterialItem } from '../types'
import { toast } from 'sonner'

interface SupplierDetailModalProps {
  supplier: Supplier
  isOpen: boolean
  onClose: () => void
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  supplier,
  isOpen,
  onClose
}) => {
  const [purchaseData, setPurchaseData] = useState<SupplierPurchaseResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'purchases' | 'materials' | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // 获取供应商采购记录
  const fetchPurchaseData = async (page = 1, type = activeTab) => {
    if (!supplier?.id) return

    setLoading(true)
    try {
      const response = await supplier_api.get_purchases(supplier.id, {
        page,
        limit: 20,
        type
      })

      if (response.success && response.data) {
        setPurchaseData(response.data)
      } else {
        toast.error('获取供应商采购记录失败')
      }
    } catch (error) {
      console.error('获取供应商采购记录失败:', error)
      toast.error('获取供应商采购记录失败')
    } finally {
      setLoading(false)
    }
  }

  // 当弹窗打开时获取数据
  useEffect(() => {
    if (isOpen && supplier?.id) {
      fetchPurchaseData(1, activeTab)
      setCurrentPage(1)
    }
  }, [isOpen, supplier?.id, activeTab])

  // 切换标签页
  const handleTabChange = (tab: 'purchases' | 'materials' | 'all') => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  // 分页处理
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchPurchaseData(page, activeTab)
  }

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{supplier.name}</h2>
              <p className="text-sm text-gray-500">供应商详情</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row h-full">
          {/* 左侧：供应商基本信息 */}
          <div className="lg:w-1/3 p-6 border-r border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
            
            <div className="space-y-4">
              {supplier.contact && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">联系人</p>
                    <p className="text-sm font-medium text-gray-900">{supplier.contact}</p>
                  </div>
                </div>
              )}

              {supplier.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">电话</p>
                    <p className="text-sm font-medium text-gray-900">{supplier.phone}</p>
                  </div>
                </div>
              )}

              {supplier.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">邮箱</p>
                    <p className="text-sm font-medium text-gray-900">{supplier.email}</p>
                  </div>
                </div>
              )}

              {supplier.address && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">地址</p>
                    <p className="text-sm font-medium text-gray-900">{supplier.address}</p>
                  </div>
                </div>
              )}

              {supplier.description && (
                <div className="flex items-start space-x-3">
                  <FileText className="w-4 h-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">描述</p>
                    <p className="text-sm font-medium text-gray-900">{supplier.description}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">创建时间</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(supplier.created_at)}</p>
                </div>
              </div>
            </div>

            {/* 统计信息 */}
            {purchaseData?.statistics && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-medium text-gray-900 mb-4">采购统计</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500">采购记录</p>
                    <p className="text-lg font-semibold text-blue-600">{purchaseData.statistics.total_purchases}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-xs text-gray-500">原材料</p>
                    <p className="text-lg font-semibold text-green-600">{purchaseData.statistics.total_materials}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border col-span-2">
                    <p className="text-xs text-gray-500">总采购金额</p>
                    <p className="text-lg font-semibold text-purple-600">
                      {formatCurrency(purchaseData.statistics.total_purchase_amount + purchaseData.statistics.total_material_amount)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：采购记录 */}
          <div className="lg:w-2/3 flex flex-col">
            {/* 标签页 */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => handleTabChange('all')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                全部记录
              </button>
              <button
                onClick={() => handleTabChange('purchases')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'purchases'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                采购记录
              </button>
              <button
                onClick={() => handleTabChange('materials')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'materials'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                原材料
              </button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">加载中...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 采购记录 */}
                  {(activeTab === 'all' || activeTab === 'purchases') && purchaseData?.purchases && (
                    <div>
                      {activeTab === 'all' && <h4 className="text-md font-medium text-gray-900 mb-3">采购记录</h4>}
                      {purchaseData.purchases.length > 0 ? (
                        <div className="space-y-3">
                          {purchaseData.purchases.map((purchase: SupplierPurchaseItem) => (
                            <div key={purchase.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{purchase.purchase_name}</h5>
                                  <p className="text-sm text-gray-500 mt-1">{purchase.purchase_type}</p>
                                  {purchase.notes && (
                                    <p className="text-sm text-gray-600 mt-2">{purchase.notes}</p>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  {purchase.total_price && (
                                    <p className="font-semibold text-green-600">{formatCurrency(purchase.total_price)}</p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">{formatDate(purchase.created_at)}</p>
                                </div>
                              </div>
                              {purchase.quantity && (
                                <div className="mt-2 text-sm text-gray-600">
                                  数量: {purchase.quantity}
                                  {purchase.unit_price && ` | 单价: ${formatCurrency(purchase.unit_price)}`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>暂无采购记录</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 原材料记录 */}
                  {(activeTab === 'all' || activeTab === 'materials') && purchaseData?.materials && (
                    <div className={activeTab === 'all' ? 'mt-8' : ''}>
                      {activeTab === 'all' && <h4 className="text-md font-medium text-gray-900 mb-3">原材料记录</h4>}
                      {purchaseData.materials.length > 0 ? (
                        <div className="space-y-3">
                          {purchaseData.materials.map((material: SupplierMaterialItem) => (
                            <div key={material.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{material.name}</h5>
                                  {material.item_category && (
                                    <p className="text-sm text-gray-500 mt-1">{material.item_category}</p>
                                  )}
                                  {material.location && (
                                    <p className="text-sm text-gray-600 mt-1">位置: {material.location}</p>
                                  )}
                                  {material.notes && (
                                    <p className="text-sm text-gray-600 mt-2">{material.notes}</p>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-xs text-gray-500">{formatDate(material.created_at)}</p>
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                {material.quantity && material.unit && (
                                  <span>数量: {material.quantity} {material.unit}</span>
                                )}
                                {material.unit_price && (
                                  <span className="ml-4">单价: {formatCurrency(material.unit_price)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>暂无原材料记录</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 分页 */}
                  {purchaseData?.pagination && purchaseData.pagination.pages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        上一页
                      </button>
                      <span className="text-sm text-gray-600">
                        第 {currentPage} 页，共 {purchaseData.pagination.pages} 页
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= purchaseData.pagination.pages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}