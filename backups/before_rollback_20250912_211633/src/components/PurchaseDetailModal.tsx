import { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Edit,
  Trash2
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth';
import { purchaseApi, supplierApi, fixImageUrl } from '../services/api';
import { Purchase } from '../types';
import PermissionWrapper from './PermissionWrapper'
import { toast } from 'sonner';
import { formatPurchaseCode } from '../utils/fieldConverter';

interface PurchaseDetailModalProps {
  isOpen: boolean, onClose: () => void, purchase_id: string | null
  edit_mode?: boolean
  onEdit?: (purchase_id: string) => void
  onDelete?: () => void
  onSave?: () => void
}

export default function PurchaseDetailModal({ 
  isOpen, 
  onClose, 
  purchase_id, 
  edit_mode = false,
  onDelete,
  onSave
}: PurchaseDetailModalProps) {
  const { user } = useAuth()
  // 使用user变量避免未使用警告
  const canEdit = user?.role === 'BOSS'
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<Purchase & {supplier_name: string}>>({})
  const [suppliers, setSuppliers] = useState<Array<{id: string, name: string}>>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 获取供应商列表
  const fetchSuppliers = async () => {
    try {
      console.log('🔍 [PurchaseDetailModal] 开始获取供应商列表')
      const response = await supplierApi.getAll()
      console.log('📥 [PurchaseDetailModal] 供应商API响应:', response)
      
      if (response.success && response.data) {
        // 处理API返回的数据结构兼容性
        let suppliersList: Array<{id: string, name: string}> = []
        
        if ((response.data, as any).suppliers && Array.isArray((response.data, as any).suppliers)) {
          // 新的API格式：{suppliers: [...], pagination: {...}},
          suppliersList = (response.data, as any).suppliers
          console.log('✅ [PurchaseDetailModal] 使用新API格式，供应商数量:', suppliersList.length)
        } else if (Array.isArray(response.data)) {
          // 旧的API格式：直接返回数组
          suppliersList = response.data as Array<{id: string, name: string}>
          console.log('✅ [PurchaseDetailModal] 使用旧API格式，供应商数量:', suppliersList.length)
        } else {
          console.warn('⚠️ [PurchaseDetailModal] 未知的API数据格式:', response.data)
          suppliersList = []
        }
        
        // 确保设置的是有效的数组
        setSuppliers(Array.isArray(suppliersList) ? suppliersList : [])
      } else {
        console.warn('⚠️ [PurchaseDetailModal] API响应失败或无数据:', response)
        setSuppliers([])
      }
    } catch (error) {
      console.error('❌ [PurchaseDetailModal] 获取供应商列表失败:', error)
      // 确保在错误情况下suppliers仍然是数组
      setSuppliers([])
    }
  }

  // 获取采购详情
  const fetchPurchaseDetail = async () => {
    if (!purchase_id) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await purchaseApi.get(purchase_id)
      console.log('采购详情API响应:', response)
      
      if (response.success && response.data) {
        const purchaseData = response.data as Purchase
        // 修复图片URL协议问题
        if (purchaseData.photos) {
          // 如果photos是字符串，先解析为数组
          if (typeof, purchaseData.photos === 'string') {
            try {
              purchaseData.photos = JSON.parse(purchaseData.photos)
            } catch (e) {
              console.error('解析photos, JSON失败:', e)
              purchaseData.photos = []
            }
          }
          // 确保是数组后再处理URL
          if (Array.isArray(purchaseData.photos)) {
            purchaseData.photos = purchaseData.photos.map(fixImageUrl)
          }
        }
        
        // 调试日志：检查edit_logs数据
        console.log('📝 修改日志数据:', {
          hasEditLogs: !!purchaseData.edit_logs,
        edit_logs_count: purchaseData.edit_logs?.length || 0,
        edit_logs: purchaseData.edit_logs
        })
        
        setPurchase(purchaseData)
        setSelectedImageIndex(0)
      } else {
        setError(response.message || '获取采购详情失败')
      }
    } catch (error) {
      console.error('获取采购详情失败:', error)
      setError(error, instanceof Error ? error.message : '获取采购详情失败')
      toast.error('获取采购详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && purchase_id) {
      fetchPurchaseDetail()
      fetchSuppliers()
      setIsEditMode(edit_mode || false)
    } else {
      setPurchase(null)
      setError(null)
      setSelectedImageIndex(0)
      setIsEditMode(false)
      setEditData({})
      setSuggestions({})
    }
  }, [isOpen, purchase_id, edit_mode])

  // 当获取到采购数据时，初始化编辑数据
  useEffect(() => {
    if (purchase && isEditMode) {
      const baseData = {
        product_name: purchase.product_name || '',
        quality: (purchase.quality, as 'AA' | 'A' | 'AB' | 'B' | 'C') || undefined,
        price_per_gram: purchase.price_per_gram || 0,
        total_price: purchase.total_price || 0,
        weight: purchase.weight || 0,
        supplier_name: purchase.supplier?.name || '',
        notes: purchase.notes || ''
      }
      
      // 根据产品类型添加相应字段
      if (purchase.product_type === 'BRACELET') {
        // 手串类型：使用quantity, bead_diameter, beads_per_string, total_beads
        setEditData({
          ...baseData,
          quantity: purchase.quantity || undefined,
          bead_diameter: purchase.bead_diameter || undefined,
          beads_per_string: purchase.beads_per_string || undefined,
          total_beads: purchase.total_beads || undefined
        })
      } else {
        // 其他类型：使用piece_count和对应的规格字段
        const editDataObj: any = {
          ...baseData,
          piece_count: purchase.piece_count || undefined
        }
        
        if (purchase.product_type === 'LOOSE_BEADS') {
          editDataObj.bead_diameter = purchase.bead_diameter || undefined
        } else if (purchase.product_type === 'ACCESSORIES' || purchase.product_type === 'FINISHED') {
          editDataObj.specification = purchase.specification || undefined
        }
        
        setEditData(editDataObj)
      }
    }
  }, [purchase, isEditMode])

  // 切换编辑模式
  const toggleEditMode = () => {
    if (!canEdit) return
    
    if (isEditMode) {
      // 退出编辑模式，重置数据
      setIsEditMode(false)
      setEditData({})
      setSuggestions({})
    } else {
      // 进入编辑模式，初始化编辑数据
      setIsEditMode(true)
      if (purchase) {
        const baseData = {
          product_name: purchase.product_name || '',
          quality: (purchase.quality, as 'AA' | 'A' | 'AB' | 'B' | 'C') || undefined,
          price_per_gram: purchase.price_per_gram || 0,
          total_price: purchase.total_price || 0,
          weight: purchase.weight || 0,
          supplier_name: purchase.supplier?.name || '',
          notes: purchase.notes || ''
        }
        
        // 根据产品类型添加相应字段
        if (purchase.product_type === 'BRACELET') {
          // 手串类型：使用quantity, bead_diameter, beads_per_string, total_beads
          setEditData({
            ...baseData,
            quantity: purchase.quantity || undefined,
            bead_diameter: purchase.bead_diameter || undefined,
            beads_per_string: purchase.beads_per_string || undefined,
            total_beads: purchase.total_beads || undefined
          })
        } else {
          // 其他类型：使用piece_count和对应的规格字段
          const editDataObj: any = {
            ...baseData,
            piece_count: purchase.piece_count || undefined
          }
          
          if (purchase.product_type === 'LOOSE_BEADS') {
            editDataObj.bead_diameter = purchase.bead_diameter || undefined
          } else if (purchase.product_type === 'ACCESSORIES' || purchase.product_type === 'FINISHED') {
            editDataObj.specification = purchase.specification || undefined
          }
          
          setEditData(editDataObj)
        }
      }
    }
  }

  // 更新编辑数据
  const updateEditData = (field: string, value: any) => {
    console.log('🔍 [前端updateEditData] 字段:', field, '值:', value, '类型:', typeof, value)
    
    // 特别关注total_beads字段的更新
    if (field === 'total_beads') {
      console.log('🔍 [total_beads更新] 用户输入值:', value, '类型:', typeof, value)
      console.log('🔍 [total_beads更新] 当前editData:', editData)
    }
    
    setEditData(prev => {
      const newData = { ...prev, [field]: value },
      console.log('🔍 [前端updateEditData] 更新后的editData:', newData)
      
      // 特别关注total_beads字段的保存结果
      if (field === 'total_beads') {
        console.log('🔍 [total_beads更新] 保存后的total_beads值:', newData.total_beads, '类型:', typeof, newData.total_beads)
      }
      
      return newData
    })
    // 建议值会通过useEffect自动计算
  }

  // 持续验证和建议值的状态
  const [suggestions, setSuggestions] = useState<{
    beads_per_string?: number
    total_beads?: number
    price_per_bead?: number
    price_per_piece?: number
    weight?: number
    total_price?: number
    price_per_gram?: number
    beads_count_warning?: {
      type: 'info'
      message: string, calculated_value: number
    },
    inconsistency_warning?: {
      type: 'warning'
      message: string
      options: {
        total_price: string, price_per_gram: string, weight: string
      }
    }
  }>({})

  // 全面的智能计算建议值函数 - 重新设计的计算逻辑
  const calculateAllSuggestions = (currentEditData: any, originalData: any) => {
    // 获取产品类型
    const productType = originalData?.product_type || 'BRACELET'
    
    // 根据产品类型获取正确的数量字段
    let quantity = 0
    let originalQuantity = 0
    
    if (productType === 'BRACELET') {
      // 手串类型使用quantity字段（串数）
      quantity = typeof currentEditData.quantity === 'string' ? parseFloat(currentEditData.quantity) : (currentEditData.quantity || 0)
      originalQuantity = originalData?.quantity || 0
    } else {
      // 其他类型（散珠、饰品配件、成品）使用piece_count字段
      quantity = typeof currentEditData.piece_count === 'string' ? parseFloat(currentEditData.piece_count) : (currentEditData.piece_count || 0)
      originalQuantity = originalData?.piece_count || 0
    }
    
    const beads_per_string = typeof currentEditData.beads_per_string === 'string' ? parseFloat(currentEditData.beads_per_string) : (currentEditData.beads_per_string || 0)
    const total_beads = typeof currentEditData.total_beads === 'string' ? parseFloat(currentEditData.total_beads) : (currentEditData.total_beads || 0)
    const total_price = typeof currentEditData.total_price === 'string' ? parseFloat(currentEditData.total_price) : (currentEditData.total_price || 0)
    const weight = typeof currentEditData.weight === 'string' ? parseFloat(currentEditData.weight) : (currentEditData.weight || 0)
    const price_per_gram = typeof currentEditData.price_per_gram === 'string' ? parseFloat(currentEditData.price_per_gram) : (currentEditData.price_per_gram || 0)
    const bead_diameter = typeof currentEditData.bead_diameter === 'string' ? parseFloat(currentEditData.bead_diameter) : (currentEditData.bead_diameter || 0)
    
    // 获取原始数据用于比较
    // const originalPricePerGram = originalData?.price_per_gram || 0
    // const originalWeight = originalData?.weight || 0
    // const originalTotalPrice = originalData?.total_price || 0
    const originalTotalBeads = originalData?.total_beads || 0
    
    const newSuggestions: typeof suggestions = {}
    
    // 1. 每串颗数计算 - 基于手围和直径
    // 标准手围160mm，每串颗数 = 手围 ÷ 直径
    if (bead_diameter > 0) {
      const standardWristSize = 160 // 标准手围160mm
      const calculatedBeadsPerString = Math.round(standardWristSize / bead_diameter)
      if (Math.abs(beads_per_string - calculatedBeadsPerString) > 0.1) {
        newSuggestions.beads_per_string = calculatedBeadsPerString
      }
    }
    
    // 2. 数量变化检测和相关计算（根据产品类型）
    const quantityChanged = Math.abs(quantity - originalQuantity) > 0.1
    const totalBeadsChanged = Math.abs(total_beads - originalTotalBeads) > 0.1
    
    if (productType === 'BRACELET' && quantityChanged && beads_per_string > 0) {
      // 手串类型：串数变化时，只有在用户没有手动修改总颗数的情况下才建议新的总颗数
      if (!totalBeadsChanged) {
        const calculatedTotalBeads = quantity * beads_per_string
        newSuggestions.total_beads = calculatedTotalBeads
        
        // 如果有总价，计算新的每颗价格
        if (total_price > 0 && calculatedTotalBeads > 0) {
          const calculatedPricePerBead = total_price / calculatedTotalBeads
          newSuggestions.price_per_bead = calculatedPricePerBead
        }
      }
    } else if (productType !== 'BRACELET' && quantityChanged && total_price > 0) {
      // 其他类型：数量变化时，计算新的单价
      if (quantity > 0) {
        const calculatedPricePerPiece = total_price / quantity
        newSuggestions.price_per_piece = calculatedPricePerPiece
      }
    }
    
    // 3. 总颗数计算和验证 - 仅适用于手串类型
    if (productType === 'BRACELET') {
      if (quantity > 0 && beads_per_string > 0 && !totalBeadsChanged && !quantityChanged) {
        // 总颗数和串数都未手动修改时，自动计算建议值
        const calculatedTotalBeads = quantity * beads_per_string
        if (Math.abs(total_beads - calculatedTotalBeads) > 0.1) {
          newSuggestions.total_beads = calculatedTotalBeads
        }
      } else if (totalBeadsChanged && quantity > 0 && beads_per_string > 0 && !quantityChanged) {
        // 总颗数被手动修改但串数未变时，检查是否与计算值不符，仅作提醒
        const calculatedTotalBeads = quantity * beads_per_string
        if (Math.abs(total_beads - calculatedTotalBeads) > 0.1) {
          newSuggestions.beads_count_warning = {
            type: 'info',
            message: `提醒：当前总颗数(${total_beads})与计算值(${calculatedTotalBeads})不符`,
            calculated_value: calculatedTotalBeads
          }
        }
      }
    }
    
    // 4. 单价计算 - 根据产品类型计算不同的单价
    if (productType === 'BRACELET') {
      // 手串类型：计算每颗单价 = 总价 ÷ 总颗数
      if (total_price > 0 && total_beads > 0 && !quantityChanged) {
        const calculatedPricePerBead = total_price / total_beads
        newSuggestions.price_per_bead = calculatedPricePerBead
      }
    } else {
      // 其他类型：计算每件/每片单价 = 总价 ÷ 数量
      if (total_price > 0 && quantity > 0 && !quantityChanged) {
        const calculatedPricePerPiece = total_price / quantity
        newSuggestions.price_per_piece = calculatedPricePerPiece
      }
    }
    
    // 5. 价格-重量-克价关联计算（优先级逻辑）
    // 检查哪些字段被修改了（暂时未使用，保留用于未来功能）
    // const priceChanged = Math.abs(total_price - originalTotalPrice) > 0.1
    // const weightChanged = Math.abs(weight - originalWeight) > 0.1
    // const pricePerGramChanged = Math.abs(price_per_gram - originalPricePerGram) > 0.1
    
    // 三选二计算逻辑：克价、总价、重量
    const hasValidPrice = total_price > 0
    const hasValidWeight = weight > 0
    const hasValidPricePerGram = price_per_gram > 0
    
    // 计算缺失值的逻辑
    if (hasValidPrice && hasValidPricePerGram && !hasValidWeight) {
      // 有总价和克价，计算重量
      const calculatedWeight = total_price / price_per_gram
      newSuggestions.weight = calculatedWeight
    } else if (hasValidPrice && hasValidWeight && !hasValidPricePerGram) {
      // 有总价和重量，计算克价
      const calculatedPricePerGram = total_price / weight
      newSuggestions.price_per_gram = calculatedPricePerGram
    } else if (hasValidPricePerGram && hasValidWeight && !hasValidPrice) {
      // 有克价和重量，计算总价
      const calculatedTotalPrice = price_per_gram * weight
      newSuggestions.total_price = calculatedTotalPrice
    } else if (hasValidPrice && hasValidPricePerGram && hasValidWeight) {
      // 三者都有值，检查是否一致
      const calculatedTotalPrice = price_per_gram * weight
      const tolerance = 0.1 // 允许0.1的误差
      
      if (Math.abs(total_price - calculatedTotalPrice) > tolerance) {
        // 数据不一致，提供三种调整选项
        newSuggestions.inconsistency_warning = {
          type: 'warning',
          message: '价格数据不一致',
          options: {
            total_price: (price_per_gram * weight).toFixed(1),
            price_per_gram: weight > 0 ? (total_price / weight).toFixed(1) : '0',
            weight: price_per_gram > 0 ? (total_price / price_per_gram).toFixed(1) : '0'
          }
        }
      }
    }
    
    return newSuggestions
  }

  // 持续更新建议值 - 每次编辑数据变化时都重新计算
  useEffect(() => {
    if (isEditMode && Object.keys(editData).length > 0 && purchase) {
      const newSuggestions = calculateAllSuggestions(editData, purchase)
      setSuggestions(newSuggestions)
    }
  }, [editData, isEditMode, purchase])

  // 保存编辑
  const handleSave = async () => {
    if (!purchase || !canEdit) return
    
    try {
      setLoading(true)
      
      // 调试：在开始处理前打印当前状态
      console.log('🔍 [handleSave开始] 当前editData完整状态:', editData)
      console.log('🔍 [handleSave开始] editData.total_beads:', editData.total_beads, '类型:', typeof, editData.total_beads)
      console.log('🔍 [handleSave开始] purchase.total_beads:', purchase.total_beads, '类型:', typeof, purchase.total_beads)
      console.log('🔍 [handleSave开始] editData字段数量:', Object.keys(editData).length)
      console.log('🔍 [handleSave开始] editData所有字段:', Object.keys(editData))
      
      // 准备更新数据，只发送有变化的字段
      const updateData: any = {}
      
      // 检查每个字段是否有变化（使用snake_case格式发送给后端）
      if (editData.product_name !== undefined && editData.product_name !== purchase.product_name) {
        updateData.product_name = editData.product_name
      },
      if (editData.quantity !== undefined && editData.quantity !== purchase.quantity) {
        updateData.quantity = editData.quantity
      },
      if (editData.piece_count !== undefined && editData.piece_count !== purchase.piece_count) {
        updateData.piece_count = editData.piece_count
      },
      if (editData.bead_diameter !== undefined && editData.bead_diameter !== purchase.bead_diameter) {
        updateData.bead_diameter = editData.bead_diameter
      },
      if (editData.specification !== undefined && editData.specification !== purchase.specification) {
        updateData.specification = editData.specification
      },
      if (editData.quality !== undefined && editData.quality !== purchase.quality) {
        updateData.quality = editData.quality
      },
      if (editData.price_per_gram !== undefined && editData.price_per_gram !== purchase.price_per_gram) {
        updateData.price_per_gram = editData.price_per_gram
      },
      if (editData.total_price !== undefined && editData.total_price !== purchase.total_price) {
        updateData.total_price = editData.total_price
      },
      if (editData.weight !== undefined && editData.weight !== purchase.weight) {
        updateData.weight = editData.weight
      },
      if (editData.beads_per_string !== undefined && editData.beads_per_string !== purchase.beads_per_string) {
        updateData.beads_per_string = editData.beads_per_string
      }
      // 特殊处理total_beads字段，确保数值类型比较正确
      if (editData.total_beads !== undefined) {
        const editValue = Number(editData.total_beads)
        const originalValue = Number(purchase.total_beads || 0)
        console.log('🔍 [total_beads调试] editData.total_beads:', editData.total_beads, '类型:', typeof, editData.total_beads, '转换后:', editValue)
        console.log('🔍 [total_beads调试] purchase.total_beads:', purchase.total_beads, '类型:', typeof, purchase.total_beads, '转换后:', originalValue)
        console.log('🔍 [total_beads调试] 数值比较结果:', editValue !== originalValue)
        
        if (editValue !== originalValue) {
          updateData.total_beads = editValue
          console.log('🔍 [total_beads调试] 已添加到updateData:', editValue)
        } else {
          console.log('🔍 [total_beads调试] 数值相等，未添加到updateData')
        }
      } else {
        console.log('🔍 [total_beads调试] editData.total_beads为undefined，跳过')
      },
      if (editData.supplier_name !== undefined && editData.supplier_name !== (purchase.supplier?.name || '')) {
        updateData.supplier_name = editData.supplier_name
      },
      if (editData.notes !== undefined && editData.notes !== purchase.notes) {
        updateData.notes = editData.notes
      }
      
      // 如果没有任何变化，直接退出编辑模式
      if (Object.keys(updateData).length === 0) {
        toast.info('没有检测到任何变化')
        setIsEditMode(false)
        setEditData({})
        return
      }
      
      console.log('🔍 [前端调试] editData内容:', editData)
      console.log('🔍 [前端调试] purchase原始数据:', {
        product_name: purchase.product_name,
        quantity: purchase.quantity,
        piece_count: purchase.piece_count,
        bead_diameter: purchase.bead_diameter,
        specification: purchase.specification,
        quality: purchase.quality,
        price_per_gram: purchase.price_per_gram,
        total_price: purchase.total_price,
        weight: purchase.weight,
        beads_per_string: purchase.beads_per_string,
        total_beads: purchase.total_beads,
        supplier_name: purchase.supplier?.name,
        notes: purchase.notes
      })
      console.log('🔍 [前端调试] 准备更新的数据:', updateData)
      console.log('🔍 [前端调试] updateData字段数量:', Object.keys(updateData).length)
      console.log('🔍 [前端调试] updateData详细内容:', JSON.stringify(updateData, null, 2))
      console.log('🔍 [前端调试] 即将调用API:', `purchaseApi.update(${purchase.id}, updateData)`)
      
      // 调用后端API保存数据
      console.log('🚀 [API调用] 开始调用purchaseApi.update')
      const response = await purchaseApi.update(purchase.id, updateData)
      console.log('📥 [API响应] purchaseApi.update响应:', response)
      
      if (response.success) {
        toast.success('保存成功')
        setIsEditMode(false)
        setEditData({})
        setSuggestions({})
        
        // 重新获取数据
        await fetchPurchaseDetail()
        
        // 通知父组件刷新列表
        if (onSave) {
          onSave()
        }
      } else {
        // 处理业务逻辑错误，如成品使用了珠子的情况
        if ((response.data, as any)?.usedByProducts && (response.data, as any).usedByProducts.length > 0) {
          const productNames = (response.data, as any).usedByProducts.map((p: any) => p.productName).join('、')
          toast.error(
            `无法编辑该采购记录，因为以下成品正在使用其珠子：${productNames}。请先将这些成品销毁，使珠子回退到库存后再编辑。`,
            {
              duration: 8000, // 延长显示时间
              style: {
                maxWidth: '500px'
              }
            }
          )
        } else {
          toast.error(response.message || '保存失败')
        }
      }
    } catch (error: any) {
      // errorHandler已经处理了API错误并显示了toast，但我们需要确保用户能看到错误提示
      // 只有当errorHandler没有处理时才显示通用错误
      if (!error.response) {
        // 网络错误或其他非API错误
        toast.error('网络连接失败，请检查网络后重试')
      }
      // 不再输出额外的控制台错误，避免重复
    } finally {
      setLoading(false)
    }
  }

  // 删除采购记录
  const handleDelete = async () => {
    if (!purchase || !canEdit) return
    
    try {
      setLoading(true)
      
      const response = await purchaseApi.delete(purchase.id)
      
      if (response.success) {
        toast.success(response.message || '采购记录删除成功')
        setShowDeleteConfirm(false)
        onClose()
        // 通知父组件刷新列表
        if (onDelete) {
          onDelete()
        }
      } else {
        // 处理业务逻辑错误，如成品使用了珠子的情况
        if ((response.data, as any)?.used_by_products && (response.data, as any).used_by_products.length > 0) {
          const productNames = (response.data, as any).used_by_products.map((p: any) => p.product_name).join('、')
          toast.error(
            `无法删除该采购记录，因为以下成品正在使用其珠子：${productNames}。请先将这些成品拆散，使珠子回退到库存后再删除。`,
            {
              duration: 8000, // 延长显示时间
              style: {
                maxWidth: '500px'
              }
            }
          )
        } else {
          toast.error(response.message || '删除失败')
        }
      }
    } catch (error: any) {
      console.error('删除采购记录失败:', error)
      
      // 注意：errorHandler已经自动处理了API错误并显示了toast提示
      // 这里只处理非API错误的情况，避免重复显示错误提示
      if (!error.response) {
        // 只有在非HTTP响应错误时才显示额外的错误提示（如网络连接问题）
        toast.error('网络连接失败，请检查网络后重试')
      }
      // 如果是HTTP响应错误，errorHandler已经处理了，不需要再次显示toast
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // 格式化价格
  const formatPrice = (price: number | string | null | undefined) => {
    if (price === null || price === undefined || price === '') return '-'
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(numPrice)) return '-'
    return `¥${numPrice.toFixed(1)}`
  }

  // 格式化品相
  const formatQuality = (quality: string | undefined) => {
    if (!quality) return '未知'
    return `${quality}级`
  }

  // 渲染编辑字段
  const renderEditField = (field: string, _label: string, value: any, type: 'text' | 'number' | 'select' = 'text', options?: string[]) => {
    if (!isEditMode) {
      // 显示模式
      if (field === 'price_per_gram' || field === 'total_price') {
        return user?.role === 'EMPLOYEE' ? '-' : formatPrice(value)
      },
      if (field === 'weight') {
        const weightValue = typeof value === 'object' && value !== null ? (value.weight || value.value || '') : value
        return user?.role === 'EMPLOYEE' ? '-' : (weightValue ? `${weightValue}g` : '-')
      },
      if (field === 'quality') {
        return formatQuality(value)
      },
      if (field === 'quantity') {
        const quantityValue = typeof value === 'object' && value !== null ? (value.quantity || value.value || '') : value
        return quantityValue ? `${quantityValue}串` : '-'
      },
      if (field === 'bead_diameter') {
        const diameterValue = typeof value === 'object' && value !== null ? (value.bead_diameter || value.diameter || value.value || '') : value
        return diameterValue ? `${diameterValue}mm` : '-'
      },
      if (field === 'beads_per_string') {
        const beadsValue = typeof value === 'object' && value !== null ? (value.beads_per_string || value.value || '') : value
        return beadsValue ? `${beadsValue}颗` : '-'
      },
      if (field === 'total_beads') {
        const totalBeadsValue = typeof value === 'object' && value !== null ? (value.total_beads || value.value || '') : value
        return totalBeadsValue ? `${totalBeadsValue}颗` : '-'
      },
      if (field === 'piece_count') {
        const pieceCountValue = typeof value === 'object' && value !== null ? (value.piece_count || value.value || '') : value
        return pieceCountValue ? `${pieceCountValue}` : '-'
      },
      if (field === 'supplier_name') {
        return value || '-'
      },
      return value || '-'
    }

    // 编辑模式 - 确保currentValue永远不为null
    let currentValue = (editData, as any)[field] !== undefined ? (editData, as any)[field] : value
    
    // 特别处理null值，确保React受控组件不会收到null
    if (currentValue === null || currentValue === undefined) {
      currentValue = type === 'number' ? 0 : ''
    }
    
    console.log(`🔍 [renderEditField] 字段: ${field}, 原始值: ${value}, 当前值: ${currentValue}, 类型: ${typeof, currentValue}`)

    if (type === 'select' && options) {
      // 确保select的value不为null
      const safeSelectValue = currentValue === null || currentValue === undefined ? '' : String(currentValue)
      
      return (
        <select
          value={safeSelectValue},
          onChange={(e) => updateEditData(field, e.target.value)},
          className="w-32 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent h-8 border-gray-300"
        >
          <option value="">请选择</option>
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )
    }

    // 供应商下拉框
    if (field === 'supplier_name') {
      // 安全检查：确保suppliers是数组
      const safeSuppliers = Array.isArray(suppliers) ? suppliers : []
      // 确保select的value不为null
      const safeSupplierValue = currentValue === null || currentValue === undefined ? '' : String(currentValue)
      
      return (
        <select
          value={safeSupplierValue},
          onChange={(e) => updateEditData(field, e.target.value)},
          className="w-32 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent h-8 border-gray-300"
        >
          <option value="">请选择供应商</option>
          {safeSuppliers.map(supplier => (
            <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
          ))}
        </select>
      )
    }

    // 判断是否为整数字段
    const isIntegerField = ['quantity', 'beads_per_string', 'total_beads', 'piece_count', 'min_stock_alert'].includes(field)
    
    // 确保value属性永远不为null或undefined，避免React受控组件警告
    const safeValue = currentValue === null || currentValue === undefined ? 
      (type === 'number' ? '' : '') : 
      String(currentValue)
    
    return (
      <input
        type={type},
        value={safeValue},
        onChange={(e) => {
          if (type === 'number') {
            if (isIntegerField) {
              // 整数字段：使用parseInt，不允许小数
              const intValue = parseInt(e.target.value) || 0
              updateEditData(field, intValue)
            } else {
              // 小数字段：使用parseFloat
              const floatValue = parseFloat(e.target.value) || 0
              updateEditData(field, floatValue)
            }
          } else {
            updateEditData(field, e.target.value)
          }
        }},
        className="w-32 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent h-8 border-gray-300"
        step={type === 'number' ? (isIntegerField ? '1' : '0.1') : undefined},
        min={type === 'number' && isIntegerField ? '1' : undefined},
        onKeyDown={(e) => {
          // 对于整数字段，阻止输入小数点和负号
          if (isIntegerField && type === 'number') {
            if (e.key === '.' || e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
              e.preventDefault()
            }
          }
        }}
      />
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* 弹窗内容 */}
        <div className="inline-block w-full max-w-2xl p-4 md:p-6 my-4 md:my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl max-h-[95vh] overflow-y-auto">
          {/* 弹窗头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6 text-gray-700" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">采购详情</h3>
                {purchase && (
                  <p className="text-sm text-gray-500">{purchase.purchase_code || formatPurchaseCode(purchase.id)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {purchase && canEdit && (
                <PermissionWrapper allowed_roles={['BOSS']}>
                  {isEditMode ? (
                    <>
                      <button
                        onClick={handleSave},
                        disabled={loading},
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)},
                        disabled={loading},
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-1"
                        title="删除采购记录"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>删除</span>
                      </button>
                      <button
                        onClick={toggleEditMode},
                        className="px-3 py-1 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={toggleEditMode},
                      className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </PermissionWrapper>
              )}
              <button
                onClick={onClose},
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
                  <p className="text-sm text-gray-600">加载中...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center space-y-2 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {purchase && (
              <div className="space-y-6">
                {/* 手机端：重新设计的三行布局 */}
                <div className="block md:hidden space-y-6">
                  {/* 第一行：照片和基本信息并排布局 */}
                  <div className="flex gap-4">
                    {/* 照片区域 - 占50%宽度 */}
                    <div className="w-1/2">
                      <div className="aspect-square">
                        {purchase.photos && purchase.photos.length > 0 ? (
                          <img
                            src={purchase.photos[selectedImageIndex]},
                            alt={`${purchase.product_name} - 图片 ${selectedImageIndex + 1}`},
                            className="w-full h-full object-contain rounded-lg border border-gray-200 shadow-sm bg-gray-50"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/placeholder-image.png'
                              console.error('图片加载失败:', purchase.photos?.[selectedImageIndex])
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 基本信息区域 - 占50%宽度 */}
                    <div className="w-1/2">
                      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm h-full">
                        <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center">
                          <Package className="h-3 w-3 mr-1" />
                          基本信息
                        </h4>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">产品</span>
                            <span className="font-medium text-gray-900 truncate text-xs max-w-20">
                              {renderEditField('product_name', '产品名称', purchase.product_name)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">数量</span>
                            <span className="font-medium text-gray-900 text-xs">
                              {renderEditField('quantity', '数量', purchase.quantity, 'number')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">直径</span>
                            <span className="font-medium text-gray-900 text-xs">
                              {renderEditField('bead_diameter', '直径', purchase.bead_diameter, 'number')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">品相</span>
                            <span className="font-medium text-gray-900 text-xs">
                              {renderEditField('quality', '品相', purchase.quality, 'select', ['AA', 'A', 'AB', 'B', 'C'])}
                            </span>
                          </div>
                          {user?.role === 'BOSS' && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-xs">克价</span>
                                <div className="font-medium text-gray-900 text-right flex-1 ml-1 text-xs">
                                  {renderEditField('price_per_gram', '克价', purchase.price_per_gram, 'number')}
                                  {/* 建议值显示 */}
                                  {isEditMode && suggestions.price_per_gram && (
                                    <div className="text-xs text-red-600 mt-0.5">
                                      建议: ¥{suggestions.price_per_gram.toFixed(1)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-xs">总价</span>
                                <div className="font-medium text-gray-900 text-right flex-1 ml-1 text-xs">
                                  {renderEditField('total_price', '总价', purchase.total_price, 'number')}
                                  {/* 建议值显示 */}
                                  {isEditMode && suggestions.total_price && (
                                    <div className="text-xs text-red-600 mt-0.5">
                                      建议: ¥{suggestions.total_price.toFixed(1)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-xs">重量</span>
                                <div className="font-medium text-gray-900 text-right flex-1 ml-1 text-xs">
                                  {renderEditField('weight', '重量', purchase.weight, 'number')}
                                  {/* 建议值显示 */}
                                  {isEditMode && suggestions.weight && (
                                    <div className="text-xs text-red-600 mt-0.5">
                                      建议: {suggestions.weight.toFixed(1)}g
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-xs">供应商</span>
                                <span className="font-medium text-gray-900 text-right flex-1 ml-1 text-xs truncate max-w-16">
                                  {renderEditField('supplier_name', '供应商', purchase.supplier?.name || '')}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 第二行：三个预估框 */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm mt-6">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm">
                            <p className="text-green-600 text-xs font-medium mb-1">每串</p>
                            <div className="font-semibold text-green-900 text-sm mb-1">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={editData.beads_per_string !== undefined ? editData.beads_per_string : purchase.beads_per_string || ''},
                                  onChange={(e) => updateEditData('beads_per_string', parseInt(e.target.value) || 0)},
                                  className="w-full text-center bg-white border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-1 py-1"
                                  min="1"
                                />
                              ) : (
                                purchase.beads_per_string || '-'
                              )}
                            </div>
                            <p className="text-green-600 text-xs">颗</p>
                            {/* 建议值显示 */}
                            {isEditMode && suggestions.beads_per_string && (
                              <div className="text-xs text-red-600 mt-1">
                                建议: {suggestions.beads_per_string.toFixed(1)}
                              </div>
                            )}
                          </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200 shadow-sm">
                        <p className="text-purple-600 text-xs font-medium mb-1">总计</p>
                        <div className="font-semibold text-purple-900 text-sm mb-1">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={editData.total_beads !== undefined ? editData.total_beads : purchase.total_beads || ''},
                              onChange={(e) => updateEditData('total_beads', parseInt(e.target.value) || 0)},
                              className="w-full text-center bg-white border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-1 py-1"
                              min="1"
                            />
                          ) : (
                            purchase.total_beads || ((purchase.quantity || 0) * (purchase.beads_per_string || 0)) || '-'
                          )}
                        </div>
                        <p className="text-purple-600 text-xs">颗</p>
                        {/* 建议值显示 */}
                        {isEditMode && suggestions.total_beads && (
                          <div className="text-xs text-red-600 mt-1">
                            建议: {suggestions.total_beads}颗
                          </div>
                        )}
                        {/* 颗数不符警告 */}
                        {isEditMode && suggestions.beads_count_warning && (
                          <div className="text-xs text-blue-600 mt-1">
                            {suggestions.beads_count_warning.message}
                          </div>
                        )}
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
                        <p className="text-orange-600 text-xs font-medium mb-1">每颗价格</p>
                        <p className="font-semibold text-orange-900 text-sm mb-1">
                          {user?.role === 'EMPLOYEE' ? '-' : (
                            purchase.total_price && purchase.quantity && purchase.beads_per_string 
                              ? formatPrice(purchase.total_price / (purchase.quantity * purchase.beads_per_string))
                              : '-'
                          )}
                        </p>
                        <p className="text-orange-600 text-xs">预估</p>
                        {/* 建议值显示 */}
                        {isEditMode && suggestions.price_per_bead && user?.role !== 'EMPLOYEE' && (
                          <div className="text-xs text-red-600 mt-1">
                            建议: ¥{suggestions.price_per_bead.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 第三行：自然语言描述（仅在手机端显示） */}
                  {(purchase.natural_language_input || user?.role === 'EMPLOYEE') && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm mt-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        自然语言描述
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {user?.role === 'EMPLOYEE' ? '-' : (purchase.natural_language_input || '-')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 桌面端：保持原有布局 */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 左半边：产品图片 */}
                    <div className="space-y-3">
                      {purchase.photos && purchase.photos.length > 0 ? (
                        <>
                          {/* 主图 */}
                          <div className="relative">
                            <img
                              src={purchase.photos[selectedImageIndex]},
                              alt={`${purchase.product_name} - 图片 ${selectedImageIndex + 1}`},
                              className="w-full h-auto object-contain rounded-xl border border-gray-200 shadow-sm bg-gray-50"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/placeholder-image.png'
                                console.error('图片加载失败:', purchase.photos?.[selectedImageIndex])
                              }}
                            />
                          </div>
                          
                          {/* 缩略图 */}
                          {purchase.photos.length > 1 && (
                            <div className="flex space-x-2 overflow-x-auto pb-1">
                              {purchase.photos.map((photo, index) => (
                                <button
                                  key={index},
                                  onClick={() => setSelectedImageIndex(index)},
                                  className={`flex-shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${
                                    index === selectedImageIndex
                                      ? 'border-blue-500 ring-2 ring-blue-200'
                                      : 'border-gray-200, hover:border-gray-300'
                                  }`}
                                >
                                  <img
                                    src={photo},
                                    alt={`缩略图 ${index + 1}`},
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = '/placeholder-image.png'
                                    }}
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full max-h-80 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center">
                          <div className="text-center text-gray-400 py-16">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">暂无图片</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 右半边：基本信息 */}
                    <div className="space-y-4">
                      {/* 产品基本信息 */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          基本信息
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">产品名称</span>
                            <div className="font-medium text-gray-900">
                              {renderEditField('product_name', '产品名称', purchase.product_name)}
                            </div>
                          </div>
                          
                          {/* 根据产品类型显示数量字段 */}
                          {(purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'ACCESSORIES' || purchase.product_type === 'FINISHED') && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">
                                {purchase.product_type === 'LOOSE_BEADS' ? '颗数' : 
                                 purchase.product_type === 'ACCESSORIES' ? '片数' : '件数'}
                              </span>
                              <div className="font-medium text-gray-900">
                                {renderEditField('piece_count', '数量', purchase.piece_count, 'number')}
                              </div>
                            </div>
                          )}
                          
                          {purchase.product_type === 'BRACELET' && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">串数</span>
                              <div className="font-medium text-gray-900">
                                {renderEditField('quantity', '数量', purchase.quantity, 'number')}
                              </div>
                            </div>
                          )}
                          
                          {/* 根据产品类型显示规格/直径字段 */}
                          {(purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'BRACELET') && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">直径</span>
                              <div className="font-medium text-gray-900">
                                {renderEditField('bead_diameter', '直径', purchase.bead_diameter, 'number')}
                              </div>
                            </div>
                          )}
                          
                          {(purchase.product_type === 'ACCESSORIES' || purchase.product_type === 'FINISHED') && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">规格</span>
                              <div className="font-medium text-gray-900">
                                {renderEditField('specification', '规格', purchase.specification, 'number')}
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">品相</span>
                            <div className="font-medium text-gray-900">
                              {renderEditField('quality', '品相', purchase.quality, 'select', ['AA', 'A', 'AB', 'B', 'C'])}
                            </div>
                          </div>
                          {user?.role === 'BOSS' && (
                            <>
                              <div className="flex justify-between items-center">
                            <span className="text-gray-500">克价</span>
                            <div className="font-medium text-gray-900">
                              {renderEditField('price_per_gram', '克价', purchase.price_per_gram, 'number')}
                              {/* 建议值显示 */}
                              {isEditMode && suggestions.price_per_gram && (
                                <div className="text-xs text-red-600 mt-1">
                                  建议: ¥{suggestions.price_per_gram.toFixed(1)}
                                </div>
                              )}
                              {/* 不一致性警告 */}
                              {isEditMode && suggestions.inconsistency_warning && (
                                <div className="text-xs text-orange-600 mt-1 p-2 bg-orange-50 rounded border border-orange-200">
                                  <div className="font-medium mb-1">⚠️ {suggestions.inconsistency_warning.message}</div>
                                  <div>建议克价: ¥{suggestions.inconsistency_warning.options.price_per_gram}</div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">总价</span>
                            <div className="font-medium text-gray-900">
                              {renderEditField('total_price', '总价', purchase.total_price, 'number')}
                              {/* 建议值显示 */}
                              {isEditMode && suggestions.total_price && (
                                <div className="text-xs text-red-600 mt-1">
                                  建议: ¥{suggestions.total_price.toFixed(1)}
                                </div>
                              )}
                              {/* 不一致性警告 */}
                              {isEditMode && suggestions.inconsistency_warning && (
                                <div className="text-xs text-orange-600 mt-1 p-2 bg-orange-50 rounded border border-orange-200">
                                  <div className="font-medium mb-1">⚠️ {suggestions.inconsistency_warning.message}</div>
                                  <div>建议总价: ¥{suggestions.inconsistency_warning.options.total_price}</div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">重量</span>
                            <div className="font-medium text-gray-900">
                              {renderEditField('weight', '重量', purchase.weight, 'number')}
                              {/* 建议值显示 */}
                              {isEditMode && suggestions.weight && (
                                <div className="text-xs text-red-600 mt-1">
                                  建议: {suggestions.weight.toFixed(1)}g
                                </div>
                              )}
                              {/* 不一致性警告 */}
                              {isEditMode && suggestions.inconsistency_warning && (
                                <div className="text-xs text-orange-600 mt-1 p-2 bg-orange-50 rounded border border-orange-200">
                                  <div className="font-medium mb-1">⚠️ {suggestions.inconsistency_warning.message}</div>
                                  <div>建议重量: {suggestions.inconsistency_warning.options.weight}g</div>
                                </div>
                              )}
                            </div>
                          </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500">供应商</span>
                                <div className="font-medium text-gray-900">
                                  {renderEditField('supplier_name', '供应商', purchase.supplier?.name || '')}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* 预估数值区域 - 根据产品类型显示 */}
                        <div className="pt-2 border-t border-gray-200">
                          {/* 手串类型显示传统的每串颗数、总计颗数、每颗价格 */}
                          {purchase.product_type === 'BRACELET' && (
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="text-center p-1.5 bg-green-50 rounded-md border border-green-100">
                                <p className="text-green-600 text-xs font-medium">每串</p>
                                <div className="font-semibold text-green-900 text-xs">
                                  {isEditMode ? (
                                    <input
                                      type="number"
                                      value={editData.beads_per_string !== undefined ? editData.beads_per_string : purchase.beads_per_string || ''},
                                      onChange={(e) => updateEditData('beads_per_string', parseInt(e.target.value) || 0)},
                                      className="w-full text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-green-500 rounded"
                                      min="1"
                                    />
                                  ) : (
                                    purchase.beads_per_string || '-'
                                  )}
                                </div>
                                <p className="text-green-600 text-xs">颗</p>
                              </div>
                              <div className="text-center p-1.5 bg-purple-50 rounded-md border border-purple-100">
                                <p className="text-purple-600 text-xs font-medium">总计</p>
                                <div className="font-semibold text-purple-900 text-xs">
                                  {isEditMode ? (
                                    <input
                                      type="number"
                                      value={editData.total_beads !== undefined ? editData.total_beads : purchase.total_beads || ''},
                                      onChange={(e) => updateEditData('total_beads', parseInt(e.target.value) || 0)},
                                      className="w-full text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-purple-500 rounded"
                                      min="1"
                                    />
                                  ) : (
                                    (() => {
                                      // 显示当前实际值
                                      const currentQuantity = purchase.quantity || 0
                                      const currentBeadsPerString = purchase.beads_per_string || 0
                                      const currentTotalBeads = purchase.total_beads
                                      
                                      if (currentTotalBeads) {
                                        return currentTotalBeads
                                      } else if (currentQuantity > 0 && currentBeadsPerString > 0) {
                                        return currentQuantity * currentBeadsPerString
                                      },
                                      return '-'
                                    })()
                                  )}
                                </div>
                                {/* 建议值提示 */}
                                {isEditMode && suggestions.total_beads && (
                                  <div className="text-xs text-red-600 mt-1">
                                    建议: {suggestions.total_beads}颗
                                  </div>
                                )}
                                <p className="text-purple-600 text-xs">颗</p>
                              </div>
                              <div className="text-center p-1.5 bg-orange-50 rounded-md border border-orange-100">
                                <p className="text-orange-600 text-xs font-medium">每颗价格</p>
                                <p className="font-semibold text-orange-900 text-xs">
                                  {user?.role === 'EMPLOYEE' ? '-' : (
                                    (() => {
                                      const currentTotalPrice = isEditMode && editData.total_price !== undefined ? editData.total_price : purchase.total_price || 0
                                      const currentQuantity = isEditMode && editData.quantity !== undefined ? editData.quantity : purchase.quantity || 0
                                      const currentBeadsPerString = isEditMode && editData.beads_per_string !== undefined ? editData.beads_per_string : purchase.beads_per_string || 0
                                      const currentTotalBeads = isEditMode && editData.total_beads !== undefined ? editData.total_beads : purchase.total_beads
                                      
                                      let totalBeadsForCalculation = currentTotalBeads
                                      if (!totalBeadsForCalculation && currentQuantity > 0 && currentBeadsPerString > 0) {
                                        totalBeadsForCalculation = currentQuantity * currentBeadsPerString
                                      }
                                      
                                      if (currentTotalPrice > 0 && totalBeadsForCalculation && totalBeadsForCalculation > 0) {
                                        return formatPrice(currentTotalPrice / totalBeadsForCalculation)
                                      },
                                      return '-'
                                    })()
                                  )}
                                </p>
                                <p className="text-orange-600 text-xs">预估</p>
                              </div>
                            </div>
                          )}
                          

                          
                          {/* 饰品和成品类型显示单价 */}
                          {(purchase.product_type === 'ACCESSORIES' || purchase.product_type === 'FINISHED') && (
                            <div className="grid grid-cols-1 gap-1.5">
                              <div className="text-center p-1.5 bg-blue-50 rounded-md border border-blue-100">
                                <p className="text-blue-600 text-xs font-medium">
                                  {purchase.product_type === 'ACCESSORIES' ? '每片价格' : '每件价格'}
                                </p>
                                <p className="font-semibold text-blue-900 text-xs">
                                  {user?.role === 'EMPLOYEE' ? '-' : (
                                    (() => {
                                      const currentTotalPrice = isEditMode && editData.total_price !== undefined ? editData.total_price : purchase.total_price || 0
                                      const currentPieceCount = isEditMode && editData.piece_count !== undefined ? editData.piece_count : purchase.piece_count || 0
                                      
                                      if (currentTotalPrice > 0 && currentPieceCount > 0) {
                                        return formatPrice(currentTotalPrice / currentPieceCount)
                                      },
                                      return '-'
                                    })()
                                  )}
                                </p>
                                <p className="text-blue-600 text-xs">预估</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>



                {/* 自然语言录入信息（仅桌面端显示） */}
                {(purchase.natural_language_input || user?.role === 'EMPLOYEE') && (
                  <div className="hidden md:block bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      自然语言描述
                    </h4>
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {user?.role === 'EMPLOYEE' ? '-' : (purchase.natural_language_input || '-')}
                      </p>
                    </div>
                  </div>
                )}

                {/* 录入信息 */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>
                    录入人：{purchase.user?.name || purchase.creator?.name || '-'}
                  </span>
                  <span>
                    采购日期：{formatDate(purchase.created_at)}
                  </span>
                </div>

                {/* 修改日志 */}
                {(purchase.updated_at !== purchase.created_at || (purchase.edit_logs && purchase.edit_logs.length > 0)) && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      修改历史
                    </h4>
                    <div className="space-y-2">
                      {/* 编辑历史记录 */}
                      {purchase.edit_logs && purchase.edit_logs.length > 0 ? (
                        <div className="space-y-2">
                          {/* 按时间倒序显示最近5条记录，合并同一时间的修改 */}
                          {(() => {
                            // 按用户和时间分组合并日志
                            const groupedLogs = purchase.edit_logs.reduce((groups: {[key: string]: any[]}, log: any) => {
                              // 使用用户ID和精确到分钟的时间作为分组键
                              const timeKey = new Date(log.created_at).toISOString().slice(0, 16)
                              const groupKey = `${log.user_id}_${timeKey}`
                              if (!groups[groupKey]) {
                                groups[groupKey] = []
                              },
                              groups[groupKey].push(log)
                              return groups
                            }, {})
                            
                            // 转换为数组并按时间倒序排列
                            const sortedGroups = Object.entries(groupedLogs)
                              .sort(([a], [b]) => {
                                const timeA = a.split('_')[1]
                                const timeB = b.split('_')[1]
                                return new Date(timeB).getTime() - new Date(timeA).getTime()
                              })
                              .slice(0, 5)
                            
                            return sortedGroups.map(([groupKey, logs]) => {
                              // 合并同一用户同一时间的多个修改
                              const firstLog = logs[0]
                              // 正确获取用户名：优先使用关联的user.name，否则使用默认值
                              const editorName = firstLog.user?.name || '系统管理员'
                              const timeKey = groupKey.split('_')[1]
                              const editTime = new Date(timeKey).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })
                              
                              // 由于后端已经生成了合并格式的日志，直接使用details内容
                              // 如果有多条日志（理论上不应该发生，因为后端已经合并），取第一条
                              const mergedDetails = logs.length > 0 && logs[0].details 
                                ? logs[0].details
                                : `${editorName} 在 ${editTime} 修改了采购信息`
                              
                              return (
                                <div key={groupKey} className="bg-white rounded-lg p-3 border border-gray-100">
                                  <div className="text-xs text-gray-700 leading-relaxed">
                                    {mergedDetails}
                                  </div>
                                </div>
                              )
                            })
                          })()} 
                          {Object.keys(purchase.edit_logs.reduce((groups: {[key: string]: any[]}, log: any) => {
                            const timeKey = new Date(log.created_at).toISOString().slice(0, 16)
                            if (!groups[timeKey]) groups[timeKey] = []
                            groups[timeKey].push(log)
                            return groups
                          }, {})).length > 5 && (
                            <p className="text-xs text-gray-400 text-center py-1">
                              还有更多历史记录...
                            </p>
                          )}
                        </div>
                      ) : (
                        /* 如果没有详细日志，显示简单的修改信息 */
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {purchase.last_edited_by?.name || purchase.user?.name || '系统管理员'} 修改了采购信息
                            </span>
                            <span className="text-gray-500">
                              {formatDate(purchase.updated_at)}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                              已修改
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 备注信息 */}
                {purchase.notes && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      备注信息
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{purchase.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* 背景遮罩 */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowDeleteConfirm(false)}
            />
            
            {/* 确认对话框 */}
            <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    确认删除采购记录
                  </h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  您确定要删除这条采购记录吗？
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 font-medium">
                    产品：{purchase?.product_name}
                  </p>
                  <p className="text-sm text-red-600">
                    采购编号：{purchase ? (purchase.purchase_code || formatPurchaseCode(purchase.id)) : ''}
                  </p>
                </div>
                <p className="text-sm text-red-600 mt-2 font-medium">
                  ⚠️ 此操作不可恢复，请谨慎操作！
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleDelete},
                  disabled={loading},
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>删除中...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>确认删除</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)},
                  disabled={loading},
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}