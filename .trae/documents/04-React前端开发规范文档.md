import React from 'react'
import { fixImageUrl } from '@/services/api'

interface ImageWithErrorHandlingProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fallbackSrc?: string
}

const ImageWithErrorHandling: React.FC<ImageWithErrorHandlingProps> = ({ 
  src, 
  alt, 
  fallbackSrc = '/placeholder-image.png',
  onError,
  ...props 
}) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    
    // 检查是否是CORS错误
    if (src.includes('api.dorblecapital.com') && window.location.hostname === 'localhost') {
      console.warn('图片CORS错误，尝试URL转换:', src)
      
      // 使用fixImageUrl函数进行URL转换
      const convertedUrl = fixImageUrl(src)
      
      if (convertedUrl !== src) {
        console.log('图片URL已转换:', { originalUrl: src, convertedUrl })
        target.src = convertedUrl
        return
      }
    }
    
    // 其他错误，显示占位图片
    console.error('图片加载失败，显示占位图片:', src)
    target.src = fallbackSrc
    target.alt = '图片加载失败'
    
    // 调用外部传入的错误处理函数
    if (onError) {
      onError(e)
    }
  }
  
  return (
    <img
      src={fixImageUrl(src)}
      alt={alt}
      onError={handleImageError}
      {...props}
    />
  )
}

export default ImageWithErrorHandling

interface FinishedProductGridProps {
  searchTerm?: string
  selectedQuality?: string
  lowStockOnly?: boolean
  specificationMin?: string
  specificationMax?: string
}

# 文档 04：React前端开发规范文档

## 一、TypeScript类型定义规范（重要更新）

### 1.1 核心数据类型定义

**采购相关类型（已更新）：**
```typescript
// 采购记录类型
interface Purchase {
  id: string
  purchase_code: string // **新增：采购编号字段**
  product_name: string
  product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
  supplier: {
    id: string
    name: string
  }
  quality: 'AA' | 'A' | 'AB' | 'B' | 'C'
  total_price: number
  photos: string[]
  purchase_date: string
  remaining_quantity: number
  created_at: string
}

// 可用原材料类型（已更新）
interface AvailableMaterial {
  purchase_id: string
  purchase_code?: string // **新增：采购编号字段**
  product_name: string
  product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
  available_quantity: number
  unit_cost: number
  photos: string[]
  specification?: string
}
```

**成品相关类型（已更新）：**
```typescript
// 配饰产品类型
interface AccessoryProduct {
  purchase_id: string
  purchase_code?: string // **新增：采购编号字段**
  product_name: string
  product_type: 'ACCESSORIES'
  available_quantity: number
  unit_cost: number
  photos: string[]
  specification?: string
}

// 成品类型
interface FinishedProduct {
  id: string
  product_code: string
  purchase_code?: string // **新增：采购编号字段**
  product_name: string
  description?: string
  specification?: string
  photos: string[]
  material_cost: number
  labor_cost: number
  craft_cost: number
  total_cost: number
  selling_price: number
  profit_margin: number
  status: 'AVAILABLE' | 'SOLD' | 'RESERVED'
  sku_id?: string // **新增：SKU关联字段**
  created_at: string
}

// 成本计算响应类型
interface CostCalculationResponse {
  material_cost: number
  labor_cost: number
  craft_cost: number
  total_cost: number
  profit_margin: number
  pricing_suggestion: {
    suggested_price: number
    min_price: number
    max_price: number
  }
  material_details: MaterialCostDetail[]
}

interface MaterialCostDetail {
  purchase_id: string
  product_name: string
  used_beads: number
  used_pieces: number
  unit_cost: number
  material_cost: number
}
```

**批次数据类型（已更新）：**
```typescript
// 批次数据类型
interface BatchData {
  purchase_id: string
  purchase_code?: string // **新增：采购编号字段**
  product_name: string
  product_type: string
  available_quantity: number
  photos: string[]
  specification?: string
  unit_cost: number
}
```

### 1.2 拼音排序功能类型

