import { useState, useEffect } from 'react'
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  MessageSquare,
  Plus,
  Save,
  XCircle,
  BarChart3,
  DollarSign,
  Clock,
  Undo
} from 'lucide-react'
import { Customer, CustomerPurchase, CustomerNote } from '../types'
import { customer_api } from '../services/api'
import { toast } from 'react-hot-toast'
import RefundConfirmModal, { RefundData } from './RefundConfirmModal'


interface CustomerDetailModalProps {
  customer: Customer;
  is_open: boolean;
  on_close: () => void;
  onCustomerUpdate?: () => void // 客户信息更新回调;
  allCustomers?: Customer[] // 所有客户数据，用于标签计算;
}

interface CustomerPurchaseHistory {
  purchases: CustomerPurchase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  }
}

const NOTE_TYPE_CONFIG = {
  PREFERENCE: { label: '客户偏好', icon: '💜', color: 'bg-purple-100 text-purple-800' },
  BEHAVIOR: { label: '购买行为', icon: '📊', color: 'bg-blue-100 text-blue-800' },
  CONTACT: { label: '联系记录', icon: '📞', color: 'bg-green-100 text-green-800' },
  OTHER: { label: '其他信息', icon: '📝', color: 'bg-gray-100 text-gray-800' }
}

// 导入新的客户标签配置
const CUSTOMER_TYPE_LABELS = {
  // 购买行为维度
  NEW: { 
    label: '新客', 
    icon: '🆕', 
    color: 'text-blue-600 bg-blue-100',
    description: '新客户，只有1次购买记录的客户'
  },
  REPEAT: { 
    label: '复购', 
    icon: '🔄', 
    color: 'text-green-600 bg-green-100',
    description: '复购客户，购买次数≥2次的客户'
  },
  FANATIC: { 
    label: '狂热', 
    icon: '🔥', 
    color: 'text-orange-600 bg-orange-100',
    description: '狂热客户，购买次数前20%的客户'
  },
  VIP: { 
    label: 'VIP', 
    icon: '👑', 
    color: 'text-purple-600 bg-purple-100',
    description: 'VIP客户，累计消费金额前20%的客户'
  },
  
  // 消费偏好维度
  HIGH_VALUE: { 
    label: '高客', 
    icon: '💎', 
    color: 'text-yellow-600 bg-yellow-100',
    description: '高客单价客户，客单价前20%的客户'
  },
  LOW_VALUE: { 
    label: '低客', 
    icon: '📉', 
    color: 'text-gray-600 bg-gray-100',
    description: '低客单价客户，客单价最低20%的客户'
  },
  
  // 活跃度维度
  DECLINING: { 
    label: '渐退', 
    icon: '💧', 
    color: 'text-blue-600 bg-blue-100',
    description: '渐退客户，基于最后购买时间的活跃度分类'
  },
  COOLING: { 
    label: '冷静', 
    icon: '❄️', 
    color: 'text-cyan-600 bg-cyan-100',
    description: '冷静客户，基于最后购买时间的活跃度分类'
  },
  SILENT: { 
    label: '沉默', 
    icon: '🏔️', 
    color: 'text-gray-600 bg-gray-100',
    description: '沉默客户，基于最后购买时间的活跃度分类'
  },
  LOST: { 
    label: '流失', 
    icon: '⚠️', 
    color: 'text-red-600 bg-red-100',
    description: '流失客户，基于最后购买时间的活跃度分类'
  },
  
  // 退货行为维度
  PICKY: { 
    label: '挑剔', 
    icon: '🔍', 
    color: 'text-pink-600 bg-pink-100',
    description: '挑剔客户，退货次数前20%的客户'
  },
  ASSASSIN: { 
    label: '刺客', 
    icon: '⚔️', 
    color: 'text-red-600 bg-red-100',
    description: '刺客客户，退货率前20%的客户'
  }
}

