import React, { useState, useCallback, useEffect } from 'react'
import { X, Plus, Loader2, User, Phone, Mail, MapPin, FileText, AlertCircle } from 'lucide-react'
import { supplier_api } from '../services/api'
import { toast } from 'sonner'

interface SupplierCreateModalProps {
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

export const SupplierCreateModal: React.FC<SupplierCreateModalProps> = ({
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
  const [name_checking, setNameChecking] = useState(false)
  const [name_validation_message, setNameValidationMessage] = useState('')

  // 防抖检查供应商名称
  const checkSupplierName = useCallback(async (name: string) => {
    if (!name.trim()) {
      setNameValidationMessage('')
      return
    }

    setNameChecking(true)
    try {
      // 调用后端API检查名称是否存在
      const response = await supplier_api.list({ 
        page: 1, 
        limit: 1, 
        search: name.trim() 
      })
      
      // 检查是否有完全匹配的名称
      const exactMatch = response.data.suppliers.find(
        (supplier: any) => supplier.name.toLowerCase() === name.trim().toLowerCase()
      )
      
      if (exactMatch) {
        if (exactMatch.is_active) {
          setNameValidationMessage('该供应商名称已存在')
          setErrors(prev => ({ ...prev, name: '该供应商名称已存在' }))
        } else {
          setNameValidationMessage('该名称之前已使用（已删除），创建时将恢复之前的记录')
          setErrors(prev => ({ ...prev, name: '' }))
        }
      } else {
        setNameValidationMessage('')
        setErrors(prev => ({ ...prev, name: '' }))
      }
    } catch (error) {
      console.error('检查供应商名称失败:', error)
      setNameValidationMessage('')
    } finally {
      setNameChecking(false)
    }
  }, [])

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name) {
        checkSupplierName(formData.name)
      } else {
        setNameValidationMessage('')
        setNameChecking(false)
      }
    }, 500) // 500ms 防抖

    return () => clearTimeout(timer)
  }, [formData.name, checkSupplierName])

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
      description: ''
    })
    setErrors({})
    setNameValidationMessage('')
    setNameChecking(false)
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

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
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

      const response = await supplier_api.create(submitData)

      if (response.success) {
        toast.success('供应商创建成功')
        resetForm()
        onSuccess()
        onClose()
      } else {
        toast.error(response.message || '创建供应商失败')
      }
    } catch (error: any) {
      console.error('创建供应商失败:', error)
      
      // 处理特定错误
      if (error.response?.data?.error?.code === 'DUPLICATE_SUPPLIER_NAME') {
        setErrors({ name: '供应商名称已存在' })
        toast.error('供应商名称已存在，请使用不同的名称')
      } else if (error.response?.data?.error?.code === 'SIMILAR_SUPPLIER_NAME') {
        setErrors({ name: '存在相似的供应商名称' })
        toast.error('存在相似的供应商名称，请检查是否重复')
      } else if (error.response?.data?.error?.code === 'DUPLICATE_SUPPLIER') {
        // 处理数据库层面的重复错误（通常是软删除导致的）
        setErrors({ name: '供应商名称已存在（可能之前已删除）' })
        toast.error('供应商名称已存在，系统正在尝试恢复之前的记录，请稍后重试')
      } else {
        // 处理其他错误
        const errorMessage = error.response?.data?.message || error.message || '创建供应商失败，请稍后重试'
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">创建供应商</h2>
              <p className="text-sm text-gray-500">添加新的供应商信息</p>
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
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-300' : 
                    name_validation_message && !errors.name ? 'border-yellow-300' : 
                    'border-gray-300'
                  }`}
                  placeholder="请输入供应商名称"
                  maxLength={100}
                />
                {/* 验证状态图标 */}
                {name_checking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  </div>
                )}
                {!name_checking && name_validation_message && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <AlertCircle className={`w-4 h-4 ${
                      errors.name ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                  </div>
                )}
              </div>
              {/* 错误信息 */}
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              {/* 验证提示信息 */}
              {!errors.name && name_validation_message && (
                <p className="mt-1 text-sm text-yellow-600">{name_validation_message}</p>
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
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? '创建中...' : '创建供应商'}
          </button>
        </div>
      </div>
    </div>
  )
}