```typescript
// 拼音排序函数类型
type SortByPinyinFunction = <T extends { product_name: string }>(
  items: T[]
) => T[]

// 拼音首字母映射类型
interface PinyinMapping {
  [key: string]: string
}

// 排序配置类型
interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
  type: 'pinyin' | 'alphabetic' | 'numeric'
}
```

## 二、拼音排序功能规范（新增）

### 2.1 拼音排序工具函数

**核心实现：**
```typescript
// utils/pinyinSort.ts

// 拼音首字母映射表（已完善）
const PINYIN_FIRST_LETTER_MAP: { [key: string]: string } = {
  '紫': 'Z', '水': 'S', '晶': 'J', '玛': 'M', '瑙': 'N',
  '翡': 'F', '翠': 'C', '和': 'H', '田': 'T', '玉': 'Y',
  '蜜': 'M', // **新增：修复蜜蜡排序问题**
  '蜡': 'L', '琥': 'H', '珀': 'P', '珊': 'S', '瑚': 'H',
  '镀': 'D', // **新增：修复镀金排序问题**
  '金': 'J', '银': 'Y', '铜': 'T', '铁': 'T', '钢': 'G',
  // ... 更多映射
}

// 获取拼音首字母
export const getPinyinFirstLetter = (char: string): string => {
  return PINYIN_FIRST_LETTER_MAP[char] || char.toUpperCase()
}

// 拼音排序函数
export const sortByPinyin = <T extends { product_name: string }>(
  items: T[]
): T[] => {
  return items.sort((a, b) => {
    const firstLetterA = getPinyinFirstLetter(a.product_name[0])
    const firstLetterB = getPinyinFirstLetter(b.product_name[0])
    
    if (firstLetterA !== firstLetterB) {
      return firstLetterA.localeCompare(firstLetterB)
    }
    
    return a.product_name.localeCompare(b.product_name)
  })
}

// 按类型和拼音排序
export const sortMaterialsByTypeAndPinyin = <T extends { 
  product_name: string
  product_type: string 
}>(
  items: T[]
): T[] => {
  return items.sort((a, b) => {
    // 先按产品类型排序
    if (a.product_type !== b.product_type) {
      return a.product_type.localeCompare(b.product_type)
    }
    
    // 同类型内按拼音排序
    const firstLetterA = getPinyinFirstLetter(a.product_name[0])
    const firstLetterB = getPinyinFirstLetter(b.product_name[0])
    
    if (firstLetterA !== firstLetterB) {
      return firstLetterA.localeCompare(firstLetterB)
    }
    
    return a.product_name.localeCompare(b.product_name)
  })
}
```

### 2.2 组件中的使用规范

**在ProductEntry组件中：**
```typescript
import { sortByPinyin } from '@/utils/pinyinSort'

// 散珠和手串排序
const sortedLooseBeads = sortByPinyin(looseBeads)
const sortedBracelets = sortByPinyin(bracelets)
```

**在AccessoriesProductGrid组件中：**
```typescript
import { sortByPinyin } from '@/utils/pinyinSort'

// 配饰产品排序
const extractAccessoryProducts = (materials: AvailableMaterial[]): AccessoryProduct[] => {
  const accessories = materials
    .filter(material => material.product_type === 'ACCESSORIES')
    .map(material => ({
      purchase_id: material.purchase_id,
      purchase_code: material.purchase_code,
      product_name: material.product_name,
      product_type: 'ACCESSORIES' as const,
      available_quantity: material.available_quantity,
      unit_cost: material.unit_cost,
      photos: material.photos,
      specification: material.specification
    }))
  
  // **重要：应用拼音排序**
  return sortByPinyin(accessories)
}
```

## 三、采购列表搜索功能规范（新增）

### 3.1 采购编号搜索组件

**PurchaseList组件状态管理：**
```typescript
interface PurchaseListState {
  purchases: Purchase[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: {
    search: string // 产品名称搜索
    purchaseCodeSearch: string // **新增：采购编号搜索**
    quality: string
    productType: string
    supplierId: string
  }
  sorting: {
    field: string
    direction: 'asc' | 'desc'
  }
  columnFilters: {
    purchaseCode: {
      type: 'search' // **更新：从sort改为search**
      value: string
    }
    productName: {
      type: 'search'
      value: string
    }
    // ... 其他筛选器
  }
}
```

