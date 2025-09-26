# 文档 04：React前端开发规范文档

## 一、项目结构与组件架构

### 1.1 目录结构规范

```
src/
├── components/          # 通用组件
│   ├── Layout.tsx       # 布局组件
│   ├── ProtectedRoute.tsx # 路由保护
│   └── ui/              # UI基础组件
├── pages/               # 页面组件
│   ├── Login.tsx
│   ├── Home.tsx
│   ├── PurchaseEntry.tsx
│   ├── PurchaseList.tsx
│   ├── InventoryList.tsx
│   ├── ProductEntry.tsx
│   └── SalesList.tsx
├── hooks/               # 自定义Hook
│   ├── useAuth.tsx
│   └── useDeviceDetection.tsx
├── services/            # API服务
│   ├── api.ts
│   └── errorHandler.ts
├── types/               # TypeScript类型定义
│   └── index.ts
├── utils/               # 工具函数
│   ├── format.ts
│   ├── validation.ts
│   └── pinyinSort.ts
└── styles/              # 样式文件
    └── mobile.css
```

### 1.2 组件命名规范

- **页面组件**：使用PascalCase，如`PurchaseEntry`、`InventoryList`
- **通用组件**：使用PascalCase，如`Layout`、`ProtectedRoute`
- **Hook函数**：使用camelCase，以`use`开头，如`useAuth`、`useDeviceDetection`
- **工具函数**：使用camelCase，如`formatPrice`、`validateForm`
- **类型定义**：使用PascalCase，如`PurchaseItem`、`ApiResponse`

### 1.3 状态管理规范

**使用Context + useReducer模式：**
```typescript
// AuthContext示例
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
}

type AuthAction = 
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload, isAuthenticated: true, loading: false }
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, loading: false }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}
```

## 二、采购录入组件规范（PurchaseEntry）

### 2.1 组件状态管理

**状态接口定义：**
```typescript
interface PurchaseEntryState {
  // 基础信息
  purchaseName: string
  purchaseType: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL'
  supplierId: string
  totalPrice: number
  
  // 类型特定字段
  pricePerGram?: number
  weight?: number
  beadDiameter?: number
  beadsPerString?: number
  pieceCount?: number
  
  // 图片和描述
  photos: string[]
  description?: string
  quality?: string
  
  // UI状态
  loading: boolean
  uploading: boolean
  errors: { [key: string]: string }
  
  // 供应商相关
  suppliers: Supplier[]
  supplierInput: string
  showSupplierDropdown: boolean
}

const validatePurchaseForm = (data: PurchaseEntryState): ValidationResult => {
  const errors: string[] = []
  
  // 基础验证
  if (!data.purchaseName.trim()) {
    errors.push('采购名称不能为空')
  }
  
  if (!data.supplierId) {
    errors.push('请选择供应商')
  }
  
  if (data.totalPrice <= 0) {
    errors.push('总价格必须大于0')
  }
  
  if (data.photos.length === 0) {
    errors.push('请至少上传一张图片')
  }
  
  // 按类型验证
  if (data.purchaseType === 'LOOSE_BEADS' || data.purchaseType === 'BRACELET') {
    if (data.pricePerGram <= 0) {
      errors.push('克价必须大于0')
    }
    if (data.weight <= 0) {
      errors.push('重量必须大于0')
    }
    if (data.beadDiameter <= 0) {
      errors.push('珠子直径必须大于0')
    }
    
    // 手串额外验证
    if (data.purchaseType === 'BRACELET' && data.beadsPerString <= 0) {
      errors.push('每串颗数必须大于0')
    }
  }
  
  if (data.purchaseType === 'ACCESSORIES' || data.purchaseType === 'FINISHED_MATERIAL') {
    if (data.pieceCount <= 0) {
      errors.push('片数/件数必须大于0')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

### 2.2 图片上传组件规范

**ImageUpload组件：**
```typescript
interface ImageUploadProps {
  photos: string[]
  fileDataList: File[]
  uploading: boolean
  onPhotosChange: (photos: string[]) => void
  onFileDataChange: (files: File[]) => void
  onUploadStart: () => void
  onUploadEnd: () => void
  maxFiles?: number // 默认5
  maxFileSize?: number // 默认10MB
}

