import React, { useState, useEffect } from 'react'
import { X, Edit, Loader2, User, Phone, Mail, MapPin, FileText } from 'lucide-react'
import { supplier_api } from '../services/api'
import { Supplier } from '../types'
import { toast } from 'sonner'

interface SupplierEditModalProps {
  supplier: Supplier
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface SupplierFormData {
  name: string
  contact: string
  phone: string
  email: string
  address: string
  description: string
}

export const SupplierEditModal: React.FC<SupplierEditModalProps> = ({
  supplier,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<SupplierFormData>>({})

  // 初始化表单数据
  useEffect(() => {
    if (supplier && isOpen) {
      setFormData({
        name: supplier.name || '',
        contact: supplier.contact || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        description: supplier.description || ''
      })
      setErrors({})
    }
  }, [supplier, isOpen])

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: supplier?.name || '',
      contact: supplier?.contact || '',
      phone: supplier?.phone || '',
      email: supplier?.email || '',
      address: supplier?.address || '',
      description: supplier?.description || ''
    })
    setErrors({})
  }

  // 关闭弹窗
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Partial<SupplierFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = '供应商名称不能为空'
    } else if (formData.name.length > 100) {
      newErrors.name = '供应商名称不能超过100字符'
    }

    if (formData.contact && formData.contact.length > 50) {
      newErrors.contact = '联系人姓名不能超过50字符'
    }

    if (formData.phone && formData.phone.length > 20) {
      newErrors.phone = '电话号码不能超过20字符'
    }

    if (formData.email && formData.email.length > 100) {
      newErrors.email = '邮箱不能超过100字符'
    } else if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确'
    }

    if (formData.address && formData.address.length > 200) {
      newErrors.address = '地址不能超过200字符'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = '描述不能超过500字符'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理输入变化
  const handleInputChange = (field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  // 检查是否有变更
  const hasChanges = () => {
    return (
      formData.name !== (supplier.name || '') ||
      formData.contact !== (supplier.contact || '') ||
      formData.phone !== (supplier.phone || '') ||
      formData.email !== (supplier.email || '') ||
      formData.address !== (supplier.address || '') ||
      formData.description !== (supplier.description || '')
    )
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!hasChanges()) {
      toast.info('没有检测到任何变更')
      return
    }

    setLoading(true)
    try {
      // 准备提交数据，过滤空字符串
      const submitData = {
        name: formData.name.trim(),
        ...(formData.contact.trim() && { contact: formData.contact.trim() }),
        ...(formData.phone.trim() && { phone: formData.phone.trim() }),
        ...(formData.email.trim() && { email: formData.email.trim() }),
        ...(formData.address.trim() && { address: formData.address.trim() }),
        ...(formData.description.trim() && { description: formData.description.trim() })
      }

      const response = await supplier_api.update(supplier.id, submitData)

      if (response.success) {
        toast.success('供应商信息更新成功')
        onSuccess()
        onClose()
      } else {
        toast.error(response.message || '更新供应商信息失败')
      }
    } catch (error: any) {
      console.error('更新供应商信息失败:', error)
      
      // 处理特定错误
      if (error.response?.data?.error?.code === 'DUPLICATE_SUPPLIER_NAME') {
        setErrors({ name: '供应商名称已存在' })
        toast.error('供应商名称已存在')
      } else if (error.response?.data?.error?.code === 'SIMILAR_SUPPLIER_NAME') {
        setErrors({ name: '存在相似的供应商名称' })
        toast.error('存在相似的供应商名称，请检查是否重复')
      } else {
        toast.error('更新供应商信息失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !supplier) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Edit className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">编辑供应商</h2>
              <p className="text-sm text-gray-500">修改 "{supplier.name}" 的信息</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 overflow-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* 供应商名称 - 必填 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 mr-2" />
                供应商名称 <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入供应商名称"
                maxLength={100}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* 联系人 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 mr-2" />
                联系人
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => handleInputChange('contact', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.contact ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入联系人姓名"
                maxLength={50}
              />
              {errors.contact && (
                <p className="mt-1 text-sm text-red-600">{errors.contact}</p>
              )}
            </div>

            {/* 电话 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 mr-2" />
                电话
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入电话号码"
                maxLength={20}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* 邮箱 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 mr-2" />
                邮箱
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入邮箱地址"
                maxLength={100}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* 地址 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 mr-2" />
                地址
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入地址"
                maxLength={200}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
              )}
            </div>

            {/* 描述 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 mr-2" />
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入供应商描述信息"
                maxLength={500}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/500 字符
              </p>
            </div>

            {/* 变更提示 */}
            {hasChanges() && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  检测到信息变更，点击保存按钮确认修改
                </p>
              </div>
            )}
          </div>
        </form>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            取消
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !hasChanges()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  )
}