**筛选器渲染函数：**
```typescript
const renderColumnFilter = (column: string, filter: any) => {
  if (filter.type === 'search') {
    return (
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder={`搜索${column === 'purchaseCode' ? '采购编号' : '产品名称'}...`}
          value={filter.value}
          onChange={(e) => handleFilterChange(column, e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
          className="px-2 py-1 text-xs border rounded"
        />
        <button
          onClick={() => handleFilterChange(column, '')}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }
  // ... 其他筛选器类型
}
```

### 3.2 API调用规范

**fetchPurchases函数更新：**
```typescript
const fetchPurchases = async () => {
  try {
    setLoading(true)
    
    const params: any = {
      page: pagination.page,
      limit: pagination.limit,
      search: filters.search,
      purchase_code_search: filters.purchaseCodeSearch, // **新增参数**
      quality: filters.quality,
      product_type: filters.productType,
      supplier_id: filters.supplierId,
      sort: sorting.direction,
      sort_by: sorting.field
    }
    
    // 移除空值参数
    Object.keys(params).forEach(key => {
      if (!params[key]) delete params[key]
    })
    
    const response = await purchaseApi.list(params)
    
    if (response.success) {
      setPurchases(response.data.purchases)
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.total_pages
      }))
    }
  } catch (error) {
    setError('获取采购列表失败')
  } finally {
    setLoading(false)
  }
}
```

## 四、组件错误处理规范

### 4.1 TypeScript错误修复模式

**常见错误类型：**
1. **属性不存在错误**：`Property 'purchase_code' does not exist`
2. **类型不匹配错误**：类型定义与实际使用不符
3. **导入错误**：未使用的导入和函数

**修复策略：**
```typescript
// 1. 为接口添加可选字段
interface SomeInterface {
  existing_field: string
  purchase_code?: string // 添加可选字段
}

// 2. 使用类型断言（谨慎使用）
const item = data as SomeInterface

// 3. 条件访问
const purchaseCode = item.purchase_code || 'N/A'

// 4. 清理未使用的导入
// 删除未使用的import语句和函数定义
```

### 4.2 组件类型安全最佳实践

```typescript
// 1. 严格的Props类型定义
interface ComponentProps {
  data: Purchase[]
  onSelect?: (item: Purchase) => void
  loading?: boolean
}

// 2. 默认值处理
const Component: React.FC<ComponentProps> = ({ 
  data = [], 
  onSelect, 
  loading = false 
}) => {
  // 组件实现
}

// 3. 条件渲染保护
const renderItem = (item: Purchase) => {
  if (!item.purchase_code) {
    console.warn('缺少采购编号:', item)
    return null
  }
  
  return (
    <div>{item.purchase_code}</div>
  )
}
```

// SKU数据类型定义（更新版）
interface SkuItem {
  id: string
  sku_code: string
  sku_name: string
  total_quantity: number
  available_quantity: number
  photos?: string[]
  specification?: string // 规格（直径等）
  material_cost?: number // 原材料成本价
  labor_cost?: number // 人工成本
  craft_cost?: number // 工艺成本
  total_cost?: number // 总成本价
  selling_price: number // 售价
  profit_margin?: number // 利润率
  created_at: string // 创建日期
  last_sale_date?: string // 最后销售日期
  material_traces?: MaterialTrace[] // 溯源信息
}

// 原材料溯源信息
interface MaterialTrace {
  purchase_id: string
  product_name: string
  supplier: string
  purchase_date: string
  quantity_used_beads: number
  quantity_used_pieces: number
  unit_cost: number
  total_cost: number
}

// SKU操作日志
interface SkuInventoryLog {
  id: string
  action: 'CREATE' | 'SELL' | 'ADJUST' | 'DESTROY'
  quantity_change: number
  quantity_before: number
  quantity_after: number
  reference_type: 'PRODUCT' | 'SALE' | 'MANUAL' | 'DESTROY'
  notes?: string
  created_at: string
  user_name: string
}