// 使用react-dropzone实现拖拽上传
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: {
    'image/*': ['.jpeg', '.jpg', '.png', '.webp']
  },
  maxFiles: maxFiles || 5,
  maxSize: maxFileSize || 10 * 1024 * 1024,
  onDrop: handleFilesDrop,
  onDropRejected: handleDropRejected
})
```

**图片处理逻辑：**
```typescript
const handleFilesDrop = async (acceptedFiles: File[]) => {
  onUploadStart()
  
  try {
    const formData = new FormData()
    acceptedFiles.forEach(file => {
      formData.append('images', file)
    })
    
    const response = await uploadApi.uploadPurchaseImages(formData)
    
    if (response.success) {
      const newPhotos = response.data.uploadedFiles.map(file => file.url)
      onPhotosChange([...photos, ...newPhotos])
      onFileDataChange([...fileDataList, ...acceptedFiles])
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    // 显示错误提示
  } finally {
    onUploadEnd()
  }
}
```

### 2.3 供应商选择组件规范

**SupplierSelect组件：**
```typescript
interface SupplierSelectProps {
  suppliers: Supplier[]
  selectedSupplierId: string
  inputValue: string
  showDropdown: boolean
  onSupplierSelect: (supplierId: string) => void
  onInputChange: (value: string) => void
  onDropdownToggle: (show: boolean) => void
  allowCreate?: boolean // 是否允许创建新供应商
}

// 供应商筛选逻辑
const filteredSuppliers = suppliers.filter(supplier =>
  supplier.name.toLowerCase().includes(inputValue.toLowerCase())
)

// 拼音排序
const sortedSuppliers = sortByPinyin(filteredSuppliers)
```

## 三、采购列表组件规范（完整更新版）

### 3.1 PurchaseList组件状态管理

**完整状态接口：**
```typescript
interface PurchaseListState {
  purchases: Purchase[]
  loading: boolean
  error: string | null
  
  // 分页状态
  currentPage: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
  
  // 搜索和筛选状态
  searchTerm: string
  purchaseCodeSearch: string
  selectedQualities: string[]
  selectedTypes: string[]
  selectedSuppliers: string[]
  
  // 范围筛选状态
  dateRange: { start: string; end: string }
  diameterRange: { min: number | null; max: number | null }
  specificationRange: { min: number | null; max: number | null }
  pricePerGramRange: { min: number | null; max: number | null }
  totalPriceRange: { min: number | null; max: number | null }
  
  // 排序状态
  sortBy: string
  sortOrder: 'asc' | 'desc'
  
  // UI状态
  showFilters: { [key: string]: boolean }
  showMobileFilters: boolean
  showDetailModal: boolean
  selectedPurchase: Purchase | null
  
  // 供应商数据
  suppliers: Supplier[]
}
```

### 3.2 表头筛选器组件规范

**筛选器渲染函数：**
```typescript
const renderColumnFilter = (column: string) => {
  const filterTypes = {
    purchaseName: 'search',
    purchaseCode: 'search',
    quality: 'multiSelect',
    purchaseType: 'multiSelect',
    supplier: 'multiSelectWithSearch',
    beadDiameter: 'range',
    specification: 'range',
    pricePerGram: 'range',
    totalPrice: 'range',
    purchaseDate: 'dateRange'
  }
  
  return (
    <div className="relative">
      <button 
        onClick={() => toggleFilter(column)}
        className="p-1 hover:bg-gray-100 rounded"
      >
        <FunnelIcon className="h-4 w-4" />
      </button>
      
      {showFilters[column] && (
        <div className="absolute top-8 left-0 z-50 bg-white border rounded-lg shadow-lg p-4 min-w-64">
          {renderFilterContent(column, filterTypes[column])}
        </div>
      )}
    </div>
  )
}
```

**多选筛选器实现：**
```typescript
const renderMultiSelectFilter = (column: string, options: any[], selected: string[]) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-medium">选择{getColumnLabel(column)}</span>
        <button 
          onClick={() => clearFilter(column)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          清除
        </button>
      </div>
      
      <div className="max-h-48 overflow-y-auto space-y-1">
        {options.map(option => (
          <label key={option.value} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(e) => handleMultiSelectChange(column, option.value, e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
      
      <button
        onClick={() => applyFilters()}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        应用筛选
      </button>
    </div>
  )
}
```

### 3.3 范围筛选器实现

**数值范围筛选：**
```typescript
const renderRangeFilter = (column: string, range: { min: number | null; max: number | null }) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="font-medium">{getColumnLabel(column)}范围</span>
        <button 
          onClick={() => clearRangeFilter(column)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          清除
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">最小值</label>
          <input
            type="number"
            value={range.min || ''}
            onChange={(e) => handleRangeChange(column, 'min', e.target.value)}
            placeholder="最小值"
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">最大值</label>
          <input
            type="number"
            value={range.max || ''}
            onChange={(e) => handleRangeChange(column, 'max', e.target.value)}
            placeholder="最大值"
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => applyRangeFilter(column)}
          className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm"
        >
          应用
        </button>
        <button
          onClick={() => clearRangeFilter(column)}
          className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 text-sm"
        >
          清除
        </button>
      </div>
    </div>
  )
}
```

## 四、原材料库存组件开发规范（重要更新）

### 4.1 InventoryList组件架构

**组件状态管理：**
```typescript
interface InventoryListState {
  materials: MaterialItem[]
  loading: boolean
  error: string | null
  
  // 分页和筛选
  pagination: PaginationInfo
  filters: InventoryFilters
  
  // UI状态
  selectedMaterial: MaterialItem | null
  showDetailModal: boolean
  showRestockModal: boolean
  showAdjustModal: boolean
}

interface MaterialItem {
  id: string
  materialCode: string
  materialName: string
  materialType: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL'
  quality: string
  remainingQuantity: number
  inventoryUnit: string
  unitCost: number
  totalValue: number
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  supplierName: string
  photos: string[]
  lastUpdated: string
}
```

### 4.2 库存状态显示组件

**库存状态标签：**
```typescript
const StockStatusBadge = ({ status, quantity }: { status: string; quantity: number }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return { color: 'bg-green-100 text-green-800', label: '充足' }
      case 'LOW_STOCK':
        return { color: 'bg-yellow-100 text-yellow-800', label: '偏低' }
      case 'OUT_OF_STOCK':
        return { color: 'bg-red-100 text-red-800', label: '缺货' }
      default:
        return { color: 'bg-gray-100 text-gray-800', label: '未知' }
    }
  }
  
  const config = getStatusConfig(status)
  
  return (
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
      <span className="text-sm text-gray-600">{quantity}</span>
    </div>
  )
}
```

### 4.3 库存操作组件

**补货操作组件：**
```typescript
interface RestockFormProps {
  material: MaterialItem
  onSubmit: (data: RestockData) => void
  onCancel: () => void
  loading?: boolean
}

interface RestockData {
  quantity: number
  unitCost: number
  totalCost: number
  supplierId: string
  notes?: string
  photos?: string[]
}

const RestockForm = ({ material, onSubmit, onCancel, loading }: RestockFormProps) => {
  const [formData, setFormData] = useState<RestockData>({
    quantity: 0,
    unitCost: material.unitCost,
    totalCost: 0,
    supplierId: '',
    notes: '',
    photos: []
  })
  
  // 自动计算总成本
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      totalCost: prev.quantity * prev.unitCost
    }))
  }, [formData.quantity, formData.unitCost])
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData) }}>
      {/* 表单字段 */}
    </form>
  )
}
```

### 4.4 库存调整组件

**库存调整表单：**
```typescript
interface AdjustFormProps {
  material: MaterialItem
  onSubmit: (data: AdjustData) => void
  onCancel: () => void
}

interface AdjustData {
  type: 'increase' | 'decrease'
  quantity: number
  reason: string
  notes?: string
}

const AdjustForm = ({ material, onSubmit, onCancel }: AdjustFormProps) => {
  const [formData, setFormData] = useState<AdjustData>({
    type: 'increase',
    quantity: 0,
    reason: '',
    notes: ''
  })
  
  const reasonOptions = {
    increase: ['盘点发现多余', '退货入库', '其他增加'],
    decrease: ['损耗', '丢失', '质量问题', '其他减少']
  }
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData) }}>
      {/* 调整类型选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          调整类型
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="increase"
              checked={formData.type === 'increase'}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'increase' | 'decrease' }))}
              className="mr-2"
            />
            增加库存
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="decrease"
              checked={formData.type === 'decrease'}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'increase' | 'decrease' }))}
              className="mr-2"
            />
            减少库存
          </label>
        </div>
      </div>
      
      {/* 其他表单字段 */}
    </form>
  )
}
```

## 五、移动端适配规范

### 5.1 响应式设计原则

**断点设置：**
```css
/* Tailwind CSS 断点 */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */

/* 移动端优先设计 */
.container {
  @apply px-4 sm:px-6 lg:px-8;
}

.grid-responsive {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4;
}
```

**移动端组件适配：**
```typescript
const useDeviceDetection = () => {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    
    return () => window.removeEventListener('resize', checkDevice)
  }, [])
  
  return { isMobile }
}

// 在组件中使用
const PurchaseList = () => {
  const { isMobile } = useDeviceDetection()
  
  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {isMobile ? <MobileTable /> : <DesktopTable />}
    </div>
  )
}
```

### 5.2 移动端表格组件

**MobileTable组件：**
```typescript
interface MobileTableProps<T> {
  data: T[]
  renderCard: (item: T, index: number) => React.ReactNode
  loading?: boolean
  emptyMessage?: string
}

const MobileTable = <T,>({ data, renderCard, loading, emptyMessage }: MobileTableProps<T>) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }
  
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage || '暂无数据'}
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="bg-white rounded-lg shadow">
          {renderCard(item, index)}
        </div>
      ))}
    </div>
  )
}
```

### 5.3 移动端表单组件

**MobileForm组件：**
```typescript
interface MobileFormProps {
  title: string
  children: React.ReactNode
  onSubmit: () => void
  onCancel: () => void
  submitText?: string
  loading?: boolean
}

const MobileForm = ({ 
  title, 
  children, 
  onSubmit, 
  onCancel, 
  submitText = '提交', 
  loading 
}: MobileFormProps) => {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={onCancel} className="text-gray-600">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="w-6"></div>
      </div>
      
      {/* 表单内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
      
      {/* 底部按钮 */}
      <div className="p-4 border-t bg-white">
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? '提交中...' : submitText}
          </button>
        </div>
      </div>
    </div>
  )
}
```

## 六、SKU销售管理组件规范

### 6.1 SalesList组件架构

**组件状态管理：**
```typescript
interface SalesListState {
  skus: SkuItem[]
  loading: boolean
  error: string | null
  
  // 分页和筛选
  pagination: PaginationInfo
  filters: SkuFilters
  
