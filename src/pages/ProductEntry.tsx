import { useState, useEffect, useCallback } from 'react'
import { Gem, Plus, Save, ArrowLeft, X, Search, Package, Ruler, ChevronDown, Eye, Camera, Upload, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import CameraPhoto, { FACING_MODES, IMAGE_TYPES } from 'react-html5-camera-photo'
import 'react-html5-camera-photo/build/css/index.css'

// 抑制react-html5-camera-photo组件的defaultProps警告
if (import.meta.env.MODE === 'development') {
  const originalConsoleError = console.error
  console.error = (...args) => {
    const message = args[0]
    if (typeof message === 'string' && message.includes('Support for defaultProps will be removed from function components')) {
      // 抑制defaultProps警告
      return
    }
    originalConsoleError.apply(console, args)
  }
}
import { useDropzone } from 'react-dropzone'
import { finished_product_api, fixImageUrl, upload_api, get_api_url } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { format_purchase_code } from '../utils/format'
import { sort_by_pinyin } from '../utils/pinyinSort'
import { useDeviceDetection } from '../hooks/useDeviceDetection'

// 辅助函数：解析并获取第一张图片URL
const get_first_photo_url = (photos: any): string | null => {
  if (!photos) return null
  
  let photoArray: string[] = []
  
  // 如果是字符串
  if (typeof photos === 'string') {
    // 如果字符串以http开头，直接作为URL返回
    if (photos.startsWith('http')) {
      return fixImageUrl(photos)
    }
    // 否则尝试解析为JSON
    try {
      const parsed = JSON.parse(photos)
      if (Array.isArray(parsed)) {
        photoArray = parsed
      } else {
        // 如果解析出来不是数组，可能是单个URL字符串
        return typeof parsed === 'string' ? fixImageUrl(parsed) : null
      }
    } catch (e) {
      // JSON解析失败，可能是普通字符串，尝试直接作为URL使用
      return photos.trim() ? fixImageUrl(photos) : null
    }
  } else if (Array.isArray(photos)) {
    photoArray = photos
  } else {
    return null
  }
  
  // 从数组中找到第一个有效的字符串URL
  for (const photo of photoArray) {
    if (photo && typeof photo === 'string' && photo.trim()) {
      return fixImageUrl(photo)
    }
  }
  
  return null
}
import { 
  ProductionMode, 
  ProductionFormData, 
  AvailableMaterial, 
  CostCalculationResponse,
  MaterialUsageRequest,
  BatchProductCreateRequest,
  BatchProductCreateResponse
} from '../types'

export default function ProductEntry() {
  const { user, is_authenticated } = useAuth()
  const { is_mobile: isMobile } = useDeviceDetection()
  const [current_step, set_current_step] = useState<'mode' | 'materials' | 'info' | 'batch_details' | 'review'>('mode')
  const [production_mode, set_production_mode] = useState<ProductionMode>('DIRECT_TRANSFORM')
  const [formData, set_form_data] = useState<ProductionFormData>({
    mode: 'DIRECT_TRANSFORM',
    material_name: '',
    description: '',
    specification: '',
    selected_materials: [],
    labor_cost: 100,
    craft_cost: 100,
    selling_price: 0,
    profit_margin: 50, // 默认利润率50%
    photos: [],
    production_quantity: 1 // 默认制作1个
  })
  
  // 批量创建模式的状态
  const [batch_form_data, set_batch_form_data] = useState<{
    selected_materials: (AvailableMaterial & { 
      selected_quantity: number
      productInfo: {
        material_name: string
        description: string
        specification: string | number
        labor_cost: number
        craft_cost: number
        selling_price: number
        photos: string[]
        materialCost: number
        total_cost: number
        profit_margin: number
      }
    })[]
  }>({
    selected_materials: []
  })
  const [expanded_items, set_expanded_items] = useState<Set<string>>(new Set())
  
  const [available_materials, set_available_materials] = useState<AvailableMaterial[]>([])
  const [material_search, set_material_search] = useState('')
  const [cost_calculation, set_cost_calculation] = useState<CostCalculationResponse | null>(null)
  const [loading, set_loading] = useState(false)
  const [materials_loading, set_materials_loading] = useState(false)
  const [selected_material_detail, set_selected_material_detail] = useState<AvailableMaterial | null>(null)
  
  // 组合制作模式的分类标签页状态
  const [active_tab, set_active_tab] = useState<'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES'>('LOOSE_BEADS')
  
  // 拍照相关状态
  const [is_camera_active, set_is_camera_active] = useState(false)
  const [camera_error, set_camera_error] = useState<string | null>(null)
  const [uploading, set_uploading] = useState(false)
  const [material_photos, set_material_photos] = useState<string[]>([])
  
  // 文件数据接口
  interface FileData {
    base64: string
    name: string
    size: number
    type: string
    uploaded_url?: string
  }
  
  const [file_data_list, set_file_data_list] = useState<FileData[]>([])
  
  // 拍照功能函数
  const startCamera = () => {
    console.log('启动相机')
    set_camera_error(null)
    set_is_camera_active(true)
  }
  
  const stopCamera = () => {
    console.log('停止相机')
    set_is_camera_active(false)
    set_camera_error(null)
  }
  
  // 处理相机拍照
  const handleCameraPhoto = async (dataUri: string) => {
    console.log('处理相机拍照')
    
    if (material_photos.length > 0) {
      toast.error('已有图片，请先删除当前图片再拍照')
      return
    }
    
    if (uploading) {
      console.log('上传中，阻止重复操作')
      return
    }
    
    set_uploading(true)
    
    try {
      const timestamp = Date.now()
      const fileName = `product_photo_${timestamp}.jpg`
      const base64Data = dataUri.split(',')[1]
      const fileSize = Math.round((base64Data.length * 3) / 4)
      
      const fileData: FileData = {
        base64: dataUri,
        name: fileName,
        size: fileSize,
        type: 'image/jpeg'
      }
      
      set_file_data_list([fileData])
      
      // 转换为Blob并上传
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/jpeg' })
      
      const formData = new FormData()
      formData.append('images', blob, fileName)
      
      const response = await upload_api.uploadPurchaseImages(formData)
      
      if (response.success && response.data && (response.data as any).urls) {
        const apiUrl = get_api_url()
        const baseUrl = apiUrl.replace('/api/v1', '')
        const url = (response.data as any).urls[0]
        
        let fullUrl: string
        if (url.startsWith('http://') || url.startsWith('https://')) {
          fullUrl = url
        } else {
          const normalizedUrl = url.startsWith('/') ? url : `/${url}`
          fullUrl = `${baseUrl}${normalizedUrl}`
        }
        
        set_material_photos([fullUrl])
        set_form_data(prev => ({ ...prev, photos: [fullUrl] }))
        stopCamera()
        toast.success('拍照上传成功')
      } else {
        throw new Error(response.message || '上传失败')
      }
    } catch (error) {
      console.error('拍照上传失败:', error)
      toast.error('拍照上传失败，请重试')
      set_file_data_list([])
    } finally {
      set_uploading(false)
    }
  }
  
  // 处理文件上传
  const handleImageUpload = async (files: FileList) => {
    if (files.length === 0) return
    
    if (material_photos.length > 0) {
      toast.error('已有图片，请先删除当前图片再上传新图片')
      return
    }
    
    if (uploading) {
      console.log('上传中，阻止重复操作')
      return
    }
    
    set_uploading(true)
    
    try {
      const formData = new FormData()
      Array.from(files).forEach(file => {
        formData.append('images', file)
      })
      
      const response = await upload_api.uploadPurchaseImages(formData)
      
      if (response.success && response.data && (response.data as any).urls) {
        const apiUrl = get_api_url()
        const baseUrl = apiUrl.replace('/api/v1', '')
        const urls = (response.data as any).urls
        
        const fullUrls = urls.map((url: string) => {
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
          } else {
            const normalizedUrl = url.startsWith('/') ? url : `/${url}`
            return `${baseUrl}${normalizedUrl}`
          }
        })
        
        set_material_photos(fullUrls)
        set_form_data(prev => ({ ...prev, photos: fullUrls }))
        toast.success('图片上传成功')
      } else {
        throw new Error(response.message || '上传失败')
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      toast.error('图片上传失败，请重试')
    } finally {
      set_uploading(false)
    }
  }
  
  // 删除图片
  const removeMaterialImage = async (index: number) => {
    const image_url = material_photos[index]
    
    try {
      if (image_url) {
        await upload_api.deletePurchaseImages([image_url])
      }
      
      const newPhotos = material_photos.filter((_, i) => i !== index)
      set_material_photos(newPhotos)
      set_form_data(prev => ({ ...prev, photos: newPhotos }))
      set_file_data_list([])
      toast.success('图片删除成功')
    } catch (error) {
      console.error('删除图片失败:', error)
      toast.error('删除图片失败')
    }
  }
  
  // Dropzone组件
  const DropzoneUpload = ({ onFilesAccepted, disabled }: { onFilesAccepted: (files: FileList) => void, disabled?: boolean }) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const fileList = {
          length: acceptedFiles.length,
          item: (index: number) => acceptedFiles[index] || null,
          [Symbol.iterator]: function* () {
            for (let i = 0; i < acceptedFiles.length; i++) {
              yield acceptedFiles[i]
            }
          }
        } as FileList
        
        onFilesAccepted(fileList)
      }
    }, [onFilesAccepted])
    
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: onDrop,
      accept: {
        'image/*': ['.jpeg', '.jpg', '.png', '.gif']
      },
      maxFiles: 5,
      disabled
    })
    
    return (
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-crystal-500 bg-crystal-50' : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">
          {isDragActive ? '拖放图片到这里' : '点击或拖放图片上传'}
        </p>
      </div>
    )
  }
  
  // 根据当前标签页和搜索条件筛选原材料
  const get_filtered_materials = () => {
    let filteredMaterials = available_materials
    
    // 组合制作模式：按分类筛选
    if (formData.mode === 'COMBINATION_CRAFT') {
      filteredMaterials = filteredMaterials.filter(material => material.material_type === active_tab)
    }
    
    // 搜索筛选
    if (material_search.trim()) {
      const search_term = material_search.toLowerCase().trim()
      filteredMaterials = filteredMaterials.filter(material => 
        material.material_name.toLowerCase().includes(search_term) ||
        (material.quality && material.quality.toLowerCase().includes(search_term)) ||
        (material.supplier_name && material.supplier_name.toLowerCase().includes(search_term))
      )
    }
    
    return filteredMaterials
  }

  // 获取可用原材料
  const fetchAvailableMaterials = async () => {
    try {
      set_materials_loading(true)
      
      // 添加认证状态调试信息
      console.log('🔍 [DEBUG] 认证状态检查:', {
        is_authenticated,
        user: user ? { id: user.id, user_name: user.user_name, role: user.role } : null,
        token: localStorage.getItem('auth_token') ? '有token' : '无token'
      })
      
      if (!is_authenticated) {
        console.error('❌ 用户未认证，无法获取原材料')
        toast.error('请先登录')
        set_available_materials([])
        return
      }
      
      // 根据制作模式筛选原材料类型
      let material_types: string[] = []
      if (formData.mode === 'DIRECT_TRANSFORM') {
        // 直接转化模式：只显示成品类型的原材料
        material_types = ['FINISHED']
      } else if (formData.mode === 'COMBINATION_CRAFT') {
        // 组合制作模式：显示散珠、手串、配件
        material_types = ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES']
      }
      
      console.log('🔍 [原材料筛选] 制作模式:', formData.mode, '筛选类型:', material_types)
      
      const response = await finished_product_api.get_materials({
        search: material_search,
        available_only: true,
        min_quantity: 1,
        material_types: material_types
      })
      
      if (response.success && response.data && typeof response.data === 'object' && response.data !== null && 'materials' in response.data) {
        let materials = (response.data as any).materials
        
        // 对原材料进行拼音排序
        materials = sort_by_pinyin(materials, (material: any) => material.material_name)
        
        set_available_materials(materials)
      } else {
        set_available_materials([])
      }
    } catch (error: any) {
      console.error('获取原材料失败:', error)
      toast.error('获取原材料失败')
      set_available_materials([])
    } finally {
      set_materials_loading(false)
    }
  }

  // 计算制作成本
  const calculate_cost = async () => {
    if (formData.selected_materials.length === 0) {
      set_cost_calculation(null)
      return
    }

    try {
      // 根据制作数量计算总的原材料使用量
      const production_quantity = formData.mode === 'COMBINATION_CRAFT' ? formData.production_quantity : 1
      
      const materials: MaterialUsageRequest[] = formData.selected_materials.map(item => ({
        purchase_id: item.material.purchase_id,
        quantity_used_beads: item.quantity_used_beads * production_quantity,
        quantity_used_pieces: item.quantity_used_pieces * production_quantity
      }))

      const response = await finished_product_api.calculate_cost({
        materials,
        labor_cost: formData.labor_cost * production_quantity,
        craft_cost: formData.craft_cost * production_quantity,
        profit_margin: formData.profit_margin
      })

      if (response.success && response.data) {
        const costData = response.data as CostCalculationResponse
        console.log('🔍 [成本计算] 后端返回的完整数据:', JSON.stringify(costData, null, 2))
        console.log('🔍 [成本计算] 成本分解数据:', costData.cost_breakdown)
        set_cost_calculation(costData)
        // 移除自动设置销售价格的逻辑，让用户完全控制销售价格输入
      }
    } catch (error: any) {
      console.error('计算成本失败:', error)
      toast.error('计算成本失败')
    }
  }

  // 添加原材料到选择列表
  const addMaterial = (material: AvailableMaterial) => {
    if (formData.mode === 'DIRECT_TRANSFORM') {
      // 直接转化模式：添加到批量选择列表
      const isAlreadySelected = batch_form_data.selected_materials.some(
        item => item.purchase_id === material.purchase_id
      )
      
      if (isAlreadySelected) {
        toast.error('该原材料已经添加')
        return
      }

      set_batch_form_data(prev => {
        const materialWithQuantity = { 
          ...material, 
          selected_quantity: 1,
          productInfo: {
            material_name: material.material_name + '（销售成品）',
            description: '',
            specification: material.specification || '',
            labor_cost: 20, // 默认人工成本
            craft_cost: 100, // 默认工艺成本
            selling_price: 0,
            photos: material.photos || [],
            materialCost: material.unitCost || 0,
            total_cost: (material.unitCost || 0) + 20 + 100,
            profit_margin: 0
          }
        }
        
        return {
          selected_materials: [...prev.selected_materials, materialWithQuantity]
        }
      })
    } else {
      // 组合制作模式：原有逻辑
      const isAlreadySelected = formData.selected_materials.some(
        item => item.material.purchase_id === material.purchase_id
      )
      
      if (isAlreadySelected) {
        toast.error('该原材料已经添加')
        return
      }

      set_form_data(prev => ({
        ...prev,
        selected_materials: [...prev.selected_materials, {
          material,
          quantity_used_beads: material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET' ? 1 : 0,
          quantity_used_pieces: material.material_type === 'ACCESSORIES' || material.material_type === 'FINISHED' ? 1 : 0
        }]
      }))
    }
  }

  // 更新原材料选择数量（直接转化模式）
  const updateBatchMaterialQuantity = (material_id: string, quantity: number) => {
    set_batch_form_data(prev => ({
      selected_materials: prev.selected_materials.map(material => 
        material.purchase_id === material_id 
          ? { ...material, selected_quantity: Math.min(quantity, material.available_quantity) }
          : material
      )
    }))
  }

  // 移除原材料
  const removeMaterial = (material_id: string) => {
    if (formData.mode === 'DIRECT_TRANSFORM') {
      // 直接转化模式：从批量选择列表中移除
      set_batch_form_data(prev => ({
        selected_materials: prev.selected_materials.filter(
          item => item.purchase_id !== material_id
        )
      }))
    } else {
      // 组合制作模式：原有逻辑
      set_form_data(prev => ({
        ...prev,
        selected_materials: prev.selected_materials.filter(
          item => item.material.purchase_id !== material_id
        )
      }))
    }
  }

  // 输入框显示值状态
  const [input_values, set_input_values] = useState<Record<string, string>>({})

  // 更新原材料使用数量
  const updateMaterialQuantity = (material_id: string, field: 'quantity_used_beads' | 'quantity_used_pieces', value: number) => {
    set_form_data(prev => {
      // 更新原材料使用量
      const updatedFormData = {
        ...prev,
        selected_materials: prev.selected_materials.map(item => 
          item.material.purchase_id === material_id 
            ? { ...item, [field]: Math.max(0, Math.min(value, item.material.available_quantity)) }
            : item
        )
      }
      
      // 重新计算最大制作数量
      const newMaxQuantity = calculateMaxProductionQuantityForMaterials(updatedFormData.selected_materials)
      
      // 如果当前制作数量超过新的最大制作数量，自动调整
      if (updatedFormData.production_quantity > newMaxQuantity) {
        updatedFormData.production_quantity = newMaxQuantity
        // 延迟显示提示，避免在状态更新过程中显示
        setTimeout(() => {
          toast.warning(`库存不足，制作数量已自动调整为 ${newMaxQuantity} 个`)
        }, 100)
      }
      
      return updatedFormData
    })
  }

  // 更新输入框显示值
  const updateInputValue = (material_id: string, field: string, displayValue: string) => {
    const key = `${ material_id }_${field}`
    console.log(`🔄 更新输入框显示值: ${key} = "${displayValue}"`)
    set_input_values(prev => ({
      ...prev,
      [key]: displayValue
    }))
  }

  // 获取输入框显示值
  const get_input_value = (material_id: string, field: string, actualValue: number) => {
    const key = `${ material_id }_${field}`
    if (input_values[key] !== undefined) {
      console.log(`📖 使用显示值: ${key} = "${input_values[key]}" (实际值: ${actualValue})`)
      return input_values[key]
    }
    const displayValue = actualValue > 0 ? actualValue.toString() : ''
    console.log(`📖 使用实际值: ${key} = "${displayValue}" (实际值: ${actualValue})`)
    return displayValue
  }

  // 计算最大可制作数量的辅助函数（接受材料列表参数）
  const calculateMaxProductionQuantityForMaterials = (materials: typeof formData.selected_materials): number => {
    if (materials.length === 0) {
      return 1
    }

    let maxQuantity = Infinity
    
    for (const item of materials) {
      const material = item.material
      let availableForThisMaterial = 0
      
      if (material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET') {
        // 散珠和手串按颗数计算
        if (item.quantity_used_beads > 0) {
          availableForThisMaterial = Math.floor(material.available_quantity / item.quantity_used_beads)
        }
      } else if (material.material_type === 'ACCESSORIES' || material.material_type === 'FINISHED') {
        // 配件和成品按片/件数计算
        if (item.quantity_used_pieces > 0) {
          availableForThisMaterial = Math.floor(material.available_quantity / item.quantity_used_pieces)
        }
      }
      
      if (availableForThisMaterial < maxQuantity) {
        maxQuantity = availableForThisMaterial
      }
    }
    
    return maxQuantity === Infinity ? 1 : Math.max(1, maxQuantity)
  }

  // 计算最大可制作数量（组合制作模式）
  const calculateMaxProductionQuantity = (): number => {
    return calculateMaxProductionQuantityForMaterials(formData.selected_materials)
  }

  // 更新制作数量
  const updateProductionQuantity = (quantity: number) => {
    const maxQuantity = calculateMaxProductionQuantity()
    const validQuantity = Math.max(1, Math.min(quantity, maxQuantity))
    
    set_form_data(prev => ({
      ...prev,
      production_quantity: validQuantity
    }))
    
    if (quantity > maxQuantity) {
      toast.warning(`库存不足，最多只能制作 ${maxQuantity} 个成品`)
    }
  }

  // 更新批量产品信息
  const updateBatchProduct = (product_id: string, field: string, value: any) => {
    set_batch_form_data(prev => ({
      selected_materials: prev.selected_materials.map(material => {
        if (material.purchase_id === product_id) {
          const updatedProductInfo = { ...material.productInfo, [field]: value }
          
          // 重新计算成本和利润率
          const total_cost = updatedProductInfo.materialCost + updatedProductInfo.labor_cost + updatedProductInfo.craft_cost
          const profit_margin = updatedProductInfo.selling_price > 0 
            ? ((updatedProductInfo.selling_price - total_cost) / updatedProductInfo.selling_price) * 100 
            : 0
          
          updatedProductInfo.total_cost = total_cost
          updatedProductInfo.profit_margin = profit_margin
          
          return {
            ...material,
            productInfo: updatedProductInfo
          }
        }
        return material
      })
    }))
  }

  // 批量创建成品提交
  const handleBatchSubmit = async () => {
    try {
      set_loading(true)
      
      // 验证批量表单数据
      if (batch_form_data.selected_materials.length === 0) {
        toast.error('请至少选择一种原材料')
        return
      }
      
      // 验证每个成品的必填字段
      for (let i = 0; i < batch_form_data.selected_materials.length; i++) {
        const material = batch_form_data.selected_materials[i]
        const product = material.productInfo
        if (!product.material_name.trim()) {
          toast.error(`第${i + 1}个成品请输入名称`)
          return
        }
        if (product.selling_price <= 0) {
          toast.error(`第${i + 1}个成品请设置销售价格`)
          return
        }
        // 直接转化模式下图片来自原材料，无需验证
        // 直接转化模式下规格来自原材料，无需验证
      }

      // 根据数量生成批量请求
      const products = []
      for (const material of batch_form_data.selected_materials) {
        for (let i = 0; i < material.selected_quantity; i++) {
          products.push({
            material_id: material.purchase_id,
            material_name: material.productInfo.material_name + (material.selected_quantity > 1 ? ` #${i + 1}` : ''),
            description: material.productInfo.description,
            specification: material.specification || '',
            labor_cost: material.productInfo.labor_cost,
            craft_cost: material.productInfo.craft_cost,
            selling_price: material.productInfo.selling_price,
            photos: material.productInfo.photos
          })
        }
      }

      const batchRequest: BatchProductCreateRequest = {
        products
      }

      const response = await finished_product_api.batchCreate(batchRequest)

      if (response.success) {
        const data = response.data as BatchProductCreateResponse
        toast.success(`批量创建成功！成功创建${data.success_count}个成品${data.failed_count > 0 ? `，失败${data.failed_count}个` : ''}`)
        
        // 重置表单
        set_batch_form_data({
          selected_materials: []
        })
        set_current_step('mode')
      } else {
        toast.error(response.message || '批量创建失败')
      }
    } catch (error: any) {
      console.error('批量提交失败:', error)
      toast.error('批量提交失败，请重试')
    } finally {
      set_loading(false)
    }
  }

  // 提交SKU成品制作（组合模式）
  const handleSubmit = async () => {
    try {
      set_loading(true)
      
      // 验证表单数据
      if (!formData.material_name.trim()) {
        toast.error('请输入成品名称')
        return
      }
      
      if (formData.selected_materials.length === 0) {
        toast.error('请至少选择一种原材料')
        return
      }
      
      if (formData.selling_price <= 0) {
        toast.error('请设置销售价格')
        return
      }
      
      // 验证成品图片（必填）
      if (!formData.photos || formData.photos.length === 0) {
        toast.error('请上传成品图片')
        return
      }
      
      // 验证珠子平均直径（必填）
      if (!formData.specification || !formData.specification.trim()) {
        toast.error('请输入珠子平均直径')
        return
      }

      // 验证制作数量是否超过库存限制
      const maxQuantity = calculateMaxProductionQuantity()
      if (formData.production_quantity > maxQuantity) {
        toast.error(`库存不足，最多只能制作 ${maxQuantity} 个成品`)
        return
      }

      // 如果制作数量为1，使用原有的单个创建接口
      if (formData.production_quantity === 1) {
        const materials: MaterialUsageRequest[] = formData.selected_materials.map(item => ({
          purchase_id: item.material.purchase_id,
          quantity_used_beads: item.quantity_used_beads,
          quantity_used_pieces: item.quantity_used_pieces
        }))

        const response = await finished_product_api.create({
          material_name: formData.material_name,
          description: formData.description,
          specification: formData.specification,
          materials,
          labor_cost: formData.labor_cost,
          craft_cost: formData.craft_cost,
          selling_price: formData.selling_price,
          profit_margin: formData.profit_margin,
          photos: formData.photos
        })

        if (response.success) {
          toast.success('SKU成品制作成功！')
        } else {
          toast.error(response.message || '制作失败')
          return
        }
      } else {
         // 制作数量大于1，使用批量创建逻辑
         for (let i = 0; i < formData.production_quantity; i++) {
          // 计算每个成品的原材料使用量（单个SKU用量 × 制作数量）
          const materials: MaterialUsageRequest[] = formData.selected_materials.map(item => ({
            purchase_id: item.material.purchase_id,
            quantity_used_beads: item.quantity_used_beads,
            quantity_used_pieces: item.quantity_used_pieces
          }))

          // 为每个成品创建请求
          const response = await finished_product_api.create({
            material_name: formData.material_name + (formData.production_quantity > 1 ? ` #${i + 1}` : ''),
            description: formData.description,
            specification: formData.specification,
            materials,
            labor_cost: formData.labor_cost,
            craft_cost: formData.craft_cost,
            selling_price: formData.selling_price,
            profit_margin: formData.profit_margin,
            photos: formData.photos
          })

          if (!response.success) {
            toast.error(`第${i + 1}个SKU成品制作失败: ${response.message}`)
            return
          }
        }
        
        toast.success(`批量制作成功！共制作了 ${formData.production_quantity} 个成品`)
      }

      // 重置表单
      set_form_data({
        mode: 'DIRECT_TRANSFORM',
        material_name: '',
        description: '',
        specification: '',
        selected_materials: [],
        labor_cost: 0,
        craft_cost: 0,
        selling_price: 0,
        profit_margin: 30,
        photos: [],
        production_quantity: 1
      })
      set_current_step('mode')
      set_cost_calculation(null)
    } catch (error: any) {
      console.error('提交失败:', error)
      toast.error('提交失败，请重试')
    } finally {
      set_loading(false)
    }
  }

  // 当选择的原材料或成本发生变化时，重新计算成本
  useEffect(() => {
    calculate_cost()
  }, [formData.selected_materials, formData.labor_cost, formData.craft_cost, formData.profit_margin, formData.production_quantity, formData.selling_price])

  // 当进入原材料选择步骤时，获取可用原材料
  useEffect(() => {
    if (current_step === 'materials') {
      fetchAvailableMaterials()
    }
  }, [current_step, material_search, formData.mode])

  // 渲染制作模式选择
  const renderModeSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">选择制作模式</h2>
        <p className="text-gray-600">请选择适合的SKU成品制作方式</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 直接转化模式 */}
        <div 
          className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
            production_mode === 'DIRECT_TRANSFORM' 
              ? 'border-crystal-500 bg-crystal-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => {
            set_production_mode('DIRECT_TRANSFORM')
            set_form_data(prev => ({ ...prev, mode: 'DIRECT_TRANSFORM' }))
          }}
        >
          <div className="text-center">
            <Gem className="h-12 w-12 text-crystal-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">直接转化模式</h3>
            <p className="text-gray-600 text-sm">
              选择库存中的一个原材料成品，直接转化为销售成品
            </p>
          </div>
        </div>
        
        {/* 组合制作模式 */}
        <div 
          className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
            production_mode === 'COMBINATION_CRAFT' 
              ? 'border-crystal-500 bg-crystal-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => {
            set_production_mode('COMBINATION_CRAFT')
            set_form_data(prev => ({ ...prev, mode: 'COMBINATION_CRAFT' }))
          }}
        >
          <div className="text-center">
            <Plus className="h-12 w-12 text-crystal-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">组合制作模式</h3>
            <p className="text-gray-600 text-sm">
              选择多种原材料（珠子、配饰等），组合制作成全新的销售成品
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={() => set_current_step('materials')}
          className="px-6 py-3 bg-crystal-600 text-white rounded-lg hover:bg-crystal-700 transition-colors"
        >
          下一步：选择原材料
        </button>
      </div>
    </div>
  )

  // 渲染原材料选择
  const renderMaterialSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">选择原材料</h2>
        <p className="text-gray-600">模式：{production_mode === 'DIRECT_TRANSFORM' ? '直接转化' : '组合制作'}</p>
      </div>
      

      
      {/* 已选择的原材料 */}
      {(formData.mode === 'DIRECT_TRANSFORM' ? batch_form_data.selected_materials.length > 0 : formData.selected_materials.length > 0) && (
        <div className="bg-crystal-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">已选择的原材料</h3>
          <div className="space-y-3">
            {formData.mode === 'DIRECT_TRANSFORM' ? (
              // 直接转化模式：显示批量选择的原材料
              batch_form_data.selected_materials.map((material) => (
                <div key={material.purchase_id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{material.material_name}</div>
                    <div className="text-sm text-gray-600">
                      {material.material_type} · {material.quality}级 · 可用: {material.available_quantity}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">数量:</label>
                      <input
                        type="number"
                        min="1"
                        max={material.available_quantity}
                        value={material.selected_quantity}
                        onChange={(e) => updateBatchMaterialQuantity(
                          material.purchase_id, 
                          parseInt(e.target.value) || 1
                        )}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                    </div>
                    <button
                      onClick={() => removeMaterial(material.purchase_id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              // 组合制作模式：原有逻辑
              formData.selected_materials.map((item) => (
                <div key={item.material.purchase_id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.material.material_name}</div>
                    <div className="text-sm text-gray-600">
                      {item.material.material_type} · {item.material.quality}级 · 可用: {item.material.available_quantity}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* 珠子数量输入 */}
                    {(item.material.material_type === 'LOOSE_BEADS' || item.material.material_type === 'BRACELET') && (
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">颗数:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.material.available_quantity}
                          value={get_input_value(item.material.purchase_id, 'quantity_used_beads', item.quantity_used_beads)}
                          onChange={(e) => {
                            const value = e.target.value
                            updateInputValue(item.material.purchase_id, 'quantity_used_beads', value)
                            if (value === '') {
                              updateMaterialQuantity(item.material.purchase_id, 'quantity_used_beads', 0)
                            } else {
                              updateMaterialQuantity(item.material.purchase_id, 'quantity_used_beads', parseInt(value) || 0)
                            }
                          }}
                          onBlur={() => {
                            // 失焦时清理显示值状态，让实际值接管
                            const key = `${item.material.purchase_id}_quantity_used_beads`
                            set_input_values((prev: any) => {
                              const newValues = { ...prev }
                              delete newValues[key]
                              return newValues
                            })
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                      </div>
                    )}
                    
                    {/* 片/件数量输入 */}
                    {(item.material.material_type === 'ACCESSORIES' || item.material.material_type === 'FINISHED') && (
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">数量:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.material.available_quantity}
                          value={get_input_value(item.material.purchase_id, 'quantity_used_pieces', item.quantity_used_pieces)}
                          onChange={(e) => {
                            const value = e.target.value
                            updateInputValue(item.material.purchase_id, 'quantity_used_pieces', value)
                            if (value === '') {
                              updateMaterialQuantity(item.material.purchase_id, 'quantity_used_pieces', 0)
                            } else {
                              updateMaterialQuantity(item.material.purchase_id, 'quantity_used_pieces', parseInt(value) || 0)
                            }
                          }}
                          onBlur={() => {
                            // 失焦时清理显示值状态，让实际值接管
                            const key = `${item.material.purchase_id}_quantity_used_pieces`
                            set_input_values((prev: any) => {
                              const newValues = { ...prev }
                              delete newValues[key]
                              return newValues
                            })
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                      </div>
                    )}
                  
                    <button
                      onClick={() => removeMaterial(item.material.purchase_id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* 可用原材料网格 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">可用原材料</h3>
            {/* 搜索框 */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索原材料..."
                value={material_search}
                onChange={(e) => set_material_search(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          
          {/* 组合制作模式的分类标签页 */}
          {formData.mode === 'COMBINATION_CRAFT' && (
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => set_active_tab('LOOSE_BEADS')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  active_tab === 'LOOSE_BEADS'
                    ? 'bg-white text-crystal-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                散珠
              </button>
              <button
                onClick={() => set_active_tab('BRACELET')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  active_tab === 'BRACELET'
                    ? 'bg-white text-crystal-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                手串
              </button>
              <button
                onClick={() => set_active_tab('ACCESSORIES')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  active_tab === 'ACCESSORIES'
                    ? 'bg-white text-crystal-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                配饰
              </button>
            </div>
          )}
        </div>
        <div className="p-4">
          {materials_loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : get_filtered_materials().length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {formData.mode === 'COMBINATION_CRAFT' 
                  ? `暂无可用的${active_tab === 'LOOSE_BEADS' ? '散珠' : active_tab === 'BRACELET' ? '手串' : '配饰'}原材料`
                  : '暂无可用原材料'
                }
              </h3>
              <p className="text-gray-500">请尝试调整搜索条件或检查库存状态</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
              {get_filtered_materials().map((material) => {
                const get_quality_color = (quality: string) => {
                  switch (quality) {
                    case 'A': return 'bg-green-100 text-green-800'
                    case 'B': return 'bg-blue-100 text-blue-800'
                    case 'C': return 'bg-yellow-100 text-yellow-800'
                    case 'D': return 'bg-red-100 text-red-800'
                    default: return 'bg-gray-100 text-gray-800'
                  }
                }
                
                const is_low_stock = material.available_quantity < 5
                
                return (
                  <div 
                    key={material.purchase_id} 
                    className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 bg-white rounded-lg shadow-sm border border-gray-200 ${
                      is_low_stock ? 'ring-2 ring-red-200' : ''
                    }`}
                  >
                    {/* 产品图片 */}
                    <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100">
                      {(() => {
                        const photoUrl = get_first_photo_url(material.photos)
                        return photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={material.material_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            onError={(e) => {
                              console.error('图片加载失败:', e.currentTarget.src)
                              // 尝试重新加载一次
                              const img = e.currentTarget
                              if (!img.dataset.retried) {
                                img.dataset.retried = 'true'
                                setTimeout(() => {
                                  img.src = img.src + '?retry=' + Date.now()
                                }, 1000)
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )
                      })()}
                      
                      {/* 低库存标识 */}
                      {is_low_stock && (
                        <div className="absolute top-2 left-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            库存不足
                          </span>
                        </div>
                      )}
                      
                      {/* 品相标识 */}
                      {material.quality && (
                        <div className="absolute top-2 right-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${get_quality_color(material.quality)}`}>
                            {material.quality}级
                          </span>
                        </div>
                      )}
                      
                      {/* 悬浮查看详情按钮 */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                        <button
                          onClick={() => set_selected_material_detail(material)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-2 bg-crystal-600 text-white rounded-lg shadow-md hover:bg-crystal-700 flex items-center space-x-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-sm">查看详情</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* 产品信息 */}
                    <div className="p-4">
                      {/* 产品名称 */}
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm leading-tight">
                        {material.material_name}
                      </h3>
                      
                      {/* 规格信息 */}
                      <div className="flex items-center text-xs text-gray-600 mb-1">
                        <Ruler className="h-3 w-3 mr-1" />
                        <span>
                          {material.bead_diameter ? `${material.bead_diameter}mm` : 
                           material.specification ? material.specification : '无规格'}
                        </span>
                      </div>
                      
                      {/* 库存数量 */}
                      <div className="flex items-center text-xs text-gray-600 mb-2">
                        <Package className="h-3 w-3 mr-1" />
                        <span>库存: {material.available_quantity}{material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET' ? '颗' : material.material_type === 'ACCESSORIES' ? '片' : '件'}</span>
                      </div>
                      
                      {/* 底部按钮 - 添加到清单 */}
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => addMaterial(material)}
                          className="w-full flex items-center justify-center bg-crystal-50 hover:bg-crystal-100 text-crystal-700 rounded-md py-1 px-2 transition-colors"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          <span className="text-xs font-medium">添加到清单</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => set_current_step('mode')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          上一步
        </button>
        <button
          onClick={() => {
            if (formData.mode === 'DIRECT_TRANSFORM') {
              set_current_step('batch_details')
            } else {
              set_current_step('info')
            }
          }}
          disabled={formData.mode === 'DIRECT_TRANSFORM' ? batch_form_data.selected_materials.length === 0 : formData.selected_materials.length === 0}
          className="px-6 py-3 bg-crystal-600 text-white rounded-lg hover:bg-crystal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          下一步：{formData.mode === 'DIRECT_TRANSFORM' ? '批量填写信息' : '填写信息'}
        </button>
      </div>
    </div>
  )

  // 渲染成品信息填写
  const renderProductInfo = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">填写成品信息</h2>
        <button
          onClick={() => set_current_step('materials')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>返回</span>
        </button>
      </div>
      
      {/* 已选原材料展示区域 */}
      {formData.mode === 'COMBINATION_CRAFT' && formData.selected_materials.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">已选原材料</h3>
            <span className="text-sm text-gray-500">
              共 {formData.selected_materials.length} 种原材料
            </span>
          </div>
          
          <div className="space-y-3">
            {formData.selected_materials.map((item) => {
              const material = item.material
              const get_quality_color = (quality: string) => {
                switch (quality) {
                  case 'AA': return 'bg-purple-100 text-purple-800'
                  case 'A': return 'bg-green-100 text-green-800'
                  case 'AB': return 'bg-blue-100 text-blue-800'
                  case 'B': return 'bg-yellow-100 text-yellow-800'
                  case 'C': return 'bg-red-100 text-red-800'
                  default: return 'bg-gray-100 text-gray-800'
                }
              }
              
              return (
                <div key={material.purchase_id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  {/* 原材料图片 */}
                  <div className="flex-shrink-0">
                    {(() => {
                      const photoUrl = get_first_photo_url(material.photos)
                      return photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={material.material_name}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )
                    })()} 
                  </div>
                  
                  {/* 原材料信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {material.material_name}
                      </h4>
                      {material.quality && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${get_quality_color(material.quality)}`}>
                          {material.quality}级
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        规格: {material.bead_diameter ? `${material.bead_diameter}mm` : 
                               material.specification ? material.specification : '无规格'}
                      </span>
                      <span>
                        库存: {material.available_quantity}
                        {material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET' ? '颗' : material.material_type === 'ACCESSORIES' ? '片' : '件'}
                      </span>
                    </div>
                    
                    {/* 成本信息（仅BOSS可见） */}
                    {user?.role === 'BOSS' && material.unitCost && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-700 font-medium">成本信息:</span>
                          <div className="flex items-center space-x-3">
                            <span className="text-blue-600">
                              单价: ¥{(material.unitCost || 0).toFixed(2)}
                            </span>
                            <span className="text-blue-800 font-medium">
                              小计: ¥{(
                                (material.unitCost || 0) * 
                                ((material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET') 
                                  ? item.quantity_used_beads 
                                  : item.quantity_used_pieces)
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 使用数量控制 */}
                  <div className="flex items-center space-x-3">
                    {/* 颗数输入 */}
                    {(material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET') && (
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600 whitespace-nowrap">使用颗数:</label>
                        <input
                          type="number"
                          min="0"
                          max={material.available_quantity}
                          value={get_input_value(material.purchase_id, 'quantity_used_beads', item.quantity_used_beads)}
                          onChange={(e) => {
                            const value = e.target.value
                            updateInputValue(material.purchase_id, 'quantity_used_beads', value)
                            if (value === '') {
                              updateMaterialQuantity(material.purchase_id, 'quantity_used_beads', 0)
                            } else {
                              updateMaterialQuantity(material.purchase_id, 'quantity_used_beads', parseInt(value) || 0)
                            }
                          }}
                          onBlur={() => {
                            // 失焦时清理显示值状态，让实际值接管
                            const key = `${material.purchase_id}_quantity_used_beads`
                            set_input_values(prev => {
                              const newValues = { ...prev }
                              delete newValues[key]
                              return newValues
                            })
                          }}
                          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-crystal-500"
                        />
                        <span className="text-xs text-gray-500">颗</span>
                      </div>
                    )}
                    
                    {/* 片/件数输入 */}
                    {(material.material_type === 'ACCESSORIES' || material.material_type === 'FINISHED') && (
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600 whitespace-nowrap">使用数量:</label>
                        <input
                          type="number"
                          min="0"
                          max={material.available_quantity}
                          value={get_input_value(material.purchase_id, 'quantity_used_pieces', item.quantity_used_pieces)}
                          onChange={(e) => {
                            const value = e.target.value
                            updateInputValue(material.purchase_id, 'quantity_used_pieces', value)
                            if (value === '') {
                              updateMaterialQuantity(material.purchase_id, 'quantity_used_pieces', 0)
                            } else {
                              updateMaterialQuantity(material.purchase_id, 'quantity_used_pieces', parseInt(value) || 0)
                            }
                          }}
                          onBlur={() => {
                            // 失焦时清理显示值状态，让实际值接管
                            const key = `${material.purchase_id}_quantity_used_pieces`
                            set_input_values(prev => {
                              const newValues = { ...prev }
                              delete newValues[key]
                              return newValues
                            })
                          }}
                          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-crystal-500"
                        />
                        <span className="text-xs text-gray-500">{material.material_type === 'ACCESSORIES' ? '片' : '件'}</span>
                      </div>
                    )}
                    
                    {/* 移除按钮 */}
                    <button
                      onClick={() => removeMaterial(material.purchase_id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="移除此原材料"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* 原材料成本汇总（仅BOSS可见） */}
          {user?.role === 'BOSS' && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-3">原材料成本汇总</h4>
              <div className="space-y-2">
                {formData.selected_materials.map((item: any) => {
                  const material = item.material
                  const used_quantity = (material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET')
                    ? item.quantity_used_beads || 0
                    : item.quantity_used_pieces || 0
                  const itemCost = (material.unitCost || 0) * used_quantity
                  
                  return (
                    <div key={material.purchase_id} className="flex justify-between text-xs">
                      <span className="text-gray-700 truncate max-w-xs">
                        {material.material_name} × {used_quantity}
                        {material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET' ? '颗' : material.material_type === 'ACCESSORIES' ? '片' : '件'}
                      </span>
                      <span className="text-blue-700 font-medium">¥{itemCost.toFixed(2)}</span>
                    </div>
                  )
                })}
                <div className="border-t border-blue-300 pt-2 mt-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-blue-900">原材料总成本:</span>
                    <span className="text-blue-900">
                      ¥{(() => {
                        // 优先使用后端返回的成本计算结果（单个成品的材料成本）
                        const singleMaterialCost = cost_calculation?.materialCost ? 
                          (cost_calculation.materialCost / formData.production_quantity) :
                          formData.selected_materials.reduce((total: number, item: any) => {
                            const material = item.material
                            const used_quantity = (material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET')
                               ? item.quantity_used_beads || 0
                               : item.quantity_used_pieces || 0
                             return total + ((material.unitCost || 0) * used_quantity)
                          }, 0)
                        return singleMaterialCost.toFixed(2)
                      })()}
                    </span>
                  </div>
                  {formData.production_quantity > 1 && (
                    <div className="flex justify-between text-xs text-blue-700 mt-1">
                      <span>制作 {formData.production_quantity} 个总成本:</span>
                      <span className="font-medium">
                        ¥{(() => {
                          // 优先使用后端返回的成本计算结果
                          const totalMaterialCost = cost_calculation?.cost_breakdown?.materialCost ||
                            (formData.selected_materials.reduce((total: number, item: any) => {
                              const material = item.material
                              const used_quantity = (material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET')
                                 ? item.quantity_used_beads || 0
                                 : item.quantity_used_pieces || 0
                               return total + ((material.unitCost || 0) * used_quantity)
                            }, 0) * formData.production_quantity)
                          return totalMaterialCost.toFixed(2)
                        })()}
                      </span>
                    </div>
                  )}
                  
                  {/* 完整成本汇总 */}
                  {(formData.labor_cost > 0 || formData.craft_cost > 0 || formData.selling_price > 0) && (
                    <div className="border-t border-blue-300 pt-2 mt-2">
                      {/* 人工成本 */}
                      <div className="flex justify-between text-xs text-blue-700">
                        <span>人工成本:</span>
                        <span>¥{((formData.labor_cost || 0) * formData.production_quantity).toFixed(2)}</span>
                      </div>
                      
                      {/* 工艺成本 */}
                      <div className="flex justify-between text-xs text-blue-700">
                        <span>工艺成本:</span>
                        <span>¥{((formData.craft_cost || 0) * formData.production_quantity).toFixed(2)}</span>
                      </div>
                      
                      {/* 总成本计算 */}
                      {(() => {
                        // 优先使用后端返回的成本计算结果
                        const materialCost = cost_calculation?.materialCost || 
                          formData.selected_materials.reduce((total: number, item: any) => {
                            const material = item.material
                            const used_quantity = (material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET')
                               ? item.quantity_used_beads || 0
                               : item.quantity_used_pieces || 0
                             return total + ((material.unitCost || 0) * used_quantity)
                          }, 0)
                        const labor_cost = cost_calculation?.labor_cost || 
                          ((formData.labor_cost || 0) * formData.production_quantity)
                        const craft_cost = cost_calculation?.craft_cost || 
                          ((formData.craft_cost || 0) * formData.production_quantity)
                        const total_cost = materialCost + labor_cost + craft_cost
                        
                        return (
                          <div className="flex justify-between text-sm font-semibold text-blue-900 border-t border-blue-300 pt-1 mt-1">
                            <span>总成本:</span>
                            <span>¥{total_cost.toFixed(2)}</span>
                          </div>
                        )
                      })()}
                      
                      {/* 销售价格和利润计算 */}
                      {formData.selling_price > 0 && (() => {
                        // 优先使用后端返回的成本计算结果
                        const materialCost = cost_calculation?.materialCost || 
                          formData.selected_materials.reduce((total: number, item: any) => {
                            const material = item.material
                            const used_quantity = (material.material_type === 'LOOSE_BEADS' || material.material_type === 'BRACELET') 
                              ? item.quantity_used_beads 
                              : item.quantity_used_pieces
                            return total + ((material.unitCost || 0) * used_quantity)
                          }, 0)
                        const labor_cost = cost_calculation?.labor_cost || 
                          ((formData.labor_cost || 0) * formData.production_quantity)
                        const craft_cost = cost_calculation?.craft_cost || 
                          ((formData.craft_cost || 0) * formData.production_quantity)
                        const total_cost = materialCost + labor_cost + craft_cost
                        const totalSellingPrice = formData.selling_price * formData.production_quantity
                        const profit = totalSellingPrice - total_cost
                        const profit_margin = totalSellingPrice > 0 ? (profit / totalSellingPrice) * 100 : 0
                        
                        return (
                          <>
                            <div className="flex justify-between text-xs text-blue-700 mt-1">
                              <span>销售价格:</span>
                              <span>¥{(formData.selling_price * formData.production_quantity).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                              <span className="text-blue-700">预期利润:</span>
                              <span className={profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                ¥{profit.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                              <span className="text-blue-700">利润率:</span>
                              <span className={`font-medium ${
                                profit_margin >= 30 ? 'text-green-600' : 
                                profit_margin >= 10 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {profit_margin.toFixed(1)}%
                              </span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* 继续添加原材料按钮 */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={() => set_current_step('materials')}
              className="text-sm text-crystal-600 hover:text-crystal-700 font-medium"
            >
              + 继续添加原材料
            </button>
          </div>
        </div>
      )}
      
      {/* 组合制作模式：左右分布布局 */}
      {formData.mode === 'COMBINATION_CRAFT' ? (
        <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-2 gap-6'}`}>
          {/* 左侧：相机组件 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">成品图片</h3>
            <div className="space-y-4">
                {/* 图片预览 */}
                 {material_photos.length > 0 && (
                   <div className="flex flex-col h-full">
                     <div className="flex items-center justify-between mb-2">
                       <p className="text-sm text-gray-600">成品图片：</p>
                       <button
                         type="button"
                         onClick={() => {
                           console.log('用户手动清除material_photos状态')
                           set_material_photos([])
                           set_file_data_list([])
                           // 更新表单数据
                           set_form_data(prev => ({ ...prev, photos: [] }))
                           toast.success('已清除所有图片')
                         }}
                         className="text-xs text-red-600 hover:text-red-800 transition-colors"
                       >
                         清除所有
                       </button>
                     </div>
                     {/* 单张图片显示 */}
                     <div className="flex justify-center flex-1 min-h-0">
                       <div className="relative group w-full h-full">
                         <img
                           src={fixImageUrl(material_photos[0])}
                           alt="成品图片"
                           className="h-full max-h-96 object-contain rounded-lg border border-gray-200 shadow-sm bg-gray-50 mx-auto"
                           onLoad={() => console.log('图片加载成功')}
                           onError={() => {
                             console.error('图片加载失败:', material_photos[0])
                             toast.error('图片加载失败')
                           }}
                         />
                         <button
                           type="button"
                           onClick={() => removeMaterialImage(0)}
                           className="absolute -top-2 -right-2 w-7 h-7 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-red-200"
                           title="删除图片"
                         >
                           <X className="h-4 w-4" />
                         </button>
                         {/* 上传状态指示器 */}
                         {file_data_list.length > 0 && material_photos.length === 0 && (
                           <div className="absolute bottom-2 left-2 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-lg border border-blue-200 font-medium">
                             准备上传
                           </div>
                         )}
                         {material_photos.length > 0 && (
                           <div className="absolute bottom-2 left-2 bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-lg border border-green-200 font-medium">
                             已上传
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 )}
                 
                 {/* 相机拍照区域 */}
                 {!is_camera_active && material_photos.length === 0 && file_data_list.length === 0 && (
                   <div className={`flex gap-3 ${isMobile ? 'justify-center' : 'justify-center'}`}>
                     <button
                       type="button"
                       onClick={() => startCamera()}
                       disabled={uploading}
                       className="inline-flex items-center space-x-3 px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl border border-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                     >
                       <Camera className="h-5 w-5 text-gray-600" />
                       <span className="font-medium">启动相机</span>
                     </button>
                     {/* 电脑端显示上传按钮，移动端不显示 */}
                     {!isMobile && (
                       <DropzoneUpload
                         onFilesAccepted={handleImageUpload}
                         disabled={uploading}
                       />
                     )}
                   </div>
                 )}
                 
                 {/* 相机组件 */}
                 {is_camera_active && (
                   <div className="relative w-full max-w-2xl mx-auto">
                     <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                       <div className="p-4 bg-gray-50 border-b border-gray-200">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center space-x-2">
                             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                             <span className="text-sm font-medium text-gray-700">相机已启动</span>
                           </div>
                           <button
                             type="button"
                             onClick={stopCamera}
                             className="text-gray-500 hover:text-gray-700 transition-colors"
                           >
                             <X className="h-5 w-5" />
                           </button>
                         </div>
                       </div>
                       <div className="aspect-video bg-black">
                         <CameraPhoto
                           onTakePhoto={(dataUri: string) => {
                             console.log('拍照成功，处理照片')
                             handleCameraPhoto(dataUri)
                           }}
                           onCameraError={(error: Error) => {
                             console.error('相机错误:', error)
                             set_camera_error(`相机错误: ${error.message}`)
                             set_is_camera_active(false)
                           }}
                           idealFacingMode={FACING_MODES.ENVIRONMENT}
                           idealResolution={{ width: 1280, height: 720 }}
                           imageType={IMAGE_TYPES.JPG}
                           imageCompression={0.8}
                           isMaxResolution={false}
                           isImageMirror={false}
                           isSilentMode={false}
                           isDisplayStartCameraError={false}
                           isFullscreen={false}
                           sizeFactor={1}
                           onCameraStart={() => {
                             console.log('相机启动成功')
                             set_camera_error(null)
                           }}
                           onCameraStop={() => {
                             console.log('相机已停止')
                           }}
                         />
                       </div>
                     </div>
                   </div>
                 )}
                 
                 {/* 相机错误提示 */}
                 {!is_camera_active && material_photos.length === 0 && file_data_list.length === 0 && camera_error && (
                   <div className="space-y-3">
                     <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                       <AlertCircle className="h-4 w-4 inline mr-2" />
                       {camera_error}
                     </div>
                   </div>
                 )}
                  
                  {/* 上传进度提示 */}
                  {uploading && (
                    <div className="border-2 border-blue-300 rounded-lg p-6 text-center bg-blue-50">
                      <div className="space-y-3">
                        <Loader2 className="h-8 w-8 text-blue-500 mx-auto animate-spin" />
                        <p className="text-blue-700 font-medium">正在上传图片...</p>
                        <p className="text-sm text-blue-600">请稍候，不要关闭页面</p>
                      </div>
                    </div>
                  )}
               </div>
           </div>
           
           {/* 右侧：表单信息 */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <h3 className="text-lg font-medium text-gray-900 mb-4">成品信息</h3>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">成品名称 *</label>
                 <input
                   type="text"
                   value={formData.material_name}
                   onChange={(e) => set_form_data(prev => ({ ...prev, material_name: e.target.value }))}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                   placeholder="请输入成品名称"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">成品描述</label>
                 <textarea
                   value={formData.description}
                   onChange={(e) => set_form_data(prev => ({ ...prev, description: e.target.value }))}
                   rows={3}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                   placeholder="请输入成品描述"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">珠子平均直径 *</label>
                 <input
                   type="text"
                   value={formData.specification}
                   onChange={(e) => set_form_data(prev => ({ ...prev, specification: e.target.value }))}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                   placeholder="如：8mm"
                 />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">人工成本</label>
                   <input
                     type="number"
                     min="0"
                     step="0.01"
                     value={formData.labor_cost || ''}
                     onChange={(e) => {
                       const value = e.target.value
                       if (value === '' || value === '0') {
                         set_form_data(prev => ({ ...prev, labor_cost: 0 }))
                       } else {
                         const num_value = parseFloat(value)
                         if (!isNaN(num_value)) {
                           set_form_data(prev => ({ ...prev, labor_cost: num_value }))
                         }
                       }
                     }}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">工艺成本</label>
                   <input
                     type="number"
                     min="0"
                     step="0.01"
                     value={formData.craft_cost || ''}
                     onChange={(e) => {
                       const value = e.target.value
                       if (value === '' || value === '0') {
                         set_form_data(prev => ({ ...prev, craft_cost: 0 }))
                       } else {
                         const num_value = parseFloat(value)
                         if (!isNaN(num_value)) {
                           set_form_data(prev => ({ ...prev, craft_cost: num_value }))
                         }
                       }
                     }}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                   />
                 </div>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">销售价格 *</label>
                 <input
                   type="number"
                   min="0"
                   step="0.01"
                   value={formData.selling_price || ''}
                   onChange={(e) => {
                     const value = e.target.value
                     if (value === '' || value === '0') {
                       set_form_data(prev => ({ ...prev, selling_price: 0, profit_margin: 0 }))
                     } else {
                       const num_value = parseFloat(value)
                       if (!isNaN(num_value)) {
                         // 计算利润率
                         const total_cost = cost_calculation?.cost_breakdown?.total_cost || 0
                         const profit_margin = num_value > 0 
                           ? ((num_value - total_cost) / num_value) * 100 
                           : 0
                         
                         set_form_data(prev => ({ 
                           ...prev, 
                           selling_price: num_value,
                           profit_margin: Math.max(0, profit_margin) // 确保利润率不为负数
                         }))
                       }
                     }
                   }}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                 />
               </div>
               
               {/* 制作数量 */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   制作数量 * 
                   <span className="text-sm text-gray-500">
                     (最多可制作 {calculateMaxProductionQuantity()} 个)
                   </span>
                 </label>
                 <input
                   type="number"
                   min="1"
                   max={calculateMaxProductionQuantity()}
                   value={formData.production_quantity}
                   onChange={(e) => updateProductionQuantity(parseInt(e.target.value) || 1)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                   placeholder="请输入制作数量"
                 />
                 <p className="text-xs text-gray-500 mt-1">
                   制作数量基于当前选择的原材料库存计算，每个成品将使用相同的原材料配比
                 </p>
               </div>
             </div>
           </div>
         </div>
       ) : (
         /* 非组合制作模式：保持原有grid布局 */
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* 基本信息 */}
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">成品名称 *</label>
               <input
                 type="text"
                 value={formData.material_name}
                 onChange={(e) => set_form_data(prev => ({ ...prev, material_name: e.target.value }))}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                 placeholder="请输入成品名称"
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">成品描述</label>
               <textarea
                 value={formData.description}
                 onChange={(e) => set_form_data(prev => ({ ...prev, description: e.target.value }))}
                 rows={3}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                 placeholder="请输入成品描述"
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">珠子平均直径 *</label>
               <input
                 type="text"
                 value={formData.specification}
                 onChange={(e) => set_form_data(prev => ({ ...prev, specification: e.target.value }))}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                 placeholder="如：8mm"
               />
             </div>
           </div>
           
           {/* 成本和价格 */}
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">人工成本</label>
                 <input
                   type="number"
                   min="0"
                   step="0.01"
                   value={formData.labor_cost || ''}
                   onChange={(e) => {
                     const value = e.target.value
                     if (value === '' || value === '0') {
                       set_form_data(prev => ({ ...prev, labor_cost: 0 }))
                     } else {
                       const num_value = parseFloat(value)
                       if (!isNaN(num_value)) {
                         set_form_data(prev => ({ ...prev, labor_cost: num_value }))
                       }
                     }
                   }}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">工艺成本</label>
                 <input
                   type="number"
                   min="0"
                   step="0.01"
                   value={formData.craft_cost || ''}
                   onChange={(e) => {
                     const value = e.target.value
                     if (value === '' || value === '0') {
                       set_form_data(prev => ({ ...prev, craft_cost: 0 }))
                     } else {
                       const num_value = parseFloat(value)
                       if (!isNaN(num_value)) {
                         set_form_data(prev => ({ ...prev, craft_cost: num_value }))
                       }
                     }
                   }}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
                 />
               </div>
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">销售价格 *</label>
               <input
                 type="number"
                 min="0"
                 step="0.01"
                 value={formData.selling_price || ''}
                 onChange={(e) => {
                   const value = e.target.value
                   if (value === '' || value === '0') {
                     set_form_data(prev => ({ ...prev, selling_price: 0, profit_margin: 0 }))
                   } else {
                     const num_value = parseFloat(value)
                     if (!isNaN(num_value)) {
                       set_form_data(prev => ({ 
                         ...prev, 
                         selling_price: num_value
                       }))
                     }
                   }
                 }}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
               />
             </div>
             
             {/* 成本汇总 */}
             {(cost_calculation || formData.labor_cost > 0 || formData.craft_cost > 0 || formData.selling_price > 0) && (
               <div className="bg-gray-50 p-3 rounded-lg">
                 <h5 className="font-medium text-gray-900 mb-2">成本汇总</h5>
                 <div className="space-y-1 text-sm">
                   {/* 原材料成本 - 只有在有cost_calculation时显示 */}
                   {cost_calculation && (
                     <div className="flex justify-between">
                       <span className="text-gray-600">原材料成本：</span>
                       <span>¥{(cost_calculation.materialCost || 0).toFixed(2)}</span>
                     </div>
                   )}
                   
                   {/* 人工成本 - 始终显示 */}
                   <div className="flex justify-between">
                     <span className="text-gray-600">人工成本：</span>
                     <span>¥{(cost_calculation?.labor_cost || formData.labor_cost || 0).toFixed(2)}</span>
                   </div>
                   
                   {/* 工艺成本 - 始终显示 */}
                   <div className="flex justify-between">
                     <span className="text-gray-600">工艺成本：</span>
                     <span>¥{(cost_calculation?.craft_cost || formData.craft_cost || 0).toFixed(2)}</span>
                   </div>
                   
                   {/* 总成本计算 */}
                   {(() => {
                     const materialCost = cost_calculation?.materialCost || 0
                     const labor_cost = cost_calculation?.labor_cost || formData.labor_cost || 0
                     const craft_cost = cost_calculation?.craft_cost || formData.craft_cost || 0
                     const total_cost = materialCost + labor_cost + craft_cost
                     
                     return (
                       <div className="flex justify-between font-medium border-t border-gray-200 pt-1">
                         <span>总成本：</span>
                         <span>¥{total_cost.toFixed(2)}</span>
                       </div>
                     )
                   })()}
                   
                   {/* 没有选择原材料时的提示 */}
                   {!cost_calculation && formData.selected_materials.length === 0 && (
                     <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                       💡 提示：选择原材料后将显示完整的成本分析
                     </div>
                   )}
                   
                   {/* 利润计算 - 有销售价格时显示 */}
                   {formData.selling_price > 0 && (() => {
                     const materialCost = cost_calculation?.materialCost || 0
                     const labor_cost = cost_calculation?.labor_cost || formData.labor_cost || 0
                     const craft_cost = cost_calculation?.craft_cost || formData.craft_cost || 0
                     const total_cost = materialCost + labor_cost + craft_cost
                     const profit = formData.selling_price - total_cost
                     const profit_margin = (profit / formData.selling_price) * 100
                     
                     return (
                       <>
                         <div className="flex justify-between font-medium">
                           <span>预期利润：</span>
                           <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                             ¥{profit.toFixed(2)}
                           </span>
                         </div>
                         <div className="flex justify-between font-medium">
                           <span>利润率：</span>
                           <span className={`${
                             profit_margin >= 30 ? 'text-green-600' : 
                             profit_margin >= 10 ? 'text-yellow-600' : 'text-red-600'
                           }`}>
                             {profit_margin.toFixed(1)}%
                           </span>
                         </div>
                       </>
                     )
                   })()}
                 </div>
               </div>
             )}
           </div>
         </div>
       )}
       

      
      <div className="flex justify-between mt-6">
        <button
          onClick={handleSubmit}
          disabled={!formData.material_name.trim() || formData.selling_price <= 0 || loading}
          className="px-6 py-3 bg-crystal-600 text-white rounded-lg hover:bg-crystal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? '提交中...' : '提交制作'}
        </button>
      </div>
    </div>
  )

  // 渲染批量信息填写（直接转化模式）
  const renderBatchDetails = () => {const toggleExpanded = (purchase_id: string) => {
      const newExpanded = new Set(expanded_items)
      if (newExpanded.has(purchase_id)) {
        newExpanded.delete(purchase_id)
      } else {
        newExpanded.add(purchase_id)
      }
      set_expanded_items(newExpanded)
    }

    const calculate_costs = (product: {
      materialCost: number
      labor_cost: number
      craft_cost: number
      selling_price: number
    }) => {
      const materialCost = product.materialCost || 0
      const total_cost = materialCost + product.labor_cost + product.craft_cost
      const profit_margin = product.selling_price > 0 
        ? ((product.selling_price - total_cost) / product.selling_price) * 100 
        : 0
      
      return { total_cost, profit_margin }
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">批量成品信息填写</h2>
            <p className="text-gray-600">为每个选中的原材料成品填写销售成品信息</p>
          </div>

        </div>
        
        <div className="space-y-4">
          {batch_form_data.selected_materials.map((material) => {
            const product = material.productInfo
            const { total_cost, profit_margin } = calculate_costs(product)
            const isExpanded = expanded_items.has(material.purchase_id)
            
            return (
              <div key={material.purchase_id} className="border border-gray-200 rounded-lg">
                {/* 原材料信息头部 */}
                <div 
                  className="p-4 bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => toggleExpanded(material.purchase_id)}
                >
                  <div className="flex items-center space-x-3">
                    <img 
                      src={get_first_photo_url(material.photos) || ''} 
                      alt={material.material_name}
                      className="w-12 h-12 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{material.material_name}</h4>
                      <p className="text-sm text-gray-500">
                        原材料成本: ¥{product.materialCost?.toFixed(2) || '0.00'} × {material.selected_quantity}个
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">销售价格</div>
                      <div className="font-medium text-lg">
                        ¥{product.selling_price?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">利润率</div>
                      <div className={`font-medium ${
                        profit_margin >= 30 ? 'text-green-600' : 
                        profit_margin >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {profit_margin.toFixed(1)}%
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`} />
                  </div>
                </div>
                
                {/* 详细编辑区域 */}
                {isExpanded && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* 基本信息 */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            成品名称 *
                          </label>
                          <input
                            type="text"
                            value={product.material_name}
                            onChange={(e) => updateBatchProduct(material.purchase_id, 'material_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                            placeholder="请输入成品名称"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            成品描述
                          </label>
                          <textarea
                            value={product.description}
                            onChange={(e) => updateBatchProduct(material.purchase_id, 'description', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                            placeholder="请输入成品描述"
                          />
                        </div>
                        

                      </div>
                      
                      {/* 成本和价格 */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              人工成本
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={product.labor_cost || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || value === '0') {
                                  updateBatchProduct(material.purchase_id, 'labor_cost', 0)
                                } else {
                                  const num_value = parseFloat(value)
                                  if (!isNaN(num_value)) {
                                    updateBatchProduct(material.purchase_id, 'labor_cost', num_value)
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              工艺成本
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={product.craft_cost || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || value === '0') {
                                  updateBatchProduct(material.purchase_id, 'craft_cost', 0)
                                } else {
                                  const num_value = parseFloat(value)
                                  if (!isNaN(num_value)) {
                                    updateBatchProduct(material.purchase_id, 'craft_cost', num_value)
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            销售价格 *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={product.selling_price || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              if (value === '' || value === '0') {
                                updateBatchProduct(material.purchase_id, 'selling_price', 0)
                              } else {
                                const num_value = parseFloat(value)
                                if (!isNaN(num_value)) {
                                  updateBatchProduct(material.purchase_id, 'selling_price', num_value)
                                }
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                          />
                        </div>
                        
                        {/* 成本汇总 */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-2">成本汇总</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">原材料成本：</span>
                              <span>¥{product.materialCost?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">人工成本：</span>
                              <span>¥{product.labor_cost?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">工艺成本：</span>
                              <span>¥{product.craft_cost?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between font-medium border-t border-gray-200 pt-1">
                              <span>总成本：</span>
                              <span>¥{total_cost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>预期利润：</span>
                              <span className={profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                                ¥{(product.selling_price - total_cost).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {/* 提交按钮 */}
        <div className="flex justify-between">

          
          <button
            onClick={handleBatchSubmit}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-crystal-600 text-white rounded-lg hover:bg-crystal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? '创建中...' : `批量创建成品 (${batch_form_data.selected_materials.reduce((total, material) => total + material.selected_quantity, 0)}个)`}</span>
          </button>
        </div>
      </div>
    )
  }



  // 获取品相颜色样式
  const get_quality_color = (quality: string) => {
    switch (quality) {
      case 'AA': return 'bg-purple-100 text-purple-800'
      case 'A': return 'bg-green-100 text-green-800'
      case 'AB': return 'bg-blue-100 text-blue-800'
      case 'B': return 'bg-yellow-100 text-yellow-800'
      case 'C': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 格式化品相显示
  const format_quality = (quality: string) => {
    return quality === '未知' ? quality : quality + '级'
  }

  // 处理图片加载错误
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.style.display = 'none'
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Gem className="h-8 w-8 text-crystal-500" />
          <h1 className="text-2xl font-bold text-gray-900">SKU成品制作</h1>
        </div>
      
      {/* 步骤指示器 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          {(() => {
            const steps = formData.mode === 'DIRECT_TRANSFORM' 
              ? [
                  { key: 'mode', label: '选择模式' },
                  { key: 'materials', label: '选择原材料' },
                  { key: 'batch_details', label: '批量填写信息' }
                ]
              : [
                  { key: 'mode', label: '选择模式' },
                  { key: 'materials', label: '选择原材料' },
                  { key: 'info', label: '填写信息' }
                ]
            
            const handleStepClick = (stepKey: string, stepIndex: number) => {
              const currentIndex = steps.findIndex(s => s.key === current_step)
              // 只允许点击当前步骤或之前的步骤
              if (stepIndex <= currentIndex) {
                set_current_step(stepKey as any)
              }
            }
            
            return steps.map((step, index) => {
              const currentIndex = steps.findIndex(s => s.key === current_step)
              const isClickable = index <= currentIndex
              const is_active = current_step === step.key
              const isCompleted = index < currentIndex
              
              return (
                <div key={step.key} className="flex items-center">
                  <button
                    onClick={() => handleStepClick(step.key, index)}
                    disabled={!isClickable}
                    className={`flex items-center transition-all duration-200 ${
                      isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      is_active
                        ? 'bg-crystal-600 text-white' 
                        : isCompleted
                          ? 'bg-crystal-100 text-crystal-600'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className={`ml-2 text-sm font-medium transition-colors ${
                      is_active ? 'text-crystal-600' : isCompleted ? 'text-crystal-500' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 transition-colors ${
                      isCompleted
                        ? 'bg-crystal-200'
                        : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })
          })()}
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        {current_step === 'mode' && renderModeSelection()}
        {current_step === 'materials' && renderMaterialSelection()}
        {current_step === 'info' && renderProductInfo()}
        {current_step === 'batch_details' && renderBatchDetails()}

      </div>
    </div>

    {/* 原材料详情模态框 */}
    {selected_material_detail && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selected_material_detail.material_name}
              </h3>
              <button
                onClick={() => set_selected_material_detail(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">库存数量</div>
                  <div className="text-xl font-bold text-gray-900">{selected_material_detail.available_quantity} {selected_material_detail.material_type === 'LOOSE_BEADS' || selected_material_detail.material_type === 'BRACELET' ? '颗' : selected_material_detail.material_type === 'ACCESSORIES' ? '片' : '件'}</div>
                </div>
                {user?.role === 'BOSS' && selected_material_detail.unitCost && (
                  <div>
                    <div className="text-sm text-gray-500">单价</div>
                    <div className="text-xl font-bold text-gray-900">¥{selected_material_detail.unitCost.toFixed(2)}</div>
                  </div>
                )}
              </div>
              
              <div>
                <div className="text-sm text-gray-500 mb-2">规格信息</div>
                <div className="flex items-center space-x-2">
                  <Ruler className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {selected_material_detail.bead_diameter ? `${selected_material_detail.bead_diameter}mm` : 
                     selected_material_detail.specification ? selected_material_detail.specification : '无规格'}
                  </span>
                </div>
              </div>
              
              {selected_material_detail.quality && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">品相等级</div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${get_quality_color(selected_material_detail.quality)}`}>
                    {format_quality(selected_material_detail.quality)}
                  </span>
                </div>
              )}
              
              <div>
                <div className="text-sm text-gray-500 mb-2">产品信息</div>
                <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium text-gray-700">产品类型:</span>
                      <span className="ml-1">
                        {selected_material_detail.material_type === 'LOOSE_BEADS' ? '散珠' :
                       selected_material_detail.material_type === 'BRACELET' ? '手串' :
                       selected_material_detail.material_type === 'ACCESSORIES' ? '配件' : '成品'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">供应商:</span>
                      <span className="ml-1">{selected_material_detail.supplier_name || '未知'}</span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-700">采购ID:</span>
                        <span className="ml-1">{selected_material_detail.purchase_code || format_purchase_code(selected_material_detail.purchase_id)}</span>
                     </div>
                     {user?.role === 'BOSS' && selected_material_detail.unitCost && (
                       <div>
                         <span className="font-medium text-gray-700">单位成本:</span>
                         <span className="ml-1">¥{selected_material_detail.unitCost.toFixed(2)}</span>
                       </div>
                     )}
                  </div>
                </div>
              </div>
              
              {selected_material_detail.photos && selected_material_detail.photos.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">产品图片</div>
                  <div className="grid grid-cols-2 gap-3">
                    {selected_material_detail.photos.slice(0, 4).map((photo, index) => (
                      <img
                        key={index}
                        src={fixImageUrl(photo)}
                        alt={`${selected_material_detail.material_name} ${index + 1}`}
                        className="w-full max-w-full h-auto object-contain rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onError={handleImageError}
                        onClick={() => window.open(fixImageUrl(photo), '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* 添加到清单按钮 */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    addMaterial(selected_material_detail)
                    set_selected_material_detail(null)
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-crystal-600 text-white rounded-lg hover:bg-crystal-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>添加到清单</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
