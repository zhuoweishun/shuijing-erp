import React, { useState, useEffect, ErrorInfo, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { 
  ShoppingCart, 
  Upload, 
  Camera, 
  Sparkles, 
  X, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'
import CameraPhoto, { FACING_MODES, IMAGE_TYPES } from 'react-html5-camera-photo'
import 'react-html5-camera-photo/build/css/index.css'
import { useDropzone } from 'react-dropzone'
import { purchaseApi, uploadApi, aiApi, supplierApi, getApiUrl } from '../services/api'
import { useDeviceDetection } from '../hooks/useDeviceDetection'
import { useAuth } from '../hooks/useAuth'
import { handleApiError } from '../services/errorHandler'
import ProductTypeTab, { ProductType, UnitType } from '../components/ProductTypeTab'
import { 
  MobileInput, 
  MobileSelect, 
  MobileButton, 
  MobileFormGroup, 
  MobileFormRow 
} from '../components/MobileForm'
import { TotalPriceInput } from '../components/TotalPriceInput'

// React错误边界组件
class CameraErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CameraErrorBoundary捕获到错误:', error, errorInfo)
    this.props.onError(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-600">
          <div className="text-center space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
            <p className="text-sm">相机组件发生错误</p>
            <p className="text-xs text-gray-500">{this.state.error?.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null })
              }}
              className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重试
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 表单数据类型
interface PurchaseFormData {
  product_name: string
  product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
  unit_type: 'PIECES' | 'STRINGS' | 'SLICES' | 'ITEMS'
  bead_diameter?: number // 散珠和手串必填，其他可选
  specification?: number // 通用规格字段
  quantity?: number // 手串数量
  piece_count?: number // 散珠颗数/饰品片数/成品件数
  min_stock_alert?: number
  price_per_gram?: number
  total_price?: number
  weight?: number
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
  supplier_name?: string
  notes?: string
  natural_language_input?: string
}