  // UI状态
  selectedSku: SkuItem | null
  showDetailModal: boolean
  showSellModal: boolean
  showDestroyModal: boolean
  showAdjustModal: boolean
}

interface SkuItem {
  id: string
  skuCode: string
  skuName: string
  specification: string
  totalQuantity: number
  availableQuantity: number
  sellingPrice: number
  unitPrice: number
  materialCost: number
  laborCost: number
  craftCost: number
  totalCost: number
  totalValue: number
  profitMargin: number
  photos: string[]
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
  lastSaleDate?: string
}
```

### 6.2 SKU详情弹窗组件

**SkuDetailModal组件：**
```typescript
interface SkuDetailModalProps {
  sku: SkuItem
  isOpen: boolean
  onClose: () => void
  onSell: () => void
  onDestroy: () => void
  onAdjust: () => void
}

const SkuDetailModal = ({ sku, isOpen, onClose, onSell, onDestroy, onAdjust }: SkuDetailModalProps) => {
  const [activeTab, setActiveTab] = useState<'info' | 'trace' | 'history'>('info')
  const { canViewPrice, canSell, canDestroy, canAdjust } = useSkuPermissions()
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        {/* 头部信息 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">{sku.skuName}</h2>
            <p className="text-gray-600">SKU编号: {sku.skuCode}</p>
          </div>
          <div className="flex space-x-2">
            {canSell && (
              <button onClick={onSell} className="btn-primary">
                销售
              </button>
            )}
            {canDestroy && (
              <button onClick={onDestroy} className="btn-danger">
                销毁
              </button>
            )}
            {canAdjust && (
              <button onClick={onAdjust} className="btn-secondary">
                调整
              </button>
            )}
          </div>
        </div>
        
        {/* 标签页 */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex space-x-8">
            {['info', 'trace', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'info' ? '基本信息' : tab === 'trace' ? '溯源信息' : '操作历史'}
              </button>
            ))}
          </nav>
        </div>
        
        {/* 标签页内容 */}
        <div className="min-h-64">
          {activeTab === 'info' && <SkuInfoTab sku={sku} canViewPrice={canViewPrice} />}
          {activeTab === 'trace' && <SkuTraceTab skuId={sku.id} />}
          {activeTab === 'history' && <SkuHistoryTab skuId={sku.id} />}
        </div>
      </div>
    </Modal>
  )
}
```

### 6.3 SKU销售表单组件

**SkuSellForm组件：**
```typescript
interface SkuSellFormProps {
  sku: SkuItem
  onSubmit: (data: SellData) => void
  onCancel: () => void
  loading?: boolean
}

interface SellData {
  quantity: number
  customerName: string
  customerPhone: string
  customerAddress?: string
  saleChannel?: string
  notes?: string
  actualTotalPrice?: number
}

const SkuSellForm = ({ sku, onSubmit, onCancel, loading }: SkuSellFormProps) => {
  const [formData, setFormData] = useState<SellData>({
    quantity: 1,
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    saleChannel: '',
    notes: '',
    actualTotalPrice: sku.sellingPrice
  })
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}
    
    if (formData.quantity <= 0 || formData.quantity > sku.availableQuantity) {
      newErrors.quantity = `数量必须在1-${sku.availableQuantity}之间`
    }
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = '请输入客户姓名'
    }
    
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = '请输入客户电话'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData)
    }
  }
  
  return (
    <div className="space-y-4">
      {/* 表单字段 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          销售数量 *
        </label>
        <input
          type="number"
          min="1"
          max={sku.availableQuantity}
          value={formData.quantity}
          onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
          className={`w-full px-3 py-2 border rounded-md ${errors.quantity ? 'border-red-500' : 'border-gray-300'}`}
        />
        {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
        <p className="text-gray-500 text-sm mt-1">可售数量: {sku.availableQuantity}</p>
      </div>
      
      {/* 其他表单字段... */}
      
      {/* 按钮 */}
      <div className="flex space-x-3 pt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
        >
          {loading ? '提交中...' : '确认销售'}
        </button>
      </div>
    </div>
  )
}
```

### 6.4 SKU销毁表单组件

**SkuDestroyForm组件：**
```typescript
interface SkuDestroyFormProps {
  sku: SkuItem
  onSubmit: (data: DestroyData) => void
  onCancel: () => void
  loading?: boolean
}

interface DestroyData {
  quantity: number
  reason: string
  returnToMaterial: boolean
  selectedMaterials?: string[]
  customReturnQuantities?: { [materialId: string]: number }
}

const SkuDestroyForm = ({ sku, onSubmit, onCancel, loading }: SkuDestroyFormProps) => {
  const [formData, setFormData] = useState<DestroyData>({
    quantity: 1,
    reason: '',
    returnToMaterial: true,
    selectedMaterials: [],
    customReturnQuantities: {}
  })
  
  const [materials, setMaterials] = useState<SkuMaterialInfo[]>([])
  
  // 获取SKU使用的原材料信息
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await skuApi.getMaterials(sku.id)
        if (response.success) {
          setMaterials(response.data)
        }
      } catch (error) {
        console.error('获取原材料信息失败:', error)
      }
    }
    
    if (formData.returnToMaterial) {
      fetchMaterials()
    }
  }, [sku.id, formData.returnToMaterial])
  
  const reasonOptions = [
    '质量问题',
    '损坏',
    '过期',
    '客户退货',
    '拆散重做',
    '其他'
  ]
  
  return (
    <div className="space-y-4">
      {/* 销毁数量 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          销毁数量 *
        </label>
        <input
          type="number"
          min="1"
          max={sku.availableQuantity}
          value={formData.quantity}
          onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      
      {/* 销毁原因 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          销毁原因 *
        </label>
        <select
          value={formData.reason}
          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">请选择销毁原因</option>
          {reasonOptions.map(reason => (
            <option key={reason} value={reason}>{reason}</option>
          ))}
        </select>
      </div>
      
      {/* 是否返还原材料 */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.returnToMaterial}
            onChange={(e) => setFormData(prev => ({ ...prev, returnToMaterial: e.target.checked }))}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">返还原材料到库存</span>
        </label>
      </div>
      
      {/* 原材料选择 */}
      {formData.returnToMaterial && materials.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择返还的原材料
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {materials.map(material => (
              <div key={material.materialId} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.selectedMaterials?.includes(material.materialId) || false}
                    onChange={(e) => {
                      const selected = formData.selectedMaterials || []
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          selectedMaterials: [...selected, material.materialId]
                        }))
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          selectedMaterials: selected.filter(id => id !== material.materialId)
                        }))
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{material.materialName}</span>
                </div>
                <span className="text-xs text-gray-500">
                  使用量: {material.quantityUsedBeads + material.quantityUsedPieces}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 按钮 */}
      <div className="flex space-x-3 pt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700"
        >
          取消
        </button>
        <button
          onClick={() => onSubmit(formData)}
          disabled={loading || !formData.reason}
          className="flex-1 py-2 bg-red-600 text-white rounded-md disabled:opacity-50"
        >
          {loading ? '处理中...' : '确认销毁'}
        </button>
      </div>
    </div>
  )
}
```

### 6.5 SKU溯源信息组件

**SkuTraceView组件：**
```typescript
interface SkuTraceViewProps {
  skuId: string
}