const ModeSelection = ({ onModeSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 直接转化模式 */}
      <div 
        className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 cursor-pointer transition-colors"
        onClick={() => onModeSelect('direct')}
      >
        <div className="text-center">
          <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">直接转化模式</h3>
          <p className="text-gray-600 text-sm">
            选择库存中的一个原材料成品，直接转化为销售成品
          </p>
        </div>
      </div>
      
      {/* 组合制作模式 */}
      <div 
        className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 cursor-pointer transition-colors"
        onClick={() => onModeSelect('combination')}
      >
        <div className="text-center">
          <Layers className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">组合制作模式</h3>
          <p className="text-gray-600 text-sm">
            选择多种原材料，组合制作复杂成品
          </p>
        </div>
      </div>
    </div>
  );
};

const MaterialSelector = ({ materials, selectedMaterials, onMaterialChange }) => {
  const handleQuantityChange = (materialId: string, quantity: number, type: 'beads' | 'pieces') => {
    const material = materials.find(m => m.purchase_id === materialId);
    if (!material) return;
    
    // 库存验证
    const maxQuantity = type === 'beads' ? material.remaining_beads : material.remaining_pieces;
    if (quantity > maxQuantity) {
      toast.error(`库存不足，最大可用：${maxQuantity}${type === 'beads' ? '颗' : '片'}`);
      return;
    }
    
    onMaterialChange(materialId, quantity, type);
  };
  
  return (
    <div className="space-y-4">
      {materials.map(material => (
        <div key={material.purchase_id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <img 
                src={material.photos?.[0]} 
                alt={material.product_name}
                className="w-12 h-12 object-cover rounded"
              />
              <div>
                <h4 className="font-medium text-gray-900">{material.product_name}</h4>
                <p className="text-sm text-gray-500">{material.product_type}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">剩余库存</div>
              <div className="font-medium">
                {material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' 
                  ? `${material.remaining_beads}颗` 
                  : `${material.remaining_pieces}片`
                }
              </div>
            </div>
          </div>
          
          {/* 使用量输入 */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">使用量：</label>
            <input
              type="number"
              min="0"
              max={material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' 
                ? material.remaining_beads 
                : material.remaining_pieces
              }
              className="w-24 px-3 py-2 border border-gray-300 rounded-md"
              onChange={(e) => handleQuantityChange(
                material.purchase_id, 
                parseInt(e.target.value) || 0,
                material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' ? 'beads' : 'pieces'
              )}
            />
            <span className="text-sm text-gray-500">
              {material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' ? '颗' : '片'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const BatchProductEditor = ({ selectedMaterials, batchFormData, onProductChange, onSubmit }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const toggleExpanded = (materialId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(materialId)) {
      newExpanded.delete(materialId);
    } else {
      newExpanded.add(materialId);
    }
    setExpandedItems(newExpanded);
  };
  
  const calculateCosts = (product: BatchProductInfo) => {
    const materialCost = product.material_cost || 0;
    const totalCost = materialCost + product.labor_cost + product.craft_cost;
    const profitMargin = product.selling_price > 0 
      ? ((product.selling_price - totalCost) / product.selling_price) * 100 
      : 0;
    
    return { totalCost, profitMargin };
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">批量成品信息填写</h2>
        <p className="text-gray-600">为每个选中的原材料成品填写销售成品信息</p>
      </div>
      
      <div className="space-y-4">
        {batchFormData.products.map((product, index) => {
          const material = selectedMaterials.find(m => m.purchase_id === product.material_id);
          const { totalCost, profitMargin } = calculateCosts(product);
          const isExpanded = expandedItems.has(product.material_id);
          
          return (
            <div key={product.material_id} className="border border-gray-200 rounded-lg">
              {/* 原材料信息头部 */}
              <div 
                className="p-4 bg-gray-50 cursor-pointer flex items-center justify-between"
                onClick={() => toggleExpanded(product.material_id)}
              >
                <div className="flex items-center space-x-3">
                  <img 
                    src={material?.photos?.[0]} 
                    alt={material?.product_name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{material?.product_name}</h4>
                    <p className="text-sm text-gray-500">
                      原材料成本: ¥{product.material_cost?.toFixed(2) || '0.00'}
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
                      profitMargin >= 30 ? 'text-green-600' : 
                      profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {profitMargin.toFixed(1)}%
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
                          value={product.product_name}
                          onChange={(e) => onProductChange(index, 'product_name', e.target.value)}
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
                          onChange={(e) => onProductChange(index, 'description', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                          placeholder="请输入成品描述"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          规格说明
                        </label>
                        <input
                          type="text"
                          value={product.specification}
                          onChange={(e) => onProductChange(index, 'specification', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                          placeholder="如：平均直径18mm"
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
                            value={product.labor_cost}
                            onChange={(e) => onProductChange(index, 'labor_cost', parseFloat(e.target.value) || 0)}
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
                            value={product.craft_cost}
                            onChange={(e) => onProductChange(index, 'craft_cost', parseFloat(e.target.value) || 0)}
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
                          value={product.selling_price}
                          onChange={(e) => onProductChange(index, 'selling_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                        />
                      </div>
                      
                      {/* 成本汇总 */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">成本汇总</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">原材料成本：</span>
                            <span>¥{product.material_cost?.toFixed(2) || '0.00'}</span>
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
                            <span>¥{totalCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>预期利润：</span>
                            <span className={profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ¥{(product.selling_price - totalCost).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* 提交按钮 */}
      <div className="flex justify-between">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          返回修改
        </button>
        
        <button
          onClick={onSubmit}
          className="px-6 py-3 bg-crystal-600 text-white rounded-lg hover:bg-crystal-700"
        >
          批量创建成品 ({batchFormData.products.length}个)
        </button>
      </div>
    </div>
  );
};

const CostCalculator = ({ selectedMaterials, laborCost, craftCost, onCostChange }) => {
  const materialCost = useMemo(() => {
    return selectedMaterials.reduce((total, material) => {
      const unitCost = material.unit_cost || 0;
      const quantity = material.quantity_used_beads || material.quantity_used_pieces || 0;
      return total + (unitCost * quantity);
    }, 0);
  }, [selectedMaterials]);
  
  const totalCost = materialCost + laborCost + craftCost;
  
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-3">成本计算</h4>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">原材料成本：</span>
          <span className="font-medium">¥{materialCost.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">人工成本：</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={laborCost}
            onChange={(e) => onCostChange('labor', parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
          />
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">工艺成本：</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={craftCost}
            onChange={(e) => onCostChange('craft', parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
          />
        </div>
        
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between font-medium">
            <span>总成本：</span>
            <span className="text-red-600">¥{totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StockStatusBadge = ({ sku }: { sku: SkuItem }) => {
  const getStockStatus = () => {
    if (sku.available_quantity === 0) {
      return { status: 'OUT_OF_STOCK', label: '缺货', color: 'bg-red-100 text-red-800' }
    } else if (sku.available_quantity <= 2) {
      return { status: 'LOW_STOCK', label: '低库存', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { status: 'IN_STOCK', label: '有库存', color: 'bg-green-100 text-green-800' }
    }
  }
  
  const { label, color } = getStockStatus()
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

// 库存数量显示
const StockQuantityDisplay = ({ sku }: { sku: SkuItem }) => {
  return (
    <div className="text-sm">
      <div className="font-medium">
        库存: {sku.available_quantity}/{sku.total_quantity} 件
      </div>
      <div className="text-gray-500">
        已售: {sku.total_quantity - sku.available_quantity} 件
      </div>
    </div>
  )
}

const ErrorDisplay = ({ error, onRetry }: {
  error: string
  onRetry: () => void
}) => {
  return (
    <div className="text-center py-12">
      <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
      <p className="text-gray-500 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-crystal-600 text-white rounded-lg hover:bg-crystal-700"
      >
        重试
      </button>
    </div>
  )
}

// 加载状态组件
const LoadingDisplay = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
          <div className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const PaginationControls = ({ pagination, onPageChange }: {
  pagination: SalesListState['pagination']
  onPageChange: (page: number) => void
}) => {
  const { page, total_pages, total, limit } = pagination
  
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
      <div className="text-sm text-gray-700">
        显示 {((page - 1) * limit) + 1} 到 {Math.min(page * limit, total)} 条，
        共 {total} 条记录
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <span className="px-3 py-1 bg-crystal-500 text-crystal-700 rounded">
          {page} / {total_pages}
        </span>
        
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= total_pages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// 搜索防抖Hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

// 在组件中使用
const [searchInput, setSearchInput] = useState('')
const debouncedSearch = useDebounce(searchInput, 300)

useEffect(() => {
  setState(prev => ({
    ...prev,
    filters: { ...prev.filters, search: debouncedSearch },
    pagination: { ...prev.pagination, page: 1 }
  }))
}, [debouncedSearch])

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

{showDeleteConfirm && (
  <div className="fixed inset-0 z-60 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
        onClick={() => setShowDeleteConfirm(false)}
      />
      
      {/* 确认对话框 */}
      <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h3 className="text-lg font-medium text-gray-900">
            确认删除采购记录
          </h3>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-3">
            您确定要删除这条采购记录吗？
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800 font-medium">
              产品：{purchase?.product_name}
            </p>
            <p className="text-sm text-red-600">
              采购编号：{purchase?.purchase_code}
            </p>
          </div>
          <p className="text-sm text-red-600 mt-2 font-medium">
            ⚠️ 此操作不可恢复，请谨慎操作！
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleDelete}
            disabled={loading}
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
            onClick={() => setShowDeleteConfirm(false)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
)}

// 删除采购记录处理函数
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
      if ((response.data as any)?.used_by_products && (response.data as any).used_by_products.length > 0) {
        const productNames = (response.data as any).used_by_products.map((p: any) => p.product_name).join('、')
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

const usePermissionFilter = () => {
  const { user } = useAuth()
  
  const filterProductData = (products: FinishedProduct[]) => {
    if (user?.role === 'BOSS') {
      return products; // BOSS可查看所有信息
    }
    
    // EMPLOYEE角色过滤敏感字段
    return products.map(product => ({
      ...product,
      price_per_unit: undefined,
      total_price: undefined,
      supplier_name: undefined,
      unit_cost: undefined
    }));
  };
  
  return { filterProductData, isBoss: user?.role === 'BOSS' };
};

## 6. SKU系统组件开发规范（更新版）

### 6.1 SKU列表组件 (SalesList)

**组件结构：**
```typescript
interface SalesListProps {
  // 无需props，内部管理状态
}

interface SalesListState {
  skus: SkuItem[]
  loading: boolean
  error: string | null
  filters: {
    search: string
    specification: string
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

**核心功能：**
- SKU列表展示（卡片式布局）
- 搜索和筛选功能
- 分页导航
- 权限控制显示
- 销售和销毁操作入口

### 6.2 SKU详情组件 (SkuDetailModal)

**组件结构：**
```typescript
interface SkuDetailModalProps {
  skuId: string | null
  isOpen: boolean
  onClose: () => void
  onSell?: (skuId: string, data: SellData) => void
  onDestroy?: (skuId: string, data: DestroyData) => void
}

interface SellData {
  quantity: number
  buyer_info?: string
  sale_channel?: string
  notes?: string
}

interface DestroyData {
  quantity: number
  reason: string
  return_to_material: boolean
}
```

**核心功能：**
- 显示SKU完整信息
- 展示溯源信息
- 提供销售确认表单
- 提供销毁操作表单
- 显示操作历史

### 6.3 SKU销售确认组件 (SkuSellForm)

**组件结构：**
```typescript
interface SkuSellFormProps {
  sku: SkuItem
  onSubmit: (data: SellData) => void
  onCancel: () => void
  loading?: boolean
}
```

**表单字段：**
- 销售数量（必填，不超过可售数量）
- 买家信息（可选）
- 销售渠道（可选）
- 备注（可选）

**验证规则：**
```typescript
const sellFormSchema = z.object({
  quantity: z.number().min(1).max(sku.available_quantity),
  buyer_info: z.string().optional(),
  sale_channel: z.string().optional(),
  notes: z.string().optional()
})
```

### 6.4 SKU销毁操作组件 (SkuDestroyForm)

**组件结构：**
```typescript
interface SkuDestroyFormProps {
  sku: SkuItem
  onSubmit: (data: DestroyData) => void
  onCancel: () => void
  loading?: boolean
}
```

**表单字段：**
- 销毁数量（必填，不超过可售数量）
- 销毁原因（必填）
- 是否退回原材料（默认true）

**验证规则：**
```typescript
const destroyFormSchema = z.object({
  quantity: z.number().min(1).max(sku.available_quantity),
  reason: z.string().min(1, '请输入销毁原因'),
  return_to_material: z.boolean().default(true)
})
```

### 6.5 SKU溯源组件 (SkuTraceView)

**组件结构：**
```typescript
interface SkuTraceViewProps {
  skuId: string
  traces: MaterialTrace[]
  purchaseList: PurchaseRecord[]
}

interface PurchaseRecord {
  id: string
  product_name: string
  supplier: string
  purchase_date: string
  total_price: number
  remaining_quantity: number
}
```

**显示内容：**
- 原材料使用明细
- 关联采购记录
- 供应商信息
- 成本分解

### 6.6 SKU操作历史组件 (SkuHistoryView)

**组件结构：**
```typescript
interface SkuHistoryViewProps {
  skuId: string
  logs: SkuInventoryLog[]
  pagination: PaginationInfo
  onPageChange: (page: number) => void
}
```

**显示内容：**
- 操作时间线
- 操作类型标签
- 数量变化
- 操作用户
- 备注信息

### 6.7 SKU权限控制Hook

**Hook定义：**
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

### 6.11 SKU组件测试规范

**单元测试：**
```typescript
// SKU列表组件测试
describe('SalesList Component', () => {
  it('should render SKU list correctly', () => {
    // 测试SKU列表渲染
  })
  
  it('should handle search and filter', () => {
    // 测试搜索和筛选功能
  })
  
  it('should respect permission controls', () => {
    // 测试权限控制
  })
})

// SKU销售表单测试
describe('SkuSellForm Component', () => {
  it('should validate quantity input', () => {
    // 测试数量验证
  })
  
  it('should submit sell data correctly', () => {
    // 测试销售提交
  })
})
```

**集成测试：**
```typescript
// SKU操作流程测试
describe('SKU Operations Flow', () => {
  it('should complete sell operation', async () => {
    // 测试完整销售流程
  })
  
  it('should complete destroy operation', async () => {
    // 测试完整销毁流程
  })
})
```

## 七、成品制作成本计算规范（重要更新）

### 7.1 成本计算核心函数

**成本计算工具函数：**
```typescript
// 成本计算函数
const calculateCosts = (product: {
  material_cost: number
  labor_cost: number
  craft_cost: number
  selling_price: number
}) => {
  const materialCost = product.material_cost || 0
  const totalCost = materialCost + product.labor_cost + product.craft_cost
  const profitMargin = product.selling_price > 0 
    ? ((product.selling_price - totalCost) / product.selling_price) * 100 
    : 0
  
  return { totalCost, profitMargin }
}

// 实时成本计算API调用
const calculateCost = async () => {
  if (formData.selected_materials.length === 0) {
    setCostCalculation(null)
    return
  }

  try {
    const productionQuantity = formData.mode === 'COMBINATION_CRAFT' ? formData.production_quantity : 1
    
    const materials = formData.selected_materials.map(item => ({
      purchase_id: item.material.purchase_id,
      quantity_used_beads: (item.quantity_used_beads || 0) * productionQuantity,
      quantity_used_pieces: (item.quantity_used_pieces || 0) * productionQuantity
    }))

    const response = await fetch('/api/v1/products/cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        materials,
        labor_cost: (formData.labor_cost || 0) * productionQuantity,
        craft_cost: (formData.craft_cost || 0) * productionQuantity,
        profit_margin: formData.profit_margin || 30
      })
    })

    const result = await response.json()
    if (result.success) {
      setCostCalculation(result.data)
    }
  } catch (error) {
    console.error('成本计算失败:', error)
  }
}
```

### 7.2 利润率计算和显示

**利润率计算公式：**
```typescript
// 利润率计算公式
const calculateProfitMargin = (sellingPrice: number, totalCost: number): number => {
  if (sellingPrice <= 0) return 0
  return ((sellingPrice - totalCost) / sellingPrice) * 100
}

// 利润率颜色显示
const getProfitMarginColor = (profitMargin: number): string => {
  if (profitMargin >= 30) return 'text-green-600'  // 高利润率
  if (profitMargin >= 10) return 'text-yellow-600' // 中等利润率
  return 'text-red-600'  // 低利润率
}

// 利润率显示组件
const ProfitMarginDisplay = ({ profitMargin }: { profitMargin: number }) => {
  return (
    <span className={`font-medium ${getProfitMarginColor(profitMargin)}`}>
      {profitMargin.toFixed(1)}%
    </span>
  )
}
```

### 7.3 成本汇总组件

**成本汇总显示：**
```typescript
const CostSummary = ({ 
  materialCost, 
  laborCost, 
  craftCost, 
  sellingPrice 
}: {
  materialCost: number
  laborCost: number
  craftCost: number
  sellingPrice: number
}) => {
  const totalCost = materialCost + laborCost + craftCost
  const profit = sellingPrice - totalCost
  const profitMargin = calculateProfitMargin(sellingPrice, totalCost)
  
  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <h5 className="font-medium text-gray-900 mb-2">成本汇总</h5>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">原材料成本：</span>
          <span>¥{materialCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">人工成本：</span>
          <span>¥{laborCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">工艺成本：</span>
          <span>¥{craftCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-medium border-t border-gray-200 pt-1">
          <span>总成本：</span>
          <span>¥{totalCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>预期利润：</span>
          <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
            ¥{profit.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between font-medium">
          <span>利润率：</span>
          <ProfitMarginDisplay profitMargin={profitMargin} />
        </div>
      </div>
    </div>
  )
}
```

### 7.4 成本计算状态管理

**ProductEntry组件状态：**
```typescript
interface ProductionFormData {
  mode: 'DIRECT_TRANSFORM' | 'COMBINATION_CRAFT'
  selected_materials: MaterialUsage[]
  production_quantity: number
  labor_cost: number
  craft_cost: number
  selling_price: number
  profit_margin: number
  product_name: string
  description?: string
  specification?: string
  photos: string[]
}

// 成本计算结果状态
const [costCalculation, setCostCalculation] = useState<CostCalculationResponse | null>(null)

// 实时成本计算效果
useEffect(() => {
  const timer = setTimeout(() => {
    calculateCost()
  }, 500) // 防抖500ms
  
  return () => clearTimeout(timer)
}, [formData.selected_materials, formData.labor_cost, formData.craft_cost, formData.production_quantity])
```

### 7.5 直接转化模式成本处理

**直接转化模式特点：**
```typescript
// 直接转化模式成本计算
const calculateDirectTransformCost = (material: AvailableMaterial) => {
  // 根据产品类型选择正确的单价字段
  let materialCost = 0
  
  if (material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET') {
    // 散珠和手串使用每颗价格
    materialCost = material.price_per_bead || 0
  } else if (material.product_type === 'ACCESSORIES' || material.product_type === 'FINISHED') {
    // 配件和成品使用每片/每件价格
    materialCost = material.price_per_piece || 0
  }
  
  // 如果没有专用价格字段，使用通用单价
  if (materialCost === 0) {
    materialCost = material.unit_cost || 0
  }
  
  return materialCost
}

// 批量产品信息更新
const updateBatchProduct = (materialId: string, field: string, value: any) => {
  setBatchFormData(prev => ({
    selected_materials: prev.selected_materials.map(material => {
      if (material.purchase_id === materialId) {
        const updatedProduct = {
          ...material.product_info,
          [field]: value
        }
        
        // 如果更新的是价格相关字段，重新计算利润率
        if (['selling_price', 'labor_cost', 'craft_cost'].includes(field)) {
          const { totalCost, profitMargin } = calculateCosts(updatedProduct)
          updatedProduct.total_cost = totalCost
          updatedProduct.profit_margin = profitMargin
        }
        
        return {
          ...material,
          product_info: updatedProduct
        }
      }
      return material
    })
  }))
}
```