// 客户类型判断函数
const get_customer_labels = (customer: Customer, allCustomers: Customer[] = []): string[] => {
  const labels: string[] = []
  
  // 购买行为维度判断（基于动态阈值）
  const calculateBehaviorThresholds = () => {
    if (allCustomers.length === 0) {
      return { newThreshold: 1, repeatThreshold: 2 }
    }
    
    // 新客户：只有1次购买的客户
    const newThreshold = 1
    // 复购客户：购买次数≥2次的客户
    const repeatThreshold = 2
    
    return { newThreshold, repeatThreshold }
  }
  
  const behaviorThresholds = calculateBehaviorThresholds()
  
  if (customer.total_orders === behaviorThresholds.newThreshold) {
    labels.push('NEW')
  } else if (customer.total_orders >= behaviorThresholds.repeatThreshold) {
    labels.push('REPEAT')
  }
  
  // 计算动态阈值（基于所有客户数据）
  const calculateThresholds = () => {
    if (allCustomers.length === 0) {
      // 如果没有客户数据，使用默认阈值
      return {
        vipThreshold: 5000,
        fanaticThreshold: 10,
        highValueThreshold: 1000,
        lowValueThreshold: 200
      }
    }
    
    // 计算累计消费金额前20%的阈值（VIP阈值）
    const total_purchases = allCustomers.map(c => c.total_purchases).sort((a, b) => b - a)
    // 前20%的数量：Math.ceil(length * 0.2)，阈值取第20%位置的值
    const vipCount = Math.ceil(total_purchases.length * 0.2)
    const vipIndex = Math.max(0, vipCount - 1) // 索引从0开始，所以减1
    const vipThreshold = total_purchases[vipIndex] || 5000
    
    // 计算购买次数前20%的阈值（狂热客户阈值）
    const total_orders = allCustomers.map(c => c.total_orders).sort((a, b) => b - a)
    const fanaticCount = Math.ceil(total_orders.length * 0.2)
    const fanaticIndex = Math.max(0, fanaticCount - 1)
    const fanaticThreshold = total_orders[fanaticIndex] || 10
    
    // 计算有效客单价的分位数（基于有效订单，去除退货）
    // 注意：高客和低客需要过滤掉没有有效订单的客户，因为没有有效订单就没有客单价概念
    const validCustomers = allCustomers.filter(c => c.total_orders > 0) // 只包含有有效订单的客户
    const avgOrderValues = validCustomers
      .map(c => c.total_purchases / c.total_orders) // 有效消费金额 / 有效订单数量
      .sort((a, b) => b - a)
    
    // 高客：前20%的客单价阈值（基于有有效订单的客户）
    const highValueCount = Math.ceil(avgOrderValues.length * 0.2)
    const highValueIndex = Math.max(0, highValueCount - 1)
    const highValueThreshold = avgOrderValues[highValueIndex] || 1000
    
    // 低客：后20%的客单价阈值（基于有有效订单的客户）
    const lowValueCount = Math.ceil(avgOrderValues.length * 0.2)
    const lowValueIndex = Math.max(0, avgOrderValues.length - lowValueCount)
    const lowValueThreshold = avgOrderValues[lowValueIndex] || 200
    
    return {
      vipThreshold,
      fanaticThreshold,
      highValueThreshold,
      lowValueThreshold
    }
  }
  
  const thresholds = calculateThresholds()
  
  // VIP判断（累计消费金额前20%）
  if (customer.total_purchases >= thresholds.vipThreshold) {
    labels.push('VIP')
  }
  
  // 狂热客户判断（购买次数前20%）
  if (customer.total_orders >= thresholds.fanaticThreshold) {
    labels.push('FANATIC')
  }
  
  // 消费偏好维度判断（基于平均单价）
  if (customer.total_orders > 0) {
    const avgOrderValue = customer.total_purchases / customer.total_orders
    // 允许相同单价有些许偏差，使用大于等于比较
    if (avgOrderValue >= thresholds.highValueThreshold) {
      labels.push('HIGH_VALUE')
    // 允许相同单价有些许偏差，使用小于等于比较
    } else if (avgOrderValue <= thresholds.lowValueThreshold) {
      labels.push('LOW_VALUE')
    }
  }
  
  // 活跃度维度判断（基于动态阈值）
  const calculateActivityThresholds = () => {
    if (allCustomers.length === 0) {
      return {
        decliningThreshold: 31,
        coolingThreshold: 91,
        silentThreshold: 181,
        lostThreshold: 366
      }
    }
    
    // 获取所有客户的最后购买天数
    const now = new Date()
    const daysSinceLastPurchases = allCustomers
      .filter(c => c.last_purchase_date)
      .map(c => {
        const lastPurchase = new Date(c.last_purchase_date!)
        return Math.floor((now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
      })
      .sort((a, b) => a - b)
    
    if (daysSinceLastPurchases.length === 0) {
      return {
        decliningThreshold: 31,
        coolingThreshold: 91,
        silentThreshold: 181,
        lostThreshold: 366
      }
    }
    
    // 基于四分位数动态计算阈值
    const q1Index = Math.floor(daysSinceLastPurchases.length * 0.25)
    const q2Index = Math.floor(daysSinceLastPurchases.length * 0.5)
    const q3Index = Math.floor(daysSinceLastPurchases.length * 0.75)
    
    const decliningThreshold = daysSinceLastPurchases[q1Index] || 31
    const coolingThreshold = daysSinceLastPurchases[q2Index] || 91
    const silentThreshold = daysSinceLastPurchases[q3Index] || 181
    const lostThreshold = Math.max(silentThreshold + 30, 366) // 至少366天
    
    return {
      decliningThreshold,
      coolingThreshold,
      silentThreshold,
      lostThreshold
    }
  }
  
  if (customer.last_purchase_date) {
    const lastPurchase = new Date(customer.last_purchase_date)
    const now = new Date()
    const days_since_last_purchase = Math.floor((now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
    
    const activityThresholds = calculateActivityThresholds()
    
    if (days_since_last_purchase >= activityThresholds.decliningThreshold && days_since_last_purchase < activityThresholds.coolingThreshold) {
      labels.push('DECLINING')
    } else if (days_since_last_purchase >= activityThresholds.coolingThreshold && days_since_last_purchase < activityThresholds.silentThreshold) {
      labels.push('COOLING')
    } else if (days_since_last_purchase >= activityThresholds.silentThreshold && days_since_last_purchase < activityThresholds.lostThreshold) {
      labels.push('SILENT')
    } else if (days_since_last_purchase >= activityThresholds.lostThreshold) {
      labels.push('LOST')
    }
  }
  
  // 退货行为维度判断（基于动态阈值）
  const calculateRefundThresholds = () => {
    if (allCustomers.length === 0) {
      return { pickyThreshold: 5, assassinThreshold: 30 }
    }
    
    // 计算退货次数前20%的阈值（挑剔客户阈值）
    const refundCounts = allCustomers
      .map(c => c.refund_count || 0)
      .sort((a, b) => b - a)
    const pickyCount = Math.ceil(refundCounts.length * 0.2)
    const pickyIndex = Math.max(0, pickyCount - 1)
    const pickyThreshold = refundCounts[pickyIndex] || 0 // 可能为0
    
    // 计算退货率前20%的阈值（刺客客户阈值）
    // 注意：不要过滤掉退货率为0的客户，因为我们需要基于所有客户计算前20%
    const refundRates = allCustomers
      .map(c => c.refund_rate || 0)
      .sort((a, b) => b - a)
    const assassinCount = Math.ceil(refundRates.length * 0.2)
    const assassinIndex = Math.max(0, assassinCount - 1)
    const assassinThreshold = refundRates[assassinIndex] || 0 // 可能为0
    
    return { pickyThreshold, assassinThreshold }
  }
  
  const refundThresholds = calculateRefundThresholds()
  
  // 挑剔客户：退货次数前20%，且必须有退货记录
  if ((customer.refund_count || 0) >= refundThresholds.pickyThreshold && (customer.refund_count || 0) > 0) {
    labels.push('PICKY')
  }
  // 刺客客户：退货率前20%，且必须有退货记录
  if ((customer.refund_rate || 0) >= refundThresholds.assassinThreshold && (customer.refund_rate || 0) > 0) {
    labels.push('ASSASSIN')
  }
  
  return labels
}

export default function CustomerDetailModal({ customer, is_open, on_close, onCustomerUpdate, allCustomers = [] }: CustomerDetailModalProps) {
  const [active_tab, setActiveTab] = useState<'info' | 'purchases' | 'notes'>('info')
  const [purchases, setPurchases] = useState<CustomerPurchaseHistory | null>(null)
  const [notes, setNotes] = useState<CustomerNote[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNote, setNewNote] = useState({ category: 'OTHER' as const, content: '' })
  const [show_refund_modal, setShowRefundModal] = useState(false)
  const [selected_purchase, setSelectedPurchase] = useState<CustomerPurchase | null>(null)
  const [refund_loading, setRefundLoading] = useState(false)
  
  // 本地客户数据状态 - 用于立即显示更新后的数据
  const [localCustomer, setLocalCustomer] = useState<Customer>(customer)
  
  // 编辑状态
  const [is_editing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    wechat: customer?.wechat || '',
    birthday: customer?.birthday ? customer.birthday.split('T')[0] : ''
  })

  // 格式化金额
  const format_currency = (amount: any) => {
    const num = parseFloat(amount)
    if (isNaN(num) || !isFinite(num)) {
      return '¥0.00'
    }
    return `¥${num.toFixed(2)}`
  }

  // 格式化日期
  const format_date = (dateString: string) => {
    if (!dateString) return '暂无'
    return new Date(dateString).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 处理编辑表单变化
  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 保存编辑
  const handleSaveEdit = async () => {try {
      setLoading(true)
      const update_data = {
        name: editForm.name,
        phone: editForm.phone,
        address: editForm.address || undefined,
        wechat: editForm.wechat || undefined,
        birthday: editForm.birthday || undefined
      }
      
      console.log('🔍 [调试] 开始保存客户信息，更新数据:', update_data)
      console.log('🔍 [调试] 当前客户ID:', localCustomer.id)
      
      const response = await customer_api.update(localCustomer.id, update_data)
      
      console.log('🔍 [调试] 保存API响应:', response)
      
      if (response.success) {
        setIsEditing(false)
        toast.success('客户信息更新成功')
        
        console.log('🔍 [调试] 保存成功，重新获取最新客户数据')
        
        // 重新获取客户详情数据，确保显示最新信息
        await fetchCustomerDetail()
        
        // 通知父组件刷新客户数据（用于更新列表等）
        console.log('🔍 [调试] 通知父组件刷新客户数据')
        if (onCustomerUpdate) {
          onCustomerUpdate()
        }
      } else {
        console.error('🔍 [调试] 保存失败，响应:', response)
        toast.error(response.message || '更新失败')
      }
    } catch (error) {
      console.error('🔍 [调试] 更新客户信息异常:', error)
      toast.error('更新客户信息失败')
    } finally {
      setLoading(false)
    }
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditForm({
      name: localCustomer?.name || '',
      phone: localCustomer?.phone || '',
      address: localCustomer?.address || '',
      wechat: localCustomer?.wechat || '',
      birthday: localCustomer?.birthday ? localCustomer.birthday.slice(0, 16) : ''
    })
    setIsEditing(false)
  }

  // 获取客户标签（支持多个标签）
  const getCurrentCustomerLabels = () => {
    // 使用传入的所有客户数据来计算动态阈值
    console.log('🔍 [调试] 计算客户标签，当前客户:', localCustomer?.name || '未知', '所有客户数量:', allCustomers.length)
    const labels = localCustomer ? get_customer_labels(localCustomer, allCustomers) : []
    console.log('🔍 [调试] 计算得到的标签:', labels)
    return labels
  }

  // 获取客户详情数据
  const fetchCustomerDetail = async () => {
    if (!customer?.id) return
    
    try {
      console.log('🔍 [调试] 重新获取客户详情数据，客户ID:', customer.id)
      const response = await customer_api.get(customer.id)
      
      if (response.success && response.data) {
        // 后端返回的数据结构是 {customer: customerWithMapping} 或直接是 customerData
        const updatedCustomer = (response.data as any).customer || response.data as Customer
        console.log('🔍 [调试] 获取到最新客户数据:', updatedCustomer)
        setLocalCustomer(updatedCustomer)
        
        // 更新编辑表单数据
        if (!is_editing) {
          setEditForm({
            name: updatedCustomer.name || '',
            phone: updatedCustomer.phone || '',
            address: updatedCustomer.address || '',
            wechat: updatedCustomer.wechat || '',
            birthday: updatedCustomer.birthday ? updatedCustomer.birthday.slice(0, 16) : ''
          })
        }
      }
    } catch (error) {
      console.error('获取客户详情失败:', error)
      toast.error('获取客户详情失败')
    }
  }

  // 获取购买历史
  const fetch_purchases = async () => {
    try {
      setLoading(true)
      // 清理之前的数据
      setPurchases(null)
      
      console.log('🔍 [调试] 开始获取购买历史，客户ID:', localCustomer?.id || 'N/A', '客户姓名:', localCustomer?.name || '未知')
      const response = await customer_api.get_purchases(localCustomer?.id || '', { page: 1, limit: 10 })
      console.log('🔍 [调试] API响应:', response)
      
      if (response.success && response.data) {
        const purchaseData = response.data as any
        console.log('🔍 [调试] 购买记录数量:', purchaseData.purchases?.length || 0)
        console.log('🔍 [调试] 购买记录详情:', purchaseData.purchases)
        setPurchases(purchaseData as CustomerPurchaseHistory)
      } else {
        console.log('🔍 [调试] API响应失败或无数据')
        setPurchases(null)
      }
    } catch (error) {
      console.error('获取购买历史失败:', error)
      toast.error('获取购买历史失败')
      setPurchases(null)
    } finally {
      setLoading(false)
    }
  }

  // 获取客户备注
  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await customer_api.get_notes(localCustomer?.id || '')
      if (response.success && response.data && (response.data as any).notes) {
        setNotes((response.data as any).notes as CustomerNote[])
      } else {
        setNotes([])
      }
    } catch (error) {
      console.error('获取客户备注失败:', error)
      toast.error('获取客户备注失败')
    } finally {
      setLoading(false)
    }
  }

  // 添加备注
  const handleAddNote = async () => {
    if (!newNote.content.trim()) {
      toast.error('请输入备注内容')
      return
    }

    try {
      const response = await customer_api.add_note(localCustomer?.id || '', {
        content: newNote.content,
        category: newNote.category
      })
      
      if (response.success) {
        // 重新获取备注列表
        await fetchNotes()
        setNewNote({ category: 'OTHER', content: '' })
        setShowAddNote(false)
        toast.success('备注添加成功')
      } else {
        toast.error(response.message || '添加备注失败')
      }
    } catch (error) {
      console.error('添加备注失败:', error)
      toast.error('添加备注失败')
    }
  }

  // 打开退货弹窗
  const handleOpenRefund = (purchase: CustomerPurchase) => {
    setSelectedPurchase(purchase)
    setShowRefundModal(true)
  }

  // 处理退货
  const handleRefund = async (refundData: RefundData) => {
    if (!selected_purchase) return
    
    try {
      setRefundLoading(true)
      // 这里需要调用退货API，暂时使用customerApi的方法
      // 实际应该调用 skuApi.refund 或 customer_api.refund
      const response = await customer_api.refund_purchase(localCustomer?.id || '', selected_purchase.id, refundData)
      
      if (response.success) {
        // 重新获取购买历史
        await fetch_purchases()
        // 通知父组件刷新客户数据
        if (onCustomerUpdate) {
          onCustomerUpdate()
        }
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

  // 关闭退货弹窗
  const handleCloseRefund = () => {
    setShowRefundModal(false)
    setSelectedPurchase(null)
  }

  // 当客户切换时，清理所有状态并重新获取数据
  useEffect(() => {
    if (customer?.id) {
      console.log('🔍 [调试] 客户切换，重新初始化。新客户:', customer.name || '未知', 'ID:', customer.id)
      setLocalCustomer(customer)
      setPurchases(null)
      setNotes([])
      setActiveTab('info')
      setIsEditing(false)
      
      // 初始化编辑表单
      setEditForm({
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        wechat: customer.wechat || '',
        birthday: customer.birthday ? customer.birthday.slice(0, 16) : ''
      })
    }
  }, [customer?.id])

  useEffect(() => {
    if (is_open && active_tab === 'purchases' && customer?.id) {
      fetch_purchases()
    }
    if (is_open && active_tab === 'notes' && customer?.id) {
      fetchNotes()
    }
  }, [is_open, active_tab, customer?.id])

  if (!is_open) return null

  const customer_labels = getCurrentCustomerLabels()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-blue-600">
                {customer?.name?.charAt(0) || '?'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{customer?.name || '未知客户'}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex flex-wrap gap-1">
                  {customer_labels.map((labelKey: string) => {
                    const labelConfig = CUSTOMER_TYPE_LABELS[labelKey as keyof typeof CUSTOMER_TYPE_LABELS]
                    if (!labelConfig) return null
                    
                    return (
                      <div
                        key={labelKey}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${labelConfig.color}`}
                        title={labelConfig.description}
                      >
                        <span className="mr-1">{labelConfig.icon}</span>
                        {labelConfig.label}
                      </div>
                    )
                  })}
                  {customer_labels.length === 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                      <span className="mr-1">👤</span>
                      普通客户
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">#{customer?.customer_code || customer?.id || 'N/A'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={on_close}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'info', label: '基本信息', icon: User },
              { key: 'purchases', label: '购买历史', icon: ShoppingBag },
              { key: 'notes', label: '客户备注', icon: MessageSquare }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  active_tab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {active_tab === 'info' && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <User className="h-5 w-5 mr-2 text-gray-500" />
                      基本信息
                    </h3>
                    {!is_editing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        编辑
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={loading}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {loading ? '保存中...' : '保存'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {!is_editing ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">姓名：</span>
                        <span className="text-sm font-medium text-gray-900">{localCustomer?.name || '未知客户'}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">手机号：</span>
                        <span className="text-sm font-medium text-gray-900">{localCustomer?.phone || '未填写'}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">地址：</span>
                        <span className="text-sm font-medium text-gray-900">{localCustomer?.address || '未填写'}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">微信：</span>
                        <span className="text-sm font-medium text-gray-900">{localCustomer?.wechat || '未填写'}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">出生年月日：</span>
                        <span className="text-sm font-medium text-gray-900">
                          {localCustomer?.birthday ? format_date(localCustomer.birthday) : '未填写'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">注册时间：</span>
                        <span className="text-sm font-medium text-gray-900">
                          {localCustomer?.created_at ? format_date(localCustomer.created_at) : '暂无'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) = /> handleEditFormChange('name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="请输入客户姓名"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) = /> handleEditFormChange('phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="请输入手机号"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                        <input
                          type="text"
                          value={editForm.address}
                          onChange={(e) = /> handleEditFormChange('address', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="请输入客户地址（可选）"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">微信号</label>
                        <input
                          type="text"
                          value={editForm.wechat}
                          onChange={(e) = /> handleEditFormChange('wechat', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="请输入微信号（可选）"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">出生年月日</label>
                        <input
                          type="datetime-local"
                          value={editForm.birthday}
                          onChange={(e) = /> handleEditFormChange('birthday', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 统计数据 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-gray-500" />
                    消费统计
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                        <div>
                          <p className="text-xs text-blue-600 font-medium">累计消费</p>
                          <p className="text-lg font-bold text-blue-900">{format_currency(localCustomer?.total_purchases || 0)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <ShoppingBag className="h-5 w-5 text-green-600 mr-2" />
                        <div>
                          <p className="text-xs text-green-600 font-medium">订单数量</p>
                          <p className="text-lg font-bold text-green-900">{localCustomer?.total_orders || 0} 单</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-purple-600 mr-2" />
                        <div>
                          <p className="text-xs text-purple-600 font-medium">首次购买</p>
                          <p className="text-sm font-bold text-purple-900">{localCustomer?.first_purchase_date ? format_date(localCustomer.first_purchase_date) : '暂无'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-orange-600 mr-2" />
                        <div>
                          <p className="text-xs text-orange-600 font-medium">最后购买</p>
                          <p className="text-sm font-bold text-orange-900">{localCustomer?.last_purchase_date ? format_date(localCustomer.last_purchase_date) : '暂无'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {active_tab === 'purchases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <ShoppingBag className="h-5 w-5 mr-2 text-gray-500" />
                  购买历史
                </h3>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">加载中...</span>
                </div>
              ) : purchases && purchases.purchases.length > 0 ? (
                <div className="space-y-3">
                  {purchases.purchases.map((purchase) => {
                    const isRefunded = purchase.status === 'REFUNDED'
                    return (
                      <div key={purchase.id} className={`rounded-lg p-4 ${
                        isRefunded 
                          ? 'bg-red-50 border border-red-200' 
                          : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className={`font-medium ${
                                isRefunded 
                                  ? 'text-red-700 line-through' 
                                  : 'text-gray-900'
                              }`}>
                                {purchase.sku?.sku_name || '未知商品'}
                              </h4>
                              <span className={`text-sm ${
                                isRefunded ? 'text-red-500' : 'text-gray-500'
                              }`}>
                                #{purchase.sku?.sku_code}
                              </span>
                              {isRefunded && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  已退货
                                </span>
                              )}
                            </div>
                            <div className={`mt-1 text-sm ${
                              isRefunded ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              规格: {purchase.sku?.specification || '无'}
                            </div>
                            <div className={`mt-1 text-xs space-y-1 ${
                              isRefunded ? 'text-red-500' : 'text-gray-500'
                            }`}>
                              <div>购买时间: {format_date(purchase.purchase_date)}</div>
                              <div>销售渠道: {purchase.sale_channel || '未知'}</div>
                              {purchase.original_price && (
                                <div>原价: {format_currency(purchase.original_price)}</div>
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
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              isRefunded 
                                ? 'text-red-700 line-through' 
                                : 'text-gray-900'
                            }`}>
                              {format_currency(purchase.total_price)}
                            </div>
                            <div className={`text-sm ${
                              isRefunded ? 'text-red-500' : 'text-gray-500'
                            }`}>
                              数量: {purchase.quantity}
                            </div>
                            {purchase.original_price && purchase.original_price > purchase.total_price && (
                              <div className={`text-xs ${
                                isRefunded ? 'text-red-400' : 'text-red-500'
                              }`}>
                                优惠: {format_currency(purchase.original_price - purchase.total_price)}
                              </div>
                            )}
                            {!isRefunded && (
                              <div className="mt-2">
                                <button
                                  onClick={() => handleOpenRefund(purchase)}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-orange-600 rounded hover:bg-orange-700 transition-colors"
                                  title="退货"
                                >
                                  <Undo className="h-3 w-3 mr-1" />
                                  退货
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无购买记录</p>
                </div>
              )}
            </div>
          )}

          {active_tab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-gray-500" />
                  客户备注
                </h3>
                <button
                  onClick={() => setShowAddNote(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>添加备注</span>
                </button>
              </div>

              {/* 添加备注表单 */}
              {showAddNote && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">备注类型:</label>
                    <select
                      value={newNote.category}
                      onChange={(e) => setNewNote(prev => ({ ...prev, category: e.target.value as any }))}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.entries(NOTE_TYPE_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.icon} {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="请输入备注内容..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleAddNote}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Save className="h-3 w-3" />
                      <span>保存</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAddNote(false)
                        setNewNote({ category: 'OTHER', content: '' })
                      }}
                      className="flex items-center space-x-1 px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
                    >
                      <XCircle className="h-3 w-3" />
                      <span>取消</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 备注列表 */}
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note) => {
                    const noteConfig = NOTE_TYPE_CONFIG[note.category]
                    return (
                      <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${noteConfig.color}`}>
                            <span className="mr-1">{noteConfig.icon}</span>
                            {noteConfig.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format_date(note.created_at)} · {note.creator?.name || '未知用户'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无客户备注</p>
                  <p className="text-sm text-gray-400 mt-1">点击上方按钮添加第一条备注</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 退货确认弹窗 */}
        {show_refund_modal && selected_purchase && (
          <RefundConfirmModal
            purchase={selected_purchase}
            is_open={show_refund_modal}
            on_close={handleCloseRefund}
            onConfirm={handleRefund}
            loading={refund_loading}
          />
        )}
      </div>
    </div>
  )
}