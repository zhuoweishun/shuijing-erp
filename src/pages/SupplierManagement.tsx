import React, { useState, useEffect, useMemo } from 'react'
import { 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supplier_api } from '../services/api'
import { Supplier, SupplierListResponse } from '../types'
import { SupplierDetailModal } from '../components/SupplierDetailModal'
import { SupplierCreateModal } from '../components/SupplierCreateModal'
import { SupplierEditModal } from '../components/SupplierEditModal'
import { SupplierDeleteConfirmModal } from '../components/SupplierDeleteConfirmModal'
import { toast } from 'sonner'

type SortField = 'id' | 'name' | 'contact' | 'phone' | 'email' | 'created_at' | 'last_purchase_date'
type SortOrder = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  order: SortOrder
}

export default function SupplierManagement() {
  const { user, is_boss } = useAuth()
  
  // 状态管理
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'created_at', order: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)
  
  // 弹窗状态
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 显示供应商编号（使用真实的supplier_code字段）
  const displaySupplierCode = (supplier: Supplier) => {
    return supplier.supplier_code || supplier.id.substring(0, 8).toUpperCase()
  }
  
  // 权限检查：只有BOSS可以访问
  if (!is_boss) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-900">供应商管理</h1>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">
              权限不足
            </h3>
            <p className="text-red-600">
              此功能仅限老板权限访问
            </p>
            <p className="text-sm text-red-500 mt-2">
              当前用户角色：{user?.role || '未知'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 获取供应商列表
  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const response = await supplier_api.list({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm || undefined
      })

      if (response.success && response.data) {
        setSuppliers(response.data.suppliers)
        setTotalPages(response.data.total_pages)
        setTotalCount(response.data.total_count)
      } else {
        toast.error('获取供应商列表失败')
      }
    } catch (error) {
      console.error('获取供应商列表失败:', error)
      toast.error('获取供应商列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 初始加载和依赖更新
  useEffect(() => {
    fetchSuppliers()
  }, [currentPage, searchTerm])

  // 排序后的供应商列表
  const sortedSuppliers = useMemo(() => {
    const sorted = [...suppliers].sort((a, b) => {
      const aValue = a[sortConfig.field]
      const bValue = b[sortConfig.field]
      
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      
      if (sortConfig.field === 'created_at') {
        const aDate = new Date(aValue as string).getTime()
        const bDate = new Date(bValue as string).getTime()
        return sortConfig.order === 'asc' ? aDate - bDate : bDate - aDate
      }
      
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      
      if (sortConfig.order === 'asc') {
        return aStr.localeCompare(bStr)
      } else {
        return bStr.localeCompare(aStr)
      }
    })
    
    return sorted
  }, [suppliers, sortConfig])

  // 处理排序
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }))
  }

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // 重置到第一页
  }

  // 处理查看详情
  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setShowDetailModal(true)
  }

  // 处理编辑供应商
  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setShowEditModal(true)
  }

  // 处理删除供应商 - 显示确认模态框
  const handleDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier)
    setShowDeleteConfirmModal(true)
  }

  // 确认删除供应商 - 执行实际删除操作
  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return

    setDeleteLoading(true)
    try {
      const response = await supplier_api.delete(supplierToDelete.id)
      if (response.success) {
        toast.success('供应商删除成功')
        setShowDeleteConfirmModal(false)
        setSupplierToDelete(null)
        fetchSuppliers() // 重新获取列表
      } else {
        toast.error(response.message || '删除供应商失败')
      }
    } catch (error: any) {
      console.error('删除供应商失败:', error)
      if (error.response?.data?.error?.code === 'SUPPLIER_HAS_RECORDS') {
        toast.error('该供应商存在相关采购记录，无法删除')
      } else {
        toast.error('删除供应商失败')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  // 取消删除
  const handleCancelDelete = () => {
    setShowDeleteConfirmModal(false)
    setSupplierToDelete(null)
  }

  // 渲染排序图标
  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />
    }
    return sortConfig.order === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">供应商管理</h1>
            <p className="text-sm text-gray-500">管理所有供应商信息和采购记录</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSuppliers}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">刷新</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">添加供应商</span>
            <span className="sm:hidden">添加</span>
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索供应商编号、名称、联系人、电话..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="text-sm text-gray-500 text-center sm:text-left">
            共 {totalCount} 个供应商
          </div>
        </div>
      </div>

      {/* Excel风格表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* 桌面端表格视图 */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('id')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>供应商编号</span>
                    {renderSortIcon('id')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>供应商名称</span>
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('contact')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>联系人</span>
                    {renderSortIcon('contact')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('phone')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>电话</span>
                    {renderSortIcon('phone')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('email')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>邮箱</span>
                    {renderSortIcon('email')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>创建时间</span>
                    {renderSortIcon('created_at')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('last_purchase_date')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>最后采购</span>
                    {renderSortIcon('last_purchase_date')}
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">操作</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                      <span className="text-gray-500">加载中...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      {searchTerm ? '未找到匹配的供应商' : '暂无供应商数据'}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-medium text-gray-900">
                        {displaySupplierCode(supplier)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                        {supplier.description && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {supplier.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {supplier.contact ? (
                          supplier.contact
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {supplier.phone ? (
                          supplier.phone
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {supplier.email ? (
                          supplier.email
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(supplier.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.last_purchase_date ? (
                        formatDate(supplier.last_purchase_date)
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetail(supplier)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 移动端卡片视图 */}
        <div className="lg:hidden">
          {loading ? (
            <div className="p-6 text-center">
              <div className="flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-gray-500">加载中...</span>
              </div>
            </div>
          ) : sortedSuppliers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {searchTerm ? '未找到匹配的供应商' : '暂无供应商数据'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sortedSuppliers.map((supplier) => (
                <div key={supplier.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* 供应商编号和名称 */}
                      <div className="mb-2">
                        <div className="text-xs font-mono font-medium text-blue-600 mb-1">
                          {displaySupplierCode(supplier)}
                        </div>
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {supplier.name}
                        </div>
                      </div>
                      
                      {/* 联系信息 */}
                      <div className="space-y-1">
                        {supplier.contact && (
                          <div className="text-xs text-gray-600">
                            联系人：{supplier.contact}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="text-xs text-gray-600">
                            电话：{supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="text-xs text-gray-600">
                            邮箱：<span className="truncate">{supplier.email}</span>
                          </div>
                        )}
                        {supplier.address && (
                          <div className="text-xs text-gray-600">
                            地址：<span className="truncate">{supplier.address}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* 描述 */}
                      {supplier.description && (
                        <div className="mt-2 text-xs text-gray-500 line-clamp-2">
                          {supplier.description}
                        </div>
                      )}
                      
                      {/* 创建时间和最后采购时间 */}
                      <div className="mt-2 text-xs text-gray-400 space-y-1">
                        <div>创建于 {formatDate(supplier.created_at)}</div>
                        <div>
                          最后采购：{supplier.last_purchase_date ? formatDate(supplier.last_purchase_date) : '-'}
                        </div>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleViewDetail(supplier)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="text-green-600 hover:text-green-900 p-2 rounded-md hover:bg-green-50"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-4 lg:px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
              <div className="text-sm text-gray-700 text-center lg:text-left">
                显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} 条，共 {totalCount} 条
              </div>
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(window.innerWidth < 640 ? 3 : 5, totalPages) }, (_, i) => {
                    let pageNum
                    const maxPages = window.innerWidth < 640 ? 3 : 5
                    if (totalPages <= maxPages) {
                      pageNum = i + 1
                    } else if (currentPage <= Math.floor(maxPages / 2) + 1) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - Math.floor(maxPages / 2)) {
                      pageNum = totalPages - maxPages + 1 + i
                    } else {
                      pageNum = currentPage - Math.floor(maxPages / 2) + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-2 lg:px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 弹窗组件 */}
      {showDetailModal && selectedSupplier && (
        <SupplierDetailModal
          supplier={selectedSupplier}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedSupplier(null)
          }}
        />
      )}

      {showCreateModal && (
        <SupplierCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchSuppliers}
        />
      )}

      {showEditModal && selectedSupplier && (
        <SupplierEditModal
          supplier={selectedSupplier}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedSupplier(null)
          }}
          onSuccess={fetchSuppliers}
        />
      )}

      {/* 删除确认模态框 */}
      <SupplierDeleteConfirmModal
        is_open={showDeleteConfirmModal}
        supplier={supplierToDelete}
        on_close={handleCancelDelete}
        on_confirm={handleConfirmDelete}
        loading={deleteLoading}
      />
    </div>
  )
}