const SkuTraceView = ({ skuId }: SkuTraceViewProps) => {
  const [traceData, setTraceData] = useState<SkuTraceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchTraceData = async () => {
      try {
        const response = await skuApi.getTraces(skuId)
        if (response.success) {
          setTraceData(response.data)
        }
      } catch (error) {
        console.error('获取溯源信息失败:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTraceData()
  }, [skuId])
  
  if (loading) {
    return <div className="animate-pulse">加载中...</div>
  }
  
  if (!traceData) {
    return <div className="text-gray-500">暂无溯源信息</div>
  }
  
  return (
    <div className="space-y-4">
      {/* 制作信息 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">制作信息</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">制作时间:</span>
            <span className="ml-2">{formatDate(traceData.createdAt)}</span>
          </div>
          <div>
            <span className="text-gray-600">制作人员:</span>
            <span className="ml-2">{traceData.creatorName}</span>
          </div>
          <div>
            <span className="text-gray-600">制作模式:</span>
            <span className="ml-2">{traceData.productionMode === 'DIRECT_TRANSFORM' ? '直接转化' : '组合制作'}</span>
          </div>
          <div>
            <span className="text-gray-600">制作数量:</span>
            <span className="ml-2">{traceData.productionQuantity}</span>
          </div>
        </div>
      </div>
      
      {/* 原材料信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">使用原材料</h4>
        <div className="space-y-2">
          {traceData.materials.map(material => (
            <div key={material.materialId} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center space-x-3">
                {material.photos && material.photos.length > 0 && (
                  <img
                    src={material.photos[0]}
                    alt={material.materialName}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div>
                  <p className="font-medium">{material.materialName}</p>
                  <p className="text-sm text-gray-600">{material.supplierName}</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p>使用量: {material.quantityUsedBeads + material.quantityUsedPieces}</p>
                <p className="text-gray-600">单价: ¥{material.unitCost}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 成本分析 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">成本分析</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">原材料成本:</span>
            <span>¥{traceData.materialCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">人工成本:</span>
            <span>¥{traceData.laborCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">工艺成本:</span>
            <span>¥{traceData.craftCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium border-t border-gray-200 pt-2">
            <span>总成本:</span>
            <span>¥{traceData.totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 6.6 SKU操作历史组件

**SkuHistoryView组件：**
```typescript
interface SkuHistoryViewProps {
  skuId: string
}

const SkuHistoryView = ({ skuId }: SkuHistoryViewProps) => {
  const [logs, setLogs] = useState<SkuInventoryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  
  const fetchLogs = async (page: number = 1) => {
    try {
      setLoading(true)
      const response = await skuApi.getHistory(skuId, { page, limit: pagination.limit })
      if (response.success) {
        setLogs(response.data.logs)
        setPagination(response.data.pagination)
      }
    } catch (error) {
      console.error('获取操作历史失败:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchLogs()
  }, [skuId])
  
  const getActionLabel = (action: string) => {
    const labels = {
      'CREATE': '创建',
      'SELL': '销售',
      'DESTROY': '销毁',
      'ADJUST_INCREASE': '调增',
      'ADJUST_DECREASE': '调减',
      'RESTOCK': '补货'
    }
    return labels[action] || action
  }
  
  const getActionColor = (action: string) => {
    const colors = {
      'CREATE': 'text-green-600',
      'SELL': 'text-blue-600',
      'DESTROY': 'text-red-600',
      'ADJUST_INCREASE': 'text-green-600',
      'ADJUST_DECREASE': 'text-orange-600',
      'RESTOCK': 'text-purple-600'
    }
    return colors[action] || 'text-gray-600'
  }
  
  // 解析返还原材料信息
  const parseReturnedMaterials = (notes: string): string | null => {
    if (!notes) return null
    
    const returnMatch = notes.match(/返还原材料：([^。]+)/)
    if (returnMatch && returnMatch[1]) {
      return returnMatch[1].trim()
    }
    
    return null
  }
  
  if (loading) {
    return <div className="animate-pulse">加载中...</div>
  }
  
  return (
    <div className="space-y-4">
      {logs.length === 0 ? (
        <div className="text-gray-500 text-center py-8">暂无操作历史</div>
      ) : (
        <>
          <div className="space-y-3">
            {logs.map(log => {
              const returnedMaterials = parseReturnedMaterials(log.notes || '')
              
              return (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`font-medium ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">数量变化:</span>
                          <span className={`ml-2 font-medium ${
                            log.quantityChange > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">操作后数量:</span>
                          <span className="ml-2">{log.quantityAfter}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">操作人员:</span>
                          <span className="ml-2">{log.userName}</span>
                        </div>
                        {log.totalAmount && (
                          <div>
                            <span className="text-gray-600">金额:</span>
                            <span className="ml-2">¥{log.totalAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      
                      {log.reason && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-600">原因:</span>
                          <span className="ml-2">{log.reason}</span>
                        </div>
                      )}
                      
                      {returnedMaterials && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-600">🔄 返还原材料:</span>
                          <span className="ml-2 text-green-600">{returnedMaterials}</span>
                        </div>
                      )}
                      
                      {log.notes && !returnedMaterials && (
                        <div className="mt-2 text-sm text-gray-600">
                          备注: {log.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={fetchLogs}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

### 6.7 SKU权限控制Hook

**useSkuPermissions Hook：**
```typescript
interface SkuPermissions {
  canViewPrice: boolean
  canSell: boolean
  canDestroy: boolean
  canAdjust: boolean
  canViewTrace: boolean
}

function useSkuPermissions(): SkuPermissions {
  const { user } = useAuth()
  
  return {
    canViewPrice: user?.role === 'BOSS',
    canSell: user?.role === 'BOSS',
    canDestroy: user?.role === 'BOSS',
    canAdjust: user?.role === 'BOSS',
    canViewTrace: true
  }
}
```

### 6.8 SKU API服务

**服务定义：**
```typescript
export const skuApi = {
  // 获取SKU列表
  list: (params: SkuListParams) => 
    apiClient.get(`/skus${buildQueryString(params)}`),
  
  // 获取SKU详情
  get: (id: string) => 
    apiClient.get(`/skus/${id}`),
  
  // 销售确认
  sell: (id: string, data: SellData) => 
    apiClient.post(`/skus/${id}/sell`, data),
  
  // 销毁操作
  destroy: (id: string, data: DestroyData) => 
    apiClient.post(`/skus/${id}/destroy`, data),
  
  // 库存调整
  adjustQuantity: (id: string, data: AdjustData) => 
    apiClient.post(`/skus/${id}/adjust`, data),
  
  // 获取溯源信息
  getTraces: (id: string) => 
    apiClient.get(`/skus/${id}/traces`),
  
  // 获取操作历史
  getHistory: (id: string, params: HistoryParams) => 
    apiClient.get(`/skus/${id}/history${buildQueryString(params)}`)
}
```

### 6.9 SKU状态管理

**Context定义：**
```typescript
interface SkuContextValue {
  skus: SkuItem[]
  loading: boolean
  error: string | null
  selectedSku: SkuItem | null
  fetchSkus: (params?: SkuListParams) => Promise<void>
  selectSku: (sku: SkuItem | null) => void
  sellSku: (id: string, data: SellData) => Promise<void>
  destroySku: (id: string, data: DestroyData) => Promise<void>
  adjustSku: (id: string, data: AdjustData) => Promise<void>
}

const SkuContext = createContext<SkuContextValue | null>(null)

export function useSkuContext() {
  const context = useContext(SkuContext)
  if (!context) {
    throw new Error('useSkuContext must be used within SkuProvider')
  }
  return context
}
```

### 6.10 SKU组件样式规范

**CSS类名约定：**
```css
/* SKU列表 */
.sku-list-container
.sku-list-grid
.sku-card
.sku-card-image
.sku-card-info
.sku-card-actions

/* SKU详情 */
.sku-detail-modal
.sku-detail-header
.sku-detail-content
.sku-detail-tabs
.sku-trace-section
.sku-history-section

/* SKU操作表单 */
.sku-sell-form
.sku-destroy-form
.sku-form-field
.sku-form-actions

/* SKU状态标签 */
.sku-stock-status
.sku-stock-low
.sku-stock-out
.sku-stock-normal
```

**响应式设计：**
- 桌面端：网格布局，每行4个SKU卡片
- 平板端：每行2个SKU卡片
- 手机端：单列布局，卡片堆叠

### 6.11 SKU销售管理组件规范（核心功能扩展）

#### 6.11.1 SKU销售列表组件 (SalesList)

**组件概述：**
SalesList组件是SKU销售管理的核心页面，提供完整的SKU查看、筛选、销售、销毁、调整等功能。支持移动端和桌面端响应式布局，具备完善的权限控制和操作审计功能。

**组件结构：**
```typescript
interface SalesListProps {
  // 基础数据
  skus: SkuItem[]
  loading: boolean
  error: string | null
  
  // 分页信息
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
   }
   
   // 筛选和排序
   filters: SkuListFilters
   onFiltersChange: (filters: SkuListFilters) => void
   
   // 操作回调
   onSkuSelect: (sku: SkuItem) => void
   onSell: (sku: SkuItem) => void
   onDestroy: (sku: SkuItem) => void
   onAdjust: (sku: SkuItem) => void
   onRefresh: () => void
 }
 
 interface SkuItem {
   id: string
   sku_id: string
   sku_code: string
   sku_name: string
   specification: string
   total_quantity: number
   available_quantity: number
   selling_price: number
   unit_price: number
   material_cost: number
   labor_cost: number
   craft_cost: number
   total_cost: number
   total_value: number
   profit_margin: number
   photos: string[]
   status: 'ACTIVE' | 'INACTIVE'
   created_at: string
   updated_at: string
   last_sale_date?: string
 }
 
 interface SkuListFilters {
   search: string
   status: ('ACTIVE' | 'INACTIVE')[]
   price_min?: number
   price_max?: number
   profit_margin_min?: number
   profit_margin_max?: number
   sort_by: string
   sort_order: 'asc' | 'desc'
 }
 ```
 
 **核心功能：**
 - **响应式布局**：桌面端表格视图，移动端卡片视图
 - **权限控制**：EMPLOYEE角色隐藏价格信息
 - **筛选排序**：支持多维度筛选和排序
 - **批量操作**：支持批量选择和操作
 - **实时更新**：操作后自动刷新列表
 
 #### 6.11.2 SKU详情弹窗组件 (SkuDetailModal)
 
 **组件概述：**
 SkuDetailModal组件提供SKU的详细信息查看和操作功能，包含基本信息、成本分析、溯源信息、库存变动历史等多个标签页。
 
 **组件结构：**
 ```typescript
 interface SkuDetailModalProps {
   sku: SkuItem
   mode: 'view' | 'sell' | 'destroy' | 'adjust'
   is_open: boolean
   onClose: () => void
   onSell?: (data: SellData) => void
   onDestroy?: (data: DestroyData) => void
   onAdjust?: (data: AdjustData) => void
   loading?: boolean
 }
 
 interface SkuDetailTabs {
   activeTab: 'info' | 'trace' | 'history'
   onTabChange: (tab: string) => void
 }
 ```
 
 **显示内容：**
 - **基本信息标签页**：SKU编号、名称、规格、库存状态、价格信息、创建时间
 - **成本分析**：原材料成本、人工成本、工艺成本、总成本、利润率（仅BOSS可见）
 - **溯源信息标签页**：使用的原材料详情、供应商信息、采购记录关联
 - **库存变动标签页**：操作历史记录、数量变化、操作员、时间等
 - **操作按钮**：销售、销毁、调整（根据权限显示）
 
 #### 6.11.3 SKU销售确认组件 (SkuSellForm)
 
 **组件概述：**
 SkuSellForm组件处理SKU销售操作，支持客户信息录入、销售渠道选择、优惠价格设置等功能。
 
 **组件结构：**
 ```typescript
 interface SkuSellFormProps {
   sku: SkuItem
   onSubmit: (data: SellData) => void
   onCancel: () => void
   loading?: boolean
 }
 
 interface SellData {
   quantity: number
   customer_name: string
   customer_phone: string
   customer_address?: string
   sale_channel?: string
   sale_source?: 'SKU_PAGE' | 'CUSTOMER_PAGE'
   notes?: string
   actual_total_price?: number
 }
 ```
 
 **表单字段：**
 - **销售数量**（必填，不超过可售数量）
 - **客户姓名**（必填）
 - **客户电话**（必填）
 - **客户地址**（可选）
 - **销售渠道**（可选：线上/线下/微信等）
 - **实际成交价**（可选，支持优惠价格）
 - **备注信息**（可选）
 
 **验证规则：**
 ```typescript
 const sellFormSchema = z.object({
   quantity: z.number().min(1).max(sku.available_quantity),
   customer_name: z.string().min(1, '请输入客户姓名'),
   customer_phone: z.string().min(1, '请输入客户电话'),
   customer_address: z.string().optional(),
   sale_channel: z.string().optional(),
   notes: z.string().optional(),
   actual_total_price: z.number().positive().optional()
 })
 ```
 
 #### 6.11.4 SKU销毁操作组件 (SkuDestroyForm)
 
 **组件概述：**
 SkuDestroyForm组件处理SKU销毁操作，支持选择性返还原材料到库存，并详细记录销毁原因和返还信息。
 
 **组件结构：**
 ```typescript
 interface SkuDestroyFormProps {
   sku: SkuItem
   onSubmit: (data: DestroyData) => void
   onCancel: () => void
   loading?: boolean
 }
 
 interface DestroyData {
   quantity: number
   reason: string
   return_to_material: boolean
   selected_materials?: string[]
   custom_return_quantities?: { [material_id: string]: number }
 }
 ```
 
 **表单字段：**
 - **销毁数量**（必填，不超过可售数量）
 - **销毁原因**（必填，支持预设选项：质量问题、损坏、过期等）
 - **是否返还原材料**（默认true）
 - **选择返还的原材料**（当选择返还时显示）
 - **自定义返还数量**（支持部分返还）
 
 **返还原材料逻辑：**
 - 自动获取SKU使用的原材料列表
 - 支持选择部分或全部原材料返还
 - 支持自定义返还数量（不超过原使用量）
 - 在库存变动日志中详细记录返还信息
 
 #### 6.11.5 SKU库存变动历史组件 (SkuHistoryView)
 
 **组件概述：**
 SkuHistoryView组件显示SKU的完整库存变动历史，支持筛选、搜索和分页，特别支持销毁操作时返还原材料信息的解析和显示。
 
 **组件结构：**
 ```typescript
 interface SkuHistoryViewProps {
   sku_id: string
   logs: SkuInventoryLog[]
   pagination: PaginationInfo
   filters: HistoryFilters
   onPageChange: (page: number) => void
   onFiltersChange: (filters: HistoryFilters) => void
 }
 
 interface SkuInventoryLog {
   id: string
   sku_id: string
   action: 'CREATE' | 'SELL' | 'DESTROY' | 'ADJUST_INCREASE' | 'ADJUST_DECREASE' | 'RESTOCK'
   quantity_change: number
   quantity_before: number
   quantity_after: number
   unit_price?: number
   total_amount?: number
   reason?: string
   notes?: string
   user_id: string
   user_name: string
   created_at: string
 }
 ```
 
 **返还原材料信息解析：**
 ```typescript
 // 解析notes字段中的返还原材料信息
 const parseReturnedMaterials = (notes: string): string | null => {
   if (!notes) return null
   
   const returnMatch = notes.match(/返还原材料：([^。]+)/)
   if (returnMatch && returnMatch[1]) {
     return returnMatch[1].trim()
   }
   
   return null
 }
 
 // 显示格式：🔄 返还原材料：[材料名称] [数量][单位]，...
 ```
 
 ## 八、成品制作页面组件规范（ProductEntry）
 
 ### 8.1 双模式制作系统
 
 **模式概述：**
 ProductEntry页面支持两种制作模式：直接转化模式和组合制作模式，满足不同的业务需求。
 
 **模式对比：**
 
 | 对比维度 | 直接转化模式 | 组合制作模式 |
 |----------|-------------|-------------|
 | **业务场景** | 单一原材料直接转化为销售成品 | 多种原材料组合制作复杂成品 |
 | **原材料选择** | 单选，每个原材料独立转化 | 多选，多种原材料组合使用 |
 | **图片处理** | 自动使用原材料图片 | 需要手动上传成品图片 |
 | **规格处理** | 自动使用原材料规格 | 需要手动输入成品规格 |
 | **成本计算** | 原材料成本+人工成本+工艺成本 | 多种原材料成本总和+人工成本+工艺成本 |
 | **制作数量** | 支持批量制作（受库存限制） | 支持批量制作（受库存限制） |
 | **库存验证** | 实时验证单个原材料库存 | 实时验证所有原材料库存 |
 | **适用场景** | 简单加工、包装、品质提升 | 复杂工艺、多材料组合 |
 
 ### 8.2 组件状态管理
 
 **核心状态接口：**
 ```typescript
 interface ProductionFormData {
   mode: 'DIRECT_TRANSFORM' | 'COMBINATION_CRAFT'
   sku_name: string
   description: string
   specification: string
   selected_materials: MaterialUsage[]
   labor_cost: number
   craft_cost: number
   selling_price: number
   profit_margin: number
   photos: string[]
   production_quantity: number
 }
 
 interface MaterialUsage {
   material: AvailableMaterial
   quantity_used_beads: number
   quantity_used_pieces: number
 }
 
 interface AvailableMaterial {
   id: string
   material_code: string
   material_name: string
   material_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED_MATERIAL'
   quality: string
   available_quantity: number
   inventory_unit: string
   unit_cost: number
   supplier_name: string
   photos: string[]
   specification?: string
 }
 ```
 
 ### 8.3 成本计算组件
 
 **实时成本计算：**
 ```typescript
 const calculateCost = async () => {
   if (formData.selected_materials.length === 0) {
     setCostCalculation(null)
     return
   }
 
   try {
     const productionQuantity = formData.mode === 'COMBINATION_CRAFT' ? formData.production_quantity : 1
     
     const materials = formData.selected_materials.map(item => ({
       material_id: item.material.id,
       quantity_used_beads: item.quantity_used_beads * productionQuantity,
       quantity_used_pieces: item.quantity_used_pieces * productionQuantity
     }))
 
     const response = await finished_product_api.calculate_cost({
       materials,
       labor_cost: formData.labor_cost * productionQuantity,
       craft_cost: formData.craft_cost * productionQuantity,
       profit_margin: formData.profit_margin
     })
 
     if (response.success && response.data) {
       setCostCalculation(response.data)
     }
   } catch (error) {
     console.error('计算成本失败:', error)
     toast.error('计算成本失败')
   }
 }
 ```
 
 ### 8.4 图片上传组件
 
 **拍照和上传功能：**
 ```typescript
 const handleCameraPhoto = async (dataUri: string) => {
   if (material_photos.length > 0) {
     toast.error('已有图片，请先删除当前图片再拍照')
     return
   }
   
   setUploading(true)
   
   try {
     const timestamp = Date.now()
     const fileName = `product_photo_${timestamp}.jpg`
     const base64Data = dataUri.split(',')[1]
     
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
     
     if (response.success && response.data) {
       const urls = response.data.urls
       setMaterialPhotos(urls)
       setFormData(prev => ({ ...prev, photos: urls }))
       stopCamera()
       toast.success('拍照上传成功')
     }
   } catch (error) {
     console.error('拍照上传失败:', error)
     toast.error('拍照上传失败，请重试')
   } finally {
     setUploading(false)
   }
 }
 ```
 
 ### 8.5 原材料选择组件
 
 **原材料筛选和搜索：**
 ```typescript
 const getFilteredMaterials = () => {
   let filteredMaterials = available_materials
   
   // 组合制作模式：按分类筛选
   if (formData.mode === 'COMBINATION_CRAFT') {
     filteredMaterials = filteredMaterials.filter(material => {
       const material_type = material.material_type
       return material_type === active_tab
     })
   }
   
   // 搜索筛选
   if (material_search.trim()) {
     const search_term = material_search.toLowerCase().trim()
     filteredMaterials = filteredMaterials.filter(material => {
       const material_name = material.material_name
       const supplier_name = material.supplier_name
       return material_name.toLowerCase().includes(search_term) ||
              (material.quality && material.quality.toLowerCase().includes(search_term)) ||
              (supplier_name && supplier_name.toLowerCase().includes(search_term))
     })
   }
   
   return filteredMaterials
 }
 ```

## 九、客户管理组件规范（2025年1月修复版）

### 9.1 客户管理页面组件（CustomerManagement）

**组件修复概述：**
本次修复针对客户管理页面进行了全面的认证状态管理、字段命名统一、数据计算优化等工作。主要解决了页面刷新时的网络连接错误、字段映射不一致、客户分析数据计算错误等核心问题。

**核心状态接口：**
```typescript
interface CustomerManagementState {
  // 客户数据
  customers: Customer[]
  selectedCustomer: Customer | null
  
  // 分析数据
  analytics: CustomerAnalytics | null
  
  // UI状态
  loading: boolean
  isModalOpen: boolean
  
  // 搜索和筛选
  searchTerm: string
  customerTypeFilter: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  
  // 分页
  currentPage: number
  pageSize: number
  totalPages: number
  totalCustomers: number
}

interface Customer {
  id: string
  customer_name: string
  customer_phone: string
  total_spent: number
  purchase_count: number
  last_purchase_date: string
  customer_type: 'NEW' | 'REPEAT' | 'VIP' | 'ACTIVE'
  notes?: string
  created_at: string
}

interface CustomerAnalytics {
  total_customers: number
  new_customers: number
  repeat_customers: number
  vip_customers: number
  active_customers: number
  average_order_value: number
  average_profit_margin: number
  refund_rate: number
  total_revenue: number
  total_orders: number
}
```

### 9.2 认证状态管理修复

**认证状态检查逻辑：**
```typescript
const CustomerManagement: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [state, setState] = useState<CustomerManagementState>(initialState)
  
  // 修复：等待认证状态初始化完成
  useEffect(() => {
    if (authLoading) {
      // 认证状态还在加载中，等待
      return
    }
    
    if (!isAuthenticated || !user) {
      // 认证失败，跳转登录页面
      router.push('/login')
      return
    }
    
    // 认证成功，加载客户数据
    loadCustomerData()
  }, [isAuthenticated, user, authLoading])
  
  const loadCustomerData = async () => {
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      // 并行加载客户列表和分析数据
      const [customersResponse, analyticsResponse] = await Promise.all([
        customer_api.getCustomers({
          page: state.currentPage,
          limit: state.pageSize,
          search: state.searchTerm,
          customer_type: state.customerTypeFilter,
          sort_by: state.sortBy,
          sort_order: state.sortOrder
        }),
        customer_api.getAnalytics()
      ])
      
      if (customersResponse.success && analyticsResponse.success) {
        setState(prev => ({
          ...prev,
          customers: customersResponse.data.customers,
          analytics: analyticsResponse.data,
          totalCustomers: customersResponse.data.pagination.total,
          totalPages: customersResponse.data.pagination.total_pages,
          loading: false
        }))
      }
    } catch (error) {
      console.error('加载客户数据失败:', error)
      handleApiError(error, '加载客户数据')
      setState(prev => ({ ...prev, loading: false }))
    }
  }
}
```

### 9.3 客户详情模态框组件（CustomerDetailModal）

**组件导入修复：**
```typescript
// 修复前（错误的导入）
import CustomerDetailModal from '../components/CustomerDetailModal'

// 修复后（正确的导入）
import { CustomerDetailModal } from '../components/CustomerDetailModal'
```

**模态框组件实现：**
```typescript
interface CustomerDetailModalProps {
  customer: Customer | null
  isOpen: boolean
  onClose: () => void
  onRefund: (purchaseId: string, refundData: RefundData) => void
  onSaleCreate: (saleData: SaleData) => void
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onRefund,
  onSaleCreate
}) => {
  const [purchaseHistory, setPurchaseHistory] = useState<CustomerPurchase[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  
  // 加载客户销售历史
  useEffect(() => {
    if (isOpen && customer) {
      loadPurchaseHistory()
    }
  }, [isOpen, customer])
  
  const loadPurchaseHistory = async () => {
    if (!customer) return
    
    setLoading(true)
    try {
      const response = await customer_api.getCustomerDetail(customer.id)
      if (response.success) {
        setPurchaseHistory(response.data.purchase_history)
      }
    } catch (error) {
      console.error('加载客户销售历史失败:', error)
      toast.error('加载客户销售历史失败')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>客户详情 - {customer?.customer_name}</DialogTitle>
        </DialogHeader>
        
        {/* 客户基本信息 */}
        <CustomerBasicInfo customer={customer} />
        
        {/* 销售历史记录 */}
        <CustomerPurchaseHistory 
          purchases={purchaseHistory}
          loading={loading}
          onRefund={onRefund}
          userRole={user?.role}
        />
        
        {/* 反向销售录入 */}
        <ReverseSaleForm 
          customer={customer}
          onSaleCreate={onSaleCreate}
        />
      </DialogContent>
    </Dialog>
  )
}
```

### 9.4 客户销售历史组件

**销售记录数据结构：**
```typescript
interface CustomerPurchase {
  id: string
  customer_id: string
  product_skus: {
    sku_code: string
    sku_name: string
    specification: string
    total_cost: number  // 仅BOSS角色可见
  }
  quantity: number
  total_price: number
  purchase_date: string
  status: 'ACTIVE' | 'REFUNDED'
  refund_date?: string
  refund_reason?: string
  refund_notes?: string
  notes?: string
}
```

**销售历史组件实现：**
```typescript
interface CustomerPurchaseHistoryProps {
  purchases: CustomerPurchase[]
  loading: boolean
  onRefund: (purchaseId: string, refundData: RefundData) => void
  userRole?: string
}

const CustomerPurchaseHistory: React.FC<CustomerPurchaseHistoryProps> = ({
  purchases,
  loading,
  onRefund,
  userRole
}) => {
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<CustomerPurchase | null>(null)
  
  const handleRefundClick = (purchase: CustomerPurchase) => {
    setSelectedPurchase(purchase)
    setRefundModalOpen(true)
  }
  
  const handleRefundSubmit = async (refundData: RefundData) => {
    if (selectedPurchase) {
      await onRefund(selectedPurchase.id, refundData)
      setRefundModalOpen(false)
      setSelectedPurchase(null)
    }
  }
  
  if (loading) {
    return <div className="flex justify-center py-8"><Spinner /></div>
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">销售历史</h3>
      
      {purchases.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暂无销售记录</p>
      ) : (
        <div className="space-y-2">
          {purchases.map((purchase) => (
            <div key={purchase.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{purchase.product_skus.sku_name}</span>
                    <Badge variant={purchase.status === 'ACTIVE' ? 'default' : 'destructive'}>
                      {purchase.status === 'ACTIVE' ? '正常' : '已退货'}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-1">
                    <p>SKU编号：{purchase.product_skus.sku_code}</p>
                    <p>规格：{purchase.product_skus.specification}</p>
                    <p>数量：{purchase.quantity}</p>
                    <p>销售价格：¥{purchase.total_price}</p>
                    {userRole === 'BOSS' && (
                      <p>成本：¥{purchase.product_skus.total_cost * purchase.quantity}</p>
                    )}
                    <p>销售时间：{formatDateTime(purchase.purchase_date)}</p>
                  </div>
                  
                  {purchase.status === 'REFUNDED' && (
                    <div className="text-sm text-red-600 mt-2">
                      <p>退货时间：{formatDateTime(purchase.refund_date!)}</p>
                      <p>退货原因：{purchase.refund_reason}</p>
                      {purchase.refund_notes && (
                        <p>退货备注：{purchase.refund_notes}</p>
                      )}
                    </div>
                  )}
                  
                  {purchase.notes && (
                    <p className="text-sm text-gray-600 mt-1">备注：{purchase.notes}</p>
                  )}
                </div>
                
                {purchase.status === 'ACTIVE' && (userRole === 'BOSS' || userRole === 'MANAGER') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRefundClick(purchase)}
                    className="text-red-600 hover:text-red-700"
                  >
                    退货
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 退货模态框 */}
      <RefundModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onSubmit={handleRefundSubmit}
        purchase={selectedPurchase}
      />
    </div>
  )
}
```

### 9.5 客户分析数据组件

**分析数据修复逻辑：**
```typescript
interface CustomerAnalyticsProps {
  analytics: CustomerAnalytics | null
  loading: boolean
}

const CustomerAnalyticsCards: React.FC<CustomerAnalyticsProps> = ({ analytics, loading }) => {
  if (loading || !analytics) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-6 w-16" />
        </Card>
      ))}
    </div>
  }
  
  const analyticsCards = [
    {
      title: '总客户数',
      value: analytics.total_customers,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: '新客户',
      value: analytics.new_customers,
      icon: UserPlus,
      color: 'text-green-600'
    },
    {
      title: '回头客',
      value: analytics.repeat_customers,
      icon: UserCheck,
      color: 'text-purple-600'
    },
    {
      title: 'VIP客户',
      value: analytics.vip_customers,
      icon: Crown,
      color: 'text-yellow-600'
    },
    {
      title: '活跃客户',
      value: analytics.active_customers,
      icon: Activity,
      color: 'text-orange-600'
    },
    {
      title: '平均订单价值',
      value: `¥${analytics.average_order_value.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: '平均毛利率',
      value: `${analytics.average_profit_margin.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      title: '退货率',
      value: `${analytics.refund_rate.toFixed(1)}%`,
      icon: RefreshCw,
      color: 'text-red-600'
    }
  ]
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {analyticsCards.map((card, index) => {
        const IconComponent = card.icon
        return (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className={`text-lg font-semibold ${card.color}`}>{card.value}</p>
              </div>
              <IconComponent className={`h-5 w-5 ${card.color}`} />
            </div>
          </Card>
        )
      })}
    </div>
  )
}
```

### 9.6 反向销售录入组件

**反向销售表单：**
```typescript
interface ReverseSaleFormProps {
  customer: Customer | null
  onSaleCreate: (saleData: SaleData) => void
}

interface SaleData {
  sku_id: string
  quantity: number
  selling_price: number
  notes?: string
}

const ReverseSaleForm: React.FC<ReverseSaleFormProps> = ({ customer, onSaleCreate }) => {
  const [formData, setFormData] = useState<SaleData>({
    sku_id: '',
    quantity: 1,
    selling_price: 0,
    notes: ''
  })
  const [availableSkus, setAvailableSkus] = useState<ProductSku[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // 加载可用SKU列表
  useEffect(() => {
    loadAvailableSkus()
  }, [])
  
  const loadAvailableSkus = async () => {
    setLoading(true)
    try {
      const response = await sku_api.getSkuList({ available_only: true })
      if (response.success) {
        setAvailableSkus(response.data.skus)
      }
    } catch (error) {
      console.error('加载SKU列表失败:', error)
      toast.error('加载SKU列表失败')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.sku_id) {
      toast.error('请选择SKU产品')
      return
    }
    
    if (formData.quantity <= 0) {
      toast.error('销售数量必须大于0')
      return
    }
    
    if (formData.selling_price <= 0) {
      toast.error('销售价格必须大于0')
      return
    }
    
    const selectedSku = availableSkus.find(sku => sku.id === formData.sku_id)
    if (selectedSku && formData.quantity > selectedSku.available_quantity) {
      toast.error(`库存不足，当前可用库存：${selectedSku.available_quantity}`)
      return
    }
    
    setSubmitting(true)
    try {
      await onSaleCreate(formData)
      // 重置表单
      setFormData({
        sku_id: '',
        quantity: 1,
        selling_price: 0,
        notes: ''
      })
      toast.success('销售记录创建成功')
    } catch (error) {
      console.error('创建销售记录失败:', error)
      toast.error('创建销售记录失败')
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">反向销售录入</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer_name">客户姓名</Label>
            <Input
              id="customer_name"
              value={customer?.customer_name || ''}
              disabled
              className="bg-gray-50"
            />
          </div>
          
          <div>
            <Label htmlFor="customer_phone">客户手机</Label>
            <Input
              id="customer_phone"
              value={customer?.customer_phone || ''}
              disabled
              className="bg-gray-50"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="sku_id">选择SKU产品</Label>
          <Select value={formData.sku_id} onValueChange={(value) => {
            setFormData(prev => ({ ...prev, sku_id: value }))
            // 自动填充建议价格
            const selectedSku = availableSkus.find(sku => sku.id === value)
            if (selectedSku) {
              setFormData(prev => ({ ...prev, selling_price: selectedSku.selling_price }))
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="请选择SKU产品" />
            </SelectTrigger>
            <SelectContent>
              {availableSkus.map((sku) => (
                <SelectItem key={sku.id} value={sku.id}>
                  <div className="flex justify-between items-center w-full">
                    <span>{sku.sku_name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      库存：{sku.available_quantity} | ¥{sku.selling_price}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantity">销售数量</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                quantity: parseInt(e.target.value) || 1 
              }))}
            />
          </div>
          
          <div>
            <Label htmlFor="selling_price">销售价格</Label>
            <Input
              id="selling_price"
              type="number"
              min="0"
              step="0.01"
              value={formData.selling_price}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                selling_price: parseFloat(e.target.value) || 0 
              }))}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="notes">销售备注</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="可选，最多200字符"
            maxLength={200}
          />
        </div>
        
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? '创建中...' : '创建销售记录'}
        </Button>
      </form>
    </div>
  )
}
```

### 9.7 退货处理组件

**退货模态框：**
```typescript
interface RefundModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (refundData: RefundData) => void
  purchase: CustomerPurchase | null
}

interface RefundData {
  refund_reason: string
  refund_notes: string
}

const RefundModal: React.FC<RefundModalProps> = ({ isOpen, onClose, onSubmit, purchase }) => {
  const [formData, setFormData] = useState<RefundData>({
    refund_reason: '',
    refund_notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  
  const refundReasons = [
    '质量问题',
    '尺寸不合适',
    '颜色差异',
    '客户不满意',
    '其他原因'
  ]
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.refund_reason) {
      toast.error('请选择退货原因')
      return
    }
    
    setSubmitting(true)
    try {
      await onSubmit(formData)
      // 重置表单
      setFormData({ refund_reason: '', refund_notes: '' })
      onClose()
    } catch (error) {
      console.error('退货处理失败:', error)
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>退货处理</DialogTitle>
        </DialogHeader>
        
        {purchase && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">退货商品信息</h4>
              <p>商品名称：{purchase.product_skus.sku_name}</p>
              <p>SKU编号：{purchase.product_skus.sku_code}</p>
              <p>销售数量：{purchase.quantity}</p>
              <p>销售价格：¥{purchase.total_price}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="refund_reason">退货原因</Label>
                <Select value={formData.refund_reason} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, refund_reason: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择退货原因" />
                  </SelectTrigger>
                  <SelectContent>
                    {refundReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="refund_notes">退货备注</Label>
                <Textarea
                  id="refund_notes"
                  value={formData.refund_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, refund_notes: e.target.value }))}
                  placeholder="可选，详细说明退货情况"
                  maxLength={500}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  取消
                </Button>
                <Button type="submit" disabled={submitting} variant="destructive">
                  {submitting ? '处理中...' : '确认退货'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

### 9.8 错误处理和用户体验优化

**统一错误处理：**
```typescript
const handleApiError = (error: any, operation: string) => {
  console.error(`${operation}失败:`, error)
  
  if (error.response?.status === 401) {
    // 认证错误，跳转登录
    toast.error('登录已过期，请重新登录')
    router.push('/login')
  } else if (error.response?.status === 403) {
    // 权限错误
    toast.error('您没有权限执行此操作')
  } else if (error.response?.status >= 500) {
    // 服务器错误
    toast.error('服务器错误，请稍后重试')
  } else if (error.message) {
    // 其他错误
    toast.error(error.message)
  } else {
    // 默认错误
    toast.error(`${operation}失败，请重试`)
  }
}
```

**加载状态管理：**
```typescript
const LoadingState: React.FC = () => (
  <div className="space-y-4">
    {/* 分析卡片骨架屏 */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-6 w-16" />
        </Card>
      ))}
    </div>
    
    {/* 客户列表骨架屏 */}
    <Card className="p-6">
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </Card>
  </div>
)
```

### 9.9 权限控制组件

**权限检查Hook：**
```typescript
const usePermission = () => {
  const { user } = useAuth()
  
  const checkPermission = (operation: string): boolean => {
    if (!user) return false
    
    const permissions = {
      'view_customers': ['BOSS', 'MANAGER', 'EMPLOYEE'],
      'view_cost_data': ['BOSS'],
      'process_refund': ['BOSS', 'MANAGER'],
      'edit_customer': ['BOSS', 'MANAGER'],
      'delete_customer': ['BOSS'],
      'create_sale': ['BOSS', 'MANAGER', 'EMPLOYEE']
    }
    
    return permissions[operation]?.includes(user.role) || false
  }
  
  return { checkPermission, userRole: user?.role }
}
```

**权限控制组件：**
```typescript
interface PermissionGuardProps {
  operation: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  operation, 
  children, 
  fallback = null 
}) => {
  const { checkPermission } = usePermission()
  
  if (!checkPermission(operation)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// 使用示例
<PermissionGuard operation="view_cost_data">
  <p>成本：¥{purchase.product_skus.total_cost * purchase.quantity}</p>
</PermissionGuard>

<PermissionGuard operation="process_refund">
  <Button onClick={() => handleRefundClick(purchase)}>退货</Button>
</PermissionGuard>
 ```