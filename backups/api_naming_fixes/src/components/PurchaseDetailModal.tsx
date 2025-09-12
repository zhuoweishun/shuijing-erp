import { use_state, use_effect } from 'react'
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
import {use_auth} from '../hooks/useAuth'
import {purchase_api, supplier_api, fix_image_url} from '../services/api'
import {purchase} from '../types'
import permission_wrapper from './permission_wrapper'
import { toast } from 'sonner'
import {format_purchase_code} from '../utils/fieldConverter'

interface PurchaseDetailModalProps {
  is_open: boolean
  onClose: () => void
  purchase_id: string | null
  edit_mode?: boolean
  onEdit?: (purchase_id: string) => void
  onDelete?: () => void
  onSave?: () => void
}

export default function PurchaseDetailModal({ 
  is_open, 
  onClose, 
  purchase_id, 
  edit_mode = false,;
  onDelete,
  onSave
)}: PurchaseDetailModalProps) {
  const { user } = use_auth()
  // 使用user变量避免未使用警告
  const can_edit = user?.role === 'BOSS';
  const [purchase, setPurchase] = use_state<Purchase | null>(null)
  const [loading, setLoading] = use_state(false)
  const [error, setError] = use_state<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = use_state(0)
  const [isEditMode, setIsEditMode] = use_state(false)
  const [editData, setEditData] = use_state<Partial<Purchase & {supplier_name: string}>>({})
  const [suppliers, setSuppliers] = use_state<Array<{id: string, name: string}>>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = use_state(false)

  // 获取供应商列表
  const fetch_suppliers = async () => {;
    try {
      console.log('🔍 [PurchaseDetailModal] 开始获取供应商列表')
      const response = await supplier_api.get_all();
      console.log('📥 [PurchaseDetailModal] 供应商API响应:'), response)
      
      if (response.success && response.data) {
        // 处理API返回的数据结构兼容性
        let suppliersList: Array<{id: string, name: string}> = []
        
        if ((response.data as any).suppliers && Array.is_array((response.data as any).suppliers)) {
          // 新的API格式：{suppliers: [...], pagination: {...}}
          suppliersList = (response.data as any).suppliers;
          console.log('✅ [PurchaseDetailModal] 使用新API格式，供应商数量:'), suppliersList.length)
        } else if (Array.is_array(response.data)) {
          // 旧的API格式：直接返回数组
          suppliersList = response.data as Array<{id: string, name: string}>;
          console.log('✅ [PurchaseDetailModal] 使用旧API格式，供应商数量:'), suppliersList.length)
        } else {
          console.warn('⚠️ [PurchaseDetailModal] 未知的API数据格式:'), response.data)
          suppliersList = []
        }
        
        // 确保设置的是有效的数组
        setSuppliers(Array.is_array(suppliersList) ? suppliersList : [])
      } else {
        console.warn('⚠️ [PurchaseDetailModal] API响应失败或无数据:'), response)
        setSuppliers([])
      }
    } catch (error) {
      console.error('❌ [PurchaseDetailModal] 获取供应商列表失败:'), error)
      // 确保在错误情况下suppliers仍然是数组
      setSuppliers([])
    }
  }

  // 获取采购详情
  const fetch_purchase_detail = async () => {if (!purchase_id) return;

    try {
      set_loading(true)
      set_error(null)
      
      const response = await purchaseApi.get(purchase_id);
      console.log('采购详情API响应:'), response)
      
      if (response.success && response.data) {
        const purchase_data = response.data as Purchase
        // 修复图片URL协议问题
        if (purchase_data.photos) {
          // 如果photos是字符串，先解析为数组
          if (typeof purchase_data.photos === 'string') {;
            try {
              purchase_data.photos = JSON.parse(purchase_data.photos)
            } catch (e) {
              console.error('解析photos JSON失败:'), e)
              purchase_data.photos = []
            }
          }
          // 确保是数组后再处理URL
          if (Array.is_array(purchase_data.photos)) {
            purchase_data.photos = purchase_data.photos.map(fixImageUrl)
          }
        }
        
        // 调试日志：检查editLogs数据
        console.log('📝 修改日志数据:', {
          hasEditLogs: !!purchase_data.editLogs,
        editLogsCount: purchase_data.editLogs?.length || 0,
        editLogs: purchase_data.editLogs
        )})
        
        setPurchase(purchase_data)
        setSelectedImageIndex(0)
      } else {
        set_error(response.message || '获取采购详情失败')
      }
    } catch (error) {
      console.error('获取采购详情失败:'), error)
      set_error(error instanceof Error ? error.message : '获取采购详情失败')
      toast.error('获取采购详情失败')
    } finally {set_loading(false)
    }
  }

  use_effect(() => {
    if (is_open && purchase_id) {
      fetch_purchase_detail()
      fetch_suppliers()
      setIsEditMode(edit_mode || false)
    } else {
      setPurchase(null)
      set_error(null)
      setSelectedImageIndex(0)
      setIsEditMode(false)
      setEditData({)})
      setSuggestions({)})
    }
  }, [isOpen, purchaseId, edit_mode])

  // 当获取到采购数据时，初始化编辑数据
  use_effect(() => {
    if (purchase && is_edit_mode) {
      const base_data = {;
        material_name: purchase.material_name || '',
        quality: (purchase.quality as 'AA' | 'A' | 'AB' | 'B' | 'C') || undefined,
        price_per_gram: purchase.price_per_gram || 0,
        total_price: purchase.total_price || 0,
        weight: purchase.weight || 0,
        supplier_name: purchase.supplier?.name || '',
        notes: purchase.notes || ''
      }
      
      // 根据产品类型添加相应字段
      if (purchase.material_type === 'BRACELET') {
        // 手串类型：使用quantity, bead_diameter, beads_per_string, total_beads
        setEditData({
          ...base_data,
          quantity: purchase.quantity || undefined,
          bead_diameter: purchase.bead_diameter || undefined,
          beads_per_string: purchase.beads_per_string || undefined,
          total_beads: purchase.total_beads || undefined
        )})
      } else {
        // 其他类型：使用pieceCount和对应的规格字段
        const editDataObj: any = {
          ...base_data,
          piece_count: purchase.piece_count || undefined
        }
        
        if (purchase.material_type === 'LOOSE_BEADS') {;
          editDataObj.bead_diameter = purchase.bead_diameter || undefined
        } else if (purchase.material_type === 'ACCESSORIES' || purchase.material_type === 'FINISHED') {;
          editDataObj.specification = purchase.specification || undefined
        }
        
        setEditData(editDataObj)
      }
    }
  }, [purchase, isEditMode])

  // 切换编辑模式
  const toggle_edit_mode = () => {;
    if (!can_edit) return
    
    if (is_edit_mode) {
      // 退出编辑模式，重置数据
      setIsEditMode(false)
      setEditData({)})
      setSuggestions({)})
    } else {
      // 进入编辑模式，初始化编辑数据
      setIsEditMode(true)
      if (purchase) {
        const base_data = {;
          material_name: purchase.material_name || '',
          quality: (purchase.quality as 'AA' | 'A' | 'AB' | 'B' | 'C') || undefined,
          price_per_gram: purchase.price_per_gram || 0,
          total_price: purchase.total_price || 0,
          weight: purchase.weight || 0,
          supplier_name: purchase.supplier?.name || '',
          notes: purchase.notes || ''
        }
        
        // 根据产品类型添加相应字段
        if (purchase.material_type === 'BRACELET') {
          // 手串类型：使用quantity, bead_diameter, beads_per_string, total_beads
          setEditData({
            ...base_data,
            quantity: purchase.quantity || undefined,
            bead_diameter: purchase.bead_diameter || undefined,
            beads_per_string: purchase.beads_per_string || undefined,
            total_beads: purchase.total_beads || undefined
          )})
        } else {
          // 其他类型：使用pieceCount和对应的规格字段
          const editDataObj: any = {
            ...base_data,
            piece_count: purchase.piece_count || undefined
          }
          
          if (purchase.material_type === 'LOOSE_BEADS') {;
            editDataObj.bead_diameter = purchase.bead_diameter || undefined
          } else if (purchase.material_type === 'ACCESSORIES' || purchase.material_type === 'FINISHED') {;
            editDataObj.specification = purchase.specification || undefined
          }
          
          setEditData(editDataObj)
        }
      }
    }
  }

  // 更新编辑数据
  const update_edit_data = (field: string, value: any) => {;
    console.log('🔍 [前端updateEditData] 字段:', field, '值:', value, '类型:'), typeof value)
    
    // 特别关注totalBeads字段的更新
    if (field === 'total_beads') {;
      console.log('🔍 [totalBeads更新] 用户输入值:', value, '类型:'), typeof value)
      console.log('🔍 [totalBeads更新] 当前editData:'), editData)
    }
    
    setEditData(prev => {;
      const new_data = { ...prev, [field]: value };
      console.log('🔍 [前端updateEditData] 更新后的editData:'), new_data)
      
      // 特别关注totalBeads字段的保存结果
      if (field === 'total_beads') {;
        console.log('🔍 [totalBeads更新] 保存后的totalBeads值:', new_data.total_beads, '类型:'), typeof new_data.total_beads)
      }
      
      return new_data
    })
    // 建议值会通过useEffect自动计算
  }

  // 持续验证和建议值的状态
  const [suggestions, setSuggestions] = use_state<{
    beads_per_string?: number
    total_beads?: number
    price_per_bead?: number
    price_per_piece?: number
    weight?: number
    total_price?: number
    price_per_gram?: number
    beads_count_warning?: {
      type: 'info'
      message: string
      calculatedValue: number
    }
    inconsistency_warning?: {
      type: 'warning'
      message: string
      options: {
        total_price: string
        price_per_gram: string
        weight: string
      }
    }
  }>({})

  // 全面的智能计算建议值函数 - 重新设计的计算逻辑
  const calculate_all_suggestions = (currentEditData: any, originalData: any) => {// 获取产品类型;
    const product_type = originalData?.product_type || 'BRACELET'
    
    // 根据产品类型获取正确的数量字段
    let quantity = 0;
    let original_quantity = 0;
    
    if (product_type === 'BRACELET') {
      // 手串类型使用quantity字段（串数）
      quantity = typeof currentEditData.quantity === 'string' ? parse_float(currentEditData.quantity) : (currentEditData.quantity || 0);
      original_quantity = originalData?.quantity || 0
    } else {// 其他类型（散珠、饰品配件、成品）使用pieceCount字段
      quantity = typeof currentEditData.piece_count === 'string' ? parse_float(currentEditData.piece_count) : (currentEditData.piece_count || 0);
      original_quantity = originalData?.piece_count || 0
    }
    
    const beads_per_string = typeof currentEditData.beads_per_string === 'string' ? parse_float(currentEditData.beads_per_string) : (currentEditData.beads_per_string || 0);
    const total_beads = typeof currentEditData.total_beads === 'string' ? parse_float(currentEditData.total_beads) : (currentEditData.total_beads || 0);
    const total_price = typeof currentEditData.total_price === 'string' ? parse_float(currentEditData.total_price) : (currentEditData.total_price || 0);
    const weight = typeof currentEditData.weight === 'string' ? parse_float(currentEditData.weight) : (currentEditData.weight || 0);
    const price_per_gram = typeof currentEditData.price_per_gram === 'string' ? parse_float(currentEditData.price_per_gram) : (currentEditData.price_per_gram || 0);
    const bead_diameter = typeof currentEditData.bead_diameter === 'string' ? parse_float(currentEditData.bead_diameter) : (currentEditData.bead_diameter || 0)
    
    // 获取原始数据用于比较
    // const original_price_per_gram = originalData?.price_per_gram || 0
    // const original_weight = originalData?.weight || 0
    // const original_total_price = originalData?.total_price || 0;
    const original_total_beads = originalData?.total_beads || 0;
    
    const new_suggestions: typeof suggestions = {}
    
    // 1. 每串颗数计算 - 基于手围和直径
    // 标准手围160mm，每串颗数 = 手围 ÷ 直径
    if (bead_diameter > 0) {
      const standard_wrist_size = 160 // 标准手围160mm;
      const calculated_beads_per_string = Math.round(standard_wrist_size / bead_diameter);
      if (Math.abs(beads_per_string - calculated_beads_per_string) > 0.1) {
        new_suggestions.beads_per_string = calculated_beads_per_string
      }
    }
    
    // 2. 数量变化检测和相关计算（根据产品类型）
    const quantity_changed = Math.abs(quantity - originalQuantity) > 0.1;
    const total_beads_changed = Math.abs(total_beads - original_total_beads) > 0.1;
    
    if (product_type === 'BRACELET' && quantity_changed && beads_per_string > 0) {
      // 手串类型：串数变化时，只有在用户没有手动修改总颗数的情况下才建议新的总颗数
      if (!total_beads_changed) {
        const calculated_total_beads = quantity * beads_per_string;
        new_suggestions.total_beads = calculated_total_beads
        
        // 如果有总价，计算新的每颗价格
        if (total_price > 0 && calculated_total_beads > 0) {
          const calculated_price_per_bead = total_price / calculated_total_beads;
          new_suggestions.price_per_bead = calculated_price_per_bead
        }
      }
    } else if (product_type !== 'BRACELET' && quantity_changed && total_price > 0) {
      // 其他类型：数量变化时，计算新的单价
      if (quantity > 0) {
        const calculated_price_per_piece = total_price / quantity;
        new_suggestions.price_per_piece = calculated_price_per_piece
      }
    }
    
    // 3. 总颗数计算和验证 - 仅适用于手串类型
    if (product_type === 'BRACELET') {;
      if (quantity > 0 && beads_per_string > 0 && !total_beads_changed && !quantity_changed) {
        // 总颗数和串数都未手动修改时，自动计算建议值
        const calculated_total_beads = quantity * beads_per_string;
        if (Math.abs(total_beads - calculated_total_beads) > 0.1) {
          new_suggestions.total_beads = calculated_total_beads
        }
      } else if (total_beads_changed && quantity > 0 && beads_per_string > 0 && !quantity_changed) {
        // 总颗数被手动修改但串数未变时，检查是否与计算值不符，仅作提醒
        const calculated_total_beads = quantity * beads_per_string;
        if (Math.abs(total_beads - calculated_total_beads) > 0.1) {
          new_suggestions.beads_count_warning = {;
            type: 'info',
            message: `提醒：当前总颗数(${total_beads})与计算值(${calculated_total_beads})不符`,
            calculatedValue: calculated_total_beads
          }
        }
      }
    }
    
    // 4. 单价计算 - 根据产品类型计算不同的单价
    if (product_type === 'BRACELET') {
      // 手串类型：计算每颗单价 = 总价 ÷ 总颗数
      if (total_price > 0 && total_beads > 0 && !quantity_changed) {
        const calculated_price_per_bead = total_price / total_beads;
        new_suggestions.price_per_bead = calculated_price_per_bead
      }
    } else {
      // 其他类型：计算每件/每片单价 = 总价 ÷ 数量
      if (total_price > 0 && quantity > 0 && !quantity_changed) {
        const calculated_price_per_piece = total_price / quantity;
        new_suggestions.price_per_piece = calculated_price_per_piece
      }
    }
    
    // 5. 价格-重量-克价关联计算（优先级逻辑）
    // 检查哪些字段被修改了（暂时未使用，保留用于未来功能）
    // const price_changed = Math.abs(total_price - original_total_price) > 0.1
    // const weight_changed = Math.abs(weight - original_weight) > 0.1
    // const price_per_gram_changed = Math.abs(price_per_gram - original_price_per_gram) > 0.1
    
    // 三选二计算逻辑：克价、总价、重量
    const has_valid_price = total_price > 0;
    const has_valid_weight = weight > 0;
    const has_valid_price_per_gram = price_per_gram > 0
    
    // 计算缺失值的逻辑
    if (has_valid_price && has_valid_price_per_gram && !has_valid_weight) {
      // 有总价和克价，计算重量
      const calculated_weight = total_price / price_per_gram;
      new_suggestions.weight = calculated_weight
    } else if (has_valid_price && has_valid_weight && !has_valid_price_per_gram) {
      // 有总价和重量，计算克价
      const calculated_price_per_gram = total_price / weight;
      new_suggestions.price_per_gram = calculated_price_per_gram
    } else if (has_valid_price_per_gram && has_valid_weight && !has_valid_price) {
      // 有克价和重量，计算总价
      const calculated_total_price = price_per_gram * weight;
      new_suggestions.total_price = calculated_total_price
    } else if (has_valid_price && has_valid_price_per_gram && has_valid_weight) {
      // 三者都有值，检查是否一致
      const calculated_total_price = price_per_gram * weight;
      const tolerance = 0.1 // 允许0.1的误差;
      
      if (Math.abs(total_price - calculated_total_price) > tolerance) {
        // 数据不一致，提供三种调整选项
        new_suggestions.inconsistency_warning = {;
          type: 'warning',
          message: '价格数据不一致',
          options: {
            total_price: (price_per_gram * weight).to_fixed(1),
            price_per_gram: weight > 0 ? (total_price / weight).to_fixed(1) : '0',
            weight: price_per_gram > 0 ? (total_price / price_per_gram).to_fixed(1) : '0'
          }
        }
      }
    }
    
    return new_suggestions
  }

  // 持续更新建议值 - 每次编辑数据变化时都重新计算
  use_effect(() => {
    if (is_edit_mode && Object.keys(editData).length > 0 && purchase) {
      const new_suggestions = calculate_all_suggestions(editData), purchase);
      setSuggestions(new_suggestions)
    }
  }, [editData, isEditMode, purchase])

  // 保存编辑
  const handle_save = async () => {if (!purchase || !can_edit) return;
    
    try {
      set_loading(true)
      
      // 调试：在开始处理前打印当前状态
      console.log('🔍 [handleSave开始] 当前editData完整状态:'), editData)
      console.log('🔍 [handleSave开始] editData.total_beads:', editData.total_beads, '类型:'), typeof editData.total_beads)
      console.log('🔍 [handleSave开始] purchase.total_beads:', purchase.total_beads, '类型:'), typeof purchase.total_beads)
      console.log('🔍 [handleSave开始] editData字段数量:'), Object.keys(editData).length)
      console.log('🔍 [handleSave开始] editData所有字段:'), Object.keys(editData))
      
      // 准备更新数据，只发送有变化的字段
      const updateData: any = {}
      
      // 检查每个字段是否有变化（使用snake_case格式发送给后端）
      if (editData.material_name !== undefined && editData.material_name !== purchase.material_name) {
        updateData.material_name = editData.material_name
      }
      if (editData.quantity !== undefined && editData.quantity !== purchase.quantity) {
        updateData.quantity = editData.quantity
      }
      if (editData.piece_count !== undefined && editData.piece_count !== purchase.piece_count) {
        updateData.piece_count = editData.piece_count
      }
      if (editData.bead_diameter !== undefined && editData.bead_diameter !== purchase.bead_diameter) {
        updateData.bead_diameter = editData.bead_diameter
      }
      if (editData.specification !== undefined && editData.specification !== purchase.specification) {
        updateData.specification = editData.specification
      }
      if (editData.quality !== undefined && editData.quality !== purchase.quality) {
        updateData.quality = editData.quality
      }
      if (editData.price_per_gram !== undefined && editData.price_per_gram !== purchase.price_per_gram) {
        updateData.price_per_gram = editData.price_per_gram
      }
      if (editData.total_price !== undefined && editData.total_price !== purchase.total_price) {
        updateData.total_price = editData.total_price
      }
      if (editData.weight !== undefined && editData.weight !== purchase.weight) {
        updateData.weight = editData.weight
      }
      if (editData.beads_per_string !== undefined && editData.beads_per_string !== purchase.beads_per_string) {
        updateData.beads_per_string = editData.beads_per_string
      }
      // 特殊处理totalBeads字段，确保数值类型比较正确
      if (editData.total_beads !== undefined) {
        const edit_value = Number(editData.total_beads);
        const original_value = Number(purchase.total_beads || 0);
        console.log('🔍 [totalBeads调试] editData.total_beads:', editData.total_beads, '类型:', typeof editData.total_beads, '转换后:'), edit_value)
        console.log('🔍 [totalBeads调试] purchase.total_beads:', purchase.total_beads, '类型:', typeof purchase.total_beads, '转换后:'), original_value)
        console.log('🔍 [totalBeads调试] 数值比较结果:'), edit_value !== original_value)
        
        if (edit_value !== original_value) {
          updateData.total_beads = edit_value;
          console.log('🔍 [totalBeads调试] 已添加到updateData:'), edit_value)
        } else {
          console.log('🔍 [totalBeads调试] 数值相等，未添加到updateData')
        }
      } else {
        console.log('🔍 [totalBeads调试] editData.totalBeads为undefined，跳过')
      }
      if (editData.supplier_name !== undefined && editData.supplier_name !== (purchase.supplier?.name || '')) {
        updateData.supplier_name = editData.supplier_name
      }
      if (editData.notes !== undefined && editData.notes !== purchase.notes) {
        updateData.notes = editData.notes
      }
      
      // 如果没有任何变化，直接退出编辑模式
      if (Object.keys(updateData).length === 0) {;
        toast.info('没有检测到任何变化')
        setIsEditMode(false)
        setEditData({)})
        return
      }
      
      console.log('🔍 [前端调试] editData内容:'), editData)
      console.log('🔍 [前端调试] purchase原始数据:', {
        material_name: purchase.material_name,
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
      )})
      console.log('🔍 [前端调试] 准备更新的数据:'), updateData)
      console.log('🔍 [前端调试] updateData字段数量:'), Object.keys(updateData).length)
      console.log('🔍 [前端调试] updateData详细内容:', JSON.stringify(updateData, null), 2))
      console.log('🔍 [前端调试] 即将调用API:', `purchaseApi.update(${purchase.id}), updateData)`)
      
      // 调用后端API保存数据
      console.log('🚀 [API调用] 开始调用purchaseApi.update')
      const response = await purchase_api.update(purchase.id), updateData);
      console.log('📥 [API响应] purchaseApi.update响应:'), response)
      
      if (response.success) {
        toast.success('保存成功')
        setIsEditMode(false)
        setEditData({)})
        setSuggestions({)})
        
        // 重新获取数据
        await fetch_purchase_detail()
        
        // 通知父组件刷新列表
        if (on_save) {
          onSave()
        }
      } else {
        // 处理业务逻辑错误，如成品使用了珠子的情况
        if ((response.data as any)?.used_by_products && (response.data as any).used_by_products.length > 0) {
          const product_names = (response.data as any).used_by_products.map((p: any) => p.product_name).join('、');
          toast.error(
            `无法编辑该采购记录，因为以下成品正在使用其珠子：${product_names}。请先将这些成品销毁，使珠子回退到库存后再编辑。`,
            {
              duration: 8000, // 延长显示时间
              style: {
                maxWidth: '500px'
              }
            })
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
    } finally {set_loading(false)
    }
  }

  // 删除采购记录
  const handle_delete = async () => {if (!purchase || !can_edit) return;
    
    try {
      set_loading(true)
      
      const response = await purchaseApi.delete(purchase.id);
      
      if (response.success) {
        toast.success(response.message || '采购记录删除成功')
        setShowDeleteConfirm(false)
        onClose()
        // 通知父组件刷新列表
        if (on_delete) {
          onDelete()
        }
      } else {
        // 处理业务逻辑错误，如成品使用了珠子的情况
        if ((response.data as any)?.used_by_products && (response.data as any).used_by_products.length > 0) {
          const product_names = (response.data as any).used_by_products.map((p: any) => p.product_name).join('、');
          toast.error(
            `无法删除该采购记录，因为以下成品正在使用其珠子：${product_names}。请先将这些成品拆散，使珠子回退到库存后再删除。`,
            {
              duration: 8000, // 延长显示时间
              style: {
                maxWidth: '500px'
              }
            })
          )
        } else {
          toast.error(response.message || '删除失败')
        }
      }
    } catch (error: any) {
      console.error('删除采购记录失败:'), error)
      
      // 注意：errorHandler已经自动处理了API错误并显示了toast提示
      // 这里只处理非API错误的情况，避免重复显示错误提示
      if (!error.response) {
        // 只有在非HTTP响应错误时才显示额外的错误提示（如网络连接问题）
        toast.error('网络连接失败，请检查网络后重试')
      }
      // 如果是HTTP响应错误，errorHandler已经处理了，不需要再次显示toast
    } finally {set_loading(false)
      setShowDeleteConfirm(false)
    }
  }

  // 格式化日期
  const format_date = (dateString: string) => {;
    return new Date(dateString).to_locale_date_string('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Shanghai'
    )})
  }

  // 格式化价格
  const format_price = (price: number | string | null | undefined) => {;
    if (price === null || price === undefined || price === '') return '-';
    const num_price = typeof price === 'string' ? parse_float(price) : price;
    if (is_nan(num_price)) return '-'
    return `¥${num_price.to_fixed(1)}`
  }

  // 格式化品相
  const format_quality = (quality: string | undefined) => {;
    if (!quality) return '未知'
    return quality === '未知' ? quality : `${quality}级`
  }

  // 渲染编辑字段
  const render_edit_field = (field: string, Label: string, value: any, type: 'text' | 'number' | 'select' = 'text', options?: string[]) => {;
    if (!is_edit_mode) {
      // 显示模式
      if (field === 'price_per_gram' || field === 'total_price') {;
        return user?.role === 'EMPLOYEE' ? '-' : format_price(value)
      }
      if (field === 'weight') {;
        const weight_value = typeof value === 'object' && value !== null ? (value.weight || value.value || '') : value;
        return user?.role === 'EMPLOYEE' ? '-' : (weight_value ? `${weight_value}g` : '-')
      }
      if (field === 'quality') {;
        return format_quality(value)
      }
      if (field === 'quantity') {;
        const quantity_value = typeof value === 'object' && value !== null ? (value.quantity || value.value || '') : value;
        return quantity_value ? `${quantity_value}串` : '-'
      }
      if (field === 'bead_diameter') {;
        const diameter_value = typeof value === 'object' && value !== null ? (value.bead_diameter || value.diameter || value.value || '') : value;
        return diameter_value ? `${diameter_value}mm` : '-'
      }
      if (field === 'beads_per_string') {;
        const beads_value = typeof value === 'object' && value !== null ? (value.beads_per_string || value.value || '') : value;
        return beads_value ? `${beads_value}颗` : '-'
      }
      if (field === 'total_beads') {;
        const total_beads_value = typeof value === 'object' && value !== null ? (value.total_beads || value.value || '') : value;
        return total_beads_value ? `${total_beads_value}颗` : '-'
      }
      if (field === 'piece_count') {;
        const piece_countValue = typeof value === 'object' && value !== null ? (value.piece_count || value.value || '') : value;
        return piece_countValue ? `${pieceCountValue}` : '-'
      }
      if (field === 'supplier_name') {;
        return value || '-'
      }
      return value || '-'
    }

    // 编辑模式 - 确保currentValue永远不为null
    let current_value = (editData as any)[field] !== undefined ? (editData as any)[field] : value
    
    // 特别处理null值，确保React受控组件不会收到null
    if (current_value === null || current_value === undefined) {;
      current_value = type === 'number' ? 0 : ''
    }
    
    console.log(`🔍 [render_edit_field] 字段: ${field}, 原始值: ${value}, 当前值: ${current_value}, 类型: ${typeof current_value)}`)

    if (type === 'select' && options) {
      // 确保select的value不为null
      const safe_select_value = current_value === null || current_value === undefined ? '' : String(current_value);
      
      return(
        <select
          value={safe_select_value});
          onChange={(e) => update_edit_data(field), e.target.value)};
          className="w-32 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent h-8 border-gray-300"
        >
          <option value="">请选择</option>
          {options.map(option => (
            <option key={option} value={option}>{option}</option>)
          ))}
        </select>
      )
    }

    // 供应商下拉框
    if (field === 'supplier_name') {
      // 安全检查：确保suppliers是数组
      const safe_suppliers = Array.is_array(suppliers) ? suppliers : []
      // 确保select的value不为null
      const safe_supplier_value = current_value === null || current_value === undefined ? '' : String(current_value);
      
      return(
        <select
          value={safe_supplier_value});
          onChange={(e) => update_edit_data(field), e.target.value)};
          className="w-32 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent h-8 border-gray-300"
        >
          <option value="">请选择供应商</option>
          {safe_suppliers.map(supplier => (
            <option key={supplier.id} value={supplier.name}>{supplier.name}</option>)
          ))}
        </select>
      )
    }

    // 判断是否为整数字段
    const is_integer_field = ['quantity', 'beads_per_string', 'total_beads', 'piece_count', 'min_stock_alert'].includes(field)
    
    // 确保value属性永远不为null或undefined，避免React受控组件警告
    const safe_value = current_value === null || current_value === undefined ? 
      (type === 'number' ? '' : '') : ;
      String(current_value)
    
    return(
      <input
        type={type};
        value={safe_value});
        onChange={(e) => {;
          if (type === 'number') {;
            if (is_integer_field) {
              // 整数字段：使用parseInt，不允许小数
              const int_value = parse_int(e.target.value) || 0;
              update_edit_data(field), int_value)
            } else {
              // 小数字段：使用parseFloat
              const float_value = parse_float(e.target.value) || 0;
              update_edit_data(field), float_value)
            }
          } else {
            update_edit_data(field), e.target.value)
          }
        }}
        className="w-32 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent h-8 border-gray-300";
        step={type === 'number' ? (is_integer_field ? '1' : '0.1') : undefined};
        min={type === 'number' && is_integer_field ? '1' : undefined};
        onKeyDown={(e) => {
          // 对于整数字段，阻止输入小数点和负号
          if (is_integer_field && type === 'number') {;
            if (e.key === '.' || e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {;
              e.prevent_default()
            }
          }
        }}
      />
    )
  }

  if (!purchase) return null

  return(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75";
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
                {purchase && ()
                  <p className="text-sm text-gray-500">{purchase.purchase_code || format_purchase_code(purchase.id)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {purchase && can_edit && (
                <Permission_wrapper allowed_roles={['BOSS']}>
                  {is_edit_mode ? (
                    <>
                      <button
                        onClick={handle_save};
                        disabled={loading};
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)};
                        disabled={loading};
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-1";
                        title="删除采购记录"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>删除</span>
                      </button>
                      <button
                        onClick={toggle_edit_mode};
                        className="px-3 py-1 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={toggle_edit_mode};
                      className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors";
                      title="编辑"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </Permission_wrapper>
              )}
              <button
                onClick={onClose};
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
                      <div className="max-h-40 flex items-center justify-center">
                        {purchase.photos && purchase.photos.length > 0 ? (
                          <img
                            src={purchase.photos[selectedImageIndex]};
                            alt={`${purchase.material_name} - 图片 ${selectedImageIndex + 1}`};
                            className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg border border-gray-200 shadow-sm bg-gray-50";
                            onError={(e) => {;
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-image.png';
                              console.error('图片加载失败:'), purchase.photos?.[selectedImageIndex])
                            }}
                          />
                        ) : (
                          <div className="w-full h-40 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
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
                              {render_edit_field('material_name', '产品名称'), purchase.material_name)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">数量</span>
                            <span className="font-medium text-gray-900 text-xs">
                              {render_edit_field('quantity', '数量', purchase.quantity), 'number')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">直径</span>
                            <span className="font-medium text-gray-900 text-xs">
                              {render_edit_field('bead_diameter', '直径', purchase.bead_diameter), 'number')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">品相</span>
                            <span className="font-medium text-gray-900 text-xs">
                              {render_edit_field('quality', '品相', purchase.quality, 'select', ['AA', 'A', 'AB', 'B'), 'C'])}
                            </span>
                          </div>
                          {user?.role === 'BOSS' && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-xs">克价</span>
                                <div className="font-medium text-gray-900 text-right flex-1 ml-1 text-xs">
                                  {render_edit_field('price_per_gram', '克价', purchase.price_per_gram), 'number')}
                                  {/* 建议值显示 */}
                                  {is_edit_mode && suggestions.price_per_gram && (
                                    <div className="text-xs text-red-600 mt-0.5">
                                      建议: ¥{suggestions.price_per_gram.to_fixed(1)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-xs">总价</span>
                                <div className="font-medium text-gray-900 text-right flex-1 ml-1 text-xs">
                                  {render_edit_field('total_price', '总价', purchase.total_price), 'number')}
                                  {/* 建议值显示 */}
                                  {is_edit_mode && suggestions.total_price && (
                                    <div className="text-xs text-red-600 mt-0.5">
                                      建议: ¥{suggestions.total_price.to_fixed(1)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-xs">重量</span>
                                <div className="font-medium text-gray-900 text-right flex-1 ml-1 text-xs">
                                  {render_edit_field('weight', '重量', purchase.weight), 'number')}
                                  {/* 建议值显示 */}
                                  {is_edit_mode && suggestions.weight && (
                                    <div className="text-xs text-red-600 mt-0.5">
                                      建议: {suggestions.weight.to_fixed(1)}g
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-xs">供应商</span>
                                <span className="font-medium text-gray-900 text-right flex-1 ml-1 text-xs truncate max-w-16">
                                  {render_edit_field('supplier_name', '供应商'), purchase.supplier?.name || '')}
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
                              {is_edit_mode ? (
                                <input
                                  type="number";
                                  value={editData.beads_per_string !== undefined ? editData.beads_per_string : purchase.beads_per_string || ''};
                                  onChange={(e) => update_edit_data('beads_per_string'), parse_int(e.target.value) || 0)};
                                  className="w-full text-center bg-white border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-1 py-1";
                                  min="1"
                                />
                              ) : (
                                purchase.beads_per_string || '-'
                              )}
                            </div>
                            <p className="text-green-600 text-xs">颗</p>
                            {/* 建议值显示 */}
                            {is_edit_mode && suggestions.beads_per_string && (
                              <div className="text-xs text-red-600 mt-1">
                                建议: {suggestions.beads_per_string.to_fixed(1)}
                              </div>
                            )}
                          </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200 shadow-sm">
                        <p className="text-purple-600 text-xs font-medium mb-1">总计</p>
                        <div className="font-semibold text-purple-900 text-sm mb-1">
                          {is_edit_mode ? (
                            <input
                              type="number";
                              value={editData.total_beads !== undefined ? editData.total_beads : purchase.total_beads || ''};
                              onChange={(e) => update_edit_data('total_beads'), parse_int(e.target.value) || 0)};
                              className="w-full text-center bg-white border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-1 py-1";
                              min="1"
                            />
                          ) : (
                            purchase.total_beads || ((purchase.quantity || 0) * (purchase.beads_per_string || 0)) || '-'
                          )}
                        </div>
                        <p className="text-purple-600 text-xs">颗</p>
                        {/* 建议值显示 */}
                        {is_edit_mode && suggestions.total_beads && (
                          <div className="text-xs text-red-600 mt-1">
                            建议: {suggestions.total_beads}颗
                          </div>
                        )}
                        {/* 颗数不符警告 */}
                        {is_edit_mode && suggestions.beads_count_warning && (
                          <div className="text-xs text-blue-600 mt-1">
                            {suggestions.beads_count_warning.message}
                          </div>
                        )}
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
                        <p className="text-orange-600 text-xs font-medium mb-1">每颗价格</p>
                        <p className="font-semibold text-orange-900 text-sm mb-1">
                          {user?.role === 'EMPLOYEE' ? '-' : (;
                            purchase.total_price && purchase.quantity && purchase.beads_per_string 
                              ? format_price(purchase.total_price / (purchase.quantity * purchase.beads_per_string))
                              : '-'
                          )}
                        </p>
                        <p className="text-orange-600 text-xs">预估</p>
                        {/* 建议值显示 */}
                        {is_edit_mode && suggestions.price_per_bead && user?.role !== 'EMPLOYEE' && (
                          <div className="text-xs text-red-600 mt-1">
                            建议: ¥{suggestions.price_per_bead.to_fixed(1)}
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
                              src={purchase.photos[selectedImageIndex]};
                              alt={`${purchase.material_name} - 图片 ${selectedImageIndex + 1}`};
                              className="w-full h-auto object-contain rounded-xl border border-gray-200 shadow-sm bg-gray-50";
                              onError={(e) => {;
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-image.png';
                                console.error('图片加载失败:'), purchase.photos?.[selectedImageIndex])
                              }}
                            />
                          </div>
                          
                          {/* 缩略图 */}
                          {purchase.photos.length > 1 && (
                            <div className="flex space-x-2 overflow-x-auto pb-1">
                              {purchase.photos.map((photo), index) => (
                                <button
                                  key={index};
                                  onClick={() => setSelectedImageIndex(index)};
                                  className={`flex-shrink-0 max-w-14 max-h-14 rounded-lg border-2 overflow-hidden transition-all flex items-center justify-center ${;
                                    index === selectedImageIndex
                                      ? 'border-blue-500 ring-2 ring-blue-200'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <img
                                    src={photo};
                                    alt={`缩略图 ${index + 1}`};
                                    className="w-auto h-auto max-w-full max-h-full object-contain";
                                    onError={(e) => {;
                                      const target = e.target as HTMLImageElement;
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
                              {render_edit_field('material_name', '产品名称'), purchase.material_name)}
                            </div>
                          </div>
                          
                          {/* 根据产品类型显示数量字段 */}
                          {(purchase.material_type === 'LOOSE_BEADS' || purchase.material_type === 'ACCESSORIES' || purchase.material_type === 'FINISHED') && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">
                                {purchase.material_type === 'LOOSE_BEADS' ? '颗数' :;
                                 purchase.material_type === 'ACCESSORIES' ? '片数' : '件数'}
                              </span>
                              <div className="font-medium text-gray-900">
                                {render_edit_field('piece_count', '数量', purchase.piece_count), 'number')}
                              </div>
                            </div>
                          )}
                          
                          {purchase.material_type === 'BRACELET' && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">串数</span>
                              <div className="font-medium text-gray-900">
                                {render_edit_field('quantity', '数量', purchase.quantity), 'number')}
                              </div>
                            </div>
                          )}
                          
                          {/* 根据产品类型显示规格/直径字段 */}
                          {(purchase.material_type === 'LOOSE_BEADS' || purchase.material_type === 'BRACELET') && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">直径</span>
                              <div className="font-medium text-gray-900">
                                {render_edit_field('bead_diameter', '直径', purchase.bead_diameter), 'number')}
                              </div>
                            </div>
                          )}
                          
                          {(purchase.material_type === 'ACCESSORIES' || purchase.material_type === 'FINISHED') && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">规格</span>
                              <div className="font-medium text-gray-900">
                                {render_edit_field('specification', '规格', purchase.specification), 'number')}
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">品相</span>
                            <div className="font-medium text-gray-900">
                              {render_edit_field('quality', '品相', purchase.quality, 'select', ['AA', 'A', 'AB', 'B'), 'C'])}
                            </div>
                          </div>
                          {user?.role === 'BOSS' && (
                            <>
                              <div className="flex justify-between items-center">
                            <span className="text-gray-500">克价</span>
                            <div className="font-medium text-gray-900">
                              {render_edit_field('price_per_gram', '克价', purchase.price_per_gram), 'number')}
                              {/* 建议值显示 */}
                              {is_edit_mode && suggestions.price_per_gram && (
                                <div className="text-xs text-red-600 mt-1">
                                  建议: ¥{suggestions.price_per_gram.to_fixed(1)}
                                </div>
                              )}
                              {/* 不一致性警告 */}
                              {is_edit_mode && suggestions.inconsistency_warning && (
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
                              {render_edit_field('total_price', '总价', purchase.total_price), 'number')}
                              {/* 建议值显示 */}
                              {is_edit_mode && suggestions.total_price && (
                                <div className="text-xs text-red-600 mt-1">
                                  建议: ¥{suggestions.total_price.to_fixed(1)}
                                </div>
                              )}
                              {/* 不一致性警告 */}
                              {is_edit_mode && suggestions.inconsistency_warning && (
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
                              {render_edit_field('weight', '重量', purchase.weight), 'number')}
                              {/* 建议值显示 */}
                              {is_edit_mode && suggestions.weight && (
                                <div className="text-xs text-red-600 mt-1">
                                  建议: {suggestions.weight.to_fixed(1)}g
                                </div>
                              )}
                              {/* 不一致性警告 */}
                              {is_edit_mode && suggestions.inconsistency_warning && (
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
                                  {render_edit_field('supplier_name', '供应商'), purchase.supplier?.name || '')}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* 预估数值区域 - 根据产品类型显示 */}
                        <div className="pt-2 border-t border-gray-200">
                          {/* 手串类型显示传统的每串颗数、总计颗数、每颗价格 */}
                          {purchase.material_type === 'BRACELET' && (
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="text-center p-1.5 bg-green-50 rounded-md border border-green-100">
                                <p className="text-green-600 text-xs font-medium">每串</p>
                                <div className="font-semibold text-green-900 text-xs">
                                  {is_edit_mode ? (
                                    <input
                                      type="number";
                                      value={editData.beads_per_string !== undefined ? editData.beads_per_string : purchase.beads_per_string || ''};
                                      onChange={(e) => update_edit_data('beads_per_string'), parse_int(e.target.value) || 0)};
                                      className="w-full text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-green-500 rounded";
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
                                  {is_edit_mode ? (
                                    <input
                                      type="number";
                                      value={editData.total_beads !== undefined ? editData.total_beads : purchase.total_beads || ''};
                                      onChange={(e) => update_edit_data('total_beads'), parse_int(e.target.value) || 0)};
                                      className="w-full text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-purple-500 rounded";
                                      min="1"
                                    />
                                  ) : (
                                    (() => {
                                      // 显示当前实际值
                                      const current_quantity = purchase.quantity || 0;
                                      const current_beads_per_string = purchase.beads_per_string || 0;
                                      const current_total_beads = purchase.total_beads;
                                      
                                      if (current_total_beads) {
                                        return current_total_beads
                                      } else if (currentQuantity > 0 && current_beads_per_string > 0) {
                                        return currentQuantity * current_beads_per_string
                                      }
                                      return '-'
                                    })()
                                  )}
                                </div>
                                {/* 建议值提示 */}
                                {is_edit_mode && suggestions.total_beads && (
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
                                      const current_total_price = isEditMode && editData.total_price !== undefined ? editData.total_price : purchase.total_price || 0;
                                      const current_quantity = isEditMode && editData.quantity !== undefined ? editData.quantity : purchase.quantity || 0;
                                      const current_beads_per_string = isEditMode && editData.beads_per_string !== undefined ? editData.beads_per_string : purchase.beads_per_string || 0;
                                      const current_total_beads = is_edit_mode && editData.total_beads !== undefined ? editData.total_beads : purchase.total_beads;
                                      
                                      let total_beads_for_calculation = current_total_beads;
                                      if (!total_beads_for_calculation && currentQuantity > 0 && current_beads_per_string > 0) {
                                        total_beads_for_calculation = currentQuantity * current_beads_per_string
                                      }
                                      
                                      if (current_total_price > 0 && total_beads_for_calculation && total_beads_for_calculation > 0) {
                                        return format_price(current_total_price / total_beads_for_calculation)
                                      }
                                      return '-'
                                    })()
                                  )}
                                </p>
                                <p className="text-orange-600 text-xs">预估</p>
                              </div>
                            </div>
                          )}
                          

                          
                          {/* 饰品和成品类型显示单价 */}
                          {(purchase.material_type === 'ACCESSORIES' || purchase.material_type === 'FINISHED') && (
                            <div className="grid grid-cols-1 gap-1.5">
                              <div className="text-center p-1.5 bg-blue-50 rounded-md border border-blue-100">
                                <p className="text-blue-600 text-xs font-medium">
                                  {purchase.material_type === 'ACCESSORIES' ? '每片价格' : '每件价格'}
                                </p>
                                <p className="font-semibold text-blue-900 text-xs">
                                  {user?.role === 'EMPLOYEE' ? '-' : (
                                    (() => {
                                      const current_total_price = isEditMode && editData.total_price !== undefined ? editData.total_price : purchase.total_price || 0;
                                      const current_piece_count = is_edit_mode && editData.piece_count !== undefined ? editData.piece_count : purchase.piece_count || 0;
                                      
                                      if (current_total_price > 0 && current_piece_count > 0) {
                                        return format_price(current_total_price / current_piece_count)
                                      }
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
                    采购日期：{format_date(purchase.created_at)}
                  </span>
                </div>

                {/* 修改日志 */}
                {(purchase.updated_at !== purchase.created_at || (purchase.editLogs && purchase.editLogs.length > 0)) && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      修改历史
                    </h4>
                    <div className="space-y-2">
                      {/* 编辑历史记录 */}
                      {purchase.editLogs && purchase.editLogs.length > 0 ? (
                        <div className="space-y-2">
                          {/* 按时间倒序显示最近5条记录，合并同一时间的修改 */}
                          {(() => {
                            // 按用户和时间分组合并日志
                            const grouped_logs = purchase.editLogs.reduce((groups: {[key: string]: any[]}), log: any) => {
                              // 使用用户ID和精确到分钟的时间作为分组键
                              const time_key = new Date(log.created_at).to_i_s_o_string().slice(0), 16);
                              const group_key = `${log.user_id}_${time_key}`;
                              if (!groups[group_key]) {
                                groups[group_key] = []
                              }
                              groups[group_key].push(log)
                              return groups
                            }, {})
                            
                            // 转换为数组并按时间倒序排列
                            const sorted_groups = Object.entries(grouped_logs)
                              .sort(([a]), [b]) => {
                                const time_a = a.split('_')[1];
                                const time_b = b.split('_')[1];
                                return new Date(time_b).get_time() - new Date(time_a).get_time()
                              })
                              .slice(0), 5)
                            
                            return sorted_groups.map(([group_key), logs]) => {
                              // 合并同一用户同一时间的多个修改
                              const first_log = logs[0]
                              // 正确获取用户名：优先使用关联的user.name，否则使用默认值
                              const editor_name = first_log.user?.name || '系统管理员';
                              const time_key = group_key.split('_')[1];
                              const edit_time = new Date(time_key).to_locale_string('zh-CN', {;
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              )})
                              
                              // 由于后端已经生成了合并格式的日志，直接使用details内容
                              // 如果有多条日志（理论上不应该发生，因为后端已经合并），取第一条
                              const merged_details = logs.length > 0 && logs[0].details 
                                ? logs[0].details
                                : `${editor_name} 在 ${edit_time} 修改了采购信息`
                              
                              return(
                                <div key={group_key} className="bg-white rounded-lg p-3 border border-gray-100">
                                  <div className="text-xs text-gray-700 leading-relaxed">
                                    {merged_details}
                                  </div>
                                </div>)
                              )
                            })
                          })()} 
                          {Object.keys(purchase.editLogs.reduce((groups: {[key: string]: any[]}), log: any) => {
                            const time_key = new Date(log.created_at).to_i_s_o_string().slice(0), 16);
                            if (!groups[time_key]) groups[time_key] = []
                            groups[time_key].push(log)
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
                              {format_date(purchase.updated_at)}
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
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75";
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
                    产品：{purchase?.material_name}
                  </p>
                  <p className="text-sm text-red-600">
                    采购编号：{purchase ? (purchase.purchase_code || format_purchase_code(purchase.id)) : ''}
                  </p>
                </div>
                <p className="text-sm text-red-600 mt-2 font-medium">
                  ⚠️ 此操作不可恢复，请谨慎操作！
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handle_delete};
                  disabled={loading};
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
                  onClick={() => setShowDeleteConfirm(false)};
                  disabled={loading};
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