export default function PurchaseEntry() {
  // const navigate = useNavigate() // 暂时注释掉未使用的变量
  
  // 设备检测
  const { isMobile } = useDeviceDetection()
  
  // 用户认证信息
  const { user, isBoss } = useAuth()
  
  // 表单状态
  const { register, handleSubmit, setValue, watch, reset, formState, formState: { errors } } = useForm<PurchaseFormData>({
    defaultValues: {
      product_name: '',
      product_type: 'BRACELET',
      unit_type: 'STRINGS'
    },
    mode: 'onChange'
  })
  
  // 产品类型状态 - 必须在使用前声明
  const [selectedProductType, setSelectedProductType] = useState<ProductType>('BRACELET')
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType>('STRINGS')
  
  // 监听价格相关字段变化
  const price_per_gram = watch('price_per_gram')
  const total_price = watch('total_price')
  const weight = watch('weight')
  const bead_diameter = watch('bead_diameter')
  const quantity = watch('quantity')
  const piece_count = watch('piece_count')
  

  
  // 计算每串珠子数量（仅用于手串）
  const beadsPerString = bead_diameter ? Math.floor(160 / bead_diameter) : 0
  
  // 计算总颗数（仅用于手串）
  const totalBeads = selectedProductType === 'BRACELET' && quantity && beadsPerString ? quantity * beadsPerString : 0
  
  // 根据产品类型计算单价
  const unit_price = useMemo(() => {
    if (!total_price) return 0
    
    switch (selectedProductType) {
      case 'LOOSE_BEADS':
        return piece_count ? total_price / piece_count : 0 // 每颗价格
      case 'BRACELET':
        return quantity ? total_price / quantity : 0 // 每条价格
      case 'ACCESSORIES':
        return piece_count ? total_price / piece_count : 0 // 每片价格
      case 'FINISHED':
        return piece_count ? total_price / piece_count : 0 // 每件价格
      default:
        return 0
    }
  }, [total_price, selectedProductType, quantity, piece_count])
  
  // 计算每颗珠子价格（仅用于散珠和手串）
  const pricePerBead = useMemo(() => {
    if (!total_price) return 0
    
    if (selectedProductType === 'LOOSE_BEADS' && piece_count) {
      return total_price / piece_count
    } else if (selectedProductType === 'BRACELET' && totalBeads) {
      return total_price / totalBeads
    }
    return 0
  }, [total_price, selectedProductType, piece_count, totalBeads])
  
  // 持久化key
  const PHOTOS_STORAGE_KEY = 'purchase_entry_photos'
  
  // 相机相关状态
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [force_enable_camera, setForceEnableCamera] = useState(false)
  
  // 简化的文件数据接口 - 基于Base64存储
  interface FileData {
    base64: string // Base64编码的文件数据
    name: string
    size: number
    type: string
    uploaded_url?: string
  }

  // Dropzone上传组件
  interface DropzoneUploadProps {
    onFilesAccepted: (files: FileList) => void
    disabled?: boolean
  }

  const DropzoneUpload: React.FC<DropzoneUploadProps> = ({ onFilesAccepted, disabled }) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        // 将File[]转换为FileList
        const fileList = {
          length: acceptedFiles.length,
          item: (index: number) => acceptedFiles[index] || null,
          [Symbol.iterator]: function* () {
            for (let i = 0; i < acceptedFiles.length; i++) {
              yield acceptedFiles[i]
            }
          }
        } as FileList
        
        // 添加数组索引访问
        acceptedFiles.forEach((file, index) => {
          (fileList as any)[index] = file
        })
        
        onFilesAccepted(fileList)
      }
    }, [onFilesAccepted])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'image/webp': ['.webp']
      },
      multiple: false,
      disabled,
      noClick: false,
      noKeyboard: false
    })

    return (
      <div
        {...getRootProps()}
        className={`inline-flex items-center space-x-3 px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl border border-gray-200 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
          isDragActive ? 'bg-gray-100 border-gray-300' : ''
        } ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{
          pointerEvents: disabled ? 'none' : 'auto'
        }}
      >
        <input {...getInputProps()} />
        <Upload className="h-5 w-5 text-gray-600" />
        <span className="font-medium">
          {isDragActive ? '放下图片文件' : '上传图片'}
        </span>
      </div>
    )
  }

  // 图片相关状态
  const [photos, setPhotos] = useState<string[]>(() => {
    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const isPageRefresh = navigationEntry?.type === 'reload'
      
      if (isPageRefresh) {
        localStorage.removeItem(PHOTOS_STORAGE_KEY)
        console.log('检测到页面刷新，已清除localStorage中的图片数据')
        return []
      } else {
        const saved = localStorage.getItem(PHOTOS_STORAGE_KEY)
        const savedPhotos = saved ? JSON.parse(saved) : []
        console.log('从localStorage恢复photos状态:', savedPhotos)
        return savedPhotos
      }
    } catch (error) {
      console.error('处理photos状态失败:', error)
      return []
    }
  })
  const [fileDataList, setFileDataList] = useState<FileData[]>([])
  
  // 加载状态
  const [uploading, setUploading] = useState(false)
  const [aiParsing, setAiParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  
  // 供应商相关状态
  const [suppliers, setSuppliers] = useState<Array<{id: string, name: string, contact?: string, phone?: string}>>([]) 
  const [supplierInput, setSupplierInput] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [filtered_suppliers, setFilteredSuppliers] = useState<Array<{id: string, name: string, contact?: string, phone?: string}>>([])
  const [creatingSupplier, setCreatingSupplier] = useState(false)
  
  // 处理产品类型变更
  const handleProductTypeChange = (product_type: ProductType, unit_type: UnitType) => {
    setSelectedProductType(product_type)
    setSelectedUnitType(unit_type)
    setValue('product_type', product_type)
    setValue('unit_type', unit_type)
    
    // 清空相关字段，避免数据混乱
    if (product_type === 'LOOSE_BEADS' || product_type === 'BRACELET') {
      setValue('specification', undefined)
      setValue('piece_count', undefined)
    } else {
      setValue('bead_diameter', undefined)
      setValue('quantity', undefined)
    }
  }
  
  // 初始化表单默认值
  useEffect(() => {
    setValue('product_type', selectedProductType)
    setValue('unit_type', selectedUnitType)
  }, [setValue, selectedProductType, selectedUnitType])
  
  // 加载供应商列表
  useEffect(() => {
    loadSuppliers()
  }, [])
  
  // 监听表单supplier_name字段变化，确保与supplierInput状态同步
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'supplier_name') {
        const formValue = value.supplier_name || ''
        if (formValue !== supplierInput) {
          setSupplierInput(formValue)
          console.log('🔍 [状态同步] 表单值变化，同步supplierInput:', {
            form_value: formValue,
            previous_input: supplierInput,
            timestamp: new Date().toISOString()
          })
        }
      }
    })
    
    return () => subscription.unsubscribe()
  }, [watch, supplierInput])
  

  
  // 加载供应商列表
  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true)
      const response = await supplierApi.getAll()
      
      if (response.success && response.data) {
        // 处理不同的数据结构
        let suppliersList: Array<{id: string, name: string, contact?: string, phone?: string}> = []
        
        if ((response.data as any).suppliers && Array.isArray((response.data as any).suppliers)) {
          suppliersList = (response.data as any).suppliers
        } else if (Array.isArray(response.data)) {
          suppliersList = response.data
        } else {
          setSuppliers([])
          setFilteredSuppliers([])
          return
        }
        
        // 简单去重处理
        const uniqueSuppliers = suppliersList.filter((supplier, index, self) => {
          if (!supplier.name?.trim()) return false
          return index === self.findIndex(s => s.name.toLowerCase() === supplier.name.toLowerCase())
        })
        
        setSuppliers(uniqueSuppliers)
        setFilteredSuppliers(uniqueSuppliers)
        console.log('✅ 供应商列表加载成功，数量:', uniqueSuppliers.length)
      } else {
        setSuppliers([])
        setFilteredSuppliers([])
        if (!isBoss && response.message?.includes('权限')) {
          console.log('雇员角色无法查看供应商列表，这是正常行为')
        }
      }
    } catch (error) {
      handleApiError(error, { showToast: false, logError: true })
      setSuppliers([])
      setFilteredSuppliers([])
    } finally {
      setLoadingSuppliers(false)
    }
  }
  
  // 处理供应商输入变化
  const handleSupplierInputChange = (value: string) => {
    setSupplierInput(value)
    setValue('supplier_name', value)
    
    const filtered = value.trim() === '' 
      ? suppliers 
      : suppliers.filter(supplier => 
          supplier.name.toLowerCase().includes(value.toLowerCase())
        )
    setFilteredSuppliers(filtered)
    setShowSupplierDropdown(value.trim().length > 0)
  }
  
  // 处理供应商选择
  const handleSupplierSelect = (supplier: {id: string, name: string}, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    const supplierName = supplier.name
    setSupplierInput(supplierName)
    setValue('supplier_name', supplierName)
    setShowSupplierDropdown(false)
    
    setFilteredSuppliers(suppliers.filter(s => 
      s.name.toLowerCase().includes(supplierName.toLowerCase())
    ))
  }
  
  // 创建新供应商
  const createNewSupplier = async (name: string) => {
    try {
      setCreatingSupplier(true)
      
      // 权限检查：只有BOSS角色才能创建供应商
      if (!isBoss) {
        toast.error('权限不足，仅老板可创建新供应商')
        console.log('权限不足：当前用户角色为', user?.role, '，无法创建供应商')
        return false
      }
      
      const trimmedName = name.trim()
      
      // 检查本地供应商列表中是否已存在同名供应商
      const existingSupplier = suppliers.find(s => s.name.toLowerCase() === trimmedName.toLowerCase())
      if (existingSupplier) {
        console.log('供应商已存在于本地列表:', existingSupplier)
        toast.error(`供应商"${trimmedName}"已存在，请直接选择`)
        // 自动选择已存在的供应商
        handleSupplierSelect(existingSupplier)
        return true
      }
      
      // 准备创建新供应商
      
      const requestData = {
        name: trimmedName,
        contact: '',
        phone: ''
      }
      
      // 发送创建供应商请求
      const response = await supplierApi.create(requestData)
      
      // 创建供应商响应
      
      if (response.success && response.data) {
        // 添加到供应商列表
         const newSupplier = response.data as {id: string, name: string, contact?: string, phone?: string}
         setSuppliers(prev => [...prev, newSupplier])
         setFilteredSuppliers(prev => [...prev, newSupplier])
        // 新供应商创建成功
        toast.success(`新供应商"${newSupplier.name}"创建成功`)
        return true
      } else {
        console.error('创建供应商失败:', {
          success: response.success,
          message: response.message,
          error: response.error,
          full_response: response
        })
        
        // 针对重复名称错误给出更明确的提示
        if (response.message && response.message.includes('已存在')) {
          toast.error(`供应商"${trimmedName}"已存在，请刷新页面后重新选择`)
          // 重新加载供应商列表
          loadSuppliers()
        } else {
          toast.error(response.message || '创建供应商失败')
        }
        return false
      }
    } catch (error: any) {
      // 使用统一错误处理器
      handleApiError(error, {
        showToast: true,
        logError: true
      })
      
      // 针对特定错误类型的额外处理
      if (error?.message?.includes('400')) {
        // 重新加载供应商列表以获取最新数据
        loadSuppliers()
      }
      return false
    } finally {
      setCreatingSupplier(false)
    }
  }
  
  // 处理供应商输入失焦
  const handleSupplierBlur = () => {
    // 增加延迟时间，确保用户有足够时间点击选项
    setTimeout(() => {
      setShowSupplierDropdown(false)
      
      // 检查当前输入是否与已选择的供应商匹配
      const currentInput = supplierInput.trim()
      const matchingSupplier = suppliers.find(s => 
        s.name.toLowerCase() === currentInput.toLowerCase()
      )
      
      if (matchingSupplier) {
        // 如果找到匹配的供应商，确保状态同步
        setSupplierInput(matchingSupplier.name)
        setValue('supplier_name', matchingSupplier.name)
        // 自动匹配到供应商
      } else if (currentInput.length > 0) {
        // 如果输入不为空但没有匹配的供应商，保持当前输入
        setValue('supplier_name', currentInput)
        // 保持自定义输入
      }
      
      // 下拉框关闭，状态同步完成
    }, 300)
  }
  

  
  // 获取浏览器信息
  const getBrowserInfo = () => {
    const user_agent = navigator.userAgent
    let browser_name = 'Unknown'
    let browser_version = 'Unknown'
    
    if (user_agent.includes('Chrome')) {
      browser_name = 'Chrome'
      const match = user_agent.match(/Chrome\/(\d+)/)
      browser_version = match ? match[1] : 'Unknown'
    } else if (user_agent.includes('Firefox')) {
      browser_name = 'Firefox'
      const match = user_agent.match(/Firefox\/(\d+)/)
      browser_version = match ? match[1] : 'Unknown'
    } else if (user_agent.includes('Safari') && !user_agent.includes('Chrome')) {
      browser_name = 'Safari'
      const match = user_agent.match(/Version\/(\d+)/)
      browser_version = match ? match[1] : 'Unknown'
    } else if (user_agent.includes('Edge')) {
      browser_name = 'Edge'
      const match = user_agent.match(/Edge\/(\d+)/)
      browser_version = match ? match[1] : 'Unknown'
    }
    
    return { browser_name, browser_version, user_agent }
  }
  
  // 浏览器兼容性检查
  const checkCameraSupport = () => {
    // 获取浏览器信息
    const browserInfo = getBrowserInfo()
    
    // 检测是否为开发环境
    const isDevelopment = () => {
      const hostname = window.location.hostname
      const port = window.location.port
      
      // 检查是否为开发端口
      if (port === '5173' || port === '3000' || port === '8080') {
        return true
      }
      
      // 检查是否为本地IP地址
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return true
      }
      
      // 检查是否为局域网IP
      if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
        return true
      }
      
      return false
    }
    
    // 输出完整的环境信息
    console.log('=== 相机兼容性检查 ===', {
      url: window.location.href,
      hostname: window.location.hostname,
      port: window.location.port,
      protocol: window.location.protocol,
      isSecureContext: window.isSecureContext,
      isDevelopment: isDevelopment(),
      browserInfo,
      navigator_exists: typeof navigator !== 'undefined',
      media_devices_exists: !!(navigator && navigator.mediaDevices),
      getUserMediaExists: !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      getSupportedConstraintsExists: !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints)
    })
    
    // 检查navigator对象是否存在
    if (typeof navigator === 'undefined') {
      const error = '浏览器环境异常：navigator对象不存在'
      console.error(error)
      return { supported: false, error }
    }
    
    // 检查是否在安全上下文中（HTTPS或localhost）
    if (!window.isSecureContext) {
      // 如果是开发环境，允许使用相机但给出警告
      if (isDevelopment()) {
        console.warn('开发环境：相机功能在非安全上下文中运行，生产环境需要HTTPS')
      } else {
        const error = '相机功能需要在HTTPS环境下使用，当前为非安全上下文'
        console.error(error)
        return { supported: false, error }
      }
    }
    
    // 检查navigator.mediaDevices是否存在
    if (!navigator.mediaDevices) {
      let error = `当前浏览器不支持相机功能 (${browserInfo.browser_name} ${browserInfo.browser_version})`
      let suggestion = ''
      
      // 根据浏览器类型提供具体建议
      if (browserInfo.browser_name === 'Chrome') {
        const version = parseInt(browserInfo.browser_version)
        if (version < 53) {
          suggestion = '请升级Chrome浏览器到53版本或更高版本'
        } else {
          suggestion = '请检查浏览器设置，确保允许访问相机'
        }
      } else if (browserInfo.browser_name === 'Firefox') {
        const version = parseInt(browserInfo.browser_version)
        if (version < 36) {
          suggestion = '请升级Firefox浏览器到36版本或更高版本'
        } else {
          suggestion = '请检查浏览器设置，确保允许访问相机'
        }
      } else if (browserInfo.browser_name === 'Safari') {
        const version = parseInt(browserInfo.browser_version)
        if (version < 11) {
          suggestion = '请升级Safari浏览器到11版本或更高版本'
        } else {
          suggestion = '请检查浏览器设置，确保允许访问相机'
        }
      } else {
        suggestion = '建议使用Chrome、Firefox或Safari最新版本浏览器'
      }
      
      error += suggestion ? ` - ${suggestion}` : ''
      console.error(error)
      return { supported: false, error }
    }
    
    // 检查getUserMedia是否存在
    if (!navigator.mediaDevices.getUserMedia) {
      const error = `当前浏览器不支持getUserMedia API (${browserInfo.browser_name} ${browserInfo.browser_version}) - 请升级浏览器版本`
      console.error(error)
      return { supported: false, error }
    }
    
    // 检查MediaDevices.getSupportedConstraints是否存在
    if (!navigator.mediaDevices.getSupportedConstraints) {
      console.warn('getSupportedConstraints不可用，使用基本相机功能')
    }
    
    console.log('✅ 相机兼容性检查通过')
    return { supported: true, error: null }
  }
  
  // 相机功能
  
  // 启动相机
  const startCamera = (force = false) => {
    console.log('=== 启动相机 ===', { force, force_enable_camera, isCameraActive })
    
    // 防止重复初始化
    if (isCameraActive && !force) {
      console.log('相机已激活，跳过重复启动')
      return
    }
    
    // 如果强制启用或开发环境下的宽松模式
    if (force || force_enable_camera) {
      console.log('🚀 强制启用相机模式，跳过兼容性检查')
      setCameraError(null)
      setIsCameraActive(true)
      return
    }
    
    // 检查浏览器兼容性
    const supportCheck = checkCameraSupport()
    if (!supportCheck.supported) {
      // 在开发环境下，即使检查失败也尝试启动相机
      const isDev = window.location.hostname.startsWith('192.168.') || 
                   window.location.hostname === 'localhost' ||
                   window.location.port === '5173'
      
      if (isDev) {
        console.warn('⚠️ 开发环境：兼容性检查失败，但仍尝试启动相机')
        console.warn('检查失败原因:', supportCheck.error)
        setCameraError(`开发模式：${supportCheck.error}（仍可尝试使用）`)
        setIsCameraActive(true)
        return
      }
      
      setCameraError(supportCheck.error)
      console.error('相机不支持:', supportCheck.error)
      return
    }
    
    setCameraError(null)
    setIsCameraActive(true)
  }
  
  // 停止相机
  const stopCamera = () => {
    console.log('=== 停止相机 ===')
    setIsCameraActive(false)
    setCameraError(null)
  }
  
  // 处理相机拍照并上传
  const handleCameraPhoto = async (dataUri: string) => {
    console.log('=== 处理相机拍照 ===')
    
    // 检查是否已有图片
    if (photos.length > 0 || fileDataList.length > 0) {
      toast.error('已有图片，请先删除当前图片再拍照')
      return
    }
    
    // 防止重复操作
    if (uploading || submitting) {
      console.log('上传中或提交中，阻止重复操作')
      return
    }
    
    setUploading(true)
    
    try {
      // 创建文件数据对象
      const timestamp = Date.now()
      const fileName = `camera_photo_${timestamp}.jpg`
      
      // 计算文件大小（Base64转字节）
      const base64Data = dataUri.split(',')[1]
      const fileSize = Math.round((base64Data.length * 3) / 4)
      
      const file_data: FileData = {
        base64: dataUri,
        name: fileName,
        size: fileSize,
        type: 'image/jpeg'
      }
      
      console.log('相机拍照文件信息:', {
        name: file_data.name,
        size: file_data.size,
        type: file_data.type,
        base64Length: file_data.base64.length
      })
      
      // 验证文件数据
      if (!validateFileData(file_data)) {
        throw new Error('拍照数据验证失败')
      }
      
      // 存储文件数据
      setFileDataList([file_data])
      
      // 转换为Blob并上传
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/jpeg' })
      
      // 创建FormData并上传
      const formData = new FormData()
      formData.append('images', blob, fileName)
      
      const response = await uploadApi.upload_purchase_images(formData)
      console.log('相机拍照上传响应:', response)
      
      if (response.success && response.data && (response.data as any).urls) {
        // 构建完整的图片URL
        const apiUrl = getApiUrl()
        const baseUrl = apiUrl.replace('/api/v1', '')
        const url = (response.data as any).urls[0]
        
        let fullUrl: string
        if (url.startsWith('http://') || url.startsWith('https://')) {
          fullUrl = url
        } else {
          const normalizedUrl = url.startsWith('/') ? url : `/${url}`
          fullUrl = `${baseUrl}${normalizedUrl}`
        }
        
        // 更新状态
        setFileDataList(prev => prev.map(file_data => ({
          ...file_data,
          uploaded_url: fullUrl
        })))
        
        setPhotos([fullUrl])
        
        // 停止相机
        stopCamera()
        
        toast.success('拍照上传成功')
        console.log('相机拍照上传成功:', fullUrl)
      } else {
        throw new Error(response.message || '上传失败')
      }
      
    } catch (error) {
      console.error('相机拍照上传失败:', error)
      
      if (error instanceof Error) {
        toast.error(`拍照上传失败: ${error.message}`)
      } else {
        toast.error('拍照上传失败，请重试')
      }
      
      // 清理失败的数据
      setFileDataList([])
      
    } finally {
      setUploading(false)
    }
  }
  

  
  // 添加photos状态变化的调试日志和持久化（带清理函数）
  useEffect(() => {
    console.log('=== Photos状态变化 ===', {
      photos,
      length: photos.length,
      timestamp: new Date().toISOString()
    })
    
    // 防抖保存到localStorage
    const saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(photos))
        console.log('Photos状态已保存到localStorage')
      } catch (error) {
        console.error('保存photos状态到localStorage失败:', error)
      }
    }, 300)
    
    return () => {
      clearTimeout(saveTimer)
    }
  }, [photos])
  
  // 监听价格字段变化，自动计算缺失值
  useEffect(() => {
    // 防抖处理，避免频繁计算
    const timer = setTimeout(() => {
      if (price_per_gram || total_price || weight) {
        calculateMissingValue(price_per_gram || 0, total_price || 0, weight || 0)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [price_per_gram, total_price, weight])
  

  
  // 计算每串珠子数量（重新计算，使用已声明的变量）
  // const beadsPerStringRecalc = bead_diameter ? Math.floor(160 / bead_diameter) : 0
  // const totalBeadsRecalc = quantity && beadsPerStringRecalc ? quantity * beadsPerStringRecalc : 0
  // const pricePerBeadString = total_price && totalBeadsRecalc ? (total_price / totalBeadsRecalc).toFixed(4) : '0'
  

  

  
  // cleanupMemory函数已移除，不再需要手动内存管理
  
  // 简化的文件数据有效性检查
  const validateFileData = (file_data: FileData): boolean => {
    try {
      // 检查Base64数据是否有效
      if (!file_data.base64 || !file_data.base64.startsWith('data:image/')) {
        console.error('Base64数据无效或为空')
        return false
      }
      
      // 检查文件类型
      if (!file_data.type || !file_data.type.startsWith('image/')) {
        console.error('文件类型无效:', file_data.type)
        return false
      }
      
      // 检查文件大小
      if (!file_data.size || file_data.size <= 0) {
        console.error('文件大小无效:', file_data.size)
        return false
      }
      
      console.log('文件数据有效性检查通过:', {
        name: file_data.name,
        size: file_data.size,
        type: file_data.type,
        base64Length: file_data.base64.length
      })
      
      return true
    } catch (error) {
      console.error('文件数据有效性检查失败:', error)
      return false
    }
  }

  // 立即读取文件数据并转换为Base64的函数
  const readFileData = (file: File): Promise<FileData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const base64 = e.target?.result as string
          
          const file_data: FileData = {
            base64,
            name: file.name,
            size: file.size,
            type: file.type
          }
          
          console.log('文件数据读取成功:', {
            name: file_data.name,
            size: file_data.size,
            type: file_data.type,
            base64Length: file_data.base64.length
          })
          
          // 立即验证文件数据有效性
          if (!validateFileData(file_data)) {
            reject(new Error('文件数据验证失败'))
            return
          }
          
          resolve(file_data)
        } catch (error) {
          console.error('文件数据处理失败:', error)
          reject(error)
        } finally {
          // 清理FileReader事件监听器
          reader.onload = null
          reader.onerror = null
        }
      }
      
      reader.onerror = () => {
        console.error('文件读取失败:', reader.error)
        reader.onload = null
        reader.onerror = null
        reject(reader.error || new Error('文件读取失败'))
      }
      
      // 使用read_as_data_u_r_l直接获取Base64格式
      reader.readAsDataURL(file)
    })
  }

  // 基于Base64的图片上传处理
  const handleImageUpload = async (files: FileList) => {
    if (files.length === 0) return
    
    console.log('=== 开始图片上传 ===', new Date().toISOString())
    
    // 防止重复上传
    if (uploading || submitting) {
      console.log('上传中或表单提交中，阻止重复操作')
      return
    }
    
    // 检查是否已有图片
    if (photos.length > 0 || fileDataList.length > 0) {
      toast.error('已有图片，请先删除当前图片再上传新图片')
      return
    }
    
    setUploading(true)
    
    // 只处理第一个文件（单张图片）
    const file = files[0]
    
    // 简化的文件验证
    if (!file || !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      console.error('文件验证失败:', { name: file?.name, type: file?.type, size: file?.size })
      toast.error('请选择有效的图片文件（小于10MB）')
      setUploading(false)
      return
    }
    
    try {
      // 立即读取文件数据并转换为Base64
      console.log('立即读取文件数据:', file.name)
      const file_data = await readFileData(file)
      
      // 将文件数据存储到状态中
      setFileDataList([file_data])
      console.log('文件数据已存储到状态中，Base64长度:', file_data.base64.length)
      
      // 上传前再次验证文件数据有效性
      if (!validateFileData(file_data)) {
        throw new Error('上传前文件数据验证失败')
      }
      
      // 将Base64转换为Blob用于上传
      console.log('将Base64转换为Blob并上传文件:', file.name)
      const base64Data = file_data.base64.split(',')[1] // 移除data:image/xxx;base64,前缀
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: file_data.type })
      
      // 创建FormData并上传
      const formData = new FormData()
      formData.append('images', blob, file_data.name)
      
      const response = await uploadApi.upload_purchase_images(formData)
      console.log('上传API响应:', response)
      
      if (response.success && response.data && (response.data as any).urls) {
        // 构建完整的图片URL
        const apiUrl = getApiUrl()
        const baseUrl = apiUrl.replace('/api/v1', '')
        const url = (response.data as any).urls[0]
        
        let fullUrl: string
        if (url.startsWith('http://') || url.startsWith('https://')) {
          fullUrl = url
        } else {
          const normalizedUrl = url.startsWith('/') ? url : `/${url}`
          fullUrl = `${baseUrl}${normalizedUrl}`
        }
        
        // 更新file_data中的uploaded_url
        setFileDataList(prev => prev.map(file_data => ({
          ...file_data,
          uploaded_url: fullUrl
        })))
        
        setPhotos([fullUrl])
        toast.success('图片上传成功')
        console.log('图片上传成功:', fullUrl)
      } else {
        throw new Error(response.message || '上传失败')
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      
      // 根据错误类型提供更友好的提示
      if (error instanceof Error) {
        if (error.message.includes('文件读取失败')) {
          toast.error('文件读取失败，请重新选择图片')
        } else if (error.message.includes('验证失败')) {
          toast.error('文件验证失败，请选择有效的图片文件')
        } else {
          toast.error('图片上传失败，请重试')
        }
      } else {
        toast.error('图片上传失败，请重试')
      }
      
      // 清理失败的文件数据
      setFileDataList([])
    } finally {
      setUploading(false)
      
      console.log('图片上传结束')
    }
  }
  
  // 删除图片
  const removeImage = async (index: number) => {
    const imageUrl = photos[index]
    
    try {
      // 后端API期望接收urls数组
      if (imageUrl) {
        await uploadApi.deletePurchaseImages([imageUrl])
      }
      
      // 清理两个状态
      setPhotos(prev => prev.filter((_, i) => i !== index))
      setFileDataList(prev => prev.filter((_, i) => i !== index))
      
      toast.success('图片删除成功')
    } catch (error) {
      console.error('图片删除失败:', error)
      toast.error('图片删除失败')
    }
  }
  
  // 价格计算函数
  const calculateMissingValue = (price_per_gram: number, total_price: number, weight: number) => {
    // 检查输入值的有效性
    const validPricePerGram = price_per_gram && price_per_gram > 0
    const validTotalPrice = total_price && total_price > 0
    const validWeight = weight && weight > 0
    
    // 如果有克价和总价，计算重量
    if (validPricePerGram && validTotalPrice && !validWeight) {
      const calculatedWeight = Number((total_price / price_per_gram).toFixed(1))
      console.log('计算重量:', { total_price, price_per_gram, calculatedWeight })
      setValue('weight', calculatedWeight)
      return { type: 'weight', value: calculatedWeight }
    }
    
    // 如果有克价和重量，计算总价
    if (validPricePerGram && validWeight && !validTotalPrice) {
      const calculatedTotalPrice = Number((price_per_gram * weight).toFixed(1))
      console.log('计算总价:', { price_per_gram, weight, calculatedTotalPrice })
      setValue('total_price', calculatedTotalPrice)
      return { type: 'total_price', value: calculatedTotalPrice }
    }
    
    // 如果有总价和重量，计算克价
    if (validTotalPrice && validWeight && !validPricePerGram) {
      const calculatedPricePerGram = Number((total_price / weight).toFixed(1))
      console.log('计算克价:', { total_price, weight, calculatedPricePerGram })
      setValue('price_per_gram', calculatedPricePerGram)
      return { type: 'price_per_gram', value: calculatedPricePerGram }
    }
    
    return null
  }
  

  
  // AI识别处理
  const handleAiParse = async (description: string) => {
    if (!description.trim()) {
      toast.error('请输入采购描述')
      return
    }
    
    setAiParsing(true)
    try {
      const response = await aiApi.parse_crystal_purchase(description)
      if (response.success && response.data) {
        const data = response.data
        
        console.log('🤖 AI识别原始数据:', data)
        console.log('🔍 供应商字段检查:', {
          hasSupplierName: 'supplier_name' in (data as any),
          supplier_name_value: (data as any).supplier_name,
          supplier_name_type: typeof (data as any).supplier_name
        })
        
        // 自动填充表单 - 修复字段映射问题（camelCase -> snake_case）
        const aiData = data as any
        
        console.log('🔍 AI返回的原始字段:', Object.keys(aiData))
        
        // 产品名称：productName -> product_name
        if (aiData.productName) {
          setValue('product_name', aiData.productName)
          console.log('✅ 映射产品名称:', aiData.productName)
        }
        
        // 自动设置产品类型和单位类型：productType, unitType -> product_type, unit_type
        if (aiData.productType && aiData.unitType) {
          handleProductTypeChange(aiData.productType, aiData.unitType)
          console.log('✅ 映射产品类型:', aiData.productType, aiData.unitType)
        }
        
        // 设置珠子直径或规格：beadDiameter -> bead_diameter 或 specification
        if (aiData.beadDiameter) {
          if (aiData.productType === 'FINISHED' || aiData.productType === 'ACCESSORIES') {
            // 成品和饰品使用规格字段
            setValue('specification', aiData.beadDiameter)
            console.log('✅ 映射规格:', aiData.beadDiameter)
          } else {
            // 散珠和手串使用珠子直径字段
            setValue('bead_diameter', aiData.beadDiameter)
            console.log('✅ 映射珠子直径:', aiData.beadDiameter)
          }
        }
        
        // 数量字段：quantity, pieceCount -> quantity, piece_count
        if (aiData.quantity) {
          setValue('quantity', aiData.quantity)
          console.log('✅ 映射数量(串数):', aiData.quantity)
        }
        if (aiData.pieceCount) {
          setValue('piece_count', aiData.pieceCount)
          console.log('✅ 映射数量(颗数/片数/件数):', aiData.pieceCount)
        }
        
        // 价格字段：pricePerGram, totalPrice -> price_per_gram, total_price
        if (aiData.pricePerGram) {
          setValue('price_per_gram', aiData.pricePerGram)
          console.log('✅ 映射克价:', aiData.pricePerGram)
        }
        if (aiData.totalPrice) {
          setValue('total_price', aiData.totalPrice)
          console.log('✅ 映射总价:', aiData.totalPrice)
        }
        
        // 单价字段：unitPrice（暂时不直接设置到表单）
        if (aiData.unitPrice) {
          console.log('ℹ️ 识别到单价（将通过总价和数量计算）:', aiData.unitPrice)
        }
        
        // 重量字段：weight -> weight
        if (aiData.weight) {
          setValue('weight', aiData.weight)
          console.log('✅ 映射重量:', aiData.weight)
        }
        
        // 品相字段：quality -> quality
        if (aiData.quality) {
          setValue('quality', aiData.quality)
          console.log('✅ 映射品相:', aiData.quality)
        }
        
        // 供应商字段：supplierName -> supplier_name
        if (aiData.supplierName) {
          setValue('supplier_name', aiData.supplierName)
          setSupplierInput(aiData.supplierName) // 同步更新组件状态
          console.log('✅ 映射供应商:', aiData.supplierName)
        }
        
        // 备注字段：notes -> notes
        if (aiData.notes) {
          setValue('notes', aiData.notes)
          console.log('✅ 映射备注:', aiData.notes)
        }
        
        // 统计成功映射的字段
        const mappedFields = [
          aiData.productName && 'productName',
          aiData.productType && 'productType',
          aiData.beadDiameter && 'beadDiameter',
          aiData.quantity && 'quantity',
          aiData.pieceCount && 'pieceCount',
          aiData.pricePerGram && 'pricePerGram',
          aiData.totalPrice && 'totalPrice',
          aiData.weight && 'weight',
          aiData.quality && 'quality',
          aiData.supplierName && 'supplierName',
          aiData.notes && 'notes'
        ].filter(Boolean)
        
        console.log('📊 成功映射字段数量:', mappedFields.length, '字段:', mappedFields)
        
        // AI识别后进行价格计算
        setTimeout(() => {
          const result = calculateMissingValue(
            aiData.pricePerGram || 0,
            aiData.totalPrice || 0,
            aiData.weight || 0
          )
          if (result) {
            toast.success(`AI识别成功，已自动填充${mappedFields.length}个字段，并计算${result.type === 'weight' ? '重量' : result.type === 'total_price' ? '总价' : '克价'}：${result.value}`)
          } else {
            toast.success(`AI识别成功，已自动填充${mappedFields.length}个字段`)
          }
        }, 100)
        
        setValue('natural_language_input', description)
      } else {
        toast.error(response.message || 'AI识别失败')
      }
    } catch (error) {
      console.error('🚨 AI识别失败:', error)
      toast.error('AI识别失败')
    } finally {
      setAiParsing(false)
    }
  }
  

  
  // 提交表单
  const onSubmit = async (data: PurchaseFormData) => {
    // 表单提交开始
    console.log('🔍 [表单提交] 开始提交，表单数据:', data)
    
    // 详细调试：检查 product_name 字段
    console.log('🔍 [调试] data.product_name 详细信息:', {
      value: data.product_name,
      type: typeof data.product_name,
      length: data.product_name?.length,
      trimmed: data.product_name?.trim(),
      isEmpty: !data.product_name || !data.product_name.trim()
    })
    
    // 检查表单验证状态
    console.log('🔍 [调试] 表单验证状态:', {
      errors: errors,
      hasProductNameError: !!errors.product_name,
      productNameError: errors.product_name?.message,
      formState: {
        isValid: formState.isValid,
        isDirty: formState.isDirty,
        isSubmitted: formState.isSubmitted
      }
    })
    
    // 验证必填字段
    if (!data.product_name || !data.product_name.trim()) {
      toast.error('产品名称不能为空')
      return
    }
    
    if (photos.length === 0) {
      toast.error('请至少上传一张图片')
      return
    }
    
    // 防止重复提交
    if (submitting) {
      console.log('⚠️ [表单提交] 防止重复提交')
      return
    }
    
    setSubmitting(true)
    
    try {
      // 根据产品类型验证必需字段
      
      // 验证产品名称（所有类型必填）
      if (!data.product_name?.trim()) {
        toast.error('产品名称不能为空')
        setSubmitting(false)
        return
      }
      
      // 验证供应商名称（所有类型必填）
      if (!data.supplier_name?.trim()) {
        toast.error('供应商名称不能为空')
        setSubmitting(false)
        return
      }
      
      // 根据产品类型验证特定字段
      if (data.product_type === 'LOOSE_BEADS') {
        // 散珠：产品名称、直径、数量、总价、供应商名称
        if (!data.bead_diameter) {
          toast.error('珠子直径不能为空')
          setSubmitting(false)
          return
        }
        if (!data.piece_count) {
          toast.error('数量不能为空')
          setSubmitting(false)
          return
        }
        if (!data.total_price) {
          toast.error('总价不能为空')
          setSubmitting(false)
          return
        }
      } else if (data.product_type === 'BRACELET') {
        // 手串：产品名称、直径、数量、克价/总价/重量三选二、供应商名称
        if (!data.bead_diameter) {
          toast.error('珠子直径不能为空')
          setSubmitting(false)
          return
        }
        if (!data.quantity) {
          toast.error('数量不能为空')
          setSubmitting(false)
          return
        }
        // 验证克价/总价/重量三选二
        const priceFields = [data.price_per_gram, data.total_price, data.weight].filter(field => field && field > 0)
        if (priceFields.length < 2) {
          toast.error('克价、总价、重量至少需要填写其中两项')
          setSubmitting(false)
          return
        }
      } else if (data.product_type === 'ACCESSORIES') {
        // 饰品配件：产品名称、规格、数量、总价、供应商名称
        if (!data.specification) {
          toast.error('规格不能为空')
          setSubmitting(false)
          return
        }
        if (!data.piece_count) {
          toast.error('数量不能为空')
          setSubmitting(false)
          return
        }
        if (!data.total_price) {
          toast.error('总价不能为空')
          setSubmitting(false)
          return
        }
      } else if (data.product_type === 'FINISHED') {
        // 成品：产品名称、规格、数量、总价、供应商名称
        if (!data.specification) {
          toast.error('规格不能为空')
          setSubmitting(false)
          return
        }
        if (!data.piece_count) {
          toast.error('数量不能为空')
          setSubmitting(false)
          return
        }
        if (!data.total_price) {
          toast.error('总价不能为空')
          setSubmitting(false)
          return
        }
      }
      
      // 检查供应商是否存在，如果不存在则先创建
      if (data.supplier_name?.trim() && !suppliers.some(s => s.name.toLowerCase() === data.supplier_name!.toLowerCase())) {
        // 供应商不存在，准备创建新供应商
        const created = await createNewSupplier(data.supplier_name)
        if (!created) {
          toast.error('创建新供应商失败，请重试')
          setSubmitting(false)
          return
        }
        // 新供应商创建成功
      }
      
      // 构建提交数据前的调试
      console.log('🔍 [调试] 构建 submitData 前，data.product_name:', {
        value: data.product_name,
        type: typeof data.product_name,
        length: data.product_name?.length,
        isUndefined: data.product_name === undefined,
        isNull: data.product_name === null,
        isEmpty: data.product_name === ''
      })
      
      const submitData = {
        product_name: data.product_name,
        product_type: data.product_type || 'BRACELET',
        unit_type: data.unit_type || 'STRINGS',
        bead_diameter: data.bead_diameter ? Number(data.bead_diameter) : undefined,
        specification: data.specification ? Number(data.specification) : undefined,
        quantity: data.quantity ? Number(data.quantity) : undefined,
        piece_count: data.piece_count ? Number(data.piece_count) : undefined,
        min_stock_alert: data.min_stock_alert ? Number(data.min_stock_alert) : undefined,
        price_per_gram: data.price_per_gram ? Number(data.price_per_gram) : undefined,
        total_price: data.total_price ? Number(data.total_price) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
        quality: data.quality,
        supplier_name: data.supplier_name,
        notes: data.notes,
        natural_language_input: data.natural_language_input,
        photos
      }
      
      // 构建提交数据后的调试
      console.log('🔍 [调试] 构建 submitData 后，submitData.product_name:', {
        value: submitData.product_name,
        type: typeof submitData.product_name,
        length: submitData.product_name?.length,
        isUndefined: submitData.product_name === undefined,
        isNull: submitData.product_name === null,
        isEmpty: submitData.product_name === ''
      })
      
      console.log('📤 [表单提交] 准备提交的数据:', submitData)
      console.log('🔍 [表单提交] 关键字段检查:', {
        product_name: submitData.product_name,
        product_type: submitData.product_type,
        supplier_name: submitData.supplier_name,
        photos_count: submitData.photos.length
      })
      
      // 提交数据
      const response = await purchaseApi.create(submitData)
      
      if (response.success) {
        toast.success('采购记录创建成功')
        // 提交成功，准备重置状态
        
        // 延迟重置，确保用户能看到成功消息
        setTimeout(() => {
          // 清除持久化的photos数据
          try {
            localStorage.removeItem(PHOTOS_STORAGE_KEY)
            // 已清除localStorage中的photos数据
          } catch (error) {
            // 清除localStorage失败
          }
          
          reset()
          setPhotos([])
          setFileDataList([])
          // 重置产品类型和单位类型到默认值
          setSelectedProductType('BRACELET')
          setSelectedUnitType('STRINGS')
          // 状态重置完成，准备下一次录入
          // 不再跳转到采购列表，留在当前页面方便连续录入
          toast.success('表单已重置，可以继续录入下一个采购记录')
        }, 500) // 延迟500ms确保用户看到成功消息
      } else {
        // 提交失败
        toast.error(response.message || '创建失败')
      }
    } catch (error) {
      // 提交异常
      toast.error('提交失败')
    } finally {
      setSubmitting(false)
      // 表单提交结束
    }
  }
  
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <ShoppingCart className="h-8 w-8 text-gray-700" />
        <h1 className="text-2xl font-semibold text-gray-900">采购录入</h1>
      </div>
      
      {/* 主表单 */}
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-6"
        onKeyDown={(e) => {
          // 防止Enter键意外触发表单提交
          if (e.key === 'Enter' && e.target !== e.currentTarget) {
            const target = e.target as HTMLElement
            // 只允许在提交按钮上按Enter提交
            if ((target as any).type !== 'submit' && !target.classList.contains('submit-button')) {
              e.preventDefault()
              console.log('阻止Enter键触发表单提交:', target)
            }
          }
        }}
      >
        {/* 图片上传区域 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">产品图片</h3>
          
          {/* 图片预览 */}
          {(photos.length > 0 || fileDataList.length > 0) && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">产品图片：</p>
                <button
                  type="button"
                  onClick={() => {
                    console.log('用户手动清除photos状态')
                    
                    setPhotos([])
                    setFileDataList([])
                    
                    try {
                      localStorage.removeItem(PHOTOS_STORAGE_KEY)
                      console.log('已清除localStorage中的photos数据')
                    } catch (error) {
                      console.error('清除localStorage失败:', error)
                    }
                    toast.success('已清除所有图片')
                  }}
                  className="text-xs text-red-600 hover:text-red-800 transition-colors"
                >
                  清除所有
                </button>
              </div>
              {/* 单张图片显示 */}
              <div className="flex justify-center">
                <div className="relative group max-w-sm">
                  <img
                    src={photos.length > 0 ? photos[0] : (fileDataList.length > 0 ? fileDataList[0].base64 : '')}
                    alt="产品图片"
                    className="w-full max-h-64 object-contain rounded-lg border border-gray-200 shadow-sm bg-gray-50"
                    onLoad={() => console.log('图片加载成功')}
                    onError={(e) => {
                      console.error('图片加载失败:', e)
                      toast.error('图片加载失败')
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(0)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-red-200"
                    title="删除图片"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {/* 上传状态指示器 */}
                  {fileDataList.length > 0 && photos.length === 0 && (
                    <div className="absolute bottom-2 left-2 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-lg border border-blue-200 font-medium">
                      准备上传
                    </div>
                  )}
                  {photos.length > 0 && (
                    <div className="absolute bottom-2 left-2 bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-lg border border-green-200 font-medium">
                      已上传
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* 相机拍照区域 */}
          {!isCameraActive && photos.length === 0 && fileDataList.length === 0 && (
            <div className={`flex gap-3 ${isMobile ? 'justify-center' : 'justify-center'}`}>
              <button
                type="button"
                onClick={() => startCamera()}
                disabled={uploading || submitting}
                className="inline-flex items-center space-x-3 px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl border border-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                <Camera className="h-5 w-5 text-gray-600" />
                <span className="font-medium">启动相机</span>
              </button>
              {/* 电脑端显示上传按钮，移动端不显示 */}
              {!isMobile && (
                <DropzoneUpload
                  onFilesAccepted={handleImageUpload}
                  disabled={uploading || submitting}
                />
              )}
            </div>
          )}
          
          {/* 相机错误提示 */}
          {!isCameraActive && photos.length === 0 && fileDataList.length === 0 && cameraError && (
                  <div className="space-y-3">
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4 inline mr-2" />
                      {cameraError}
                    </div>
                    {/* 强制启用相机选项 */}
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="force_enable_camera"
                            checked={force_enable_camera}
                            onChange={(e) => setForceEnableCamera(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="force_enable_camera" className="text-sm text-yellow-800">
                            强制启用相机（跳过兼容性检查）
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => startCamera(true)}
                          disabled={uploading || submitting}
                          className="text-xs px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg border border-yellow-200 transition-all duration-200 disabled:opacity-50 font-medium"
                        >
                          强制启动
                        </button>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        ⚠️ 开发模式：如果您确定浏览器支持相机，可以尝试强制启用
                      </p>
                    </div>
                  </div>
          )}
          
          {/* 相机预览界面 */}
          {isCameraActive && (
            <div className="border-2 border-blue-300 rounded-lg overflow-hidden">
              <div className="relative">
                {/* react-html5-camera-photo 组件 */}
                <div className="w-full h-auto min-h-[300px] md:min-h-[400px] bg-black rounded-lg relative">
                  {/* React错误边界包装器 */}
                  <CameraErrorBoundary
                    onError={(error) => {
                      console.error('错误边界捕获到相机错误:', error)
                      setCameraError(`相机组件错误: ${error.message}`)
                      stopCamera()
                    }}
                  >
                    <div className="w-full h-full relative">
                      {(() => {
                        try {
                          // 创建完整的MediaDevices polyfill
                          const createMediaDevicesPolyfill = () => {
                            console.log('=== 创建MediaDevices Polyfill ===', {
                              hasNavigator: typeof navigator !== 'undefined',
                              hasMediaDevices: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
                              isDevelopment: import.meta.env.MODE === 'development',
                              force_enable_camera
                            })
                            
                            // 如果navigator不存在，创建一个基础的navigator对象
                            if (typeof navigator === 'undefined') {
                              console.warn('Navigator对象不存在，创建polyfill')
                              // 在开发环境下，我们不能直接修改全局navigator，但可以创建本地引用
                              if (!window.navigator) {
                                (window as any).navigator = {}
                              }
                            }
                            
                            // 如果media_devices不存在，创建polyfill
                            if (!navigator.mediaDevices) {
                              console.warn('MediaDevices API不存在，创建polyfill')
                              
                              // 创建一个基础的media_devices对象
                              const mediaDevicesPolyfill = {
                                getUserMedia: (constraints: any) => {
                                  console.log('使用polyfill getUserMedia', constraints)
                                  
                                  // 尝试使用旧的API作为fallback
                                  const nav = navigator as any
                                  if (nav.getUserMedia || nav.webkit_get_user_media || nav.moz_get_user_media) {
                                    const getUserMedia = nav.getUserMedia || nav.webkit_get_user_media || nav.moz_get_user_media
                                    
                                    return new Promise((resolve, reject) => {
                                      getUserMedia.call(navigator, constraints, resolve, reject)
                                    })
                                  }
                                  
                                  // 如果在开发环境且强制启用，返回一个模拟的stream
                                  if (import.meta.env.MODE === 'development' && force_enable_camera) {
                                    console.warn('开发环境强制模式：创建模拟媒体流')
                                    return Promise.reject(new Error('开发环境模拟：相机不可用，但允许测试'))
                                  }
                                  
                                  return Promise.reject(new Error('getUserMedia不支持'))
                                },
                                
                                getSupportedConstraints: () => {
                                  console.log('使用polyfill getSupportedConstraints')
                                  return {
                                    width: true,
                                    height: true,
                                    aspect_ratio: true,
                                    frame_rate: true,
                                    facing_mode: true,
                                    resize_mode: true,
                                    sample_rate: true,
                                    sample_size: true,
                                    echo_cancellation: true,
                                    auto_gain_control: true,
                                    noise_suppression: true,
                                    latency: true,
                                    channel_count: true,
                                    device_id: true,
                                    group_id: true
                                  }
                                },
                                
                                enumerate_devices: () => {
                                  console.log('使用polyfill enumerate_devices')
                                  return Promise.resolve([])
                                }
                              }
                              
                              // 将polyfill赋值给navigator.mediaDevices
                              try {
                                Object.defineProperty(navigator, 'mediaDevices', {
                                  value: mediaDevicesPolyfill,
                                  writable: true,
                                  configurable: true
                                })
                              } catch (e) {
                                console.warn('无法设置media_devices polyfill，使用临时引用', e)
                                // 无法直接赋值只读属性，使用Object.defineProperty
                                try {
                                  Object.defineProperty(navigator, 'mediaDevices', {
                                    value: mediaDevicesPolyfill,
                                    writable: false,
                                    configurable: true
                                  })
                                } catch (e2) {
                                  console.warn('无法设置mediaDevices属性', e2)
                                }
                              }
                            } else {
                              // 如果mediaDevices存在但缺少某些方法，补充它们
                              if (!navigator.mediaDevices.getSupportedConstraints) {
                                console.warn('getSupportedConstraints不存在，添加polyfill')
                                navigator.mediaDevices.getSupportedConstraints = () => {
                                  return {
                                    width: true,
                                    height: true,
                                    aspect_ratio: true,
                                    frame_rate: true,
                                    facing_mode: true,
                                    resize_mode: true,
                                    sample_rate: true,
                                    sample_size: true,
                                    echo_cancellation: true,
                                    auto_gain_control: true,
                                    noise_suppression: true,
                                    latency: true,
                                    channel_count: true,
                                    device_id: true,
                                    group_id: true
                                  }
                                }
                              }
                            }
                            
                            console.log('=== Polyfill创建完成 ===', {
                              hasNavigator: typeof navigator !== 'undefined',
                              hasMediaDevices: !!navigator.mediaDevices,
                              hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
                              hasGetSupportedConstraints: !!(navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints)
                            })
                          }
                          
                          // 执行polyfill创建
                          createMediaDevicesPolyfill()
                          
                          // 抑制defaultProps警告（仅在开发环境）
                          const originalConsoleError = console.error
                          if (import.meta.env.MODE === 'development') {
                            console.error = (...args) => {
                              const message = args[0]
                              if (typeof message === 'string' && message.includes('defaultProps will be removed')) {
                                // 静默处理defaultProps警告
                                return
                              }
                              originalConsoleError.apply(console, args)
                            }
                          }
                          
                          return (
                            <div style={{ 
                              position: 'relative', 
                              width: '100%', 
                              height: '100%', 
                              minHeight: '400px',
                              overflow: 'visible'
                            }} className="camera-container">
                              <CameraPhoto
                                onTakePhoto={(dataUri: string) => {
                                  // 恢复原始console.error
                                  if (import.meta.env.MODE === 'development') {
                                    console.error = originalConsoleError
                                  }
                                  handleCameraPhoto(dataUri)
                                }}
                                onCameraError={(error: Error) => {
                                // 恢复原始console.error
                                if (import.meta.env.MODE === 'development') {
                                  console.error = originalConsoleError
                                }
                                
                                console.error('=== CameraPhoto组件错误 ===', {
                                  error,
                                  message: error.message,
                                  name: error.name,
                                  stack: error.stack,
                                  force_enable_camera,
                                  timestamp: new Date().toISOString()
                                })
                                
                                let errorMessage = '相机启动失败'
                                let suggestion = ''
                                
                                // 特殊处理getSupportedConstraints错误
                                if (error.message.includes('getSupportedConstraints') || error.message.includes('Cannot read properties of null')) {
                                  errorMessage = '相机API兼容性问题'
                                  suggestion = '请尝试刷新页面或使用其他浏览器'
                                }
                                // 根据错误类型提供更友好的错误信息
                                else if (error.message.includes('Permission denied') || error.name === 'NotAllowedError') {
                                  errorMessage = '相机权限被拒绝'
                                  suggestion = '请点击地址栏的相机图标，选择"始终允许"'
                                } else if (error.message.includes('NotFoundError') || error.name === 'NotFoundError') {
                                  errorMessage = '未找到可用的相机设备'
                                  suggestion = '请检查是否连接了摄像头设备'
                                } else if (error.message.includes('NotAllowedError') || error.name === 'NotAllowedError') {
                                  errorMessage = '相机访问被阻止'
                                  suggestion = '请检查浏览器设置中的相机权限'
                                } else if (error.message.includes('NotReadableError') || error.name === 'NotReadableError') {
                                  errorMessage = '相机设备被其他应用占用'
                                  suggestion = '请关闭其他使用相机的应用程序'
                                } else if (error.message.includes('OverconstrainedError') || error.name === 'OverconstrainedError') {
                                  errorMessage = '相机不支持所请求的配置'
                                  suggestion = '尝试使用强制启动模式'
                                } else if (error.message.includes('AbortError') || error.name === 'AbortError') {
                                  errorMessage = '相机启动被中断'
                                  suggestion = '请重新尝试启动相机'
                                } else {
                                  errorMessage = `相机启动失败: ${error.message}`
                                  suggestion = '请尝试刷新页面或使用强制启动模式'
                                }
                                
                                const fullErrorMessage = suggestion ? `${errorMessage} - ${suggestion}` : errorMessage
                                setCameraError(fullErrorMessage)
                                
                                // 如果是强制模式，给出额外提示
                                if (force_enable_camera) {
                                  console.warn('强制模式下相机仍然失败，可能是硬件或权限问题')
                                  toast.error('强制启动失败：' + errorMessage)
                                }
                                
                                stopCamera()
                              }}
                              idealFacingMode={FACING_MODES.ENVIRONMENT}
                              imageType={IMAGE_TYPES.JPG}
                              imageCompression={1.0}
                              isMaxResolution={true}
                              isImageMirror={false}
                              isSilentMode={false}
                              isDisplayStartCameraError={false}
                              isFullscreen={false}
                              sizeFactor={1}
                              onCameraStart={() => {
                                console.log('相机启动成功')
                                setCameraError(null)
                              }}
                              onCameraStop={() => {
                                console.log('相机已停止')
                              }}
                            />
                            </div>
                          )
                        } catch (renderError) {
                          console.error('相机组件渲染错误:', renderError)
                          return (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-600">
                              <div className="text-center space-y-2">
                                <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
                                <p className="text-sm">相机组件加载失败</p>
                                <p className="text-xs text-gray-500">{(renderError as Error).message}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    console.log('尝试重新启动相机')
                                    stopCamera()
                                    setTimeout(() => startCamera(true), 1000)
                                  }}
                                  className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-all duration-200 font-medium"
                                >
                                  重试
                                </button>
                              </div>
                            </div>
                          )
                        }
                      })()
                      }
                    </div>
                  </CameraErrorBoundary>
                </div>
                
                {/* 关闭相机按钮 */}
                <div className="absolute top-4 right-4 z-10">
                  <button
                    type="button"
                    onClick={stopCamera}
                    disabled={uploading}
                    className="p-3 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md border border-gray-200 hover:border-red-200"
                    title="关闭相机"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* 相机状态指示 */}
                <div className="absolute top-4 left-4 bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-lg border border-green-200 flex items-center space-x-2 z-10 font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>相机已启动</span>
                </div>
              </div>
              

            </div>
          )}
          
          {/* 上传进度提示 */}
          {uploading && (
            <div className="border-2 border-blue-300 rounded-lg p-6 text-center bg-blue-50">
              <div className="space-y-3">
                <Loader2 className="h-8 w-8 text-blue-500 mx-auto animate-spin" />
                <div className="text-blue-600 font-medium">正在上传图片...</div>
                <div className="text-sm text-blue-500">请稍候，正在处理您的图片</div>
              </div>
            </div>
          )}
          
          {/* 拍照提示 */}
          {photos.length === 0 && !uploading && !isCameraActive && (
            <div className="text-xs text-gray-400 mt-2 text-center">
              💡 提示：需要拍摄一张产品图片才能提交
            </div>
          )}
          {photos.length > 0 && (
            <div className="text-xs text-green-600 mt-2 text-center">
              ✅ 图片已上传，如需重新拍照请先删除当前图片
            </div>
          )}
        </div>
        
        {/* AI智能识别区域 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Sparkles className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">AI智能识别</h3>
          </div>
          <div className="space-y-4">
            <textarea
              placeholder="请描述您的采购信息，例如：白水晶8mm，AA级，5串，总价500元，重量100克，供应商张三..."
              className="w-full h-32 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
              id="ai_description"
            />
            <div className="flex space-x-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const textarea = document.getElementById('ai_description') as HTMLTextAreaElement
                  handleAiParse(textarea.value)
                }}
                disabled={aiParsing}
                className="flex items-center space-x-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md font-medium"
              >
                {aiParsing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>{aiParsing ? '识别中...' : '开始识别'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const textarea = document.getElementById('ai_description') as HTMLTextAreaElement
                  textarea.value = ''
                }}
                className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 rounded-xl border border-gray-200 transition-all duration-200 font-medium"
              >
                清空
              </button>
              

            </div>
          </div>
        </div>
        

        
        {/* 产品类型选择 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <ProductTypeTab
            selectedType={selectedProductType}
            onTypeChange={handleProductTypeChange}
          />
        </div>
        
        {/* 基本信息 */}
        <MobileFormGroup title="基本信息">
          <MobileFormRow columns={isMobile ? 1 : 2}>
            {/* 产品名称 */}
            <div className="space-mobile-sm">
              <label className="label-mobile label-mobile-required">
                产品名称
              </label>
              <input
                type="text"
                placeholder="如：白水晶、紫水晶、粉水晶等"
                className="input-mobile"
                {...register('product_name', {
                  required: '产品名称不能为空',
                  minLength: { value: 1, message: '产品名称不能为空' },
                  maxLength: { value: 100, message: '产品名称不能超过100字符' }
                })}
              />
              {errors.product_name && (
                <div className="form-error-mobile">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                  {errors.product_name.message}
                </div>
              )}
            </div>
            
            {/* 动态字段：根据产品类型显示不同的规格字段 */}
            {(selectedProductType === 'LOOSE_BEADS' || selectedProductType === 'BRACELET') && (
              <MobileInput
                label="珠子直径 (mm)"
                required
                type="number"
                step="0.1"
                min={4}
                max={20}
                placeholder="如：6、8、10、12等"
                value={watch('bead_diameter') || ''}
                onChange={(e) => setValue('bead_diameter', parseFloat(e.target.value) || undefined)}
                error={errors.bead_diameter?.message}
                inputMode="decimal"
              />
            )}
            
            {selectedProductType === 'ACCESSORIES' && (
              <MobileInput
                label="使用边规格 (mm)"
                required
                type="number"
                step="0.1"
                min={0.1}
                placeholder="如：2、3、5等"
                value={watch('specification') || ''}
                onChange={(e) => setValue('specification', parseFloat(e.target.value) || undefined)}
                error={errors.specification?.message}
                inputMode="decimal"
              />
            )}
            
            {selectedProductType === 'FINISHED' && (
              <MobileInput
                label="规格 (mm)"
                required
                type="number"
                step="0.1"
                min={0.1}
                placeholder="如：8、10、12等"
                value={watch('specification') || ''}
                onChange={(e) => setValue('specification', parseFloat(e.target.value) || undefined)}
                error={errors.specification?.message}
                inputMode="decimal"
              />
            )}
            
            {/* 动态字段：根据产品类型显示不同的数量字段 */}
            {selectedProductType === 'BRACELET' && (
              <MobileInput
                label="数量 (条)"
                required
                type="number"
                min={1}
                placeholder="注：默认16cm手围一串"
                value={watch('quantity') || ''}
                onChange={(e) => setValue('quantity', parseInt(e.target.value) || undefined)}
                error={errors.quantity?.message}
                inputMode="numeric"
              />
            )}
            
            {(selectedProductType === 'LOOSE_BEADS' || selectedProductType === 'ACCESSORIES' || selectedProductType === 'FINISHED') && (
              <MobileInput
                label={`数量 (${selectedProductType === 'LOOSE_BEADS' ? '颗' : selectedProductType === 'ACCESSORIES' ? '片' : '件'})`}
                required
                type="number"
                min={1}
                placeholder={`请输入${selectedProductType === 'LOOSE_BEADS' ? '颗数' : selectedProductType === 'ACCESSORIES' ? '片数' : '件数'}`}
                value={watch('piece_count') || ''}
                onChange={(e) => setValue('piece_count', parseInt(e.target.value) || undefined)}
                error={errors.piece_count?.message}
                inputMode="numeric"
              />
            )}
            
            {/* 品相等级 */}
            <MobileSelect
              label="品相等级"
              value={watch('quality') || ''}
              onChange={(e) => setValue('quality', e.target.value as any)}
              options={[
                { value: '', label: '请选择品相等级' },
                { value: 'AA', label: 'AA级' },
                { value: 'A', label: 'A级' },
                { value: 'AB', label: 'AB级' },
                { value: 'B', label: 'B级' },
                { value: 'C', label: 'C级' }
              ]}
            />
          </MobileFormRow>
        </MobileFormGroup>
        
        {/* 价格信息 */}
        <MobileFormGroup title="价格信息">
          <MobileFormRow columns={isMobile ? 1 : 2}>
            {/* 克价 */}
            <MobileInput
              label={`克价 (元/克)${selectedProductType === 'BRACELET' ? ' (与总价、重量三选二)' : ''}`}
              type="number"
              step="0.1"
              min={0}
              max={10000}
              placeholder="每克价格"
              value={watch('price_per_gram') || ''}
              onChange={(e) => setValue('price_per_gram', parseFloat(e.target.value) || undefined)}
              error={errors.price_per_gram?.message}
              inputMode="decimal"
            />
            
            {/* 总价 */}
            <TotalPriceInput
              label={`总价 (元)${selectedProductType !== 'BRACELET' ? '' : ' (与克价、重量三选二)'}`}
              required={selectedProductType !== 'BRACELET'}
              value={watch('total_price') || ''}
              onChange={(value) => setValue('total_price', value)}
              error={errors.total_price?.message}
              placeholder="采购总价"
              selectedProductType={selectedProductType}
              unitPrice={unit_price}
              totalBeads={totalBeads}
              pricePerBead={pricePerBead}
              totalPrice={total_price || 0}
            />
            
            {/* 重量 */}
            <MobileInput
              label={`重量 (克)${selectedProductType === 'BRACELET' ? ' (与克价、总价三选二)' : ''}`}
              type="number"
              step="0.1"
              min={0}
              max={10000}
              placeholder="总重量"
              value={watch('weight') || ''}
              onChange={(e) => setValue('weight', parseFloat(e.target.value) || undefined)}
              error={errors.weight?.message}
              inputMode="decimal"
            />
            
            {/* 最低预警颗数 */}
            <MobileInput
              label="最低预警颗数"
              type="number"
              min={0}
              placeholder="库存预警阈值"
              value={watch('min_stock_alert') || ''}
              onChange={(e) => setValue('min_stock_alert', parseInt(e.target.value) || undefined)}
              error={errors.min_stock_alert?.message}
              inputMode="numeric"
            />
          </MobileFormRow>
        </MobileFormGroup>
        
        {/* 供应商信息 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">供应商信息</h3>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                供应商名称 <span className="text-red-500">*</span>
              </label>
              
              {loadingSuppliers ? (
                <div className="flex items-center justify-center py-3 text-gray-500 border border-gray-200 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  加载供应商列表中...
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={supplierInput}
                    onFocus={() => setShowSupplierDropdown(true)}
                    placeholder="请输入或选择供应商名称"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    {...register('supplier_name', { 
                      required: '供应商名称不能为空',
                      minLength: { value: 1, message: '供应商名称不能为空' },
                      maxLength: { value: 100, message: '供应商名称不能超过100字符' },
                      pattern: {
                        value: /^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/,
                        message: '供应商名称只能包含中文、英文、数字和空格'
                      },
                      validate: (value) => {
                        if (!value || value.trim().length === 0) {
                          return '供应商名称不能为空';
                        }
                        if (value.length > 100) {
                          return '供应商名称不能超过100字符';
                        }
                        return true;
                      },
                      onChange: (e) => handleSupplierInputChange(e.target.value),
                      onBlur: handleSupplierBlur
                    })}
                  />
                  
                  {/* 下拉选项列表 */}
                  {showSupplierDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filtered_suppliers.length > 0 ? (
                        <>
                          {filtered_suppliers.map((supplier) => (
                            <div
                              key={supplier.id}
                              onClick={(event) => handleSupplierSelect(supplier, event)}
                              onMouseDown={(event) => {
                                // 防止输入框失焦
                                event.preventDefault()
                              }}
                              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{supplier.name}</div>
                              {supplier.contact && (
                                <div className="text-sm text-gray-500">联系人: {supplier.contact}</div>
                              )}
                            </div>
                          ))}
                          
                          {/* 如果输入的内容不在现有供应商中，显示创建新供应商选项 */}
                          {supplierInput.trim() && !filtered_suppliers.some(s => s.name.toLowerCase() === supplierInput.toLowerCase()) && (
                            <div className={`px-4 py-3 border-t ${isBoss ? 'bg-blue-50 border-blue-100' : 'bg-yellow-50 border-yellow-100'}`}>
                              <div className={`flex items-center ${isBoss ? 'text-blue-600' : 'text-yellow-600'}`}>
                                {creatingSupplier ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    创建新供应商中...
                                  </>
                                ) : isBoss ? (
                                  <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    提交时创建: "{supplierInput}"
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    权限不足：仅老板可创建新供应商
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">
                          {supplierInput.trim() ? (
                            <div>
                              <div>未找到匹配的供应商</div>
                              {isBoss ? (
                                <div className="text-sm mt-1 text-blue-600">
                                  提交时将创建新供应商: "{supplierInput}"
                                </div>
                              ) : (
                                <div className="text-sm mt-1 text-yellow-600">
                                  权限不足：仅老板可创建新供应商
                                </div>
                              )}
                            </div>
                          ) : (
                            '请输入供应商名称进行搜索'
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {errors.supplier_name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.supplier_name.message}
                </p>
              )}
            </div>
          </div>
        </div>
        

        
        {/* 提交按钮 */}
        <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'flex-row space-x-4'}`}>
          <MobileButton
            type="submit"
            variant="primary"
            size={isMobile ? 'lg' : 'md'}
            disabled={submitting || photos.length === 0}
            loading={submitting}
            fullWidth={isMobile}
            className={isMobile ? '' : 'flex-1'}
          >
            {submitting ? '提交中...' : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                提交采购记录
              </>
            )}
          </MobileButton>
          
          <MobileButton
            type="button"
            variant="secondary"
            size={isMobile ? 'lg' : 'md'}
            fullWidth={isMobile}
            onClick={() => {
              reset()
              setPhotos([])
              const textarea = document.getElementById('ai_description') as HTMLTextAreaElement
              if (textarea) textarea.value = ''
            }}
          >
            重置
          </MobileButton>
        </div>
      </form>
      

    </div>
  )
}
