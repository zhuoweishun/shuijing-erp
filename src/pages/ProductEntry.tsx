import { useState, useEffect } from 'react'
import { Gem, Plus, Calculator, Save, ArrowLeft, X, Search, Package, Ruler, ChevronDown, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { finishedProductApi, fixImageUrl } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { formatPurchaseCode } from '../utils/fieldConverter'

// 辅助函数：解析并获取第一张图片URL
const getFirstPhotoUrl = (photos: any): string | null => {
  if (!photos) return null
  
  let photoArray: string[] = []
  
  // 如果是字符串，尝试解析为JSON
  if (typeof photos === 'string') {
    try {
      photoArray = JSON.parse(photos)
    } catch (e) {
      console.error('解析photos JSON失败:', e)
      return null
    }
  } else if (Array.isArray(photos)) {
    photoArray = photos
  } else {
    return null
  }
  
  return photoArray.length > 0 ? fixImageUrl(photoArray[0]) : null
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
  const { user, isAuthenticated } = useAuth()
  const [currentStep, setCurrentStep] = useState<'mode' | 'materials' | 'info' | 'batch_details' | 'review'>('mode')
  const [productionMode, setProductionMode] = useState<ProductionMode>('DIRECT_TRANSFORM')
  const [formData, setFormData] = useState<ProductionFormData>({
    mode: 'DIRECT_TRANSFORM',
    product_name: '',
    description: '',
    specification: '',
    selected_materials: [],
    labor_cost: 100,
    craft_cost: 100,
    selling_price: 0,
    profit_margin: 30,
    photos: [],
    production_quantity: 1 // 默认制作1个
  })
  
  // 批量创建模式的状态
  const [batchFormData, setBatchFormData] = useState<{
    selected_materials: (AvailableMaterial & { 
      selected_quantity: number
      product_info: {
        product_name: string
        description: string
        labor_cost: number
        craft_cost: number
        selling_price: number
        photos: string[]
        material_cost: number
        total_cost: number
        profit_margin: number
      }
    })[]
  }>({
    selected_materials: []
  })
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  
  const [availableMaterials, setAvailableMaterials] = useState<AvailableMaterial[]>([])
  const [materialSearch, setMaterialSearch] = useState('')
  const [costCalculation, setCostCalculation] = useState<CostCalculationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<AvailableMaterial | null>(null)

  // 获取可用原材料
  const fetchAvailableMaterials = async () => {
    try {
      setMaterialsLoading(true)
      
      // 添加认证状态调试信息
      console.log('🔍 [DEBUG] 认证状态检查:', {
        isAuthenticated,
        user: user ? { id: user.id, username: user.username, role: user.role } : null,
        token: localStorage.getItem('auth_token') ? '有token' : '无token'
      })
      
      if (!isAuthenticated) {
        console.error('❌ 用户未认证，无法获取原材料')
        toast.error('请先登录')
        setAvailableMaterials([])
        return
      }
      
      // 根据制作模式筛选原材料类型
      let productTypes: string[] = []
      if (formData.mode === 'DIRECT_TRANSFORM') {
        // 直接转化模式：只显示成品类型的原材料
        productTypes = ['FINISHED']
      } else if (formData.mode === 'COMBINATION_CRAFT') {
        // 组合制作模式：显示散珠、手串、配件
        productTypes = ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES']
      }
      
      console.log('🔍 [原材料筛选] 制作模式:', formData.mode, '筛选类型:', productTypes)
      
      const response = await finishedProductApi.getMaterials({
        search: materialSearch,
        available_only: true,
        min_quantity: 1,
        product_types: productTypes
      })
      
      if (response.success && response.data && typeof response.data === 'object' && response.data !== null && 'materials' in response.data) {
        setAvailableMaterials((response.data as any).materials)
      } else {
        setAvailableMaterials([])
      }
    } catch (error: any) {
      console.error('获取原材料失败:', error)
      toast.error('获取原材料失败')
      setAvailableMaterials([])
    } finally {
      setMaterialsLoading(false)
    }
  }

  // 计算制作成本
  const calculateCost = async () => {
    if (formData.selected_materials.length === 0) {
      setCostCalculation(null)
      return
    }

    try {
      // 根据制作数量计算总的原材料使用量
      const productionQuantity = formData.mode === 'COMBINATION_CRAFT' ? formData.production_quantity : 1
      
      const materials: MaterialUsageRequest[] = formData.selected_materials.map(item => ({
        purchase_id: item.material.purchase_id,
        quantity_used_beads: item.quantity_used_beads * productionQuantity,
        quantity_used_pieces: item.quantity_used_pieces * productionQuantity
      }))

      const response = await finishedProductApi.calculateCost({
        materials,
        labor_cost: formData.labor_cost * productionQuantity,
        craft_cost: formData.craft_cost * productionQuantity,
        profit_margin: formData.profit_margin
      })

      if (response.success && response.data) {
        const costData = response.data as CostCalculationResponse
        setCostCalculation(costData)
        // 自动设置建议售价（单个成品的价格）
        if (productionQuantity > 1) {
          // 如果是批量制作，建议售价需要除以制作数量得到单个成品价格
          setFormData(prev => ({
            ...prev,
            selling_price: Math.round((costData.pricing_suggestion.suggested_price / productionQuantity) * 100) / 100
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            selling_price: costData.pricing_suggestion.suggested_price
          }))
        }
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
      const isAlreadySelected = batchFormData.selected_materials.some(
        item => item.purchase_id === material.purchase_id
      )
      
      if (isAlreadySelected) {
        toast.error('该原材料已经添加')
        return
      }

      setBatchFormData(prev => {
        const materialWithQuantity = { 
          ...material, 
          selected_quantity: 1,
          product_info: {
            product_name: material.product_name + '（销售成品）',
            description: '',
            labor_cost: 20, // 默认人工成本
            craft_cost: 100, // 默认工艺成本
            selling_price: 0,
            photos: [],
            material_cost: material.unit_cost || 0,
            total_cost: (material.unit_cost || 0) + 20 + 100,
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

      setFormData(prev => ({
        ...prev,
        selected_materials: [...prev.selected_materials, {
          material,
          quantity_used_beads: material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' ? 1 : 0,
          quantity_used_pieces: material.product_type === 'ACCESSORIES' || material.product_type === 'FINISHED' ? 1 : 0
        }]
      }))
    }
  }

  // 更新原材料选择数量（直接转化模式）
  const updateBatchMaterialQuantity = (purchaseId: string, quantity: number) => {
    setBatchFormData(prev => ({
      selected_materials: prev.selected_materials.map(material => 
        material.purchase_id === purchaseId 
          ? { ...material, selected_quantity: Math.min(quantity, material.available_quantity) }
          : material
      )
    }))
  }

  // 移除原材料
  const removeMaterial = (purchaseId: string) => {
    if (formData.mode === 'DIRECT_TRANSFORM') {
      // 直接转化模式：从批量选择列表中移除
      setBatchFormData(prev => ({
        selected_materials: prev.selected_materials.filter(
          item => item.purchase_id !== purchaseId
        )
      }))
    } else {
      // 组合制作模式：原有逻辑
      setFormData(prev => ({
        ...prev,
        selected_materials: prev.selected_materials.filter(
          item => item.material.purchase_id !== purchaseId
        )
      }))
    }
  }

  // 更新原材料使用数量
  const updateMaterialQuantity = (purchaseId: string, field: 'quantity_used_beads' | 'quantity_used_pieces', value: number) => {
    setFormData(prev => ({
      ...prev,
      selected_materials: prev.selected_materials.map(item => 
        item.material.purchase_id === purchaseId 
          ? { ...item, [field]: Math.max(0, Math.min(value, item.material.available_quantity)) }
          : item
      )
    }))
  }

  // 计算最大可制作数量（组合制作模式）
  const calculateMaxProductionQuantity = (): number => {
    if (formData.selected_materials.length === 0) {
      return 1
    }

    let maxQuantity = Infinity
    
    for (const item of formData.selected_materials) {
      const material = item.material
      let availableForThisMaterial = 0
      
      if (material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET') {
        // 散珠和手串按颗数计算
        if (item.quantity_used_beads > 0) {
          availableForThisMaterial = Math.floor(material.available_quantity / item.quantity_used_beads)
        }
      } else if (material.product_type === 'ACCESSORIES' || material.product_type === 'FINISHED') {
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

  // 更新制作数量
  const updateProductionQuantity = (quantity: number) => {
    const maxQuantity = calculateMaxProductionQuantity()
    const validQuantity = Math.max(1, Math.min(quantity, maxQuantity))
    
    setFormData(prev => ({
      ...prev,
      production_quantity: validQuantity
    }))
    
    if (quantity > maxQuantity) {
      toast.warning(`库存不足，最多只能制作 ${maxQuantity} 个成品`)
    }
  }

  // 更新批量产品信息
  const updateBatchProduct = (materialId: string, field: string, value: any) => {
    setBatchFormData(prev => ({
      selected_materials: prev.selected_materials.map(material => {
        if (material.purchase_id === materialId) {
          const updatedProductInfo = { ...material.product_info, [field]: value }
          
          // 重新计算成本和利润率
          const totalCost = updatedProductInfo.material_cost + updatedProductInfo.labor_cost + updatedProductInfo.craft_cost
          const profitMargin = updatedProductInfo.selling_price > 0 
            ? ((updatedProductInfo.selling_price - totalCost) / updatedProductInfo.selling_price) * 100 
            : 0
          
          updatedProductInfo.total_cost = totalCost
          updatedProductInfo.profit_margin = profitMargin
          
          return {
            ...material,
            product_info: updatedProductInfo
          }
        }
        return material
      })
    }))
  }

  // 批量创建成品提交
  const handleBatchSubmit = async () => {
    try {
      setLoading(true)
      
      // 验证批量表单数据
      if (batchFormData.selected_materials.length === 0) {
        toast.error('请至少选择一种原材料')
        return
      }
      
      // 验证每个成品的必填字段
      for (let i = 0; i < batchFormData.selected_materials.length; i++) {
        const material = batchFormData.selected_materials[i]
        const product = material.product_info
        if (!product.product_name.trim()) {
          toast.error(`第${i + 1}个成品请输入名称`)
          return
        }
        if (product.selling_price <= 0) {
          toast.error(`第${i + 1}个成品请设置销售价格`)
          return
        }
      }

      // 根据数量生成批量请求
      const products = []
      for (const material of batchFormData.selected_materials) {
        for (let i = 0; i < material.selected_quantity; i++) {
          products.push({
            material_id: material.purchase_id,
            product_name: material.product_info.product_name + (material.selected_quantity > 1 ? ` #${i + 1}` : ''),
            description: material.product_info.description,
            specification: '',
            labor_cost: material.product_info.labor_cost,
            craft_cost: material.product_info.craft_cost,
            selling_price: material.product_info.selling_price,
            photos: material.product_info.photos
          })
        }
      }

      const batchRequest: BatchProductCreateRequest = {
        products
      }

      const response = await finishedProductApi.batchCreate(batchRequest)

      if (response.success) {
        const data = response.data as BatchProductCreateResponse
        toast.success(`批量创建成功！成功创建${data.success_count}个成品${data.failed_count > 0 ? `，失败${data.failed_count}个` : ''}`)
        
        // 重置表单
        setBatchFormData({
          selected_materials: []
        })
        setCurrentStep('mode')
      } else {
        toast.error(response.message || '批量创建失败')
      }
    } catch (error: any) {
      console.error('批量提交失败:', error)
      toast.error('批量提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 提交成品制作（组合模式）
  const handleSubmit = async () => {
    try {
      setLoading(true)
      
      // 验证表单数据
      if (!formData.product_name.trim()) {
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

        const response = await finishedProductApi.create({
          product_name: formData.product_name,
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
          toast.success('成品制作成功！')
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
          const response = await finishedProductApi.create({
            product_name: formData.product_name + (formData.production_quantity > 1 ? ` #${i + 1}` : ''),
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
            toast.error(`第${i + 1}个成品制作失败: ${response.message}`)
            return
          }
        }
        
        toast.success(`批量制作成功！共制作了 ${formData.production_quantity} 个成品`)
      }

      // 重置表单
      setFormData({
        mode: 'DIRECT_TRANSFORM',
        product_name: '',
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
      setCurrentStep('mode')
      setCostCalculation(null)
    } catch (error: any) {
      console.error('提交失败:', error)
      toast.error('提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 当选择的原材料或成本发生变化时，重新计算成本
  useEffect(() => {
    calculateCost()
  }, [formData.selected_materials, formData.labor_cost, formData.craft_cost, formData.profit_margin, formData.production_quantity])

  // 当进入原材料选择步骤时，获取可用原材料
  useEffect(() => {
    if (currentStep === 'materials') {
      fetchAvailableMaterials()
    }
  }, [currentStep, materialSearch])

  // 渲染制作模式选择
  const renderModeSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">选择制作模式</h2>
        <p className="text-gray-600">请选择适合的成品制作方式</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 直接转化模式 */}
        <div 
          className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
            productionMode === 'DIRECT_TRANSFORM' 
              ? 'border-crystal-500 bg-crystal-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => {
            setProductionMode('DIRECT_TRANSFORM')
            setFormData(prev => ({ ...prev, mode: 'DIRECT_TRANSFORM' }))
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
            productionMode === 'COMBINATION_CRAFT' 
              ? 'border-crystal-500 bg-crystal-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => {
            setProductionMode('COMBINATION_CRAFT')
            setFormData(prev => ({ ...prev, mode: 'COMBINATION_CRAFT' }))
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
          onClick={() => setCurrentStep('materials')}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">选择原材料</h2>
          <p className="text-gray-600">模式：{productionMode === 'DIRECT_TRANSFORM' ? '直接转化' : '组合制作'}</p>
        </div>
        <button
          onClick={() => setCurrentStep('mode')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>返回</span>
        </button>
      </div>
      
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索原材料..."
          value={materialSearch}
          onChange={(e) => setMaterialSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
        />
      </div>
      
      {/* 已选择的原材料 */}
      {(formData.mode === 'DIRECT_TRANSFORM' ? batchFormData.selected_materials.length > 0 : formData.selected_materials.length > 0) && (
        <div className="bg-crystal-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">已选择的原材料</h3>
          <div className="space-y-3">
            {formData.mode === 'DIRECT_TRANSFORM' ? (
              // 直接转化模式：显示批量选择的原材料
              batchFormData.selected_materials.map((material) => (
                <div key={material.purchase_id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{material.product_name}</div>
                    <div className="text-sm text-gray-600">
                      {material.product_type} · {material.quality}级 · 可用: {material.available_quantity}
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
                    <div className="font-medium text-gray-900">{item.material.product_name}</div>
                    <div className="text-sm text-gray-600">
                      {item.material.product_type} · {item.material.quality}级 · 可用: {item.material.available_quantity}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* 珠子数量输入 */}
                    {(item.material.product_type === 'LOOSE_BEADS' || item.material.product_type === 'BRACELET') && (
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">颗数:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.material.available_quantity}
                          value={item.quantity_used_beads}
                          onChange={(e) => updateMaterialQuantity(
                            item.material.purchase_id, 
                            'quantity_used_beads', 
                            parseInt(e.target.value) || 0
                          )}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                      </div>
                    )}
                    
                    {/* 片/件数量输入 */}
                    {(item.material.product_type === 'ACCESSORIES' || item.material.product_type === 'FINISHED') && (
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">数量:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.material.available_quantity}
                          value={item.quantity_used_pieces}
                          onChange={(e) => updateMaterialQuantity(
                            item.material.purchase_id, 
                            'quantity_used_pieces', 
                            parseInt(e.target.value) || 0
                          )}
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
          <h3 className="font-semibold text-gray-900">可用原材料</h3>
        </div>
        <div className="p-4">
          {materialsLoading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : availableMaterials.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无可用原材料</h3>
              <p className="text-gray-500">请尝试调整搜索条件或检查库存状态</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
              {availableMaterials.map((material) => {
                const getQualityColor = (quality: string) => {
                  switch (quality) {
                    case 'A': return 'bg-green-100 text-green-800'
                    case 'B': return 'bg-blue-100 text-blue-800'
                    case 'C': return 'bg-yellow-100 text-yellow-800'
                    case 'D': return 'bg-red-100 text-red-800'
                    default: return 'bg-gray-100 text-gray-800'
                  }
                }
                
                const isLowStock = material.available_quantity < 5
                
                return (
                  <div 
                    key={material.purchase_id} 
                    className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 bg-white rounded-lg shadow-sm border border-gray-200 ${
                      isLowStock ? 'ring-2 ring-red-200' : ''
                    }`}
                  >
                    {/* 产品图片 */}
                    <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100">
                      {(() => {
                        const photoUrl = getFirstPhotoUrl(material.photos)
                        return photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={material.product_name}
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
                      {isLowStock && (
                        <div className="absolute top-2 left-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            库存不足
                          </span>
                        </div>
                      )}
                      
                      {/* 品相标识 */}
                      {material.quality && (
                        <div className="absolute top-2 right-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(material.quality)}`}>
                            {material.quality}级
                          </span>
                        </div>
                      )}
                      
                      {/* 悬浮查看详情按钮 */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                        <button
                          onClick={() => setSelectedMaterialDetail(material)}
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
                        {material.product_name}
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
                        <span>库存: {material.available_quantity}件</span>
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
          onClick={() => setCurrentStep('mode')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          上一步
        </button>
        <button
          onClick={() => {
            if (formData.mode === 'DIRECT_TRANSFORM') {
              setCurrentStep('batch_details')
            } else {
              setCurrentStep('info')
            }
          }}
          disabled={formData.mode === 'DIRECT_TRANSFORM' ? batchFormData.selected_materials.length === 0 : formData.selected_materials.length === 0}
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
          onClick={() => setCurrentStep('materials')}
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
              const getQualityColor = (quality: string) => {
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
                      const photoUrl = getFirstPhotoUrl(material.photos)
                      return photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={material.product_name}
                          className="w-16 h-16 object-cover rounded-lg"
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
                        {material.product_name}
                      </h4>
                      {material.quality && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getQualityColor(material.quality)}`}>
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
                        {material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' ? '颗' : '件'}
                      </span>
                    </div>
                    
                    {/* 成本信息（仅BOSS可见） */}
                    {user?.role === 'BOSS' && material.unit_cost && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-700 font-medium">成本信息:</span>
                          <div className="flex items-center space-x-3">
                            <span className="text-blue-600">
                              单价: ¥{(material.unit_cost || 0).toFixed(2)}
                            </span>
                            <span className="text-blue-800 font-medium">
                              小计: ¥{(
                                (material.unit_cost || 0) * 
                                ((material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET') 
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
                    {(material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET') && (
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600 whitespace-nowrap">使用颗数:</label>
                        <input
                          type="number"
                          min="0"
                          max={material.available_quantity}
                          value={item.quantity_used_beads}
                          onChange={(e) => updateMaterialQuantity(
                            material.purchase_id, 
                            'quantity_used_beads', 
                            parseInt(e.target.value) || 0
                          )}
                          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-crystal-500"
                        />
                        <span className="text-xs text-gray-500">颗</span>
                      </div>
                    )}
                    
                    {/* 片/件数输入 */}
                    {(material.product_type === 'ACCESSORIES' || material.product_type === 'FINISHED') && (
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600 whitespace-nowrap">使用数量:</label>
                        <input
                          type="number"
                          min="0"
                          max={material.available_quantity}
                          value={item.quantity_used_pieces}
                          onChange={(e) => updateMaterialQuantity(
                            material.purchase_id, 
                            'quantity_used_pieces', 
                            parseInt(e.target.value) || 0
                          )}
                          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-crystal-500"
                        />
                        <span className="text-xs text-gray-500">件</span>
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
                {formData.selected_materials.map((item) => {
                  const material = item.material
                  const usedQuantity = (material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET') 
                    ? item.quantity_used_beads 
                    : item.quantity_used_pieces
                  const itemCost = (material.unit_cost || 0) * usedQuantity
                  
                  return (
                    <div key={material.purchase_id} className="flex justify-between text-xs">
                      <span className="text-gray-700 truncate max-w-xs">
                        {material.product_name} × {usedQuantity}
                        {material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' ? '颗' : '件'}
                      </span>
                      <span className="text-blue-700 font-medium">¥{itemCost.toFixed(2)}</span>
                    </div>
                  )
                })}
                <div className="border-t border-blue-300 pt-2 mt-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-blue-900">原材料总成本:</span>
                    <span className="text-blue-900">
                      ¥{formData.selected_materials.reduce((total, item) => {
                        const material = item.material
                        const usedQuantity = (material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET') 
                          ? item.quantity_used_beads 
                          : item.quantity_used_pieces
                        return total + ((material.unit_cost || 0) * usedQuantity)
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                  {formData.production_quantity > 1 && (
                    <div className="flex justify-between text-xs text-blue-700 mt-1">
                      <span>制作 {formData.production_quantity} 个总成本:</span>
                      <span className="font-medium">
                        ¥{(formData.selected_materials.reduce((total, item) => {
                          const material = item.material
                          const usedQuantity = (material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET') 
                            ? item.quantity_used_beads 
                            : item.quantity_used_pieces
                          return total + ((material.unit_cost || 0) * usedQuantity)
                        }, 0) * formData.production_quantity).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* 返回修改按钮 */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={() => setCurrentStep('materials')}
              className="text-sm text-crystal-600 hover:text-crystal-700 font-medium"
            >
              + 继续添加原材料
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">成品名称 *</label>
            <input
              type="text"
              value={formData.product_name}
              onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
              placeholder="请输入成品名称"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">成品描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
              placeholder="请输入成品描述"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">规格说明</label>
            <input
              type="text"
              value={formData.specification}
              onChange={(e) => setFormData(prev => ({ ...prev, specification: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
              placeholder="如：手围16cm"
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
                value={formData.labor_cost}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || value === '0') {
                    setFormData(prev => ({ ...prev, labor_cost: 0 }))
                  } else {
                    const numValue = parseFloat(value)
                    if (!isNaN(numValue)) {
                      setFormData(prev => ({ ...prev, labor_cost: numValue }))
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
                value={formData.craft_cost}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || value === '0') {
                    setFormData(prev => ({ ...prev, craft_cost: 0 }))
                  } else {
                    const numValue = parseFloat(value)
                    if (!isNaN(numValue)) {
                      setFormData(prev => ({ ...prev, craft_cost: numValue }))
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">利润率 (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.profit_margin}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || value === '0') {
                    setFormData(prev => ({ ...prev, profit_margin: 0 }))
                  } else {
                    const numValue = parseFloat(value)
                    if (!isNaN(numValue)) {
                      setFormData(prev => ({ ...prev, profit_margin: numValue }))
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">销售价格 *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || value === '0') {
                    setFormData(prev => ({ ...prev, selling_price: 0 }))
                  } else {
                    const numValue = parseFloat(value)
                    if (!isNaN(numValue)) {
                      setFormData(prev => ({ ...prev, selling_price: numValue }))
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* 制作数量（仅组合制作模式显示） */}
          {formData.mode === 'COMBINATION_CRAFT' && (
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
          )}
          
          {/* 成本计算结果 */}
          {costCalculation && costCalculation.cost_breakdown && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Calculator className="h-4 w-4 text-crystal-500" />
                <h4 className="font-medium text-gray-900">
                  成本计算 {formData.mode === 'COMBINATION_CRAFT' && formData.production_quantity > 1 && (
                    <span className="text-sm text-gray-600">(制作 {formData.production_quantity} 个)</span>
                  )}
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                {formData.mode === 'COMBINATION_CRAFT' && formData.production_quantity > 1 ? (
                  // 批量制作时显示总成本和单个成本
                  <>
                    <div className="text-xs text-gray-500 mb-2">总成本（{formData.production_quantity} 个成品）:</div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">原材料成本:</span>
                      <span className="font-medium">¥{(costCalculation.cost_breakdown.material_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">人工成本:</span>
                      <span className="font-medium">¥{(costCalculation.cost_breakdown.labor_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">工艺成本:</span>
                      <span className="font-medium">¥{(costCalculation.cost_breakdown.craft_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>总成本:</span>
                      <span>¥{(costCalculation.cost_breakdown.total_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-3 mb-2">单个成品成本:</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">单个原材料成本:</span>
                      <span className="font-medium">¥{((costCalculation.cost_breakdown.material_cost || 0) / formData.production_quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">单个人工成本:</span>
                      <span className="font-medium">¥{((costCalculation.cost_breakdown.labor_cost || 0) / formData.production_quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">单个工艺成本:</span>
                      <span className="font-medium">¥{((costCalculation.cost_breakdown.craft_cost || 0) / formData.production_quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-sm">
                      <span>单个成本:</span>
                      <span>¥{((costCalculation.cost_breakdown.total_cost || 0) / formData.production_quantity).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  // 单个制作时显示正常成本
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">原材料成本:</span>
                      <span className="font-medium">¥{(costCalculation.cost_breakdown.material_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">人工成本:</span>
                      <span className="font-medium">¥{(costCalculation.cost_breakdown.labor_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">工艺成本:</span>
                      <span className="font-medium">¥{(costCalculation.cost_breakdown.craft_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>总成本:</span>
                      <span>¥{(costCalculation.cost_breakdown.total_cost || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
                {costCalculation.pricing_suggestion && (
                  <div className="flex justify-between text-crystal-600 mt-2">
                    <span>建议单价:</span>
                    <span className="font-semibold">¥{formData.mode === 'COMBINATION_CRAFT' && formData.production_quantity > 1 ? 
                      ((costCalculation.pricing_suggestion.suggested_price || 0) / formData.production_quantity).toFixed(2) :
                      (costCalculation.pricing_suggestion.suggested_price || 0).toFixed(2)
                    }</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('materials')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          上一步
        </button>
        <button
          onClick={() => setCurrentStep('review')}
          disabled={!formData.product_name.trim() || formData.selling_price <= 0}
          className="px-6 py-3 bg-crystal-600 text-white rounded-lg hover:bg-crystal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          下一步：确认制作
        </button>
      </div>
    </div>
  )

  // 渲染批量信息填写（直接转化模式）
  const renderBatchDetails = () => {
    const toggleExpanded = (materialId: string) => {
      const newExpanded = new Set(expandedItems)
      if (newExpanded.has(materialId)) {
        newExpanded.delete(materialId)
      } else {
        newExpanded.add(materialId)
      }
      setExpandedItems(newExpanded)
    }

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

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">批量成品信息填写</h2>
            <p className="text-gray-600">为每个选中的原材料成品填写销售成品信息</p>
          </div>
          <button
            onClick={() => setCurrentStep('materials')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回</span>
          </button>
        </div>
        
        <div className="space-y-4">
          {batchFormData.selected_materials.map((material) => {
            const product = material.product_info
            const { totalCost, profitMargin } = calculateCosts(product)
            const isExpanded = expandedItems.has(material.purchase_id)
            
            return (
              <div key={material.purchase_id} className="border border-gray-200 rounded-lg">
                {/* 原材料信息头部 */}
                <div 
                  className="p-4 bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => toggleExpanded(material.purchase_id)}
                >
                  <div className="flex items-center space-x-3">
                    <img 
                      src={getFirstPhotoUrl(material.photos) || ''} 
                      alt={material.product_name}
                      className="w-12 h-12 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{material.product_name}</h4>
                      <p className="text-sm text-gray-500">
                        原材料成本: ¥{product.material_cost?.toFixed(2) || '0.00'} × {material.selected_quantity}个
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
                            onChange={(e) => updateBatchProduct(material.purchase_id, 'product_name', e.target.value)}
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
                              value={product.labor_cost}
                              onChange={(e) => updateBatchProduct(material.purchase_id, 'labor_cost', parseFloat(e.target.value) || 0)}
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
                              onChange={(e) => updateBatchProduct(material.purchase_id, 'craft_cost', parseFloat(e.target.value) || 0)}
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
                            onChange={(e) => updateBatchProduct(material.purchase_id, 'selling_price', parseFloat(e.target.value) || 0)}
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
            )
          })}
        </div>
        
        {/* 提交按钮 */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep('materials')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            返回修改
          </button>
          
          <button
            onClick={handleBatchSubmit}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-crystal-600 text-white rounded-lg hover:bg-crystal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? '创建中...' : `批量创建成品 (${batchFormData.selected_materials.reduce((total, material) => total + material.selected_quantity, 0)}个)`}</span>
          </button>
        </div>
      </div>
    )
  }

  // 渲染确认和提交
  const renderReview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">确认制作信息</h2>
        <button
          onClick={() => setCurrentStep('info')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>返回</span>
        </button>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 成品信息 */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">成品信息</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">制作模式:</span>
                <span className="ml-2 font-medium">
                  {formData.mode === 'DIRECT_TRANSFORM' ? '直接转化' : '组合制作'}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">成品名称:</span>
                <span className="ml-2 font-medium">{formData.product_name}</span>
              </div>
              {formData.description && (
                <div>
                  <span className="text-sm text-gray-600">描述:</span>
                  <span className="ml-2">{formData.description}</span>
                </div>
              )}
              {formData.specification && (
                <div>
                  <span className="text-sm text-gray-600">规格:</span>
                  <span className="ml-2">{formData.specification}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 成本信息 */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">成本信息</h3>
            {costCalculation && costCalculation.cost_breakdown && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">原材料成本:</span>
                  <span className="font-medium">¥{(costCalculation.cost_breakdown.material_cost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">人工成本:</span>
                  <span className="font-medium">¥{(costCalculation.cost_breakdown.labor_cost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">工艺成本:</span>
                  <span className="font-medium">¥{(costCalculation.cost_breakdown.craft_cost || 0).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>总成本:</span>
                  <span>¥{(costCalculation.cost_breakdown.total_cost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-crystal-600 font-semibold">
                  <span>销售价格:</span>
                  <span>¥{formData.selling_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>预计利润:</span>
                  <span className="font-semibold">
                    ¥{(formData.selling_price - (costCalculation.cost_breakdown.total_cost || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 原材料清单 */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">原材料清单</h3>
          <div className="space-y-3">
            {formData.selected_materials.map((item) => (
              <div key={item.material.purchase_id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <span className="font-medium">{item.material.product_name}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    ({item.material.product_type} · {item.material.quality}级)
                  </span>
                </div>
                <div className="text-sm">
                  {item.quantity_used_beads > 0 && `${item.quantity_used_beads}颗`}
                  {item.quantity_used_pieces > 0 && `${item.quantity_used_pieces}件`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('info')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          上一步
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center space-x-2 px-6 py-3 bg-crystal-600 text-white rounded-lg hover:bg-crystal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? '制作中...' : '确认制作'}</span>
        </button>
      </div>
    </div>
  )

  // 获取品相颜色样式
  const getQualityColor = (quality: string) => {
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
  const formatQuality = (quality: string) => {
    return quality + '级'
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
          <h1 className="text-2xl font-bold text-gray-900">成品制作</h1>
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
                  { key: 'info', label: '填写信息' },
                  { key: 'review', label: '确认制作' }
                ]
            
            return steps.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step.key 
                    ? 'bg-crystal-600 text-white' 
                    : index < steps.findIndex(s => s.key === currentStep)
                      ? 'bg-crystal-100 text-crystal-600'
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep === step.key ? 'text-crystal-600' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    index < steps.findIndex(s => s.key === currentStep)
                      ? 'bg-crystal-200'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))
          })()}
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        {currentStep === 'mode' && renderModeSelection()}
        {currentStep === 'materials' && renderMaterialSelection()}
        {currentStep === 'info' && renderProductInfo()}
        {currentStep === 'batch_details' && renderBatchDetails()}
        {currentStep === 'review' && renderReview()}
      </div>
    </div>

    {/* 原材料详情模态框 */}
    {selectedMaterialDetail && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedMaterialDetail.product_name}
              </h3>
              <button
                onClick={() => setSelectedMaterialDetail(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">库存数量</div>
                  <div className="text-xl font-bold text-gray-900">{selectedMaterialDetail.available_quantity} 件</div>
                </div>
                {user?.role === 'BOSS' && selectedMaterialDetail.unit_cost && (
                  <div>
                    <div className="text-sm text-gray-500">单价</div>
                    <div className="text-xl font-bold text-gray-900">¥{selectedMaterialDetail.unit_cost.toFixed(2)}</div>
                  </div>
                )}
              </div>
              
              <div>
                <div className="text-sm text-gray-500 mb-2">规格信息</div>
                <div className="flex items-center space-x-2">
                  <Ruler className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {selectedMaterialDetail.bead_diameter ? `${selectedMaterialDetail.bead_diameter}mm` : 
                     selectedMaterialDetail.specification ? selectedMaterialDetail.specification : '无规格'}
                  </span>
                </div>
              </div>
              
              {selectedMaterialDetail.quality && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">品相等级</div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getQualityColor(selectedMaterialDetail.quality)}`}>
                    {formatQuality(selectedMaterialDetail.quality)}
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
                        {selectedMaterialDetail.product_type === 'LOOSE_BEADS' ? '散珠' :
                         selectedMaterialDetail.product_type === 'BRACELET' ? '手串' :
                         selectedMaterialDetail.product_type === 'ACCESSORIES' ? '配件' : '成品'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">供应商:</span>
                      <span className="ml-1">{selectedMaterialDetail.supplier_name || '未知'}</span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-700">采购ID:</span>
                        <span className="ml-1">{formatPurchaseCode(selectedMaterialDetail.purchase_id)}</span>
                     </div>
                     {user?.role === 'BOSS' && selectedMaterialDetail.unit_cost && (
                       <div>
                         <span className="font-medium text-gray-700">单位成本:</span>
                         <span className="ml-1">¥{selectedMaterialDetail.unit_cost.toFixed(2)}</span>
                       </div>
                     )}
                  </div>
                </div>
              </div>
              
              {selectedMaterialDetail.photos && selectedMaterialDetail.photos.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">产品图片</div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedMaterialDetail.photos.slice(0, 4).map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`${selectedMaterialDetail.product_name} ${index + 1}`}
                        className="w-full max-w-full h-auto object-contain rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onError={handleImageError}
                        onClick={() => window.open(photo, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* 添加到清单按钮 */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    addMaterial(selectedMaterialDetail)
                    setSelectedMaterialDetail(null)
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
